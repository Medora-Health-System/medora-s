import { describe, expect, it } from "vitest";
import {
  MAR_UNIVERSAL_CLINICAL_TIME_NOTE_PREFIX,
  normalizeMedicationAdministrationHistoryMarRow,
  parseMarUniversalClinicalTimeNotes,
  resolveMarClinicalAdministrationPlacementInstant,
} from "@medora/shared";

describe("marClinicalTimestampReconstruction (H9K)", () => {
  it("history rail preserves documentedAt separate from eventAt", () => {
    const entry = normalizeMedicationAdministrationHistoryMarRow({
      id: "mar-1",
      encounterId: "enc-1",
      orderItemId: "oi-1",
      medicationLabelSnapshot: "NS 0.9%",
      doseValue: null,
      doseUnit: null,
      route: "IV",
      marAction: "administered",
      notes: `${MAR_UNIVERSAL_CLINICAL_TIME_NOTE_PREFIX} action=BOLUS_START clinical=2026-06-03T09:00:00.000Z documented=2026-06-03T14:02:00.000Z reason=CLINICAL_ACCURACY`,
      infusionPhase: "INFUSION_START",
      administeredAt: new Date("2026-06-03T14:02:00.000Z"),
      effectiveAdministeredAt: new Date("2026-06-03T09:00:00.000Z"),
      createdAt: new Date("2026-06-03T14:02:00.000Z"),
      performedByFirstName: "N",
      performedByLastName: "R",
      performedByRole: "RN",
      orderItemFrequencyCode: null,
      orderItemDirectionsSig: "NS 1000 mL bolus",
      medicationDoseInstanceId: null,
      doseScheduledAt: null,
      doseOrderedDoseSnapshotJson: null,
    });
    expect(entry.eventAt).toBe("2026-06-03T09:00:00.000Z");
    expect(entry.documentedAt).toBe("2026-06-03T14:02:00.000Z");
  });

  it("universal clinical notes reconstruct clinical vs documented timestamps", () => {
    const parsed = parseMarUniversalClinicalTimeNotes(
      `${MAR_UNIVERSAL_CLINICAL_TIME_NOTE_PREFIX} action=INFUSION_START clinical=2026-06-03T09:00:00.000Z documented=2026-06-03T14:02:00.000Z reason=CLINICAL_ACCURACY`
    );
    expect(parsed?.clinicalTime).toBe("2026-06-03T09:00:00.000Z");
    expect(parsed?.documentedAt).toBe("2026-06-03T14:02:00.000Z");
  });

  it("placement resolver never uses documentation-only administeredAt when effective exists", () => {
    const placement = resolveMarClinicalAdministrationPlacementInstant({
      administeredAt: "2026-06-03T14:02:00.000Z",
      effectiveAdministeredAt: "2026-06-03T09:00:00.000Z",
    });
    expect(placement?.toISOString()).toBe("2026-06-03T09:00:00.000Z");
  });

  it("overnight shift clinical placement unchanged for early-morning bolus", () => {
    const placement = resolveMarClinicalAdministrationPlacementInstant({
      administeredAt: "2026-06-04T01:05:00.000Z",
      effectiveAdministeredAt: "2026-06-03T23:30:00.000Z",
    });
    expect(placement?.toISOString()).toBe("2026-06-03T23:30:00.000Z");
  });
});
