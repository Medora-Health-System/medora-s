import { enterpriseChartCertificationStageB1Enabled } from "@medora/shared";

/** Web gate for Stage B1 server-owned certification UI. Default OFF. */
export function isEnterpriseChartCertificationStageB1Enabled(): boolean {
  return enterpriseChartCertificationStageB1Enabled({
    NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_B1:
      process.env.NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_B1,
    ENTERPRISE_CHART_CERTIFICATION_STAGE_B1: process.env.ENTERPRISE_CHART_CERTIFICATION_STAGE_B1,
  });
}
