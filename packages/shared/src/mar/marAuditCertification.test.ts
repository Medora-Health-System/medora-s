import { describe, expect, it } from "vitest";
import {
  MAR_NON_DESTRUCTIVE_GOVERNANCE_RULES,
  buildMarAuditReconstructionScore,
  certifyMarNonDestructiveGovernance,
  detectMarGovernanceGaps,
} from "./marAuditCertification.js";
import { MEDICATION_ADMINISTRATION_CORRECTION_GOVERNANCE } from "./medicationAdministrationCorrectionGovernance.js";
import { buildMarScheduleTimingDocumentation } from "./marAdministrationSafetyGovernance.js";
import {
  normalizeMedicationAdministrationHistoryCorrectionRow,
  normalizeMedicationAdministrationHistoryMarRow,
  normalizeMedicationAdministrationHistoryOrderCancelRow,
  normalizeMedicationAdministrationHistoryScheduleAdjustmentRow,
} from "./medicationAdministrationHistoryNormalization.js";
import { buildMedicationInfusionStopNotes } from "../medication/medicationInfusionStopReasonGovernance.js";

describe("marAuditCertification", () => {
  it("certifies non-destructive governance invariants", () => {
    const result = certifyMarNonDestructiveGovernance();
    expect(result.pass).toBe(true);
    expect(result.checks).toHaveLength(MAR_NON_DESTRUCTIVE_GOVERNANCE_RULES.length);
    expect(
      MEDICATION_ADMINISTRATION_CORRECTION_GOVERNANCE.forbiddenMutations
    ).toContain("medicationAdministration.delete");
  });

  it("scores fully reconstructable governed history at 100", () => {
    const earlyNotes = buildMarScheduleTimingDocumentation({
      kind: "early",
      reasonCode: "CLINICAL_CONDITION",
      minutesDelta: 121,
    });
    const entries = [
      normalizeMedicationAdministrationHistoryMarRow({
        id: "mar-1",
        encounterId: "enc-1",
        orderItemId: "oi-1",
        administeredAt: "2026-06-03T21:00:00.000Z",
        medicationLabelSnapshot: "Med",
        marAction: "administered",
        notes: earlyNotes,
        doseScheduledAt: "2026-06-03T23:01:00.000Z",
        performedByFirstName: "Jane",
        performedByLastName: "Smith",
        performedByRole: "RN",
      }),
      normalizeMedicationAdministrationHistoryScheduleAdjustmentRow({
        medicationDoseInstanceId: "dose-1",
        encounterId: "enc-1",
        orderItemId: "oi-1",
        medicationLabel: "Med",
        originalScheduledAt: "2026-06-03T23:00:00.000Z",
        previousScheduledAt: "2026-06-03T23:00:00.000Z",
        newScheduledAt: "2026-06-03T23:01:00.000Z",
        reasonCode: "PROCEDURE_SCHEDULE",
        changedAt: "2026-06-03T20:30:00.000Z",
        changedByUserId: "rn-1",
        changedByDisplay: "Nurse A",
      }),
      normalizeMedicationAdministrationHistoryCorrectionRow({
        id: "corr-1",
        facilityId: "fac-1",
        medicationAdministrationId: "mar-1",
        encounterId: "enc-1",
        orderItemId: "oi-1",
        medicationLabel: "Med",
        correctionReason: "DOCUMENTED_WRONG_TIME",
        createdAt: "2026-06-03T22:00:00.000Z",
        correctedByFirstName: "Nurse",
        correctedByLastName: "B",
        correctedByRole: "RN",
        previousValues: { effectiveAdministeredAt: "2026-06-03T21:00:00.000Z" },
        correctedValues: { effectiveAdministeredAt: "2026-06-03T21:05:00.000Z" },
      }),
      normalizeMedicationAdministrationHistoryOrderCancelRow({
        orderItemId: "oi-2",
        encounterId: "enc-1",
        medicationLabel: "Canceled Med",
        doseDisplay: "5 mg",
        route: "PO",
        cancelledAt: "2026-06-03T18:00:00.000Z",
        performedByDisplay: "Dr A",
        performedByRole: "MD",
        cancellationReason: "PATIENT_DISCHARGED",
        cancellationDetails: null,
      }),
      normalizeMedicationAdministrationHistoryMarRow({
        id: "mar-start",
        encounterId: "enc-1",
        orderItemId: "oi-iv",
        administeredAt: "2026-06-03T10:00:00.000Z",
        medicationLabelSnapshot: "IV Fluid",
        marAction: "administered",
        notes: "INFUSION_START",
        infusionPhase: "INFUSION_START",
        performedByFirstName: "Nurse",
        performedByLastName: "C",
      }),
      normalizeMedicationAdministrationHistoryMarRow({
        id: "mar-stop",
        encounterId: "enc-1",
        orderItemId: "oi-iv",
        administeredAt: "2026-06-03T12:00:00.000Z",
        medicationLabelSnapshot: "IV Fluid",
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

    const score = buildMarAuditReconstructionScore({
      entries,
      marAdministrationIds: ["mar-1", "mar-start", "mar-stop"],
    });
    expect(score.overallScore).toBe(100);
    expect(score.categories.variance.reconstructable).toBe(1);
    expect(score.categories.reschedule.reconstructable).toBe(1);
    expect(score.categories.correction.reconstructable).toBe(1);
    expect(score.categories.cancellation.reconstructable).toBe(1);
    expect(score.categories.infusion.reconstructable).toBe(2);
  });

  it("detects orphan correction and missing variance reason gaps", () => {
    const entries = [
      normalizeMedicationAdministrationHistoryMarRow({
        id: "mar-late",
        encounterId: "enc-1",
        orderItemId: "oi-1",
        administeredAt: "2026-06-03T12:45:00.000Z",
        medicationLabelSnapshot: "Med",
        marAction: "administered",
        doseScheduledAt: "2026-06-03T10:00:00.000Z",
        performedByFirstName: "Nurse",
        performedByLastName: "A",
      }),
      normalizeMedicationAdministrationHistoryCorrectionRow({
        id: "corr-orphan",
        facilityId: "fac-1",
        medicationAdministrationId: "missing-mar",
        encounterId: "enc-1",
        orderItemId: "oi-1",
        medicationLabel: "Med",
        correctionReason: "USER_ERROR",
        createdAt: "2026-06-03T13:00:00.000Z",
        correctedByFirstName: "Nurse",
        correctedByLastName: "B",
        previousValues: {},
        correctedValues: {},
      }),
    ];

    const counts = detectMarGovernanceGaps({ entries, marAdministrationIds: ["mar-late"] });
    expect(counts.missingReasonCodes).toBeGreaterThan(0);
    expect(counts.orphanCorrections).toBeGreaterThan(0);
  });

  it("reports zero gap counts for empty history", () => {
    const counts = detectMarGovernanceGaps({ entries: [] });
    expect(counts.orphanCorrections).toBe(0);
    expect(counts.missingPerformer).toBe(0);
    const score = buildMarAuditReconstructionScore({ entries: [] });
    expect(score.overallScore).toBe(100);
  });
});
