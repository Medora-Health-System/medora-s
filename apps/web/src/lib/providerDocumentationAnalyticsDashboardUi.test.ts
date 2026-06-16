import { describe, expect, it } from "vitest";
import {
  buildMedicalExamAnalyticsPageModel,
  medicalExamAnalyticsPageTestIds,
  medicalExamAnalyticsSectionCardCount,
  validateMedicalExamAnalyticsPageSections,
  MEDICAL_EXAM_ANALYTICS_PAGE_SECTIONS,
} from "./medicalExamAnalyticsPageModel";
import { buildProviderDocumentationDashboardLayout } from "./providerDocumentationAnalyticsDashboardLayout";
import { dashboardCardsBySection } from "./providerDocumentationDashboardContracts";
import { allCertifiedAuditTemplateIds } from "./providerDocumentationEnterpriseGovernanceV2";
import { ENTERPRISE_CERTIFIED_GOVERNANCE_FAMILIES } from "./providerDocumentationEnterpriseGovernanceRegistry";

describe("providerDocumentationAnalyticsDashboardUi — MEDUI.ED.POSTCERT.9", () => {
  const model = buildMedicalExamAnalyticsPageModel();

  it("builds page model consuming dashboard layout", () => {
    expect(model.layout.sections).toHaveLength(7);
    expect(model.layout.cards.length).toBeGreaterThan(0);
    expect(validateMedicalExamAnalyticsPageSections(model)).toBe(true);
  });

  it("defines all seven dashboard sections for the admin page", () => {
    expect(MEDICAL_EXAM_ANALYTICS_PAGE_SECTIONS).toHaveLength(7);
    expect(medicalExamAnalyticsPageTestIds()).toEqual([
      "medical-exam-analytics-executive",
      "medical-exam-analytics-template",
      "medical-exam-analytics-family",
      "medical-exam-analytics-chip",
      "medical-exam-analytics-mdm",
      "medical-exam-analytics-governance",
      "medical-exam-analytics-certification",
    ]);
  });

  it("resolves executive overview KPIs for page render", () => {
    expect(model.executive.kpis.length).toBeGreaterThanOrEqual(8);
    expect(model.executive.summary.certifiedTemplateCount).toBe(allCertifiedAuditTemplateIds().length);
    expect(model.executive.dashboardCompletionRate).toBeGreaterThan(0);
  });

  it("resolves template analytics sections for page render", () => {
    expect(model.template.mostUsedTemplates.length).toBeGreaterThan(0);
    expect(model.template.familyAdoptionBreakdown).toHaveLength(8);
    expect(model.template.featuredTemplates.length).toBe(7);
  });

  it("resolves chip analytics sections for page render", () => {
    expect(model.chip.mostInsertedHpiChips.length).toBeGreaterThan(0);
    expect(model.chip.mostInsertedMdmChips.length).toBeGreaterThan(0);
    expect(model.chip.adoptionRateByFamily).toHaveLength(8);
  });

  it("resolves MDM and governance sections for page render", () => {
    expect(model.mdm.sectionSummaries).toHaveLength(7);
    expect(model.governance.indicators.length).toBeGreaterThanOrEqual(8);
    expect(model.governance.governanceDriftScore).toBeGreaterThanOrEqual(95);
  });

  it("resolves certification cards for every certified family", () => {
    expect(model.certification.familyStatuses).toHaveLength(ENTERPRISE_CERTIFIED_GOVERNANCE_FAMILIES.length);
    for (const family of model.certification.familyStatuses) {
      expect(family.status).toBe("certified");
    }
  });

  it("maps layout cards to each dashboard section without orphans", () => {
    for (const section of MEDICAL_EXAM_ANALYTICS_PAGE_SECTIONS) {
      const count = medicalExamAnalyticsSectionCardCount(model, section.id);
      if (section.id === "executive_overview") {
        expect(count).toBeGreaterThanOrEqual(1);
      } else {
        expect(count, section.id).toBeGreaterThan(0);
      }
    }
  });

  it("aligns page model layout with buildProviderDocumentationDashboardLayout", () => {
    const layout = buildProviderDocumentationDashboardLayout();
    expect(model.layout.generatedAt).toBe(layout.generatedAt);
    expect(model.layout.cards.length).toBe(layout.cards.length);
    expect(dashboardCardsBySection(layout, "certification_health")).toHaveLength(8);
  });
});
