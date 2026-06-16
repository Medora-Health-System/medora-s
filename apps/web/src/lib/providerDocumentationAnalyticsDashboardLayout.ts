/**
 * MEDUI.ED.POSTCERT.8 — Full dashboard layout builder.
 * Composes all dashboard view models into component contracts.
 */
import { buildCertificationDashboard } from "./providerDocumentationCertificationDashboard";
import { buildChipAnalyticsDashboard } from "./providerDocumentationChipAnalyticsDashboard";
import { buildExecutiveOverviewDashboard } from "./providerDocumentationExecutiveOverviewDashboard";
import { buildGovernanceAnalyticsDashboard } from "./providerDocumentationGovernanceAnalyticsDashboard";
import { buildMdmAnalyticsDashboard } from "./providerDocumentationMdmAnalyticsDashboard";
import { buildTemplateAnalyticsDashboard } from "./providerDocumentationTemplateAnalyticsDashboard";
import { PROVIDER_DOCUMENTATION_ANALYTICS_DASHBOARD_SECTIONS } from "./providerDocumentationAnalyticsDashboardContracts";
import type {
  CertificationHealthCard,
  ChipUsageCard,
  ExecutiveOverviewCard,
  FamilyUsageCard,
  GovernanceHealthCard,
  MdmCompletionCard,
  ProviderDocumentationDashboardCard,
  ProviderDocumentationDashboardLayout,
  TemplateUsageCard,
} from "./providerDocumentationDashboardContracts";

export function buildProviderDocumentationDashboardLayout(
  generatedAt = new Date(0).toISOString()
): ProviderDocumentationDashboardLayout {
  const executive = buildExecutiveOverviewDashboard(generatedAt);
  const template = buildTemplateAnalyticsDashboard(generatedAt);
  const chip = buildChipAnalyticsDashboard(generatedAt);
  const mdm = buildMdmAnalyticsDashboard(generatedAt);
  const governance = buildGovernanceAnalyticsDashboard(generatedAt);
  const certification = buildCertificationDashboard(generatedAt);

  const executiveCard: ExecutiveOverviewCard = {
    kind: "executive_overview",
    sectionId: "executive_overview",
    title: "Executive Overview",
    kpis: executive.kpis.map((kpi) => ({
      label: kpi.label,
      value: kpi.value,
      status: kpi.format === "percent" && kpi.value === 100 ? "pass" : "neutral",
    })),
    dashboardCompletionRate: executive.dashboardCompletionRate,
    model: executive,
  };

  const familyCards: FamilyUsageCard[] = template.familyAdoptionBreakdown.map((family) => ({
    kind: "family_usage",
    sectionId: "family_adoption",
    familyId: family.familyId,
    displayName: family.displayName,
    auditPhase: family.auditPhase,
    templateCount: family.templateCount,
    usageCount: family.usageCount,
    completionRate: family.completionRate,
    totalChipCount: family.totalChipCount,
  }));

  const templateCards: TemplateUsageCard[] = template.featuredTemplates.map((item) => ({
    kind: "template_usage",
    sectionId: "template_adoption",
    templateId: item.templateId,
    familyId: item.familyId,
    governanceOwnerId: item.governanceOwnerId,
    usageCount: item.usageCount,
    completionRate: item.completionRate,
    abandonmentCount: item.abandonmentCount,
    catalogChipCount: item.catalogChipCount,
  }));

  const chipCards: ChipUsageCard[] = chip.mostInsertedMdmChips.slice(0, 5).map((item) => ({
    kind: "chip_usage",
    sectionId: "chip_usage",
    chipId: item.chipId,
    chipCategory: item.chipCategory,
    templateId: item.templateId,
    familyId: item.familyId,
    insertedCount: item.insertedCount,
    adoptionRate: item.adoptionRate,
    rank: item.rank,
  }));

  const mdmCards: MdmCompletionCard[] = mdm.sectionSummaries.map((section) => ({
    kind: "mdm_completion",
    sectionId: "mdm_completion",
    sectionId_mdm: section.sectionId,
    sectionLabel: section.label,
    completionRate: section.completionRate,
    readinessScore: section.readinessScore,
    templateCount: section.templateCount,
    presentCount: section.presentCount,
  }));

  const governanceCards: GovernanceHealthCard[] = governance.indicators.map((indicator) => ({
    kind: "governance_health",
    sectionId: "governance_health",
    indicatorKey: indicator.key,
    label: indicator.label,
    count: indicator.count,
    status: indicator.status,
    governanceDriftScore: governance.governanceDriftScore,
  }));

  const certificationCards: CertificationHealthCard[] = certification.familyStatuses.map((family) => ({
    kind: "certification_health",
    sectionId: "certification_health",
    familyId: family.familyId,
    displayName: family.displayName,
    auditPhase: family.auditPhase,
    templateCount: family.templateCount,
    trackCPassRate: family.trackCPassRate,
    humanDocPassRate: family.humanDocPassRate,
    mdm1PassRate: family.mdm1PassRate,
    governancePassRate: family.governancePassRate,
    status: family.status,
  }));

  const cards: ProviderDocumentationDashboardCard[] = [
    executiveCard,
    ...familyCards,
    ...templateCards,
    ...chipCards,
    ...mdmCards,
    ...governanceCards,
    ...certificationCards,
  ];

  return {
    generatedAt,
    sections: PROVIDER_DOCUMENTATION_ANALYTICS_DASHBOARD_SECTIONS.map((section) => section.id),
    cards,
  };
}
