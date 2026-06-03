import { describe, expect, it } from "vitest";
import { getOrderItemDisplayLabelForLanguage } from "./orderItemDisplayFr";
import { i18nMessage } from "@/lib/i18nMessagesLookup";

const tEn = (key: string) => i18nMessage("en", key);
const tFr = (key: string) => i18nMessage("fr", key);

describe("order item display — Hydromorphone (M1.7A.4)", () => {
  const hydroItem = {
    catalogItemType: "MEDICATION" as const,
    displayLabelEn: "Hydromorphone 2 mg/mL",
    displayLabelFr: "Hydromorphone 2 mg/mL",
    catalogMedication: {
      code: "HYDROMORPHONE_2MG_ML_INJECTABLE",
      displayNameEn: null,
      displayNameFr: "Hydromorphone",
      genericName: "Hydromorphone",
      strength: "2 mg/mL",
      dosageForm: "injectable",
      route: "injectable",
    },
  };

  it("English UI shows Hydromorphone not label unavailable", () => {
    const label = getOrderItemDisplayLabelForLanguage(hydroItem, "en", tEn);
    expect(label).toContain("Hydromorphone");
    expect(label).not.toContain("label unavailable");
  });

  it("French UI shows Hydromorphone", () => {
    const label = getOrderItemDisplayLabelForLanguage(hydroItem, "fr", tFr);
    expect(label).toContain("Hydromorphone");
    expect(label).not.toContain("libellé indisponible");
  });

  it("recovers from strength-only API displayLabelEn when catalogMedication is present", () => {
    const label = getOrderItemDisplayLabelForLanguage(
      {
        ...hydroItem,
        displayLabelEn: "2 mg/mL",
        displayLabelFr: "2 mg/mL",
      },
      "en",
      tEn
    );
    expect(label).toBe("Hydromorphone 2 mg/mL");
    expect(label).not.toMatch(/^2 mg\/mL$/);
  });

  it("recovers from poisoned API displayLabelEn when catalogMedication is present", () => {
    const label = getOrderItemDisplayLabelForLanguage(
      {
        ...hydroItem,
        displayLabelEn: "Medication (label unavailable)",
        displayLabelFr: "Médicament (libellé indisponible)",
      },
      "en",
      tEn
    );
    expect(label).toContain("Hydromorphone");
    expect(label).not.toContain("label unavailable");
  });
});
