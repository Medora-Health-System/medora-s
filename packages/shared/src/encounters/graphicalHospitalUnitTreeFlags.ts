/**
 * D3E.6C — Graphical unit tree / dedicated board feature flags.
 * Production defaults remain OFF.
 */

function isTruthyFlag(value: string | undefined | null): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export type GraphicalHospitalUnitTreeFlagEnv = {
  GRAPHICAL_HOSPITAL_UNIT_TREE_ENABLED?: string | null;
  NEXT_PUBLIC_GRAPHICAL_HOSPITAL_UNIT_TREE_ENABLED?: string | null;
  DEDICATED_UNIT_BOARDS_ENABLED?: string | null;
  NEXT_PUBLIC_DEDICATED_UNIT_BOARDS_ENABLED?: string | null;
  NODE_ENV?: string | null;
};

export function graphicalHospitalUnitTreeFlagsFromProcessEnv(
  processEnv: NodeJS.ProcessEnv = typeof process !== "undefined" ? process.env : {}
): GraphicalHospitalUnitTreeFlagEnv {
  return {
    GRAPHICAL_HOSPITAL_UNIT_TREE_ENABLED: processEnv.GRAPHICAL_HOSPITAL_UNIT_TREE_ENABLED,
    NEXT_PUBLIC_GRAPHICAL_HOSPITAL_UNIT_TREE_ENABLED:
      processEnv.NEXT_PUBLIC_GRAPHICAL_HOSPITAL_UNIT_TREE_ENABLED,
    DEDICATED_UNIT_BOARDS_ENABLED: processEnv.DEDICATED_UNIT_BOARDS_ENABLED,
    NEXT_PUBLIC_DEDICATED_UNIT_BOARDS_ENABLED:
      processEnv.NEXT_PUBLIC_DEDICATED_UNIT_BOARDS_ENABLED,
    NODE_ENV: processEnv.NODE_ENV,
  };
}

export function graphicalHospitalUnitTreeEnabled(
  env?: GraphicalHospitalUnitTreeFlagEnv | null
): boolean {
  if (!env) return false;
  return (
    isTruthyFlag(env.GRAPHICAL_HOSPITAL_UNIT_TREE_ENABLED) ||
    isTruthyFlag(env.NEXT_PUBLIC_GRAPHICAL_HOSPITAL_UNIT_TREE_ENABLED)
  );
}

export function dedicatedUnitBoardsEnabled(
  env?: GraphicalHospitalUnitTreeFlagEnv | null
): boolean {
  if (!env) return false;
  return (
    isTruthyFlag(env.DEDICATED_UNIT_BOARDS_ENABLED) ||
    isTruthyFlag(env.NEXT_PUBLIC_DEDICATED_UNIT_BOARDS_ENABLED) ||
    // Soft-enable boards when graphical tree is ON.
    graphicalHospitalUnitTreeEnabled(env)
  );
}

/** Production defaults: both flag pairs OFF. */
export function graphicalHospitalUnitTreeProductionDefaultsAreOff(
  env: GraphicalHospitalUnitTreeFlagEnv = {}
): boolean {
  return !graphicalHospitalUnitTreeEnabled(env) && !dedicatedUnitBoardsEnabled(env);
}

/**
 * Browser helper: graphical tree is the primary hub when flag ON.
 * Local/test may enable via NEXT_PUBLIC_GRAPHICAL_HOSPITAL_UNIT_TREE_ENABLED.
 * Development fallback: when NODE_ENV is development/test and flag unset, treat as ON
 * for certification UX — production still requires explicit flag.
 */
export function graphicalHospitalUnitTreeEnabledInRuntime(
  env?: GraphicalHospitalUnitTreeFlagEnv | null
): boolean {
  if (graphicalHospitalUnitTreeEnabled(env)) return true;
  const n = String(env?.NODE_ENV ?? "")
    .trim()
    .toLowerCase();
  // Explicit false when production
  if (n === "production") return false;
  // Local/test activation permitted without production default ON
  return n === "development" || n === "test" || n === "";
}
