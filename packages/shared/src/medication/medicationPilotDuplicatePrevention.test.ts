import { describe, expect, it } from "vitest";
import {
  assertNoAutomaticDuplicateMerge,
  assertNoBulkRealMappingApproval,
  assertPilotClinicalActivationDisabled,
  assessMedicationDuplicate,
  buildConceptIdentityKey,
  buildPackageIdentityKey,
  buildProductIdentityKey,
  normalizePilotStrength,
  unresolvedExactDuplicatesBlockStaging,
} from "./medicationPilotDuplicatePrevention.js";
import { EM_PILOT_DATASET_ROWS, getEmPilotDatasetStats } from "./medicationEmPilotDataset.js";

describe("medicationPilotDuplicatePrevention — normalization", () => {
  it("deduplicates case-only strength variations", () => {
    expect(normalizePilotStrength("1 MG/ML")).toBe(normalizePilotStrength("1 mg/ml"));
  });

  it("deduplicates whitespace variations", () => {
    expect(normalizePilotStrength("1mg/ml")).toBe(normalizePilotStrength("1 mg / ml"));
  });

  it("deduplicates equivalent unit representations (1000 mg ↔ 1 g)", () => {
    expect(normalizePilotStrength("1000 mg")).toBe(normalizePilotStrength("1 g"));
  });

  it("keeps concentration distinct from total dose", () => {
    expect(normalizePilotStrength("10 mg/mL")).not.toBe(normalizePilotStrength("10 mg"));
  });

  it("builds deterministic combination ingredient ordering", () => {
    const a = buildConceptIdentityKey({
      genericName: "piperacillin / tazobactam",
    });
    const b = buildConceptIdentityKey({
      genericName: "tazobactam / piperacillin",
    });
    expect(a).toBe(b);
  });

  it("keeps different strengths distinct at product key", () => {
    const a = buildProductIdentityKey({
      genericName: "morphine",
      strengthDisplay: "2 mg/mL",
      dosageForm: "injection",
      route: "intravenous",
    });
    const b = buildProductIdentityKey({
      genericName: "morphine",
      strengthDisplay: "10 mg/mL",
      dosageForm: "injection",
      route: "intravenous",
    });
    expect(a).not.toBe(b);
  });

  it("keeps different dosage forms distinct", () => {
    const a = buildProductIdentityKey({
      genericName: "lorazepam",
      strengthDisplay: "1 mg",
      dosageForm: "tablet",
      route: "oral",
    });
    const b = buildProductIdentityKey({
      genericName: "lorazepam",
      strengthDisplay: "1 mg",
      dosageForm: "injection",
      route: "intravenous",
    });
    expect(a).not.toBe(b);
  });

  it("keeps different release mechanisms distinct", () => {
    const a = buildProductIdentityKey({
      genericName: "metoprolol",
      strengthDisplay: "50 mg",
      dosageForm: "tablet",
      route: "oral",
      releaseType: "immediate",
    });
    const b = buildProductIdentityKey({
      genericName: "metoprolol",
      strengthDisplay: "50 mg",
      dosageForm: "tablet",
      route: "oral",
      releaseType: "extended",
    });
    expect(a).not.toBe(b);
  });

  it("keeps clinically distinct routes distinct", () => {
    const a = buildProductIdentityKey({
      genericName: "epinephrine",
      strengthDisplay: "1 mg/mL",
      dosageForm: "injection",
      route: "intravenous",
    });
    const b = buildProductIdentityKey({
      genericName: "epinephrine",
      strengthDisplay: "1 mg/mL",
      dosageForm: "injection",
      route: "intramuscular",
    });
    expect(a).not.toBe(b);
  });

  it("detects brand/generic aliasing via brand component of product key", () => {
    const generic = buildProductIdentityKey({
      genericName: "ondansetron",
      brandName: null,
      strengthDisplay: "4 mg",
      dosageForm: "tablet",
      route: "oral",
    });
    const branded = buildProductIdentityKey({
      genericName: "ondansetron",
      brandName: "Zofran",
      strengthDisplay: "4 mg",
      dosageForm: "tablet",
      route: "oral",
    });
    expect(generic).not.toBe(branded);
    expect(buildConceptIdentityKey({ genericName: "ondansetron" })).toBe(
      buildConceptIdentityKey({ genericName: "ondansetron", brandName: "Zofran" })
    );
  });
});

