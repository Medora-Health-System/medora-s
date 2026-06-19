import { describe, expect, it } from "vitest";
import {
  medicationAdminEffectiveTimeRequiresReason,
  medicationAdministrationEffectiveTimeDtoSchema,
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

  it("does not require reason for controlled medication timing adjustment", () => {
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
    ).toBe(false);
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
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FUTURE_TIME");
  });

  it("allows large backdate without detailed reason (advisory only)", () => {
    const effective = new Date("2026-05-16T10:00:00Z");
    const result = validateMedicationAdministrationEffectiveTime({
      effectiveAdministeredTime: effective,
      now,
      encounterAnchorAt: encounterAnchor,
      originalAdministeredAt: originalAdmin,
      systemDocumentedAt: systemDoc,
      orderCreatedAt: orderCreated,
      orderItemCreatedAt: orderItemCreated,
      orderCancelledAt: null,
      adjustmentVersion: 0,
      reason: "",
      controlledMedication: false,
      marActionAdministered: true,
    });
    expect(result.ok).toBe(true);
  });

  it("PATCH DTO accepts effectiveAdministeredAt alias", () => {
    const parsed = medicationAdministrationEffectiveTimeDtoSchema.safeParse({
      effectiveAdministeredAt: "2026-05-16T13:00:00.000Z",
      reason: "Delayed documentation correction",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.effectiveAdministeredTime).toBe("2026-05-16T13:00:00.000Z");
      expect(parsed.data.reason).toBe("Delayed documentation correction");
    }
  });

  it("PATCH DTO requires a clinical timestamp", () => {
    const parsed = medicationAdministrationEffectiveTimeDtoSchema.safeParse({ reason: "only reason" });
    expect(parsed.success).toBe(false);
  });

  it("allows infusion stop terminal row adjustment (effective time only)", () => {
    const result = validateMedicationAdministrationEffectiveTime({
      effectiveAdministeredTime: new Date("2026-05-16T13:30:00Z"),
      now,
      encounterAnchorAt: encounterAnchor,
      originalAdministeredAt: originalAdmin,
      systemDocumentedAt: systemDoc,
      orderCreatedAt: orderCreated,
      orderItemCreatedAt: orderItemCreated,
      orderCancelledAt: null,
      adjustmentVersion: 0,
      reason: "Stop time documented after bedside care",
      controlledMedication: false,
      marActionAdministered: true,
    });
    expect(result.ok).toBe(true);
  });
});
