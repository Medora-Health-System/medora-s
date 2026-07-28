import { describe, expect, it } from "vitest";
import {
  canCheckInAppointment,
  clinicCareVisitOriginDisplayToken,
  projectRegistrationCompleteness,
} from "@medora/shared";

describe("MEDUI.D4C.3 clinic registration web contracts", () => {
  it("maps legacy null origin to LEGACY display token", () => {
    expect(clinicCareVisitOriginDisplayToken(null)).toBe("LEGACY");
    expect(clinicCareVisitOriginDisplayToken("WALK_IN")).toBe("WALK_IN");
  });

  it("keeps check-in eligibility separate from arrived-only", () => {
    expect(canCheckInAppointment("ARRIVED")).toBe(true);
    expect(canCheckInAppointment("CHECKED_IN")).toBe(false);
  });

  it("does not require U.S. insurance for Haiti completeness", () => {
    const proj = projectRegistrationCompleteness({
      patient: { firstName: "A", lastName: "B", dob: "2000-01-01", sex: "F" },
      insuranceRequired: false,
      visitOrigin: "WALK_IN",
    });
    expect(proj.sections.find((s) => s.id === "INSURANCE")?.status).toBe("NOT_REQUIRED");
  });
});
