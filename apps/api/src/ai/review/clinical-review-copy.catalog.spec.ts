import type { AiSuggestion } from "@medora/shared";
import { localizeDeterministicClinicalCopy } from "./clinical-review-copy.catalog.js";

const base = {
  id: "00000000-0000-4000-8000-000000000001",
  category: "RESULT_FOLLOWUP",
  priority: "MEDIUM",
  title: "Available diagnostic results are not documented as reviewed",
  summary: "Diagnostic results are available.",
  reasoningSummary: "Review is not documented.",
  evidence: [],
  recommendedActions: [{ actionType: "NAVIGATE", targetSection: "results", label: "Review results" }],
  clinicalDisclaimer: "Clinician review required.",
  source: "DETERMINISTIC",
  generatedAt: "2026-09-25T12:00:00.000Z",
  snapshotVersion: "v1",
  status: "PENDING",
} as AiSuggestion;

describe("clinical review copy catalog", () => {
  it("uses clinician-facing Spanish without implementation terminology", () => {
    const localized = localizeDeterministicClinicalCopy(base, "es");
    const visible = JSON.stringify(localized);
    expect(localized.title).toBe("Revisar seguimiento de resultados");
    expect(visible).toContain("Medora Assist");
    expect(visible).not.toMatch(/snapshot|payload|namespace|estructurad/i);
  });

  it("uses clinician-facing French without implementation terminology", () => {
    const localized = localizeDeterministicClinicalCopy(base, "fr");
    const visible = JSON.stringify(localized);
    expect(localized.title).toBe("Revoir le suivi des résultats");
    expect(visible).toContain("Medora Assist");
    expect(visible).not.toMatch(/snapshot|payload|namespace|structuré/i);
  });

  it("does not alter English source copy", () => {
    expect(localizeDeterministicClinicalCopy(base, "en")).toBe(base);
  });
});
