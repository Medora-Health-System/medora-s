import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { MedicationMasterExplorerService } from "./medication-master-explorer.service";
import { ER_PROCEDURE_CODE_SET_VERSION, ER_PROCEDURE_PENDING_CODE_SET_VERSION } from "./er-procedure-subset-rules.util";
import type {
  ErProcedureComplexityApproveBody,
  ErProcedureComplexityRejectBody,
} from "./dto/er-procedure-catalog-import.dto";

export type ErProcedureComplexityQueueRow = {
  id: string;
  code: string;
  codeSystem: string;
  shortDescription: string;
  longDescription: string | null;
  categoryHint: string | null;
};

@Injectable()
export class ErProcedureComplexityReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly explorer: MedicationMasterExplorerService
  ) {}

  async listQueue(
    facilityId: string,
    callerFacilityId: string | undefined
  ): Promise<{ rows: ErProcedureComplexityQueueRow[]; total: number }> {
    this.explorer.assertFacilityScope(facilityId, callerFacilityId);

    const rows = await this.prisma.billingProcedureCode.findMany({
      where: {
        isActive: false,
        codeSetVersion: ER_PROCEDURE_PENDING_CODE_SET_VERSION,
      },
      orderBy: [{ codeSystem: "asc" }, { code: "asc" }],
      select: {
        id: true,
        code: true,
        codeSystem: true,
        shortDescription: true,
        longDescription: true,
        searchText: true,
      },
    });

    return {
      rows: rows.map((r) => ({
        id: r.id,
        code: r.code,
        codeSystem: r.codeSystem,
        shortDescription: r.shortDescription,
        longDescription: r.longDescription,
        categoryHint: r.searchText?.includes("critical_care")
          ? "CRITICAL_CARE"
          : r.searchText?.includes("respiratory")
            ? "RESPIRATORY"
            : null,
      })),
      total: rows.length,
    };
  }

  async approve(
    procedureCodeId: string,
    body: ErProcedureComplexityApproveBody,
    userId: string,
    callerFacilityId: string | undefined,
    auditMeta?: { ip?: string; userAgent?: string }
  ) {
    this.explorer.assertFacilityScope(body.facilityId, callerFacilityId);
    const row = await this.loadPending(procedureCodeId);

    await this.prisma.billingProcedureCode.update({
      where: { id: procedureCodeId },
      data: {
        isActive: true,
        codeSetVersion: ER_PROCEDURE_CODE_SET_VERSION,
      },
    });

    await this.audit.log(AuditAction.UPDATE, "ER_PROCEDURE_COMPLEXITY_APPROVED", {
      userId,
      facilityId: body.facilityId,
      entityId: procedureCodeId,
      critical: true,
      ip: auditMeta?.ip,
      userAgent: auditMeta?.userAgent,
      metadata: {
        code: row.code,
        codeSystem: row.codeSystem,
        noteLength: body.note.trim().length,
      },
    });

    return { id: procedureCodeId, isActive: true, codeSetVersion: ER_PROCEDURE_CODE_SET_VERSION };
  }

  async reject(
    procedureCodeId: string,
    body: ErProcedureComplexityRejectBody,
    userId: string,
    callerFacilityId: string | undefined,
    auditMeta?: { ip?: string; userAgent?: string }
  ) {
    this.explorer.assertFacilityScope(body.facilityId, callerFacilityId);
    const row = await this.loadPending(procedureCodeId);

    await this.prisma.billingProcedureCode.update({
      where: { id: procedureCodeId },
      data: {
        isActive: false,
        codeSetVersion: "ER_SUBSET_19L_REJECTED",
      },
    });

    await this.audit.log(AuditAction.UPDATE, "ER_PROCEDURE_COMPLEXITY_REJECTED", {
      userId,
      facilityId: body.facilityId,
      entityId: procedureCodeId,
      critical: true,
      ip: auditMeta?.ip,
      userAgent: auditMeta?.userAgent,
      metadata: {
        code: row.code,
        codeSystem: row.codeSystem,
        noteLength: body.note.trim().length,
      },
    });

    return { id: procedureCodeId, isActive: false, codeSetVersion: "ER_SUBSET_19L_REJECTED" };
  }

  private async loadPending(procedureCodeId: string) {
    const row = await this.prisma.billingProcedureCode.findFirst({
      where: {
        id: procedureCodeId,
        isActive: false,
        codeSetVersion: ER_PROCEDURE_PENDING_CODE_SET_VERSION,
      },
      select: { id: true, code: true, codeSystem: true },
    });
    if (!row) {
      throw new NotFoundException("Procédure complexe introuvable dans la file d’attente.");
    }
    return row;
  }
}
