import { describe, expect, it } from "vitest";
import {
  evaluateIcd10MultilingualCertification,
  icd10MultilingualCertificationExitCode,
  type Icd10MultilingualCertificationCounts,
} from "./icd10MultilingualCertification.js";

const incomplete: Icd10MultilingualCertificationCounts = {
  release: "FY2026",
  totalSearchable: 106,
  enExact: 106,
  frExact: 3,
  esExact: 3,
  missingEn: 0,
  missingFr: 103,
  missingEs: 103,
  codeOnlyEn: 0,
  codeOnlyFr: 103,
  codeOnlyEs: 103,
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

describe("ICD multilingual certification gates", () => {
  it("does not treat architecture readiness as full FR/ES coverage", () => {
    const gates = evaluateIcd10MultilingualCertification(incomplete);
    expect(gates.SAFE_ARCHITECTURE).toBe(true);
    expect(gates.FULL_TRILINGUAL_COVERAGE).toBe(false);
  });

  it("uses distinct exit codes so incomplete coverage is never an ambiguous green", () => {
    const gates = evaluateIcd10MultilingualCertification(incomplete);
    expect(icd10MultilingualCertificationExitCode("safety", gates)).toBe(0);
    expect(icd10MultilingualCertificationExitCode("coverage", gates)).toBe(2);
    expect(icd10MultilingualCertificationExitCode("both", gates)).toBe(2);
    expect(icd10MultilingualCertificationExitCode("both", { ...gates, SAFE_ARCHITECTURE: false })).toBe(1);
  });

  it("fails safety on duplicate effective clinician labels", () => {
    const gates = evaluateIcd10MultilingualCertification({
      ...incomplete,
      duplicateEffectiveClinicianLabels: 1,
    });
    expect(gates.SAFE_ARCHITECTURE).toBe(false);
    expect(icd10MultilingualCertificationExitCode("safety", gates)).toBe(1);
  });
});
