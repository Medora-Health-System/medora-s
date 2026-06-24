import { describe, expect, it } from "vitest";
import {
  CONTROLLED_SUBSTANCE_GOVERNANCE_APPLY_COUNT,
  CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST,
  CONTROLLED_SUBSTANCE_GOVERNANCE_MANUAL_REVIEW_COUNT,
  CONTROLLED_SUBSTANCE_GOVERNANCE_MISSING_CATALOG_COUNT,
} from "./controlledSubstanceGovernanceManifest.js";
import {
  buildControlledSubstanceBillingInventoryReport,
  buildControlledSubstanceDeaComplianceReport,
  buildControlledSubstanceGovernanceReport,
  buildControlledSubstanceInventoryReport,
  buildControlledSubstanceMarSafetyReport,
  buildControlledSubstanceProviderOrderingEligibilityReport,
  resetControlledSubstanceGovernanceCaches,
  runControlledSubstanceGovernanceExpansionReport,
} from "./controlledSubstanceGovernance.js";
import {
  catalogRowMatchesGovernanceEntry,
  legacyControlledFlagsFromManifestEntry,
  manifestEntryMatchKey,
  validateControlledSubstanceGovernanceManifest,
} from "./controlledSubstanceGovernanceValidation.js";
import { controlledSubstanceClassSchema } from "./medicationSafetyClassifiers.js";

