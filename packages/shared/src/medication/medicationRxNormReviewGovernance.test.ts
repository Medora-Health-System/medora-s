import { describe, expect, it } from "vitest";
import {
  assertRxNormPilotRemainsNonClinical,
  isRxNormReviewReadRole,
  isRxNormReviewWriteRole,
  RXNORM_EM_PILOT_DEFAULT_CONFIG,
  RXNORM_REVIEW_AUDIT_ACTION_VALUES,
} from "./medicationRxNormReviewGovernance.js";

describe("medicationRxNormReviewGovernance", () => {
  it("defaults pilot to disabled non-clinical mode", () => {
    expect(RXNORM_EM_PILOT_DEFAULT_CONFIG.enabled).toBe(false);
    expect(RXNORM_EM_PILOT_DEFAULT_CONFIG.importExecuted).toBe(false);
    expect(() => assertRxNormPilotRemainsNonClinical({ ...RXNORM_EM_PILOT_DEFAULT_CONFIG })).not.toThrow();
  });

  it("blocks clinical activation / auto-verify / import flags", () => {
    expect(() =>
      assertRxNormPilotRemainsNonClinical({
        ...RXNORM_EM_PILOT_DEFAULT_CONFIG,
        automaticVerificationEnabled: true,
      })
    ).toThrow(/automatic verification/i);
    expect(() =>
      assertRxNormPilotRemainsNonClinical({
        ...RXNORM_EM_PILOT_DEFAULT_CONFIG,
        importExecuted: true,
      })
    ).toThrow(/must not import/i);
  });

  it("recognizes reviewer and admin roles", () => {
    expect(isRxNormReviewWriteRole("MEDICATION_REVIEWER")).toBe(true);
    expect(isRxNormReviewWriteRole("MEDICATION_ADMIN")).toBe(true);
    expect(isRxNormReviewWriteRole("PHARMACY")).toBe(false);
    expect(isRxNormReviewReadRole("PHARMACY")).toBe(true);
    expect(RXNORM_REVIEW_AUDIT_ACTION_VALUES).toContain("APPROVE");
    expect(RXNORM_REVIEW_AUDIT_ACTION_VALUES).toContain("DEFER");
  });
});
