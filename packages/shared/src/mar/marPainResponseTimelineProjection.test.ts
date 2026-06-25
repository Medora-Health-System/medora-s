import { describe, expect, it } from "vitest";
import { buildMarPainResponseTimelineProjection } from "./marPainResponseTimelineProjection.js";

describe("mar-shift-timeline pain response projection", () => {
  it("ketorolac completed dose exposes AWAITING_REASSESSMENT and responseRequired", () => {
    const projection = buildMarPainResponseTimelineProjection({
      medicationLabel: "Ketorolac 30 mg IV",
      marAction: "administered",
      administeredAt: "2026-06-25T12:00:00.000Z",
      doseStatus: "COMPLETED",
      defaultSecondaryText: "DONE",
    });
    expect(projection.secondaryText).toBe("AWAITING_REASSESSMENT");
    expect(projection.responseRequired).toBe(true);
    expect(projection.responseDocumentationAvailable).toBe(true);
  });

  it("antibiotic administration does not require pain response", () => {
    const projection = buildMarPainResponseTimelineProjection({
      medicationLabel: "Ceftriaxone 1 g",
      marAction: "administered",
      administeredAt: "2026-06-25T12:00:00.000Z",
      doseStatus: "COMPLETED",
      defaultSecondaryText: "DONE",
    });
    expect(projection.responseRequired).toBe(false);
    expect(projection.secondaryText).toBe("DONE");
  });
});
