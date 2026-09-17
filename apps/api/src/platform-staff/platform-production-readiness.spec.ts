import {
  hardenPlatformGoLive,
  hardenPlatformSystemHealth,
  productionReadinessBlockers,
} from "./platform-production-readiness";

describe("Phase 4 platform production readiness gates", () => {
  const healthyProductionSystem = () => ({
    status: "healthy",
    checks: [{ key: "node_env", status: "pass", detail: null }],
    metrics: {
      alertWebhookConfigured: true,
      alertEnabled: true,
      auditFailureMode: "fail_closed" as const,
    },
  });

  const readyBackup = () => ({
    status: "ready",
    checks: [{ key: "backup_policy", status: "pass", detail: null }],
  });

  it("blocks production when backup policy, audit mode, or alert delivery is unsafe", () => {
    const system = {
      ...healthyProductionSystem(),
      metrics: {
        alertWebhookConfigured: false,
        alertEnabled: false,
        auditFailureMode: "best_effort" as const,
      },
    };
    const backup = {
      status: "blocked",
      checks: [{ key: "backup_policy", status: "fail", detail: "backup_policy_unset" }],
    };

    expect(productionReadinessBlockers(system, backup).map((x) => x.key).sort()).toEqual([
      "alerts",
      "audit_failure_mode",
      "backup_policy",
    ]);
    expect(hardenPlatformSystemHealth(system, backup).status).toBe("critical");
    expect(
      hardenPlatformGoLive({ status: "ready", checks: [] }, system, backup).status
    ).toBe("blocked");
  });

  it("keeps a fully configured production environment unblocked", () => {
    const system = healthyProductionSystem();
    const backup = readyBackup();
    expect(productionReadinessBlockers(system, backup)).toEqual([]);
    expect(hardenPlatformSystemHealth(system, backup).status).toBe("healthy");
    expect(
      hardenPlatformGoLive({ status: "ready", checks: [] }, system, backup).status
    ).toBe("ready");
  });

  it("does not turn development warnings into production blockers", () => {
    const system = {
      status: "degraded",
      checks: [{ key: "node_env", status: "warn", detail: "node_env_not_production" }],
      metrics: {
        alertWebhookConfigured: false,
        alertEnabled: false,
        auditFailureMode: "unset" as const,
      },
    };
    const backup = {
      status: "attention",
      checks: [{ key: "backup_policy", status: "warn", detail: "backup_policy_unset" }],
    };
    expect(productionReadinessBlockers(system, backup)).toEqual([]);
    expect(hardenPlatformSystemHealth(system, backup).status).toBe("degraded");
  });
});
