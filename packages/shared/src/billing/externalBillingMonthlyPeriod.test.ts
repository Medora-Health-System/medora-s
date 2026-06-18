import { describe, expect, it } from "vitest";
import { parseUtcMonthRange } from "./externalBillingMonthlyPeriod.js";

describe("externalBillingMonthlyPeriod (MEDUI.BILLING.EXTERNAL_EXPORT.2)", () => {
  it("parses valid month", () => {
    const range = parseUtcMonthRange("2026-06");
    expect(range.month).toBe("2026-06");
    expect(range.periodStart).toBe("2026-06-01");
    expect(range.periodEnd).toBe("2026-06-30");
    expect(range.start.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-06-30T23:59:59.999Z");
  });

  it("rejects invalid month format", () => {
    expect(() => parseUtcMonthRange("2026-6")).toThrow(/YYYY-MM/);
    expect(() => parseUtcMonthRange("bad")).toThrow(/YYYY-MM/);
    expect(() => parseUtcMonthRange("2026-13")).toThrow(/Invalid month/);
    expect(() => parseUtcMonthRange("2026-00")).toThrow(/Invalid month/);
  });

  it("supports February non-leap year", () => {
    const range = parseUtcMonthRange("2025-02");
    expect(range.periodEnd).toBe("2025-02-28");
  });

  it("supports February leap year", () => {
    const range = parseUtcMonthRange("2024-02");
    expect(range.periodEnd).toBe("2024-02-29");
  });

  it("supports 30-day month", () => {
    const range = parseUtcMonthRange("2026-04");
    expect(range.periodEnd).toBe("2026-04-30");
  });

  it("supports 31-day month", () => {
    const range = parseUtcMonthRange("2026-01");
    expect(range.periodEnd).toBe("2026-01-31");
  });
});
