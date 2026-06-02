import { describe, expect, it } from "vitest";
import {
  CONTROLLED_SUBSTANCE_GOVERNANCE_APPLY_COUNT,
  CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST,
  CONTROLLED_SUBSTANCE_GOVERNANCE_MANUAL_REVIEW_COUNT,
  CONTROLLED_SUBSTANCE_GOVERNANCE_MISSING_CATALOG_COUNT,
} from "./controlledSubstanceGovernanceManifest.js";
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
