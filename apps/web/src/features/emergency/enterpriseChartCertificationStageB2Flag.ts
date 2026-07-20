/**
 * Stage B2 feature flag — default OFF.
 * When ON, Review Certification uses the server B1+B2 payload (B2 implies B1 foundation).
 */
export function isEnterpriseChartCertificationStageB2Enabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_B2;
  if (raw == null) return false;
  const v = String(raw).trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}
