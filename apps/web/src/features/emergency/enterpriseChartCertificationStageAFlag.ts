import { enterpriseChartCertificationStageAEnabled } from "@medora/shared";

/**
 * Web rollout gate for Stage A advisory chart certification UI.
 * Default OFF unless NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_A is truthy.
 */
export function isEnterpriseChartCertificationStageAEnabled(): boolean {
  return enterpriseChartCertificationStageAEnabled({
    NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_A:
      process.env.NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_A,
    ENTERPRISE_CHART_CERTIFICATION_STAGE_A: process.env.ENTERPRISE_CHART_CERTIFICATION_STAGE_A,
  });
}
