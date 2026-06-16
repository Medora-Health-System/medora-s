import { describe, expect, it } from "vitest";
import {
  PROVIDER_DOCUMENTATION_ANALYTICS_DASHBOARD_SECTIONS,
  validateDashboardSections,
  dashboardSectionById,
} from "./providerDocumentationAnalyticsDashboardContracts";
import {
  isProviderDocumentationAnalyticsEvent,
  LIFECYCLE_EVENT_TO_CANONICAL_NAME,
  PROVIDER_DOC_ANALYTICS_EVENT_NAMES,
} from "./providerDocumentationAnalyticsEvents";
import {
  buildCertifiedTemplateAnalyticsCatalog,
  certifiedFamilyIdsForAnalytics,
  certifiedRegistryEntriesForAnalytics,
  classifyChipCategory,
  computeStaticCertificationHealthMetrics,
  computeStaticGovernanceHealthMetrics,
  emptyTemplateUsageMetrics,
  PROVIDER_DOCUMENTATION_ANALYTICS_CATEGORIES,
  PROVIDER_DOCUMENTATION_CHIP_CATEGORIES,
  PROVIDER_DOCUMENTATION_TEMPLATE_LIFECYCLE_EVENTS,
  extractChipIdsByCategory,
} from "./providerDocumentationAnalyticsModel";
import {
  allCertifiedAuditTemplateIds,
  ENTERPRISE_MDM1_REQUIRED_SECTIONS,
} from "./providerDocumentationEnterpriseGovernanceV2";
import { ENTERPRISE_CERTIFIED_GOVERNANCE_FAMILIES } from "./providerDocumentationEnterpriseGovernanceRegistry";
import { HUMAN_DOCUMENTATION_AUDIT_FAMILIES } from "./providerDocumentationHumanDocumentationAudit";

