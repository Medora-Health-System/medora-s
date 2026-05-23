import { BadRequestException, Injectable } from "@nestjs/common";
import { AuditAction, BillingProcedureCodeSystem } from "@prisma/client";
import { createHash } from "node:crypto";
import { normalizeProcedureCodeForValidation } from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { MedicationMasterExplorerService } from "./medication-master-explorer.service";
import type { ErProcedureCatalogCommitBody } from "./dto/er-procedure-catalog-import.dto";
import { parseErProcedureCatalogUpload, type ErProcedureParsedRow } from "./er-procedure-catalog-parse.util";
import {
  classifyErProcedureRow,
  ER_PROCEDURE_CODE_SET_VERSION,
  ER_PROCEDURE_PENDING_CODE_SET_VERSION,
  type ErProcedureCategory,
  type ErProcedureClassification,
} from "./er-procedure-subset-rules.util";

export type ErProcedureCatalogRowResult = {
  rowKey: string;
  rowNumber: number;
  code: string;
  codeSystem: "CPT" | "HCPCS";
  shortDescription: string;
  classification: ErProcedureClassification;
  category: ErProcedureCategory | null;
  reasonCodes: string[];
  existingId: string | null;
};

export type ErProcedureCatalogDryRunResult = {
  dryRun: true;
  fingerprint: string;
  filename: string;
  totalParsed: number;
  counts: Record<ErProcedureClassification, number>;
  categoryCounts: Partial<Record<ErProcedureCategory, number>>;
  rows: ErProcedureCatalogRowResult[];
};

export type ErProcedureCatalogCommitResult = {
  dryRun: false;
  fingerprint: string;
  committed: number;
  complexityQueued: number;
  skipped: number;
  counts: Record<ErProcedureClassification, number>;
};

function fingerprintRows(rows: ErProcedureParsedRow[], filename: string): string {
  const payload = rows.map((r) => `${r.code}|${r.codeSystem}|${r.shortDescription}`).join("\n");
  return createHash("sha256").update(`${filename}\n${payload}`).digest("hex").slice(0, 16);
}

