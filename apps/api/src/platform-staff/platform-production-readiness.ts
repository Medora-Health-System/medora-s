type Check = { key: string; status: string; detail?: string | null };

type SystemSnapshot = {
  status: string;
  checks: Check[];
  metrics: {
    alertWebhookConfigured: boolean;
    alertEnabled: boolean;
    auditFailureMode: "best_effort" | "fail_closed" | "unset";
  };
};

type BackupSnapshot = {
  status: string;
  checks: Check[];
};

type GoLiveSnapshot = {
  status: string;
  checks: Array<Record<string, unknown>>;
};

export type ProductionReadinessBlocker = {
  key: string;
  source: "system" | "backup";
  detail: string | null;
};

function isProduction(system: SystemSnapshot): boolean {
  return system.checks.some((check) => check.key === "node_env" && check.status === "pass");
}

export function productionReadinessBlockers(
  system: SystemSnapshot,
  backup: BackupSnapshot
): ProductionReadinessBlocker[] {
  if (!isProduction(system)) return [];

  const blockers = new Map<string, ProductionReadinessBlocker>();
  const add = (blocker: ProductionReadinessBlocker) => blockers.set(blocker.key, blocker);

  for (const check of system.checks.filter((item) => item.status === "fail")) {
    add({ key: check.key, source: "system", detail: check.detail ?? null });
  }
  for (const check of backup.checks.filter((item) => item.status === "fail")) {
    add({ key: check.key, source: "backup", detail: check.detail ?? null });
  }

  if (system.metrics.auditFailureMode !== "fail_closed") {
    add({
      key: "audit_failure_mode",
      source: "system",
      detail:
        system.metrics.auditFailureMode === "unset"
          ? "audit_failure_mode_unset_prod"
          : "audit_not_fail_closed",
    });
  }
  if (!system.metrics.alertEnabled) {
    add({ key: "alerts", source: "system", detail: "alerts_disabled" });
  } else if (!system.metrics.alertWebhookConfigured) {
    add({ key: "alerts", source: "system", detail: "alerts_enabled_no_webhook" });
  }

  return [...blockers.values()];
}

export function hardenPlatformSystemHealth<T extends SystemSnapshot>(
  system: T,
  backup: BackupSnapshot
) {
  const blockers = productionReadinessBlockers(system, backup);
  return {
    ...system,
    status: blockers.length > 0 ? "critical" : system.status,
    productionReadiness: {
      enforced: isProduction(system),
      blockerCount: blockers.length,
      blockers,
      backupStatus: backup.status,
    },
  };
}

export function hardenPlatformGoLive<T extends GoLiveSnapshot>(
  goLive: T,
  system: SystemSnapshot,
  backup: BackupSnapshot
) {
  const blockers = productionReadinessBlockers(system, backup);
  const gateChecks = blockers.map((blocker) => ({
    key: `production_${blocker.key}`,
    label: `Production readiness: ${blocker.key}`,
    status: "fail" as const,
    value: false,
    detail: blocker.detail,
  }));
  return {
    ...goLive,
    status: blockers.length > 0 ? "blocked" : goLive.status,
    checks: [...gateChecks, ...goLive.checks],
    productionReadiness: {
      enforced: isProduction(system),
      blockerCount: blockers.length,
      blockers,
      systemStatus: system.status,
      backupStatus: backup.status,
    },
  };
}
