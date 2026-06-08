/**
 * M1.8B.7C.1 — Infusion catalog governance regression matrix.
 * Ensures deterministic catalog metadata governs MAR lifecycle (not heuristics alone).
 */
import { describe, expect, it } from "vitest";
import { isMedicationInfusionCandidate } from "./infusionRoute.util.js";
import { normalizeMedicationRoute } from "./medicationOrderRoute.js";

/** Haiti-like catalog slices after M1.8B.7C.1 seed hardening. */
const HAITI_INFUSION_CATALOG = {
  potassiumChloride: {
    code: "POTASSIUM_CHLORIDE",
    genericName: "Potassium Chloride",
    medicationLabel: "Potassium Chloride 20 mEq/10 mL",
    catalogRoute: "intraveineuse",
    administrationType: "INFUSION",
  },
  magnesiumSulfate: {
    code: "MAGNESIUM_SULFATE",
    genericName: "Magnesium Sulfate",
    medicationLabel: "Magnesium Sulfate 2 g/50 mL",
    catalogRoute: "intraveineuse",
    administrationType: "INFUSION",
  },
  ceftriaxone: {
    code: "CEFTRIAXONE",
    genericName: "Ceftriaxone",
    medicationLabel: "Ceftriaxone 1 g",
    catalogRoute: "injectable",
    administrationType: "INFUSION",
  },
  vancomycin: {
    code: "VANCOMYCIN",
    genericName: "Vancomycin",
    medicationLabel: "Vancomycin 1 g",
    catalogRoute: "intraveineuse",
    administrationType: "INFUSION",
  },
} as const;

/** Legacy regression harness — PUSH + IVP direct-MAR contract (API-12/13/14). */
const LEGACY_IVP_PUSH_CATALOG = {
  ceftriaxone: {
    code: "CEFTRIAXONE",
    genericName: "Ceftriaxone",
    medicationLabel: "Ceftriaxone 1 g",
    catalogRoute: "IVP",
    administrationType: "PUSH",
  },
} as const;

function classifyInfusion(input: {
  orderRoute: string | null;
  catalog: {
    code: string;
    genericName: string;
    medicationLabel: string;
    catalogRoute: string;
    administrationType: string;
  };
}): boolean {
  const resolvedRoute = input.orderRoute?.trim() || input.catalog.catalogRoute;
  return isMedicationInfusionCandidate({
    route: resolvedRoute,
    medicationLabel: input.catalog.medicationLabel,
    code: input.catalog.code,
    genericName: input.catalog.genericName,
    catalogAdministrationType: input.catalog.administrationType,
  });
}

describe("M1.8B.7C.1 infusion catalog governance", () => {
  describe("route normalization — intraveineuse + INFUSION => IVPB", () => {
    it.each([
      ["intraveineuse", "INFUSION"],
      ["intravenous", "INFUSION"],
      ["IV", "INFUSION"],
      ["intraveineuse", "infusion"],
    ] as const)("maps %s + %s to IVPB", (route, admin) => {
      expect(normalizeMedicationRoute({ route, administrationType: admin })).toBe("IVPB");
    });

    it("does not map intraveineuse without INFUSION admin type", () => {
      expect(normalizeMedicationRoute("intraveineuse")).toBeUndefined();
      expect(
        normalizeMedicationRoute({ route: "intraveineuse", administrationType: "PUSH" })
      ).toBeUndefined();
    });

    it("preserves injectable + INFUSION => IVPB", () => {
      expect(
        normalizeMedicationRoute({ route: "injectable", administrationType: "INFUSION" })
      ).toBe("IVPB");
    });
  });

  describe("blank route + INFUSION catalog => infusion lifecycle", () => {
    it.each([
      ["potassiumChloride", HAITI_INFUSION_CATALOG.potassiumChloride],
      ["magnesiumSulfate", HAITI_INFUSION_CATALOG.magnesiumSulfate],
      ["ceftriaxone", HAITI_INFUSION_CATALOG.ceftriaxone],
      ["vancomycin", HAITI_INFUSION_CATALOG.vancomycin],
    ] as const)("%s", (_id, catalog) => {
      expect(classifyInfusion({ orderRoute: null, catalog })).toBe(true);
    });
  });

  describe("IVP + INFUSION catalog => infusion lifecycle (catalog wins)", () => {
    it.each([
      ["potassiumChloride", HAITI_INFUSION_CATALOG.potassiumChloride],
      ["ceftriaxone", HAITI_INFUSION_CATALOG.ceftriaxone],
      ["vancomycin", HAITI_INFUSION_CATALOG.vancomycin],
    ] as const)("%s", (_id, catalog) => {
      expect(classifyInfusion({ orderRoute: "IVP", catalog })).toBe(true);
    });
  });

  describe("IVPB + PUSH catalog => infusion lifecycle (7B invariant)", () => {
    it("vancomycin IVPB overrides PUSH catalog", () => {
      expect(
        isMedicationInfusionCandidate({
          route: "IVPB",
          medicationLabel: "Vancomycin 1 g",
          code: "VANCOMYCIN",
          genericName: "Vancomycin",
          catalogAdministrationType: "PUSH",
        })
      ).toBe(true);
    });

    it("KCl IVPB overrides PUSH catalog", () => {
      expect(
        isMedicationInfusionCandidate({
          route: "IVPB",
          medicationLabel: "Potassium Chloride 20 mEq",
          code: "POTASSIUM_CHLORIDE",
          genericName: "Potassium Chloride",
          catalogAdministrationType: "PUSH",
        })
      ).toBe(true);
    });
  });

  describe("IVP + PUSH catalog => direct MAR (legacy protected)", () => {
    it("ceftriaxone IVP + PUSH catalog is not infusion", () => {
      expect(
        classifyInfusion({
          orderRoute: "IVP",
          catalog: LEGACY_IVP_PUSH_CATALOG.ceftriaxone,
        })
      ).toBe(false);
    });
  });

  describe("governance preservation", () => {
    it("heparin IVP bolus + PUSH catalog => direct MAR", () => {
      expect(
        isMedicationInfusionCandidate({
          route: "IVP",
          medicationLabel: "Heparin 5000 units/mL",
          code: "HEPARIN",
          genericName: "Heparin",
          catalogAdministrationType: "PUSH",
        })
      ).toBe(false);
    });

    it("insulin SQ => direct MAR", () => {
      expect(
        isMedicationInfusionCandidate({
          route: "SQ",
          medicationLabel: "Regular Insulin",
          code: "REGULAR_INSULIN",
          genericName: "Regular Insulin",
          catalogAdministrationType: "SQ",
        })
      ).toBe(false);
    });

    it("blood product INFUSION catalog => infusion lifecycle", () => {
      expect(
        isMedicationInfusionCandidate({
          route: null,
          medicationLabel: "Packed Red Blood Cells",
          code: "PRBC_TRANSFUSION",
          genericName: "Packed Red Blood Cells",
          catalogAdministrationType: "INFUSION",
        })
      ).toBe(true);
    });
  });
});
