import { Injectable } from "@nestjs/common";

export type BackupReadinessCheckStatus = "pass" | "warn" | "fail";
export type BackupReadinessOverallStatus = "ready" | "attention" | "blocked";

export type BackupReadinessCheck = {
  key: string;
  status: BackupReadinessCheckStatus;
  /** Display title key: use `backupReadiness.checks.<key>` on the web. */
  label: string;
  /** Optional i18n detail slug: `backupReadiness.details.<detail>`. */
  detail: string | null;
};

export type BackupReadinessPayload = {
  status: BackupReadinessOverallStatus;
  checks: BackupReadinessCheck[];
  generatedAt: string;
};

function readEnvTrim(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function readEnvBoolConfirmed(name: string): "true" | "false" | "unset" {
  const raw = readEnvTrim(name).toLowerCase();
  if (raw === "true" || raw === "1" || raw === "yes") return "true";
  if (raw === "false" || raw === "0" || raw === "no") return "false";
  return "unset";
}

function readDatabaseUrlConfigured(): boolean {
  return Boolean(readEnvTrim("DATABASE_URL"));
}

function readNodeEnvProduction(): boolean {
  return readEnvTrim("NODE_ENV").toLowerCase() === "production";
}

function readAlertWebhookConfigured(): boolean {
  const u = readEnvTrim("MEDORA_ALERT_WEBHOOK_URL");
  return Boolean(u);
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

function parseRestoreDrillAt(): { ok: boolean; date: Date | null; rawPresent: boolean } {
  const raw = readEnvTrim("MEDORA_LAST_RESTORE_DRILL_AT");
  if (!raw) return { ok: false, date: null, rawPresent: false };
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return { ok: false, date: null, rawPresent: true };
  return { ok: true, date: d, rawPresent: true };
}

/** Days since drill; null if unknown. */
function daysSinceDrill(d: Date | null): number | null {
  if (!d) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400_000);
}

@Injectable()
export class BackupReadinessService {
  /** Facility-scoped for consistency with other admin readiness routes; checks are env-global. */
  getSnapshot(_facilityId: string): BackupReadinessPayload {
    const generatedAt = new Date().toISOString();
    const checks: BackupReadinessCheck[] = [];

    const dbOk = readDatabaseUrlConfigured();
    checks.push({
      key: "database_url",
      label: "database_url",
      status: dbOk ? "pass" : "fail",
      detail: dbOk ? null : "database_url_missing",
    });

    const prod = readNodeEnvProduction();
    checks.push({
      key: "node_env",
      label: "node_env",
      status: prod ? "pass" : "warn",
      detail: prod ? null : "node_env_not_production",
    });

    const backupPolicy = readEnvBoolConfirmed("MEDORA_BACKUP_POLICY_CONFIRMED");
    checks.push({
      key: "backup_policy",
      label: "backup_policy",
      status: backupPolicy === "true" ? "pass" : backupPolicy === "false" ? "fail" : "warn",
      detail:
        backupPolicy === "true"
          ? null
          : backupPolicy === "false"
            ? "backup_policy_not_confirmed"
            : "backup_policy_unset",
    });

    const retention = readEnvBoolConfirmed("MEDORA_DATA_RETENTION_POLICY_CONFIRMED");
    checks.push({
      key: "data_retention",
      label: "data_retention",
      status: retention === "true" ? "pass" : retention === "false" ? "fail" : "warn",
      detail:
        retention === "true"
          ? null
          : retention === "false"
            ? "data_retention_not_confirmed"
            : "data_retention_unset",
    });

    const drill = parseRestoreDrillAt();
    let drillStatus: BackupReadinessCheckStatus = "warn";
    let drillDetail: string | null = "restore_drill_unset";
    if (drill.rawPresent && !drill.ok) {
      drillStatus = "warn";
      drillDetail = "restore_drill_invalid";
    } else if (drill.ok && drill.date) {
      const days = daysSinceDrill(drill.date);
      if (days != null && days <= 180) {
        drillStatus = "pass";
        drillDetail = null;
      } else if (days != null && days <= 365) {
        drillStatus = "warn";
        drillDetail = "restore_drill_stale";
      } else {
        drillStatus = "warn";
        drillDetail = "restore_drill_very_stale";
      }
    } else if (!drill.rawPresent) {
      drillStatus = "warn";
      drillDetail = "restore_drill_unset";
    }
    checks.push({
      key: "restore_drill",
      label: "restore_drill",
      status: drillStatus,
      detail: drillDetail,
    });

    const alertsEnabled = readAlertsEnabled();
    const alertHook = readAlertWebhookConfigured();
    checks.push({
      key: "alert_webhook",
      label: "alert_webhook",
      status: !alertsEnabled ? "warn" : alertHook ? "pass" : "warn",
      detail: !alertsEnabled ? "alerts_disabled" : !alertHook ? "alert_webhook_missing" : null,
    });

    const extAuto = readExternalBillingAutoExportEnabled();
    const extVendor = readExternalBillingVendorWebhookConfigured();
    checks.push({
      key: "external_billing_automation",
      label: "external_billing_automation",
      status: "pass",
      detail: extAuto ? (extVendor ? "ext_billing_auto_ok" : "ext_billing_vendor_missing") : "ext_billing_auto_off",
    });
    if (extAuto && !extVendor) {
      const idx = checks.length - 1;
      checks[idx] = { ...checks[idx], status: "warn" };
    }

    const hasFail = checks.some((c) => c.status === "fail");
    const hasWarn = checks.some((c) => c.status === "warn");
    let status: BackupReadinessOverallStatus = "ready";
    if (hasFail) status = "blocked";
    else if (hasWarn) status = "attention";

    return { status, checks, generatedAt };
  }
}
