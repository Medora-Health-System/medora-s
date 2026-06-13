import { describe, expect, it } from "vitest";
import {
  formatClinicalDateTime,
  formatDocumentationAuthorLine,
  formatDocumentationUpdatedLine,
  formatResultAttributionPair,
  resolveRoleTitleLabel,
} from "./documentationAttribution";

describe("documentationAttribution", () => {
  it("formats author line with role title", () => {
    const line = formatDocumentationAuthorLine(
      { name: "Marie Dupont", role: "RN", at: "2026-06-01T14:30:00.000Z" },
      "fr"
    );
    expect(line).toContain("Marie Dupont");
    expect(line).toContain("Infirmier");
  });

  it("formats updated line when updater differs", () => {
    const line = formatDocumentationUpdatedLine(
      {
        name: "Tech A",
        role: "LAB",
        at: "2026-06-01T10:00:00.000Z",
        updatedByName: "Dr B",
        updatedByRole: "PROVIDER",
        updatedAt: "2026-06-01T12:00:00.000Z",
      },
      "en"
    );
    expect(line).toContain("Dr B");
    expect(line).toContain("Physician");
  });

  it("keeps resulted and acknowledged attribution separate", () => {
    const lines = formatResultAttributionPair({
      resultedBy: "Lab Tech",
      resultedByRole: "LAB",
      resultedAt: "2026-06-01T11:00:00.000Z",
      acknowledgedBy: "Dr Smith",
      acknowledgedByRole: "PROVIDER",
      acknowledgedAt: "2026-06-01T12:00:00.000Z",
      language: "en",
    });
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("Lab Tech");
    expect(lines[1]).toContain("Dr Smith");
    expect(lines[0]).not.toContain("Dr Smith");
  });

  it("resolves role codes to localized titles", () => {
    expect(resolveRoleTitleLabel("PROVIDER", "fr")).toBe("Médecin");
    expect(resolveRoleTitleLabel("RN|PROVIDER", "en")).toBe("Nurse, Physician");
  });

  it("formats clinical datetime for locale", () => {
    const fr = formatClinicalDateTime("2026-06-01T14:30:00.000Z", "fr");
    const en = formatClinicalDateTime("2026-06-01T14:30:00.000Z", "en");
    expect(fr.length).toBeGreaterThan(4);
    expect(en.length).toBeGreaterThan(4);
  });
});
