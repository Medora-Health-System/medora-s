import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("Digital Care staff runtime registration", () => {
  it("registers DigitalCareModule independently of PATIENT_PORTAL_ENABLED", () => {
    const appModule = source("src/app.module.ts");
    expect(appModule).toContain("DigitalCareModule");
    expect(appModule).toMatch(/DigitalCareModule,\s*\n\s*\.\.\.\(process\.env\.PATIENT_PORTAL_ENABLED === "true" \? \[PatientPortalModule\] : \[\]\)/);
  });

  it("owns staff messaging and result-release controllers so they are not duplicated in PatientPortalModule", () => {
    const digitalCare = source("src/digital-care/digital-care.module.ts");
    const patientPortal = source("src/patient-portal/patient-portal.module.ts");
    expect(digitalCare).toContain("PatientMessagesStaffController");
    expect(digitalCare).toContain("PatientDiagnosticResultReleaseController");
    expect(patientPortal).not.toContain("PatientMessagesStaffController");
    expect(patientPortal).not.toContain("PatientDiagnosticResultReleaseController");
  });

  it("keeps staff Digital Care RBAC on ADMIN, PROVIDER, and RN", () => {
    const messaging = source("src/patient-portal/messages/patient-messages-staff.controller.ts");
    const results = source("src/patient-portal/records/patient-diagnostic-result-release.controller.ts");
    expect(messaging).toContain("RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.RN");
    expect(results).toContain("RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.RN");
    expect(messaging).not.toContain("RoleCode.FRONT_DESK");
    expect(results).not.toContain("RoleCode.FRONT_DESK");
  });
});
