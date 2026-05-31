import { describe, expect, it } from "vitest";
import { compareLabRadWorklistPairs } from "@medora/shared";

function escalationStub(
  overrides: Partial<{
    urgencyRank: number;
    phaseAnchorMs: number;
    lastUpdatedMs: number;
    awaitingCriticalAck: boolean;
    phaseAgeMs: number;
  }> = {}
) {
  return {
    phase: "LAB_AWAITING_COLLECTION" as const,
    phaseAgeMs: 0,
    agingBucket: "ON_TRACK" as const,
    escalationFlags: [],
    needsEscalation: false,
    awaitingResultOrFinalization: false,
    awaitingCriticalAck: false,
    shiftHandoffReview: false,
    urgencyRank: 100,
    phaseAnchorMs: 1_000,
    lastUpdatedMs: 1_000,
    ...overrides,
  };
}

describe("compareLabRadWorklistPairs — LAB.ED.1 stable ordering", () => {
  it("keeps PLACED vs ACKNOWLEDGED order stable when urgency rank ties", () => {
    const placed = {
      escalation: escalationStub({ urgencyRank: 100, lastUpdatedMs: 9_000 }),
      orderCreatedMs: 1_000,
      itemId: "item-a",
    };
    const acknowledged = {
      escalation: escalationStub({ urgencyRank: 100, lastUpdatedMs: 9_999 }),
      orderCreatedMs: 1_000,
      itemId: "item-b",
    };

    expect(compareLabRadWorklistPairs(placed, acknowledged, "MOST_URGENT")).toBeLessThan(0);
    expect(compareLabRadWorklistPairs(placed, acknowledged, "OLDEST_FIRST")).toBeLessThan(0);
  });

  it("uses order created time then item id as tie-breaker", () => {
    const older = {
      escalation: escalationStub({ urgencyRank: 50 }),
      orderCreatedMs: 1_000,
      itemId: "b",
    };
    const newer = {
      escalation: escalationStub({ urgencyRank: 50 }),
      orderCreatedMs: 2_000,
      itemId: "a",
    };
    expect(compareLabRadWorklistPairs(older, newer, "MOST_URGENT")).toBeLessThan(0);
  });
});
