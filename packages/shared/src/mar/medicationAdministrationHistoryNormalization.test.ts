import { describe, expect, it } from "vitest";
import {
  resolveMedicationAdministrationHistoryEventType,
  normalizeMedicationAdministrationHistoryMarRow,
  normalizeMedicationAdministrationHistoryOrderCancelRow,
  resolveMedicationAdministrationHistoryEffectiveTimes,
} from "./medicationAdministrationHistoryNormalization.js";

describe("medicationAdministrationHistoryNormalization (MEDUI.ED.MAR.H2B)", () => {
  const baseRow = {
    id: "mar-1",
    encounterId: "enc-1",
    orderItemId: "oi-1",
    administeredAt: "2026-06-16T10:00:00.000Z",
    medicationLabelSnapshot: "Acetaminophen 650 mg",
    route: "PO",
    doseValue: "650",
    doseUnit: "mg",
    performedByFirstName: "Jane",
    performedByLastName: "Smith",
    performedByRole: "RN",
  };

  it("1 — administered → ADMINISTERED", () => {
    expect(
      resolveMedicationAdministrationHistoryEventType({
        marAction: "administered",
        notes: "Administré",
      })
    ).toBe("ADMINISTERED");
  });

  it("2 — PRN administered → PRN_ADMINISTERED", () => {
    expect(
      resolveMedicationAdministrationHistoryEventType({
        marAction: "administered",
        notes: "MAR_PRN_REASON:nausea\nMAR_PRN_REASON_LABEL:Nausées",
        frequencyCode: "PRN",
      })
    ).toBe("PRN_ADMINISTERED");
  });

  it("3 — refused → REFUSED", () => {
    expect(
      resolveMedicationAdministrationHistoryEventType({
        marAction: "refused",
        notes: "Refused: PATIENT_REFUSED",
      })
    ).toBe("REFUSED");
  });

  it("4 — not_available + Missed → MISSED", () => {
    expect(
      resolveMedicationAdministrationHistoryEventType({
        marAction: "not_available",
        notes: "Missed: CLINICAL_HOLD",
      })
    ).toBe("MISSED");
  });

  it("5 — not_available alone → NOT_AVAILABLE", () => {
    expect(
      resolveMedicationAdministrationHistoryEventType({
        marAction: "not_available",
        notes: "Non disponible",
      })
    ).toBe("NOT_AVAILABLE");
  });

  it("6 — md_changed + Held → HELD", () => {
    expect(
      resolveMedicationAdministrationHistoryEventType({
        marAction: "md_changed",
        notes: "Held: NPO",
      })
    ).toBe("HELD");
  });

  it("7 — md_changed alone → MD_CHANGED", () => {
    expect(
      resolveMedicationAdministrationHistoryEventType({
        marAction: "md_changed",
        notes: "Modifié par le médecin",
      })
    ).toBe("MD_CHANGED");
  });

  it("8 — infusion start → INFUSION_START", () => {
    expect(
      resolveMedicationAdministrationHistoryEventType({
        marAction: "administered",
        infusionPhase: "INFUSION_START",
      })
    ).toBe("INFUSION_START");
  });

  it("9 — infusion stop → INFUSION_STOP", () => {
    expect(
      resolveMedicationAdministrationHistoryEventType({
        marAction: "administered",
        infusionPhase: "INFUSION_STOP",
      })
    ).toBe("INFUSION_STOP");
  });

  it("10 — cancellation synthetic → ORDER_CANCELED", () => {
    const entry = normalizeMedicationAdministrationHistoryOrderCancelRow({
      orderItemId: "oi-cancel",
      encounterId: "enc-1",
      orderEventId: "ev-1",
      medicationLabel: "Lisinopril 20 mg",
      doseDisplay: "20 mg",
      route: "PO",
      cancelledAt: "2026-06-16T14:55:00.000Z",
      performedByDisplay: "Dr Jones",
      performedByRole: "PROVIDER",
      cancellationReason: "CLINICAL_CHANGE",
      cancellationDetails: "Blood pressure improved",
      frequencyCode: "QD",
      directionsSig: null,
    });
    expect(entry.eventType).toBe("ORDER_CANCELED");
    expect(entry.source).toBe("ORDER_CANCEL");
    expect(entry.reasonCode).toBe("CLINICAL_CHANGE");
    expect(entry.readOnly).toBe(true);
  });

  it("parses refused/hold/missed reason fields without exposing raw notes", () => {
    const refused = normalizeMedicationAdministrationHistoryMarRow({
      ...baseRow,
      marAction: "refused",
      notes: "Refused: PATIENT_REFUSED",
    });
    expect(refused.reasonCode).toBe("PATIENT_REFUSED");
    expect(refused.eventType).toBe("REFUSED");

    const held = normalizeMedicationAdministrationHistoryMarRow({
      ...baseRow,
      id: "mar-held",
      marAction: "md_changed",
      notes: "Held: NPO",
    });
    expect(held.eventType).toBe("HELD");
    expect(held.reasonCode).toBe("NPO");

    const missed = normalizeMedicationAdministrationHistoryMarRow({
      ...baseRow,
      id: "mar-missed",
      marAction: "not_available",
      notes: "Missed: TRANSFERRED",
    });
    expect(missed.eventType).toBe("MISSED");
    expect(missed.reasonCode).toBe("TRANSFERRED");
  });

  it("uses effective time for eventAt and documentedAt when adjusted", () => {
    const times = resolveMedicationAdministrationHistoryEffectiveTimes({
      administeredAt: "2026-06-16T10:00:00.000Z",
      effectiveAdministeredAt: "2026-06-16T09:14:00.000Z",
    });
    expect(times.eventAt).toBe("2026-06-16T09:14:00.000Z");
    expect(times.documentedAt).toBe("2026-06-16T10:00:00.000Z");
  });

  it("11 — infusion stop ORDER_CANCELLED reason parsed for history rail (H6B)", () => {
    const entry = normalizeMedicationAdministrationHistoryMarRow({
      ...baseRow,
      id: "mar-stop-cancel",
      marAction: "administered",
      infusionPhase: "INFUSION_STOP",
      notes:
        "Perfusion IV terminée — durée : 165 min\n\nReason: ORDER_CANCELLED — PATIENT_DISCHARGED",
    });
    expect(entry.eventType).toBe("INFUSION_STOP");
    expect(entry.reasonCode).toBe("ORDER_CANCELLED");
    expect(entry.reasonDetail).toContain("PATIENT_DISCHARGED");
  });
});
