import { describe, expect, it } from "vitest";
import {
  buildMedicationOrderLabelSnapshot,
  buildOrderItemDisplayLabelEn,
  buildOrderItemDisplayLabelFr,
  isInvalidTechnicalOrderDisplayLabel,
  medicationInnFromCatalogCode,
  pickStrictEnCatalogPrimaryLabel,
  resolveMedicationCatalogPrimaryLabel,
  isOrderDisplayLabelUnavailable,
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

  it("EN Hydromorphone uses genericName when displayNameEn is empty", () => {
    const catalog = {
      code: "HYDROMORPHONE_2MG_ML_INJECTABLE",
      displayNameEn: null,
      displayNameFr: "Hydromorphone",
      name: "Hydromorphone",
      genericName: "Hydromorphone",
      strength: "2 mg/mL",
    };
    const en = buildOrderItemDisplayLabelEn(
      { catalogItemType: "MEDICATION", manualLabel: null, manualSecondaryText: null, strength: null },
      null,
      null,
      catalog
    );
    expect(en).toContain("Hydromorphone");
    expect(en).not.toContain("label unavailable");
    expect(en).not.toContain("HYDROMORPHONE_2MG");
    const fr = buildOrderItemDisplayLabelFr(
      { catalogItemType: "MEDICATION", manualLabel: null, manualSecondaryText: null, strength: null },
      null,
      null,
      catalog
    );
    expect(fr).toContain("Hydromorphone");
  });

  it("EN Hydromorphone derives INN from catalog code when only code is populated", () => {
    expect(medicationInnFromCatalogCode("HYDROMORPHONE_2MG_ML_INJECTABLE")).toBe("Hydromorphone");
    expect(
      resolveMedicationCatalogPrimaryLabel("en", {
        code: "HYDROMORPHONE_2MG_ML_INJECTABLE",
        displayNameEn: null,
        genericName: null,
      })
    ).toBe("Hydromorphone");
  });

  it("MAR snapshot never returns strength-only label (M1.7A.6)", () => {
    const snap = buildMedicationOrderLabelSnapshot(
      { catalogItemType: "MEDICATION", manualLabel: null, manualSecondaryText: null, strength: "2 mg/mL" },
      {
        code: "HYDROMORPHONE_2MG_ML_INJECTABLE",
        displayNameEn: "2 mg/mL",
        genericName: null,
        strength: "2 mg/mL",
      }
    );
    expect(snap).toBe("Hydromorphone 2 mg/mL");
    expect(snap).not.toMatch(/^2 mg\/mL$/);
  });

  it("MAR snapshot uses Hydromorphone not label unavailable", () => {
    const snap = buildMedicationOrderLabelSnapshot(
      { catalogItemType: "MEDICATION", manualLabel: null, manualSecondaryText: null, strength: "2 mg/mL" },
      {
        code: "HYDROMORPHONE_2MG_ML_INJECTABLE",
        displayNameEn: null,
        genericName: "Hydromorphone",
        strength: "2 mg/mL",
      }
    );
    expect(snap).toBe("Hydromorphone 2 mg/mL");
    expect(snap).not.toContain("label unavailable");
  });

  it("isOrderDisplayLabelUnavailable detects EN/FR sentinel labels", () => {
    expect(isOrderDisplayLabelUnavailable("Medication (label unavailable)")).toBe(true);
    expect(isOrderDisplayLabelUnavailable("Médicament (libellé indisponible)")).toBe(true);
    expect(isOrderDisplayLabelUnavailable("Hydromorphone 2 mg/mL")).toBe(false);
  });

  it("fallback only when all medication identity sources are absent", () => {
    const en = buildOrderItemDisplayLabelEn(
      { catalogItemType: "MEDICATION", manualLabel: null, manualSecondaryText: null, strength: null },
      null,
      null,
      null
    );
    expect(en).toBe("Medication (label unavailable)");
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
