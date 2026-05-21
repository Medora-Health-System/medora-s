import { Injectable } from "@nestjs/common";
import { AuditAction, BillingProcedureCodeSystem } from "@prisma/client";
import { createHash } from "node:crypto";
import { normalizeProcedureCodeForValidation } from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { MedicationMasterExplorerService } from "./medication-master-explorer.service";
import type { ControlledCatalogProcedureCommitBody } from "./dto/controlled-catalog-import.dto";
import {
  parseControlledProcedureUpload,
  type ControlledCatalogProcedureParsedRow,
} from "./controlled-catalog-import-parse.util";

export type ControlledCatalogProcedureClassification =
  | "SAFE_TO_IMPORT"
  | "MISSING_REQUIRED_FIELDS"
  | "DUPLICATE_OR_CONFLICT"
  | "INVALID_CODE_SYSTEM";

export type ControlledCatalogProcedureRowResult = {
  rowKey: string;
  rowNumber: number;
  code: string;
  codeSystem: "CPT" | "HCPCS";
  shortDescription: string;
  classification: ControlledCatalogProcedureClassification;
  existingId: string | null;
};

export type ControlledCatalogProcedureDryRunResult = {
  dryRun: true;
  fingerprint: string;
  filename: string;
  counts: Record<ControlledCatalogProcedureClassification, number>;
  rows: ControlledCatalogProcedureRowResult[];
};

export type ControlledCatalogProcedureCommitResult = {
  dryRun: false;
  fingerprint: string;
  committed: number;
  skipped: number;
  counts: Record<ControlledCatalogProcedureClassification, number>;
};

function fingerprintProcedureRows(rows: ControlledCatalogProcedureParsedRow[], filename: string): string {
  const payload = rows.map((r) => `${r.code}|${r.codeSystem}|${r.shortDescription}`).join("\n");
  return createHash("sha256").update(`${filename}\n${payload}`).digest("hex").slice(0, 16);
}

@Injectable()
export class ControlledCatalogImportProcedureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly explorer: MedicationMasterExplorerService
  ) {}

  async dryRun(buffer: Buffer, filename: string): Promise<ControlledCatalogProcedureDryRunResult> {
    const rows = parseControlledProcedureUpload(buffer, filename);
    const classified = await this.classifyRows(rows);
    return {
      dryRun: true,
      fingerprint: fingerprintProcedureRows(rows, filename),
      filename,
      counts: this.countByClassification(classified),
      rows: classified,
    };
  }

  async commit(
    buffer: Buffer,
    filename: string,
    body: ControlledCatalogProcedureCommitBody,
    userId: string,
    callerFacilityId: string | undefined,
    auditMeta?: { ip?: string; userAgent?: string }
  ): Promise<ControlledCatalogProcedureCommitResult> {
    if (body.facilityId) {
      this.explorer.assertFacilityScope(body.facilityId, callerFacilityId);
    }

    const rows = parseControlledProcedureUpload(buffer, filename);
    const classified = await this.classifyRows(rows);
    const safe = classified.filter((r) => r.classification === "SAFE_TO_IMPORT");

    for (const row of safe) {
      const system =
        row.codeSystem === "CPT"
          ? BillingProcedureCodeSystem.CPT
          : BillingProcedureCodeSystem.HCPCS;
      const normalizedCode = normalizeProcedureCodeForValidation(
        row.code,
        row.codeSystem === "CPT" ? "CPT" : "HCPCS"
      );
      const searchText = `${row.code} ${row.shortDescription}`.toLowerCase();

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
          isActive: true,
        },
        update: {
          code: row.code.slice(0, 32),
          shortDescription: row.shortDescription.slice(0, 512),
          longDescription: row.shortDescription.slice(0, 8000),
          searchText,
          isActive: true,
        },
      });
    }

    await this.audit.log(AuditAction.CREATE, "CONTROLLED_CATALOG_PROCEDURE_IMPORT", {
      userId,
      facilityId: body.facilityId != null ? body.facilityId : undefined,
      critical: true,
      ip: auditMeta?.ip,
      userAgent: auditMeta?.userAgent,
      metadata: {
        filename,
        fingerprint: fingerprintProcedureRows(rows, filename),
        committed: safe.length,
        skipped: classified.length - safe.length,
        note: body.note?.trim() || undefined,
      },
    });

    return {
      dryRun: false,
      fingerprint: fingerprintProcedureRows(rows, filename),
      committed: safe.length,
      skipped: classified.length - safe.length,
      counts: this.countByClassification(classified),
    };
  }

  private async classifyRows(
    rows: ControlledCatalogProcedureParsedRow[]
  ): Promise<ControlledCatalogProcedureRowResult[]> {
    const out: ControlledCatalogProcedureRowResult[] = [];
    for (const row of rows) {
      if (!row.code.trim() || !row.shortDescription.trim()) {
        out.push({ ...row, classification: "MISSING_REQUIRED_FIELDS", existingId: null });
        continue;
      }
      const system =
        row.codeSystem === "CPT"
          ? BillingProcedureCodeSystem.CPT
          : BillingProcedureCodeSystem.HCPCS;
      const existing = await this.prisma.billingProcedureCode.findFirst({
        where: { code: row.code, codeSystem: system },
        select: { id: true, isActive: true, shortDescription: true },
      });
      if (existing?.isActive && existing.shortDescription === row.shortDescription.trim()) {
        out.push({
          rowKey: row.rowKey,
          rowNumber: row.rowNumber,
          code: row.code,
          codeSystem: row.codeSystem,
          shortDescription: row.shortDescription,
          classification: "DUPLICATE_OR_CONFLICT",
          existingId: existing.id,
        });
        continue;
      }
      out.push({
        rowKey: row.rowKey,
        rowNumber: row.rowNumber,
        code: row.code,
        codeSystem: row.codeSystem,
        shortDescription: row.shortDescription,
        classification: "SAFE_TO_IMPORT",
        existingId: existing?.id ?? null,
      });
    }
    return out;
  }

  private countByClassification(
    rows: ControlledCatalogProcedureRowResult[]
  ): Record<ControlledCatalogProcedureClassification, number> {
    const counts: Record<ControlledCatalogProcedureClassification, number> = {
      SAFE_TO_IMPORT: 0,
      MISSING_REQUIRED_FIELDS: 0,
      DUPLICATE_OR_CONFLICT: 0,
      INVALID_CODE_SYSTEM: 0,
    };
    for (const r of rows) counts[r.classification] += 1;
    return counts;
  }
}
