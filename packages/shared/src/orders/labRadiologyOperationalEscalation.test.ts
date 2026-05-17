import { describe, expect, it } from "vitest";
import {
  analyzeLabRadOperationalEscalation,
  compareLabRadWorklistPairs,
  LAB_RAD_AGING_DELAYED_MS,
  LAB_RAD_AGING_WATCH_MS,
  LAB_RAD_CRITICAL_ACK_DELAYED_MS,
  LAB_RAD_SHIFT_HANDOFF_PENDING_MS,
  pairPassesLabRadEscalationFilters,
  summarizeLabRadWorklistOperational,
} from "./labRadiologyOperationalEscalation.js";

const order = { id: "ord-1", createdAt: "2026-05-16T08:00:00.000Z", type: "LAB" };
const now = new Date("2026-05-16T14:00:00.000Z");

describe("analyzeLabRadOperationalEscalation", () => {
  it("lab awaiting collection — watch bucket after 60 min", () => {
    const r = analyzeLabRadOperationalEscalation({
      domain: "LAB",
      order,
      item: {
        id: "oi-1",
        status: "ACKNOWLEDGED",
        createdAt: "2026-05-16T08:05:00.000Z",
      },
      now,
    });
    expect(r.phase).toBe("LAB_AWAITING_COLLECTION");
    expect(r.phaseAgeMs).toBeGreaterThan(LAB_RAD_AGING_WATCH_MS);
    expect(r.agingBucket).toBe("DELAYED");
    expect(r.escalationFlags).toContain("AGING");
    expect(r.escalationFlags).toContain("DELAYED");
  });

  it("lab awaiting result — delayed after 4h from collection", () => {
    const r = analyzeLabRadOperationalEscalation({
      domain: "LAB",
      order,
      item: {
        id: "oi-1",
        status: "IN_PROGRESS",
        createdAt: "2026-05-16T08:05:00.000Z",
        documentedCollectedAt: "2026-05-16T09:00:00.000Z",
      },
      now: new Date("2026-05-16T14:30:00.000Z"),
    });
    expect(r.phase).toBe("LAB_AWAITING_RESULT");
    expect(r.phaseAgeMs).toBeGreaterThan(LAB_RAD_AGING_DELAYED_MS);
    expect(r.awaitingResultOrFinalization).toBe(true);
    expect(r.escalationFlags).toContain("DELAYED");
  });

  it("rad awaiting performed — on track under 60 min", () => {
    const r = analyzeLabRadOperationalEscalation({
      domain: "RADIOLOGY",
      order: { id: "ord-r", createdAt: "2026-05-16T13:30:00.000Z", type: "IMAGING" },
      item: {
        id: "oi-r",
        status: "ACKNOWLEDGED",
        createdAt: "2026-05-16T13:35:00.000Z",
      },
      now: new Date("2026-05-16T14:00:00.000Z"),
    });
    expect(r.phase).toBe("RAD_AWAITING_PERFORMED");
    expect(r.agingBucket).toBe("ON_TRACK");
  });

  it("rad awaiting finalized", () => {
    const r = analyzeLabRadOperationalEscalation({
      domain: "RADIOLOGY",
      order: { id: "ord-r", createdAt: order.createdAt, type: "IMAGING" },
      item: {
        id: "oi-r",
        status: "IN_PROGRESS",
        createdAt: "2026-05-16T08:05:00.000Z",
        documentedPerformedAt: "2026-05-16T09:00:00.000Z",
      },
      now,
    });
    expect(r.phase).toBe("RAD_AWAITING_FINALIZED");
    expect(r.awaitingResultOrFinalization).toBe(true);
  });

  it("critical ack aging — overdue after 30 min", () => {
    const r = analyzeLabRadOperationalEscalation({
      domain: "LAB",
      order,
      item: {
        id: "oi-1",
        status: "RESULTED",
        createdAt: "2026-05-16T08:05:00.000Z",
        documentedCollectedAt: "2026-05-16T09:00:00.000Z",
        result: {
          verifiedAt: "2026-05-16T13:00:00.000Z",
          criticalValue: true,
          acknowledgedByProviderAt: null,
        },
      },
      now: new Date("2026-05-16T13:45:00.000Z"),
    });
    expect(r.phase).toBe("LAB_AWAITING_CRITICAL_ACK");
    expect(r.phaseAgeMs).toBeGreaterThan(LAB_RAD_CRITICAL_ACK_DELAYED_MS);
    expect(r.awaitingCriticalAck).toBe(true);
    expect(r.escalationFlags).toContain("AWAITING_ACKNOWLEDGEMENT");
    expect(r.escalationFlags).toContain("CRITICAL_ACK_OVERDUE");
  });

  it("shift handoff when pending >4h", () => {
    const r = analyzeLabRadOperationalEscalation({
      domain: "LAB",
      order: { ...order, createdAt: "2026-05-16T06:00:00.000Z" },
      item: {
        id: "oi-1",
        status: "PLACED",
        createdAt: "2026-05-16T06:05:00.000Z",
      },
      now,
    });
    expect(r.phaseAgeMs).toBeGreaterThan(LAB_RAD_SHIFT_HANDOFF_PENDING_MS);
    expect(r.shiftHandoffReview).toBe(true);
    expect(r.escalationFlags).toContain("SHIFT_HANDOFF_REVIEW");
  });
});

