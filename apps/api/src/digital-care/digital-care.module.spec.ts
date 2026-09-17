import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("Digital Care runtime registration", () => {
  it("registers staff DigitalCareModule independently of PATIENT_PORTAL_ENABLED", () => {
    const appModule = source("src/app.module.ts");
    expect(appModule).toContain("DigitalCareModule");
    expect(appModule).toMatch(/DigitalCareModule,\s*\n\s*\.\.\.\(process\.env\.PATIENT_PORTAL_ENABLED === "true" \? \[PatientPortalModule\] : \[\]\)/);
  });

  it("mounts patient Digital Care routes when the patient portal is enabled", () => {
    const digitalCare = source("src/digital-care/digital-care.module.ts");
    const patientRuntime = source("src/digital-care/runtime/digital-care-patient-runtime.module.ts");
    expect(digitalCare).toContain("DigitalCarePatientRuntimeModule");
    expect(digitalCare).toContain('process.env.PATIENT_PORTAL_ENABLED === "true"');
    expect(patientRuntime).toContain("DigitalCarePortalStatusController");
    expect(patientRuntime).toContain("DigitalCareMessagesController");
    expect(patientRuntime).toContain("FacilityConfigurationModule");
  });

  it("owns staff messaging and result-release controllers so they are not duplicated in PatientPortalModule", () => {
    const digitalCare = source("src/digital-care/digital-care.module.ts");
    const patientPortal = source("src/patient-portal/patient-portal.module.ts");
    expect(digitalCare).toContain("PatientMessagesStaffController");
    expect(digitalCare).toContain("PatientDiagnosticResultReleaseController");
    expect(digitalCare).toContain("DigitalCareStaffWorkspaceController");
    expect(patientPortal).not.toContain("PatientMessagesStaffController");
    expect(patientPortal).not.toContain("PatientDiagnosticResultReleaseController");
  });

  it("keeps staff Digital Care RBAC on ADMIN, PROVIDER, and RN", () => {
    const messaging = source("src/patient-portal/messages/patient-messages-staff.controller.ts");
    const results = source("src/patient-portal/records/patient-diagnostic-result-release.controller.ts");
    const workspace = source("src/digital-care/staff/digital-care-staff-workspace.controller.ts");
    expect(messaging).toContain("RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.RN");
    expect(results).toContain("RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.RN");
    expect(workspace).toContain("RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.RN");
    expect(messaging).not.toContain("RoleCode.FRONT_DESK");
    expect(results).not.toContain("RoleCode.FRONT_DESK");
    expect(workspace).not.toContain("RoleCode.FRONT_DESK");
  });

  it("resolves Digital Care and patient search facility from the authorized request context", () => {
    const workspace = source("src/digital-care/staff/digital-care-staff-workspace.controller.ts");
    const patients = source("src/patients/patients.controller.ts");
    const messaging = source("src/patient-portal/messages/patient-messages-staff.controller.ts");
    const results = source("src/patient-portal/records/patient-diagnostic-result-release.controller.ts");
    const rolesGuard = source("src/common/guards/roles.guard.ts");
    expect(rolesGuard).toContain("resolveRequestedFacilityId");
    expect(workspace).toContain("resolveAuthorizedFacilityId");
    expect(patients).toContain("resolveAuthorizedFacilityId");
    expect(messaging).toContain("resolveAuthorizedFacilityId");
    expect(results).toContain("resolveAuthorizedFacilityId");
    expect(workspace).toContain('@UseGuards(AuthGuard("jwt"), RolesGuard)');
    expect(patients).toContain('@UseGuards(AuthGuard("jwt"), RolesGuard)');
    expect(messaging).toContain('@UseGuards(AuthGuard("jwt"), RolesGuard)');
    expect(results).toContain('@UseGuards(AuthGuard("jwt"), RolesGuard)');
  });
});