describe("medicationPilotDuplicatePrevention — duplicate engine", () => {
  it("classifies exact product duplicates", () => {
    const input = {
      genericName: "ceftriaxone",
      strengthDisplay: "1 g",
      dosageForm: "injection",
      route: "intravenous",
    };
    const result = assessMedicationDuplicate({
      source: { ...input, itemCode: "A" },
      matched: { ...input, entityId: "prod-1", entityType: "MEDICATION_PRODUCT" },
    });
    expect(result.duplicateClassification).toBe("EXACT_DUPLICATE");
    expect(result.recommendedAction).toBe("REUSE_EXISTING_PRODUCT");
    expect(result.requiresHumanReview).toBe(true);
  });

  it("classifies source duplicates", () => {
    const result = assessMedicationDuplicate({
      source: {
        genericName: "aspirin",
        strengthDisplay: "81 mg",
        dosageForm: "tablet",
        route: "oral",
        itemCode: "A",
      },
      matched: {
        genericName: "aspirin",
        strengthDisplay: "81 mg",
        dosageForm: "tablet",
        route: "oral",
        entityId: "B",
        entityType: "PILOT_ITEM",
      },
      sameSourceRow: true,
    });
    expect(result.duplicateClassification).toBe("SOURCE_DUPLICATE");
    expect(unresolvedExactDuplicatesBlockStaging([result.duplicateClassification])).toBe(true);
  });

  it("does not block staging for reuse exact duplicates", () => {
    expect(unresolvedExactDuplicatesBlockStaging(["EXACT_DUPLICATE"])).toBe(false);
    expect(unresolvedExactDuplicatesBlockStaging(["PACKAGE_DUPLICATE"])).toBe(false);
  });

  it("forbids automatic merge of probable/possible duplicates", () => {
    expect(() => assertNoAutomaticDuplicateMerge("PROBABLE_DUPLICATE")).toThrow(/Automatic merge/);
    expect(() => assertNoAutomaticDuplicateMerge("POSSIBLE_DUPLICATE")).toThrow(/Automatic merge/);
  });

  it("forbids bulk real mapping approval and clinical activation", () => {
    expect(() => assertNoBulkRealMappingApproval("BULK_APPROVE")).toThrow(/Bulk approval/);
    expect(() => assertPilotClinicalActivationDisabled(true)).toThrow(/clinicalActivationAllowed/);
    expect(() => assertPilotClinicalActivationDisabled(false)).not.toThrow();
  });

  it("keeps package keys distinct when NDC/package differ", () => {
    const a = buildPackageIdentityKey({
      genericName: "vancomycin",
      strengthDisplay: "1 g",
      dosageForm: "injection",
      route: "intravenous",
      ndc: "00000-0001-01",
      packageQuantity: "1",
      packageUnit: "vial",
    });
    const b = buildPackageIdentityKey({
      genericName: "vancomycin",
      strengthDisplay: "1 g",
      dosageForm: "injection",
      route: "intravenous",
      ndc: "00000-0001-02",
      packageQuantity: "10",
      packageUnit: "vial",
    });
    expect(a).not.toBe(b);
  });
});

describe("medicationEmPilotDataset", () => {
  it("keeps curated pilot size in the controlled 75–125 range", () => {
    const stats = getEmPilotDatasetStats();
    expect(stats.total).toBeGreaterThanOrEqual(75);
    expect(stats.total).toBeLessThanOrEqual(125);
    expect(EM_PILOT_DATASET_ROWS.length).toBe(stats.total);
  });
});
