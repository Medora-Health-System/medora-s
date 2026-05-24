import { describe, expect, it } from "vitest";
import type { CatalogSearchItem } from "@/lib/catalogSearchTypes";
import type { CreateOrderLineItem } from "@/components/orders/createOrderModal/types";
import {
  englishMedicationDisplayContainsFrench,
  normalizeMedicationDisplayForLocale,
} from "@/lib/localizedMedicationDisplay";
import {
  formatHomeMedicationSearchSubtitle,
  formatHomeMedicationSummaryLine,
  homeMedicationEntryFormFromCatalog,
} from "@/features/emergency/homeMedicationEntry";

const t = (key: string) => key;

function createOrderMedicationLine(
  overrides?: Partial<CreateOrderLineItem>
): CreateOrderLineItem {
  return {
    _lineId: "line-1",
    catalogItemId: "med-1",
    catalogItemType: "MEDICATION",
    _label: "Metformin",
    _dosageForm: "comprimé",
    _route: "orale",
    _safetyCatalog: {
      code: "MET500",
      therapeuticClass: "Antidiabétique",
    },
    ...overrides,
  };
}

function displayCreateOrderCatalogFields(
  item: CreateOrderLineItem,
  language: "en" | "fr"
): { dosageForm: string; catalogRoute: string; therapeuticClass: string } {
  return {
    dosageForm: normalizeMedicationDisplayForLocale(item._dosageForm, language),
    catalogRoute: normalizeMedicationDisplayForLocale(item._route, language),
    therapeuticClass: normalizeMedicationDisplayForLocale(
      item._safetyCatalog?.therapeuticClass,
      language
    ),
  };
}

describe("medication locale cleanup (19U.3)", () => {
  it("CreateOrderModal selected item display normalizes French catalog form/route/class in English", () => {
    const displayed = displayCreateOrderCatalogFields(createOrderMedicationLine(), "en");
    expect(displayed.dosageForm).toBe("tablet");
    expect(displayed.catalogRoute).toBe("oral");
    expect(displayed.therapeuticClass).toBe("Antidiabetic");
    expect(englishMedicationDisplayContainsFrench(displayed.dosageForm)).toBe(false);
    expect(englishMedicationDisplayContainsFrench(displayed.catalogRoute)).toBe(false);
    expect(englishMedicationDisplayContainsFrench(displayed.therapeuticClass)).toBe(false);
  });

  it("CreateOrderModal selected item display preserves French catalog metadata in French UI", () => {
    const displayed = displayCreateOrderCatalogFields(createOrderMedicationLine(), "fr");
    expect(displayed.dosageForm).toBe("comprimé");
    expect(displayed.catalogRoute).toBe("orale");
    expect(displayed.therapeuticClass).toBe("Antidiabétique");
  });

  it("MAR route hint display path normalizes French catalog route for English UI", () => {
    const routeHint = "intraveineuse";
    const displayed = normalizeMedicationDisplayForLocale(routeHint, "en");
    expect(displayed).toBe("intravenous");
    expect(englishMedicationDisplayContainsFrench(displayed)).toBe(false);
  });

  it("home-med catalog pick regression: English subtitle has no raw French metadata", () => {
    const item: CatalogSearchItem = {
      id: "med-fr",
      code: "AML10",
      type: "MEDICATION",
      displayNameEn: "Amlodipine",
      displayNameFr: "Amlodipine",
      metadata: {
        strength: "10 mg",
        dosageForm: "comprimé",
        route: "orale",
        therapeuticClass: "Antidiabétique",
      },
    };
    const subtitle = formatHomeMedicationSearchSubtitle(item, "en", t);
    expect(subtitle.toLowerCase()).not.toContain("comprimé");
    expect(subtitle.toLowerCase()).not.toContain("orale");
    expect(subtitle).toContain("tablet");
    expect(subtitle).toContain("oral");
  });

  it("home-med form snapshot regression: English summary normalizes French catalog fields", () => {
    const form = homeMedicationEntryFormFromCatalog(
      {
        id: "med-fr",
        code: "MET500",
        type: "MEDICATION",
        displayNameEn: "Metformin",
        displayNameFr: "Metformine",
        metadata: {
          strength: "500 mg",
          dosageForm: "comprimé",
          route: "orale",
          therapeuticClass: "Antidiabétique",
        },
      },
      "en",
      t
    );
    expect(form.dosageForm).toBe("tablet");
    expect(form.route).toBe("oral");
    expect(form.therapeuticClass).toBe("Antidiabetic");

    const summary = formatHomeMedicationSummaryLine(
      { ...form, frequency: "daily" },
      (key) => (key === "erTriage.homeMed.summaryNotConfirmed" ? "dose not confirmed" : key),
      "en"
    );
    expect(englishMedicationDisplayContainsFrench(summary)).toBe(false);
    expect(summary).toContain("tablet");
    expect(summary).toContain("oral");
  });
});
