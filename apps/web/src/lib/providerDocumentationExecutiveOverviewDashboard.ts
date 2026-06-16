/**
 * MEDUI.ED.POSTCERT.8 — Executive overview dashboard view model.
 * Display contracts only. No API calls. Read-only analytics baseline.
 */
import {
  aggregateCertificationHealth,
  aggregateFamilyUsage,
  aggregateGovernanceHealth,
  aggregateTemplateUsage,
  buildProviderDocumentationAnalyticsAggregates,
} from "./providerDocumentationAnalyticsAggregates";
import type { ProviderDocumentationAnalyticsDashboardMetricKey } from "./providerDocumentationAnalyticsDashboardContracts";

export type ProviderDocumentationExecutiveOverviewKpi = {
  metricKey: ProviderDocumentationAnalyticsDashboardMetricKey;
  label: string;
  value: number;
  format: "count" | "rate" | "percent";
};

export type ProviderDocumentationExecutiveOverviewDashboard = {
  generatedAt: string;
  kpis: ProviderDocumentationExecutiveOverviewKpi[];
  dashboardCompletionRate: number;
  driftIndicatorCount: number;
  summary: {
    certifiedTemplateCount: number;
    certifiedFamilyCount: number;
    trackCPassRate: number;
    humanDocPassRate: number;
    mdm1PassRate: number;
    governancePassRate: number;
  };
};

function asPercent(rate: number): number {
  return Math.round(rate * 1000) / 10;
}

export function buildExecutiveOverviewDashboard(
  generatedAt = new Date(0).toISOString()
): ProviderDocumentationExecutiveOverviewDashboard {
  const certification = aggregateCertificationHealth();
  const governance = aggregateGovernanceHealth();
  const templateUsage = aggregateTemplateUsage();
  const familyUsage = aggregateFamilyUsage();

  const totalUsage = templateUsage.reduce((sum, item) => sum + item.usageCount, 0);
  const totalCompletion = templateUsage.reduce((sum, item) => sum + item.completionCount, 0);
  const templateCompletionRate = totalUsage === 0 ? 0 : totalCompletion / totalUsage;

  const driftIndicatorCount = certification.driftIndicators.length;
  const governancePenalty =
    governance.ownerlessTemplateCount +
    governance.missingHumanDocRegistrationCount +
    governance.missingTrackCRegistrationCount +
    governance.missingMdm1RegistrationCount +
    governance.missingGovernanceModuleCount +
    governance.isolationViolationCount;

  const dashboardCompletionRate =
    (certification.trackCPassRate +
      certification.humanDocPassRate +
      certification.mdm1PassRate +
      certification.governancePassRate +
      (governancePenalty === 0 ? 1 : 0)) /
    5;

  const kpis: ProviderDocumentationExecutiveOverviewKpi[] = [
    { metricKey: "certified_template_count", label: "Certified Templates", value: certification.certifiedTemplateCount, format: "count" },
    { metricKey: "certified_family_count", label: "Certified Families", value: certification.certifiedFamilyCount, format: "count" },
    { metricKey: "track_c_pass_rate", label: "Track C Pass Rate", value: asPercent(certification.trackCPassRate), format: "percent" },
    { metricKey: "human_doc_pass_rate", label: "Human Documentation Pass Rate", value: asPercent(certification.humanDocPassRate), format: "percent" },
    { metricKey: "mdm1_pass_rate", label: "MDM.1 Pass Rate", value: asPercent(certification.mdm1PassRate), format: "percent" },
    { metricKey: "governance_pass_rate", label: "Governance Pass Rate", value: asPercent(certification.governancePassRate), format: "percent" },
    { metricKey: "template_usage_count", label: "Template Usage (baseline)", value: totalUsage, format: "count" },
    { metricKey: "template_completion_rate", label: "Template Completion Rate", value: asPercent(templateCompletionRate), format: "percent" },
    { metricKey: "drift_indicator_count", label: "Drift Indicators", value: driftIndicatorCount, format: "count" },
  ];

  void familyUsage;

  return {
    generatedAt,
    kpis,
    dashboardCompletionRate: asPercent(dashboardCompletionRate),
    driftIndicatorCount,
    summary: {
      certifiedTemplateCount: certification.certifiedTemplateCount,
      certifiedFamilyCount: certification.certifiedFamilyCount,
      trackCPassRate: certification.trackCPassRate,
      humanDocPassRate: certification.humanDocPassRate,
      mdm1PassRate: certification.mdm1PassRate,
      governancePassRate: certification.governancePassRate,
    },
  };
}

export function buildExecutiveOverviewFromAggregates(): ProviderDocumentationExecutiveOverviewDashboard {
  const aggregates = buildProviderDocumentationAnalyticsAggregates();
  return buildExecutiveOverviewDashboard(aggregates.generatedAt);
}
