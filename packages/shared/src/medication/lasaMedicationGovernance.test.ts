import { describe, expect, it } from "vitest";
import {
  LASA_MEDICATION_GOVERNANCE_APPLY_GROUP_COUNT,
  LASA_MEDICATION_GOVERNANCE_APPLY_MEMBER_COUNT,
  LASA_MEDICATION_GOVERNANCE_GROUP_COUNT,
  LASA_MEDICATION_GOVERNANCE_MANIFEST,
  LASA_MEDICATION_GOVERNANCE_MANUAL_REVIEW_COUNT,
  LASA_MEDICATION_GOVERNANCE_MISSING_CATALOG_COUNT,
} from "./lasaMedicationGovernanceManifest.js";
import {
  catalogRowMatchesLasaGovernanceEntry,
  lasaCategoriesPayloadFromEntry,
  manifestEntryMatchKey,
  mergeLasaIntoHighAlertCategories,
  validateLasaMedicationGovernanceManifest,
} from "./lasaMedicationGovernanceValidation.js";
import { lasaRiskLevelSchema } from "./medicationSafetyClassifiers.js";

describe("lasaMedicationGovernanceManifest", () => {
  it("has expected manifest counts", () => {
    expect(LASA_MEDICATION_GOVERNANCE_APPLY_MEMBER_COUNT).toBe(8);
    expect(LASA_MEDICATION_GOVERNANCE_APPLY_GROUP_COUNT).toBe(4);
    expect(LASA_MEDICATION_GOVERNANCE_MANUAL_REVIEW_COUNT).toBe(6);
    expect(LASA_MEDICATION_GOVERNANCE_MISSING_CATALOG_COUNT).toBe(3);
    expect(LASA_MEDICATION_GOVERNANCE_GROUP_COUNT).toBe(8);
    expect(LASA_MEDICATION_GOVERNANCE_MANIFEST).toHaveLength(17);
  });

  it("includes morphine/hydromorphone LASA_HIGH APPLY group", () => {
    const group = LASA_MEDICATION_GOVERNANCE_MANIFEST.filter(
      (e) =>
        e.lasaGroupCode === "GROUP_LASA_OPIOID_MORPHINE_HYDROMORPHONE" &&
        e.governanceStatus === "APPLY"
    );
    expect(group).toHaveLength(2);
    expect(group.every((e) => e.lasaSeverity === "LASA_HIGH")).toBe(true);
  });

  it("marks insulin types as MANUAL_REVIEW only", () => {
    const insulin = LASA_MEDICATION_GOVERNANCE_MANIFEST.filter(
      (e) => e.lasaGroupCode === "GROUP_LASA_INSULIN_TYPES"
    );
    expect(insulin).toHaveLength(3);
    expect(insulin.every((e) => e.governanceStatus === "MANUAL_REVIEW" && e.manualReview)).toBe(
      true
    );
  });

  it("rejects invalid LASA severity classifier", () => {
    const issues = validateLasaMedicationGovernanceManifest([
      {
        lasaGroupCode: "GROUP_TEST",
        lasaGroupLabel: "Test",
        lasaSeverity: "LASA_CRITICAL" as never,
        genericName: "Test",
        governanceStatus: "APPLY",
        rationale: "bad",
        sourcePhase: "M1.3E",
        manualReview: false,
        catalogCode: "TEST_1",
      },
      {
        lasaGroupCode: "GROUP_TEST",
        lasaGroupLabel: "Test",
        lasaSeverity: "LASA_HIGH",
        genericName: "Test2",
        governanceStatus: "APPLY",
        rationale: "bad",
        sourcePhase: "M1.3E",
        manualReview: false,
        catalogCode: "TEST_2",
      },
    ]);
    expect(issues.some((i) => i.kind === "INVALID_CLASSIFIER")).toBe(true);
  });

  it("rejects APPLY group with fewer than 2 members", () => {
    const issues = validateLasaMedicationGovernanceManifest([
      {
        lasaGroupCode: "GROUP_LASA_SINGLE",
        lasaGroupLabel: "Single",
        lasaSeverity: "LASA_HIGH",
        catalogCode: "ONLY_ONE",
        genericName: "Only",
        governanceStatus: "APPLY",
        rationale: "bad",
        sourcePhase: "M1.3E",
        manualReview: false,
      },
    ]);
    expect(issues.some((i) => i.kind === "APPLY_GROUP_TOO_SMALL")).toBe(true);
  });

  it("prevents duplicate matchers in manifest", () => {
    const morph = LASA_MEDICATION_GOVERNANCE_MANIFEST.find(
      (e) => e.genericName === "Morphine" && e.governanceStatus === "APPLY"
    )!;
    const duped = [...LASA_MEDICATION_GOVERNANCE_MANIFEST, { ...morph }];
    const issues = validateLasaMedicationGovernanceManifest(duped);
    expect(issues.some((i) => i.kind === "DUPLICATE_MATCHER")).toBe(true);
  });

  it("merges LASA payload into highAlertCategories without dropping HA keys", () => {
    const entry = LASA_MEDICATION_GOVERNANCE_MANIFEST.find(
      (e) => e.catalogCode === "HYDROMORPHONE_2MG_ML_INJECTABLE"
    )!;
    const lasa = lasaCategoriesPayloadFromEntry(entry);
    const merged = mergeLasaIntoHighAlertCategories(
      { highAlertClass: "HIGH_ALERT_OPIOID", safetyRequirements: ["REQUIRES_MAR_VERIFICATION"] },
      lasa
    );
    expect(merged.highAlertClass).toBe("HIGH_ALERT_OPIOID");
    expect(merged.lasa).toEqual(lasa);
  });

  it("uses only M1.3B LASA classifier codes", () => {
    for (const entry of LASA_MEDICATION_GOVERNANCE_MANIFEST) {
      expect(lasaRiskLevelSchema.safeParse(entry.lasaSeverity).success).toBe(true);
    }
  });

  it("has unique APPLY matchers per group member", () => {
    const apply = LASA_MEDICATION_GOVERNANCE_MANIFEST.filter((e) => e.governanceStatus === "APPLY");
    const keys = apply.map(manifestEntryMatchKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("matches catalog rows by code or generic+strength", () => {
    const morphine = LASA_MEDICATION_GOVERNANCE_MANIFEST.find(
      (e) => e.genericName === "Morphine" && e.governanceStatus === "APPLY"
    )!;
    expect(
      catalogRowMatchesLasaGovernanceEntry(
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
