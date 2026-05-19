import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { applyBillingSafetyFlags } from "./formulary-source-preservation.util";
import type { PriorityErInventoryImportQuery } from "./dto/priority-er-inventory-import.dto";
import type { PriorityErInventoryStagingListQuery } from "./dto/priority-er-inventory-import.dto";
import { loadMedicationCatalogIndex } from "./priority-er-inventory-catalog-index";
import { throwInventoryImportError } from "./priority-er-inventory-import.errors";
import {
  parsePriorityErInventoryWorkbook,
  type PriorityErInventoryWorkbookRow,
} from "./priority-er-inventory-workbook.util";
import { reconcilePriorityErInventoryRow } from "./priority-er-inventory-reconciliation.util";
import type { PriorityErReconciliationStatus } from "./priority-er-reconciliation.constants";

export type PriorityErInventoryRowOutcome = {
  sourceRowId: string;
  sourceInventoryDescription: string;
  medication: string;
  dose: string;
  form: string;
  reconciliationStatus: PriorityErReconciliationStatus;
  importGateStatus: string;
  overallStatus: string;
  reviewFlags: string[];
  duplicateWarnings: string[];
  validationErrorCount: number;
  matchedConceptIds: string[];
  matchedProductIds: string[];
  matchedCatalogMedicationIds: string[];
};

export type PriorityErInventoryImportSummary = {
  batchId: string;
  dryRun: boolean;
  workbookFilename: string;
  sheetNames: string[];
  totalRows: number;
  stagedRows: number;
  skippedRows: number;
  exactMatches: number;
  possibleDuplicates: number;
  reviewRequired: number;
  newCandidates: number;
  missingMedicationName: number;
  missingDose: number;
  missingForm: number;
  billingReviewRequired: number;
  safetyReviewRequired: number;
  ndcReviewRequired: number;
  duplicateWarnings: number;
};

export type PriorityErInventoryImportResult = {
  summary: PriorityErInventoryImportSummary;
  rowOutcomes: PriorityErInventoryRowOutcome[];
};