describe("providerDocumentationAnalyticsModel — MEDUI.ED.POSTCERT.5", () => {
  const certifiedTemplateIds = allCertifiedAuditTemplateIds();
  const catalog = buildCertifiedTemplateAnalyticsCatalog();

  it("defines five analytics telemetry categories", () => {
    expect(PROVIDER_DOCUMENTATION_ANALYTICS_CATEGORIES).toEqual([
      "template_usage",
      "chip_usage",
      "mdm_usage",
      "governance_health",
      "certification_health",
    ]);
  });

  it("defines template lifecycle events", () => {
    expect(PROVIDER_DOCUMENTATION_TEMPLATE_LIFECYCLE_EVENTS).toContain("template_opened");
    expect(PROVIDER_DOCUMENTATION_TEMPLATE_LIFECYCLE_EVENTS).toContain("template_saved");
    expect(PROVIDER_DOCUMENTATION_TEMPLATE_LIFECYCLE_EVENTS).toHaveLength(6);
  });

  it("defines chip categories for HPI, ROS, exam, and MDM", () => {
    expect(PROVIDER_DOCUMENTATION_CHIP_CATEGORIES).toEqual(["hpi", "ros", "exam", "mdm"]);
    expect(classifyChipCategory("providerDocumentationComplaintIntel.stroke.hpiSuddenOnset")).toBe("hpi");
    expect(classifyChipCategory("providerDocumentationComplaintIntel.stroke.rosVisionChange")).toBe("ros");
    expect(classifyChipCategory("providerDocumentationComplaintIntel.stroke.examFacialDroop")).toBe("exam");
    expect(classifyChipCategory("providerDocumentationComplaintIntel.stroke.diffIschemicStroke")).toBe("mdm");
  });

  it("represents every certified audit family in analytics catalog", () => {
    const familyIds = certifiedFamilyIdsForAnalytics();
    expect(familyIds).toHaveLength(HUMAN_DOCUMENTATION_AUDIT_FAMILIES.length);
    expect(familyIds).toHaveLength(ENTERPRISE_CERTIFIED_GOVERNANCE_FAMILIES.length);
    for (const entry of certifiedRegistryEntriesForAnalytics()) {
      expect(entry.auditPhase, entry.familyId).toBeTruthy();
    }
  });

  it("represents every certified template in analytics catalog", () => {
    expect(catalog).toHaveLength(certifiedTemplateIds.length);
    for (const templateId of certifiedTemplateIds) {
      expect(catalog.some((entry) => entry.templateId === templateId), templateId).toBe(true);
    }
  });

  it("assigns governance owners to every certified template catalog entry", () => {
    for (const entry of catalog) {
      expect(entry.governanceOwnerIds.length, entry.templateId).toBeGreaterThan(0);
      expect(entry.isCertified).toBe(true);
      expect(entry.auditPhase).toBeTruthy();
    }
  });

  it("extracts chip ids by category from certified bundles", () => {
    for (const family of HUMAN_DOCUMENTATION_AUDIT_FAMILIES) {
      for (const template of family.templates) {
        const byCategory = extractChipIdsByCategory(template.bundle);
        expect(byCategory.hpi.length + byCategory.ros.length + byCategory.exam.length + byCategory.mdm.length).toBeGreaterThan(0);
        for (const section of ENTERPRISE_MDM1_REQUIRED_SECTIONS) {
          const bundleSection = template.bundle[section];
          expect(bundleSection?.length ?? 0, `${template.templateId}.${section}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("computes static governance health metrics with zero drift at certification baseline", () => {
    const metrics = computeStaticGovernanceHealthMetrics();
    expect(metrics.ownerlessTemplateCount).toBe(0);
    expect(metrics.missingHumanDocRegistrationCount).toBe(0);
    expect(metrics.missingTrackCRegistrationCount).toBe(0);
    expect(metrics.missingMdm1RegistrationCount).toBe(0);
    expect(metrics.missingGovernanceModuleCount).toBe(0);
    expect(metrics.isolationViolationCount).toBe(0);
  });

  it("computes static certification health metrics at full pass rate", () => {
    const metrics = computeStaticCertificationHealthMetrics();
    expect(metrics.certifiedTemplateCount).toBe(certifiedTemplateIds.length);
    expect(metrics.certifiedFamilyCount).toBe(8);
    expect(metrics.trackCPassRate).toBe(1);
    expect(metrics.humanDocPassRate).toBe(1);
    expect(metrics.mdm1PassRate).toBe(1);
    expect(metrics.governancePassRate).toBe(1);
    expect(metrics.driftIndicators).not.toContain("new_unregistered_family");
  });

  it("validates dashboard contracts for all seven sections", () => {
    expect(validateDashboardSections()).toBe(true);
    expect(PROVIDER_DOCUMENTATION_ANALYTICS_DASHBOARD_SECTIONS).toHaveLength(7);
    expect(dashboardSectionById("executive_overview")?.metricKeys.length).toBeGreaterThan(0);
    expect(dashboardSectionById("chip_usage")?.categories).toContain("chip_usage");
    expect(dashboardSectionById("governance_health")?.categories).toContain("governance_health");
  });

  it("defines strongly typed telemetry event names", () => {
    expect(PROVIDER_DOC_ANALYTICS_EVENT_NAMES.TEMPLATE_OPENED).toBe("PROVIDER_DOC_TEMPLATE_OPENED");
    expect(PROVIDER_DOC_ANALYTICS_EVENT_NAMES.CHIP_INSERTED).toBe("PROVIDER_DOC_CHIP_INSERTED");
    expect(PROVIDER_DOC_ANALYTICS_EVENT_NAMES.GOVERNANCE_DRIFT_DETECTED).toBe(
      "PROVIDER_DOC_GOVERNANCE_DRIFT_DETECTED"
    );
    expect(PROVIDER_DOC_ANALYTICS_EVENT_NAMES.CERTIFICATION_DRIFT_DETECTED).toBe(
      "PROVIDER_DOC_CERTIFICATION_DRIFT_DETECTED"
    );
    expect(LIFECYCLE_EVENT_TO_CANONICAL_NAME.template_saved).toBe(
      PROVIDER_DOC_ANALYTICS_EVENT_NAMES.TEMPLATE_SAVED
    );
  });

  it("type-guards analytics events", () => {
    expect(
      isProviderDocumentationAnalyticsEvent({
        type: "template_opened",
        occurredAt: "2026-06-03T00:00:00.000Z",
        templateId: "stroke_symptoms",
        familyId: "neuro_stroke_weakness",
        governanceOwnerId: "NeuroStrokeWeaknessGovernance",
        auditPhase: "MEDUI.ED.ME.2W-R",
      })
    ).toBe(true);
    expect(isProviderDocumentationAnalyticsEvent(null)).toBe(false);
    expect(isProviderDocumentationAnalyticsEvent({ type: "chip_inserted" })).toBe(false);
  });

  it("provides empty template usage metrics scaffold per certified template", () => {
    for (const templateId of certifiedTemplateIds.slice(0, 3)) {
      const metrics = emptyTemplateUsageMetrics(templateId as never);
      expect(metrics.templateId).toBe(templateId);
      expect(metrics.usageCount).toBe(0);
      expect(metrics.completionRate).toBe(0);
      expect(metrics.governanceOwnerId).toBeTruthy();
    }
  });

  it("includes POSTCERT utility families in analytics coverage", () => {
    const familyIds = certifiedFamilyIdsForAnalytics();
    expect(familyIds).toContain("medication_refill");
    expect(familyIds).toContain("observation_reassessment");
    const utilityTemplates = catalog.filter(
      (entry) =>
        entry.templateId === "medication_refill" ||
        entry.templateId === "observation_reassessment"
    );
    expect(utilityTemplates).toHaveLength(2);
  });
});
