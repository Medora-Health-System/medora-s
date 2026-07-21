/**
 * D3D — Observation clinical workspace feature flag.
 * Safe default: OFF. Independent of D3B/D3C flags.
 */

function isTruthyFlag(value: string | undefined | null): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export const OBSERVATION_WORKSPACE_FLAG = "observationWorkspaceEnabled" as const;

export type ObservationWorkspaceFlagEnv = {
  OBSERVATION_WORKSPACE_ENABLED?: string | null;
  NEXT_PUBLIC_OBSERVATION_WORKSPACE_ENABLED?: string | null;
};

export function observationWorkspaceEnabled(
  env?: ObservationWorkspaceFlagEnv | null
): boolean {
  if (!env) return false;
  return (
    isTruthyFlag(env.OBSERVATION_WORKSPACE_ENABLED) ||
    isTruthyFlag(env.NEXT_PUBLIC_OBSERVATION_WORKSPACE_ENABLED)
  );
}

export function observationWorkspaceEnabledFromProcessEnv(
  processEnv: NodeJS.ProcessEnv = typeof process !== "undefined" ? process.env : {}
): boolean {
  return observationWorkspaceEnabled({
    OBSERVATION_WORKSPACE_ENABLED: processEnv.OBSERVATION_WORKSPACE_ENABLED,
    NEXT_PUBLIC_OBSERVATION_WORKSPACE_ENABLED:
      processEnv.NEXT_PUBLIC_OBSERVATION_WORKSPACE_ENABLED,
  });
}
