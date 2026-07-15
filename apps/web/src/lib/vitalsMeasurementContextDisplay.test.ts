import { describe, expect, it } from "vitest";
import {
  combineLocalDateAndTime,
  measuredAtIsoFromLocalInputs,
  splitMeasuredAtLocal,
} from "./vitalsMeasurementContextDisplay";

describe("combineLocalDateAndTime", () => {
  it("combines YYYY-MM-DD and HH:mm into a local Date", () => {
    const d = combineLocalDateAndTime("2026-07-15", "00:17");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(6);
    expect(d!.getDate()).toBe(15);
    expect(d!.getHours()).toBe(0);
    expect(d!.getMinutes()).toBe(17);
  });

  it("handles noon and 23:59", () => {
    const noon = combineLocalDateAndTime("2026-07-15", "12:00");
    expect(noon?.getHours()).toBe(12);
    const late = combineLocalDateAndTime("2026-07-15", "23:59");
    expect(late?.getHours()).toBe(23);
    expect(late?.getMinutes()).toBe(59);
  });

  it("supports optional seconds", () => {
    const d = combineLocalDateAndTime("2026-07-15", "08:30:45");
    expect(d?.getSeconds()).toBe(45);
  });

  it("rejects empty, invalid, and overflow dates", () => {
    expect(combineLocalDateAndTime("", "12:00")).toBeNull();
    expect(combineLocalDateAndTime("2026-07-15", "")).toBeNull();
    expect(combineLocalDateAndTime("07/15/2026", "12:00")).toBeNull();
    expect(combineLocalDateAndTime("2026-02-31", "10:00")).toBeNull();
    expect(combineLocalDateAndTime("2026-07-15", "24:00")).toBeNull();
  });

  it("measuredAtIsoFromLocalInputs returns ISO only after validation", () => {
    const iso = measuredAtIsoFromLocalInputs("2026-07-15", "00:17");
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(measuredAtIsoFromLocalInputs("bad", "time")).toBeNull();
  });

  it("splitMeasuredAtLocal round-trips local components", () => {
    const local = combineLocalDateAndTime("2026-07-15", "00:17")!;
    const split = splitMeasuredAtLocal(local.toISOString());
    expect(split.date).toBe("2026-07-15");
    expect(split.time).toBe("00:17");
  });
});
