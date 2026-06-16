/**
 * MEDUI.ED.POSTCERT.8 — Governance health dashboard view model.
 * Consumes Enterprise Governance Registry + Governance V2. Read-only.
 */
import {
  aggregateGovernanceHealth,
  buildProviderDocumentationAnalyticsAggregates,
} from "./providerDocumentationAnalyticsAggregates";
import { ENTERPRISE_CERTIFIED_GOVERNANCE_FAMILIES } from "./providerDocumentationEnterpriseGovernanceRegistry";
import { allCertifiedAuditTemplateIds, resolveEnterpriseGovernanceOwners } from "./providerDocumentationEnterpriseGovernanceV2";
import type { ProviderDocumentationGovernanceHealthMetrics } from "./providerDocumentationAnalyticsModel";
import type { ProviderDocumentationTemplateId } from "./providerDocumentationModel";

export type ProviderDocumentationGovernanceHealthIndicator = {
  key: keyof ProviderDocumentationGovernanceHealthMetrics | "governance_drift_score";
  label: string;
  count: number;
  status: "pass" | "warning" | "fail";
};

export type ProviderDocumentationGovernanceAnalyticsDashboard = {
  generatedAt: string;
  metrics: ProviderDocumentationGovernanceHealthMetrics;
  indicators: ProviderDocumentationGovernanceHealthIndicator[];
  governanceDriftScore: number;
  ownerlessTemplates: string[];
  duplicateOwnershipTemplates: string[];
  certifiedFamilyCount: number;
};

function computeGovernanceDriftScore(metrics: ProviderDocumentationGovernanceHealthMetrics): number {
  const totalTemplates = allCertifiedAuditTemplateIds().length;
  const issueCount =
    metrics.ownerlessTemplateCount +
    metrics.missingHumanDocRegistrationCount +
    metrics.missingTrackCRegistrationCount +
    metrics.missingMdm1RegistrationCount +
    metrics.missingGovernanceModuleCount +
    metrics.isolationViolationCount;
  const maxIssues = totalTemplates * 6;
  if (maxIssues === 0) return 100;
  return Math.round((1 - issueCount / maxIssues) * 1000) / 10;
}

export function buildGovernanceAnalyticsDashboard(
  generatedAt = new Date(0).toISOString()
): ProviderDocumentationGovernanceAnalyticsDashboard {
  const metrics = aggregateGovernanceHealth();
  const certifiedIds = allCertifiedAuditTemplateIds();

  const ownerlessTemplates = certifiedIds.filter(
    (templateId) => resolveEnterpriseGovernanceOwners(templateId as ProviderDocumentationTemplateId).length === 0
  );

  const duplicateOwnershipTemplates = certifiedIds.filter(
    (templateId) => resolveEnterpriseGovernanceOwners(templateId as ProviderDocumentationTemplateId).length > 1
  );

  const governanceDriftScore = computeGovernanceDriftScore(metrics);

  const indicators: ProviderDocumentationGovernanceHealthIndicator[] = [
    {
      key: "ownerlessTemplateCount",
      label: "Ownerless Templates",
      count: metrics.ownerlessTemplateCount,
      status: metrics.ownerlessTemplateCount === 0 ? "pass" : "fail",
    },
    {
      key: "duplicateOwnerCount",
      label: "Duplicate Ownership",
      count: metrics.duplicateOwnerCount,
      status: metrics.duplicateOwnerCount === 0 ? "pass" : "warning",
    },
    {
      key: "missingHumanDocRegistrationCount",
      label: "Missing Human Documentation Registration",
      count: metrics.missingHumanDocRegistrationCount,
      status: metrics.missingHumanDocRegistrationCount === 0 ? "pass" : "fail",
    },
    {
      key: "missingTrackCRegistrationCount",
      label: "Missing Track C Registration",
      count: metrics.missingTrackCRegistrationCount,
      status: metrics.missingTrackCRegistrationCount === 0 ? "pass" : "fail",
    },
    {
      key: "missingMdm1RegistrationCount",
      label: "Missing MDM.1 Registration",
      count: metrics.missingMdm1RegistrationCount,
      status: metrics.missingMdm1RegistrationCount === 0 ? "pass" : "fail",
    },
    {
      key: "missingGovernanceModuleCount",
      label: "Missing Governance Module",
      count: metrics.missingGovernanceModuleCount,
      status: metrics.missingGovernanceModuleCount === 0 ? "pass" : "fail",
    },
    {
      key: "isolationViolationCount",
      label: "Isolation Violations",
      count: metrics.isolationViolationCount,
      status: metrics.isolationViolationCount === 0 ? "pass" : "fail",
    },
    {
      key: "governance_drift_score",
      label: "Governance Drift Score",
      count: governanceDriftScore,
      status: governanceDriftScore >= 95 ? "pass" : governanceDriftScore >= 80 ? "warning" : "fail",
    },
  ];

  return {
    generatedAt,
    metrics,
    indicators,
    governanceDriftScore,
    ownerlessTemplates,
    duplicateOwnershipTemplates,
    certifiedFamilyCount: ENTERPRISE_CERTIFIED_GOVERNANCE_FAMILIES.length,
  };
}

export function buildGovernanceAnalyticsFromAggregates(): ProviderDocumentationGovernanceAnalyticsDashboard {
  const aggregates = buildProviderDocumentationAnalyticsAggregates();
  return buildGovernanceAnalyticsDashboard(aggregates.generatedAt);
}
