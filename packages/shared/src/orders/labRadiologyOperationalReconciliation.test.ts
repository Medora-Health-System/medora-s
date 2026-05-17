import { describe, expect, it } from "vitest";
import {
  analyzeLabRadOrderItemReconciliation,
  labRadReconciliationNeedsFollowUp,
  labRadReconciliationFlags,
  LAB_RAD_DELAY_MILESTONE_TO_RESULT_MS,
  LAB_RAD_DELAY_ORDER_TO_MILESTONE_MS,
  LAB_RAD_STALE_PENDING_MS,
} from "./labRadiologyOperationalReconciliation.js";

const order = { id: "ord-1", createdAt: "2026-05-16T08:00:00.000Z", type: "LAB" };

describe("analyzeLabRadOrderItemReconciliation", () => {
  const now = new Date("2026-05-18T12:00:00.000Z");

  it("flags result without collection (lab)", () => {
    const findings = analyzeLabRadOrderItemReconciliation({
      domain: "LAB",
      order,
      item: {
        id: "oi-1",
        status: "RESULTED",
        createdAt: "2026-05-16T08:05:00.000Z",
        result: { verifiedAt: "2026-05-16T15:00:00.000Z" },
      },
      now,
    });
    expect(labRadReconciliationFlags(findings)).toContain("RESULT_WITHOUT_COLLECTION_OR_PERFORMED");
  });

  it("flags delayed order to collection", () => {
    const findings = analyzeLabRadOrderItemReconciliation({
      domain: "LAB",
      order,
      item: {
        id: "oi-1",
        status: "IN_PROGRESS",
        createdAt: "2026-05-16T08:05:00.000Z",
        documentedCollectedAt: "2026-05-16T16:30:00.000Z",
      },
      now,
    });
    expect(order.createdAt).toBeTruthy();
    const delta =
      new Date("2026-05-16T16:30:00.000Z").getTime() - new Date(order.createdAt).getTime();
    expect(delta).toBeGreaterThan(LAB_RAD_DELAY_ORDER_TO_MILESTONE_MS);
    expect(labRadReconciliationFlags(findings)).toContain("DELAYED_ORDER_TO_MILESTONE");
  });

  it("flags delayed collection to result", () => {
    const findings = analyzeLabRadOrderItemReconciliation({
      domain: "LAB",
      order,
      item: {
        id: "oi-1",
        status: "RESULTED",
        createdAt: "2026-05-16T08:05:00.000Z",
        documentedCollectedAt: "2026-05-16T09:00:00.000Z",
        result: { verifiedAt: "2026-05-16T16:00:00.000Z" },
      },
      now,
    });
    const delta =
      new Date("2026-05-16T16:00:00.000Z").getTime() -
      new Date("2026-05-16T09:00:00.000Z").getTime();
    expect(delta).toBeGreaterThan(LAB_RAD_DELAY_MILESTONE_TO_RESULT_MS);
    expect(labRadReconciliationFlags(findings)).toContain("DELAYED_MILESTONE_TO_RESULT");
  });

  it("flags adjusted clinical time transparency", () => {
    const findings = analyzeLabRadOrderItemReconciliation({
      domain: "LAB",
      order,
      item: {
        id: "oi-1",
        status: "RESULTED",
        createdAt: "2026-05-16T08:05:00.000Z",
        documentedCollectedAt: "2026-05-16T14:00:00.000Z",
        effectiveCollectedAt: "2026-05-16T13:00:00.000Z",
        effectiveCollectedAtVersion: 1,
        result: { verifiedAt: "2026-05-16T15:00:00.000Z" },
      },
      now,
    });
    expect(labRadReconciliationFlags(findings)).toContain("ADJUSTED_CLINICAL_TIME");
  });

  it("flags duplicate resulted siblings", () => {
    const item = {
      id: "oi-1",
      status: "RESULTED",
      catalogItemId: "cat-1",
      createdAt: "2026-05-16T08:05:00.000Z",
      documentedCollectedAt: "2026-05-16T09:00:00.000Z",
      result: { verifiedAt: "2026-05-16T10:00:00.000Z" },
    };
    const sibling = {
      id: "oi-2",
      status: "VERIFIED",
      catalogItemId: "cat-1",
      createdAt: "2026-05-16T08:06:00.000Z",
      documentedCollectedAt: "2026-05-16T09:30:00.000Z",
      result: { verifiedAt: "2026-05-16T11:00:00.000Z" },
    };
    const findings = analyzeLabRadOrderItemReconciliation({
      domain: "LAB",
      order,
      item,
      siblingItems: [sibling],
      now,
    });
    expect(labRadReconciliationFlags(findings)).toContain("DUPLICATE_RESULTED");
  });

  it("flags stale pending without milestone", () => {
    const findings = analyzeLabRadOrderItemReconciliation({
      domain: "LAB",
      order: { ...order, createdAt: "2026-05-14T08:00:00.000Z" },
      item: {
        id: "oi-1",
        status: "ACKNOWLEDGED",
        createdAt: "2026-05-14T08:05:00.000Z",
      },
      now,
    });
    expect(now.getTime() - new Date("2026-05-14T08:05:00.000Z").getTime()).toBeGreaterThan(
      LAB_RAD_STALE_PENDING_MS
    );
    expect(labRadReconciliationFlags(findings)).toContain("STALE_PENDING");
  });

  it("flags overnight timing when clinical and documented cross UTC days", () => {
    const findings = analyzeLabRadOrderItemReconciliation({
      domain: "RADIOLOGY",
      order: { id: "ord-r", createdAt: "2026-05-16T20:00:00.000Z", type: "IMAGING" },
      item: {
        id: "oi-r",
        status: "RESULTED",
        createdAt: "2026-05-16T20:05:00.000Z",
        documentedPerformedAt: "2026-05-17T02:00:00.000Z",
        effectivePerformedAt: "2026-05-16T23:30:00.000Z",
        effectivePerformedAtVersion: 1,
        result: { verifiedAt: "2026-05-17T03:00:00.000Z" },
      },
      now,
    });
    expect(labRadReconciliationFlags(findings)).toContain("OVERNIGHT_TIMING");
  });

  it("needsFollowUp excludes adjusted-only transparency", () => {
    const findings = analyzeLabRadOrderItemReconciliation({
      domain: "LAB",
      order,
      item: {
        id: "oi-1",
        status: "RESULTED",
        createdAt: "2026-05-16T08:05:00.000Z",
        documentedCollectedAt: "2026-05-16T08:45:00.000Z",
        effectiveCollectedAt: "2026-05-16T08:40:00.000Z",
        effectiveCollectedAtVersion: 1,
        result: { verifiedAt: "2026-05-16T09:00:00.000Z" },
      },
      now,
    });
    const flags = labRadReconciliationFlags(findings);
    expect(flags).toContain("ADJUSTED_CLINICAL_TIME");
    expect(labRadReconciliationNeedsFollowUp(flags)).toBe(false);
  });
});
