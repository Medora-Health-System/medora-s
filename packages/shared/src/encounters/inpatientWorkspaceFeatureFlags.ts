/**
 * D3E — Inpatient clinical workspace feature flags (all default OFF).
 */

function isTruthyFlag(value: string | undefined | null): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export type InpatientWorkspaceFlagEnv = {
  INPATIENT_WORKSPACE_ENABLED?: string | null;
  NEXT_PUBLIC_INPATIENT_WORKSPACE_ENABLED?: string | null;
  INPATIENT_DEPARTMENTAL_ORDERS_ENABLED?: string | null;
  NEXT_PUBLIC_INPATIENT_DEPARTMENTAL_ORDERS_ENABLED?: string | null;
  INPATIENT_MAR_ENABLED?: string | null;
  NEXT_PUBLIC_INPATIENT_MAR_ENABLED?: string | null;
  INPATIENT_DOCUMENTATION_ENABLED?: string | null;
  NEXT_PUBLIC_INPATIENT_DOCUMENTATION_ENABLED?: string | null;
};

export function inpatientClinicalWorkspaceEnabled(
  env?: InpatientWorkspaceFlagEnv | null
): boolean {
  if (!env) return false;
  return (
    isTruthyFlag(env.INPATIENT_WORKSPACE_ENABLED) ||
    isTruthyFlag(env.NEXT_PUBLIC_INPATIENT_WORKSPACE_ENABLED)
  );
}

export function inpatientDepartmentalOrdersEnabled(
  env?: InpatientWorkspaceFlagEnv | null
): boolean {
  if (!env) return false;
  return (
    isTruthyFlag(env.INPATIENT_DEPARTMENTAL_ORDERS_ENABLED) ||
    isTruthyFlag(env.NEXT_PUBLIC_INPATIENT_DEPARTMENTAL_ORDERS_ENABLED)
  );
}

export function inpatientMarEnabled(env?: InpatientWorkspaceFlagEnv | null): boolean {
  if (!env) return false;
  return (
    isTruthyFlag(env.INPATIENT_MAR_ENABLED) ||
    isTruthyFlag(env.NEXT_PUBLIC_INPATIENT_MAR_ENABLED)
  );
}

export function inpatientDocumentationEnabled(
  env?: InpatientWorkspaceFlagEnv | null
): boolean {
  if (!env) return false;
  return (
    isTruthyFlag(env.INPATIENT_DOCUMENTATION_ENABLED) ||
    isTruthyFlag(env.NEXT_PUBLIC_INPATIENT_DOCUMENTATION_ENABLED)
  );
}

export function inpatientWorkspaceFlagsFromProcessEnv(
  processEnv: NodeJS.ProcessEnv = typeof process !== "undefined" ? process.env : {}
): InpatientWorkspaceFlagEnv {
  return {
    INPATIENT_WORKSPACE_ENABLED: processEnv.INPATIENT_WORKSPACE_ENABLED,
    NEXT_PUBLIC_INPATIENT_WORKSPACE_ENABLED:
      processEnv.NEXT_PUBLIC_INPATIENT_WORKSPACE_ENABLED,
    INPATIENT_DEPARTMENTAL_ORDERS_ENABLED:
      processEnv.INPATIENT_DEPARTMENTAL_ORDERS_ENABLED,
    NEXT_PUBLIC_INPATIENT_DEPARTMENTAL_ORDERS_ENABLED:
      processEnv.NEXT_PUBLIC_INPATIENT_DEPARTMENTAL_ORDERS_ENABLED,
    INPATIENT_MAR_ENABLED: processEnv.INPATIENT_MAR_ENABLED,
    NEXT_PUBLIC_INPATIENT_MAR_ENABLED: processEnv.NEXT_PUBLIC_INPATIENT_MAR_ENABLED,
    INPATIENT_DOCUMENTATION_ENABLED: processEnv.INPATIENT_DOCUMENTATION_ENABLED,
    NEXT_PUBLIC_INPATIENT_DOCUMENTATION_ENABLED:
      processEnv.NEXT_PUBLIC_INPATIENT_DOCUMENTATION_ENABLED,
  };
}
