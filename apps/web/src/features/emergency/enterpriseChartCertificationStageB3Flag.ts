/**
 * Stage B3 feature flag — default OFF.
 * When ON, Review Certification uses the server B1+B2+B3 payload (B3 implies B1+B2 foundation).
 */
export function isEnterpriseChartCertificationStageB3Enabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_B3;
  if (raw == null) return false;
  const v = String(raw).trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}