describe("filter and sort helpers", () => {
  it("pairPassesLabRadEscalationFilters — critical delay only", () => {
    const escalation = analyzeLabRadOperationalEscalation({
      domain: "LAB",
      order,
      item: {
        id: "oi-1",
        status: "ACKNOWLEDGED",
        createdAt: "2026-05-16T02:00:00.000Z",
      },
      now,
    });
    expect(
      pairPassesLabRadEscalationFilters(escalation, [], {
        needsEscalation: false,
        criticalDelay: true,
        awaitingResultOrFinalization: false,
        awaitingAcknowledgement: false,
        shiftHandoffReview: false,
        adjustedReconciled: false,
      })
    ).toBe(escalation.agingBucket === "CRITICAL_DELAY");
  });

  it("compareLabRadWorklistPairs — oldest first", () => {
    const a = analyzeLabRadOperationalEscalation({
      domain: "LAB",
      order: { ...order, createdAt: "2026-05-16T06:00:00.000Z" },
      item: { id: "a", status: "PLACED", createdAt: "2026-05-16T06:05:00.000Z" },
      now,
    });
    const b = analyzeLabRadOperationalEscalation({
      domain: "LAB",
      order: { ...order, createdAt: "2026-05-16T10:00:00.000Z" },
      item: { id: "b", status: "PLACED", createdAt: "2026-05-16T10:05:00.000Z" },
      now,
    });
    expect(
      compareLabRadWorklistPairs(
        { escalation: a },
        { escalation: b },
        "OLDEST_FIRST"
      )
    ).toBeLessThan(0);
  });

  it("summarizeLabRadWorklistOperational counts active rows", () => {
    const e1 = analyzeLabRadOperationalEscalation({
      domain: "LAB",
      order,
      item: { id: "1", status: "PLACED", createdAt: "2026-05-16T06:00:00.000Z" },
      now,
      reconciliationFlags: ["ADJUSTED_CLINICAL_TIME"],
    });
    const summary = summarizeLabRadWorklistOperational([
      { escalation: e1, reconciliationFlags: ["ADJUSTED_CLINICAL_TIME"], isActive: true },
      {
        escalation: analyzeLabRadOperationalEscalation({
          domain: "LAB",
          order,
          item: { id: "2", status: "VERIFIED", createdAt: "2026-05-16T08:00:00.000Z", documentedCollectedAt: "2026-05-16T09:00:00.000Z", result: { verifiedAt: "2026-05-16T10:00:00.000Z" } },
          now,
        }),
        reconciliationFlags: [],
        isActive: false,
      },
    ]);
    expect(summary.totalActive).toBe(1);
    expect(summary.adjustedClinicalTime).toBe(1);
  });
});
