import { describe, expect, it } from "vitest";
import { computeLos, losTierFromMs, type LosResult } from "./erLengthOfStay";

const ARRIVAL = "2026-05-10T08:00:00.000Z";

function at(arrivalIso: string, nowIso: string): LosResult | null {
  return computeLos(arrivalIso, new Date(nowIso).getTime());
}

describe("computeLos — Phase 10A", () => {
  it("returns null for missing or invalid input", () => {
    expect(computeLos(null)).toBeNull();
    expect(computeLos(undefined)).toBeNull();
    expect(computeLos("not-a-date")).toBeNull();
    expect(computeLos({})).toBeNull();
  });

  it("clamps negative durations to 0 when 'now' is earlier than arrival", () => {
    const r = at(ARRIVAL, "2026-05-10T07:30:00.000Z");
    expect(r?.ms).toBe(0);
    expect(r?.label).toBe("0h00");
    expect(r?.tier).toBe("normal");
  });

  it("formats hours and minutes with zero-padded minutes", () => {
    const r = at(ARRIVAL, "2026-05-10T08:47:00.000Z");
    expect(r?.label).toBe("0h47");
    expect(r?.hours).toBe(0);
    expect(r?.minutes).toBe(47);
  });

  it("provides a padded operational label matching the trackboard tile format", () => {
    expect(at(ARRIVAL, "2026-05-10T08:09:00.000Z")?.labelPadded).toBe("00h 09m");
    expect(at(ARRIVAL, "2026-05-10T11:30:00.000Z")?.labelPadded).toBe("03h 30m");
    expect(at(ARRIVAL, "2026-05-10T20:05:00.000Z")?.labelPadded).toBe("12h 05m");
  });

  it("buckets < 2h as normal", () => {
    expect(at(ARRIVAL, "2026-05-10T09:59:59.000Z")?.tier).toBe("normal");
  });

  it("buckets the boundary at 2h as attention", () => {
    expect(at(ARRIVAL, "2026-05-10T10:00:00.000Z")?.tier).toBe("attention");
  });

  it("buckets between 2h and 4h as attention", () => {
    expect(at(ARRIVAL, "2026-05-10T11:30:00.000Z")?.tier).toBe("attention");
  });

  it("buckets the boundary at 4h as attention (still ≤ 4h)", () => {
    expect(at(ARRIVAL, "2026-05-10T12:00:00.000Z")?.tier).toBe("attention");
  });

  it("buckets > 4h as high", () => {
    expect(at(ARRIVAL, "2026-05-10T12:00:01.000Z")?.tier).toBe("high");
    expect(at(ARRIVAL, "2026-05-10T13:30:00.000Z")?.tier).toBe("high");
  });
});

describe("losTierFromMs — Phase 10A", () => {
  it("classifies sub-2h as normal", () => {
    expect(losTierFromMs(0)).toBe("normal");
    expect(losTierFromMs(60 * 60 * 1000)).toBe("normal");
  });
  it("classifies 2h–4h as attention", () => {
    expect(losTierFromMs(2 * 60 * 60 * 1000)).toBe("attention");
    expect(losTierFromMs(4 * 60 * 60 * 1000)).toBe("attention");
  });
  it("classifies > 4h as high", () => {
    expect(losTierFromMs(4 * 60 * 60 * 1000 + 1)).toBe("high");
    expect(losTierFromMs(8 * 60 * 60 * 1000)).toBe("high");
  });
});
