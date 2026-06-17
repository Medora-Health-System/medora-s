import { describe, expect, it } from "vitest";
import {
  buildMarInfusionTimelinePlacement,
  resolveMarClinicalDoseTimelinePlacementInstant,
} from "@medora/shared";

describe("marInfusionClinicalPlacement (H9K)", () => {
  const scheduledAt = new Date("2026-06-03T14:00:00.000Z");

  it("infusion start placed at clinical start time", () => {
    expect(
      buildMarInfusionTimelinePlacement({
        doseStatus: "IN_PROGRESS",
        scheduledAt,
        startedAt: "2026-06-03T09:00:00.000Z",
        isContinuousFluid: true,
      }).toISOString()
    ).toBe("2026-06-03T09:00:00.000Z");
  });

  it("infusion stop placed at clinical stop time", () => {
    expect(
      buildMarInfusionTimelinePlacement({
        doseStatus: "COMPLETED",
        scheduledAt,
        startedAt: "2026-06-03T09:00:00.000Z",
        stoppedAt: "2026-06-03T11:00:00.000Z",
        isContinuousFluid: true,
      }).toISOString()
    ).toBe("2026-06-03T11:00:00.000Z");
  });

  it("continuous fluid dose placement uses clinical start", () => {
    const placement = resolveMarClinicalDoseTimelinePlacementInstant({
      doseStatus: "IN_PROGRESS",
      doseKind: "FIXED_ADMINISTRATION",
      scheduledAt,
      fluid: {
        isContinuousFluid: true,
        continuousFluidStatus: "RUNNING",
        fluidStartedAt: "2026-06-03T09:00:00.000Z",
      },
    });
    expect(placement.toISOString()).toBe("2026-06-03T09:00:00.000Z");
  });
});
