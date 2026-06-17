import { describe, expect, it } from "vitest";
import { buildMarMedicationResponseTimelineBadge } from "@medora/shared";

describe("marMedicationResponseTimelineBadge", () => {
  it("uses severity styling without red", () => {
    const badge = buildMarMedicationResponseTimelineBadge(null);
    expect(badge).toBeNull();
  });
});
