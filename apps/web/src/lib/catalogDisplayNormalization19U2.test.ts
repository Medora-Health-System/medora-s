import { describe, expect, it } from "vitest";
import type { CatalogSearchItem } from "@/lib/catalogSearchTypes";
import { catalogSearchItemFullDisplayLine } from "@/lib/catalogDisplayLabel";
import { getOrderItemDisplayLabelForLanguage } from "@/lib/orderItemDisplayFr";
import {
  englishMedicationDisplayContainsFrench,
  formatCatalogMedicationSubtitleForLocale,
} from "@/lib/localizedMedicationDisplay";
import { i18nMessage } from "@/lib/i18nMessagesLookup";

function frenchCatalogItem(overrides?: Partial<CatalogSearchItem>): CatalogSearchItem {
  return {
    id: "med-fr-1",
    code: "MET500",
    type: "MEDICATION",
    displayNameEn: "Metformin",
    displayNameFr: "Metformine",
    secondaryText: "500 mg · comprimé",
    metadata: {
      strength: "500 mg",
      dosageForm: "comprimé",
      route: "orale",
      therapeuticClass: "Antidiabétique",
    },
    ...overrides,
  };
}

const t = (key: string) => i18nMessage("en", key);

describe("catalog display normalization (19U.2)", () => {
  it("English catalog subtitle does not show comprimé/orale/intraveineuse", () => {
    const subtitle = formatCatalogMedicationSubtitleForLocale(frenchCatalogItem(), "en");
    expect(subtitle.toLowerCase()).not.toContain("comprimé");
    expect(subtitle.toLowerCase()).not.toContain("orale");
    expect(subtitle.toLowerCase()).not.toContain("intraveineuse");
    expect(subtitle).toContain("tablet");
    expect(subtitle).toContain("oral");
    expect(englishMedicationDisplayContainsFrench(subtitle)).toBe(false);
  });

  it("French catalog subtitle preserves French metadata labels", () => {
    const subtitle = formatCatalogMedicationSubtitleForLocale(frenchCatalogItem(), "fr");
    expect(subtitle).toContain("comprimé");
    expect(subtitle).toContain("orale");
    expect(subtitle).toContain("Antidiabétique");
  });

  it("English catalogSearchItemFullDisplayLine normalizes medication secondary line", () => {
    const line = catalogSearchItemFullDisplayLine(frenchCatalogItem(), "en", t);
    expect(line).toContain("Metformin");
    expect(englishMedicationDisplayContainsFrench(line)).toBe(false);
    expect(line).toContain("tablet");
  });

  it("English order medication line normalizes French catalog metadata", () => {
    const label = getOrderItemDisplayLabelForLanguage(
      {
        catalogItemType: "MEDICATION",
        catalogMedication: {
          displayNameEn: "Metformin",
          code: "MET500",
          strength: "500 mg",
          dosageForm: "comprimé",
          route: "orale",
        },
      },
      "en",
      t
    );
    expect(label).toContain("Metformin");
    expect(label).toContain("tablet");
    expect(label).toContain("oral");
    expect(englishMedicationDisplayContainsFrench(label)).toBe(false);
  });

  it("does not modify manual order labels (clinical free text path)", () => {
    const manualLabel = getOrderItemDisplayLabelForLanguage(
      {
        catalogItemType: "MEDICATION",
        manualLabel: "Custom home med comprimé orale",
        manualSecondaryText: "as directed by patient",
      },
      "en",
      t
    );
    expect(manualLabel).toBe("Custom home med comprimé orale — as directed by patient");
  });

  it("normalizes secondaryText-only medication rows when metadata is absent", () => {
    const item = frenchCatalogItem({
      metadata: undefined,
      secondaryText: "10 mg · comprimé · orale",
    });
    const subtitle = formatCatalogMedicationSubtitleForLocale(item, "en");
    expect(subtitle).toContain("tablet");
    expect(subtitle).toContain("oral");
    expect(englishMedicationDisplayContainsFrench(subtitle)).toBe(false);
  });
});
