import { describe, expect, it } from "vitest";
import { resolveMarAdministrationHistoryLabel } from "./marAdministrationHistoryLabel";
import { i18nMessage } from "@/lib/i18nMessagesLookup";

const tEn = (key: string) => i18nMessage("en", key);
const tFr = (key: string) => i18nMessage("fr", key);

const hydroOrderItem = {
  catalogItemType: "MEDICATION" as const,
  displayLabelEn: "Hydromorphone 2 mg/mL",
  displayLabelFr: "Hydromorphone 2 mg/mL",
  catalogMedication: {
    code: "HYDROMORPHONE_2MG_ML_INJECTABLE",
    displayNameEn: null,
    displayNameFr: "Hydromorphone",
    genericName: "Hydromorphone",
    strength: "2 mg/mL",
  },
};

const lisinoprilOrderItem = {
  catalogItemType: "MEDICATION" as const,
  catalogMedication: {
    code: "LISINOPRIL_10MG_TABLET",
    displayNameEn: "Lisinopril",
    displayNameFr: "Lisinopril",
    genericName: "Lisinopril",
    strength: "10 mg",
  },
};

describe("resolveMarAdministrationHistoryLabel (M1.7B.4)", () => {
  it("Hydromorphone history shows Hydromorphone 2 mg/mL when snapshot missing", () => {
    const label = resolveMarAdministrationHistoryLabel({
      medicationLabelSnapshot: null,
      orderItem: hydroOrderItem,
      language: "en",
      t: tEn,
    });
    expect(label).toBe("Hydromorphone 2 mg/mL");
  });

  it("prefers valid administration snapshot over order item", () => {
    const label = resolveMarAdministrationHistoryLabel({
      medicationLabelSnapshot: "Hydromorphone 2 mg/mL (IV)",
      orderItem: hydroOrderItem,
      language: "en",
      t: tEn,
    });
    expect(label).toBe("Hydromorphone 2 mg/mL (IV)");
  });

  it("Lisinopril history shows Lisinopril 10 mg", () => {
    const label = resolveMarAdministrationHistoryLabel({
      medicationLabelSnapshot: "",
      orderItem: lisinoprilOrderItem,
      language: "en",
      t: tEn,
    });
    expect(label).toBe("Lisinopril 10 mg");
  });

  it("infusion-linked administration resolves medication name from order item", () => {
    const label = resolveMarAdministrationHistoryLabel({
      medicationLabelSnapshot: null,
      orderItem: {
        catalogItemType: "MEDICATION",
        catalogMedication: {
          code: "NORMAL_SALINE_1000ML_BAG",
          genericName: "Normal saline",
          strength: "1000 mL",
        },
      },
      language: "en",
      t: tEn,
    });
    expect(label).toContain("Normal saline");
    expect(label).toContain("1000 mL");
  });

  it("does not treat em dash placeholder as a valid label", () => {
    const label = resolveMarAdministrationHistoryLabel({
      medicationLabelSnapshot: "—",
      orderItem: hydroOrderItem,
      language: "en",
      t: tEn,
    });
    expect(label).toBe("Hydromorphone 2 mg/mL");
  });

  it("shows fallback when no identity is available", () => {
    const label = resolveMarAdministrationHistoryLabel({
      medicationLabelSnapshot: null,
      orderItem: { catalogItemType: "MEDICATION" },
      language: "en",
      t: tEn,
    });
    expect(label).toBe(tEn("patientChartUi.orderDisplayFallback.medication"));
  });

  it("French fallback when no identity is available", () => {
    const label = resolveMarAdministrationHistoryLabel({
      medicationLabelSnapshot: null,
      orderItem: { catalogItemType: "MEDICATION" },
      language: "fr",
      t: tFr,
    });
    expect(label).toBe("Médicament (libellé indisponible)");
  });
});
