import { describe, expect, it } from "vitest";
import {
  buildCriticalCareActivationBaselineReport,
  buildCriticalCareBillingInventoryReport,
  buildCriticalCareClinicalSafetyReport,
  buildCriticalCareHighRiskExclusionReport,
  buildCriticalCareInfusionGovernanceVerificationReport,
  buildCriticalCareInventoryReport,
  buildCriticalCarePharmacyWorkflowReport,
  buildCriticalCareProviderOrderingActivationRegistry,
  buildCriticalCareProviderOrderingActivationWorkflowReport,
  buildCriticalCareProviderOrderingEligibilityReport,
  buildCriticalCareProviderSearchReport,
  buildCriticalCareRollbackReport,
  isActiveCriticalCareProviderOrderingMedication,
  listActiveCriticalCareProviderOrderingCatalogCodes,
  rollbackCriticalCareProviderOrderingActivation,
  runCriticalCareProviderOrderingActivationReport,
  validateCriticalCareProviderOrderPlacement,
} from "./criticalCareProviderOrderingActivation.js";

describe("MEDUI.MEDICATION.CRITICAL_CARE_PROVIDER_ORDERING_ACTIVATION.1", () => {
  it("01 — ICU inventory audits critical-care categories", () => {
    const report = buildCriticalCareInventoryReport();
    expect(report.auditedCategories).toContain("VASOPRESSORS");
    expect(report.auditedCategories).toContain("ICU_ANTIBIOTICS");
    expect(report.totalRows).toBeGreaterThan(50);
  });

  it("02 — eligibility activates only ready governed ICU-compatible rows", () => {
    const report = buildCriticalCareProviderOrderingEligibilityReport();
    expect(report.eligibleCatalogCodes).toContain("NOREPINEPHRINE_8_MG_250_ML_PERFUSION_INTRAVEINEUSE");
    expect(report.eligibleCatalogCodes).toContain("PROPOFOL_20_MG_ML_INJECTABLE_INTRAVEINEUSE");
    expect(report.eligibleCatalogCodes).toContain("MEROPENEM_1_G_POUDRE_INTRAVEINEUSE");
    expect(report.excludedRows.some((row) => row.blockers.includes("DUPLICATE_OR_COLLISION_FINDING"))).toBe(true);
  });

  it("03 — provider ordering is active for eligible critical-care medications", () => {
    const code = listActiveCriticalCareProviderOrderingCatalogCodes()[0]!;
    expect(isActiveCriticalCareProviderOrderingMedication(code)).toBe(true);
    expect(validateCriticalCareProviderOrderPlacement({ catalogCode: code }).allowed).toBe(true);
  });

  it("04 — infusion governance remains intact", () => {
    const report = buildCriticalCareInfusionGovernanceVerificationReport();
    expect(report.routeAuthorityPreserved).toBe(true);
    expect(report.ivpbLifecycleGovernancePreserved).toBe(true);
    expect(report.infusionStartStopLifecyclePreserved).toBe(true);
    expect(report.infusionAuditTrailPreserved).toBe(true);
    expect(report.directMarBypass).toBe(false);
  });

  it("05 — ICU safety parameters are advisory only", () => {
    const report = buildCriticalCareClinicalSafetyReport();
    expect(report.renalFunctionVisibility).toBe("ADVISORY");
    expect(report.liverFunctionVisibility).toBe("ADVISORY");
    expect(report.weightVisibility).toBe("ADVISORY");
    expect(report.mapVisibility).toBe("ADVISORY");
    expect(report.icuMonitoringParametersVisibility).toBe("ADVISORY");
    expect(report.laboratoryMonitoringVisibility).toBe("ADVISORY");
    expect(report.blocksProviderOrdering).toBe(false);
  });

  it("06 — MAR scheduling is immediate", () => {
    const report = buildCriticalCareProviderOrderingActivationWorkflowReport();
    expect(report.providerOrderPersistsImmediately).toBe(true);
    expect(report.schedulesImmediately).toBe(true);
    expect(report.appearsOnMarImmediately).toBe(true);
    expect(report.pharmacyApprovalRequiredForScheduling).toBe(false);
  });

  it("07 — pharmacy visibility remains nonblocking", () => {
    const report = buildCriticalCarePharmacyWorkflowReport();
    expect(report.pharmacyMayReview).toBe(true);
    expect(report.pharmacyMayClarify).toBe(true);
    expect(report.pharmacyMaySubstitute).toBe(true);
    expect(report.pharmacyMaySupply).toBe(true);
    expect(report.pharmacyMayMarkUnavailable).toBe(true);
    expect(report.pharmacyMayBlockOrdering).toBe(false);
  });

  it("08 — billing readiness passes for activated rows", () => {
    expect(buildCriticalCareBillingInventoryReport().billingReady).toBe(true);
  });

  it("09 — inventory readiness passes for activated rows", () => {
    expect(buildCriticalCareBillingInventoryReport().inventoryReady).toBe(true);
  });

  it("10 — rollback removes future search and ordering", () => {
    const registry = buildCriticalCareProviderOrderingActivationRegistry();
    const first = registry.entries[0]!;
    const rolledBack = rollbackCriticalCareProviderOrderingActivation({
      registry,
      catalogCode: first.catalogCode,
      reason: "test rollback",
    });
    expect(isActiveCriticalCareProviderOrderingMedication(first.catalogCode, rolledBack)).toBe(false);
    expect(validateCriticalCareProviderOrderPlacement({ catalogCode: first.catalogCode, registry: rolledBack }).allowed).toBe(false);
    expect(buildCriticalCareRollbackReport().preservesInfusionHistory).toBe(true);
    expect(buildCriticalCareRollbackReport().preservesAuditTrail).toBe(true);
  });

  it("11 — duplicate protection excludes collision rows", () => {
    const report = buildCriticalCareInventoryReport();
    expect(report.rows.some((row) => row.duplicateSafe === false && row.orderabilityStatus === "EXCLUDED_WITH_BLOCKERS")).toBe(true);
  });

  it("12 — EN localization has no FR leakage", () => {
    const report = runCriticalCareProviderOrderingActivationReport();
    expect(report.i18n.enLeakageCount).toBe(0);
    expect(report.i18n.enHasFrLeakage).toBe(false);
  });

  it("13 — FR localization has no EN leakage", () => {
    const report = runCriticalCareProviderOrderingActivationReport();
    expect(report.i18n.frLeakageCount).toBe(0);
    expect(report.i18n.frHasEnLeakage).toBe(false);
  });

  it("14 — release gate certification is active", () => {
    const baseline = buildCriticalCareActivationBaselineReport();
    const highRisk = buildCriticalCareHighRiskExclusionReport();
    const search = buildCriticalCareProviderSearchReport();
    const report = runCriticalCareProviderOrderingActivationReport();
    expect(baseline.tranche1Active).toBe(true);
    expect(baseline.tranche2Active).toBe(true);
    expect(baseline.anticoagulationActive).toBe(true);
    expect(baseline.insulinDiabetesActive).toBe(true);
    expect(baseline.vaccineProviderOrderingActive).toBe(true);
    expect(highRisk.activatedExcludedCatalogCodes).toEqual([]);
    expect(search.duplicateRows).toBe(0);
    expect(report.finalDecision).toBe("CRITICAL_CARE_PROVIDER_ORDERING_ACTIVE");
  });
});
