import { describe, expect, it } from "vitest";
import { normalizeMedicationAdministrationHistoryMarRow } from "./medicationAdministrationHistoryNormalization.js";
import { buildMarScheduleTimingDocumentation } from "./marAdministrationSafetyGovernance.js";

describe("marAdministrationVarianceHistory", () => {
  it("emits EARLY_ADMINISTRATION with variance metadata", () => {
    const notes = buildMarScheduleTimingDocumentation({
      kind: "early",
      reasonCode: "CLINICAL_CONDITION",
      minutesDelta: 120,
    });
    const entry = normalizeMedicationAdministrationHistoryMarRow({
      id: "mar-1",
      encounterId: "enc-1",
      orderItemId: "oi-1",
      administeredAt: "2026-06-03T21:00:00.000Z",
      medicationLabelSnapshot: "Rocephin",
      route: "IV",
      marAction: "administered",
      notes,
      doseScheduledAt: "2026-06-03T23:00:00.000Z",
    });
    expect(entry.eventType).toBe("EARLY_ADMINISTRATION");
    expect(entry.varianceMinutes).toBe(-120);
    expect(entry.effectiveScheduledAt).toBe("2026-06-03T23:00:00.000Z");
    expect(entry.reasonCode).toBe("CLINICAL_CONDITION");
  });

  it("emits LATE_ADMINISTRATION with variance metadata", () => {
    const notes = buildMarScheduleTimingDocumentation({
      kind: "late",
      reasonCode: "PATIENT_OFF_UNIT",
      minutesDelta: 165,
    });
    const entry = normalizeMedicationAdministrationHistoryMarRow({
      id: "mar-2",
      encounterId: "enc-1",
      orderItemId: "oi-2",
      administeredAt: "2026-06-03T12:45:00.000Z",
      medicationLabelSnapshot: "Lasix",
      route: "IV",
      marAction: "administered",
      notes,
      doseScheduledAt: "2026-06-03T10:00:00.000Z",
    });
    expect(entry.eventType).toBe("LATE_ADMINISTRATION");
    expect(entry.varianceMinutes).toBe(165);
  });

  it("classifies on-time after reschedule using effective schedule", () => {
    const entry = normalizeMedicationAdministrationHistoryMarRow({
      id: "mar-3",
      encounterId: "enc-1",
      orderItemId: "oi-3",
      administeredAt: "2026-06-03T21:05:00.000Z",
      medicationLabelSnapshot: "Med",
      marAction: "administered",
      doseScheduledAt: "2026-06-03T21:00:00.000Z",
      doseOrderedDoseSnapshotJson: {
        _marScheduleAdjustmentHistory: [
          {
            originalScheduledAt: "2026-06-03T23:00:00.000Z",
            previousScheduledAt: "2026-06-03T23:00:00.000Z",
            newScheduledAt: "2026-06-03T21:00:00.000Z",
          },
        ],
      },
    });
    expect(entry.eventType).toBe("ADMINISTERED");
    expect(entry.varianceMinutes).toBe(5);
  });
});
