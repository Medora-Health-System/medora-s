import { describe, expect, it } from "vitest";
import {
  buildProviderDischargeDocumentationSummaryBlock,
} from "./providerDischargeDocumentationSummary";
import {
  mergeProviderDischargeDocumentationIntoDischargeJson,
  hydrateProviderDischargeDocumentationForm,
} from "./providerDischargeDocumentationModel";

describe("provider discharge summary completeness", () => {
  it("shows return precautions and work instructions without a diagnosis or departure time", () => {
    const form = hydrateProviderDischargeDocumentationForm({});
    form.returnPrecautions = "Return immediately for worsening symptoms.";
    form.returnWorkSchool = "Remain off work for two days.";
    const saved = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
      documentedAt: "2026-09-23T12:00:00.000Z",
      documentedByDisplayName: "Clinician Example",
    });
    const block = buildProviderDischargeDocumentationSummaryBlock(saved, "en");
    expect(block).not.toBeNull();
    expect(block!.lines.join("\n")).toContain(form.returnPrecautions);
    expect(block!.lines.join("\n")).toContain(form.returnWorkSchool);
    expect(block!.lines.join("\n")).toContain("Clinician Example");
  });
});
