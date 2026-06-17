import { describe, expect, it } from "vitest";
import {
  buildMarUniversalClinicalTimeNotes,
  normalizeMedicationAdministrationHistoryMarRow,
  parseMarUniversalClinicalTimeNotes,
  resolveMarUniversalClinicalTime,
} from "@medora/shared";

describe("marUniversalClinicalTimeHistoryCertification (H9F.1)", () => {
  const clinicalTime = "2026-06-03T14:15:00.000Z";
  const documentedAt = "2026-06-03T14:20:00.000Z";
  const scheduledTime = "2026-06-03T14:00:00.000Z";
  const currentScheduledTime = "2026-06-03T13:30:00.000Z";
  const originalScheduledTime = "2026-06-03T14:00:00.000Z";

  it("reconstructs universal timing fields from notes", () => {
    const notes = buildMarUniversalClinicalTimeNotes({
      actionType: "REFUSE",
      clinicalTime,
      documentedAt,
      scheduledTime,
      currentScheduledTime,
      originalScheduledTime,
      varianceMinutes: 15,
      reasonCode: "WORKFLOW_DELAY",
      reasonDetail: "busy",
    });
    expect(notes).toBeTruthy();
    const parsed = parseMarUniversalClinicalTimeNotes(notes);
    expect(parsed?.actionType).toBe("REFUSE");
    expect(parsed?.clinicalTime).toBe(clinicalTime);
    expect(parsed?.documentedAt).toBe(documentedAt);
    expect(parsed?.scheduledTime).toBe(scheduledTime);
    expect(parsed?.currentScheduledTime).toBe(currentScheduledTime);
    expect(parsed?.originalScheduledTime).toBe(originalScheduledTime);
    expect(parsed?.varianceMinutes).toBe(15);
    expect(parsed?.reasonCode).toBe("WORKFLOW_DELAY");
    expect(parsed?.reasonDetail).toBe("busy");
  });

  it("history row uses clinical time for eventAt and preserves documentedAt", () => {
    const timingNotes = buildMarUniversalClinicalTimeNotes({
      actionType: "ADMINISTER",
      clinicalTime,
      documentedAt,
      reasonCode: "WORKFLOW_DELAY",
    });
    const entry = normalizeMedicationAdministrationHistoryMarRow({
      id: "mar-1",
      encounterId: "enc-1",
      orderItemId: "oi-1",
      marAction: "administered",
      notes: `Administered\n${timingNotes}`,
      administeredAt: documentedAt,
      effectiveAdministeredAt: null,
      route: "PO",
      doseValue: "1",
      doseUnit: "tab",
      medicationLabelSnapshot: "Acetaminophen",
      performedByFirstName: "Jane",
      performedByLastName: "Doe",
      performedByRole: "RN",
      infusionPhase: null,
      medicationDoseInstanceId: "dose-1",
      doseScheduledAt: new Date(scheduledTime),
      doseOrderedDoseSnapshotJson: null,
      orderItemFrequencyCode: "BID",
      orderItemDirectionsSig: null,
      createdAt: new Date(documentedAt),
    });
    expect(entry.eventAt).toBe(clinicalTime);
    expect(entry.documentedAt).toBe(documentedAt);
    expect(entry.performedByDisplay).toContain("Jane");
  });

  it("governance model exposes variance and placement instant", () => {
    const resolved = resolveMarUniversalClinicalTime({
      actionType: "IVPB_STOP",
      clinicalTime,
      documentedAt,
      scheduledTime,
      currentScheduledTime,
      originalScheduledTime,
      reasonCode: "WORKFLOW_DELAY",
    });
    expect(resolved?.varianceMinutes).toBe(45);
    expect(resolved?.placementInstant).toBe(clinicalTime);
    expect(resolved?.requiresReason).toBe(true);
  });
});
