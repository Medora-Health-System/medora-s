/**
 * D3C — Internal placement / receiving encounter feature flags.
 * Safe defaults: all OFF. Separate from hospitalEpisodeFoundationEnabled.
 */

function isTruthyFlag(value: string | undefined | null): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export const INTERNAL_PLACEMENT_WORKFLOW_FLAG = "internalPlacementWorkflowEnabled" as const;
export const RECEIVING_ENCOUNTER_FOUNDATION_FLAG = "receivingEncounterFoundationEnabled" as const;

export type InternalPlacementFlagEnv = {
  INTERNAL_PLACEMENT_WORKFLOW_ENABLED?: string | null;
  NEXT_PUBLIC_INTERNAL_PLACEMENT_WORKFLOW_ENABLED?: string | null;
  RECEIVING_ENCOUNTER_FOUNDATION_ENABLED?: string | null;
  NEXT_PUBLIC_RECEIVING_ENCOUNTER_FOUNDATION_ENABLED?: string | null;
};

export function internalPlacementWorkflowEnabled(
  env?: InternalPlacementFlagEnv | null
): boolean {
  if (!env) return false;
  return (
    isTruthyFlag(env.INTERNAL_PLACEMENT_WORKFLOW_ENABLED) ||
    isTruthyFlag(env.NEXT_PUBLIC_INTERNAL_PLACEMENT_WORKFLOW_ENABLED)
  );
}

export function receivingEncounterFoundationEnabled(
  env?: InternalPlacementFlagEnv | null
): boolean {
  if (!env) return false;
  return (
    isTruthyFlag(env.RECEIVING_ENCOUNTER_FOUNDATION_ENABLED) ||
    isTruthyFlag(env.NEXT_PUBLIC_RECEIVING_ENCOUNTER_FOUNDATION_ENABLED)
  );
}

export function internalPlacementWorkflowEnabledFromProcessEnv(
  processEnv: NodeJS.ProcessEnv = typeof process !== "undefined" ? process.env : {}
): boolean {
  return internalPlacementWorkflowEnabled({
    INTERNAL_PLACEMENT_WORKFLOW_ENABLED: processEnv.INTERNAL_PLACEMENT_WORKFLOW_ENABLED,
    NEXT_PUBLIC_INTERNAL_PLACEMENT_WORKFLOW_ENABLED:
      processEnv.NEXT_PUBLIC_INTERNAL_PLACEMENT_WORKFLOW_ENABLED,
  });
}

export function receivingEncounterFoundationEnabledFromProcessEnv(
  processEnv: NodeJS.ProcessEnv = typeof process !== "undefined" ? process.env : {}
): boolean {
  return receivingEncounterFoundationEnabled({
    RECEIVING_ENCOUNTER_FOUNDATION_ENABLED:
      processEnv.RECEIVING_ENCOUNTER_FOUNDATION_ENABLED,
    NEXT_PUBLIC_RECEIVING_ENCOUNTER_FOUNDATION_ENABLED:
      processEnv.NEXT_PUBLIC_RECEIVING_ENCOUNTER_FOUNDATION_ENABLED,
  });
}
