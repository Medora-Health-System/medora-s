import { MEDICATION_PASS_QUEUE_DOSE_SELECT } from "./medication-pass-queue-dose.select";
import { MEDICATION_PASS_QUEUE_LIST_LIMIT } from "../common/encounter-clinical-read-limits";

describe("medication pass queue dose select", () => {
  it("includes IVPB_SESSION linkage fields and frequency for queue metadata", () => {
    expect(MEDICATION_PASS_QUEUE_DOSE_SELECT).toHaveProperty("doseKind", true);
    expect(MEDICATION_PASS_QUEUE_DOSE_SELECT).toHaveProperty("medicationOrderScheduleId", true);
    expect(MEDICATION_PASS_QUEUE_DOSE_SELECT).toHaveProperty("infusionSessionId", true);
    expect(MEDICATION_PASS_QUEUE_DOSE_SELECT).toHaveProperty(
      "terminalMedicationAdministrationId",
      true
    );
    expect(MEDICATION_PASS_QUEUE_DOSE_SELECT).toHaveProperty("frequencySnapshotJson", true);
    expect(MEDICATION_PASS_QUEUE_DOSE_SELECT).not.toHaveProperty("scheduleClassificationSnapshot");
  });

  it("keeps encounter patient context needed by queue UI", () => {
    expect(MEDICATION_PASS_QUEUE_DOSE_SELECT.encounter).toEqual(
      expect.objectContaining({
        select: expect.objectContaining({
          patient: expect.objectContaining({
            select: expect.objectContaining({ id: true, firstName: true, lastName: true, mrn: true }),
          }),
        }),
      })
    );
  });
});

describe("medication pass queue read limits", () => {
  it("defines a hard list cap", () => {
    expect(MEDICATION_PASS_QUEUE_LIST_LIMIT).toBeGreaterThan(0);
  });
});
