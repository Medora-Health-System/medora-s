import { describe, expect, it } from "vitest";
import {
  buildMarIvpbTimelinePlacement,
  resolveMarClinicalDoseTimelinePlacementInstant,
} from "@medora/shared";

describe("marIvpbClinicalPlacement (H9K)", () => {
  const scheduledAt = new Date("2026-06-03T14:00:00.000Z");

  it("IVPB start placed at clinical start time", () => {
    expect(
      buildMarIvpbTimelinePlacement({
        doseStatus: "IN_PROGRESS",
        scheduledAt,
        startedAt: "2026-06-03T09:00:00.000Z",
      }).toISOString()
    ).toBe("2026-06-03T09:00:00.000Z");
  });

  it("IVPB stop placed at clinical stop time", () => {
    expect(
      buildMarIvpbTimelinePlacement({
        doseStatus: "COMPLETED",
        scheduledAt,
        startedAt: "2026-06-03T09:00:00.000Z",
        stoppedAt: "2026-06-03T10:30:00.000Z",
      }).toISOString()
    ).toBe("2026-06-03T10:30:00.000Z");
  });

  it("IVPB dose placement resolver uses enrichment clinical stop", () => {
    const placement = resolveMarClinicalDoseTimelinePlacementInstant({
      doseStatus: "COMPLETED",
      doseKind: "IVPB_SESSION",
      scheduledAt,
      enrichment: {
        startedAt: "2026-06-03T09:00:00.000Z",
        stoppedAt: "2026-06-03T10:30:00.000Z",
        administeredAt: null,
      },
    });
    expect(placement.toISOString()).toBe("2026-06-03T10:30:00.000Z");
  });
});
