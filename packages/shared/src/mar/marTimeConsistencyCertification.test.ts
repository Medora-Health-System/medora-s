import { describe, expect, it } from "vitest";
import { wallClockToUtc } from "../medication/medicationDoseExpansionPlanner.js";
import {
  formatMedicationTimeInFacilityZone,
  resolveMedicationClinicalDisplayTime,
} from "../clinical/clinicalTimeZone.js";
import {
  buildMarTimeConsistencySnapshot,
  certifyMarTimeConsistency,
  detectMarOneHourModalTimelineMismatch,
  detectMarTimeConsistencyOneHourOffsetRegression,
} from "./marTimeConsistencyCertification.js";

describe("marTimeConsistencyCertification (MEDUI.ED.MAR.TIME.CERTIFICATION.1)", () => {
  const haiti = "America/Port-au-Prince";
  const chicago = "America/Chicago";

  it("15 — order display time equals prescription display time", () => {
    const instant = wallClockToUtc(2026, 6, 12, 14, 0, haiti);
    const snapshot = buildMarTimeConsistencySnapshot({
      storedUtcIso: instant.toISOString(),
      facilityTimezone: haiti,
    });
    expect(snapshot.orderDisplayTime).toBe(snapshot.prescriptionDisplayTime);
  });

  it("16 — prescription display time equals dose scheduled display time", () => {
    const instant = wallClockToUtc(2026, 6, 12, 14, 0, haiti);
    const snapshot = buildMarTimeConsistencySnapshot({
      storedUtcIso: instant.toISOString(),
      facilityTimezone: haiti,
    });
    expect(snapshot.prescriptionDisplayTime).toBe(snapshot.doseScheduledDisplayTime);
  });

  it("17 — dose scheduled display time equals MAR timeline display time", () => {
    const instant = wallClockToUtc(2026, 6, 12, 14, 0, haiti);
    const snapshot = buildMarTimeConsistencySnapshot({
      storedUtcIso: instant.toISOString(),
      facilityTimezone: haiti,
    });
    expect(snapshot.doseScheduledDisplayTime).toBe(snapshot.marTimelineDisplayTime);
  });

  it("18 — MAR timeline display time equals administration modal default", () => {
    const instant = wallClockToUtc(2026, 6, 12, 14, 0, haiti);
    const snapshot = buildMarTimeConsistencySnapshot({
      storedUtcIso: instant.toISOString(),
      facilityTimezone: haiti,
    });
    expect(snapshot.marTimelineDisplayTime).toBe(snapshot.administrationModalDisplayTime);
  });

  it("19 — administration modal time equals history rail clinical time", () => {
    const instant = wallClockToUtc(2026, 6, 12, 14, 0, haiti);
    const snapshot = buildMarTimeConsistencySnapshot({
      storedUtcIso: instant.toISOString(),
      facilityTimezone: haiti,
    });
    expect(snapshot.administrationModalDisplayTime).toBe(snapshot.historyRailDisplayTime);
  });

  it("20 — browser timezone does not change facility display", () => {
    const instant = wallClockToUtc(2026, 6, 12, 14, 0, haiti);
    const facilityDisplay = resolveMedicationClinicalDisplayTime({
      iso: instant,
      facilityTimezone: haiti,
    });
    const utcDisplay = resolveMedicationClinicalDisplayTime({
      iso: instant,
      facilityTimezone: "UTC",
    });
    expect(facilityDisplay).not.toBe(utcDisplay);
  });

  it("21 — facility timezone conversion handles America/Port-au-Prince", () => {
    const instant = wallClockToUtc(2026, 6, 12, 14, 0, haiti);
    const display = formatMedicationTimeInFacilityZone({
      iso: instant,
      facilityTimezone: haiti,
    });
    expect(display).toMatch(/2:00/);
  });

  it("22 — facility timezone conversion handles America/Chicago", () => {
    const instant = wallClockToUtc(2026, 6, 12, 14, 0, chicago);
    const display = formatMedicationTimeInFacilityZone({
      iso: instant,
      facilityTimezone: chicago,
    });
    expect(display).toMatch(/2:00/);
  });

  it("23 — UTC stored instant remains unchanged", () => {
    const instant = wallClockToUtc(2026, 6, 12, 14, 0, haiti);
    const iso = instant.toISOString();
    const snapshot = buildMarTimeConsistencySnapshot({
      storedUtcIso: iso,
      facilityTimezone: haiti,
    });
    expect(snapshot.storedUtcIso).toBe(iso);
    expect(new Date(snapshot.storedUtcIso).toISOString()).toBe(iso);
  });

  it("24 — mismatch >= 1 minute fails certification", () => {
    const instant = wallClockToUtc(2026, 6, 12, 14, 0, haiti);
    const snapshot = buildMarTimeConsistencySnapshot({
      storedUtcIso: instant.toISOString(),
      facilityTimezone: haiti,
    });
    snapshot.marTimelineDisplayTime = "wrong time";
    const result = certifyMarTimeConsistency(snapshot);
    expect(result.ok).toBe(false);
    expect(result.mismatches.length).toBeGreaterThan(0);
  });

  it("25 — exact match passes certification", () => {
    const instant = wallClockToUtc(2026, 6, 12, 14, 0, haiti);
    const snapshot = buildMarTimeConsistencySnapshot({
      storedUtcIso: instant.toISOString(),
      facilityTimezone: haiti,
    });
    expect(certifyMarTimeConsistency(snapshot).ok).toBe(true);
  });

  it("26 — no double conversion", () => {
    const instant = wallClockToUtc(2026, 6, 12, 14, 0, haiti);
    const once = resolveMedicationClinicalDisplayTime({ iso: instant, facilityTimezone: haiti });
    const twice = resolveMedicationClinicalDisplayTime({
      iso: new Date(instant.toISOString()),
      facilityTimezone: haiti,
    });
    expect(once).toBe(twice);
  });

  it("27 — order/MAR 1-hour offset regression test fails if offset reappears", () => {
    const instant = wallClockToUtc(2026, 6, 12, 14, 0, haiti);
    const facilityDisplay = resolveMedicationClinicalDisplayTime({
      iso: instant,
      facilityTimezone: haiti,
    });
    const timeMatch = /(\d{1,2}):(\d{2})/.exec(facilityDisplay);
    expect(timeMatch).not.toBeNull();
    const wrongHour = (Number(timeMatch![1]) + 1) % 24;
    const wrongOffsetDisplay = facilityDisplay.replace(
      timeMatch![0],
      `${wrongHour}:${timeMatch![2]}`
    );
    expect(
      detectMarTimeConsistencyOneHourOffsetRegression({
        storedUtcIso: instant.toISOString(),
        facilityTimezone: haiti,
        browserOffsetDisplayTime: wrongOffsetDisplay,
      })
    ).toBe(true);
    expect(
      detectMarTimeConsistencyOneHourOffsetRegression({
        storedUtcIso: instant.toISOString(),
        facilityTimezone: haiti,
        browserOffsetDisplayTime: facilityDisplay,
      })
    ).toBe(false);
  });

  it("detectMarOneHourModalTimelineMismatch catches timeline vs modal 1-hour drift", () => {
    const instant = wallClockToUtc(2026, 6, 19, 2, 0, chicago);
    const iso = instant.toISOString();
    const timeline = formatMedicationTimeInFacilityZone({
      iso,
      facilityTimezone: chicago,
      locale: "en-US",
    });
    const wrongModal = formatMedicationTimeInFacilityZone({
      iso,
      facilityTimezone: "America/New_York",
      locale: "en-US",
    });
    expect(
      detectMarOneHourModalTimelineMismatch({
        storedUtcIso: iso,
        facilityTimezone: chicago,
        timelineDisplayTime: timeline,
        modalDisplayTime: wrongModal,
      })
    ).toBe(true);
  });
});
