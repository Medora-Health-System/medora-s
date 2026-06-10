import { describe, expect, it } from "vitest";
import { resolveMarHighAlertClassification } from "./marHighAlertClassResolution.js";
import { marInfusionStartRequiresHighAlertIvpbWitness } from "./marAdministrationGovernancePolicy.js";
import {
  isApprovedVasopressorInfusionMedication,
  isApprovedVasopressorMedication,
  VASOPRESSOR_DOPAMINE_CATALOG_CODES,
  VASOPRESSOR_EPINEPHRINE_INFUSION_CATALOG_CODES,
  VASOPRESSOR_EPINEPHRINE_PUSH_CATALOG_CODES,
  VASOPRESSOR_MILRINONE_CATALOG_CODES,
} from "./vasopressorGovernanceCatalogMap.js";
import { validateEnterpriseWave4EdHospitalFormularyManifest } from "./enterpriseWave4EdHospitalFormularyValidation.js";

const VASOPRESSOR_CLASS = "HIGH_ALERT_VASOPRESSOR";
const VASOPRESSOR_SAFETY_CODES = [
  "REQUIRES_INDEPENDENT_DOUBLE_CHECK",
  "REQUIRES_MAR_VERIFICATION",
];

function classify(code: string, genericName: string, strength?: string, dosageForm?: string) {
  return resolveMarHighAlertClassification({
    catalog: { code, genericName, strength, dosageForm },
  });
}

function expectVasopressorParity(
  haitiCode: string,
  enterpriseCode: string,
  genericName: string,
  opts?: { strength?: string; dosageForm?: string }
) {
  const haiti = classify(haitiCode, genericName, opts?.strength, opts?.dosageForm);
  const enterprise = classify(enterpriseCode, genericName, opts?.strength, opts?.dosageForm);
  expect(haiti?.highAlertClass).toBe(VASOPRESSOR_CLASS);
  expect(enterprise?.highAlertClass).toBe(VASOPRESSOR_CLASS);
  expect(haiti?.safetyRequirementCodes).toEqual(VASOPRESSOR_SAFETY_CODES);
  expect(enterprise?.safetyRequirementCodes).toEqual(VASOPRESSOR_SAFETY_CODES);
  expect(haiti?.source).toBe("MANIFEST");
  expect(enterprise?.source).toBe("MANIFEST");
}

