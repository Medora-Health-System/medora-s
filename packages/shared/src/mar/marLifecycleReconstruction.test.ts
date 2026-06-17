import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assessMarHistoryEntryReconstruction,
  resolveMarLifecycleHistoryEventTypes,
} from "./marAuditCertification.js";
import { buildMarScheduleTimingDocumentation } from "./marAdministrationSafetyGovernance.js";
import {
  normalizeMedicationAdministrationHistoryCorrectionRow,
  normalizeMedicationAdministrationHistoryMarRow,
  normalizeMedicationAdministrationHistoryOrderCancelRow,
  normalizeMedicationAdministrationHistoryScheduleAdjustmentRow,
} from "./medicationAdministrationHistoryNormalization.js";
import {
  appendMarDoseScheduleAdjustmentHistory,
  buildMarDoseScheduleAdjustmentAuditEntry,
  readMarDoseScheduleAdjustmentHistory,
} from "../medication/marDoseScheduleAdjustment.js";
import { buildMedicationInfusionStopNotes } from "../medication/medicationInfusionStopReasonGovernance.js";

const repoRoot = join(import.meta.dirname, "../../../..");

function readApiSrc(relativePath: string): string {
  return readFileSync(join(repoRoot, "apps/api/src", relativePath), "utf8");
}