describe("controlledSubstanceGovernanceManifest", () => {
  it("has expected manifest counts", () => {
    expect(CONTROLLED_SUBSTANCE_GOVERNANCE_APPLY_COUNT).toBe(9);
    expect(CONTROLLED_SUBSTANCE_GOVERNANCE_MANUAL_REVIEW_COUNT).toBe(2);
    expect(CONTROLLED_SUBSTANCE_GOVERNANCE_MISSING_CATALOG_COUNT).toBe(5);
    expect(CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST).toHaveLength(16);
  });

  it("includes known M1.1B controlled opioids as APPLY", () => {
    const apply = CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST.filter((e) => e.governanceStatus === "APPLY");
    const generics = apply.map((e) => e.genericName.toLowerCase());
    expect(generics).toContain("morphine");
    expect(generics).toContain("hydromorphone");
    expect(generics).toContain("fentanyl");
  });

  it("marks tramadol as MANUAL_REVIEW only", () => {
    const tramadol = CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST.filter(
      (e) => e.genericName === "Tramadol"
    );
    expect(tramadol).toHaveLength(2);
    expect(tramadol.every((e) => e.governanceStatus === "MANUAL_REVIEW" && e.manualReview)).toBe(true);
  });

  it("rejects invalid classifier in validation", () => {
    const issues = validateControlledSubstanceGovernanceManifest([
      {
        genericName: "Test",
        controlledSubstanceClass: "CONTROLLED_SCHEDULE_I" as never,
        deaSchedule: "II",
        governanceStatus: "APPLY",
        rationale: "bad",
        sourcePhase: "M1.3C",
        manualReview: false,
        catalogCode: "TEST_1",
      },
    ]);
    expect(issues.some((i) => i.kind === "INVALID_CLASSIFIER")).toBe(true);
  });

  it("prevents duplicate catalog codes in manifest", () => {
    const base = CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST[0]!;
    const duped = [
      ...CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST,
      { ...base, strengthPattern: "duplicate" },
    ];
    const issues = validateControlledSubstanceGovernanceManifest(duped);
    expect(issues.some((i) => i.kind === "DUPLICATE_MATCHER")).toBe(true);
  });

  it("matches catalog rows by code or generic+strength", () => {
    const morphine = CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST.find(
      (e) => e.genericName === "Morphine" && e.governanceStatus === "APPLY"
    )!;
    expect(
      catalogRowMatchesGovernanceEntry(
        {
          id: "1",
          code: "X",
          genericName: "Morphine",
          strength: "10 mg/mL",
          dosageForm: "injectable",
          displayNameEn: "Morphine",
        },
        morphine
      )
    ).toBe(true);
    expect(
      catalogRowMatchesGovernanceEntry(
        {
          id: "2",
          code: "Y",
          genericName: "Morphine",
          strength: "2 mg",
          dosageForm: "tablet",
          displayNameEn: "Morphine",
        },
        morphine
      )
    ).toBe(false);
  });

  it("maps legacy flags from APPLY entry", () => {
    const entry = CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST.find(
      (e) => e.catalogCode === "FENTANYL_50MCG_ML_INJECTABLE"
    )!;
    expect(legacyControlledFlagsFromManifestEntry(entry)).toEqual({
      isControlled: true,
      controlledSchedule: "II",
      requiresWitness: false,
      requiresDoubleSign: true,
    });
  });

  it("uses only M1.3B controlled class codes", () => {
    for (const entry of CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST) {
      expect(controlledSubstanceClassSchema.safeParse(entry.controlledSubstanceClass).success).toBe(
        true
      );
    }
  });

  it("has unique matchers for APPLY rows", () => {
    const apply = CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST.filter((e) => e.governanceStatus === "APPLY");
    const keys = apply.map(manifestEntryMatchKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("controlledSubstanceGovernanceExpansion", () => {
  it("classifies every focus substance with governance labels", () => {
    resetControlledSubstanceGovernanceCaches();
    const report = buildControlledSubstanceGovernanceReport();
    expect(report.decision).toBe("PASS");
    expect(report.unclassifiedCount).toBe(0);
    expect(report.rows.length).toBeGreaterThanOrEqual(21);
  });

  it("protects against duplicate inventory rows by catalog code", () => {
    resetControlledSubstanceGovernanceCaches();
    const inventory = buildControlledSubstanceInventoryReport();
    const codes = inventory.rows.map((row) => row.catalogCode).filter(Boolean);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("certifies DEA audit coverage without weakening safeguards", () => {
    resetControlledSubstanceGovernanceCaches();
    const dea = buildControlledSubstanceDeaComplianceReport();
    expect(dea.orderingProviderIdentification).toBe(true);
    expect(dea.controlledMedicationAuditTrail).toBe(true);
    expect(dea.witnessVerificationCapability).toBe(true);
    expect(dea.overrideAuditing).toBe(true);
    expect(dea.pharmacyVisibility).toBe(true);
  });

  it("certifies MAR safety controls", () => {
    resetControlledSubstanceGovernanceCaches();
    const mar = buildControlledSubstanceMarSafetyReport();
    expect(mar.decision).toBe("PASS");
    expect(mar.witnessWorkflowSupport).toBe(true);
    expect(mar.wasteDocumentation).toBe(true);
    expect(mar.partialAdministrationAuditing).toBe(true);
  });

  it("audits billing without fabricated HCPCS/NDC mappings", () => {
    resetControlledSubstanceGovernanceCaches();
    const billing = buildControlledSubstanceBillingInventoryReport();
    expect(billing.fabricatedMappingCount).toBe(0);
    expect(billing.decision).toBe("PASS");
  });

  it("excludes controlled substances from provider ordering activation", () => {
    resetControlledSubstanceGovernanceCaches();
    const eligibility = buildControlledSubstanceProviderOrderingEligibilityReport();
    expect(eligibility.activationExcluded).toBe(true);
    expect(eligibility.activatedControlledCatalogCodes).toEqual([]);
    expect(eligibility.readyForProviderOrdering).toContain("Tramadol");
    expect(eligibility.restrictedSpecialtyReview).toEqual(
      expect.arrayContaining(["Morphine", "Hydromorphone", "Fentanyl"])
    );
    expect(eligibility.controlledSubstanceBlocked).toEqual(
      expect.arrayContaining(["Lorazepam", "Diazepam", "Midazolam", "Oxycodone"])
    );
  });

  it("returns governance-ready final decision without activation", () => {
    resetControlledSubstanceGovernanceCaches();
    const report = runControlledSubstanceGovernanceExpansionReport();
    expect(report.finalDecision).toBe("CONTROLLED_SUBSTANCE_GOVERNANCE_READY");
    expect(report.compatibility.controlledSubstancesActivated).toBe(false);
    expect(report.compatibility.providerSearchChanged).toBe(false);
    expect(report.compatibility.orderabilityBehaviorChanged).toBe(false);
    expect(report.compatibility.migrationsRequired).toBe(false);
    expect(report.activationRoadmap.note).toContain("no automatic activation");
  });
});
