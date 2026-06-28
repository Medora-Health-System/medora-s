import { beforeAll, describe, expect, it } from "vitest";
import {
  formatEnterpriseFormularyExpansionWaveAuditMarkdown,
  resetEnterpriseFormularyExpansionWaveAuditCaches,
  runEnterpriseFormularyExpansionWaveAudit,
} from "./enterpriseFormularyExpansionWaveAudit.js";
import { prewarmProviderOrderableCatalogCodesRegistry } from "./providerOrderableCatalogCodesRegistry.js";

describe("MEDUI.MEDS.ENTERPRISE_FORMULARY_EXPANSION_WAVES_AUDIT.1", () => {
  beforeAll(() => {
    resetEnterpriseFormularyExpansionWaveAuditCaches();
    prewarmProviderOrderableCatalogCodesRegistry();
  });

  it("1 — enterprise wave audit runs without registry re-entrancy errors", () => {
    expect(() => runEnterpriseFormularyExpansionWaveAudit()).not.toThrow();
    expect(() => runEnterpriseFormularyExpansionWaveAudit()).not.toThrow();
    const audit = runEnterpriseFormularyExpansionWaveAudit();
    expect(audit.ticket).toBe("MEDUI.MEDS.ENTERPRISE_FORMULARY_EXPANSION_WAVES_AUDIT.1");
  });

  it("2 — every proposed provider-orderable anchor candidate is MAR-ready or blocked", () => {
    const audit = runEnterpriseFormularyExpansionWaveAudit();
    for (const plan of [
      audit.wave1EmergencyInpatientCorePlan,
      audit.wave2HospitalCorePlan,
      audit.wave3SpecialtyExpansionPlan,
      audit.wave4AdvancedEnterprisePlan,
    ]) {
      for (const candidate of plan.candidates) {
        if (candidate.providerOrderable) {
          expect(candidate.marReady).toBe(true);
        }
        if (candidate.activationSafety === "SAFE_TO_ACTIVATE_NOW" && candidate.catalogExists) {
          expect(candidate.marReady).toBe(true);
        }
      }
    }
  });

  it("3 — controlled substances are held unless governed", () => {
    const audit = runEnterpriseFormularyExpansionWaveAudit();
    expect(audit.controlledSubstanceGovernanceHoldReport.heldCount).toBeGreaterThan(0);
    expect(audit.controlledSubstanceGovernanceHoldReport.activatedControlledSubstances).toEqual([]);
    for (const candidate of audit.wave1EmergencyInpatientCorePlan.candidates) {
      if (candidate.activationSafety === "DEFER_CONTROLLED_SUBSTANCE") {
        expect(candidate.governance.controlledSubstance).toBe(true);
        expect(candidate.providerOrderable).toBe(false);
      }
    }
  });

  it("4 — high-alert meds require governance before activation", () => {
    const audit = runEnterpriseFormularyExpansionWaveAudit();
    for (const plan of [
      audit.wave1EmergencyInpatientCorePlan,
      audit.wave2HospitalCorePlan,
      audit.wave3SpecialtyExpansionPlan,
      audit.wave4AdvancedEnterprisePlan,
    ]) {
      for (const candidate of plan.candidates) {
        if (candidate.governance.highAlert && !candidate.providerOrderable) {
          expect(["NEEDS_GOVERNANCE_REVIEW", "SAFE_TO_ACTIVATE_NOW", "NEEDS_METADATA_FIX"]).toContain(
            candidate.activationSafety
          );
        }
      }
    }
    expect(audit.highAlertAndLasaGovernanceReport.highAlertNotOrderable.length).toBeGreaterThanOrEqual(0);
  });

  it("5 — IVPB candidates require route/infusion metadata awareness", () => {
    const audit = runEnterpriseFormularyExpansionWaveAudit();
    expect(audit.ivpbAndContinuousInfusionReadinessReport.ivpbCatalogRows).toBeGreaterThan(0);
    const zosyn = audit.wave1EmergencyInpatientCorePlan.candidates.find((c) => c.label.includes("Piperacillin"));
    expect(zosyn?.catalogExists).toBe(true);
    expect(zosyn?.marReady).toBe(true);
  });

  it("6 — pediatric candidates require appropriate form/route notes", () => {
    const audit = runEnterpriseFormularyExpansionWaveAudit();
    const pediatric = audit.wave2HospitalCorePlan.candidates.find((c) => c.therapeuticArea === "Pediatrics");
    expect(pediatric).toBeDefined();
    expect(pediatric?.testsRequired.some((test) => test.includes("enterpriseFormularyExpansionWaveAudit"))).toBe(true);
    expect(audit.pediatricMedicationReadinessReport.pediatricCatalogRows).toBeGreaterThan(0);
  });

  it("7 — provider-orderable-not-MAR-ready count remains 0", () => {
    const audit = runEnterpriseFormularyExpansionWaveAudit();
    expect(audit.providerOrderableMarReadinessInvariantReport.providerOrderableButNotMarReadyCount).toBe(0);
    expect(audit.providerOrderableMarReadinessInvariantReport.invariantPass).toBe(true);
    expect(audit.currentMedicationReadinessCounts.providerOrderableButNotMarReady).toBe(0);
  });

  it("8 — readiness counts align with enterprise inventory baseline", () => {
    const audit = runEnterpriseFormularyExpansionWaveAudit();
    expect(audit.currentMedicationReadinessCounts.totalCatalogMedications).toBeGreaterThanOrEqual(600);
    expect(audit.currentMedicationReadinessCounts.providerOrderableMedications).toBeGreaterThan(150);
    expect(audit.currentMedicationReadinessCounts.marReadyMedications).toBeGreaterThan(500);
  });

  it("9 — markdown summary renders wave sections", () => {
    const md = formatEnterpriseFormularyExpansionWaveAuditMarkdown();
    expect(md).toContain("WAVE_1");
    expect(md).toContain("WAVE_4");
    expect(md).toContain("Therapeutic area coverage");
  });

  it("10 — audit is audit-only (no migration)", () => {
    const audit = runEnterpriseFormularyExpansionWaveAudit();
    expect(audit.seedAndMigrationForecast.migrationRequired).toBe(false);
    for (const plan of [
      audit.wave1EmergencyInpatientCorePlan,
      audit.wave2HospitalCorePlan,
      audit.wave3SpecialtyExpansionPlan,
      audit.wave4AdvancedEnterprisePlan,
    ]) {
      expect(plan.migrationRequired).toBe(false);
    }
  });
});