@Injectable()
export class PriorityErInventoryImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importFromXlsxBuffer(
    buffer: Buffer,
    workbookFilename: string,
    options: PriorityErInventoryImportQuery,
    importedByUserId: string | null
  ): Promise<PriorityErInventoryImportResult> {
    if (!buffer.length) {
      throwInventoryImportError({
        code: "EMPTY_FILE",
        message: "Fichier inventaire vide.",
        details: { workbookFilename },
      });
    }

    const batchId =
      options.batchId?.trim() || `pri-er-inv-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const dryRun = options.dryRun !== false;

    const parsed = parsePriorityErInventoryWorkbook(buffer, workbookFilename);

    if (options.facilityId) {
      const facility = await this.prisma.facility.findUnique({
        where: { id: options.facilityId },
        select: { id: true },
      });
      if (!facility) {
        throwInventoryImportError({
          code: "FACILITY_NOT_FOUND",
          message: "Établissement introuvable.",
          details: { facilityId: options.facilityId },
        });
      }
    }

    const catalogIndex = await loadMedicationCatalogIndex(this.prisma);
    const now = new Date();
    const createRows: Prisma.MedicationFormularyImportStagingCreateManyInput[] = [];
    const rowOutcomes: PriorityErInventoryRowOutcome[] = [];
    let skippedRows = 0;

    for (const row of parsed.rows) {
      const built = this.buildStagingRow(row, batchId, options.facilityId ?? null, catalogIndex, now, importedByUserId);
      if (built.skip) {
        skippedRows += 1;
        continue;
      }
      rowOutcomes.push(built.outcome);
      if (!dryRun) {
        createRows.push(built.create);
      }
    }

    if (!dryRun && createRows.length > 0) {
      await this.prisma.medicationFormularyImportStaging.createMany({ data: createRows });
    }

    const summary = this.buildSummary(
      batchId,
      dryRun,
      workbookFilename,
      parsed.sheetNames,
      rowOutcomes,
      skippedRows,
      dryRun ? 0 : createRows.length
    );

    return { summary, rowOutcomes };
  }

  async listBatches(limit = 50) {
    const groups = await this.prisma.medicationFormularyImportStaging.groupBy({
      by: ["batchId"],
      _count: { _all: true },
      _max: { importedAt: true, createdAt: true },
    });

    return groups
      .sort((a, b) => {
        const at = a._max.importedAt ?? a._max.createdAt ?? new Date(0);
        const bt = b._max.importedAt ?? b._max.createdAt ?? new Date(0);
        return bt.getTime() - at.getTime();
      })
      .slice(0, limit)
      .map((g) => ({
        batchId: g.batchId,
        rowCount: g._count._all,
        lastImportedAt: g._max.importedAt ?? g._max.createdAt,
        workbookFilename: null as string | null,
      }));
  }

  async listStagingRows(query: PriorityErInventoryStagingListQuery) {
    const where: Prisma.MedicationFormularyImportStagingWhereInput = {};
    if (query.batchId) where.batchId = query.batchId;
    if (query.reconciliationStatus) where.reconciliationStatus = query.reconciliationStatus;
    if (query.importGateStatus) where.importGateStatus = query.importGateStatus;
    if (query.q?.trim()) {
      where.sourceInventoryDescription = { contains: query.q.trim(), mode: "insensitive" };
    }

    const [total, rows] = await Promise.all([
      this.prisma.medicationFormularyImportStaging.count({ where }),
      this.prisma.medicationFormularyImportStaging.findMany({
        where,
        orderBy: [{ batchId: "desc" }, { sourceRowId: "asc" }],
        take: query.limit,
        skip: query.offset,
        select: {
          id: true,
          batchId: true,
          sourceRowId: true,
          sourceInventoryDescription: true,
          reconciliationStatus: true,
          importGateStatus: true,
          overallStatus: true,
          reviewFlags: true,
          validationErrors: true,
          rawJson: true,
          importedAt: true,
          proposedConceptCode: true,
          proposedProductCode: true,
        },
      }),
    ]);

    return {
      total,
      rows: rows.map((r) => this.mapStagingListRow(r)),
    };
  }

  private mapStagingListRow(row: {
    id: string;
    batchId: string;
    sourceRowId: string;
    sourceInventoryDescription: string;
    reconciliationStatus: string;
    importGateStatus: string;
    overallStatus: string;
    reviewFlags: unknown;
    validationErrors: unknown;
    rawJson: unknown;
    importedAt: Date | null;
    proposedConceptCode: string | null;
    proposedProductCode: string | null;
  }) {
    const raw = (row.rawJson ?? {}) as Record<string, unknown>;
    const trace = (raw.__sourceTrace ?? {}) as Record<string, unknown>;
    const reconciliation = (raw.__reconciliation ?? {}) as Record<string, unknown>;
    const duplicateWarnings = Array.isArray(reconciliation.duplicateWarnings)
      ? (reconciliation.duplicateWarnings as string[])
      : [];

    return {
      id: row.id,
      batchId: row.batchId,
      sourceRowId: row.sourceRowId,
      exactSourceText: row.sourceInventoryDescription,
      medication: String(trace.sourceNameExact ?? raw.medication ?? raw.source_name_exact ?? ""),
      dose: String(trace.sourceStrengthExact ?? raw.dose ?? raw.source_strength_exact ?? ""),
      form: String(
        trace.sourceRouteExact ?? trace.sourcePackageExact ?? raw.form ?? raw.source_route_exact ?? ""
      ),
      reconciliationStatus: row.reconciliationStatus,
      importGateStatus: row.importGateStatus,
      overallStatus: row.overallStatus,
      reviewFlags: Array.isArray(row.reviewFlags) ? (row.reviewFlags as string[]) : [],
      duplicateWarnings,
      validationErrors: Array.isArray(row.validationErrors) ? row.validationErrors : [],
      matchedConceptIds: Array.isArray(reconciliation.matchedConceptIds)
        ? (reconciliation.matchedConceptIds as string[])
        : [],
      matchedProductIds: Array.isArray(reconciliation.matchedProductIds)
        ? (reconciliation.matchedProductIds as string[])
        : [],
      matchedCatalogMedicationIds: Array.isArray(reconciliation.matchedCatalogMedicationIds)
        ? (reconciliation.matchedCatalogMedicationIds as string[])
        : [],
      workbookFilename: String(raw.__workbookFilename ?? ""),
      sheetName: String(raw.__sheetName ?? ""),
      rowNumber: typeof raw.__rowNumber === "number" ? raw.__rowNumber : null,
      importedAt: row.importedAt,
      proposedConceptCode: row.proposedConceptCode,
      proposedProductCode: row.proposedProductCode,
      reviewConceptUrl:
        Array.isArray(reconciliation.matchedConceptIds) &&
        (reconciliation.matchedConceptIds as string[])[0]
          ? `/app/admin/medication-master/review/${(reconciliation.matchedConceptIds as string[])[0]}`
          : null,
    };
  }

  private buildStagingRow(
    row: PriorityErInventoryWorkbookRow,
    batchId: string,
    facilityId: string | null,
    catalogIndex: Awaited<ReturnType<typeof loadMedicationCatalogIndex>>,
    importedAt: Date,
    importedByUserId: string | null
  ): {
    skip: boolean;
    outcome: PriorityErInventoryRowOutcome;
    create: Prisma.MedicationFormularyImportStagingCreateManyInput;
  } {
    const reconciliation = reconcilePriorityErInventoryRow(row, catalogIndex);

    let reviewFlags = [...new Set(reconciliation.reviewFlags)];
    const billingAugment = applyBillingSafetyFlags({
      row: row.originalRow,
      ndc11: null,
      hcpcsCodeSuggested: null,
      billingReviewStatus: null,
      reviewFlags,
    });
    reviewFlags = billingAugment.reviewFlags;

    const importGateStatus = "BLOCKED";
    const overallStatus = "draft";

    const matchedConceptIds = [
      ...new Set(
        reconciliation.matchedRefs
          .map((m) => m.conceptId)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    const matchedProductIds = [
      ...new Set(
        reconciliation.matchedRefs
          .map((m) => m.productId)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    const matchedCatalogMedicationIds = [
      ...new Set(
        reconciliation.matchedRefs
          .filter((m) => m.kind === "catalog")
          .map((m) => m.id)
      ),
    ];

    const rawJson: Record<string, unknown> = {
      ...row.originalRow,
      __workbookFilename: row.workbookFilename,
      __sheetName: row.sheetName,
      __rowNumber: row.rowNumber,
      __sourceTrace: {
        exactSourceText: row.exactSourceText,
        sourceNameExact: row.sourceNameExact,
        sourceStrengthExact: row.sourceStrengthExact,
        sourceRouteExact: row.sourceRouteExact,
        sourcePackageExact: row.sourcePackageExact,
        sourceReviewStatus: row.sourceReviewStatus,
        sourceLineNumber: String(row.rowNumber),
      },
      __reconciliation: {
        category: reconciliation.reconciliationStatus,
        duplicateWarnings: reconciliation.duplicateWarnings,
        matchedRefs: reconciliation.matchedRefs,
        matchedConceptIds,
        matchedProductIds,
        matchedCatalogMedicationIds,
      },
      __preservation: {
        phase: "19E.1",
        rule: "priority_er_inventory_exact_source",
      },
    };

    const outcome: PriorityErInventoryRowOutcome = {
      sourceRowId: row.sourceRowId,
      sourceInventoryDescription: row.exactSourceText,
      medication: row.medication,
      dose: row.dose,
      form: row.form,
      reconciliationStatus: reconciliation.reconciliationStatus,
      importGateStatus,
      overallStatus,
      reviewFlags,
      duplicateWarnings: reconciliation.duplicateWarnings,
      validationErrorCount: reconciliation.validationErrors.length,
      matchedConceptIds,
      matchedProductIds,
      matchedCatalogMedicationIds,
    };

    const skip = row.medication.length === 0 && row.dose.length === 0 && row.form.length === 0;

    return {
      skip,
      outcome,
      create: {
        batchId,
        facilityId,
        sourceRowId: row.sourceRowId,
        sourceInventorySku: null,
        sourceInventoryDescription: row.exactSourceText,
        rawJson: rawJson as Prisma.InputJsonValue,
        proposedConceptCode: null,
        proposedProductCode: null,
        proposedPackageCode: null,
        reconciliationStatus: reconciliation.reconciliationStatus,
        importGateStatus,
        overallStatus,
        reviewFlags: reviewFlags.length ? (reviewFlags as Prisma.InputJsonValue) : undefined,
        ndc11: null,
        hcpcsCodeSuggested: null,
        billingReviewStatus: billingAugment.billingReviewStatus,
        safetyReviewStatus: "pending",
        infusionReviewStatus: null,
        validationErrors: reconciliation.validationErrors.length
          ? (reconciliation.validationErrors as Prisma.InputJsonValue)
          : undefined,
        importedAt,
        importedByUserId,
      },
    };
  }

  private buildSummary(
    batchId: string,
    dryRun: boolean,
    workbookFilename: string,
    sheetNames: string[],
    outcomes: PriorityErInventoryRowOutcome[],
    skippedRows: number,
    stagedRows: number
  ): PriorityErInventoryImportSummary {
    const countStatus = (s: PriorityErReconciliationStatus) =>
      outcomes.filter((o) => o.reconciliationStatus === s).length;

    return {
      batchId,
      dryRun,
      workbookFilename,
      sheetNames,
      totalRows: outcomes.length + skippedRows,
      stagedRows,
      skippedRows,
      exactMatches: countStatus("EXACT_MATCH"),
      possibleDuplicates: countStatus("POSSIBLE_DUPLICATE"),
      reviewRequired: countStatus("REVIEW_REQUIRED"),
      newCandidates: countStatus("NEW_CANDIDATE"),
      missingMedicationName: outcomes.filter((o) =>
        o.reviewFlags.includes("MISSING_MEDICATION_NAME")
      ).length,
      missingDose: outcomes.filter((o) => o.reviewFlags.includes("MISSING_DOSE")).length,
      missingForm: outcomes.filter((o) => o.reviewFlags.includes("MISSING_FORM")).length,
      billingReviewRequired: outcomes.filter((o) =>
        o.reviewFlags.includes("BILLING_REVIEW_REQUIRED")
      ).length,
      safetyReviewRequired: outcomes.filter((o) => o.reviewFlags.includes("SAFETY_REVIEW_REQUIRED"))
        .length,
      ndcReviewRequired: outcomes.filter((o) => o.reviewFlags.includes("NDC_REVIEW_REQUIRED"))
        .length,
      duplicateWarnings: outcomes.filter((o) => o.duplicateWarnings.length > 0).length,
    };
  }
}
