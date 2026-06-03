import { describe, expect, it } from "vitest";
import { marPharmacyWorkflowVisible } from "@/components/medication/MarPharmacyVerificationPanel";
import { getMedicationSafetyBadges } from "@medora/shared";

describe("MAR pharmacy UI (M1.7A.9)", () => {
  it("does not show blocking pharmacy workflow when verification required (informational only)", () => {
    expect(
      marPharmacyWorkflowVisible(
        { requiresPharmacyVerification: true, pharmacyVerificationStatus: "PENDING" },
        "administered"
      )
    ).toBe(false);
    expect(
      marPharmacyWorkflowVisible(
        { requiresPharmacyVerification: true, pharmacyVerificationStatus: "PENDING" },
        "refused"
      )
    ).toBe(false);
  });

  it("shows PHARMACY_VERIFIED badge when verified", () => {
    expect(
      getMedicationSafetyBadges({
        requiresPharmacyVerification: true,
        pharmacyVerificationStatus: "VERIFIED",
      })
    ).toContain("PHARMACY_VERIFIED");
  });
});
