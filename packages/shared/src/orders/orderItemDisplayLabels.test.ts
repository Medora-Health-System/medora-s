import { describe, expect, it } from "vitest";
import {
  buildOrderItemDisplayLabelEn,
  buildOrderItemDisplayLabelFr,
  isInvalidTechnicalOrderDisplayLabel,
  pickStrictEnCatalogPrimaryLabel,
} from "./orderItemDisplayLabels";

describe("orderItemDisplayLabels (Phase G — English-primary)", () => {
  const itLab = { catalogItemType: "LAB_TEST" as const, manualLabel: null, manualSecondaryText: null, strength: null };

  it("EN lab label prefers displayNameEn over code when both acceptable", () => {
    const s = buildOrderItemDisplayLabelEn(
      itLab,
      { code: "CBC", displayNameEn: "CBC", displayNameFr: "Numération formule sanguine", name: "Numération formule sanguine" },
      null,
      null
    );
    expect(s).toBe("CBC");
  });

  it("EN lab label never surfaces displayNameFr or legacy name when displayNameEn empty", () => {
    const s = buildOrderItemDisplayLabelEn(
      itLab,
      {
        code: "GLU",
        displayNameEn: null,
        displayNameFr: "Glycémie",
        name: "Glycémie",
      },
      null,
      null
    );
    expect(s).not.toContain("Glyc");
    expect(s).toBe("GLU");
  });

  it("EN medication label uses displayNameEn only (not French displayNameFr)", () => {
    const s = buildOrderItemDisplayLabelEn(
      { catalogItemType: "MEDICATION", manualLabel: null, manualSecondaryText: null, strength: null },
      null,
      null,
      {
        code: "ACETAMINOPHEN_500",
        displayNameEn: "Acetaminophen",
        displayNameFr: "Paracétamol",
        name: "Paracétamol",
        strength: "500 mg",
      }
    );
    expect(s).toContain("Acetaminophen");
    expect(s).not.toContain("Paracétamol");
  });

  it("FR lab label still prefers displayNameFr", () => {
    const s = buildOrderItemDisplayLabelFr(
      itLab,
      { code: "CBC", displayNameEn: "CBC", displayNameFr: "Numération formule sanguine (NFS)", name: "Numération formule sanguine (NFS)" },
      null,
      null
    );
    expect(s).toContain("Numération");
  });

  it("rejects technical type tokens as display strings", () => {
    expect(isInvalidTechnicalOrderDisplayLabel("LAB_TEST", "LAB_TEST")).toBe(true);
    expect(isInvalidTechnicalOrderDisplayLabel("MEDICATION", "MEDICATION")).toBe(true);
    expect(pickStrictEnCatalogPrimaryLabel("LAB_TEST", null, "LAB_TEST")).toBeNull();
  });

  it("pickStrictEnCatalogPrimaryLabel prefers displayNameEn over code when EN is set", () => {
    expect(pickStrictEnCatalogPrimaryLabel("LAB_TEST", "Glucose", "GLU")).toBe("Glucose");
  });
});
