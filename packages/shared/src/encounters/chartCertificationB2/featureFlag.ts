/**
 * Stage B2 feature flag — default OFF.
 * When ON, server runs B1+B2 evaluators on GET /encounters/:id/chart-certification.
 * B2 ON implies B1 foundation (server does not require separate B1 flag).
 */

export const ENTERPRISE_CHART_CERTIFICATION_STAGE_B2_FLAG =
  "enterpriseChartCertificationStageB2" as const;

export function enterpriseChartCertificationStageB2Enabled(
  env: Record<string, string | undefined> | null | undefined
): boolean {
  const raw =
    env?.ENTERPRISE_CHART_CERTIFICATION_STAGE_B2 ??
    env?.NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_B2;
  if (raw == null) return false;
  const v = String(raw).trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function enterpriseChartCertificationStageB2EnabledFromProcessEnv(
  processEnv: NodeJS.ProcessEnv | Record<string, string | undefined>
): boolean {
  return enterpriseChartCertificationStageB2Enabled(processEnv as Record<string, string | undefined>);
}
