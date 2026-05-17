import { describe, expect, it } from "vitest";
import { analyzeLabRadWorklistItem } from "./labRadiologyOperationalReconciliationUi";

describe("analyzeLabRadWorklistItem", () => {
  const order = { id: "ord-1", createdAt: "2026-05-16T08:00:00.000Z", type: "LAB" };

  it("maps lab delayed collection label key", () => {
    const r = analyzeLabRadWorklistItem({
      domain: "LAB",
      order,
      item: {
        id: "oi-1",
        status: "IN_PROGRESS",
        createdAt: "2026-05-16T08:05:00.000Z",
        documentedCollectedAt: "2026-05-16T16:30:00.000Z",
      },
      now: new Date("2026-05-16T18:00:00.000Z"),
    });
    expect(r.badges.some((b) => b.labelKey === "labRadReconciliation.lab.delayedCollection")).toBe(true);
  });

  it("maps radiology adjusted performed label key", () => {
    const r = analyzeLabRadWorklistItem({
      domain: "RADIOLOGY",
      order: { id: "ord-r", createdAt: order.createdAt, type: "IMAGING" },
      item: {
        id: "oi-r",
        status: "RESULTED",
        createdAt: "2026-05-16T08:05:00.000Z",
        documentedPerformedAt: "2026-05-16T14:00:00.000Z",
        effectivePerformedAt: "2026-05-16T13:00:00.000Z",
        effectivePerformedAtVersion: 1,
        result: { verifiedAt: "2026-05-16T15:00:00.000Z" },
      },
    });
    expect(r.badges.some((b) => b.labelKey === "labRadReconciliation.rad.adjustedPerformedTime")).toBe(
      true
    );
  });
});
