import { describe, expect, it } from "vitest";
import { buildMedicationAdministrationHistoryRailEntry } from "@/lib/medicationAdministrationHistoryRail";
import type { MedicationAdministrationHistoryEntry } from "@medora/shared";

describe("marMedicationResponseHistory rail", () => {
  it("renders medication response history fields", () => {
    const entry: MedicationAdministrationHistoryEntry = {
      id: "mar-1:medication-response:0",
      source: "MAR",
      encounterId: "enc-1",
      orderItemId: "oi-1",
      medicationLabel: "Morphine 2 mg",
      doseDisplay: "2 mg",
      route: "IV",
      eventType: "MEDICATION_RESPONSE_DOCUMENTED",
      eventAt: "2026-06-03T10:30:00.000Z",
      documentedAt: "2026-06-03T10:45:00.000Z",
      performedByDisplay: "Jane Smith",
      performedByRole: "RN",
      reasonCode: "PAIN_REDUCED",
      reasonDetail: "patient reports improvement",
      isPrn: true,
      prnIndication: null,
      infusionPhase: null,
      medicationDoseInstanceId: "dose-1",
      medicationResponseCode: "PAIN_REDUCED",
      medicationResponseDetail: "patient reports improvement",
      medicationResponseTime: "2026-06-03T10:30:00.000Z",
      medicationResponsePainBefore: 8,
      medicationResponsePainAfter: 3,
      originalAdministrationIdForResponse: "mar-1",
      readOnly: true,
    };

    const rail = buildMedicationAdministrationHistoryRailEntry(entry, {
      formatClinicalTime: (iso) => iso,
      t: (key) => key,
    });
    expect(rail.eventType).toBe("MEDICATION_RESPONSE_DOCUMENTED");
    expect(rail.reasonLine).toContain("marMedicationResponse.history.response");
    expect(rail.medicationResponsePainLabel).toContain("8/10");
    expect(rail.medicationResponseCommentLine).toContain("patient reports improvement");
  });
});