describe("marLifecycleReconstruction", () => {
  it("reconstructs every governed MAR history event type from normalization", () => {
    const earlyNotes = buildMarScheduleTimingDocumentation({
      kind: "early",
      reasonCode: "CLINICAL_CONDITION",
      minutesDelta: 121,
    });
    const lateNotes = buildMarScheduleTimingDocumentation({
      kind: "late",
      reasonCode: "PATIENT_OFF_UNIT",
      minutesDelta: 165,
    });

    const cases = [
      normalizeMedicationAdministrationHistoryMarRow({
        id: "mar-admin",
        encounterId: "enc-1",
        orderItemId: "oi-1",
        administeredAt: "2026-06-03T21:05:00.000Z",
        medicationLabelSnapshot: "Med",
        marAction: "administered",
        doseScheduledAt: "2026-06-03T21:00:00.000Z",
        performedByFirstName: "Nurse",
        performedByLastName: "A",
      }),
      normalizeMedicationAdministrationHistoryMarRow({
        id: "mar-early",
        encounterId: "enc-1",
        orderItemId: "oi-1",
        administeredAt: "2026-06-03T21:00:00.000Z",
        medicationLabelSnapshot: "Med",
        marAction: "administered",
        notes: earlyNotes,
        doseScheduledAt: "2026-06-03T23:01:00.000Z",
        performedByFirstName: "Nurse",
        performedByLastName: "A",
      }),
      normalizeMedicationAdministrationHistoryMarRow({
        id: "mar-late",
        encounterId: "enc-1",
        orderItemId: "oi-1",
        administeredAt: "2026-06-03T12:45:00.000Z",
        medicationLabelSnapshot: "Med",
        marAction: "administered",
        notes: lateNotes,
        doseScheduledAt: "2026-06-03T10:00:00.000Z",
        performedByFirstName: "Nurse",
        performedByLastName: "A",
      }),
      normalizeMedicationAdministrationHistoryMarRow({
        id: "mar-refused",
        encounterId: "enc-1",
        orderItemId: "oi-1",
        administeredAt: "2026-06-03T10:00:00.000Z",
        medicationLabelSnapshot: "Med",
        marAction: "refused",
        notes: "Refused: PATIENT_REFUSED",
        performedByFirstName: "Nurse",
        performedByLastName: "A",
      }),
      normalizeMedicationAdministrationHistoryMarRow({
        id: "mar-missed",
        encounterId: "enc-1",
        orderItemId: "oi-1",
        administeredAt: "2026-06-03T10:00:00.000Z",
        medicationLabelSnapshot: "Med",
        marAction: "not_available",
        notes: "Missed: PATIENT_OFF_UNIT",
        performedByFirstName: "Nurse",
        performedByLastName: "A",
      }),
      normalizeMedicationAdministrationHistoryScheduleAdjustmentRow({
        medicationDoseInstanceId: "dose-1",
        encounterId: "enc-1",
        orderItemId: "oi-1",
        medicationLabel: "Med",
        originalScheduledAt: "2026-06-03T23:00:00.000Z",
        previousScheduledAt: "2026-06-03T23:00:00.000Z",
        newScheduledAt: "2026-06-03T21:00:00.000Z",
        reasonCode: "PROCEDURE_SCHEDULE",
        changedAt: "2026-06-03T20:00:00.000Z",
        changedByUserId: "rn-1",
        changedByDisplay: "Nurse A",
      }),
      normalizeMedicationAdministrationHistoryCorrectionRow({
        id: "corr-1",
        facilityId: "fac-1",
        medicationAdministrationId: "mar-admin",
        encounterId: "enc-1",
        orderItemId: "oi-1",
        medicationLabel: "Med",
        correctionReason: "DOCUMENTED_NOT_GIVEN",
        createdAt: "2026-06-03T22:00:00.000Z",
        correctedByFirstName: "Nurse",
        correctedByLastName: "B",
        previousValues: { marAction: "administered" },
        correctedValues: { marAction: "not_available" },
      }),
      normalizeMedicationAdministrationHistoryOrderCancelRow({
        orderItemId: "oi-cancel",
        encounterId: "enc-1",
        medicationLabel: "Med",
        doseDisplay: null,
        route: "PO",
        cancelledAt: "2026-06-03T18:00:00.000Z",
        performedByDisplay: "Dr A",
        cancellationReason: "DISCONTINUED",
      }),
      normalizeMedicationAdministrationHistoryMarRow({
        id: "mar-start",
        encounterId: "enc-1",
        orderItemId: "oi-iv",
        administeredAt: "2026-06-03T10:00:00.000Z",
        medicationLabelSnapshot: "IV",
        marAction: "administered",
        infusionPhase: "INFUSION_START",
        performedByFirstName: "Nurse",
        performedByLastName: "C",
      }),
      normalizeMedicationAdministrationHistoryMarRow({
        id: "mar-stop",
        encounterId: "enc-1",
        orderItemId: "oi-iv",
        administeredAt: "2026-06-03T12:00:00.000Z",
        medicationLabelSnapshot: "IV",
        marAction: "administered",
        notes: buildMedicationInfusionStopNotes({
          durationMinutes: 120,
          stopReasonCode: "COMPLETED",
        }),
        infusionPhase: "INFUSION_STOP",
        performedByFirstName: "Nurse",
        performedByLastName: "C",
      }),
    ];

    for (const entry of cases) {
      expect(entry.readOnly).toBe(true);
      expect(entry.eventAt).toBeTruthy();
      const result = assessMarHistoryEntryReconstruction(entry, {
        knownMarIds: new Set(cases.filter((c) => c.source === "MAR").map((c) => c.id)),
        infusionStartOrderItemIds: new Set(["oi-iv"]),
      });
      expect(result.reconstructable, entry.eventType).toBe(true);
    }
  });

  it("preserves append-only schedule adjustment chain", () => {
    let snapshot: Record<string, unknown> = {};
    const original = "2026-06-03T03:00:00.000Z";
    for (let i = 0; i < 2; i++) {
      const entry = buildMarDoseScheduleAdjustmentAuditEntry({
        doseStatus: "PLANNED",
        originalScheduledAt: original,
        previousScheduledAt: new Date(Date.parse(original) + i * 3_600_000).toISOString(),
        newScheduledAt: new Date(Date.parse(original) + (i + 1) * 3_600_000).toISOString(),
        reasonCode: "PATIENT_SLEEPING",
        changedByUserId: "rn-1",
        facilityTimeZone: "UTC",
      });
      snapshot = appendMarDoseScheduleAdjustmentHistory(snapshot, entry);
    }
    const history = readMarDoseScheduleAdjustmentHistory(snapshot);
    expect(history).toHaveLength(2);
    expect(history[0].originalScheduledAt).toBe(original);
    expect(history[1].originalScheduledAt).toBe(original);
  });

  it("maps lifecycle pathways to reconstructable history event types", () => {
    expect(resolveMarLifecycleHistoryEventTypes("EARLY_ADMINISTRATION")).toEqual([
      "EARLY_ADMINISTRATION",
    ]);
    expect(resolveMarLifecycleHistoryEventTypes("ORDER_CANCELLED")).toEqual(["ORDER_CANCELED"]);
    expect(resolveMarLifecycleHistoryEventTypes("CHARTED_NOT_GIVEN")).toEqual([
      "ADMINISTRATION_CORRECTION",
    ]);
  });

  it("API service has no medicationAdministration.delete path", () => {
    const serviceSrc = readApiSrc("medication-administration/medication-administration.service.ts");
    expect(serviceSrc).not.toContain("medicationAdministration.delete");
  });

  it("schedule adjustment service appends history without removing prior entries", () => {
    const serviceSrc = readApiSrc(
      "medication-dose/medication-dose-schedule-adjustment.service.ts"
    );
    expect(serviceSrc).toContain("appendMarDoseScheduleAdjustmentHistory");
    expect(serviceSrc).not.toContain("delete");
  });
});
