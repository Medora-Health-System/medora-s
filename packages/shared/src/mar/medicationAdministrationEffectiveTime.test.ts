import { describe, expect, it } from "vitest";
import {
  medicationAdminEffectiveTimeRequiresReason,
  medicationAdministrationRowIsInfusionTerminal,
  validateMedicationAdministrationEffectiveTime,
} from "./medicationAdministrationEffectiveTime.js";

describe("medicationAdministrationEffectiveTime", () => {
  const encounterAnchor = new Date("2026-05-16T08:00:00Z");
  const orderCreated = new Date("2026-05-16T10:00:00Z");
  const orderItemCreated = new Date("2026-05-16T10:05:00Z");
  const originalAdmin = new Date("2026-05-16T14:00:00Z");
  const systemDoc = new Date("2026-05-18T14:30:00Z");
  const now = new Date("2026-05-16T18:00:00Z");

  it("detects infusion terminal rows", () => {
    expect(medicationAdministrationRowIsInfusionTerminal("Perfusion IV terminée — durée : 45 min")).toBe(true);
    expect(medicationAdministrationRowIsInfusionTerminal("Routine dose")).toBe(false);
  });

  it("requires reason for controlled medication", () => {
    expect(
      medicationAdminEffectiveTimeRequiresReason({
        effectiveAdministeredTime: originalAdmin,
        originalAdministeredAt: originalAdmin,
        systemDocumentedAt: systemDoc,
        orderCreatedAt: orderCreated,
        orderItemCreatedAt: orderItemCreated,
        adjustmentVersion: 0,
        controlledMedication: true,
        afterOrderDiscontinued: false,
        beforeOrderExisted: false,
      })
    ).toBe(true);
  });

  it("rejects future timestamps", () => {
    const result = validateMedicationAdministrationEffectiveTime({
      effectiveAdministeredTime: new Date("2026-05-16T19:00:00Z"),
      now,
      encounterAnchorAt: encounterAnchor,
      originalAdministeredAt: originalAdmin,
      systemDocumentedAt: systemDoc,
      orderCreatedAt: orderCreated,
      orderItemCreatedAt: orderItemCreated,
      orderCancelledAt: null,
      adjustmentVersion: 0,
      reason: "charted late",
      controlledMedication: false,
      marActionAdministered: true,
      infusionTerminalRow: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FUTURE_TIME");
  });

  it("requires detailed reason for >24h backdate from system documentation", () => {
    const effective = new Date("2026-05-16T10:00:00Z");
    const short = validateMedicationAdministrationEffectiveTime({
      effectiveAdministeredTime: effective,
      now,
      encounterAnchorAt: encounterAnchor,
      originalAdministeredAt: originalAdmin,
      systemDocumentedAt: systemDoc,
      orderCreatedAt: orderCreated,
      orderItemCreatedAt: orderItemCreated,
      orderCancelledAt: null,
      adjustmentVersion: 0,
      reason: "too short",
      controlledMedication: false,
      marActionAdministered: true,
      infusionTerminalRow: false,
    });
    expect(short.ok).toBe(false);
    if (!short.ok) expect(short.code).toBe("REASON_TOO_SHORT_FOR_LARGE_BACKDATE");

    const ok = validateMedicationAdministrationEffectiveTime({
      effectiveAdministeredTime: effective,
      now,
      encounterAnchorAt: encounterAnchor,
      originalAdministeredAt: originalAdmin,
      systemDocumentedAt: systemDoc,
      orderCreatedAt: orderCreated,
      orderItemCreatedAt: orderItemCreated,
      orderCancelledAt: null,
      adjustmentVersion: 0,
      reason: "Patient received medication yesterday evening before charting was available",
      controlledMedication: false,
      marActionAdministered: true,
      infusionTerminalRow: false,
    });
    expect(ok.ok).toBe(true);
  });
});
