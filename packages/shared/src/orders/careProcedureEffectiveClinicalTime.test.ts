import { describe, expect, it } from "vitest";
import {
  careProcedureEffectiveTimeIsLargeBackdate,
  careProcedureEffectiveTimeRequiresDetailedReason,
  careProcedureEffectiveTimeRequiresReason,
  careProcedureEffectiveTimesDiffer,
  CARE_PROCEDURE_LARGE_BACKDATE_MIN_REASON_LENGTH,
  datetimeLocalValueToUtcIso,
  isCareProcedureOrderItem,
  parseCareProcedureEffectiveClinicalTimeIso,
  toCareProcedureEffectiveClinicalTimeIsoUtc,
  validateCareProcedureEffectiveClinicalTime,
} from "./careProcedureEffectiveClinicalTime";

describe("isCareProcedureOrderItem", () => {
  it("true only for CARE order + CARE line", () => {
    expect(isCareProcedureOrderItem("CARE", "CARE")).toBe(true);
    expect(isCareProcedureOrderItem("MEDICATION", "MEDICATION")).toBe(false);
    expect(isCareProcedureOrderItem("LAB_TEST", "LAB")).toBe(false);
  });
});

describe("careProcedureEffectiveTimeRequiresReason", () => {
  const documented = new Date("2026-05-16T14:00:00Z");
  const orderCreated = new Date("2026-05-16T10:00:00Z");

  it("requires reason when delta > 60 minutes", () => {
    const effective = new Date("2026-05-16T12:00:00Z");
    expect(
      careProcedureEffectiveTimeRequiresReason({
        effectiveClinicalTime: effective,
        documentedCompletedAt: documented,
        orderCreatedAt: orderCreated,
        orderItemCreatedAt: orderCreated,
        adjustmentVersion: 0,
      })
    ).toBe(true);
  });

  it("requires reason on second adjustment", () => {
    expect(
      careProcedureEffectiveTimeRequiresReason({
        effectiveClinicalTime: documented,
        documentedCompletedAt: documented,
        orderCreatedAt: orderCreated,
        orderItemCreatedAt: orderCreated,
        adjustmentVersion: 1,
      })
    ).toBe(true);
  });

  it("requires reason for >24h backdate", () => {
    expect(
      careProcedureEffectiveTimeRequiresReason({
        effectiveClinicalTime: new Date("2026-05-14T12:00:00Z"),
        documentedCompletedAt: documented,
        orderCreatedAt: orderCreated,
        orderItemCreatedAt: orderCreated,
        adjustmentVersion: 0,
      })
    ).toBe(true);
  });
});

describe("large backdate detailed reason", () => {
  const documented = new Date("2026-05-16T14:00:00Z");
  /** >24h before documented, still after encounter / order creation */
  const effective = new Date("2026-05-15T10:00:00Z");
  const now = new Date("2026-05-16T15:00:00Z");
  const encounter = new Date("2026-05-15T08:00:00Z");
  const orderCreated = new Date("2026-05-15T09:00:00Z");

  it("rejects >24h backdate without reason", () => {
    const r = validateCareProcedureEffectiveClinicalTime({
      effectiveClinicalTime: effective,
      now,
      encounterAnchorAt: encounter,
      orderCreatedAt: orderCreated,
      orderItemCreatedAt: orderCreated,
      documentedCompletedAt: documented,
      adjustmentVersion: 0,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("REASON_REQUIRED");
  });

  it("rejects >24h backdate with short reason", () => {
    const r = validateCareProcedureEffectiveClinicalTime({
      effectiveClinicalTime: effective,
      now,
      encounterAnchorAt: encounter,
      orderCreatedAt: orderCreated,
      orderItemCreatedAt: orderCreated,
      documentedCompletedAt: documented,
      adjustmentVersion: 0,
      reason: "too short",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("REASON_TOO_SHORT_FOR_LARGE_BACKDATE");
  });

  it("accepts >24h backdate with meaningful reason", () => {
    const reason = "x".repeat(CARE_PROCEDURE_LARGE_BACKDATE_MIN_REASON_LENGTH);
    const r = validateCareProcedureEffectiveClinicalTime({
      effectiveClinicalTime: effective,
      now,
      encounterAnchorAt: encounter,
      orderCreatedAt: orderCreated,
      orderItemCreatedAt: orderCreated,
      documentedCompletedAt: documented,
      adjustmentVersion: 0,
      reason,
    });
    expect(r.ok).toBe(true);
  });

  it("normal <60 min adjustment does not require reason", () => {
    const r = validateCareProcedureEffectiveClinicalTime({
      effectiveClinicalTime: new Date("2026-05-16T13:30:00Z"),
      now,
      encounterAnchorAt: encounter,
      orderCreatedAt: orderCreated,
      orderItemCreatedAt: orderCreated,
      documentedCompletedAt: documented,
      adjustmentVersion: 0,
    });
    expect(r.ok).toBe(true);
  });
});

describe("validateCareProcedureEffectiveClinicalTime", () => {
  const now = new Date("2026-05-16T15:00:00Z");
  const encounter = new Date("2026-05-16T08:00:00Z");
  const orderCreated = new Date("2026-05-16T10:00:00Z");

  it("rejects future time", () => {
    const r = validateCareProcedureEffectiveClinicalTime({
      effectiveClinicalTime: new Date("2026-05-16T16:00:00Z"),
      now,
      encounterAnchorAt: encounter,
      orderCreatedAt: orderCreated,
      orderItemCreatedAt: orderCreated,
      documentedCompletedAt: now,
      adjustmentVersion: 0,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("FUTURE_TIME");
  });
});

describe("timezone helpers", () => {
  it("parseCareProcedureEffectiveClinicalTimeIso accepts ISO UTC", () => {
    const d = parseCareProcedureEffectiveClinicalTimeIso("2026-05-16T14:00:00.000Z");
    expect(d).not.toBeNull();
    expect(toCareProcedureEffectiveClinicalTimeIsoUtc(d!)).toBe("2026-05-16T14:00:00.000Z");
  });

  it("rejects invalid ISO", () => {
    expect(parseCareProcedureEffectiveClinicalTimeIso("not-a-date")).toBeNull();
  });
});

describe("careProcedureEffectiveTimesDiffer", () => {
  it("detects different instants", () => {
    expect(
      careProcedureEffectiveTimesDiffer(
        new Date("2026-05-16T12:00:00Z"),
        new Date("2026-05-16T14:00:00Z")
      )
    ).toBe(true);
  });
});

describe("careProcedureEffectiveTimeIsLargeBackdate", () => {
  it("true when effective is >24h before documented", () => {
    expect(
      careProcedureEffectiveTimeIsLargeBackdate(
        new Date("2026-05-14T12:00:00Z"),
        new Date("2026-05-16T14:00:00Z")
      )
    ).toBe(true);
  });
});
