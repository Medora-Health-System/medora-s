import { UnauthorizedException } from "@nestjs/common";
import { FhirCapabilityRegistry } from "./fhir-capability.registry";
import { FhirMachineIdentityService } from "./fhir-machine-identity.service";

describe("FHIR machine provisioning contract", () => {
  test("connection metadata exposes only non-secret public endpoints", () => {
    const service = Object.create(FhirMachineIdentityService.prototype) as FhirMachineIdentityService;
    const info = service.connectionInfo();
    expect(info.fhirBaseUrl).toContain("/fhir");
    expect(info.tokenUrl).toContain("/fhir/auth/token");
    expect(JSON.stringify(info).toLowerCase()).not.toContain("clientsecret");
  });

  test("machine scopes remain exact registry capability codes including reconciled clinical reads/searches", () => {
    const registry = new FhirCapabilityRegistry();
    const codes = registry.permissionOptions().map((option) => option.code);
    expect(codes).toEqual(expect.arrayContaining([
      "patient.read",
      "observation.search",
      "condition.read",
      "condition.search",
      "serviceRequest.read",
      "serviceRequest.search",
      "diagnosticReport.read",
      "diagnosticReport.search",
      "carePlan.read",
      "carePlan.search",
    ]));
    expect(codes).not.toContain("fhir.*");
  });

  test("a token backed by a subsequently revoked key is rejected before resource access", async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{
        clientId: "client-1",
        integrationId: "integration-1",
        facilityId: "facility-1",
        active: true,
        revokedAt: null,
        integrationStatus: "CONFIGURED",
        provisioningState: "PROVISIONED",
        authorizationActive: true,
        credentialId: "credential-1",
        credentialRevokedAt: new Date("2026-09-14T00:00:00Z"),
        credentialExpiresAt: null,
      }]),
    } as any;
    const service = new FhirMachineIdentityService(prisma, {} as any, {} as any);
    await expect(service.resolveMachinePrincipal({
      tokenType: "fhir-m2m",
      clientId: "client-1",
      integrationId: "integration-1",
      facilityId: "facility-1",
      kid: "mk_revoked",
      scopes: ["patient.read"],
    })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });
});
