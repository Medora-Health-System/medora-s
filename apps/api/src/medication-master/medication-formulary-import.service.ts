import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { FORMULARY_WORKBOOK_REQUIRED_COLUMNS } from "./formulary-workbook.constants";
import {
  applyDuplicateCodeFlags,
  detectDuplicateProposedCodes,
  validateWorkbookRow,
  type ValidatedWorkbookRow,
} from "./formulary-import-validation.util";
import { missingRequiredColumns, parseWorkbookCsv } from "./workbook-csv.util";
import type { ImportStagingBody } from "./dto/medication-formulary-import.dto";

export type FormularyImportStagingSummary = {
  batchId: string;
  dryRun: boolean;
  totalRows: number;
  validRows: number;
  blockedRows: number;
  inProgressRows: number;
  readyRows: number;
  waivedRows: number;
  missingNdc: number;
  missingBillingReview: number;
  missingSafetyReview: number;
  infusionReviewRequired: number;
  duplicateProposedCodes: number;
  rowsWritten: number;
};

export type FormularyImportStagingResult = {
  summary: FormularyImportStagingSummary;
  /** Per-row outcomes (no PHI beyond workbook content). */
  rowOutcomes: Array<{
    sourceRowId: string;
    sourceInventoryDescription: string;
    importGateStatus: string;
    overallStatus: string;
    isValid: boolean;
    validationErrorCount: number;
  }>;
};

