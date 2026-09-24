import { describe, expect, it } from "vitest";
import { buildProviderDischargeDocumentationSummaryBlock } from "./providerDischargeDocumentationSummary";
import {
  hydrateProviderDischargeDocumentationForm,
  mergeProviderDischargeDocumentationIntoDischargeJson,
} from "./providerDischargeDocumentationModel";

describe("discharge summary diagnosis-reference fallback", () => {
  it("shows selected diagnosis references when their documentation cards are absent", () => {
    const form = hydrateProviderDischargeDocumentationForm({});
    form.diagnosisRefs = [
      { encounterDiagnosisId: "dx-1", code: "R10.9", label: "Abdominal pain", isPrimary: true },
      { encounterDiagnosisId: "dx-2", code: "R11.0", label: "Nausea" },
    ];
    form.diagnosisDocs = [];
    const saved = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
      documentedAt: "2026-09-23T12:00:00.000Z",
      documentedByDisplayName: "Clinician Example",
    });
    const block = buildProviderDischargeDocumentationSummaryBlock(saved, "en");
    expect(block).not.toBeNull();
    const summary = block!.lines.join("\n");
    expect(summary).toContain("R10.9");
    expect(summary).toContain("Abdominal pain");
    expect(summary).toContain("R11.0");
    expect(summary).toContain("Nausea");
  });
});
