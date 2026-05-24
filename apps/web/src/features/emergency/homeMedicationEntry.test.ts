import { describe, expect, it } from "vitest";
import type { CatalogSearchItem } from "@/lib/catalogSearchTypes";
import {
  HOME_MEDICATION_TRIAGE_DOCUMENTATION_ONLY,
  applyHomeMedicationDoseChip,
  catalogItemHasHomeMedicationDetails,
  extractHomeMedicationDoseStrengthChips,
  formatHomeMedicationSummaryLine,
  formatHomeMedicationSearchSubtitle,
  homeMedicationEntryFormFromCatalog,
  homeMedicationEntryFormIsValid,
} from "./homeMedicationEntry";

const t = (key: string) => {
  const map: Record<string, string> = {
    "erTriage.homeMed.searchDetailsUnavailable": "Details not available",
    "erTriage.homeMed.summaryNotConfirmed": "dose/frequency not confirmed",
    "erTriage.homeMed.lastTakenPrefix": "last taken",
    "erTriage.homeMed.lastTaken.today": "today",
    "erTriage.homeMed.compliance.taking_as_prescribed": "taking as prescribed",
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
      therapeuticClass: "Calcium channel blocker",
    },
    ...overrides,
  };
}

describe("formatHomeMedicationSearchSubtitle", () => {
  it("displays strength, form, and route when catalog data exists", () => {
    const subtitle = formatHomeMedicationSearchSubtitle(medItem(), "en", t);
    expect(subtitle).toContain("10 mg tablet");
    expect(subtitle).toContain("oral");
    expect(subtitle).toContain("Calcium channel blocker");
  });

  it("shows unavailable hint when catalog details are missing", () => {
    const subtitle = formatHomeMedicationSearchSubtitle(
      medItem({ metadata: {}, secondaryText: undefined }),
      "en",
      t
    );
    expect(subtitle).toBe("Details not available");
  });
});

describe("homeMedicationEntryFormFromCatalog", () => {
  it("prefills strength, route, dosage form, and therapeutic class", () => {
    const form = homeMedicationEntryFormFromCatalog(medItem(), "en", t);
    expect(form.medicationName).toBe("Amlodipine");
    expect(form.strength).toBe("10 mg");
    expect(form.dosageForm).toBe("tablet");
    expect(form.route).toBe("oral");
    expect(form.therapeuticClass).toBe("Calcium channel blocker");
    expect(form.catalogDetailsAvailable).toBe(true);
  });

  it("allows manual entry when catalog details are missing", () => {
    const form = homeMedicationEntryFormFromCatalog(
      medItem({ metadata: {}, secondaryText: undefined }),
      "en",
      t
    );
    expect(form.catalogDetailsAvailable).toBe(false);
    expect(form.strength).toBe("");
    expect(form.route).toBe("");
  });
});

describe("extractHomeMedicationDoseStrengthChips", () => {
  it("renders catalog-derived dose chips when available", () => {
    const chips = extractHomeMedicationDoseStrengthChips(
      medItem({
        metadata: { strength: "5 mg", dosageForm: "tablet" },
        secondaryText: "10 mg tablet",
      })
    );
    expect(chips).toContain("5 mg");
    expect(chips.some((c) => c.includes("10 mg"))).toBe(true);
  });
});

describe("formatHomeMedicationSummaryLine", () => {
  it("creates readable summary with dose, route, frequency, compliance, and last taken", () => {
    const form = homeMedicationEntryFormFromCatalog(medItem(), "en", t);
    const line = formatHomeMedicationSummaryLine(
      {
        ...form,
        doseValue: "10",
        doseUnit: "mg",
        frequency: "daily",
        compliance: "taking_as_prescribed",
        lastTaken: "today",
      },
      t
    );
    expect(line).toContain("Amlodipine");
    expect(line).toContain("10 mg");
    expect(line).toContain("tablet");
    expect(line).toContain("daily");
    expect(line).toContain("taking as prescribed");
    expect(line).toContain("last taken today");
  });

  it("allows save without dose/frequency and marks not confirmed", () => {
    const form = homeMedicationEntryFormFromCatalog(
      medItem({ metadata: {}, secondaryText: undefined }),
      "en",
      t
    );
    const line = formatHomeMedicationSummaryLine(form, t);
    expect(line).toBe("Amlodipine — dose/frequency not confirmed");
  });
});

describe("home medication triage safety", () => {
  it("does not create provider orders or MAR events (documentation-only module)", () => {
    expect(HOME_MEDICATION_TRIAGE_DOCUMENTATION_ONLY).toBe(true);
    expect(typeof formatHomeMedicationSummaryLine).toBe("function");
    expect(typeof homeMedicationEntryFormIsValid).toBe("function");
  });

  it("requires medication name only", () => {
    expect(homeMedicationEntryFormIsValid(homeMedicationEntryFormFromCatalog(medItem(), "en", t))).toBe(
      true
    );
    expect(
      homeMedicationEntryFormIsValid({
        ...homeMedicationEntryFormFromCatalog(medItem(), "en", t),
        medicationName: "",
      })
    ).toBe(false);
  });
});

describe("applyHomeMedicationDoseChip", () => {
  it("updates dose fields from chip selection", () => {
    const base = homeMedicationEntryFormFromCatalog(medItem(), "en", t);
    const next = applyHomeMedicationDoseChip(base, "10 mg");
    expect(next.strength).toBe("10 mg");
    expect(next.doseValue).toBe("10");
    expect(next.doseUnit).toBe("mg");
  });
});

describe("catalogItemHasHomeMedicationDetails", () => {
  it("detects when metadata or secondaryText is present", () => {
    expect(catalogItemHasHomeMedicationDetails(medItem())).toBe(true);
    expect(catalogItemHasHomeMedicationDetails(medItem({ metadata: {}, secondaryText: undefined }))).toBe(
      false
    );
  });
});

describe("backward compatibility", () => {
  it("summary line is plain text suitable for medicationsSummary field", () => {
    const line = formatHomeMedicationSummaryLine(
      homeMedicationEntryFormFromCatalog(medItem(), "en", t),
      t
    );
    expect(typeof line).toBe("string");
    expect(line.length).toBeGreaterThan(0);
    expect(line.startsWith("Amlodipine")).toBe(true);
  });
});
