import { describe, expect, it } from "vitest";
import {
  activeAllergiesSummary,
  allergyMedicationIngredientName,
  allergySectionAuditSnapshot,
  sanitizeEnterpriseAllergiesSection,
  syncLegacyAllergyTextFields,
} from "./enterpriseAllergyRecord.js";

describe("enterpriseAllergyRecord D4A.3.3A", () => {
  it("normalizes medication allergies to ingredient-only names", () => {
    expect(allergyMedicationIngredientName("Codeine 10 mg/5 mL, oral")).toBe("Codeine");
    expect(allergyMedicationIngredientName("Alergia a medicamento: Codeine 30 mg, comprimido oral")).toBe("Codeine");
    expect(allergyMedicationIngredientName("Allergie médicamenteuse : Acetaminophen/Codeine 300 mg / 15 mg")).toBe(
      "Acetaminophen/Codeine"
    );
    const section = sanitizeEnterpriseAllergiesSection({
      entries: [{ id: "dose", substance: "Codeine 10 mg/5 mL, oral", status: "ACTIVE" }],
    });
    expect(section.entries?.[0]?.substance).toBe("Codeine");
  });

  it("summarizes active allergies only and supports NKDA", () => {
    const section = sanitizeEnterpriseAllergiesSection({
      entries: [
        { id: "1", substance: "Penicillin", status: "ACTIVE" },
        { id: "2", substance: "Sulfa", status: "INACTIVE" },
      ],
    });
    expect(activeAllergiesSummary(section).summary).toBe("Penicillin");
    expect(activeAllergiesSummary(section).availability).toBe("PRESENT");
    expect(activeAllergiesSummary({ nkda: true }, "NKDA").availability).toBe("NOT_PRESENT");
  });

  it("syncs legacy text from structured entries", () => {
    const synced = syncLegacyAllergyTextFields({
      entries: [
        {
          id: "1",
          substance: "ASA",
          reaction: "rash",
          status: "ACTIVE",
          severity: "MILD",
        },
      ],
    });
    expect(synced.allergyNote).toContain("ASA");
    expect(synced.medicationAllergiesDetail).toMatch(/ASA/);
  });

  it("builds audit snapshots without inactive substances in active list", () => {
    const snap = allergySectionAuditSnapshot({
      entries: [
        { id: "1", substance: "Codeine", status: "ACTIVE" },
        { id: "2", substance: "Latex", status: "INACTIVE" },
      ],
    });
    expect(snap.active).toEqual(["Codeine"]);
    expect(snap.inactive).toEqual(["Latex"]);
  });
});