@Injectable()
export class MedicationFormularyImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importStaging(
    body: ImportStagingBody,
    importedByUserId: string | null
  ): Promise<FormularyImportStagingResult> {
    const batchId = body.batchId?.trim() || `pri-er-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const dryRun = body.dryRun === true;

    let parsed;
    try {
      parsed = parseWorkbookCsv(body.csv);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "CSV invalide.");
    }

    const missing = missingRequiredColumns(parsed.headers, FORMULARY_WORKBOOK_REQUIRED_COLUMNS);
    if (missing.length > 0) {
      throw new BadRequestException(
        `Colonnes obligatoires manquantes: ${missing.join(", ")}`
      );
    }

    if (parsed.rows.length === 0) {
      throw new BadRequestException("Aucune ligne de données dans le CSV.");
    }

    let validated = parsed.rows.map((row, i) => validateWorkbookRow(row, i));
    const duplicates = detectDuplicateProposedCodes(validated);
    validated = applyDuplicateCodeFlags(validated, duplicates);

    const summary = this.buildSummary(batchId, dryRun, validated, duplicates.size);

    if (dryRun) {
      return {
        summary: { ...summary, rowsWritten: 0 },
        rowOutcomes: this.rowOutcomes(validated),
      };
    }

    if (body.facilityId) {
      const facility = await this.prisma.facility.findUnique({
        where: { id: body.facilityId },
        select: { id: true },
      });
      if (!facility) {
        throw new BadRequestException("Établissement introuvable.");
      }
    }

    const now = new Date();
    const createData = validated.map((row) => this.toStagingCreate(row, batchId, body.facilityId ?? null, importedByUserId, now));

    await this.prisma.medicationFormularyImportStaging.createMany({
      data: createData,
    });

    return {
      summary: { ...summary, rowsWritten: createData.length },
      rowOutcomes: this.rowOutcomes(validated),
    };
  }

  async getBatchSummary(batchId: string): Promise<FormularyImportStagingSummary> {
    const rows = await this.prisma.medicationFormularyImportStaging.findMany({
      where: { batchId },
      select: {
        importGateStatus: true,
        overallStatus: true,
        ndc11: true,
        billingReviewStatus: true,
        safetyReviewStatus: true,
        infusionReviewStatus: true,
        reviewFlags: true,
        validationErrors: true,
        proposedConceptCode: true,
        proposedProductCode: true,
        proposedPackageCode: true,
      },
    });

    if (rows.length === 0) {
      throw new BadRequestException("Lot introuvable.");
    }

    const pseudoValidated: ValidatedWorkbookRow[] = rows.map((r, i) => ({
      sourceRowId: `stored-${i}`,
      sourceInventorySku: null,
      sourceInventoryDescription: "",
      exactSource: {
        exactSourceText: "",
        sourceInventorySku: null,
        sourceNameExact: null,
        sourceStrengthExact: null,
        sourceRouteExact: null,
        sourcePackageExact: null,
        sourcePage: null,
        sourceLineNumber: null,
        sourceImageRef: null,
        exactRawText: null,
        sourceReviewStatus: null,
        sourceLanguage: null,
        normalizationNotes: null,
      },
      raw: {},
      preservedRawJson: { __sourceTrace: {} },
      proposedConceptCode: r.proposedConceptCode,
      proposedProductCode: r.proposedProductCode,
      proposedPackageCode: r.proposedPackageCode,
      reconciliationStatus: "",
      importGateStatus: r.importGateStatus,
      overallStatus: r.overallStatus,
      reviewFlags: Array.isArray(r.reviewFlags)
        ? (r.reviewFlags as string[])
        : [],
      ndc11: r.ndc11,
      hcpcsCodeSuggested: null,
      billingReviewStatus: r.billingReviewStatus,
      safetyReviewStatus: r.safetyReviewStatus,
      infusionReviewStatus: r.infusionReviewStatus,
      pharmacySignoff: null,
      nursingSignoff: null,
      edMdSignoff: null,
      complianceSignoff: null,
      validationErrors: Array.isArray(r.validationErrors)
        ? (r.validationErrors as { code: string; message: string }[]).map((e) => ({
            code: e.code,
            message: e.message,
          }))
        : [],
      isValid: !(
        Array.isArray(r.validationErrors) && (r.validationErrors as unknown[]).length > 0
      ),
    }));

    const duplicates = detectDuplicateProposedCodes(pseudoValidated);
    return this.buildSummary(batchId, false, pseudoValidated, duplicates.size);
  }

  private buildSummary(
    batchId: string,
    dryRun: boolean,
    rows: ValidatedWorkbookRow[],
    duplicateProposedCodes: number
  ): FormularyImportStagingSummary {
    const missingNdc = rows.filter((r) => !r.ndc11).length;
    const missingBillingReview = rows.filter(
      (r) =>
        r.billingReviewStatus === "pending" ||
        r.reviewFlags.includes("BILLING_REVIEW_REQUIRED")
    ).length;
    const missingSafetyReview = rows.filter(
      (r) =>
        r.safetyReviewStatus === "pending" ||
        r.reviewFlags.includes("SAFETY_REVIEW_REQUIRED")
    ).length;
    const infusionReviewRequired = rows.filter(
      (r) =>
        r.infusionReviewStatus === "pending" ||
        r.reviewFlags.includes("INFUSION_REVIEW_REQUIRED")
    ).length;

    return {
      batchId,
      dryRun,
      totalRows: rows.length,
      validRows: rows.filter((r) => r.isValid).length,
      blockedRows: rows.filter((r) => r.importGateStatus === "BLOCKED").length,
      inProgressRows: rows.filter((r) => r.importGateStatus === "IN_PROGRESS").length,
      readyRows: rows.filter((r) => r.importGateStatus === "READY").length,
      waivedRows: rows.filter((r) => r.importGateStatus === "WAIVED").length,
      missingNdc,
      missingBillingReview,
      missingSafetyReview,
      infusionReviewRequired,
      duplicateProposedCodes,
      rowsWritten: 0,
    };
  }

  private rowOutcomes(rows: ValidatedWorkbookRow[]) {
    return rows.map((r) => ({
      sourceRowId: r.sourceRowId,
      sourceInventoryDescription: r.sourceInventoryDescription,
      importGateStatus: r.importGateStatus,
      overallStatus: r.overallStatus,
      isValid: r.isValid,
      validationErrorCount: r.validationErrors.length,
    }));
  }

  private toStagingCreate(
    row: ValidatedWorkbookRow,
    batchId: string,
    facilityId: string | null,
    importedByUserId: string | null,
    importedAt: Date
  ): Prisma.MedicationFormularyImportStagingCreateManyInput {
    return {
      batchId,
      facilityId,
      sourceRowId: row.sourceRowId,
      sourceInventorySku: row.sourceInventorySku,
      sourceInventoryDescription: row.sourceInventoryDescription,
      rawJson: row.preservedRawJson as Prisma.InputJsonValue,
      proposedConceptCode: row.proposedConceptCode,
      proposedProductCode: row.proposedProductCode,
      proposedPackageCode: row.proposedPackageCode,
      reconciliationStatus: row.reconciliationStatus,
      importGateStatus: row.importGateStatus,
      overallStatus: row.overallStatus,
      reviewFlags: row.reviewFlags.length ? (row.reviewFlags as Prisma.InputJsonValue) : undefined,
      ndc11: row.ndc11,
      hcpcsCodeSuggested: row.hcpcsCodeSuggested,
      billingReviewStatus: row.billingReviewStatus,
      safetyReviewStatus: row.safetyReviewStatus,
      infusionReviewStatus: row.infusionReviewStatus,
      pharmacySignoff: row.pharmacySignoff,
      nursingSignoff: row.nursingSignoff,
      edMdSignoff: row.edMdSignoff,
      complianceSignoff: row.complianceSignoff,
      validationErrors: row.validationErrors.length
        ? (row.validationErrors as Prisma.InputJsonValue)
        : undefined,
      importedAt,
      importedByUserId,
    };
  }
}
