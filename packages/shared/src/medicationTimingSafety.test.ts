import { describe, expect, it } from "vitest";
import { evaluateMedicationTimingSafety } from "./medicationTimingSafety";

describe("evaluateMedicationTimingSafety", () => {
  const base = new Date("2026-06-01T12:00:00.000Z");

  it("returns none when no last administration", () => {
    expect(evaluateMedicationTimingSafety({ lastAdministeredAt: null, now: base })).toEqual({
      level: "none",
      messageKey: "none",
      minutesSinceLast: null,
    });
  });

  it("critical when under 5 minutes", () => {
    const last = new Date(base.getTime() - 4 * 60 * 1000);
    const r = evaluateMedicationTimingSafety({ lastAdministeredAt: last, now: base });
    expect(r.level).toBe("critical");
    expect(r.messageKey).toBe("critical");
    expect(r.minutesSinceLast).toBe(4);
  });

  it("warning at 5–29 minutes", () => {
    const last = new Date(base.getTime() - 15 * 60 * 1000);
    const r = evaluateMedicationTimingSafety({ lastAdministeredAt: last, now: base });
    expect(r.level).toBe("warning");
    expect(r.minutesSinceLast).toBe(15);
  });

  it("info at 30–119 minutes", () => {
    const last = new Date(base.getTime() - 60 * 60 * 1000);
    const r = evaluateMedicationTimingSafety({ lastAdministeredAt: last, now: base });
    expect(r.level).toBe("info");
    expect(r.minutesSinceLast).toBe(60);
  });

  it("none at 120+ minutes", () => {
    const last = new Date(base.getTime() - 121 * 60 * 1000);
    const r = evaluateMedicationTimingSafety({ lastAdministeredAt: last, now: base });
    expect(r.level).toBe("none");
    expect(r.minutesSinceLast).toBe(null);
  });
});
