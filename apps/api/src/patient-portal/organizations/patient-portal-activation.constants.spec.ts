import { buildPatientInvitationUrl, maskPatientEmail } from "./patient-portal-activation.constants";

describe("patient portal invitation helpers", () => {
  it("masks the local part of Patient.email and never returns the full address", () => {
    expect(maskPatientEmail("Marie.Toussaint@Clinic.ht")).toBe("m***@clinic.ht");
    expect(maskPatientEmail("Marie.Toussaint@Clinic.ht")).not.toContain("toussaint");
  });

  it("puts only the activation credential on the invitation URL", () => {
    const url = buildPatientInvitationUrl("https://patient.medoras.com/", "act-id.secret");
    expect(url).toBe("https://patient.medoras.com/activate?code=act-id.secret");
    expect(url).not.toMatch(/mrn|dob|name|patientId/i);
  });
});
