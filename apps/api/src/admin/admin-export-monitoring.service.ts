import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { ExportMonitoringQueryDto } from "./dto/export-monitoring-query.dto";

const EXPORT_ENTITY_TYPES = ["EXTERNAL_BILLING_EXPORT", "EXTERNAL_BILLING_AUTO_EXPORT", "ED_REPORT_EXPORT"] as const;

function readAutoExportEnabled(): boolean {
  const raw = process.env.MEDORA_EXTERNAL_BILLING_AUTO_EXPORT_ENABLED?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

function readVendorWebhookConfigured(): boolean {
  return Boolean(process.env.MEDORA_EXTERNAL_BILLING_VENDOR_WEBHOOK_URL?.trim());
}

function asMeta(m: unknown): Record<string, unknown> {
  if (m && typeof m === "object" && !Array.isArray(m)) return m as Record<string, unknown>;
  return {};
}

function formatActorName(
  user: { firstName: string; lastName: string; email: string } | null,
  userId: string | null,
  entityType: string
): string {
  if (user) {
    const n = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
    if (n) return n;
    const em = user.email?.trim();
    if (em) return em;
  }
  if (entityType === "EXTERNAL_BILLING_AUTO_EXPORT") return "Automatisation";
  if (userId) return `ID ${userId.slice(0, 8)}…`;
  return "—";
}

function isoDayFromBoundary(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  if (t.length >= 10 && t[4] === "-" && t[7] === "-") return t.slice(0, 10);
  return null;
}

function edReportSlugFromType(reportType: string | null | undefined): string | null {
  if (!reportType || typeof reportType !== "string") return null;
  const allowed = new Set(["door-to-door", "door-to-provider", "door-to-ekg", "medication-administration"]);
  return allowed.has(reportType) ? reportType : null;
}

export type ExportMonitoringRecentRow = {
  id: string;
  createdAt: string;
  exportType: string;
  status: string;
  source: string;
  from: string | null;
  to: string | null;
  format: string | null;
  rowCount: number | null;
  reportType: string | null;
  facilityId: string | null;
  actorName: string;
  retryable: boolean;
  downloadUrl: string | null;
};

export type ExportMonitoringPayload = {
  recentExports: ExportMonitoringRecentRow[];
  summary: {
    lastExternalBillingExportAt: string | null;
    lastEdReportExportAt: string | null;
    failedExportsLast48h: number;
    autoExportEnabled: boolean;
    vendorWebhookConfigured: boolean;
  };
};

@Injectable()
export class AdminExportMonitoringService {
  constructor(private readonly prisma: PrismaService) {}

  async getExportMonitoring(facilityId: string, query: ExportMonitoringQueryDto): Promise<ExportMonitoringPayload> {
    const since48h = new Date(Date.now() - 48 * 3600_000);

    const [billingExportMax, edExportMax, autoRecent, auditRows] = await Promise.all([
      this.prisma.auditLog.findFirst({
        where: { facilityId, entityType: "EXTERNAL_BILLING_EXPORT" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      this.prisma.auditLog.findFirst({
        where: { facilityId, entityType: "ED_REPORT_EXPORT" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      this.prisma.auditLog.findMany({
        where: {
          entityType: "EXTERNAL_BILLING_AUTO_EXPORT",
          createdAt: { gte: since48h },
        },
        orderBy: { createdAt: "desc" },
        take: 400,
        select: { metadata: true },
      }),
      this.prisma.auditLog.findMany({
        where: {
          entityType: { in: [...EXPORT_ENTITY_TYPES] },
          OR: [{ facilityId }, { facilityId: null, entityType: "EXTERNAL_BILLING_AUTO_EXPORT" }],
        },
        orderBy: { createdAt: "desc" },
        take: 400,
        select: {
          id: true,
          createdAt: true,
          entityType: true,
          userId: true,
          facilityId: true,
          metadata: true,
        },
      }),
    ]);

    const failedExportsLast48h = autoRecent.filter((r) => {
      const m = asMeta(r.metadata);
      return m.automationEvent === "external_billing_auto_export_failed";
    }).length;

    const userIds = [...new Set(auditRows.map((r) => r.userId).filter((x): x is string => Boolean(x)))];
    const users =
      userIds.length === 0
        ? []
        : await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true, email: true },
          });
    const userById = new Map(users.map((u) => [u.id, u]));

    const vendorConfigured = readVendorWebhookConfigured();

    const mapped: ExportMonitoringRecentRow[] = auditRows.map((row) => {
      const meta = asMeta(row.metadata);
      const exportType = this.resolveExportType(row.entityType, meta);
      const status = this.resolveStatus(row.entityType, meta);
      const source = row.entityType === "EXTERNAL_BILLING_AUTO_EXPORT" ? "automation" : "manual";
      const format = typeof meta.format === "string" ? meta.format : null;
      const reportType = typeof meta.reportType === "string" ? meta.reportType : null;
      const rowCount =
        typeof meta.rowCount === "number" && Number.isFinite(meta.rowCount)
          ? meta.rowCount
          : typeof meta.encounterCount === "number" && Number.isFinite(meta.encounterCount)
            ? meta.encounterCount
            : null;

      let from: string | null = null;
      let to: string | null = null;
      if (row.entityType === "ED_REPORT_EXPORT") {
        from = isoDayFromBoundary(typeof meta.from === "string" ? meta.from : null);
        to = isoDayFromBoundary(typeof meta.to === "string" ? meta.to : null);
      } else if (meta.scope === "DAILY" && typeof meta.date === "string") {
        from = meta.date;
        to = meta.date;
      }

      const u = row.userId ? userById.get(row.userId) ?? null : null;
      const actorName = formatActorName(u, row.userId, row.entityType);

      const exportDate =
        typeof meta.exportDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(meta.exportDate) ? meta.exportDate : null;
      const retryFormat = meta.format === "json" || meta.format === "csv" ? meta.format : null;
      const retryable =
        vendorConfigured &&
        row.entityType === "EXTERNAL_BILLING_AUTO_EXPORT" &&
        meta.automationEvent === "external_billing_auto_export_failed" &&
        Boolean(exportDate) &&
        retryFormat != null;

      const downloadUrl = this.buildDownloadUrl({
        exportType,
        facilityId: row.facilityId ?? facilityId,
        format,
        date: exportDate ?? (from ?? null),
        meta,
        reportType,
        from,
        to,
      });

      return {
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        exportType,
        status,
        source,
        from,
        to,
        format,
        rowCount,
        reportType,
        facilityId: row.facilityId,
        actorName,
        retryable,
        downloadUrl,
      };
    });

    const filtered = this.applyFilter(mapped, query.filter);

    return {
      recentExports: filtered.slice(0, 80),
      summary: {
        lastExternalBillingExportAt: billingExportMax?.createdAt.toISOString() ?? null,
        lastEdReportExportAt: edExportMax?.createdAt.toISOString() ?? null,
        failedExportsLast48h,
        autoExportEnabled: readAutoExportEnabled(),
        vendorWebhookConfigured: vendorConfigured,
      },
    };
  }

  private applyFilter(rows: ExportMonitoringRecentRow[], filter: ExportMonitoringQueryDto["filter"]): ExportMonitoringRecentRow[] {
    if (filter === "all") return rows;
    if (filter === "billing") {
      return rows.filter((r) => r.exportType.startsWith("external_billing"));
    }
    if (filter === "ed_reports") {
      return rows.filter((r) => r.exportType === "ed_report");
    }
    if (filter === "failures") {
      return rows.filter((r) => r.status === "failed");
    }
    return rows;
  }

  private resolveExportType(entityType: string, meta: Record<string, unknown>): string {
    if (entityType === "ED_REPORT_EXPORT") return "ed_report";
    if (entityType === "EXTERNAL_BILLING_AUTO_EXPORT") return "external_billing_automation";
    if (entityType === "EXTERNAL_BILLING_EXPORT") {
      if (meta.scope === "DAILY") return "external_billing_daily";
      return "external_billing_encounter";
    }
    return entityType;
  }

  private resolveStatus(entityType: string, meta: Record<string, unknown>): string {
    if (entityType === "ED_REPORT_EXPORT") return "success";
    if (entityType === "EXTERNAL_BILLING_EXPORT") return "success";
    const ev = meta.automationEvent;
    if (ev === "external_billing_auto_export_failed" || ev === "external_billing_manual_retry_failed") return "failed";
    if (ev === "external_billing_auto_export_started" || ev === "external_billing_manual_retry_started") return "started";
    if (
      ev === "external_billing_auto_export_succeeded" ||
      ev === "external_billing_manual_retry_succeeded"
    ) {
      return "success";
    }
    return "unknown";
  }

  private buildDownloadUrl(args: {
    exportType: string;
    facilityId: string;
    format: string | null;
    date: string | null;
    meta: Record<string, unknown>;
    reportType: string | null;
    from: string | null;
    to: string | null;
  }): string | null {
    if (args.exportType === "external_billing_daily" && args.date && (args.format === "json" || args.format === "csv")) {
      const q = new URLSearchParams({ date: args.date, format: args.format });
      return `/api/backend/billing/external/daily-export?${q.toString()}`;
    }
    if (args.exportType === "external_billing_encounter" && typeof args.meta.encounterId === "string" && args.meta.encounterId) {
      const fmt = args.format === "csv" ? "csv" : "json";
      const q = new URLSearchParams({ format: fmt });
      return `/api/backend/billing/external/encounters/${args.meta.encounterId}/export?${q.toString()}`;
    }
    if (args.exportType === "ed_report") {
      const slug = edReportSlugFromType(args.reportType);
      if (!slug) return null;
      const f = args.from ?? isoDayFromBoundary(typeof args.meta.from === "string" ? args.meta.from : null);
      const t = args.to ?? isoDayFromBoundary(typeof args.meta.to === "string" ? args.meta.to : null);
      if (!f || !t) return `/app/reports/${slug}`;
      const q = new URLSearchParams({ prefillFrom: f, prefillTo: t });
      return `/app/reports/${slug}?${q.toString()}`;
    }
    return null;
  }
}
