import { describe, expect, it } from "vitest";
import { buildProviderDocumentationAnalyticsAggregates } from "./providerDocumentationAnalyticsAggregates";
import { buildProviderDocumentationDashboardLayout } from "./providerDocumentationAnalyticsDashboardLayout";
import { buildCertificationDashboard } from "./providerDocumentationCertificationDashboard";
import { buildChipAnalyticsDashboard } from "./providerDocumentationChipAnalyticsDashboard";
import { buildExecutiveOverviewDashboard } from "./providerDocumentationExecutiveOverviewDashboard";
import { buildGovernanceAnalyticsDashboard } from "./providerDocumentationGovernanceAnalyticsDashboard";
import { buildMdmAnalyticsDashboard } from "./providerDocumentationMdmAnalyticsDashboard";
import { buildTemplateAnalyticsDashboard } from "./providerDocumentationTemplateAnalyticsDashboard";
import {
  PROVIDER_DOCUMENTATION_DASHBOARD_CARD_KINDS,
  dashboardCardsBySection,
  isProviderDocumentationDashboardCard,
} from "./providerDocumentationDashboardContracts";
import { ENTERPRISE_CERTIFIED_GOVERNANCE_FAMILIES } from "./providerDocumentationEnterpriseGovernanceRegistry";
import { allCertifiedAuditTemplateIds } from "./providerDocumentationEnterpriseGovernanceV2";
import { HUMAN_DOCUMENTATION_AUDIT_FAMILIES } from "./providerDocumentationHumanDocumentationAudit";

describe("providerDocumentationAnalyticsDashboard — MEDUI.ED.POSTCERT.8", () => {
  const certifiedTemplateIds = allCertifiedAuditTemplateIds();
  const aggregates = buildProviderDocumentationAnalyticsAggregates();
  const layout = buildProviderDocumentationDashboardLayout();

  it("aggregates every certified template and family", () => {
    expect(aggregates.catalog).toHaveLength(certifiedTemplateIds.length);
    expect(aggregates.familyUsage).toHaveLength(ENTERPRISE_CERTIFIED_GOVERNANCE_FAMILIES.length);
    expect(aggregates.familyUsage).toHaveLength(HUMAN_DOCUMENTATION_AUDIT_FAMILIES.length);
  });

  it("resolves executive overview KPI contracts", () => {
    const executive = buildExecutiveOverviewDashboard();
    expect(executive.kpis.length).toBeGreaterThanOrEqual(8);
    expect(executive.summary.certifiedTemplateCount).toBe(certifiedTemplateIds.length);
    expect(executive.summary.certifiedFamilyCount).toBe(8);
    expect(executive.summary.trackCPassRate).toBe(1);
    expect(executive.summary.humanDocPassRate).toBe(1);
    expect(executive.summary.mdm1PassRate).toBe(1);
    expect(executive.dashboardCompletionRate).toBeGreaterThan(0);
  });

  it("resolves template adoption dashboard with featured templates", () => {
    const template = buildTemplateAnalyticsDashboard();
    expect(template.featuredTemplates.map((item) => item.templateId)).toEqual([
      "stroke_symptoms",
      "weakness",
      "palpitations_complaint_v1",
      "chf_symptoms_complaint_v1",
      "hyperglycemia_complaint_v1",
      "observation_reassessment",
      "medication_refill",
    ]);
    expect(template.familyAdoptionBreakdown).toHaveLength(8);
  });

  it("resolves chip analytics dashboard with category breakdowns", () => {
    const chip = buildChipAnalyticsDashboard();
    expect(chip.mostInsertedHpiChips.length).toBeGreaterThan(0);
    expect(chip.mostInsertedRosChips.length).toBeGreaterThan(0);
    expect(chip.mostInsertedExamChips.length).toBeGreaterThan(0);
    expect(chip.mostInsertedMdmChips.length).toBeGreaterThan(0);
    expect(chip.adoptionRateByFamily).toHaveLength(8);
    expect(chip.unusedChips.length).toBeGreaterThan(0);
  });

  it("resolves MDM completion dashboard with seven sections at full readiness", () => {
    const mdm = buildMdmAnalyticsDashboard();
    expect(mdm.sectionSummaries).toHaveLength(7);
    expect(mdm.overallReadinessScore).toBe(100);
    for (const section of mdm.sectionSummaries) {
      expect(section.completionRate).toBe(1);
      expect(section.readinessScore).toBe(100);
    }
  });

  it("resolves governance health metrics and drift score", () => {
    const governance = buildGovernanceAnalyticsDashboard();
    expect(governance.metrics.ownerlessTemplateCount).toBe(0);
    expect(governance.metrics.missingHumanDocRegistrationCount).toBe(0);
    expect(governance.governanceDriftScore).toBeGreaterThanOrEqual(95);
    expect(governance.indicators.length).toBeGreaterThanOrEqual(8);
  });

  it("resolves certification dashboard for every certified family", () => {
    const certification = buildCertificationDashboard();
    expect(certification.familyStatuses).toHaveLength(8);
    for (const family of certification.familyStatuses) {
      expect(family.status).toBe("certified");
      expect(family.trackCPassRate).toBe(1);
      expect(family.humanDocPassRate).toBe(1);
      expect(family.mdm1PassRate).toBe(1);
    }
  });

  it("builds full dashboard layout with no orphan card kinds", () => {
    expect(layout.sections).toHaveLength(7);
    expect(layout.cards.length).toBeGreaterThan(0);
    for (const card of layout.cards) {
      expect(isProviderDocumentationDashboardCard(card)).toBe(true);
      expect(PROVIDER_DOCUMENTATION_DASHBOARD_CARD_KINDS).toContain(card.kind);
    }
  });

  it("maps dashboard cards to sections without orphans", () => {
    const executiveCards = dashboardCardsBySection(layout, "executive_overview");
    const certificationCards = dashboardCardsBySection(layout, "certification_health");
    expect(executiveCards.some((card) => card.kind === "executive_overview")).toBe(true);
    expect(certificationCards.every((card) => card.kind === "certification_health")).toBe(true);
    expect(certificationCards).toHaveLength(8);
  });

  it("includes every certified template in aggregate chip catalog", () => {
    const templateIdsInChips = new Set(aggregates.chipUsage.map((chip) => chip.templateId));
    for (const templateId of certifiedTemplateIds) {
      expect(templateIdsInChips.has(templateId as never), templateId).toBe(true);
    }
  });
});
