import { describe, expect, it } from "vitest";
import {
  MEDICATION_INFUSION_NURSE_STOP_REASON_CODES,
  MEDICATION_INFUSION_STOP_REASON_ORDER_CANCELLED,
  buildMedicationInfusionOrderCancelStopNotes,
  buildMedicationInfusionStopNotes,
  isMedicationInfusionNurseStopReasonCode,
  parseMedicationInfusionStopReasonFromNotes,
  resolveMedicationInfusionStopReasonI18nKey,
  resolveMedicationInfusionStopReasonTimelineLabel,
} from "./medicationInfusionStopReasonGovernance.js";
import {
  normalizeMedicationAdministrationHistoryMarRow,
  resolveMedicationAdministrationHistoryReasonFields,
} from "../mar/medicationAdministrationHistoryNormalization.js";

describe("medicationInfusionStopReasonGovernance (MEDUI.ED.MAR.H6C)", () => {
  it("1 — COMPLETED structured stop notes", () => {
    const notes = buildMedicationInfusionStopNotes({
      durationMinutes: 60,
      stopReasonCode: "COMPLETED",
    });
    expect(notes).toContain("Reason: COMPLETED");
    expect(parseMedicationInfusionStopReasonFromNotes(notes).reasonCode).toBe("COMPLETED");
  });

  it("2 — ORDER_CANCELLED via cancel builder", () => {
    const notes = buildMedicationInfusionOrderCancelStopNotes({
      durationMinutes: 30,
      cancelReason: "PATIENT_DISCHARGED",
    });
    expect(parseMedicationInfusionStopReasonFromNotes(notes).reasonCode).toBe(
      MEDICATION_INFUSION_STOP_REASON_ORDER_CANCELLED
    );
  });

  it("3 — REACTION with detail", () => {
    const notes = buildMedicationInfusionStopNotes({
      durationMinutes: 10,
      stopReasonCode: "REACTION",
      reasonDetail: "Urticaria",
    });
    const parsed = parseMedicationInfusionStopReasonFromNotes(notes);
    expect(parsed.reasonCode).toBe("REACTION");
    expect(parsed.reasonDetail).toContain("Urticaria");
  });

  it("4 — LINE_FAILURE", () => {
    expect(resolveMedicationInfusionStopReasonTimelineLabel("LINE_FAILURE")).toBe("Line failure");
  });

  it("5 — PUMP_ISSUE", () => {
    expect(resolveMedicationInfusionStopReasonI18nKey("PUMP_ISSUE")).toBe("marInfusionStopReason.PUMP_ISSUE");
  });

  it("6 — PROVIDER_DISCONTINUED", () => {
    expect(isMedicationInfusionNurseStopReasonCode("PROVIDER_DISCONTINUED")).toBe(true);
  });

  it("7 — legacy terminal notes default to COMPLETED", () => {
    const parsed = parseMedicationInfusionStopReasonFromNotes(
      "Perfusion IV terminée — durée : 45 min"
    );
    expect(parsed.reasonCode).toBe("COMPLETED");
  });

  it("8 — nurse codes exclude ORDER_CANCELLED", () => {
    expect(MEDICATION_INFUSION_NURSE_STOP_REASON_CODES).not.toContain("ORDER_CANCELLED");
  });

  it("9 — history normalization uses structured reason", () => {
    const notes = buildMedicationInfusionStopNotes({
      durationMinutes: 5,
      stopReasonCode: "REACTION",
      reasonDetail: "Rash",
    });
    const reason = resolveMedicationAdministrationHistoryReasonFields({
      eventType: "INFUSION_STOP",
      notes,
    });
    expect(reason.reasonCode).toBe("REACTION");
    expect(reason.reasonDetail).toContain("Rash");
  });

  it("10 — no free-text-only terminal stop without reason line", () => {
    const notes = buildMedicationInfusionStopNotes({
      durationMinutes: 1,
      stopReasonCode: "COMPLETED",
      supplementalNotes: "Patient resting comfortably",
    });
    expect(notes).toMatch(/^Reason:/m);
    expect(normalizeMedicationAdministrationHistoryMarRow({
      id: "mar-1",
      encounterId: "enc-1",
      orderItemId: "oi-1",
      administeredAt: "2026-06-16T10:00:00.000Z",
      medicationLabelSnapshot: "Vancomycin",
      route: "IVPB",
      doseValue: null,
      doseUnit: null,
      performedByFirstName: "Jane",
      performedByLastName: "Doe",
      performedByRole: "RN",
      marAction: "administered",
      infusionPhase: "INFUSION_STOP",
      notes,
    }).reasonCode).toBe("COMPLETED");
  });
});
