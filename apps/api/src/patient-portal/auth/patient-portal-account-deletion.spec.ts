import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("Patient portal account deletion contract", () => {
  it("requires an authenticated patient and password reauthentication", () => {
    const controller = source("src/patient-portal/auth/patient-portal-auth.controller.ts");
    const schemas = source("src/patient-portal/auth/patient-portal-auth.schemas.ts");
    const service = source("src/patient-portal/auth/patient-portal-auth.service.ts");
    expect(controller).toContain('@Delete("account")');
    expect(controller).toContain("@UseGuards(PatientPortalAuthGuard)");
    expect(schemas).toContain("patientPortalDeleteAccountBodySchema");
    expect(service).toContain("argon2.verify(account.passwordHash, body.password)");
  });

  it("revokes portal access and anonymizes portal identity without deleting the clinical Patient record", () => {
    const repository = source("src/patient-portal/persistence/patient-portal.repository.ts");
    expect(repository).toContain("disableAccountAndRevokeAccess");
    expect(repository).toContain('UPDATE "PatientPortalSession"');
    expect(repository).toContain('UPDATE "PatientPortalLink"');
    expect(repository).toContain('DELETE FROM "PatientPortalPushDevice"');
    expect(repository).toContain('DELETE FROM "PatientPortalNotification"');
    expect(repository).toContain("'DISABLED'::\"PatientPortalAccountStatus\"");
    expect(repository).toContain("deleted.medoras.invalid");
    expect(repository).not.toContain('DELETE FROM "Patient"');
  });

  it("records the destructive action before access is revoked", () => {
    const service = source("src/patient-portal/auth/patient-portal-auth.service.ts");
    expect(service).toContain('"PATIENT_PORTAL_ACCOUNT_DELETE"');
    expect(service).toContain("clinicalRecordsRetainedByProvider: true");
    expect(service.indexOf("PATIENT_PORTAL_ACCOUNT_DELETE")).toBeLessThan(
      service.indexOf("disableAccountAndRevokeAccess"),
    );
  });
});
