import { describe, expect, it } from "vitest";
import {
  controlledScheduleRequiresPharmacyVerification,
  effectivePharmacyVerificationStatus,
  highAlertClassRequiresPharmacyVerification,
  pharmacyMarGovernanceApplies,
  resolveRequiresPharmacyVerification,
  validatePharmacyMarCreate,
  type PharmacyMarGovernanceContext,
} from "./pharmacyMarGovernance.js";

describe("pharmacyMarGovernance (M1.7A.9)", () => {
  it("still resolves pharmacy requirement for worklist enrichment", () => {
    expect(controlledScheduleRequiresPharmacyVerification("II")).toBe(true);
    expect(highAlertClassRequiresPharmacyVerification("HIGH_ALERT_INSULIN")).toBe(true);
    expect(
      resolveRequiresPharmacyVerification({
        safetyRequirementCodes: ["REQUIRES_PHARMACY_VERIFICATION"],
      })
    ).toBe(true);
  });

  it("does not block MAR administration (M1.7A.9)", () => {
    const ctx: PharmacyMarGovernanceContext = {
      requiresPharmacyVerification: true,
      verificationStatus: "PENDING",
    };
    expect(pharmacyMarGovernanceApplies(ctx, "administered")).toBe(false);
    expect(
      validatePharmacyMarCreate({ marAction: "administered", governance: ctx })
    ).toMatchObject({ ok: true });
  });

  it("defaults missing row to PENDING when required for display", () => {
    expect(
      effectivePharmacyVerificationStatus({
        requiresPharmacyVerification: true,
        rowStatus: null,
      })
    ).toBe("PENDING");
  });
});
