import { describe, expect, it } from "vitest";
import {
  buildMarShiftTimelineHoldNotes,
  buildMarShiftTimelineRefuseNotes,
  isMarShiftTimelineHoldNotes,
  resolveMarShiftTimelineTerminalOutcome,
} from "./marShiftTimelineTerminalActions.js";

describe("marShiftTimelineTerminalActions (M1.8B.7K.9)", () => {
  it("buildMarShiftTimelineRefuseNotes requires OTHER detail", () => {
    expect(() => buildMarShiftTimelineRefuseNotes("OTHER", "")).toThrow();
    expect(buildMarShiftTimelineRefuseNotes("PATIENT_REFUSED")).toBe(
      "Refused: PATIENT_REFUSED"
    );
  });

  it("buildMarShiftTimelineHoldNotes prefixes Held", () => {
    expect(buildMarShiftTimelineHoldNotes("NPO")).toBe("Held: NPO");
    expect(isMarShiftTimelineHoldNotes("Held: NPO")).toBe(true);
  });

  it("resolveMarShiftTimelineTerminalOutcome maps refuse and hold", () => {
    expect(resolveMarShiftTimelineTerminalOutcome({ marAction: "refused" })).toBe("REFUSED");
    expect(
      resolveMarShiftTimelineTerminalOutcome({
        marAction: "md_changed",
        notes: "Held: LOW_BP",
      })
    ).toBe("HELD");
  });
});
