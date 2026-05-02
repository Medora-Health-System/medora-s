import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RecentHttpErrorMetricsService } from "../common/metrics/recent-http-error-metrics.service";
import { auditPresetWhere } from "./audit-category.util";

export type SystemHealthCheckStatus = "pass" | "warn" | "fail";
export type SystemHealthOverallStatus = "healthy" | "degraded" | "critical";

export type SystemHealthCheck = {
  key: string;
  status: SystemHealthCheckStatus;
  label: string;
  detail: string | null;
};

export type SystemHealthMetrics = {
  apiUptimeSeconds: number;
  databaseReachable: boolean;
  alertWebhookConfigured: boolean;
  alertEnabled: boolean;
  externalBillingAutomationEnabled: boolean;
  recent5xxCount: number;
  recentCriticalAlertsCount: number;
  recentFailedExportsCount: number;
};

export type SystemHealthPayload = {
  status: SystemHealthOverallStatus;
  generatedAt: string;
  checks: SystemHealthCheck[];
  metrics: SystemHealthMetrics;
};

const WINDOW_MS = 24 * 3600_000;

function readEnvTrim(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function readAlertWebhookConfigured(): boolean {
  return Boolean(readEnvTrim("MEDORA_ALERT_WEBHOOK_URL"));
}

function readAlertsEnabled(): boolean {
  const raw = readEnvTrim("MEDORA_ALERT_ENABLED").toLowerCase();
  if (raw === "false" || raw === "0" || raw === "no" || raw === "off") return false;
  return true;
}

function readExternalBillingAutoExportEnabled(): boolean {
  const raw = readEnvTrim("MEDORA_EXTERNAL_BILLING_AUTO_EXPORT_ENABLED").toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

function readExternalBillingVendorWebhookConfigured(): boolean {
  return Boolean(readEnvTrim("MEDORA_EXTERNAL_BILLING_VENDOR_WEBHOOK_URL"));
}

function readNodeEnvProduction(): boolean {
  return readEnvTrim("NODE_ENV").toLowerCase() === "production";
}

function asMeta(m: unknown): Record<string, unknown> {
  if (m && typeof m === "object" && !Array.isArray(m)) return m as Record<string, unknown>;
  return {};
}

function isFailedExternalBillingExport(entityType: string, meta: Record<string, unknown>): boolean {
  if (entityType === "EXTERNAL_BILLING_EXPORT" || entityType === "EXTERNAL_BILLING_AUTO_EXPORT") {
    const ev = meta.automationEvent;
    if (
      ev === "external_billing_auto_export_failed" ||
      ev === "external_billing_manual_retry_failed"
    ) {
      return true;
    }
  }
  return false;
}

function deriveOverall(checks: SystemHealthCheck[]): SystemHealthOverallStatus {
  if (checks.some((c) => c.status === "fail")) return "critical";
  if (checks.some((c) => c.status === "warn")) return "degraded";
  return "healthy";
}

@Injectable()
export class SystemHealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpErrorMetrics: RecentHttpErrorMetricsService
  ) {}

  async getSnapshot(facilityId: string): Promise<SystemHealthPayload> {
    const generatedAt = new Date().toISOString();
    const since = new Date(Date.now() - WINDOW_MS);

    let databaseReachable = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      databaseReachable = true;
    } catch {
      databaseReachable = false;
    }

    const alertWebhookConfigured = readAlertWebhookConfigured();
    const alertEnabled = readAlertsEnabled();
    const externalBillingAutomationEnabled = readExternalBillingAutoExportEnabled();
    const vendorWebhookConfigured = readExternalBillingVendorWebhookConfigured();
    const nodeProduction = readNodeEnvProduction();

    const recent5xxCount = this.httpErrorMetrics.countRecent(WINDOW_MS);

    const [exportAudits, criticalRows, overrideRows] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: {
          createdAt: { gte: since },
          entityType: { in: ["EXTERNAL_BILLING_EXPORT", "EXTERNAL_BILLING_AUTO_EXPORT"] },
          OR: [{ facilityId }, { facilityId: null, entityType: "EXTERNAL_BILLING_AUTO_EXPORT" }],
        },
        select: { entityType: true, metadata: true },
        take: 800,
      }),
      this.prisma.auditLog.count({
        where: {
          facilityId,
          createdAt: { gte: since },
          ...auditPresetWhere("critical_events"),
        },
      }),
      this.prisma.auditLog.count({
        where: {
          facilityId,
          createdAt: { gte: since },
          ...auditPresetWhere("overrides"),
        },
      }),
    ]);

    let recentFailedExportsCount = 0;
    for (const row of exportAudits) {
      if (isFailedExternalBillingExport(row.entityType, asMeta(row.metadata))) {
        recentFailedExportsCount += 1;
      }
    }

    const recentCriticalAlertsCount = criticalRows;

    const checks: SystemHealthCheck[] = [];

    checks.push({
      key: "database",
      label: "database",
      status: databaseReachable ? "pass" : "fail",
      detail: databaseReachable ? null : "database_unreachable",
    });

    checks.push({
      key: "node_env",
      label: "node_env",
      status: nodeProduction ? "pass" : "warn",
      detail: nodeProduction ? null : "node_env_not_production",
    });

    if (alertEnabled && !alertWebhookConfigured) {
      checks.push({
        key: "alerts",
        label: "alerts",
        status: "fail",
        detail: "alerts_enabled_no_webhook",
      });
    } else if (!alertWebhookConfigured && !alertEnabled) {
      checks.push({
        key: "alerts",
        label: "alerts",
        status: "warn",
        detail: "alert_webhook_not_configured",
      });
    } else {
      checks.push({
        key: "alerts",
        label: "alerts",
        status: "pass",
        detail: null,
      });
    }

    if (externalBillingAutomationEnabled && !vendorWebhookConfigured) {
      checks.push({
        key: "external_billing_automation",
        label: "external_billing_automation",
        status: "warn",
        detail: "auto_export_without_vendor_webhook",
      });
    } else {
      checks.push({
        key: "external_billing_automation",
        label: "external_billing_automation",
        status: "pass",
        detail: null,
      });
    }

    if (recentFailedExportsCount >= 10) {
      checks.push({
        key: "failed_exports",
        label: "failed_exports",
        status: "fail",
        detail: "failed_exports_threshold",
      });
    } else if (recentFailedExportsCount > 0) {
      checks.push({
        key: "failed_exports",
        label: "failed_exports",
        status: "warn",
        detail: "failed_exports_present",
      });
    } else {
      checks.push({
        key: "failed_exports",
        label: "failed_exports",
        status: "pass",
        detail: null,
      });
    }

    if (recent5xxCount >= 25) {
      checks.push({
        key: "http_5xx",
        label: "http_5xx",
        status: "fail",
        detail: "http_5xx_elevated",
      });
    } else if (recent5xxCount > 0) {
      checks.push({
        key: "http_5xx",
        label: "http_5xx",
        status: "warn",
        detail: "http_5xx_present",
      });
    } else {
      checks.push({
        key: "http_5xx",
        label: "http_5xx",
        status: "pass",
        detail: null,
      });
    }

    if (overrideRows >= 15 || criticalRows >= 25) {
      checks.push({
        key: "audit_overrides_critical",
        label: "audit_overrides_critical",
        status: "warn",
        detail: "elevated_override_or_critical_audit_volume",
      });
    } else if (overrideRows > 0 || criticalRows > 0) {
      checks.push({
        key: "audit_overrides_critical",
        label: "audit_overrides_critical",
        status: "pass",
        detail: "recent_events_present",
      });
    } else {
      checks.push({
        key: "audit_overrides_critical",
        label: "audit_overrides_critical",
        status: "pass",
        detail: null,
      });
    }

    const metrics: SystemHealthMetrics = {
      apiUptimeSeconds: Math.floor(process.uptime()),
      databaseReachable,
      alertWebhookConfigured,
      alertEnabled,
      externalBillingAutomationEnabled,
      recent5xxCount,
      recentCriticalAlertsCount,
      recentFailedExportsCount,
    };

    return {
      status: deriveOverall(checks),
      generatedAt,
      checks,
      metrics,
    };
  }
}
