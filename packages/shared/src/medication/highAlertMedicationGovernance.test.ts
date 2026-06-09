import { describe, expect, it } from "vitest";
import {
  HIGH_ALERT_MEDICATION_GOVERNANCE_APPLY_COUNT,
  HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST,
  HIGH_ALERT_MEDICATION_GOVERNANCE_MANUAL_REVIEW_COUNT,
  HIGH_ALERT_MEDICATION_GOVERNANCE_MISSING_CATALOG_COUNT,
  HIGH_ALERT_MEDICATION_GOVERNANCE_SAFETY_REQUIREMENT_CODE_COUNT,
} from "./highAlertMedicationGovernanceManifest.js";
import {
  catalogRowMatchesHighAlertGovernanceEntry,
  countSafetyRequirementAssignmentsInManifest,
  manifestEntryMatchKey,
  safetyProfilePayloadFromHighAlertEntry,
  validateHighAlertMedicationGovernanceManifest,
} from "./highAlertMedicationGovernanceValidation.js";
import { highAlertClassSchema, safetyRequirementCodeSchema } from "./medicationSafetyClassifiers.js";

describe("highAlertMedicationGovernanceManifest", () => {
  it("has expected manifest counts", () => {
    expect(HIGH_ALERT_MEDICATION_GOVERNANCE_APPLY_COUNT).toBe(31);
    expect(HIGH_ALERT_MEDICATION_GOVERNANCE_MANUAL_REVIEW_COUNT).toBe(2);
    expect(HIGH_ALERT_MEDICATION_GOVERNANCE_MISSING_CATALOG_COUNT).toBe(8);
    expect(HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST).toHaveLength(41);
    expect(HIGH_ALERT_MEDICATION_GOVERNANCE_SAFETY_REQUIREMENT_CODE_COUNT).toBeGreaterThanOrEqual(5);
  });

  it("includes known M1.1B high-alert agent groups as APPLY", () => {
    const apply = HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST.filter((e) => e.governanceStatus === "APPLY");
    const generics = apply.map((e) => e.genericName.toLowerCase());
    expect(generics).toContain("morphine");
    expect(generics).toContain("heparin");
    expect(generics).toContain("regular insulin");
    expect(generics).toContain("norepinephrine");
    expect(generics).toContain("propofol");
    expect(generics).toContain("amiodarone");
  });

  it("marks tramadol as MANUAL_REVIEW only", () => {
    const tramadol = HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST.filter((e) => e.genericName === "Tramadol");
    expect(tramadol).toHaveLength(2);
    expect(tramadol.every((e) => e.governanceStatus === "MANUAL_REVIEW" && e.manualReview)).toBe(true);
  });

  it("rejects invalid high-alert classifier", () => {
    const issues = validateHighAlertMedicationGovernanceManifest([
      {
        genericName: "Test",
        highAlertClass: "HIGH_ALERT_INVALID" as never,
        safetyRequirementCodes: ["REQUIRES_MAR_VERIFICATION"],
        governanceStatus: "APPLY",
        rationale: "bad",
        sourcePhase: "M1.3D",
        manualReview: false,
        catalogCode: "TEST_1",
      },
    ]);
    expect(issues.some((i) => i.kind === "INVALID_CLASSIFIER")).toBe(true);
  });

  it("rejects invalid safety requirement code", () => {
    const issues = validateHighAlertMedicationGovernanceManifest([
      {
        genericName: "Test",
        highAlertClass: "HIGH_ALERT_INSULIN",
        safetyRequirementCodes: ["REQUIRES_FOO" as never],
        governanceStatus: "APPLY",
        rationale: "bad",
        sourcePhase: "M1.3D",
        manualReview: false,
        catalogCode: "TEST_2",
      },
    ]);
    expect(issues.some((i) => i.kind === "INVALID_SAFETY_REQUIREMENT")).toBe(true);
  });

  it("prevents duplicate catalog codes in manifest", () => {
    const base = HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST.find(
      (e) => e.catalogCode === "HEPARIN_5000UI_ML_INJECTABLE"
    )!;
    const duped = [...HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST, { ...base, strengthPattern: "dup" }];
    const issues = validateHighAlertMedicationGovernanceManifest(duped);
    expect(issues.some((i) => i.kind === "DUPLICATE_MATCHER")).toBe(true);
  });

  it("maps safety profile payload from APPLY entry", () => {
    const heparin = HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST.find(
      (e) => e.catalogCode === "HEPARIN_5000UI_ML_INJECTABLE"
    )!;
    const payload = safetyProfilePayloadFromHighAlertEntry(heparin);
    expect(payload.isHighAlert).toBe(true);
    expect(payload.highAlertCategories.highAlertClass).toBe("HIGH_ALERT_ANTICOAGULANT");
    expect(payload.highAlertCategories.safetyRequirements).toContain(
      "REQUIRES_INDEPENDENT_DOUBLE_CHECK"
    );
    expect(payload.requiresDoubleSign).toBe(true);
  });

  it("uses only M1.3B classifier and safety requirement codes", () => {
    for (const entry of HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST) {
      expect(highAlertClassSchema.safeParse(entry.highAlertClass).success).toBe(true);
      for (const code of entry.safetyRequirementCodes) {
        expect(safetyRequirementCodeSchema.safeParse(code).success).toBe(true);
      }
    }
  });

  it("has unique matchers for APPLY rows", () => {
    const apply = HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST.filter((e) => e.governanceStatus === "APPLY");
    const keys = apply.map(manifestEntryMatchKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("counts safety requirement assignments across manifest", () => {
    expect(countSafetyRequirementAssignmentsInManifest(HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST)).toBe(
      HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST.reduce(
        (n, e) => n + e.safetyRequirementCodes.length,
        0
      )
    );
  });

  it("matches catalog rows by code or generic+strength", () => {
    const morphine = HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST.find(
      (e) => e.genericName === "Morphine" && e.governanceStatus === "APPLY"
    )!;
    expect(
      catalogRowMatchesHighAlertGovernanceEntry(
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
  });
});
