import { describe, expect, it } from "vitest";
import {
  canCheckInAppointment,
  canMarkAppointmentArrived,
  clinicCareVisitOriginDisplayToken,
  isEncounterVisitOrigin,
  normalizeEncounterVisitOrigin,
  projectRegistrationCompleteness,
} from "./clinicRegistrationAppointmentD4c3.js";
import { isHaitiPublicHealthJurisdiction } from "./facilityClinicCareProfileD4c1.js";

describe("MEDUI.D4C.3 visit origin + appointment contracts", () => {
  it("normalizes durable visit origins and rejects care-setting overload tokens", () => {
    expect(normalizeEncounterVisitOrigin("walk_in")).toBe("WALK_IN");
    expect(normalizeEncounterVisitOrigin("SCHEDULED")).toBe("SCHEDULED");
    expect(normalizeEncounterVisitOrigin(null)).toBeNull();
    expect(isEncounterVisitOrigin("OUTPATIENT")).toBe(false);
    expect(isEncounterVisitOrigin("URGENT_CARE")).toBe(false);
    expect(clinicCareVisitOriginDisplayToken(null)).toBe("LEGACY");
    expect(clinicCareVisitOriginDisplayToken("WALK_IN")).toBe("WALK_IN");
  });

  it("keeps ARRIVED and CHECKED_IN eligibility distinct", () => {
    expect(canMarkAppointmentArrived("SCHEDULED")).toBe(true);
    expect(canMarkAppointmentArrived("ARRIVED")).toBe(false);
    expect(canCheckInAppointment("ARRIVED")).toBe(true);
    expect(canCheckInAppointment("CHECKED_IN")).toBe(false);
    expect(canCheckInAppointment("CANCELLED")).toBe(false);
  });

  it("projects registration completeness without blocking on noncritical gaps", () => {
    const haiti = projectRegistrationCompleteness({
      patient: { firstName: "Jean", lastName: "Pierre", dob: "1990-01-01", sex: "HOMME" },
      insuranceRequired: false,
      visitOrigin: "WALK_IN",
    });
    expect(haiti.sections.find((s) => s.id === "INSURANCE")?.status).toBe("NOT_REQUIRED");
    expect(haiti.blocksClinicalCare).toBe(false);

    const incomplete = projectRegistrationCompleteness({
      patient: { firstName: "", lastName: "X" },
      insuranceRequired: true,
      hasPrimaryInsurance: false,
    });
    expect(incomplete.overallStatus).toBe("INCOMPLETE");
    expect(incomplete.blocksClinicalCare).toBe(true);
  });

  it("Haiti jurisdiction remains country-based, not language", () => {
    expect(isHaitiPublicHealthJurisdiction("HT")).toBe(true);
    expect(isHaitiPublicHealthJurisdiction("Haiti")).toBe(true);
    expect(isHaitiPublicHealthJurisdiction("FR")).toBe(false);
    expect(isHaitiPublicHealthJurisdiction("CA")).toBe(false);
  });
});
