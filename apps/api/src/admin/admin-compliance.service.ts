import { Injectable } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { auditPresetWhere } from "./audit-category.util";

/** Matches `AdminExportMonitoringService` / system-health export audit family. */
export const COMPLIANCE_EXPORT_ENTITY_TYPES = [
  "EXTERNAL_BILLING_EXPORT",
  "EXTERNAL_BILLING_AUTO_EXPORT",
  "ED_REPORT_EXPORT",
] as const;

const DEFAULT_WINDOW_MS = 7 * 24 * 3600_000;

function asMeta(m: unknown): Record<string, unknown> {
  if (m && typeof m === "object" && !Array.isArray(m)) return m as Record<string, unknown>;
  return {};
}

/** Same semantics as `system-health.service` `isFailedExternalBillingExport` (billing export audits only). */
function isFailedExternalBillingExport(entityType: string, meta: Record<string, unknown>): boolean {
  if (entityType === "EXTERNAL_BILLING_EXPORT" || entityType === "EXTERNAL_BILLING_AUTO_EXPORT") {
    const ev = meta.automationEvent;
    if (ev === "external_billing_auto_export_failed" || ev === "external_billing_manual_retry_failed") {
      return true;
    }
  }
  return false;
}

export type ComplianceCoverageSlice = {
  total: number;
  audited: number;
  percent: number;
};

export type ComplianceDashboardPayload = {
  window: { from: string; to: string };
  auditCoverage: {
    orders: ComplianceCoverageSlice;
    mar: ComplianceCoverageSlice;
    exports: ComplianceCoverageSlice;
  };
  gaps: {
    ordersMissingAudit: number;
    marMissingAudit: number;
    exportsMissingAudit: number;
  };
  riskSignals: {
    overrideCount: number;
    failedExportCount: number;
    failedExportRate: number;
    criticalAuditCount: number;
  };
};

@Injectable()
export class AdminComplianceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Facility-scoped export audit rows (same OR as export monitoring / system health for auto-export).
   */
  private exportAuditWhereBase(facilityId: string, since: Date, to: Date) {
    return {
      createdAt: { gte: since, lte: to },
      entityType: { in: [...COMPLIANCE_EXPORT_ENTITY_TYPES] },
      OR: [{ facilityId }, { facilityId: null, entityType: "EXTERNAL_BILLING_AUTO_EXPORT" }],
    };
  }

  async getDashboard(facilityId: string): Promise<ComplianceDashboardPayload> {
    const to = new Date();
    const since = new Date(to.getTime() - DEFAULT_WINDOW_MS);

    const exportBase = this.exportAuditWhereBase(facilityId, since, to);

    const [
      orderTotal,
      orderAudited,
      marTotal,
      marAuditedRows,
      exportTotal,
      criticalAuditCount,
      overrideCount,
      exportRowsForFailureScan,
    ] = await Promise.all([
      this.prisma.order.count({
        where: {
          facilityId,
          createdAt: { gte: since, lte: to },
        },
      }),
      this.prisma.order.count({
        where: {
          facilityId,
          createdAt: { gte: since, lte: to },
          auditLogs: {
            some: {
              action: AuditAction.ORDER_CREATE,
              entityType: "ORDER",
            },
          },
        },
      }),
      this.prisma.medicationAdministration.count({
        where: {
          facilityId,
          createdAt: { gte: since, lte: to },
        },
      }),
      this.prisma.$queryRaw<[{ c: bigint }]>(
        Prisma.sql`
          SELECT COUNT(*)::bigint AS c
          FROM "MedicationAdministration" ma
          WHERE ma."facilityId" = ${facilityId}
            AND ma."createdAt" >= ${since}
            AND ma."createdAt" <= ${to}
            AND EXISTS (
              SELECT 1 FROM "AuditLog" a
              WHERE a."entityId" = ma."id"
                AND a."entityType" = 'MEDICATION_ADMINISTRATION'
                AND a."action" = ${AuditAction.CREATE}
                AND a."facilityId" = ${facilityId}
            )
        `
      ),
      this.prisma.auditLog.count({ where: exportBase }),
      this.prisma.auditLog.count({
        where: {
          facilityId,
          createdAt: { gte: since, lte: to },
          ...auditPresetWhere("critical_events"),
        },
      }),
      this.prisma.auditLog.count({
        where: {
          facilityId,
          createdAt: { gte: since, lte: to },
          ...auditPresetWhere("overrides"),
        },
      }),
      this.prisma.auditLog.findMany({
        where: {
          ...exportBase,
          entityType: { in: ["EXTERNAL_BILLING_EXPORT", "EXTERNAL_BILLING_AUTO_EXPORT"] },
        },
        select: { entityType: true, metadata: true },
        take: 15_000,
      }),
    ]);

    const marAudited = Number(marAuditedRows[0]?.c ?? 0n);

    let failedExportCount = 0;
    for (const row of exportRowsForFailureScan) {
      if (isFailedExternalBillingExport(row.entityType, asMeta(row.metadata))) {
        failedExportCount += 1;
      }
    }

    const ordersMissingAudit = Math.max(0, orderTotal - orderAudited);
    const marMissingAudit = Math.max(0, marTotal - marAudited);

    const orderPercent = orderTotal === 0 ? 100 : Math.round((orderAudited / orderTotal) * 100);
    const marPercent = marTotal === 0 ? 100 : Math.round((marAudited / marTotal) * 100);

    const failedExportRate =
      exportTotal === 0 ? 0 : Math.round((failedExportCount / exportTotal) * 100);

    return {
      window: { from: since.toISOString(), to: to.toISOString() },
      auditCoverage: {
        orders: { total: orderTotal, audited: orderAudited, percent: orderPercent },
        mar: { total: marTotal, audited: marAudited, percent: marPercent },
        exports: {
          total: exportTotal,
          audited: exportTotal,
          percent: 100,
        },
      },
      gaps: {
        ordersMissingAudit,
        marMissingAudit,
        exportsMissingAudit: 0,
      },
      riskSignals: {
        overrideCount,
        failedExportCount,
        failedExportRate,
        criticalAuditCount,
      },
    };
  }
}
