/**
 * MEDUI.ED.POSTCERT.9 — Medical Exam Analytics admin page view model.
 * Read-only. Consumes POSTCERT.8 dashboard layout and view models.
 */
import { buildProviderDocumentationDashboardLayout } from "./providerDocumentationAnalyticsDashboardLayout";
import { PROVIDER_DOCUMENTATION_ANALYTICS_DASHBOARD_SECTIONS } from "./providerDocumentationAnalyticsDashboardContracts";
import { buildTemplateAnalyticsDashboard } from "./providerDocumentationTemplateAnalyticsDashboard";
import { buildChipAnalyticsDashboard } from "./providerDocumentationChipAnalyticsDashboard";
import { buildMdmAnalyticsDashboard } from "./providerDocumentationMdmAnalyticsDashboard";
import { buildGovernanceAnalyticsDashboard } from "./providerDocumentationGovernanceAnalyticsDashboard";
import { buildCertificationDashboard } from "./providerDocumentationCertificationDashboard";
import { buildExecutiveOverviewDashboard } from "./providerDocumentationExecutiveOverviewDashboard";
import { dashboardCardsBySection } from "./providerDocumentationDashboardContracts";
import type { ProviderDocumentationAnalyticsDashboardSectionId } from "./providerDocumentationAnalyticsDashboardContracts";

export type MedicalExamAnalyticsPageSection = {
  id: ProviderDocumentationAnalyticsDashboardSectionId;
  titleKey: string;
  testId: string;
};

export const MEDICAL_EXAM_ANALYTICS_PAGE_SECTIONS: readonly MedicalExamAnalyticsPageSection[] = [
  { id: "executive_overview", titleKey: "medicalExamAnalytics.sectionExecutive", testId: "medical-exam-analytics-executive" },
  { id: "template_adoption", titleKey: "medicalExamAnalytics.sectionTemplate", testId: "medical-exam-analytics-template" },
  { id: "family_adoption", titleKey: "medicalExamAnalytics.sectionFamily", testId: "medical-exam-analytics-family" },
  { id: "chip_usage", titleKey: "medicalExamAnalytics.sectionChip", testId: "medical-exam-analytics-chip" },
  { id: "mdm_completion", titleKey: "medicalExamAnalytics.sectionMdm", testId: "medical-exam-analytics-mdm" },
  { id: "governance_health", titleKey: "medicalExamAnalytics.sectionGovernance", testId: "medical-exam-analytics-governance" },
  { id: "certification_health", titleKey: "medicalExamAnalytics.sectionCertification", testId: "medical-exam-analytics-certification" },
] as const;

export type MedicalExamAnalyticsPageModel = {
  layout: ReturnType<typeof buildProviderDocumentationDashboardLayout>;
  executive: ReturnType<typeof buildExecutiveOverviewDashboard>;
  template: ReturnType<typeof buildTemplateAnalyticsDashboard>;
  chip: ReturnType<typeof buildChipAnalyticsDashboard>;
  mdm: ReturnType<typeof buildMdmAnalyticsDashboard>;
  governance: ReturnType<typeof buildGovernanceAnalyticsDashboard>;
  certification: ReturnType<typeof buildCertificationDashboard>;
  sections: readonly MedicalExamAnalyticsPageSection[];
};

export function buildMedicalExamAnalyticsPageModel(
  generatedAt = new Date(0).toISOString()
): MedicalExamAnalyticsPageModel {
  return {
    layout: buildProviderDocumentationDashboardLayout(generatedAt),
    executive: buildExecutiveOverviewDashboard(generatedAt),
    template: buildTemplateAnalyticsDashboard(generatedAt),
    chip: buildChipAnalyticsDashboard(generatedAt),
    mdm: buildMdmAnalyticsDashboard(generatedAt),
    governance: buildGovernanceAnalyticsDashboard(generatedAt),
    certification: buildCertificationDashboard(generatedAt),
    sections: MEDICAL_EXAM_ANALYTICS_PAGE_SECTIONS,
  };
}

export function medicalExamAnalyticsSectionCardCount(
  model: MedicalExamAnalyticsPageModel,
  sectionId: ProviderDocumentationAnalyticsDashboardSectionId
): number {
  return dashboardCardsBySection(model.layout, sectionId).length;
}

export function validateMedicalExamAnalyticsPageSections(model: MedicalExamAnalyticsPageModel): boolean {
  const contractIds = new Set(PROVIDER_DOCUMENTATION_ANALYTICS_DASHBOARD_SECTIONS.map((section) => section.id));
  return model.sections.every((section) => contractIds.has(section.id));
}

export function medicalExamAnalyticsPageTestIds(): string[] {
  return MEDICAL_EXAM_ANALYTICS_PAGE_SECTIONS.map((section) => section.testId);
}
