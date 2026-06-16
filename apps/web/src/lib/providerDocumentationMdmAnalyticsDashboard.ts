/**
 * MEDUI.ED.POSTCERT.8 — MDM completion dashboard view model.
 * Read-only readiness scoring from certified bundles. No API calls.
 */
import {
  aggregateMdmCompletion,
  buildProviderDocumentationAnalyticsAggregates,
  rankByNumericField,
} from "./providerDocumentationAnalyticsAggregates";
import { ENTERPRISE_MDM1_REQUIRED_SECTIONS } from "./providerDocumentationEnterpriseGovernanceV2";
import type { ProviderDocumentationAnalyticsMdmSectionId } from "./providerDocumentationAnalyticsModel";
import type { ProviderDocumentationMdmCompletionAggregate } from "./providerDocumentationAnalyticsAggregates";
import type { EnterpriseGovernanceFamilyId } from "./providerDocumentationEnterpriseGovernanceRegistry";
import type { EnterpriseGovernanceOwnerId } from "./providerDocumentationEnterpriseGovernanceV2";

export type ProviderDocumentationMdmSectionSummary = {
  sectionId: ProviderDocumentationAnalyticsMdmSectionId;
  label: string;
  completionRate: number;
  readinessScore: number;
  templateCount: number;
  presentCount: number;
};

export type ProviderDocumentationMdmAnalyticsDashboard = {
  generatedAt: string;
  sectionSummaries: ProviderDocumentationMdmSectionSummary[];
  byTemplate: ProviderDocumentationMdmCompletionAggregate[];
  byFamily: {
    familyId: EnterpriseGovernanceFamilyId;
    completionRate: number;
    readinessScore: number;
    templateCount: number;
  }[];
  byGovernanceOwner: {
    governanceOwnerId: EnterpriseGovernanceOwnerId;
    completionRate: number;
    readinessScore: number;
    templateCount: number;
  }[];
  overallReadinessScore: number;
};

const MDM_SECTION_LABELS: Record<ProviderDocumentationAnalyticsMdmSectionId, string> = {
  mdmWorkingAssessment: "Working Assessment",
  mdmDifferentialSynthesis: "Differential Synthesis",
  mdmDataReviewed: "Data Reviewed",
  mdmRiskStratification: "Risk Stratification",
  mdmClinicalRationale: "Clinical Rationale",
  clinicalImpression: "Clinical Impression",
  mdmPlanSummary: "Plan Summary",
};

function groupCompletionRate(rows: ProviderDocumentationMdmCompletionAggregate[]): number {
  if (rows.length === 0) return 0;
  return rows.reduce((sum, row) => sum + row.completionRate, 0) / rows.length;
}

function groupReadinessScore(rows: ProviderDocumentationMdmCompletionAggregate[]): number {
  if (rows.length === 0) return 0;
  return rows.reduce((sum, row) => sum + row.readinessScore, 0) / rows.length;
}

export function buildMdmAnalyticsDashboard(
  generatedAt = new Date(0).toISOString()
): ProviderDocumentationMdmAnalyticsDashboard {
  const rows = aggregateMdmCompletion();

  const sectionSummaries = ENTERPRISE_MDM1_REQUIRED_SECTIONS.map((sectionId) => {
    const sectionRows = rows.filter((row) => row.sectionId === sectionId);
    const presentCount = sectionRows.filter((row) => row.presentCount > 0).length;
    return {
      sectionId,
      label: MDM_SECTION_LABELS[sectionId],
      completionRate: groupCompletionRate(sectionRows),
      readinessScore: groupReadinessScore(sectionRows),
      templateCount: sectionRows.length,
      presentCount,
    };
  });

  const familyIds = [...new Set(rows.map((row) => row.familyId).filter(Boolean))] as EnterpriseGovernanceFamilyId[];
  const byFamily = familyIds.map((familyId) => {
    const familyRows = rows.filter((row) => row.familyId === familyId);
    const templateCount = new Set(familyRows.map((row) => row.templateId)).size;
    return {
      familyId,
      completionRate: groupCompletionRate(familyRows),
      readinessScore: groupReadinessScore(familyRows),
      templateCount,
    };
  });

  const ownerIds = [...new Set(rows.map((row) => row.governanceOwnerId).filter(Boolean))] as EnterpriseGovernanceOwnerId[];
  const byGovernanceOwner = ownerIds.map((governanceOwnerId) => {
    const ownerRows = rows.filter((row) => row.governanceOwnerId === governanceOwnerId);
    const templateCount = new Set(ownerRows.map((row) => row.templateId)).size;
    return {
      governanceOwnerId,
      completionRate: groupCompletionRate(ownerRows),
      readinessScore: groupReadinessScore(ownerRows),
      templateCount,
    };
  });

  const byTemplate = rankByNumericField(
    [...new Map(rows.map((row) => [`${row.templateId}:${row.sectionId}`, row])).values()],
    "readinessScore",
    "desc"
  );

  return {
    generatedAt,
    sectionSummaries,
    byTemplate,
    byFamily: rankByNumericField(byFamily, "readinessScore", "desc"),
    byGovernanceOwner: rankByNumericField(byGovernanceOwner, "readinessScore", "desc"),
    overallReadinessScore: groupReadinessScore(rows),
  };
}

export function buildMdmAnalyticsFromAggregates(): ProviderDocumentationMdmAnalyticsDashboard {
  const aggregates = buildProviderDocumentationAnalyticsAggregates();
  return buildMdmAnalyticsDashboard(aggregates.generatedAt);
}
