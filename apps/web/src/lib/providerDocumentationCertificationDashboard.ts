/**
 * MEDUI.ED.POSTCERT.8 — Certification health dashboard view model.
 * Read-only enterprise certification monitoring. No API calls.
 */
import {
  aggregateCertificationHealth,
  buildProviderDocumentationAnalyticsAggregates,
} from "./providerDocumentationAnalyticsAggregates";
import { ENTERPRISE_CERTIFIED_GOVERNANCE_FAMILIES } from "./providerDocumentationEnterpriseGovernanceRegistry";
import {
  auditEnterpriseCertificationForTemplate,
  bundlePassesEnterpriseMdm1,
  bundlePassesEnterpriseTrackC,
} from "./providerDocumentationEnterpriseGovernanceV2";
import { HUMAN_DOCUMENTATION_AUDIT_FAMILIES } from "./providerDocumentationHumanDocumentationAudit";
import type { ProviderDocumentationCertificationDriftIndicator } from "./providerDocumentationAnalyticsModel";

export type ProviderDocumentationFamilyCertificationStatus = {
  familyId: string;
  displayName: string;
  auditPhase: string | null;
  templateCount: number;
  trackCPassRate: number;
  humanDocPassRate: number;
  mdm1PassRate: number;
  governancePassRate: number;
  driftIndicators: ProviderDocumentationCertificationDriftIndicator[];
  status: "certified" | "partial" | "uncertified";
};

export type ProviderDocumentationCertificationDashboard = {
  generatedAt: string;
  certifiedTemplateCount: number;
  certifiedFamilyCount: number;
  trackCPassRate: number;
  humanDocPassRate: number;
  mdm1PassRate: number;
  governancePassRate: number;
  driftIndicators: ProviderDocumentationCertificationDriftIndicator[];
  familyStatuses: ProviderDocumentationFamilyCertificationStatus[];
};

export function buildCertificationDashboard(
  generatedAt = new Date(0).toISOString()
): ProviderDocumentationCertificationDashboard {
  const health = aggregateCertificationHealth();
  const familyStatuses: ProviderDocumentationFamilyCertificationStatus[] = [];

  for (const registryEntry of ENTERPRISE_CERTIFIED_GOVERNANCE_FAMILIES) {
    const auditFamily = HUMAN_DOCUMENTATION_AUDIT_FAMILIES.find((item) => item.phase === registryEntry.auditPhase);
    const templates = auditFamily?.templates ?? [];
    const total = templates.length;

    let trackCPass = 0;
    let humanDocPass = 0;
    let mdm1Pass = 0;
    let governancePass = 0;
    const driftIndicators: ProviderDocumentationCertificationDriftIndicator[] = [];

    for (const template of templates) {
      const violations = auditEnterpriseCertificationForTemplate(template.templateId, template.bundle);
      if (bundlePassesEnterpriseTrackC(template.bundle)) trackCPass += 1;
      if (bundlePassesEnterpriseMdm1(template.bundle)) mdm1Pass += 1;
      if (!violations.some((v) => v.requirement === "human_documentation_pass")) humanDocPass += 1;
      if (violations.length === 0) governancePass += 1;
    }

    if (registryEntry.deniedNamespacePrefixes.length === 0) {
      driftIndicators.push("new_unisolated_family");
    }

    const trackCPassRate = total === 0 ? 1 : trackCPass / total;
    const humanDocPassRate = total === 0 ? 1 : humanDocPass / total;
    const mdm1PassRate = total === 0 ? 1 : mdm1Pass / total;
    const governancePassRate = total === 0 ? 1 : governancePass / total;

    const allPass =
      trackCPassRate === 1 && humanDocPassRate === 1 && mdm1PassRate === 1 && governancePassRate === 1;

    familyStatuses.push({
      familyId: registryEntry.familyId,
      displayName: registryEntry.displayName,
      auditPhase: registryEntry.auditPhase,
      templateCount: total,
      trackCPassRate,
      humanDocPassRate,
      mdm1PassRate,
      governancePassRate,
      driftIndicators,
      status: allPass ? "certified" : trackCPassRate > 0 || humanDocPassRate > 0 ? "partial" : "uncertified",
    });
  }

  return {
    generatedAt,
    certifiedTemplateCount: health.certifiedTemplateCount,
    certifiedFamilyCount: health.certifiedFamilyCount,
    trackCPassRate: health.trackCPassRate,
    humanDocPassRate: health.humanDocPassRate,
    mdm1PassRate: health.mdm1PassRate,
    governancePassRate: health.governancePassRate,
    driftIndicators: health.driftIndicators,
    familyStatuses,
  };
}

export function buildCertificationDashboardFromAggregates(): ProviderDocumentationCertificationDashboard {
  const aggregates = buildProviderDocumentationAnalyticsAggregates();
  return buildCertificationDashboard(aggregates.generatedAt);
}
