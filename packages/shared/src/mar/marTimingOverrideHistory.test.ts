import { describe, expect, it } from "vitest";
import { buildMarScheduleTimingDocumentation } from "./marAdministrationSafetyGovernance.js";
import { normalizeMedicationAdministrationHistoryMarRow } from "./medicationAdministrationHistoryNormalization.js";
import { normalizeMedicationAdministrationHistoryScheduleAdjustmentRow } from "./medicationAdministrationHistoryNormalization.js";
import { resolveMarMedicationTimingOverrideReasonLabel } from "./marMedicationTimingOverrideGovernance.js";
import { resolveMarRescheduleReasonLabelKey } from "./marScheduleReschedulingGovernance.js";

describe("marTimingOverrideHistory", () => {
  it("reconstructs schedule change with canonical reason label", () => {
    const row = normalizeMedicationAdministrationHistoryScheduleAdjustmentRow({
      medicationDoseInstanceId: "dose-1",
      encounterId: "enc-1",
      orderItemId: "oi-1",
      medicationLabel: "Acetaminophen",
      originalScheduledAt: "2026-06-03T03:00:00.000Z",
      previousScheduledAt: "2026-06-03T03:00:00.000Z",
      newScheduledAt: "2026-06-03T01:00:00.000Z",
      reasonCode: "PROCEDURE_SCHEDULE",
      changedAt: "2026-06-03T00:47:00.000Z",
      changedByUserId: "rn-1",
      changedByDisplay: "Elizabeth Posada RN",
      riskSeverity: "MODERATE",
      reviewRecommended: false,
    });
    expect(row.eventType).toBe("SCHEDULE_TIME_CHANGED");
    expect(resolveMarRescheduleReasonLabelKey(row.reasonCode)).toBe(
      "marTimingOverride.reason.PROCEDURE_SCHEDULE"
    );
    expect(resolveMarMedicationTimingOverrideReasonLabel(row.reasonCode, "en")).toBe(
      "Procedure schedule"
    );
  });

  it("reconstructs early administration with reason", () => {
    const notes = buildMarScheduleTimingDocumentation({
      kind: "early",
      reasonCode: "CLINICAL_CONDITION",
      minutesDelta: 120,
    });
    const entry = normalizeMedicationAdministrationHistoryMarRow({
      id: "mar-early",
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
    expect(entry.reasonCode).toBe("CLINICAL_CONDITION");
    expect(resolveMarMedicationTimingOverrideReasonLabel(entry.reasonCode, "en")).toBe(
      "Clinical condition"
    );
  });

  it("reconstructs late administration with reason", () => {
    const notes = buildMarScheduleTimingDocumentation({
      kind: "late",
      reasonCode: "PATIENT_OFF_UNIT",
      minutesDelta: 165,
    });
    const entry = normalizeMedicationAdministrationHistoryMarRow({
      id: "mar-late",
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
    expect(entry.reasonCode).toBe("PATIENT_OFF_UNIT");
    expect(resolveMarMedicationTimingOverrideReasonLabel(entry.reasonCode, "en")).toBe(
      "Patient off unit"
    );
  });

  it("reconstructs full compliance chain: original schedule, changes, administration", () => {
    const originalScheduledAt = "2026-06-03T23:00:00.000Z";
    const effectiveScheduledAt = "2026-06-03T21:00:00.000Z";
    const scheduleRow = normalizeMedicationAdministrationHistoryScheduleAdjustmentRow({
      medicationDoseInstanceId: "dose-1",
      encounterId: "enc-1",
      orderItemId: "oi-1",
      medicationLabel: "Med",
      originalScheduledAt,
      previousScheduledAt: originalScheduledAt,
      newScheduledAt: effectiveScheduledAt,
      reasonCode: "PROCEDURE_SCHEDULE",
      changedAt: "2026-06-03T20:30:00.000Z",
      changedByUserId: "rn-1",
      changedByDisplay: "Nurse A",
    });
    const adminRow = normalizeMedicationAdministrationHistoryMarRow({
      id: "mar-1",
      encounterId: "enc-1",
      orderItemId: "oi-1",
      administeredAt: "2026-06-03T21:05:00.000Z",
      medicationLabelSnapshot: "Med",
      marAction: "administered",
      doseScheduledAt: effectiveScheduledAt,
      doseOrderedDoseSnapshotJson: {
        _marScheduleAdjustmentHistory: [
          {
            originalScheduledAt,
            previousScheduledAt: originalScheduledAt,
            newScheduledAt: effectiveScheduledAt,
            reasonCode: "PROCEDURE_SCHEDULE",
            changedByUserId: "rn-1",
            changedAt: "2026-06-03T20:30:00.000Z",
          },
        ],
      },
    });
    expect(scheduleRow.originalScheduledAt).toBe(originalScheduledAt);
    expect(scheduleRow.newScheduledAt).toBe(effectiveScheduledAt);
    expect(adminRow.effectiveScheduledAt).toBe(effectiveScheduledAt);
    expect(adminRow.varianceMinutes).toBe(5);
    expect(adminRow.eventType).toBe("ADMINISTERED");
  });
});
