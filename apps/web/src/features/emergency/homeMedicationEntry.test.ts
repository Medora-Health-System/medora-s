import { describe, expect, it } from "vitest";
import type { CatalogSearchItem } from "@/lib/catalogSearchTypes";
import {
  formatHomeMedicationSummaryLine,
  formatHomeMedicationSearchSubtitle,
  homeMedicationEntryFormFromCatalog,
} from "./homeMedicationEntry";

const t = (key: string) => {
  const map: Record<string, string> = {
    "erTriage.homeMed.searchDetailsUnavailable": "Details not available",
    "erTriage.homeMed.summaryNotConfirmed": "dose/frequency not confirmed",
    "erTriage.homeMed.lastTakenPrefix": "last taken",
    "erTriage.homeMed.lastTaken.today": "today",
    "erTriage.homeMed.sourceCatalog": "Facility catalog",
  };
  return map[key] ?? key;
};

function medItem(overrides: Partial<CatalogSearchItem> = {}): CatalogSearchItem {
  return {
    id: "med-1",
    code: "AML10",
    type: "MEDICATION",
    displayNameFr: "Amlodipine",
    displayNameEn: "Amlodipine",
    secondaryText: "10 mg tablet · oral",
    metadata: {
      strength: "10 mg",
      dosageForm: "tablet",
      route: "oral",
    },
    ...overrides,
  };
}

describe("formatHomeMedicationSummaryLine (19T.1 simplified)", () => {
  it("creates short summary with dose, route, frequency, last taken", () => {
    const form = homeMedicationEntryFormFromCatalog(medItem(), "en", t);
    const line = formatHomeMedicationSummaryLine(
      {
        ...form,
        doseValue: "10",
        doseUnit: "mg",
        frequency: "daily",
        lastTaken: "today",
      },
      t,
      "en"
    );
    expect(line).toBe("Amlodipine 10 mg tablet oral daily; last taken today");
  });

  it("allows save without dose/frequency", () => {
    const line = formatHomeMedicationSummaryLine(
      homeMedicationEntryFormFromCatalog(medItem({ metadata: {} }), "en", t),
      t,
      "en"
    );
    expect(line).toBe("Amlodipine — dose/frequency not confirmed");
  });
});

describe("formatHomeMedicationSearchSubtitle English boundary", () => {
  it("normalizes French catalog metadata for English UI", () => {
    const subtitle = formatHomeMedicationSearchSubtitle(
      medItem({
        metadata: {
          strength: "10 mg",
          dosageForm: "comprimé",
          route: "orale",
          therapeuticClass: "Antidiabétique",
        },
      }),
      "en",
      t
    );
    expect(subtitle.toLowerCase()).not.toContain("comprimé");
    expect(subtitle.toLowerCase()).not.toContain("orale");
    expect(subtitle).toContain("tablet");
    expect(subtitle).toContain("oral");
  });
});
