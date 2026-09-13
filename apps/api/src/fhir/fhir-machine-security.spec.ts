import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { FhirCapabilityGuard } from "./fhir-capability.guard";
import { FhirContextGuard } from "./fhir-context.guard";
import { FhirMachineIdentityService } from "./fhir-machine-identity.service";

function context(request: any, handler: any = () => undefined): any {
  return {
    getHandler: () => handler,
    getClass: () => class TestController {},
    switchToHttp: () => ({ getRequest: () => request }),
  };
}

describe("MEDORA.RD.P0.3E FHIR machine identity and scopes", () => {
  test("machine capability access requires the exact interaction scope", () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue({ resourceType: "Patient", interaction: "read" }) };
    const registry = { enabled: jest.fn().mockReturnValue([{ resourceType: "Patient", interaction: "read", futureM2mScope: "patient.read", humanRoles: [] }]) };
    const guard = new FhirCapabilityGuard(reflector as any, registry as any);
    const allowed = { fhirContext: { actorType: "machine", scopes: ["patient.read"], jurisdiction: "US" } };
    expect(guard.canActivate(context(allowed))).toBe(true);
    expect(allowed).toHaveProperty("fhirCapability.futureM2mScope", "patient.read");
    expect(() => guard.canActivate(context({ fhirContext: { actorType: "machine", scopes: ["patient.search"], jurisdiction: "US" } }))).toThrow(ForbiddenException);
  });

  test("machine facility context is token-bound and request headers cannot switch tenants", async () => {
    const prisma = { facility: { findFirst: jest.fn().mockResolvedValue({ country: "US" }) } };
    const profiles = { resolve: jest.fn().mockReturnValue([{ packageId: "base" }]) };
    const guard = new FhirContextGuard(prisma as any, profiles as any);
    const request: any = {
      user: { principalType: "fhir-client", clientId: "client-a", integrationId: "integration-a", facilityId: "facility-a", credentialId: "credential-a", keyId: "key-a", scopes: ["patient.read"] },
      headers: {}, query: {}, requestId: "req-a",
    };
    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect(request.fhirContext).toMatchObject({ actorType: "machine", actorId: "client-a", facilityId: "facility-a", integrationId: "integration-a", scopes: ["patient.read"] });
    await expect(guard.canActivate(context({ ...request, fhirContext: undefined, headers: { "x-facility-id": "facility-b" } }))).rejects.toThrow("Conflicting facility context");
  });

  test("runtime principal resolution rechecks client, credential, facility authorization, current scopes, and distributed rate bucket", async () => {
    const queryRaw = jest.fn()
      .mockResolvedValueOnce([{ clientId: "client-a", integrationId: "integration-a", facilityId: "facility-a", active: true, revokedAt: null, integrationStatus: "CONFIGURED", provisioningState: "PROVISIONED", authorizationActive: true, credentialId: "credential-a", credentialRevokedAt: null, credentialExpiresAt: null }])
      .mockResolvedValueOnce([{ capabilityCode: "patient.read" }])
      .mockResolvedValueOnce([{ requestCount: 1 }]);
    const prisma = { $queryRaw: queryRaw };
    const service = new FhirMachineIdentityService(prisma as any, {} as any, { log: jest.fn() } as any);
    const principal = await service.resolveMachinePrincipal({ tokenType: "fhir-m2m", clientId: "client-a", integrationId: "integration-a", facilityId: "facility-a", kid: "key-a", scopes: ["patient.read", "patient.search"] });
    expect(principal).toMatchObject({ principalType: "fhir-client", clientId: "client-a", facilityId: "facility-a", credentialId: "credential-a", scopes: ["patient.read"] });
    expect(queryRaw).toHaveBeenCalledTimes(3);
  });

  test("revoked credentials are denied before any scope or rate-limit evaluation", async () => {
    const queryRaw = jest.fn().mockResolvedValueOnce([{ clientId: "client-a", integrationId: "integration-a", facilityId: "facility-a", active: true, revokedAt: null, integrationStatus: "CONFIGURED", provisioningState: "PROVISIONED", authorizationActive: true, credentialId: "credential-a", credentialRevokedAt: new Date(), credentialExpiresAt: null }]);
    const service = new FhirMachineIdentityService({ $queryRaw: queryRaw } as any, {} as any, { log: jest.fn() } as any);
    await expect(service.resolveMachinePrincipal({ tokenType: "fhir-m2m", clientId: "client-a", integrationId: "integration-a", facilityId: "facility-a", kid: "key-a", scopes: ["patient.read"] })).rejects.toThrow(UnauthorizedException);
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });
});
