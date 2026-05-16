import { describe, expect, it } from "vitest";
import {
  canAdjustCareProcedureClinicalTime,
  canShowCareProcedureClinicalTimeClock,
  careProcedureClinicalTimeModalIsLargeBackdate,
  careProcedureClinicalTimeModalRequiresDetailedReason,
  datetimeLocalValueToUtcIso,
  resolveCareProcedureDisplayTimes,
} from "./careProcedureClinicalTimeDisplay";

describe("canAdjustCareProcedureClinicalTime", () => {
  it("allows RN, PROVIDER, ADMIN only", () => {
    expect(canAdjustCareProcedureClinicalTime(["RN"])).toBe(true);
    expect(canAdjustCareProcedureClinicalTime(["PROVIDER"])).toBe(true);
    expect(canAdjustCareProcedureClinicalTime(["ADMIN"])).toBe(true);
    expect(canAdjustCareProcedureClinicalTime(["PHARMACY"])).toBe(false);
    expect(canAdjustCareProcedureClinicalTime(["LAB"])).toBe(false);
  });
});

describe("canShowCareProcedureClinicalTimeClock", () => {
  it("shows only for completed CARE lines when allowed", () => {
    expect(
      canShowCareProcedureClinicalTimeClock(
        "CARE",
        { id: "1", catalogItemType: "CARE", status: "COMPLETED" },
        { encounterOpen: true, canAdjust: true }
      )
    ).toBe(true);
    expect(
      canShowCareProcedureClinicalTimeClock(
        "MEDICATION",
        { id: "1", catalogItemType: "MEDICATION", status: "COMPLETED" },
        { encounterOpen: true, canAdjust: true }
      )
    ).toBe(false);
  });
});

describe("resolveCareProcedureDisplayTimes", () => {
  it("shows adjusted badge when effective differs from documented", () => {
    const r = resolveCareProcedureDisplayTimes({
      id: "1",
      effectiveClinicalAt: "2026-05-16T12:00:00.000Z",
      documentedCompletedAt: "2026-05-16T14:00:00.000Z",
      effectiveClinicalAtVersion: 0,
    });
    expect(r.showAdjustedBadge).toBe(true);
  });

  it("no badge when times match", () => {
    const t = "2026-05-16T14:00:00.000Z";
    const r = resolveCareProcedureDisplayTimes({
      id: "1",
      effectiveClinicalAt: t,
      documentedCompletedAt: t,
      effectiveClinicalAtVersion: 0,
    });
    expect(r.showAdjustedBadge).toBe(false);
  });
});

describe("datetimeLocalValueToUtcIso", () => {
  it("converts local datetime-local to ISO UTC", () => {
    const iso = datetimeLocalValueToUtcIso("2026-05-16T10:30");
    expect(iso).toBeTruthy();
    expect(iso).toMatch(/Z$/);
  });

  it("rejects invalid input", () => {
    expect(datetimeLocalValueToUtcIso("")).toBeNull();
  });
});

describe("large backdate modal helpers", () => {
  const documented = new Date("2026-05-16T14:00:00Z");

  it("detects >24h backdate", () => {
    expect(
      careProcedureClinicalTimeModalIsLargeBackdate({
        effectiveClinicalTimeIso: "2026-05-15T10:00:00.000Z",
        documentedCompletedAt: documented,
      })
    ).toBe(true);
  });

  it("requires detailed reason when backdate >24h and reason short", () => {
    expect(
      careProcedureClinicalTimeModalRequiresDetailedReason({
        effectiveClinicalTimeIso: "2026-05-15T10:00:00.000Z",
        documentedCompletedAt: documented,
        reason: "too short",
      })
    ).toBe(true);
  });
});
