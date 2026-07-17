import { describe, expect, it } from "vitest";
import {
  assertNoAutomaticFuzzyMerge,
  DUAL_LAYER_LINKAGE_STATUS_VALUES,
  hasLegacyCatalogLinkButUnverified,
  isDualLayerVerifiedLinkage,
  isRxNormVerifiedMapping,
  resolveHistoricalMedicationIdentity,
  ROUTE_ELIGIBILITY_STATUS_VALUES,
  RXNORM_MAPPING_STATUS_VALUES,
  rxNormMappingStatusSchema,
} from "./medicationCanonicalIdentity.js";
import {
  classifyMedicationCode,
  DATA_CLASSIFICATION_VALUES,
  isFixtureLikeMedicationCode,
  isNonProductionDataClassification,
  parseMedicationDataClassification,
} from "./medicationFixtureClassification.js";
import {
  assertQuantitiesNotInterchangeable,
  billingRequiresAdministrationProvenance,
  pickBillableQuantitySource,
} from "./medicationBillingTraceability.js";

describe("medicationCanonicalIdentity", () => {
  it("exports stable RxNorm mapping status values", () => {
    expect(RXNORM_MAPPING_STATUS_VALUES).toContain("UNMAPPED");
    expect(RXNORM_MAPPING_STATUS_VALUES).toContain("VERIFIED");
    expect(rxNormMappingStatusSchema.parse("CANDIDATE")).toBe("CANDIDATE");
  });

  it("requires VERIFIED status and RxCUI for verified mapping", () => {
    expect(isRxNormVerifiedMapping("VERIFIED", "123456")).toBe(true);
    expect(isRxNormVerifiedMapping("VERIFIED", "")).toBe(false);
    expect(isRxNormVerifiedMapping("VERIFIED", null)).toBe(false);
    expect(isRxNormVerifiedMapping("UNMAPPED", "123456")).toBe(false);
    expect(isRxNormVerifiedMapping("CANDIDATE", "123456")).toBe(false);
  });

  it("exports dual-layer and route eligibility enums", () => {
    expect(DUAL_LAYER_LINKAGE_STATUS_VALUES).toContain("UNLINKED");
    expect(ROUTE_ELIGIBILITY_STATUS_VALUES).toContain("NOT_VERIFIED");
  });

  it("forbids automatic fuzzy merge", () => {
    expect(() => assertNoAutomaticFuzzyMerge("search-ranking")).toThrow(/forbidden/i);
  });

  it("resolves historical identity snapshot-first", () => {
    const resolved = resolveHistoricalMedicationIdentity({
      snapshotLabel: "Morphine 2 mg IV (snapshot)",
      catalogCode: "MORPHINE_2MG",
      currentCanonical: { conceptDisplayName: "Morphine", productStrengthDisplay: "2 mg/mL" },
    });
    expect(resolved.source).toBe("snapshot");
    expect(resolved.primaryLabel).toBe("Morphine 2 mg IV (snapshot)");
    expect(resolved.catalogCode).toBe("MORPHINE_2MG");
  });

  it("falls back to catalog code then canonical", () => {
    expect(
      resolveHistoricalMedicationIdentity({
        catalogCode: "ACETAMINOPHEN_500",
      }).source
    ).toBe("catalog_code");

    expect(
      resolveHistoricalMedicationIdentity({
        currentCanonical: { conceptDisplayName: "Acetaminophen", productStrengthDisplay: "500 mg" },
      }).primaryLabel
    ).toContain("Acetaminophen");
  });

  it("does not treat legacy FK as verified linkage", () => {
    expect(isDualLayerVerifiedLinkage("UNLINKED")).toBe(false);
    expect(
      hasLegacyCatalogLinkButUnverified("legacy-id-1", "UNLINKED")
    ).toBe(true);
    expect(
      hasLegacyCatalogLinkButUnverified("legacy-id-1", "VERIFIED")
    ).toBe(false);
  });
});

describe("medicationFixtureClassification", () => {
  it("exports data classification values", () => {
    expect(DATA_CLASSIFICATION_VALUES).toEqual(["PRODUCTION", "FIXTURE", "DEV_SAMPLE", "UNKNOWN"]);
  });

  it("detects MST fixture codes", () => {
    expect(isFixtureLikeMedicationCode("GENERIC_MST_c1b6ceee")).toBe(true);
    expect(isFixtureLikeMedicationCode("KCL_MST_ecadc4e9")).toBe(true);
    expect(isFixtureLikeMedicationCode("LISINOPRIL_10")).toBe(false);
  });

  it("classifies codes heuristically", () => {
    expect(classifyMedicationCode("GENERIC_MST_abc")).toBe("FIXTURE");
    expect(classifyMedicationCode("MEDORA-DEV-SAMPLE-1")).toBe("DEV_SAMPLE");
    expect(classifyMedicationCode("AMLODIPINE_5_MG_COMPRIME_ORAL")).toBe("PRODUCTION");
    expect(classifyMedicationCode("")).toBe("UNKNOWN");
  });

  it("parses stored classification and flags non-production", () => {
    expect(parseMedicationDataClassification("fixture")).toBe("FIXTURE");
    expect(isNonProductionDataClassification("FIXTURE")).toBe(true);
    expect(isNonProductionDataClassification("PRODUCTION")).toBe(false);
  });
});

describe("medicationBillingTraceability", () => {
  it("rejects interchangeable quantity kinds", () => {
    expect(() => assertQuantitiesNotInterchangeable("ordered", "administered", "billing")).toThrow(
      /not interchangeable/i
    );
    expect(() => assertQuantitiesNotInterchangeable("administered", "administered", "billing")).not.toThrow();
  });

  it("requires administration provenance by default for billing", () => {
    expect(
      billingRequiresAdministrationProvenance({
        requiresManualReview: true,
        mappingStatus: "VERIFIED",
        administered: { kind: "administered", amount: 1, unit: "mg" },
      })
    ).toBe(true);

    expect(
      billingRequiresAdministrationProvenance({
        requiresManualReview: false,
        mappingStatus: "VERIFIED",
        administered: { kind: "administered", amount: 2, unit: "mg" },
      })
    ).toBe(false);
  });

  it("picks billable source safely", () => {
    const administered = { kind: "administered" as const, amount: 5, unit: "mg" };
    expect(
      pickBillableQuantitySource({
        requiresManualReview: false,
        mappingStatus: "VERIFIED",
        administered,
        billable: { kind: "billable", amount: 99, unit: "mg" },
      })
    ).toEqual({ kind: "billable", amount: 99, unit: "mg" });

    expect(
      pickBillableQuantitySource({
        requiresManualReview: true,
        mappingStatus: "CANDIDATE",
        administered,
      })
    ).toEqual(administered);
  });
});
