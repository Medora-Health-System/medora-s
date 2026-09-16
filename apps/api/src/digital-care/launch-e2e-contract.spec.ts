import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("launch EMR to patient-app contract", () => {
  it("keeps patient clinical and request routes facility scoped", () => {
    const results = source("src/patient-portal/records/patient-diagnostic-results.controller.ts");
    const appointments = source("src/patient-portal/appointments/patient-appointments.controller.ts");
    const requests = source("src/patient-portal/requests/patient-service-requests.controller.ts");

    expect(results).toContain('@Controller("patient/v1/facilities/:facilityId")');
    expect(appointments).toContain('@Controller("patient/v1/facilities/:facilityId/appointments")');
    expect(requests).toContain('@Controller("patient/v1/facilities/:facilityId/requests")');
    expect(results).toContain("PatientPortalFacilityGuard");
    expect(appointments).toContain("PatientPortalFacilityGuard");
    expect(requests).toContain("PatientPortalFacilityGuard");
  });

  it("keeps staff result release and patient result reads on the same order-item authority", () => {
    const release = source("src/patient-portal/records/patient-diagnostic-result-release.controller.ts");
    const patientResults = source("src/patient-portal/records/patient-diagnostic-results.controller.ts");

    expect(release).toContain('@Controller("patient-portal/v1/staff/results")');
    expect(release).toContain('@Post(":orderItemId/release")');
    expect(release).toContain('@Delete(":orderItemId/release")');
    expect(patientResults).toContain('@Get("labs")');
    expect(patientResults).toContain('@Get("imaging")');
  });

  it("mounts patient Digital Care conversation endpoints under the authenticated patient runtime", () => {
    const runtime = source("src/digital-care/runtime/digital-care-patient-runtime.module.ts");
    const messages = source("src/digital-care/runtime/patient-self/digital-care-messages.controller.ts");
    const status = source("src/digital-care/runtime/patient-self/digital-care-portal-status.controller.ts");

    expect(runtime).toContain("DigitalCareMessagesController");
    expect(runtime).toContain("DigitalCarePortalStatusController");
    expect(messages).toContain('@Controller("digital-care/v1/me/conversations")');
    expect(messages).toContain("PatientPortalAuthGuard");
    expect(messages).toContain("requireMessagingEnabled");
    expect(status).toContain('@Controller("digital-care/v1/me")');
    expect(status).toContain('@Get("portal")');
  });

  it("does not let patient clients supply patient identity for the launch workflows", () => {
    const messages = source("src/digital-care/runtime/patient-self/digital-care-messages.controller.ts");
    const requests = source("src/patient-portal/requests/patient-service-requests.controller.ts");

    expect(messages).toContain("this.principal(req)");
    expect(messages).not.toContain('@Query("patientId")');
    expect(requests).not.toContain('@Param("patientId")');
    expect(requests).not.toContain('@Query("patientId")');
  });
});
