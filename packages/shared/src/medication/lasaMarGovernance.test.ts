import { describe, expect, it } from "vitest";
import {
  lasaMarGovernanceApplies,
  lasaMarRequiresAcknowledgement,
  validateLasaMarCreate,
  type LasaMarGovernanceContext,
} from "./lasaMarGovernance.js";

const lasaHigh: LasaMarGovernanceContext = {
  lasaGroupId: "GROUP_LASA_OPIOID",
  lasaGroupLabel: "Opioid LASA",
  lasaSeverity: "LASA_HIGH",
  requiresAcknowledgement: true,
};

describe("lasaMarGovernance (M1.3F.6)", () => {
  it("does not apply to non-LASA medications", () => {
    expect(
      validateLasaMarCreate({
        marAction: "administered",
        governance: null,
      })
    ).toMatchObject({ ok: true, acknowledged: false });
  });

  it("LASA_LOW is informational only", () => {
    expect(
      lasaMarRequiresAcknowledgement({
        lasaGroupId: "GROUP_X",
        lasaSeverity: "LASA_LOW",
      })
    ).toBe(false);
    expect(
      validateLasaMarCreate({
        marAction: "administered",
        governance: {
          lasaGroupId: "GROUP_X",
          lasaGroupLabel: null,
          lasaSeverity: "LASA_LOW",
          requiresAcknowledgement: false,
        },
      })
    ).toMatchObject({ ok: true });
  });

  it("requires acknowledgement for LASA_HIGH", () => {
    const fail = validateLasaMarCreate({
      marAction: "administered",
      governance: lasaHigh,
    });
    expect(fail.ok).toBe(false);
    if (!fail.ok) expect(fail.code).toBe("LASA_ACKNOWLEDGEMENT_REQUIRED");

    const pass = validateLasaMarCreate({
      marAction: "administered",
      governance: lasaHigh,
      lasaAcknowledged: true,
      lasaMedicationSelectionConfirmed: true,
    });
    expect(pass.ok).toBe(true);
    if (pass.ok) expect(pass.acknowledged).toBe(true);
  });

  it("requires acknowledgement for LASA_MEDIUM", () => {
    expect(
      lasaMarRequiresAcknowledgement({ lasaGroupId: "G", lasaSeverity: "LASA_MEDIUM" })
    ).toBe(true);
  });

  it("accepts override with acknowledgment", () => {
    const result = validateLasaMarCreate({
      marAction: "administered",
      governance: lasaHigh,
      lasaOverrideReason: "Urgence vitale — accusé verbal documenté",
      lasaOverrideAcknowledged: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.overrideUsed).toBe(true);
  });

  it("does not apply to refused actions", () => {
    expect(lasaMarGovernanceApplies(lasaHigh, "refused")).toBe(false);
  });
});
