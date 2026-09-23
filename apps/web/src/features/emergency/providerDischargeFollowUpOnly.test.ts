import { describe, expect, it } from "vitest";
import { buildProviderDischargeDocumentationSummaryBlock } from "./providerDischargeDocumentationSummary";
import {
  hydrateProviderDischargeDocumentationForm,
  mergeProviderDischargeDocumentationIntoDischargeJson,
  newDefaultFollowUpRow,
} from "./providerDischargeDocumentationModel";

describe("discharge summary follow-up-only planning", () => {
  it("preserves a follow-up contact with no provider name or timing", () => {
    const form = hydrateProviderDischargeDocumentationForm({});
    form.followUps = [{
      ...newDefaultFollowUpRow(),
      providerOrFacility: "",
      timing: "",
      phone: "555-0100",
      address: "Example clinic address",
    }];
    const saved = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
      documentedAt: "2026-09-23T12:00:00.000Z",
      documentedByDisplayName: "Clinician Example",
    });
    const block = buildProviderDischargeDocumentationSummaryBlock(saved, "en");
    expect(block).not.toBeNull();
    expect(block!.lines.join("\n")).toContain("555-0100");
    expect(block!.lines.join("\n")).toContain("Example clinic address");
  });
});
