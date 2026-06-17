import { describe, expect, it } from "vitest";
import {
  buildMedicationInfusionOrderCancelStopNotes,
  MEDICATION_INFUSION_STOP_REASON_ORDER_CANCELLED,
  parseMedicationInfusionStopReasonFromNotes,
} from "./medicationInfusionStopReasonGovernance.js";

describe("medicationInfusionCancelTeardown (MEDUI.ED.MAR.H6B)", () => {
  it("builds order-cancel stop notes with ORDER_CANCELLED reason", () => {
    const notes = buildMedicationInfusionOrderCancelStopNotes({
      durationMinutes: 165,
      cancelReason: "PATIENT_DISCHARGED",
      cancellationDetails: "Transfer to ward",
    });
    expect(notes).toContain("Perfusion IV terminée — durée : 165 min");
    expect(notes).toContain(`Reason: ${MEDICATION_INFUSION_STOP_REASON_ORDER_CANCELLED}`);
    expect(notes).toContain("PATIENT_DISCHARGED");
    expect(notes).toContain("Transfer to ward");
  });

  it("parses ORDER_CANCELLED stop reason from infusion stop notes", () => {
    const notes = buildMedicationInfusionOrderCancelStopNotes({
      durationMinutes: 45,
      cancelReason: "CLINICAL_CHANGE",
    });
    const parsed = parseMedicationInfusionStopReasonFromNotes(notes);
    expect(parsed.reasonCode).toBe(MEDICATION_INFUSION_STOP_REASON_ORDER_CANCELLED);
    expect(parsed.reasonDetail).toContain("CLINICAL_CHANGE");
  });
});