describe("vasopressorGovernance parity (M1.8B.7E.2C.3)", () => {
  it("maps all canonical vasopressor catalog codes", () => {
    for (const code of VASOPRESSOR_DOPAMINE_CATALOG_CODES) {
      expect(isApprovedVasopressorMedication({ catalogCode: code, genericName: "Dopamine" })).toBe(true);
    }
    for (const code of VASOPRESSOR_MILRINONE_CATALOG_CODES) {
      expect(isApprovedVasopressorMedication({ catalogCode: code, genericName: "Milrinone" })).toBe(true);
    }
  });

  it("separates epinephrine push from infusion helpers", () => {
    for (const code of VASOPRESSOR_EPINEPHRINE_PUSH_CATALOG_CODES) {
      expect(isApprovedVasopressorMedication({ catalogCode: code, genericName: "Epinephrine" })).toBe(
        true
      );
      expect(
        isApprovedVasopressorInfusionMedication({
          catalogCode: code,
          genericName: "Epinephrine",
          administrationType: "PUSH",
        })
      ).toBe(false);
    }
    for (const code of VASOPRESSOR_EPINEPHRINE_INFUSION_CATALOG_CODES) {
      expect(
        isApprovedVasopressorInfusionMedication({
          catalogCode: code,
          genericName: "Epinephrine",
          administrationType: "INFUSION",
        })
      ).toBe(true);
    }
  });

  it("Dopamine Haiti vs Enterprise resolve HIGH_ALERT_VASOPRESSOR", () => {
    expectVasopressorParity(
      "DOPAMINE_400MG_250ML_IV",
      "DOPAMINE_400_MG_250_ML_PERFUSION_INTRAVEINEUSE",
      "Dopamine"
    );
  });

  it("Dobutamine Haiti vs Enterprise resolve HIGH_ALERT_VASOPRESSOR", () => {
    expectVasopressorParity(
      "DOBUTAMINE_250MG_20ML_IV",
      "DOBUTAMINE_250_MG_20_ML_INJECTABLE_INTRAVEINEUSE",
      "Dobutamine"
    );
  });

  it("Norepinephrine Haiti vs Enterprise resolve HIGH_ALERT_VASOPRESSOR", () => {
    expectVasopressorParity(
      "NOREPINEPHRINE_4MG_4ML_IV",
      "NOREPINEPHRINE_4_MG_4_ML_INJECTABLE_INTRAVEINEUSE",
      "Norepinephrine"
    );
  });

  it("Phenylephrine Haiti vs Enterprise resolve HIGH_ALERT_VASOPRESSOR", () => {
    expectVasopressorParity(
      "PHENYLEPHRINE_10MG_ML_IV",
      "PHENYLEPHRINE_10_MG_ML_INJECTABLE_INTRAVEINEUSE",
      "Phenylephrine"
    );
  });

  it("Vasopressin Haiti vs Enterprise resolve HIGH_ALERT_VASOPRESSOR", () => {
    expectVasopressorParity(
      "VASOPRESSIN_20UI_ML_IV",
      "VASOPRESSIN_20_UNITS_ML_INJECTABLE_INTRAVEINEUSE",
      "Vasopressin"
    );
  });

  it("Epinephrine push Haiti Adrenaline vs Enterprise Epinephrine resolve HIGH_ALERT_VASOPRESSOR", () => {
    const haiti = classify(
      "ADRENALINE_1_MG_PER_ML_INJECTABLE_INJECTION",
      "Adrenaline",
      "1 mg/mL",
      "injectable"
    );
    const enterprise = classify(
      "ADRENALINE_1_MG_PER_ML_INJECTABLE_INJECTION",
      "Epinephrine",
      "1 mg/mL",
      "injectable"
    );
    expect(haiti?.highAlertClass).toBe(VASOPRESSOR_CLASS);
    expect(enterprise?.highAlertClass).toBe(VASOPRESSOR_CLASS);
    expect(haiti?.safetyRequirementCodes).toEqual(VASOPRESSOR_SAFETY_CODES);
    expect(enterprise?.safetyRequirementCodes).toEqual(VASOPRESSOR_SAFETY_CODES);
  });

  it("Epinephrine infusion enterprise SKUs resolve HIGH_ALERT_VASOPRESSOR", () => {
    for (const code of VASOPRESSOR_EPINEPHRINE_INFUSION_CATALOG_CODES) {
      const result = classify(code, "Epinephrine");
      expect(result?.highAlertClass).toBe(VASOPRESSOR_CLASS);
      expect(result?.safetyRequirementCodes).toEqual(VASOPRESSOR_SAFETY_CODES);
    }
  });

  it("Milrinone enterprise SKUs resolve HIGH_ALERT_VASOPRESSOR (pending INOTROPE class)", () => {
    for (const code of VASOPRESSOR_MILRINONE_CATALOG_CODES) {
      const result = classify(code, "Milrinone");
      expect(result?.highAlertClass).toBe(VASOPRESSOR_CLASS);
      expect(result?.safetyRequirementCodes).toEqual(VASOPRESSOR_SAFETY_CODES);
    }
  });

  it("does not enable START witness for vasopressors after alignment", () => {
    expect(
      marInfusionStartRequiresHighAlertIvpbWitness({
        highAlertClass: VASOPRESSOR_CLASS,
        genericName: "Dopamine",
        catalogCode: "DOPAMINE_400_MG_250_ML_PERFUSION_INTRAVEINEUSE",
        administrationType: "INFUSION",
        orderRoute: "IVPB",
        infusionPhase: "INFUSION_START",
        requiresDoubleSign: true,
      })
    ).toBe(false);
  });

  it("enterprise formulary validation still passes", () => {
    expect(validateEnterpriseWave4EdHospitalFormularyManifest()).toEqual([]);
  });
});
