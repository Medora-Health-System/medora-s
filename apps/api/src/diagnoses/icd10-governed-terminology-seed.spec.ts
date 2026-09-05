import {
  buildGovernedIcd10TerminologySeedPlan,
  evaluateIcd10MultilingualCertification,
  GOVERNED_ICD10_CLINICIAN_LABELS,
  ICD10_GOVERNED_TERMINOLOGY_VERSION,
  inspectGovernedIcd10ClinicianLabels,
} from "@medora/shared";

describe("MEDUI.TRILANG.DX.P2.1 governed overlay import", () => {
  it("uses the shared 89-code module as source of truth", () => {
    const inspection = inspectGovernedIcd10ClinicianLabels();
    expect(inspection.frCount).toBe(89);
    expect(inspection.esCount).toBe(89);
    expect(inspection.duplicateCodes).toEqual([]);
    expect(inspection.missingPairCodes).toEqual([]);
    expect(inspection.emptyLabels).toEqual([]);
    expect(inspection.invalidLocale).toEqual([]);
    expect(GOVERNED_ICD10_CLINICIAN_LABELS.fr.R1085).toBe("Douleur abdominale à plusieurs sites");
    expect(GOVERNED_ICD10_CLINICIAN_LABELS.es.R1085).toBe("Dolor abdominal en varios sitios");
  });

  it("stamps governed sourceId and terminologyVersion on accepted rows", () => {
    const plan = buildGovernedIcd10TerminologySeedPlan({
      catalogByNormalizedCode: new Map([
        [
          "R1085",
          {
            id: "cat-r1085",
            code: "R10.85",
            normalizedCode: "R1085",
            codeSystem: "ICD-10-CM",
            releaseVersion: "FY2026",
          },
        ],
      ]),
      expectedReleaseVersion: "FY2026",
    });
    expect(plan.acceptedTerminology.length).toBe(2);
    expect(plan.acceptedTerminology.every((row) => row.sourceId === "MEDORA_DX_GOVERNED")).toBe(true);
    expect(plan.acceptedTerminology.every((row) => row.terminologyVersion === ICD10_GOVERNED_TERMINOLOGY_VERSION)).toBe(
      true,
    );
    expect(plan.acceptedTerminology.every((row) => row.provenance === "MEDORA_GOVERNED")).toBe(true);
    expect(plan.acceptedTerminology.every((row) => row.labelRegister === "CLINICIAN_PREFERRED")).toBe(true);
    expect(plan.acceptedTerminology.every((row) => row.status === "APPROVED")).toBe(true);
  });

  it("rejects overlay codes that are absent from the target release", () => {
    const plan = buildGovernedIcd10TerminologySeedPlan({
      catalogByNormalizedCode: new Map(),
      expectedReleaseVersion: "FY2026",
    });
    expect(plan.detectedFr).toBe(89);
    expect(plan.detectedEs).toBe(89);
    expect(plan.acceptedTerminology).toHaveLength(0);
    expect(plan.rejected).toHaveLength(178);
    expect(plan.rejected.every((row) => row.reason === "CODE_NOT_IN_TARGET_RELEASE")).toBe(true);
    expect(plan.terminologyVersion).toBe(ICD10_GOVERNED_TERMINOLOGY_VERSION);
  });
});

describe("MEDUI.TRILANG.DX.P2.1 certification gates", () => {
  const incomplete = {
    release: "FY2026",
    totalSearchable: 74719,
    enExact: 74719,
    frExact: 89,
    esExact: 89,
    missingEn: 0,
    missingFr: 74630,
    missingEs: 74630,
    codeOnlyEn: 0,
    codeOnlyFr: 74630,
    codeOnlyEs: 74630,
    categorySubstitutions: 0,
    invalidTerminologyCodes: 0,
    orphanTerminology: 0,
    duplicateActivePreferredLabels: 0,
    duplicateEffectiveClinicianLabels: 0,
    crossLanguageFallback: 0,
    aliasUsedAsDisplay: 0,
    consumerUsedAsClinician: 0,
    canonicalCodeMutations: 0,
    expectedBillableRows: 74719,
  };

  it("lets SAFE_ARCHITECTURE pass while FULL_TRILINGUAL_COVERAGE stays fail", () => {
    const gates = evaluateIcd10MultilingualCertification(incomplete);
    expect(gates.SAFE_ARCHITECTURE).toBe(true);
    expect(gates.FULL_TRILINGUAL_COVERAGE).toBe(false);
  });

  it("fails SAFE_ARCHITECTURE on category substitution or alias-as-display", () => {
    expect(evaluateIcd10MultilingualCertification({ ...incomplete, categorySubstitutions: 1 }).SAFE_ARCHITECTURE).toBe(
      false,
    );
    expect(evaluateIcd10MultilingualCertification({ ...incomplete, aliasUsedAsDisplay: 1 }).SAFE_ARCHITECTURE).toBe(
      false,
    );
  });
});
