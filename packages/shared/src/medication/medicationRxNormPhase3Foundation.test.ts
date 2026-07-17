import { describe, expect, it } from "vitest";
import {
  generateRxNormMappingCandidates,
  type RxNormMappingTarget,
  type RxNormStagingRowForMapping,
} from "./medicationRxNormCandidateMapping.js";
import {
  assertCandidateNotAutoVerified,
  RXNORM_CANDIDATE_STATUS_VALUES,
  RXNORM_IMPORT_MODE_VALUES,
  RXNORM_RELEASE_STATUS_VALUES,
} from "./medicationRxNormImportModes.js";
import {
  buildRxNormRowChecksumKey,
  normalizeRxNormDisplayTerm,
  normalizeUnitTokens,
} from "./medicationRxNormNormalization.js";
import {
  getRxNormTermTypePolicy,
  isSupportedTermTypeForStaging,
  RXNORM_TERM_TYPE_VALUES,
} from "./medicationRxNormTermTypePolicy.js";

describe("medicationRxNormTermTypePolicy", () => {
  it("exports all RxNorm term types", () => {
    expect(RXNORM_TERM_TYPE_VALUES).toContain("IN");
    expect(RXNORM_TERM_TYPE_VALUES).toContain("GPCK");
    expect(RXNORM_TERM_TYPE_VALUES).toHaveLength(14);
  });

  it("supports Phase 3 staging term types", () => {
    for (const termType of ["IN", "PIN", "MIN", "SCD", "SBD", "SCDF", "SBDF", "BN", "DF", "GPCK"]) {
      expect(isSupportedTermTypeForStaging(termType)).toBe(true);
    }
    expect(isSupportedTermTypeForStaging("BPCK")).toBe(false);
    expect(isSupportedTermTypeForStaging("SCDG")).toBe(false);
  });

  it("never marks Phase 3 rows as orderable", () => {
    for (const termType of RXNORM_TERM_TYPE_VALUES) {
      expect(getRxNormTermTypePolicy(termType)?.everOrderable).toBe(false);
    }
  });
});

describe("medicationRxNormNormalization", () => {
  it("normalizes display terms for search only", () => {
    expect(normalizeRxNormDisplayTerm("  Acetaminophen  500  MG  ")).toBe("acetaminophen 500 mg");
    expect(normalizeUnitTokens("10 ML")).toBe("10 ml");
  });

  it("builds stable checksum keys", () => {
    const fields = {
      rxcui: "SYNTH000001",
      termType: "IN",
      displayTerm: "Acetaminophen",
    };
    expect(buildRxNormRowChecksumKey(fields)).toBe(
      buildRxNormRowChecksumKey({ ...fields, language: "", suppressFlag: "" })
    );
  });
});

describe("medicationRxNormImportModes", () => {
  it("exports import and release enums", () => {
    expect(RXNORM_IMPORT_MODE_VALUES).toContain("STAGE_ONLY");
    expect(RXNORM_RELEASE_STATUS_VALUES).toContain("STAGED");
    expect(RXNORM_CANDIDATE_STATUS_VALUES).toContain("NEEDS_REVIEW");
  });

  it("forbids auto verification", () => {
    expect(() => assertCandidateNotAutoVerified(false)).not.toThrow();
    expect(() => assertCandidateNotAutoVerified(true)).toThrow(/forbidden/i);
  });
});

describe("medicationRxNormCandidateMapping", () => {
  const stagingRow: RxNormStagingRowForMapping = {
    id: "stage-1",
    rxcui: "SYNTH000010",
    termType: "SCD",
    displayTerm: "Acetaminophen 500 MG Oral Tablet",
    normalizedTerm: "acetaminophen 500 mg oral tablet",
    strengthText: "500 mg",
    doseFormText: "oral tablet",
  };

  it("matches exact rxcui on MedicationConcept targets", () => {
    const targets: RxNormMappingTarget[] = [
      {
        kind: "MEDICATION_CONCEPT",
        id: "concept-1",
        code: "ACETAMINOPHEN",
        rxNormConceptId: "SYNTH000010",
        displayName: "Acetaminophen",
        normalizedDisplayName: "acetaminophen",
      },
    ];
    const candidates = generateRxNormMappingCandidates(stagingRow, targets);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].status).toBe("CANDIDATE");
    expect(candidates[0].confidence).toBe("EXACT");
    expect(candidates[0].autoVerified).toBe(false);
  });

  it("detects ambiguous multiple targets", () => {
    const targets: RxNormMappingTarget[] = [
      {
        kind: "MEDICATION_CONCEPT",
        id: "concept-1",
        normalizedDisplayName: stagingRow.normalizedTerm,
      },
      {
        kind: "MEDICATION_CONCEPT",
        id: "concept-2",
        normalizedDisplayName: stagingRow.normalizedTerm,
      },
    ];
    const candidates = generateRxNormMappingCandidates(stagingRow, targets);
    expect(candidates.every((row) => row.status === "AMBIGUOUS")).toBe(true);
  });

  it("detects strength mismatch conflicts", () => {
    const targets: RxNormMappingTarget[] = [
      {
        kind: "MEDICATION_PRODUCT",
        id: "product-1",
        normalizedDisplayName: stagingRow.normalizedTerm,
        strengthDisplay: "325 mg",
        dosageForm: "oral tablet",
      },
    ];
    const candidates = generateRxNormMappingCandidates(stagingRow, targets);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].status).toBe("CONFLICT");
    expect(candidates[0].evidenceJson).toContain("strength_mismatch");
  });

  it("never emits VERIFIED or autoVerified true", () => {
    const candidates = generateRxNormMappingCandidates(stagingRow, [
      {
        kind: "MEDICATION_CONCEPT",
        id: "concept-1",
        rxNormConceptId: stagingRow.rxcui,
      },
    ]);
    for (const row of candidates) {
      expect(row.autoVerified).toBe(false);
      expect(row.status).not.toBe("VERIFIED");
    }
  });
});
