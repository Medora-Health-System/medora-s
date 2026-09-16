import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const webRoot = join(import.meta.dirname, "../../..");
const page = readFileSync(join(webRoot, "app/app/digital-care/page.tsx"), "utf8");
const api = readFileSync(join(webRoot, "src/lib/digitalCareStaffMessagingApi.ts"), "utf8");

describe("Digital Care provider dashboard", () => {
  it("requires authoritative facility-scoped patient selection and shows human identity", () => {
    expect(page).toContain("PatientSearchAndSelect");
    expect(page).toContain("facilityId={facilityId}");
    expect(page).toContain("formatPatientLegalName(patient)");
    expect(page).toContain("patient.mrn");
    expect(page).toContain("patient.dob");
    expect(page).not.toContain("Patient: {r.patientId}");
  });

  it("keeps result release wired to the existing audited patient-portal endpoints", () => {
    expect(page).toContain("releaseDigitalCareResult");
    expect(page).toContain("revokeDigitalCareResult");
    expect(api).toContain('/patient-portal/v1/staff/results');
    expect(api).toContain('/release`');
  });

  it("includes the secure message/text workspace wired to patient portal messaging", () => {
    expect(page).toContain("Messages / Text");
    expect(page).toContain("replyDigitalCareStaffThread");
    expect(page).toContain("Message / text patient");
    expect(api).toContain('/patient-portal/v1/staff/messages/threads');
  });

  it("does not fabricate medication or discharge data while those projections are being unified", () => {
    expect(page).toContain("will not invent a second medication list");
    expect(page).toContain("No placeholder discharge data is displayed here");
    expect(page).toContain(`/app/patients/${'${patient.id}'}`);
  });
});
