import { describe, expect, it } from "vitest";
import {
  highAlertMarGovernanceApplies,
  highAlertMarRequiresDoubleCheck,
  validateHighAlertMarCreate,
  type HighAlertMarGovernanceContext,
} from "./highAlertMarGovernance.js";

const doubleCheckGov: HighAlertMarGovernanceContext = {
  isHighAlert: true,
  requiresDoubleCheck: true,
  safetyRequirementCodes: ["REQUIRES_INDEPENDENT_DOUBLE_CHECK"],
};

describe("highAlertMarGovernance (M1.3F.5)", () => {
  it("does not require double-check for informational high-alert only", () => {
    expect(
      highAlertMarRequiresDoubleCheck({
        isHighAlert: true,
        requiresDoubleSign: false,
        safetyRequirementCodes: [],
      })
    ).toBe(false);
    expect(
      validateHighAlertMarCreate({
        marAction: "administered",
        governance: null,
      })
    ).toMatchObject({ ok: true, verifierProvided: false });
  });

  it("requires verifier or override when double-check applies", () => {
    const fail = validateHighAlertMarCreate({
      marAction: "administered",
      governance: doubleCheckGov,
      administeredByUserId: "nurse-1",
    });
    expect(fail.ok).toBe(false);
    if (!fail.ok) expect(fail.code).toBe("HIGH_ALERT_DOUBLE_CHECK_REQUIRED");

    const pass = validateHighAlertMarCreate({
      marAction: "administered",
      governance: doubleCheckGov,
      administeredByUserId: "nurse-1",
      highAlertVerifierUserId: "rn-2",
    });
    expect(pass.ok).toBe(true);
    if (pass.ok) expect(pass.verifierProvided).toBe(true);
  });

  it("rejects verifier same as administrator", () => {
    const result = validateHighAlertMarCreate({
      marAction: "administered",
      governance: doubleCheckGov,
      administeredByUserId: "nurse-1",
      highAlertVerifierUserId: "nurse-1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("HIGH_ALERT_VERIFIER_CANNOT_BE_SELF");
  });

  it("rejects verifier same as controlled witness", () => {
    const result = validateHighAlertMarCreate({
      marAction: "administered",
      governance: doubleCheckGov,
      administeredByUserId: "nurse-1",
      highAlertVerifierUserId: "witness-1",
      controlledWitnessUserId: "witness-1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("HIGH_ALERT_VERIFIER_CANNOT_BE_WITNESS");
  });

  it("accepts override with acknowledgment", () => {
    const result = validateHighAlertMarCreate({
      marAction: "administered",
      governance: doubleCheckGov,
      administeredByUserId: "nurse-1",
      highAlertOverrideReason: "Urgence — seul infirmier disponible",
      highAlertOverrideAcknowledged: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.overrideUsed).toBe(true);
  });

  it("does not apply to non-administered actions", () => {
    expect(highAlertMarGovernanceApplies(doubleCheckGov, "refused")).toBe(false);
  });
});
