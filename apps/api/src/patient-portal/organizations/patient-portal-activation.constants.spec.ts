import { buildPatientInvitationUrl, canonicalizeEmail, invitationEmailsMatch, maskPatientEmail } from "./patient-portal-activation.constants";

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

  it("canonicalizes emails with trim and case-insensitive comparison", () => {
    expect(canonicalizeEmail("  Marie.Toussaint@Clinic.HT ")).toBe("marie.toussaint@clinic.ht");
    expect(invitationEmailsMatch("Marie@Clinic.HT", "marie@clinic.ht")).toBe(true);
    expect(invitationEmailsMatch("marie@clinic.ht", "other@clinic.ht")).toBe(false);
    expect(invitationEmailsMatch(null, "marie@clinic.ht")).toBe(false);
    expect(invitationEmailsMatch("marie@clinic.ht", null)).toBe(false);
    expect(invitationEmailsMatch("", "marie@clinic.ht")).toBe(false);
  });
});
