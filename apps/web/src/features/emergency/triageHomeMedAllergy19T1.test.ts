import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("HomeMedicationEntryModal visible fields (19T.1)", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/features/emergency/HomeMedicationEntryModal.tsx"),
    "utf8"
  );

  it("does not render removed advanced fields in visible form", () => {
    for (const removed of [
      "field.indication",
      "field.therapeuticClass",
      "field.quantity",
      "field.refillsRemaining",
      "field.duration",
      "field.endDate",
      "field.lastFillDate",
      "field.source",
      "field.patientInstructions",
      "field.notes",
      "chipsCompliance",
    ]) {
      expect(source.includes(removed)).toBe(false);
    }
  });

  it("keeps core home medication fields", () => {
    for (const kept of [
      "field.medicationName",
      "field.status",
      "field.strength",
      "field.doseValue",
      "field.route",
      "field.frequency",
      "field.startDate",
      "field.lastTaken",
      "chipsDose",
      "chipsFrequency",
      "chipsLastTaken",
    ]) {
      expect(source.includes(kept)).toBe(true);
    }
  });
});

describe("DrugAllergySearchPanel workflow markers", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/features/emergency/DrugAllergySearchPanel.tsx"),
    "utf8"
  );

  it("renders drug allergy search input", () => {
    expect(source).toContain("drugAllergy.searchLabel");
    expect(source).toContain('type="search"');
  });

  it("supports multi-select and remove before save", () => {
    expect(source).toContain("removeSelection");
    expect(source).toContain("selected.map");
    expect(source).toContain("drugAllergy.saveSelected");
  });
});

describe("EmergencyTriageV1Sections allergy chips", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/features/emergency/EmergencyTriageV1Sections.tsx"),
    "utf8"
  );

  it("hides common drug allergy quick chips", () => {
    expect(source.includes("allergyQuickPenicillin")).toBe(false);
    expect(source.includes("DrugAllergySearchPanel")).toBe(true);
  });
});
