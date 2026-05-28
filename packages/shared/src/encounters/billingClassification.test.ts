import { describe, expect, it } from "vitest";
import {
  mapEncounterTypeToLegacyBillingClassification,
  resolveDefaultBillingClassification,
  validateBillingClassificationTransition,
} from "./billingClassification.js";

describe("billingClassification (19UCED.1)", () => {
  it("default helper returns CLINIC_VISIT for clinic facility", () => {
    expect(
      resolveDefaultBillingClassification({
        facilityBillingSiteType: "CLINIC",
        encounterType: "EMERGENCY",
      }),
    ).toBe("CLINIC_VISIT");
  });

  it("default helper returns URGENT_CARE for urgent care facility", () => {
    expect(
      resolveDefaultBillingClassification({
        facilityBillingSiteType: "URGENT_CARE",
        encounterType: "EMERGENCY",
      }),
    ).toBe("URGENT_CARE");
  });

  it("default helper returns EMERGENCY_DEPARTMENT for FSED and hospital ED", () => {
    expect(
      resolveDefaultBillingClassification({
        facilityBillingSiteType: "FREESTANDING_ER",
        encounterType: "URGENT_CARE",
      }),
    ).toBe("EMERGENCY_DEPARTMENT");
    expect(
      resolveDefaultBillingClassification({
        facilityBillingSiteType: "HOSPITAL",
        encounterType: "EMERGENCY",
      }),
    ).toBe("EMERGENCY_DEPARTMENT");
  });

  it("hybrid defaults to URGENT_CARE unless configured as ED", () => {
    expect(
      resolveDefaultBillingClassification({
        facilityBillingSiteType: "HYBRID",
        encounterType: "URGENT_CARE",
      }),
    ).toBe("URGENT_CARE");
    expect(
      resolveDefaultBillingClassification({
        facilityBillingSiteType: "HYBRID",
        encounterType: "URGENT_CARE",
        hybridRoutesAsEd: true,
      }),
    ).toBe("EMERGENCY_DEPARTMENT");
  });

  it("does not use diagnosis or chief complaint (type-only fallback)", () => {
    const withComplaintProxy = resolveDefaultBillingClassification({
      facilityBillingSiteType: null,
      encounterType: "URGENT_CARE",
    });
    expect(withComplaintProxy).toBe("URGENT_CARE");
    expect(mapEncounterTypeToLegacyBillingClassification("EMERGENCY")).toBe("EMERGENCY_DEPARTMENT");
  });

  it("UC → ED transition requires acknowledgment", () => {
    const v = validateBillingClassificationTransition({
      from: "URGENT_CARE",
      to: "EMERGENCY_DEPARTMENT",
      isAdmin: false,
    });
    expect(v.allowed).toBe(true);
    expect(v.requiresAcknowledgment).toBe(true);
  });

  it("ED → UC downgrade blocked without admin", () => {
    const v = validateBillingClassificationTransition({
      from: "EMERGENCY_DEPARTMENT",
      to: "URGENT_CARE",
      isAdmin: false,
    });
    expect(v.allowed).toBe(false);
    expect(v.code).toBe("ED_DOWNGRADE_REQUIRES_ADMIN");
  });
});
