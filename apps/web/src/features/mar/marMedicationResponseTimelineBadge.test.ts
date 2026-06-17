import { describe, expect, it } from "vitest";
import { marShiftTimelineMedicationResponseBadgeStyle } from "@/features/mar/marShiftTimelineDisplay";

describe("marMedicationResponse timeline badge", () => {
  it("uses routine/safety/amber styling without red", () => {
    const routine = marShiftTimelineMedicationResponseBadgeStyle("routine");
    const neutral = marShiftTimelineMedicationResponseBadgeStyle("neutral");
    const safety = marShiftTimelineMedicationResponseBadgeStyle("safety");
    expect(String(routine.color)).not.toContain("991b1b");
    expect(String(neutral.color)).toContain("475569");
    expect(String(safety.color)).toContain("b45309");
  });
});
