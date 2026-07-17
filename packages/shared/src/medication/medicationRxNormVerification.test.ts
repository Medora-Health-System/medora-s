import { describe, expect, it } from "vitest";
import {
  assertConflictAdjudication,
  assertLegalMappingTransition,
  assertSyntheticToRealMappingBlocked,
  assertTargetKindCompatibleWithTermType,
  isSyntheticRxCui,
  isSyntheticTargetCode,
  requiresConflictAdjudication,
  RXNORM_CONFLICT_OVERRIDE_REASON_VALUES,
  RXNORM_MAPPING_DECISION_VALUES,
  RXNORM_MAPPING_STATUS_TRANSITIONS,
  RXNORM_REJECTION_REASON_VALUES,
  RXNORM_VERIFIABLE_CANDIDATE_STATUS_VALUES,
} from "./medicationRxNormVerification.js";

describe("medicationRxNormVerification enums", () => {
  it("exports rejection, decision, and override reason values", () => {
    expect(RXNORM_REJECTION_REASON_VALUES).toContain("SYNTHETIC_REAL_VIOLATION");
    expect(RXNORM_MAPPING_DECISION_VALUES).toContain("VERIFIED");
    expect(RXNORM_CONFLICT_OVERRIDE_REASON_VALUES).toContain("MULTIPLE_CANDIDATES");
    expect(RXNORM_VERIFIABLE_CANDIDATE_STATUS_VALUES).toContain("AMBIGUOUS");
  });
});

describe("assertLegalMappingTransition", () => {
  it("allows verify/reject/defer from reviewable statuses", () => {
    for (const status of ["CANDIDATE", "NEEDS_REVIEW", "AMBIGUOUS", "CONFLICT"] as const) {
      expect(() => assertLegalMappingTransition(status, "VERIFIED")).not.toThrow();
      expect(() => assertLegalMappingTransition(status, "REJECTED")).not.toThrow();
      expect(() => assertLegalMappingTransition(status, "DEFERRED")).not.toThrow();
    }
    expect(() => assertLegalMappingTransition("DEFERRED", "VERIFIED")).not.toThrow();
  });

  it("blocks illegal transitions", () => {
    expect(() => assertLegalMappingTransition("REJECTED", "VERIFIED")).toThrow(/Illegal RxNorm mapping transition/);
    expect(() => assertLegalMappingTransition("VERIFIED", "REJECTED")).toThrow(/Illegal RxNorm mapping transition/);
  });

  it("documents retire from verified only", () => {
    expect(RXNORM_MAPPING_STATUS_TRANSITIONS.VERIFIED).toEqual(["RETIRED"]);
  });
});

describe("synthetic guards", () => {
  it("detects synthetic rxcui and target codes", () => {
    expect(isSyntheticRxCui("SYNTH000001")).toBe(true);
    expect(isSyntheticRxCui("123456")).toBe(false);
    expect(isSyntheticTargetCode("SYNTH_MC_ACETAMINOPHEN")).toBe(true);
    expect(isSyntheticTargetCode("SYNTH_MP_ACETAMINOPHEN_500_TAB")).toBe(true);
    expect(isSyntheticTargetCode("ACETAMINOPHEN")).toBe(false);
  });

  it("blocks synthetic rxcui to real targets", () => {
    expect(() =>
      assertSyntheticToRealMappingBlocked({
        rxcui: "SYNTH000001",
        targetDataClassification: "PRODUCTION",
        targetCode: "ACETAMINOPHEN",
      })
    ).toThrow(/SyntheticToRealMappingBlocked/);

    expect(() =>
      assertSyntheticToRealMappingBlocked({
        rxcui: "SYNTH000001",
        targetDataClassification: "FIXTURE",
        targetCode: "SYNTH_MC_ACETAMINOPHEN",
      })
    ).not.toThrow();

    expect(() =>
      assertSyntheticToRealMappingBlocked({
        rxcui: "198440",
        targetDataClassification: "PRODUCTION",
        targetCode: "ACETAMINOPHEN",
      })
    ).not.toThrow();
  });
});

describe("assertTargetKindCompatibleWithTermType", () => {
  it("maps ingredient term types to concept targets", () => {
    for (const termType of ["IN", "PIN", "MIN"]) {
      expect(() =>
        assertTargetKindCompatibleWithTermType(termType, "MEDICATION_CONCEPT")
      ).not.toThrow();
      expect(() =>
        assertTargetKindCompatibleWithTermType(termType, "MEDICATION_PRODUCT")
      ).toThrow(/requires MEDICATION_CONCEPT/);
    }
  });

  it("maps product term types to product targets", () => {
    for (const termType of ["SCD", "SBD", "SCDF", "SBDF"]) {
      expect(() =>
        assertTargetKindCompatibleWithTermType(termType, "MEDICATION_PRODUCT")
      ).not.toThrow();
      expect(() =>
        assertTargetKindCompatibleWithTermType(termType, "MEDICATION_CONCEPT")
      ).toThrow(/requires MEDICATION_PRODUCT/);
    }
  });

  it("rejects DF verification and BN product mapping", () => {
    expect(() => assertTargetKindCompatibleWithTermType("DF", "MEDICATION_CONCEPT")).toThrow(
      /cannot be verified/
    );
    expect(() => assertTargetKindCompatibleWithTermType("BN", "MEDICATION_PRODUCT")).toThrow(
      /aliases only/
    );
  });

  it("rejects GPCK pack verification until package mapping is certified", () => {
    expect(() => assertTargetKindCompatibleWithTermType("GPCK", "MEDICATION_CONCEPT")).toThrow(
      /package mapping/i
    );
    expect(() => assertTargetKindCompatibleWithTermType("GPCK", "MEDICATION_PRODUCT")).toThrow(
      /package mapping/i
    );
  });
});

describe("conflict adjudication", () => {
  it("requires acknowledgment for ambiguous/conflict statuses", () => {
    expect(requiresConflictAdjudication("AMBIGUOUS")).toBe(true);
    expect(requiresConflictAdjudication("CONFLICT")).toBe(true);
    expect(requiresConflictAdjudication("CANDIDATE")).toBe(false);
  });

  it("validates override payload", () => {
    expect(() =>
      assertConflictAdjudication({
        status: "AMBIGUOUS",
        acknowledged: false,
        overrideReasons: ["MULTIPLE_CANDIDATES"],
        notes: "reviewed",
      })
    ).toThrow(/conflictOverrideAcknowledged/);

    expect(() =>
      assertConflictAdjudication({
        status: "CONFLICT",
        acknowledged: true,
        overrideReasons: [],
        notes: "reviewed",
      })
    ).toThrow(/override reason/);

    expect(() =>
      assertConflictAdjudication({
        status: "CONFLICT",
        acknowledged: true,
        overrideReasons: ["MULTIPLE_CANDIDATES"],
        notes: "   ",
      })
    ).toThrow(/rationale notes/);

    expect(() =>
      assertConflictAdjudication({
        status: "CONFLICT",
        acknowledged: true,
        overrideReasons: ["MULTIPLE_CANDIDATES", "STRENGTH_MISMATCH"],
        notes: "Manual adjudication for certification.",
      })
    ).not.toThrow();
  });
});
