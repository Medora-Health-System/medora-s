import { describe, expect, it } from "vitest";
import { wallClockToUtc } from "./medicationDoseExpansionPlanner.js";
import {
  notesImplyImmediateMarPlacement,
  isNowStatAutoDefaultPlannedAdminArtifact,
  resolveMarShiftTimelineOrderItemFallbackDoseKind,
  resolveMarShiftTimelineOrderItemFallbackDoseStatus,
  resolveMarShiftTimelineOrderItemPlacementInstant,
  shouldCreateMarShiftTimelineOrderItemFallback,
} from "./marShiftTimelineOrderItemFallback.js";

describe("marShiftTimelineOrderItemFallback (M1.8B.7K.6)", () => {
  it("shouldCreateMarShiftTimelineOrderItemFallback allows NOW without dose instances", () => {
    expect(
      shouldCreateMarShiftTimelineOrderItemFallback({
        frequencyCode: "NOW",
        notes: null,
        intendedAdministrationAt: null,
        hasMedicationDoseInstances: false,
        featureFlags: {
          MEDICATION_SCHEDULING_V1: true,
          MEDICATION_DOSE_INSTANCES: true,
        },
      })
    ).toBe(true);
  });

  it("shouldCreateMarShiftTimelineOrderItemFallback skips when dose instances exist", () => {
    expect(
      shouldCreateMarShiftTimelineOrderItemFallback({
        frequencyCode: "NOW",
        notes: null,
        intendedAdministrationAt: null,
        hasMedicationDoseInstances: true,
        featureFlags: { MEDICATION_SCHEDULING_V1: true, MEDICATION_DOSE_INSTANCES: true },
      })
    ).toBe(false);
  });

  it("shouldCreateMarShiftTimelineOrderItemFallback skips recurring BID when expansion allowed", () => {
    expect(
      shouldCreateMarShiftTimelineOrderItemFallback({
        frequencyCode: "BID",
        notes: null,
        intendedAdministrationAt: null,
        hasMedicationDoseInstances: false,
        featureFlags: { MEDICATION_SCHEDULING_V1: true, MEDICATION_DOSE_INSTANCES: true },
      })
    ).toBe(false);
  });

  it("resolveMarShiftTimelineOrderItemPlacementInstant uses createdAt for NOW", () => {
    const createdAt = new Date("2026-06-11T14:07:00.000Z");
    expect(
      resolveMarShiftTimelineOrderItemPlacementInstant({
        createdAt,
        intendedAdministrationAt: null,
        frequencyCode: "NOW",
        notes: null,
      }).toISOString()
    ).toBe(createdAt.toISOString());
  });

  it("resolveMarShiftTimelineOrderItemPlacementInstant uses createdAt for NOW even when intended differs (K.10A)", () => {
    const createdAt = new Date("2026-06-04T02:24:00.000Z");
    const intendedOneHourLater = new Date("2026-06-04T03:24:00.000Z");
    expect(
      resolveMarShiftTimelineOrderItemPlacementInstant({
        createdAt,
        intendedAdministrationAt: intendedOneHourLater,
        frequencyCode: "NOW",
        notes: null,
      }).toISOString()
    ).toBe(createdAt.toISOString());
    expect(
      isNowStatAutoDefaultPlannedAdminArtifact({
        createdAt,
        intendedAdministrationAt: intendedOneHourLater,
        frequencyCode: "NOW",
      })
    ).toBe(true);
  });

  describe("K.10B.3 explicit planned administration placement", () => {
    const haiti = "America/Port-au-Prince";

    it("NOW at 12:21 PM facility → placement 12:21 (not +1h artifact)", () => {
      const createdAt = wallClockToUtc(2026, 6, 12, 12, 21, haiti);
      expect(
        resolveMarShiftTimelineOrderItemPlacementInstant({
          createdAt,
          intendedAdministrationAt: null,
          frequencyCode: "NOW",
          notes: null,
        }).toISOString()
      ).toBe(createdAt.toISOString());
    });

    it("NOW with +1h auto intended → placement createdAt", () => {
      const createdAt = wallClockToUtc(2026, 6, 12, 12, 21, haiti);
      const intendedOneHourLater = new Date(createdAt.getTime() + 60 * 60 * 1000);
      expect(
        resolveMarShiftTimelineOrderItemPlacementInstant({
          createdAt,
          intendedAdministrationAt: intendedOneHourLater,
          frequencyCode: "NOW",
          notes: null,
        }).toISOString()
      ).toBe(createdAt.toISOString());
    });

    it("provider-selected 06:00 AM → placement 06:00 AM", () => {
      const createdAt = wallClockToUtc(2026, 6, 12, 12, 21, haiti);
      const plannedSixAm = wallClockToUtc(2026, 6, 12, 6, 0, haiti);
      expect(
        resolveMarShiftTimelineOrderItemPlacementInstant({
          createdAt,
          intendedAdministrationAt: plannedSixAm,
          frequencyCode: "NOW",
          notes: "give now",
        }).toISOString()
      ).toBe(plannedSixAm.toISOString());
    });

    it("provider-selected 11:35 PM → placement 11:35 PM", () => {
      const createdAt = wallClockToUtc(2026, 6, 11, 23, 5, haiti);
      const planned = wallClockToUtc(2026, 6, 11, 23, 35, haiti);
      expect(
        resolveMarShiftTimelineOrderItemPlacementInstant({
          createdAt,
          intendedAdministrationAt: planned,
          frequencyCode: "NOW",
          notes: null,
        }).toISOString()
      ).toBe(planned.toISOString());
    });
  });

  it("resolveMarShiftTimelineOrderItemPlacementInstant prefers intendedAdministrationAt for ONCE", () => {
    const planned = new Date("2026-06-11T17:00:00.000Z");
    expect(
      resolveMarShiftTimelineOrderItemPlacementInstant({
        createdAt: new Date("2026-06-11T14:07:00.000Z"),
        intendedAdministrationAt: planned,
        frequencyCode: "ONCE",
        notes: null,
      }).toISOString()
    ).toBe(planned.toISOString());
  });

  it("notesImplyImmediateMarPlacement detects stat in notes", () => {
    expect(notesImplyImmediateMarPlacement("Normal Saline IV stat")).toBe(true);
  });

  it("resolveMarShiftTimelineOrderItemFallbackDoseKind maps IVPB route", () => {
    expect(resolveMarShiftTimelineOrderItemFallbackDoseKind("IVPB")).toBe("IVPB_SESSION");
    expect(resolveMarShiftTimelineOrderItemFallbackDoseKind("IV")).toBe("FIXED_ADMINISTRATION");
  });

  it("resolveMarShiftTimelineOrderItemFallbackDoseStatus maps active IVPB", () => {
    expect(
      resolveMarShiftTimelineOrderItemFallbackDoseStatus({
        orderItemCompleted: false,
        isIvpb: true,
        activeInfusionSession: true,
        hasCompletedAdministration: false,
      })
    ).toBe("IN_PROGRESS");
  });

  it("resolveMarShiftTimelineOrderItemFallbackDoseStatus maps IVPB order line IN_PROGRESS without session", () => {
    expect(
      resolveMarShiftTimelineOrderItemFallbackDoseStatus({
        orderItemCompleted: false,
        isIvpb: true,
        activeInfusionSession: false,
        orderItemInProgress: true,
        hasCompletedAdministration: false,
      })
    ).toBe("IN_PROGRESS");
  });
});
