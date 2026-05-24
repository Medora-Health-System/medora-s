import { describe, expect, it } from "vitest";
import type { CatalogSearchItem } from "@/lib/catalogSearchTypes";
import {
  englishMedicationDisplayContainsFrench,
  formatHomeMedicationSummaryForLocale,
  formatMedicationOptionForLocale,
  normalizeMedicationDisplayForLocale,
} from "@/lib/localizedMedicationDisplay";
import type { HomeMedicationEntryForm } from "@/features/emergency/homeMedicationEntry";
import {
  appendDrugAllergyLinesIfAbsent,
  formatDrugAllergyLine,
  selectedDrugAllergyFromCatalog,
  stripNkdaFromAllergyText,
} from "@/features/emergency/drugAllergyEntry";

const t = (key: string) => {
  const map: Record<string, string> = {
    "erTriage.homeMed.summaryNotConfirmed": "dose/frequency not confirmed",
    "erTriage.homeMed.lastTakenPrefix": "last taken",
    "erTriage.homeMed.lastTaken.today": "today",
    "erTriage.drugAllergy.lineTemplate": "Drug allergy: {drug} — reaction: {reactions}.",
    "erTriage.drugAllergy.reactions.rash": "rash",
    "erTriage.drugAllergy.reactions.hives": "hives",
    "erTriage.v1.chipsAllergyNkda": "NKDA",
  };
  return map[key] ?? key;
};

function frenchCatalogItem(): CatalogSearchItem {
  return {
    id: "med-fr-1",
    code: "MET500",
    type: "MEDICATION",
    displayNameEn: "Metformin",
    displayNameFr: "Metformine",
    metadata: {
      strength: "500 mg",
      dosageForm: "comprimé",
      route: "orale",
      therapeuticClass: "Antidiabétique",
      genericName: "metformin",
    },
  };
}

describe("normalizeMedicationDisplayForLocale", () => {
  it("normalizes French route/form labels to English in EN locale", () => {
    expect(normalizeMedicationDisplayForLocale("comprimé", "en")).toBe("tablet");
    expect(normalizeMedicationDisplayForLocale("orale", "en")).toBe("oral");
    expect(normalizeMedicationDisplayForLocale("intraveineuse", "en")).toBe("intravenous");
    expect(normalizeMedicationDisplayForLocale("Antidiabétique", "en")).toBe("Antidiabetic");
  });

  it("preserves French labels in FR locale", () => {
    expect(normalizeMedicationDisplayForLocale("comprimé", "fr")).toBe("comprimé");
  });
});

describe("formatMedicationOptionForLocale", () => {
  it("English catalog search result has no French words in subtitle", () => {
    const { subtitle } = formatMedicationOptionForLocale(frenchCatalogItem(), "en", t);
    expect(englishMedicationDisplayContainsFrench(subtitle)).toBe(false);
    expect(subtitle).toContain("tablet");
    expect(subtitle).toContain("oral");
    expect(subtitle).toContain("Antidiabetic");
  });
});

describe("formatHomeMedicationSummaryForLocale", () => {
  it("English summary uses tablet/oral and no French words", () => {
    const entry: HomeMedicationEntryForm = {
      catalogId: "x",
      medicationName: "Metformin",
      status: "active",
      doseValue: "500",
      doseUnit: "mg",
      route: "orale",
      frequency: "daily",
      indication: "",
      startDate: "",
      lastTaken: "today",
      compliance: "",
      dosageForm: "comprimé",
      strength: "500 mg",
      quantity: "",
      refillsRemaining: "",
      duration: "",
      endDate: "",
      lastFillDate: "",
      therapeuticClass: "",
      source: "",
      patientInstructions: "",
      notes: "",
      catalogDetailsAvailable: true,
    };
    const line = formatHomeMedicationSummaryForLocale(entry, "en", t);
    expect(line).toContain("500 mg tablet oral daily");
    expect(line).toContain("last taken today");
    expect(englishMedicationDisplayContainsFrench(line)).toBe(false);
  });
});

describe("drugAllergyEntry", () => {
  it("formats structured drug allergy line with generic when distinct", () => {
    const item: CatalogSearchItem = {
      id: "med-jard",
      code: "JARD10",
      type: "MEDICATION",
      displayNameEn: "Jardiance",
      displayNameFr: "Jardiance",
      metadata: { genericName: "empagliflozin" },
    };
    const allergy = selectedDrugAllergyFromCatalog(item, "en", t);
    const line = formatDrugAllergyLine(allergy, ["rash", "hives"], t);
    expect(line).toBe("Drug allergy: Jardiance (empagliflozin) — reaction: rash, hives.");
  });

  it("removes NKDA when saving drug allergies", () => {
    const cleaned = stripNkdaFromAllergyText("NKDA, Food allergy", "NKDA");
    expect(cleaned).toBe("Food allergy");
  });

  it("appends allergy lines without duplicating", () => {
    const next = appendDrugAllergyLinesIfAbsent(
      "Drug allergy: Penicillin — reaction: rash.",
      ["Drug allergy: Ibuprofen — reaction: hives."]
    );
    expect(next).toContain("Penicillin");
    expect(next).toContain("Ibuprofen");
  });
});
