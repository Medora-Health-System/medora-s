import { Injectable } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { getMedoraAlertStatusForApi, type MedoraAlertStatusForApi } from "../common/logging/medoraAlert";
import { PrismaService } from "../prisma/prisma.service";
import { RecentHttpErrorMetricsService } from "../common/metrics/recent-http-error-metrics.service";
import { auditPresetWhere } from "./audit-category.util";
import { BackupReadinessService, type BackupReadinessOverallStatus } from "./backup-readiness.service";

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
  /** Both access and refresh secrets non-empty (values never exposed). */
  jwtSecretsConfigured: boolean;
  /** `MFA_SECRET_ENCRYPTION_KEY` present and decodes to 32 bytes (format probe only). */
  mfaEncryptionKeyConfigured: boolean;
  /** `ok` | `missing` | `invalid` — never includes secret material. */
  mfaEncryptionKeyProbe: "ok" | "missing" | "invalid";
  /** `CHART_EXPORT_SIGNING_SECRET` non-empty after trim. */
  chartExportSigningSecretConfigured: boolean;
  /** Effective mode label for operators (`unset` when env var blank → runtime defaults to best_effort). */
  auditFailureMode: "best_effort" | "fail_closed" | "unset";
  recentChartExportIntegrityFailureCount: number;
};

export type SystemHealthPayload = {
  status: SystemHealthOverallStatus;
  generatedAt: string;
  checks: SystemHealthCheck[];
  metrics: SystemHealthMetrics;
  alertStatus: MedoraAlertStatusForApi;
  /** Aggregated backup / retention / drill flags (same semantics as `GET admin/backup-readiness`). */
  backupReadiness: {
    status: BackupReadinessOverallStatus;
    generatedAt: string;
  };
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

function readJwtSecretsConfigured(): boolean {
  return Boolean(readEnvTrim("JWT_ACCESS_SECRET") && readEnvTrim("JWT_REFRESH_SECRET"));
}

/** Format probe only — mirrors MFA util length rules without importing crypto-heavy paths. */
function probeMfaEncryptionKey(): "ok" | "missing" | "invalid" {
  const raw = readEnvTrim("MFA_SECRET_ENCRYPTION_KEY");
  if (!raw) return "missing";
  try {
    const buf = Buffer.from(raw, "base64");
    if (buf.length !== 32) return "invalid";
    return "ok";
  } catch {
    return "invalid";
  }
}

function readChartExportSigningSecretConfigured(): boolean {
  return Boolean(readEnvTrim("CHART_EXPORT_SIGNING_SECRET"));
}

function readAuditFailureModeLabel(): "best_effort" | "fail_closed" | "unset" {
  const raw = readEnvTrim("AUDIT_FAILURE_MODE").toLowerCase();
  if (raw === "fail_closed") return "fail_closed";
  if (raw === "best_effort") return "best_effort";
  return "unset";
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
    private readonly httpErrorMetrics: RecentHttpErrorMetricsService,
    private readonly backupReadiness: BackupReadinessService
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

    const [exportAudits, criticalRows, overrideRows, integrityFailureCount] = await Promise.all([
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
      this.prisma.auditLog.count({
        where: {
          facilityId,
          createdAt: { gte: since },
          action: AuditAction.RECORD_EXPORT_INTEGRITY_FAILURE,
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
    const recentChartExportIntegrityFailureCount = integrityFailureCount;

    const jwtSecretsConfigured = readJwtSecretsConfigured();
    const mfaProbe = probeMfaEncryptionKey();
    const mfaEncryptionKeyConfigured = mfaProbe === "ok";
    const chartExportSigningSecretConfigured = readChartExportSigningSecretConfigured();
    const auditFailureModeLabel = readAuditFailureModeLabel();

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

    checks.push({
      key: "jwt_secrets",
      label: "jwt_secrets",
      status: jwtSecretsConfigured ? "pass" : "fail",
      detail: jwtSecretsConfigured ? null : "jwt_secret_missing",
    });

    if (nodeProduction) {
      checks.push({
        key: "mfa_encryption_key",
        label: "mfa_encryption_key",
        status: mfaEncryptionKeyConfigured ? "pass" : "fail",
        detail: mfaEncryptionKeyConfigured
          ? null
          : mfaProbe === "missing"
            ? "mfa_key_missing"
            : "mfa_key_invalid",
      });
    } else {
      checks.push({
        key: "mfa_encryption_key",
        label: "mfa_encryption_key",
        status: mfaEncryptionKeyConfigured ? "pass" : "warn",
        detail: mfaEncryptionKeyConfigured ? null : "mfa_key_dev_optional",
      });
    }

    if (nodeProduction) {
      checks.push({
        key: "chart_export_signing",
        label: "chart_export_signing",
        status: chartExportSigningSecretConfigured ? "pass" : "fail",
        detail: chartExportSigningSecretConfigured ? null : "chart_export_signing_missing_prod",
      });
    } else {
      checks.push({
        key: "chart_export_signing",
        label: "chart_export_signing",
        status: chartExportSigningSecretConfigured ? "pass" : "warn",
        detail: chartExportSigningSecretConfigured ? null : "chart_export_signing_optional_dev",
      });
    }

    if (nodeProduction && auditFailureModeLabel !== "fail_closed") {
      checks.push({
        key: "audit_failure_mode",
        label: "audit_failure_mode",
        status: "warn",
        detail: auditFailureModeLabel === "unset" ? "audit_failure_mode_unset_prod" : "audit_not_fail_closed",
      });
    } else {
      checks.push({
        key: "audit_failure_mode",
        label: "audit_failure_mode",
        status: "pass",
        detail: null,
      });
    }

    if (recentChartExportIntegrityFailureCount > 0) {
      checks.push({
        key: "chart_export_integrity",
        label: "chart_export_integrity",
        status: "warn",
        detail: "chart_integrity_failures_present",
      });
    } else {
      checks.push({
        key: "chart_export_integrity",
        label: "chart_export_integrity",
        status: "pass",
        detail: null,
      });
    }

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
      jwtSecretsConfigured,
      mfaEncryptionKeyConfigured,
      mfaEncryptionKeyProbe: mfaProbe,
      chartExportSigningSecretConfigured,
      auditFailureMode: auditFailureModeLabel,
      recentChartExportIntegrityFailureCount,
    };

    const backupSnap = this.backupReadiness.getSnapshot(facilityId);

    return {
      status: deriveOverall(checks),
      generatedAt,
      checks,
      metrics,
      alertStatus: getMedoraAlertStatusForApi(),
      backupReadiness: {
        status: backupSnap.status,
        generatedAt: backupSnap.generatedAt,
      },
    };
  }
}