@Injectable()
export class ErProcedureCatalogImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly explorer: MedicationMasterExplorerService
  ) {}

  async dryRun(buffer: Buffer, filename: string): Promise<ErProcedureCatalogDryRunResult> {
    const rows = parseErProcedureCatalogUpload(buffer, filename);
    const classified = await this.classifyRows(rows);
    return {
      dryRun: true,
      fingerprint: fingerprintRows(rows, filename),
      filename,
      totalParsed: rows.length,
      counts: this.countByClassification(classified),
      categoryCounts: this.countByCategory(classified),
      rows: classified,
    };
  }

  async commit(
    buffer: Buffer,
    filename: string,
    body: ErProcedureCatalogCommitBody,
    userId: string,
    callerFacilityId: string | undefined,
    auditMeta?: { ip?: string; userAgent?: string }
  ): Promise<ErProcedureCatalogCommitResult> {
    this.explorer.assertFacilityScope(body.facilityId, callerFacilityId);

    const rows = parseErProcedureCatalogUpload(buffer, filename);
    const classified = await this.classifyRows(rows);
    const included = classified.filter((r) => r.classification === "ER_INCLUDED");
    const complex = classified.filter((r) => r.classification === "HIGH_COMPLEXITY_MANUAL_REVIEW");

    let committed = 0;
    let complexityQueued = 0;

    for (const row of included) {
      await this.upsertProcedureRow(row, true, ER_PROCEDURE_CODE_SET_VERSION);
      committed += 1;
    }

    for (const row of complex) {
      await this.upsertProcedureRow(row, false, ER_PROCEDURE_PENDING_CODE_SET_VERSION);
      complexityQueued += 1;
      await this.audit.log(AuditAction.CREATE, "ER_PROCEDURE_COMPLEXITY_QUEUED", {
        userId,
        facilityId: body.facilityId,
        critical: true,
        ip: auditMeta?.ip,
        userAgent: auditMeta?.userAgent,
        metadata: {
          code: row.code,
          codeSystem: row.codeSystem,
          category: row.category,
          reasonCodes: row.reasonCodes,
          sourceRowKey: row.rowKey,
        },
      });
    }

    await this.audit.log(AuditAction.CREATE, "ER_PROCEDURE_CATALOG_IMPORT", {
      userId,
      facilityId: body.facilityId,
      critical: true,
      ip: auditMeta?.ip,
      userAgent: auditMeta?.userAgent,
      metadata: {
        filename,
        fingerprint: fingerprintRows(rows, filename),
        committed,
        complexityQueued,
        skipped: classified.length - included.length - complex.length,
        counts: this.countByClassification(classified),
        noteLength: body.note?.trim().length ?? 0,
      },
    });

    const skipped =
      classified.length -
      included.length -
      complex.length;

    return {
      dryRun: false,
      fingerprint: fingerprintRows(rows, filename),
      committed,
      complexityQueued,
      skipped,
      counts: this.countByClassification(classified),
    };
  }

  private async classifyRows(rows: ErProcedureParsedRow[]): Promise<ErProcedureCatalogRowResult[]> {
    const out: ErProcedureCatalogRowResult[] = [];
    for (const row of rows) {
      const system =
        row.codeSystem === "CPT"
          ? BillingProcedureCodeSystem.CPT
          : BillingProcedureCodeSystem.HCPCS;
      const normalizedCode = normalizeProcedureCodeForValidation(
        row.code,
        row.codeSystem === "CPT" ? "CPT" : "HCPCS"
      );
      const existing = await this.prisma.billingProcedureCode.findUnique({
        where: {
          codeSystem_normalizedCode: { codeSystem: system, normalizedCode },
        },
        select: { id: true, isActive: true, shortDescription: true, codeSetVersion: true },
      });

      const base = classifyErProcedureRow({
        code: row.code,
        codeSystem: row.codeSystem,
        shortDescription: row.shortDescription,
        longDescription: row.longDescription,
      });

      let classification = base.classification;
      if (
        classification === "ER_INCLUDED" &&
        existing?.isActive &&
        existing.shortDescription === row.shortDescription.trim() &&
        existing.codeSetVersion === ER_PROCEDURE_CODE_SET_VERSION
      ) {
        classification = "DUPLICATE_OR_CONFLICT";
      }

      out.push({
        rowKey: row.rowKey,
        rowNumber: row.rowNumber,
        code: row.code,
        codeSystem: row.codeSystem,
        shortDescription: row.shortDescription,
        classification,
        category: base.category,
        reasonCodes: base.reasonCodes,
        existingId: existing?.id ?? null,
      });
    }
    return out;
  }

  private async upsertProcedureRow(
    row: ErProcedureCatalogRowResult,
    isActive: boolean,
    codeSetVersion: string
  ) {
    const system =
      row.codeSystem === "CPT"
        ? BillingProcedureCodeSystem.CPT
        : BillingProcedureCodeSystem.HCPCS;
    const normalizedCode = normalizeProcedureCodeForValidation(
      row.code,
      row.codeSystem === "CPT" ? "CPT" : "HCPCS"
    );
    const searchText = `${row.code} ${row.shortDescription} ${row.category ?? ""} er urgent emergency`
      .toLowerCase()
      .slice(0, 4000);

    await this.prisma.billingProcedureCode.upsert({
      where: {
        codeSystem_normalizedCode: { codeSystem: system, normalizedCode },
      },
      create: {
        code: row.code.slice(0, 32),
        normalizedCode: normalizedCode.slice(0, 32),
        codeSystem: system,
        shortDescription: row.shortDescription.slice(0, 512),
        longDescription: row.shortDescription.slice(0, 8000),
        searchText,
        isActive,
        effectiveYear: new Date().getFullYear(),
        codeSetVersion,
      },
      update: {
        code: row.code.slice(0, 32),
        shortDescription: row.shortDescription.slice(0, 512),
        longDescription: row.shortDescription.slice(0, 8000),
        searchText,
        isActive,
        codeSetVersion,
      },
    });
  }

  private countByClassification(
    rows: ErProcedureCatalogRowResult[]
  ): Record<ErProcedureClassification, number> {
    const counts: Record<ErProcedureClassification, number> = {
      ER_INCLUDED: 0,
      NON_ER_EXCLUDED: 0,
      HIGH_COMPLEXITY_MANUAL_REVIEW: 0,
      DUPLICATE_OR_CONFLICT: 0,
      MISSING_REQUIRED_FIELDS: 0,
    };
    for (const r of rows) counts[r.classification] += 1;
    return counts;
  }

  private countByCategory(rows: ErProcedureCatalogRowResult[]): Partial<Record<ErProcedureCategory, number>> {
    const counts: Partial<Record<ErProcedureCategory, number>> = {};
    for (const r of rows) {
      if (!r.category) continue;
      counts[r.category] = (counts[r.category] ?? 0) + 1;
    }
    return counts;
  }
}
