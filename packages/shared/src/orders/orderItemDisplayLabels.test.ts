import { describe, expect, it } from "vitest";
import {
  buildOrderItemDisplayLabelEn,
  buildOrderItemDisplayLabelFr,
  isInvalidTechnicalOrderDisplayLabel,
  pickStrictEnCatalogPrimaryLabel,
} from "./orderItemDisplayLabels";

describe("orderItemDisplayLabels (Phase G — English-primary)", () => {
  const itLab = { catalogItemType: "LAB_TEST" as const, manualLabel: null, manualSecondaryText: null, strength: null };

  it("CARE with enterpriseProcedureId prefers catalog display over manualLabel snapshot", () => {
    const label = buildOrderItemDisplayLabelEn(
      {
        catalogItemType: "CARE",
        manualLabel: "Legacy manual",
        enterpriseProcedureId: "central_line_placement",
      },
      null,
      null,
      null
    );
    expect(label).toBe("Central line placement");
  });

  it("CARE without enterpriseProcedureId falls back to manualLabel", () => {
    const label = buildOrderItemDisplayLabelFr({
      catalogItemType: "CARE",
      manualLabel: "Tâche infirmière personnalisée",
    });
    expect(label).toBe("Tâche infirmière personnalisée");
  });

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

  it("EN lab label uses ALL_CAPS_SNAKE catalog code when displayNameEn empty (e.g. CMP)", () => {
    const s = buildOrderItemDisplayLabelEn(
      itLab,
      {
        code: "CMP",
        displayNameEn: null,
        displayNameFr: "Bilan métabolique complet",
        name: "Bilan métabolique complet",
      },
      null,
      null
    );
    expect(s).toBe("CMP");
    expect(s).not.toContain("Bilan");
    expect(s).not.toContain("label unavailable");
  });

  it("EN lab label uses displayNameEn when set to CMP", () => {
    const s = buildOrderItemDisplayLabelEn(
      itLab,
      {
        code: "CMP_ALT",
        displayNameEn: "CMP",
        displayNameFr: "Autre",
        name: "Autre",
      },
      null,
      null
    );
    expect(s).toBe("CMP");
  });

  it("EN imaging label uses ALL_CAPS_SNAKE catalog code when displayNameEn empty", () => {
    const s = buildOrderItemDisplayLabelEn(
      { catalogItemType: "IMAGING_STUDY", manualLabel: null, manualSecondaryText: null, strength: null },
      null,
      {
        code: "CHEST_XRAY",
        displayNameEn: null,
        displayNameFr: "Radiographie thorax",
        name: "Radiographie thorax",
      },
      null
    );
    expect(s).toBe("CHEST_XRAY");
    expect(s).not.toContain("Radiographie");
  });
});
