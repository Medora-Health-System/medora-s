import {
  actorHasAdmissionOperationalAcceptCapability,
  applyOperationalAdmissionAction,
  CLINICAL_ADMISSION_PACKET_PROTECTED_KEYS,
  mergeOperationalAcceptanceIntoSummary,
} from "@medora/shared";

/**
 * Focused authorization / clinical-separation unit checks for D4A.2.3.
 * Full Nest DI coverage is deferred; shared apply helpers are the contract surface.
 */
describe("AdmissionCommandCenterService authorization contract (D4A.2.3)", () => {
  it("PROVIDER, RN, ADMIN, dual-role may accept; billing-only denied", () => {
    expect(actorHasAdmissionOperationalAcceptCapability(["PROVIDER"])).toBe(true);
    expect(actorHasAdmissionOperationalAcceptCapability(["RN"])).toBe(true);
    expect(actorHasAdmissionOperationalAcceptCapability(["ADMIN"])).toBe(true);
    expect(actorHasAdmissionOperationalAcceptCapability(["RN", "PROVIDER"])).toBe(true);
    expect(actorHasAdmissionOperationalAcceptCapability(["BILLING"])).toBe(false);
  });

  it("singleton first-role BILLING does not block when RN also present", () => {
    expect(actorHasAdmissionOperationalAcceptCapability(["BILLING", "RN"])).toBe(true);
  });

  it("RN operational accept does not alter clinical protected keys", () => {
    const clinical = {
      admissionReason: "Sepsis",
      admissionDiagnosis: "Sepsis",
      initialPlan: "Fluids",
      careLevel: "ICU",
      conditionAtAdmission: "CRITICAL",
      serviceUnit: "Critical Care",
      responsiblePhysicianName: "Dr X",
      admissionDecisionMode: "SIGN",
      admissionDecisionAt: "2026-07-22T10:00:00.000Z",
      admissionDecisionByUserId: "phys-1",
    };
    const applied = applyOperationalAdmissionAction({
      prior: null,
      action: "ACCEPT",
      actorUserId: "rn-1",
      actorRoleCodes: ["RN"],
      actorDisplayRole: "RN",
      at: "2026-07-22T10:15:00.000Z",
      clientRequestId: "r1",
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    const merged = mergeOperationalAcceptanceIntoSummary(clinical, applied.ops);
    for (const key of CLINICAL_ADMISSION_PACKET_PROTECTED_KEYS) {
      if (key in clinical) {
        expect(merged[key]).toEqual((clinical as Record<string, unknown>)[key]);
      }
    }
  });

  it("stale decision timestamp conflicts", () => {
    const result = applyOperationalAdmissionAction({
      prior: null,
      action: "ACCEPT",
      actorUserId: "rn-1",
      actorRoleCodes: ["RN"],
      actorDisplayRole: "RN",
      at: "2026-07-22T10:15:00.000Z",
      expectedAdmissionDecisionAt: "2026-07-22T09:00:00.000Z",
      currentAdmissionDecisionAt: "2026-07-22T10:00:00.000Z",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("ADMISSION_OPERATION_STALE");
  });
});
