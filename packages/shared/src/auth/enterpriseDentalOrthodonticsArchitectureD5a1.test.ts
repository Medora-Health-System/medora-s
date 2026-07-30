import { describe, expect, it } from "vitest";
import { D5A_FUTURE_DENTAL_SERVICE_LINES } from "./enterpriseFacilityIdentityOnboardingPrintProjectionD4c7i.js";
import {
  assertOrthodonticCaseDistinctFromEncounter,
  buildCanonicalToothIdentityKey,
  describeD5a2EntryCriteria,
  D5A1_FORBIDDEN_AUTHORITIES,
  D5A1_INPATIENT_SEMANTICS_FORBIDDEN_IN_DENTAL,
  D5A1_PROPOSED_ORTHODONTIC_CASE_STATES,
  D5A1_REQUIRED_SHARED_AUTHORITIES,
  D5A1_TOOTH_NUMBERING_SYSTEMS,
  D5A_ROADMAP_MILESTONES,
  ENTERPRISE_DENTAL_ORTHODONTICS_ARCHITECTURE_CERTIFICATION_ID,
  isForbiddenDentalAuthorityName,
} from "./enterpriseDentalOrthodonticsArchitectureD5a1.js";
import { MEDORA_FACILITY_TYPE_REGISTRY } from "./facilityTypeRegistry.js";

describe("MEDUI.D5A.1 dental/orthodontics architecture audit guards", () => {
  it("exports certification id and forbids DentalPatient / duplicate engines", () => {
    expect(ENTERPRISE_DENTAL_ORTHODONTICS_ARCHITECTURE_CERTIFICATION_ID).toBe("MEDUI.D5A.1");
    expect(D5A1_FORBIDDEN_AUTHORITIES).toContain("DentalPatient");
    expect(D5A1_FORBIDDEN_AUTHORITIES).toContain("OrthodonticPatient");
    expect(D5A1_FORBIDDEN_AUTHORITIES).toContain("DentalOrder");
    expect(D5A1_FORBIDDEN_AUTHORITIES).toContain("DentalPrescription");
    expect(D5A1_FORBIDDEN_AUTHORITIES).toContain("DentalBillingEngine");
    expect(D5A1_FORBIDDEN_AUTHORITIES).toContain("DentalAppointment");
    expect(D5A1_FORBIDDEN_AUTHORITIES).toContain("DentalImagingRepository");
    expect(isForbiddenDentalAuthorityName("DentalPatient")).toBe(true);
    expect(isForbiddenDentalAuthorityName("Patient")).toBe(false);
  });

  it("requires reuse of Patient and Encounter (not dental forks)", () => {
    expect(D5A1_REQUIRED_SHARED_AUTHORITIES).toContain("Patient");
    expect(D5A1_REQUIRED_SHARED_AUTHORITIES).toContain("Encounter");
    expect(D5A1_REQUIRED_SHARED_AUTHORITIES).toContain("Appointment");
    expect(D5A1_REQUIRED_SHARED_AUTHORITIES).toContain("Order");
  });

  it("keeps OrthodonticCase distinct from Encounter", () => {
    expect(
      assertOrthodonticCaseDistinctFromEncounter({
        orthodonticCaseId: "case-1",
        encounterId: "enc-1",
      })
    ).toEqual({ ok: true });
    expect(
      assertOrthodonticCaseDistinctFromEncounter({
        orthodonticCaseId: "same",
        encounterId: "same",
      })
    ).toEqual({ ok: false, reason: "CASE_EQUALS_ENCOUNTER" });
    expect(D5A1_PROPOSED_ORTHODONTIC_CASE_STATES).toContain("ACTIVE_TREATMENT");
    expect(D5A1_PROPOSED_ORTHODONTIC_CASE_STATES).not.toContain("OPEN");
  });

  it("defines notation-independent tooth identity", () => {
    expect(D5A1_TOOTH_NUMBERING_SYSTEMS).toEqual(["UNIVERSAL", "FDI", "PALMER"]);
    expect(
      buildCanonicalToothIdentityKey({
        patientId: "p1",
        canonicalToothCode: "perm_11",
      })
    ).toBe("p1:PERM_11");
  });

  it("forbids inpatient bed/census semantics in Dental Care", () => {
    expect(D5A1_INPATIENT_SEMANTICS_FORBIDDEN_IN_DENTAL).toContain("bedAvailability");
    expect(D5A1_INPATIENT_SEMANTICS_FORBIDDEN_IN_DENTAL).toContain("hospitalCensus");
  });

  it("aligns reserved dental service-line tokens with D4C.7I prep", () => {
    expect([...D5A_FUTURE_DENTAL_SERVICE_LINES]).toEqual(
      expect.arrayContaining(["DENTAL", "GENERAL_DENTISTRY", "ORTHODONTICS"])
    );
    const known = MEDORA_FACILITY_TYPE_REGISTRY.flatMap((e) => [...e.defaultServiceLines]);
    expect(known).not.toContain("DENTAL");
  });

  it("documents dependency-ordered D5A roadmap and D5A.2 entry criteria", () => {
    expect(D5A_ROADMAP_MILESTONES[0]).toBe("D5A.1");
    expect(D5A_ROADMAP_MILESTONES[1]).toBe("D5A.2");
    expect(D5A_ROADMAP_MILESTONES).toHaveLength(12);
    expect(describeD5a2EntryCriteria().length).toBeGreaterThanOrEqual(8);
  });
});
