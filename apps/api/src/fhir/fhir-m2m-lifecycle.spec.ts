import { BadRequestException } from "@nestjs/common";
import { FhirMachineCredentialAdminService } from "./fhir-machine-credential-admin.service";

describe("FHIR P0.3H credential lifecycle", () => {
  test("credential inventory never exposes stored secret material", async () => {
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{ id: "client-1", facilityId: "facility-1", active: true, revokedAt: null }])
        .mockResolvedValueOnce([{ id: "cred-1", keyId: "mk_test", createdAt: new Date("2026-09-14T00:00:00Z"), expiresAt: null, revokedAt: null, lastUsedAt: null }]),
    } as any;
    const service = new FhirMachineCredentialAdminService(prisma, {} as any);
    const rows = await service.listCredentials("integration-1", "client-1");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("ACTIVE");
    expect(JSON.stringify(rows).toLowerCase()).not.toContain("secrethash");
    expect(JSON.stringify(rows).toLowerCase()).not.toContain("clientsecret");
  });

  test("per-key revocation is scoped to the exact integration client and writes critical audit in the transaction", async () => {
    const executeRaw = jest.fn().mockResolvedValue(1);
    const audit = { log: jest.fn().mockResolvedValue(undefined) } as any;
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{ id: "client-1", facilityId: "facility-1", active: true, revokedAt: null }])
        .mockResolvedValueOnce([{ id: "cred-1", keyId: "mk_test", revokedAt: null }]),
      $transaction: jest.fn(async (callback: any) => callback({ $executeRaw: executeRaw })),
    } as any;
    const service = new FhirMachineCredentialAdminService(prisma, audit);
    const result = await service.revokeCredential("admin-1", "integration-1", "client-1", "cred-1");
    expect(result).toMatchObject({ revoked: true, credentialId: "cred-1", keyId: "mk_test", alreadyRevoked: false });
    expect(executeRaw).toHaveBeenCalledTimes(1);
    expect(audit.log).toHaveBeenCalledWith(expect.anything(), "FHIR_INTEGRATION_CLIENT", expect.objectContaining({
      critical: true,
      userId: "admin-1",
      facilityId: "facility-1",
      entityId: "client-1",
      metadata: expect.objectContaining({ event: "FHIR_M2M_CREDENTIAL_REVOKED", credentialId: "cred-1", keyId: "mk_test" }),
    }));
  });

  test("scope replacement rejects anything outside current integration permissions", async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: "client-1", facilityId: "facility-1", active: true, revokedAt: null }]),
      integration: { findUnique: jest.fn().mockResolvedValue({ permissions: [{ capabilityCode: "patient.read" }] }) },
    } as any;
    const service = new FhirMachineCredentialAdminService(prisma, {} as any);
    await expect(service.replaceScopes("admin-1", "integration-1", "client-1", ["patient.read", "condition.read"]))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  test("scope replacement can adopt newly granted clinical permissions without reprovisioning the client", async () => {
    const executeRaw = jest.fn().mockResolvedValue(1);
    const audit = { log: jest.fn().mockResolvedValue(undefined) } as any;
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: "client-1", facilityId: "facility-1", active: true, revokedAt: null }]),
      integration: { findUnique: jest.fn().mockResolvedValue({ permissions: [
        { capabilityCode: "patient.read" },
        { capabilityCode: "condition.read" },
        { capabilityCode: "serviceRequest.search" },
        { capabilityCode: "diagnosticReport.read" },
        { capabilityCode: "carePlan.search" },
      ] }) },
      $transaction: jest.fn(async (callback: any) => callback({ $executeRaw: executeRaw })),
    } as any;
    const service = new FhirMachineCredentialAdminService(prisma, audit);
    const scopes = ["patient.read", "condition.read", "serviceRequest.search", "diagnosticReport.read", "carePlan.search"];
    const result = await service.replaceScopes("admin-1", "integration-1", "client-1", scopes);
    expect(result.scopes).toEqual([...scopes].sort());
    expect(executeRaw).toHaveBeenCalledTimes(scopes.length + 2);
    expect(audit.log).toHaveBeenCalledWith(expect.anything(), "FHIR_INTEGRATION_CLIENT", expect.objectContaining({
      critical: true,
      metadata: expect.objectContaining({ event: "FHIR_M2M_SCOPES_REPLACED", scopeCount: scopes.length }),
    }));
  });
});
