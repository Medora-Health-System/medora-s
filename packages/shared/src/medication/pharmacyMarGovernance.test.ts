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

describe("pharmacyMarGovernance (M1.3F.7)", () => {
  it("requires pharmacy for schedule II/III and listed high-alert classes", () => {
    expect(controlledScheduleRequiresPharmacyVerification("II")).toBe(true);
    expect(controlledScheduleRequiresPharmacyVerification("Schedule III")).toBe(true);
    expect(controlledScheduleRequiresPharmacyVerification("IV")).toBe(false);
    expect(highAlertClassRequiresPharmacyVerification("HIGH_ALERT_INSULIN")).toBe(true);
    expect(highAlertClassRequiresPharmacyVerification("HIGH_ALERT_ANTICOAGULANT")).toBe(true);
    expect(highAlertClassRequiresPharmacyVerification("HIGH_ALERT_OPIOID")).toBe(false);
  });

  it("does not apply to non-administered or non-required meds", () => {
    expect(
      validatePharmacyMarCreate({ marAction: "refused", governance: null })
    ).toMatchObject({ ok: true });
    expect(
      validatePharmacyMarCreate({
        marAction: "administered",
        governance: {
          requiresPharmacyVerification: false,
          verificationStatus: "NOT_REQUIRED",
        },
      })
    ).toMatchObject({ ok: true });
  });

  it("blocks unverified and allows verified", () => {
    const ctx: PharmacyMarGovernanceContext = {
      requiresPharmacyVerification: true,
      verificationStatus: "PENDING",
    };
    expect(
      validatePharmacyMarCreate({ marAction: "administered", governance: ctx }).ok
    ).toBe(false);
    expect(
      validatePharmacyMarCreate({
        marAction: "administered",
        governance: { ...ctx, verificationStatus: "VERIFIED" },
      }).ok
    ).toBe(true);
  });

  it("allows override when pending", () => {
    const result = validatePharmacyMarCreate({
      marAction: "administered",
      governance: {
        requiresPharmacyVerification: true,
        verificationStatus: "PENDING",
      },
      pharmacyVerificationOverrideReason: "Urgence — pharmacien non disponible",
      pharmacyVerificationOverrideAcknowledged: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.overrideUsed).toBe(true);
  });

  it("defaults missing row to PENDING when required", () => {
    expect(
      effectivePharmacyVerificationStatus({
        requiresPharmacyVerification: true,
        rowStatus: null,
      })
    ).toBe("PENDING");
  });

  it("resolveRequiresPharmacyVerification from safety code", () => {
    expect(
      resolveRequiresPharmacyVerification({
        safetyRequirementCodes: ["REQUIRES_PHARMACY_VERIFICATION"],
      })
    ).toBe(true);
    expect(pharmacyMarGovernanceApplies(
      { requiresPharmacyVerification: true, verificationStatus: "PENDING" },
      "administered"
    )).toBe(true);
  });
});
