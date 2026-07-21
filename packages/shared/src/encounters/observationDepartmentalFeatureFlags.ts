/**
 * D3DA — Observation departmental integration feature flags (all default OFF).
 */

function isTruthyFlag(value: string | undefined | null): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export type ObservationDepartmentalFlagEnv = {
  OBSERVATION_WORKSPACE_ENABLED?: string | null;
  NEXT_PUBLIC_OBSERVATION_WORKSPACE_ENABLED?: string | null;
  OBSERVATION_DEPARTMENTAL_ORDERS_ENABLED?: string | null;
  NEXT_PUBLIC_OBSERVATION_DEPARTMENTAL_ORDERS_ENABLED?: string | null;
  OBSERVATION_MAR_ENABLED?: string | null;
  NEXT_PUBLIC_OBSERVATION_MAR_ENABLED?: string | null;
  OBSERVATION_DOCUMENTATION_ENABLED?: string | null;
  NEXT_PUBLIC_OBSERVATION_DOCUMENTATION_ENABLED?: string | null;
};

export function observationClinicalWorkspaceEnabled(
  env?: ObservationDepartmentalFlagEnv | null
): boolean {
  if (!env) return false;
  return (
    isTruthyFlag(env.OBSERVATION_WORKSPACE_ENABLED) ||
    isTruthyFlag(env.NEXT_PUBLIC_OBSERVATION_WORKSPACE_ENABLED)
  );
}

export function observationDepartmentalOrdersEnabled(
  env?: ObservationDepartmentalFlagEnv | null
): boolean {
  if (!env) return false;
  return (
    isTruthyFlag(env.OBSERVATION_DEPARTMENTAL_ORDERS_ENABLED) ||
    isTruthyFlag(env.NEXT_PUBLIC_OBSERVATION_DEPARTMENTAL_ORDERS_ENABLED)
  );
}

export function observationMarEnabled(env?: ObservationDepartmentalFlagEnv | null): boolean {
  if (!env) return false;
  return (
    isTruthyFlag(env.OBSERVATION_MAR_ENABLED) ||
    isTruthyFlag(env.NEXT_PUBLIC_OBSERVATION_MAR_ENABLED)
  );
}

export function observationDocumentationEnabled(
  env?: ObservationDepartmentalFlagEnv | null
): boolean {
  if (!env) return false;
  return (
    isTruthyFlag(env.OBSERVATION_DOCUMENTATION_ENABLED) ||
    isTruthyFlag(env.NEXT_PUBLIC_OBSERVATION_DOCUMENTATION_ENABLED)
  );
}

export function observationDepartmentalFlagsFromProcessEnv(
  processEnv: NodeJS.ProcessEnv = typeof process !== "undefined" ? process.env : {}
): ObservationDepartmentalFlagEnv {
  return {
    OBSERVATION_WORKSPACE_ENABLED: processEnv.OBSERVATION_WORKSPACE_ENABLED,
    NEXT_PUBLIC_OBSERVATION_WORKSPACE_ENABLED:
      processEnv.NEXT_PUBLIC_OBSERVATION_WORKSPACE_ENABLED,
    OBSERVATION_DEPARTMENTAL_ORDERS_ENABLED:
      processEnv.OBSERVATION_DEPARTMENTAL_ORDERS_ENABLED,
    NEXT_PUBLIC_OBSERVATION_DEPARTMENTAL_ORDERS_ENABLED:
      processEnv.NEXT_PUBLIC_OBSERVATION_DEPARTMENTAL_ORDERS_ENABLED,
    OBSERVATION_MAR_ENABLED: processEnv.OBSERVATION_MAR_ENABLED,
    NEXT_PUBLIC_OBSERVATION_MAR_ENABLED: processEnv.NEXT_PUBLIC_OBSERVATION_MAR_ENABLED,
    OBSERVATION_DOCUMENTATION_ENABLED: processEnv.OBSERVATION_DOCUMENTATION_ENABLED,
    NEXT_PUBLIC_OBSERVATION_DOCUMENTATION_ENABLED:
      processEnv.NEXT_PUBLIC_OBSERVATION_DOCUMENTATION_ENABLED,
  };
}
