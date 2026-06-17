import { describe, expect, it } from "vitest";
import { isDoseAdministrableNow } from "./medicationDoseMarWindowPolicy.js";

describe("medicationDoseMarWindowPolicy (M1.8B.7I.1)", () => {
  const windowStart = new Date("2026-06-10T09:00:00.000Z");
  const windowEnd = new Date("2026-06-10T10:00:00.000Z");

  it.each(["DUE", "OVERDUE", "IN_PROGRESS"] as const)(
    "%s is administrable regardless of window",
    (doseStatus) => {
      expect(
        isDoseAdministrableNow({
          doseStatus,
          now: new Date("2026-06-10T06:00:00.000Z"),
          dueWindowStartAt: windowStart,
          dueWindowEndAt: windowEnd,
        })
      ).toBe(true);
    }
  );

  it.each([
    ["before window", "2026-06-10T08:59:59.000Z"],
    ["inside window", "2026-06-10T09:30:00.000Z"],
    ["after window", "2026-06-10T10:00:01.000Z"],
  ] as const)("PLANNED %s → administrable (H9 universal actionability)", (_label, nowIso) => {
    expect(
      isDoseAdministrableNow({
        doseStatus: "PLANNED",
        now: new Date(nowIso),
        dueWindowStartAt: windowStart,
        dueWindowEndAt: windowEnd,
      })
    ).toBe(true);
  });

  it("HELD and terminal statuses → not administrable", () => {
    for (const doseStatus of ["HELD", "COMPLETED", "MISSED", "CANCELLED"] as const) {
      expect(
        isDoseAdministrableNow({
          doseStatus,
          now: new Date("2026-06-10T09:30:00.000Z"),
          dueWindowStartAt: windowStart,
          dueWindowEndAt: windowEnd,
        })
      ).toBe(false);
    }
  });
});
