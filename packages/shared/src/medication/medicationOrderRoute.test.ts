import { describe, expect, it } from "vitest";
import { medicationRouteSchema } from "../schemas/patient.js";
import {
  compactMedicationRoute,
  isStructuredMedicationOrderRouteIvpb,
  MEDICATION_ORDER_ROUTES,
  normalizeMedicationRoute,
} from "./medicationOrderRoute.js";

describe("medicationOrderRoute (M1.8B.3)", () => {
  it("exposes SQ in canonical order routes", () => {
    expect(MEDICATION_ORDER_ROUTES).toContain("SQ");
    expect(MEDICATION_ORDER_ROUTES).toEqual(["PO", "IM", "IVP", "IVPB", "SQ"]);
  });

  it("isStructuredMedicationOrderRouteIvpb detects canonical IVPB only", () => {
    expect(isStructuredMedicationOrderRouteIvpb("IVPB")).toBe(true);
    expect(isStructuredMedicationOrderRouteIvpb("IVP")).toBe(false);
  });

  describe("normalizeMedicationRoute", () => {
    it.each([
      ["SC", "SQ"],
      ["sc", "SQ"],
      ["SQ", "SQ"],
      ["Subcutaneous", "SQ"],
      ["subcutaneous", "SQ"],
      ["sous-cutanée", "SQ"],
      ["sous cutanée", "SQ"],
      ["sous-cutanee", "SQ"],
    ] as const)("maps %s → %s", (input, expected) => {
      expect(normalizeMedicationRoute(input)).toBe(expected);
    });

    it("preserves existing route mappings", () => {
      expect(normalizeMedicationRoute("PO")).toBe("PO");
      expect(normalizeMedicationRoute("orale")).toBe("PO");
      expect(normalizeMedicationRoute("IM")).toBe("IM");
      expect(normalizeMedicationRoute("intramusculaire")).toBe("IM");
      expect(normalizeMedicationRoute("IVP")).toBe("IVP");
      expect(normalizeMedicationRoute("IV push")).toBe("IVP");
      expect(normalizeMedicationRoute("IVPB")).toBe("IVPB");
      expect(normalizeMedicationRoute("IV piggyback")).toBe("IVPB");
    });

    it("maps injectable + SQ administrationType to SQ (heparin prophylaxis)", () => {
      expect(
        normalizeMedicationRoute({ route: "injectable", administrationType: "SQ" })
      ).toBe("SQ");
    });

    it("maps injectable + INFUSION administrationType to IVPB", () => {
      expect(
        normalizeMedicationRoute({ route: "injectable", administrationType: "INFUSION" })
      ).toBe("IVPB");
    });

    it("maps intraveineuse + INFUSION administrationType to IVPB (M1.8B.7C.1)", () => {
      expect(
        normalizeMedicationRoute({ route: "intraveineuse", administrationType: "INFUSION" })
      ).toBe("IVPB");
      expect(
        normalizeMedicationRoute({ route: "intravenous", administrationType: "INFUSION" })
      ).toBe("IVPB");
      expect(normalizeMedicationRoute({ route: "IV", administrationType: "INFUSION" })).toBe(
        "IVPB"
      );
    });

    it("does not map intraveineuse without INFUSION to structured route", () => {
      expect(normalizeMedicationRoute("intraveineuse")).toBeUndefined();
      expect(
        normalizeMedicationRoute({ route: "intraveineuse", administrationType: "PUSH" })
      ).toBeUndefined();
    });

    it("returns undefined for unsupported routes", () => {
      expect(normalizeMedicationRoute("INH")).toBeUndefined();
      expect(normalizeMedicationRoute("")).toBeUndefined();
      expect(normalizeMedicationRoute(null)).toBeUndefined();
      expect(normalizeMedicationRoute({ route: "injectable", administrationType: "PUSH" })).toBe(
        "IVP"
      );
    });
  });

  describe("medicationRouteSchema", () => {
    it("accepts SQ", () => {
      expect(medicationRouteSchema.safeParse("SQ").success).toBe(true);
    });

    it("rejects SC (must normalize before persist)", () => {
      expect(medicationRouteSchema.safeParse("SC").success).toBe(false);
    });

    it("accepts legacy routes unchanged", () => {
      for (const route of ["PO", "IM", "IVP", "IVPB"] as const) {
        expect(medicationRouteSchema.safeParse(route).success).toBe(true);
      }
    });
  });

  describe("compactMedicationRoute", () => {
    it("displays SQ for subcutaneous catalog routes", () => {
      expect(compactMedicationRoute("sous-cutanée")).toBe("SQ");
      expect(compactMedicationRoute("subcutaneous")).toBe("SQ");
      expect(compactMedicationRoute("SC")).toBe("SQ");
    });

    it("displays SQ for injectable + SQ administrationType (heparin prophylaxis)", () => {
      expect(
        compactMedicationRoute({ route: "injectable", administrationType: "SQ" })
      ).toBe("SQ");
    });

    it("displays IV for injectable + PUSH administrationType", () => {
      expect(
        compactMedicationRoute({ route: "injectable", administrationType: "PUSH" })
      ).toBe("IV");
    });

    it("does not change IV / IVP display paths", () => {
      expect(compactMedicationRoute("intraveineuse")).toBe("IV");
      expect(compactMedicationRoute("IV")).toBe("IV");
    });

    it("auto-maps formulary SQ medications", () => {
      const sqCatalogRoutes = [
        { route: "sous-cutanée", label: "Regular insulin" },
        { route: "sous-cutanée", label: "Insulin lispro" },
        { route: "sous-cutanée", label: "Insulin aspart" },
        { route: "sous-cutanée", label: "Insulin glargine" },
        { route: "sous-cutanée", label: "NPH insulin" },
        { route: "injectable", administrationType: "SQ", label: "Heparin SQ" },
        { route: "sous-cutanée", label: "Enoxaparin" },
      ] as const;

      for (const entry of sqCatalogRoutes) {
        const compact =
          "administrationType" in entry
            ? compactMedicationRoute({
                route: entry.route,
                administrationType: entry.administrationType,
              })
            : compactMedicationRoute(entry.route);
        expect(compact, entry.label).toBe("SQ");
        const normalized =
          "administrationType" in entry
            ? normalizeMedicationRoute({
                route: entry.route,
                administrationType: entry.administrationType,
              })
            : normalizeMedicationRoute(entry.route);
        expect(normalized, entry.label).toBe("SQ");
      }
    });
  });
});
