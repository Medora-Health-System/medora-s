import { describe, expect, it } from "vitest";
import {
  activeAllergiesSummary,
  allergySectionAuditSnapshot,
  sanitizeEnterpriseAllergiesSection,
  syncLegacyAllergyTextFields,
} from "./enterpriseAllergyRecord.js";

describe("enterpriseAllergyRecord D4A.3.3A", () => {
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
