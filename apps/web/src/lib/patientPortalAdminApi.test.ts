import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("patientPortalAdminApi facility context", () => {
  const source = readFileSync(resolve(__dirname, "./patientPortalAdminApi.ts"), "utf8");

  it("sends the same explicit facilityId used by Digital Care workspace", () => {
    expect(source).toContain("fetchPatientPortalAccess");
    expect(source).toContain("issuePatientPortalActivation");
    expect(source).toContain("{ facilityId }");
    expect(source).toContain("{ method: \"POST\", facilityId }");
    expect(source).not.toContain("x-facility-id");
  });

  it("keeps staff activation on the canonical admin endpoints", () => {
    expect(source).toContain("/patient-portal-admin/v1/patients/");
    expect(source).toContain("/access");
    expect(source).toContain("/activation");
  });
});
