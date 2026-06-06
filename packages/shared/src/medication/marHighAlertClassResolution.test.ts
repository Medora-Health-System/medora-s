import { describe, expect, it } from "vitest";
import { marAdministrationRequiresDoubleCheck } from "./marAdministrationGovernancePolicy.js";
import { resolveMarHighAlertClassification } from "./marHighAlertClassResolution.js";

const REGULAR_INSULIN_CATALOG = {
  code: "REGULAR_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS",
  genericName: "Regular Insulin",
  displayNameEn: "Insulin (regular)",
  strength: "100 UI/mL",
  dosageForm: "injectable",
};

describe("resolveMarHighAlertClassification (M1.8B.4A.2)", () => {
  it("prefers safety profile class when present", () => {
    const resolved = resolveMarHighAlertClassification({
      profileHighAlertClass: "HIGH_ALERT_INSULIN",
      profileSafetyRequirementCodes: ["REQUIRES_INDEPENDENT_DOUBLE_CHECK"],
      catalog: REGULAR_INSULIN_CATALOG,
    });
    expect(resolved).toMatchObject({
      highAlertClass: "HIGH_ALERT_INSULIN",
      source: "SAFETY_PROFILE",
    });
  });

  it("falls back to manifest for Regular Insulin when profile class absent", () => {
    const resolved = resolveMarHighAlertClassification({
      catalog: REGULAR_INSULIN_CATALOG,
    });
    expect(resolved).toMatchObject({
      highAlertClass: "HIGH_ALERT_INSULIN",
      source: "MANIFEST",
    });
  });

  it("falls back to catalog heuristic for Lispro when profile missing", () => {
    const resolved = resolveMarHighAlertClassification({
      catalog: {
        code: "INSULIN_LISPRO_100_UI_ML_INJECTABLE_SOUS_CUTANEE",
        genericName: "Insulin lispro",
        strength: "100 UI/mL",
        dosageForm: "injectable",
      },
    });
    expect(resolved).toMatchObject({
      highAlertClass: "HIGH_ALERT_INSULIN",
      source: "CATALOG_HEURISTIC",
    });
  });

  it("falls back for Aspart, Glargine, NPH, and 70/30 without profile", () => {
    const cases = [
      {
        code: "INSULIN_ASPART_100_UI_ML_INJECTABLE_SOUS_CUTANEE",
        genericName: "Insulin aspart",
      },
      {
        code: "INSULIN_GLARGINE_100_UI_ML_INJECTABLE_SOUS_CUTANEE",
        genericName: "Insulin glargine",
      },
      {
        code: "NPH_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS",
        genericName: "NPH Insulin",
      },
      {
        code: "INSULIN_7030_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS",
        genericName: "Insulin 70/30",
      },
    ];
    for (const catalog of cases) {
      const resolved = resolveMarHighAlertClassification({ catalog });
      expect(resolved?.highAlertClass).toBe("HIGH_ALERT_INSULIN");
    }
  });

  it("resolves heparin anticoagulant from catalog code without profile", () => {
    const resolved = resolveMarHighAlertClassification({
      catalog: {
        code: "HEPARIN_5000UI_ML_INJECTABLE",
        genericName: "Heparin",
        strength: "5000 UI/mL",
        dosageForm: "injectable",
      },
    });
    expect(resolved).toMatchObject({
      highAlertClass: "HIGH_ALERT_ANTICOAGULANT",
    });
  });
});

describe("MAR double-check with classification fallback (M1.8B.4A.2)", () => {
  function requiresWitnessForRoute(
    catalog: {
      code: string;
      genericName: string;
      strength?: string;
      dosageForm?: string;
      displayNameEn?: string;
    },
    orderRoute: string,
    options?: { isContinuousInfusion?: boolean }
  ): boolean {
    const resolved = resolveMarHighAlertClassification({ catalog });
    return marAdministrationRequiresDoubleCheck({
      highAlertClass: resolved?.highAlertClass ?? null,
      catalogCode: catalog.code,
      genericName: catalog.genericName,
      orderRoute,
      isContinuousInfusion: options?.isContinuousInfusion === true,
    });
  }

  it("Regular insulin SQ/IVP/IVPB require witness when profile missing", () => {
    expect(requiresWitnessForRoute(REGULAR_INSULIN_CATALOG, "SQ")).toBe(true);
    expect(requiresWitnessForRoute(REGULAR_INSULIN_CATALOG, "IVP")).toBe(true);
    expect(
      requiresWitnessForRoute(REGULAR_INSULIN_CATALOG, "IVPB", { isContinuousInfusion: true })
    ).toBe(true);
  });

  it("Lispro and Aspart SQ require witness when profile missing", () => {
    expect(
      requiresWitnessForRoute(
        {
          code: "INSULIN_LISPRO_100_UI_ML_INJECTABLE_SOUS_CUTANEE",
          genericName: "Insulin lispro",
        },
        "SQ"
      )
    ).toBe(true);
    expect(
      requiresWitnessForRoute(
        {
          code: "INSULIN_ASPART_100_UI_ML_INJECTABLE_SOUS_CUTANEE",
          genericName: "Insulin aspart",
        },
        "SQ"
      )
    ).toBe(true);
    expect(
      requiresWitnessForRoute(
        {
          code: "INSULIN_GLARGINE_100_UI_ML_INJECTABLE_SOUS_CUTANEE",
          genericName: "Insulin glargine",
        },
        "SQ"
      )
    ).toBe(true);
    expect(
      requiresWitnessForRoute(
        {
          code: "NPH_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS",
          genericName: "NPH Insulin",
        },
        "SQ"
      )
    ).toBe(true);
  });

  it("Heparin SQ exempt; IVP/IVPB require witness without profile", () => {
    const heparin = {
      code: "HEPARIN_5000UI_ML_INJECTABLE",
      genericName: "Heparin",
      strength: "5000 UI/mL",
      dosageForm: "injectable",
    };
    expect(requiresWitnessForRoute(heparin, "SQ")).toBe(false);
    expect(requiresWitnessForRoute(heparin, "IVP")).toBe(true);
    expect(requiresWitnessForRoute(heparin, "IVPB", { isContinuousInfusion: true })).toBe(true);
  });
});
