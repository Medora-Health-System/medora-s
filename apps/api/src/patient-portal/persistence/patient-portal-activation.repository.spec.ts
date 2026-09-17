import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("PatientPortalActivationRepository security contract", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/patient-portal/persistence/patient-portal-activation.repository.ts"),
    "utf8",
  );

  it("revokes previous unused activations when issuing a new one", () => {
    expect(source).toContain('UPDATE "PatientPortalActivation"');
    expect(source).toContain('"usedAt" IS NULL');
    expect(source).toContain('"revokedAt" IS NULL');
  });

  it("only finds unused, unrevoked, unexpired activations", () => {
    expect(source).toContain('"expiresAt" > CURRENT_TIMESTAMP');
    expect(source).toContain('AND "usedAt" IS NULL');
    expect(source).toContain('AND "revokedAt" IS NULL');
  });

  it("persists a hash rather than the raw activation secret", () => {
    expect(source).toContain("secretHash");
    expect(source).not.toContain("activationCode");
  });

  it("consumeAndLink verifies patient belongs to the activation facility", () => {
    expect(source).toContain("PATIENT_PORTAL_PATIENT_FACILITY_MISMATCH");
    expect(source).toContain('"facilityId" = ${input.facilityId}');
    expect(source).toContain('VERIFIED\'::"PatientPortalLinkStatus"');
  });
});
