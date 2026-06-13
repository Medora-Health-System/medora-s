import { describe, expect, it } from "vitest";
import {
  isMarShiftTimelineItemActionable,
  isMarShiftTimelineTerminalClinicalAction,
  isMarShiftTimelineTerminalStatus,
} from "./marShiftTimelineActionability.js";

describe("marShiftTimelineActionability (K.10B.11B)", () => {
  it("PLANNED is actionable", () => {
    expect(isMarShiftTimelineTerminalStatus("PLANNED")).toBe(false);
    expect(
      isMarShiftTimelineItemActionable({
        doseStatus: "PLANNED",
        clinicalAction: "VIEW_UPCOMING",
      })
    ).toBe(true);
  });

  it("VIEW_UPCOMING is actionable (not terminal clinical action)", () => {
    expect(isMarShiftTimelineTerminalClinicalAction("VIEW_UPCOMING")).toBe(false);
    expect(
      isMarShiftTimelineItemActionable({
        doseStatus: "PLANNED",
        clinicalAction: "VIEW_UPCOMING",
      })
    ).toBe(true);
  });

  it("DUE is actionable", () => {
    expect(
      isMarShiftTimelineItemActionable({
        doseStatus: "DUE",
        clinicalAction: "ADMINISTER",
      })
    ).toBe(true);
  });

  it("OVERDUE is actionable", () => {
    expect(
      isMarShiftTimelineItemActionable({
        doseStatus: "OVERDUE",
        clinicalAction: "ADMINISTER",
      })
    ).toBe(true);
  });

  it("COMPLETED is terminal", () => {
    expect(isMarShiftTimelineTerminalStatus("COMPLETED")).toBe(true);
    expect(
      isMarShiftTimelineItemActionable({
        doseStatus: "COMPLETED",
        clinicalAction: "VIEW_ADMINISTRATION",
      })
    ).toBe(false);
  });

  it("REFUSED is terminal via secondary text", () => {
    expect(
      isMarShiftTimelineTerminalStatus("DUE", "REFUSED")
    ).toBe(true);
    expect(
      isMarShiftTimelineItemActionable({
        doseStatus: "DUE",
        secondaryText: "REFUSED",
        clinicalAction: "ADMINISTER",
      })
    ).toBe(false);
  });

  it("HELD is terminal", () => {
    expect(isMarShiftTimelineTerminalStatus("HELD")).toBe(true);
    expect(
      isMarShiftTimelineItemActionable({
        doseStatus: "HELD",
        clinicalAction: "VIEW_HELD",
      })
    ).toBe(false);
  });

  it("MISSED is terminal", () => {
    expect(isMarShiftTimelineTerminalStatus("MISSED")).toBe(true);
    expect(
      isMarShiftTimelineItemActionable({
        doseStatus: "MISSED",
        clinicalAction: "VIEW_MISSED",
      })
    ).toBe(false);
  });

  it("VIEW_ADMINISTRATION is terminal clinical action", () => {
    expect(isMarShiftTimelineTerminalClinicalAction("VIEW_ADMINISTRATION")).toBe(true);
  });
});
