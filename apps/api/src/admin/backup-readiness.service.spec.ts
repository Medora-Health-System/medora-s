import { BackupReadinessService } from "./backup-readiness.service";

describe("Phase 4 production backup readiness", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function baseProductionEnv() {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "postgresql://configured";
    process.env.MEDORA_BACKUP_POLICY_CONFIRMED = "true";
    process.env.MEDORA_DATA_RETENTION_POLICY_CONFIRMED = "true";
    process.env.MEDORA_LAST_RESTORE_DRILL_AT = new Date().toISOString();
    process.env.MEDORA_ALERT_ENABLED = "true";
    process.env.MEDORA_ALERT_WEBHOOK_URL = "https://alerts.example.test/hook";
    process.env.MEDORA_EXTERNAL_BILLING_AUTO_EXPORT_ENABLED = "false";
  }

  it("is ready when production safeguards are explicitly configured", () => {
    baseProductionEnv();
    const snapshot = new BackupReadinessService().getSnapshot("facility-a");
    expect(snapshot.status).toBe("ready");
    expect(snapshot.checks.filter((check) => check.status === "fail")).toEqual([]);
  });

  it.each([
    ["MEDORA_BACKUP_POLICY_CONFIRMED", "backup_policy"],
    ["MEDORA_DATA_RETENTION_POLICY_CONFIRMED", "data_retention"],
    ["MEDORA_LAST_RESTORE_DRILL_AT", "restore_drill"],
    ["MEDORA_ALERT_WEBHOOK_URL", "alert_webhook"],
  ])("blocks production when %s is missing", (envName, checkKey) => {
    baseProductionEnv();
    delete process.env[envName];
    const snapshot = new BackupReadinessService().getSnapshot("facility-a");
    expect(snapshot.status).toBe("blocked");
    expect(snapshot.checks.find((check) => check.key === checkKey)?.status).toBe("fail");
  });

  it("blocks production when the latest restore drill is older than 180 days", () => {
    baseProductionEnv();
    process.env.MEDORA_LAST_RESTORE_DRILL_AT = new Date(Date.now() - 181 * 86400_000).toISOString();
    const snapshot = new BackupReadinessService().getSnapshot("facility-a");
    expect(snapshot.status).toBe("blocked");
    expect(snapshot.checks.find((check) => check.key === "restore_drill")?.status).toBe("fail");
  });

  it("blocks production when operational alerts are explicitly disabled", () => {
    baseProductionEnv();
    process.env.MEDORA_ALERT_ENABLED = "false";
    const snapshot = new BackupReadinessService().getSnapshot("facility-a");
    expect(snapshot.status).toBe("blocked");
    expect(snapshot.checks.find((check) => check.key === "alert_webhook")?.status).toBe("fail");
  });
});
