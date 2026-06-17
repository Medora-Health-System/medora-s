import { describe, expect, it } from "vitest";
import {
  buildMarMedicationResponseNotes,
} from "./marMedicationResponseGovernance.js";
import {
  normalizeMedicationAdministrationHistoryMarRow,
  normalizeMedicationAdministrationHistoryResponseRows,
} from "./medicationAdministrationHistoryNormalization.js";

describe("marMedicationResponseHistory", () => {
  it("expands MEDICATION_RESPONSE_DOCUMENTED history rows", () => {
    const notesResult = buildMarMedicationResponseNotes(null, {
      responseCode: "PAIN_REDUCED",
      painBefore: 8,
      painAfter: 3,
      responseTime: "2026-06-03T10:30:00.000Z",
      documentedAt: "2026-06-03T10:45:00.000Z",
      responseDetail: "patient reports improvement",
    });
    expect(notesResult.ok).toBe(true);
    if (!notesResult.ok) return;

    const marEntry = normalizeMedicationAdministrationHistoryMarRow({
      id: "mar-1",
      encounterId: "enc-1",
      orderItemId: "oi-1",
      administeredAt: "2026-06-03T10:00:00.000Z",
      medicationLabelSnapshot: "Morphine 2 mg",
      marAction: "administered",
      notes: notesResult.notes,
      performedByFirstName: "Jane",
      performedByLastName: "Smith",
      performedByRole: "RN",
    });

    const responseRows = normalizeMedicationAdministrationHistoryResponseRows({
      marEntry,
      administrationId: "mar-1",
      notes: notesResult.notes,
    });
    expect(responseRows[0]?.eventType).toBe("MEDICATION_RESPONSE_DOCUMENTED");
    expect(responseRows[0]?.medicationResponsePainBefore).toBe(8);
    expect(responseRows[0]?.medicationResponsePainAfter).toBe(3);
    expect(responseRows[0]?.reasonDetail).toBe("patient reports improvement");
  });
});
