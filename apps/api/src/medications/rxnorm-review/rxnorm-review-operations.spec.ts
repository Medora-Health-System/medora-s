import {
  assertLegalMappingTransition,
  assertRxNormPilotRemainsNonClinical,
  RXNORM_EM_PILOT_DEFAULT_CONFIG,
  RXNORM_MAPPING_STATUS_TRANSITIONS,
  RXNORM_REVIEW_WRITE_ROLE_CODES,
} from "@medora/shared";
import { loadEmRealMappingPilotConfig } from "./rxnorm-review-operations";

describe("rxnorm review operations (phase 6)", () => {
  it("keeps EM pilot disabled and non-clinical by default", () => {
    const pilot = loadEmRealMappingPilotConfig();
    expect(pilot.enabled).toBe(false);
    expect(pilot.importExecuted).toBe(false);
    expect(pilot.clinicalActivationEnabled).toBe(false);
    expect(pilot.automaticVerificationEnabled).toBe(false);
    expect(pilot.targetCount).toBe(100);
    expect(() => assertRxNormPilotRemainsNonClinical(pilot)).not.toThrow();
    expect(() =>
      assertRxNormPilotRemainsNonClinical({
        ...RXNORM_EM_PILOT_DEFAULT_CONFIG,
        clinicalActivationEnabled: true,
      })
    ).toThrow(/clinical activation/i);
  });

  it("allows defer transitions from reviewable statuses", () => {
    for (const status of ["CANDIDATE", "NEEDS_REVIEW", "AMBIGUOUS", "CONFLICT"] as const) {
      expect(() => assertLegalMappingTransition(status, "DEFERRED")).not.toThrow();
    }
    expect(RXNORM_MAPPING_STATUS_TRANSITIONS.DEFERRED).toEqual(
      expect.arrayContaining(["VERIFIED", "REJECTED", "NEEDS_REVIEW"])
    );
  });

  it("defines MedicationReviewer / MedicationAdmin write roles", () => {
    expect(RXNORM_REVIEW_WRITE_ROLE_CODES).toContain("MEDICATION_REVIEWER");
    expect(RXNORM_REVIEW_WRITE_ROLE_CODES).toContain("MEDICATION_ADMIN");
  });
});
