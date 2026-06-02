import { describe, expect, it } from "vitest";
import {
  controlledSubstanceMarGovernanceApplies,
  isPartialControlledDose,
  validateControlledSubstanceMarCreate,
  type ControlledSubstanceMarGovernanceContext,
} from "./controlledSubstanceMarGovernance.js";

const controlledWitness: ControlledSubstanceMarGovernanceContext = {
  isControlled: true,
  requiresWitness: true,
};

describe("controlledSubstanceMarGovernance (M1.3F.4)", () => {
  it("does not apply to non-controlled medications", () => {
    expect(
      validateControlledSubstanceMarCreate({
        marAction: "administered",
        governance: { isControlled: false, requiresWitness: false },
      })
    ).toMatchObject({ ok: true, witnessProvided: false });
  });

  it("requires witness or override for controlled witness medications", () => {
    const fail = validateControlledSubstanceMarCreate({
      marAction: "administered",
      governance: controlledWitness,
      administeredByUserId: "nurse-1",
    });
    expect(fail.ok).toBe(false);
    if (!fail.ok) expect(fail.code).toBe("CONTROLLED_WITNESS_REQUIRED");

    const pass = validateControlledSubstanceMarCreate({
      marAction: "administered",
      governance: controlledWitness,
      administeredByUserId: "nurse-1",
      witnessUserId: "witness-2",
    });
    expect(pass.ok).toBe(true);
    if (pass.ok) expect(pass.witnessProvided).toBe(true);
  });

  it("allows override with reason when witness missing", () => {
    const pass = validateControlledSubstanceMarCreate({
      marAction: "administered",
      governance: controlledWitness,
      administeredByUserId: "nurse-1",
      controlledOverrideAcknowledged: true,
      overrideReason: "Emergency — witness unavailable",
    });
    expect(pass.ok).toBe(true);
    if (pass.ok) expect(pass.overrideUsed).toBe(true);
  });

  it("requires waste documentation for partial controlled dose", () => {
    expect(isPartialControlledDose({ administeredQuantity: 1, orderedQuantity: 2 })).toBe(true);
    const fail = validateControlledSubstanceMarCreate({
      marAction: "administered",
      governance: { isControlled: true, requiresWitness: false },
      witnessUserId: "w-2",
      administeredByUserId: "nurse-1",
      administeredQuantity: 1,
      orderedQuantity: 2,
    });
    expect(fail.ok).toBe(false);
    if (!fail.ok) expect(fail.code).toBe("CONTROLLED_WASTE_REQUIRED");
  });

  it("applies only on administered action", () => {
    expect(controlledSubstanceMarGovernanceApplies(controlledWitness, "refused")).toBe(false);
  });
});
