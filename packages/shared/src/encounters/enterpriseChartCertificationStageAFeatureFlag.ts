/**
 * Stage A enterprise chart certification rollout control.
 * Safe default: OFF (must be explicitly enabled).
 *
 * Env (any truthy match enables):
 * - ENTERPRISE_CHART_CERTIFICATION_STAGE_A
 * - NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_A
 */

export const ENTERPRISE_CHART_CERTIFICATION_STAGE_A_FLAG =
  "enterpriseChartCertificationStageA" as const;

function isTruthyFlag(value: string | undefined | null): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export type EnterpriseChartCertificationStageAFlagEnv = {
  ENTERPRISE_CHART_CERTIFICATION_STAGE_A?: string | null;
  NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_A?: string | null;
};

/** Pure resolver — pass env explicitly in tests; defaults OFF when unset. */
export function enterpriseChartCertificationStageAEnabled(
  env?: EnterpriseChartCertificationStageAFlagEnv | null
): boolean {
  if (!env) return false;
  return (
    isTruthyFlag(env.ENTERPRISE_CHART_CERTIFICATION_STAGE_A) ||
    isTruthyFlag(env.NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_A)
  );
}

/** Node/process helper for API scripts (still defaults OFF). */
export function enterpriseChartCertificationStageAEnabledFromProcessEnv(
  processEnv: NodeJS.ProcessEnv = typeof process !== "undefined" ? process.env : {}
): boolean {
  return enterpriseChartCertificationStageAEnabled({
    ENTERPRISE_CHART_CERTIFICATION_STAGE_A: processEnv.ENTERPRISE_CHART_CERTIFICATION_STAGE_A,
    NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_A:
      processEnv.NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_A,
  });
}
