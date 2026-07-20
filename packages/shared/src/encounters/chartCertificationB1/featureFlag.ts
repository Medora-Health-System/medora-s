/**
 * Stage B1 chart certification rollout — default OFF.
 *
 * Env:
 * - ENTERPRISE_CHART_CERTIFICATION_STAGE_B1
 * - NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_B1
 */

export const ENTERPRISE_CHART_CERTIFICATION_STAGE_B1_FLAG =
  "enterpriseChartCertificationStageB1" as const;

function isTruthyFlag(value: string | undefined | null): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export type EnterpriseChartCertificationStageB1FlagEnv = {
  ENTERPRISE_CHART_CERTIFICATION_STAGE_B1?: string | null;
  NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_B1?: string | null;
};

export function enterpriseChartCertificationStageB1Enabled(
  env?: EnterpriseChartCertificationStageB1FlagEnv | null
): boolean {
  if (!env) return false;
  return (
    isTruthyFlag(env.ENTERPRISE_CHART_CERTIFICATION_STAGE_B1) ||
    isTruthyFlag(env.NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_B1)
  );
}

export function enterpriseChartCertificationStageB1EnabledFromProcessEnv(
  processEnv: NodeJS.ProcessEnv = typeof process !== "undefined" ? process.env : {}
): boolean {
  return enterpriseChartCertificationStageB1Enabled({
    ENTERPRISE_CHART_CERTIFICATION_STAGE_B1: processEnv.ENTERPRISE_CHART_CERTIFICATION_STAGE_B1,
    NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_B1:
      processEnv.NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_B1,
  });
}
