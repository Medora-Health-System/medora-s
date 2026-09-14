import { ConflictException } from "@nestjs/common";
import { FhirMachineProvisioningService } from "./fhir-machine-provisioning.service";

jest.mock("argon2", () => ({
  argon2id: 2,
  hash: jest.fn(async () => "argon2id-hash"),
}));

describe("FhirMachineProvisioningService", () => {
  const input = { facilityId: "00000000-0000-4000-8000-000000000001" };
  const integration = {
    id: "integration-1",
    displayName: "Laboratoire C",
    sourceSystemIdentifier: "lab-c",
    protocol: "FHIR_R4",
    status: "CONFIGURED",
    facilities: [{ facilityId: input.facilityId, active: true, revokedAt: null }],
    permissions: [
      { capabilityCode: "patient.read" },
      { capabilityCode: "patient.search" },
    ],
  };

  function build(existing: any[] = []) {
    const tx = {
      $executeRaw: jest.fn(async () => 1),
      integration: { update: jest.fn(async () => ({})) },
    };
    const prisma = {
      $queryRaw: jest.fn(async () => existing),
      $transaction: jest.fn(async (fn: any) => fn(tx)),
    } as any;
    const integrations = { get: jest.fn(async () => integration) } as any;
    const machines = {
      provisionClient: jest.fn(async () => ({ clientId: "new-client" })),
      connectionInfo: jest.fn(() => ({ fhirBaseUrl: "https://api.medoras.com/fhir" })),
    } as any;
    const audit = { log: jest.fn(async () => undefined) } as any;
    return {
      service: new FhirMachineProvisioningService(prisma, integrations, machines, audit),
      prisma,
      integrations,
      machines,
      audit,
      tx,
    };
  }

  test("delegates normal first-time provisioning when no client exists", async () => {
    const { service, machines, prisma } = build([]);
    const result = await service.provision("admin-1", "integration-1", input);
    expect(result).toEqual({ clientId: "new-client" });
    expect(machines.provisionClient).toHaveBeenCalledWith("admin-1", "integration-1", input);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test("does not create a duplicate when an active client already exists", async () => {
    const { service, machines } = build([{ id: "client-1", active: true, revokedAt: null }]);
    await expect(service.provision("admin-1", "integration-1", input)).rejects.toBeInstanceOf(ConflictException);
    expect(machines.provisionClient).not.toHaveBeenCalled();
  });

  test("reprovisions a revoked client in place and preserves the unique client identity", async () => {
    const { service, machines, integrations, prisma, audit, tx } = build([
      { id: "client-revoked", active: false, revokedAt: new Date("2026-09-14T20:00:00.000Z") },
    ]);

    const result: any = await service.provision("admin-1", "integration-1", input);

    expect(integrations.get).toHaveBeenCalledWith("admin-1", "integration-1");
    expect(machines.provisionClient).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).toHaveBeenCalled();
    expect(tx.integration.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "integration-1" },
      data: expect.objectContaining({ provisioningState: "PROVISIONED", updatedById: "admin-1" }),
    }));
    expect(audit.log).toHaveBeenCalledWith(
      expect.anything(),
      "FHIR_INTEGRATION_CLIENT",
      expect.objectContaining({
        facilityId: input.facilityId,
        entityId: "client-revoked",
        critical: true,
        metadata: expect.objectContaining({
          event: "FHIR_M2M_CLIENT_REPROVISIONED",
          integrationId: "integration-1",
          scopeCount: 2,
        }),
      }),
    );
    expect(result.clientId).toBe("client-revoked");
    expect(result.facilityId).toBe(input.facilityId);
    expect(result.clientSecret).toEqual(expect.any(String));
    expect(result.keyId).toMatch(/^mk_/);
    expect(result.scopes).toEqual(expect.arrayContaining(["patient.read", "patient.search"]));
  });

  test("fails closed if a concurrent request reactivates the client first", async () => {
    const { service, tx } = build([
      { id: "client-revoked", active: false, revokedAt: new Date("2026-09-14T20:00:00.000Z") },
    ]);
    tx.$executeRaw.mockResolvedValueOnce(0);
    await expect(service.provision("admin-1", "integration-1", input)).rejects.toBeInstanceOf(ConflictException);
  });
});
