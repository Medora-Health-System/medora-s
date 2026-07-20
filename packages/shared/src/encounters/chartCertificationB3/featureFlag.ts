/**
 * Stage B3 feature flag — default OFF.
 * When ON, server runs B1+B2+B3 evaluators on GET /encounters/:id/chart-certification.
 * B3 ON implies B1+B2 foundation (server does not require separate B1/B2 flags).
 */

export const ENTERPRISE_CHART_CERTIFICATION_STAGE_B3_FLAG =
  "enterpriseChartCertificationStageB3" as const;

export function enterpriseChartCertificationStageB3Enabled(
  env: Record<string, string | undefined> | null | undefined
): boolean {
  const raw =
    env?.ENTERPRISE_CHART_CERTIFICATION_STAGE_B3 ??
    env?.NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_B3;
  if (raw == null) return false;
  const v = String(raw).trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function enterpriseChartCertificationStageB3EnabledFromProcessEnv(
  processEnv: NodeJS.ProcessEnv | Record<string, string | undefined>
): boolean {
  return enterpriseChartCertificationStageB3Enabled(
    processEnv as Record<string, string | undefined>
  );
}
