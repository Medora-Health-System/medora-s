import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { FhirDiagnosticOutboundService } from "./fhir-diagnostic-outbound.service";

describe("FHIR Phase 3B diagnostic outbound preparation", () => {
  const facilityId = "11111111-1111-4111-8111-111111111111";
  const integrationId = "22222222-2222-4222-8222-222222222222";
  const orderItemId = "33333333-3333-4333-8333-333333333333";

  function setup(overrides: Record<string, unknown> = {}) {
    const integration = {
      id: integrationId,
      protocol: "FHIR_R4",
      direction: "BIDIRECTIONAL",
      status: "CONFIGURED",
      provisioningState: "PROVISIONED",
      environment: "SANDBOX",
      endpointConfig: { baseUrl: "https://lab.example/fhir", authMethod: "NONE" },
      facilities: [{ facilityId, active: true, revokedAt: null }],
      permissions: [{ capabilityCode: "serviceRequest.read" }],
      ...overrides,
    };
    const prisma: any = {
      integration: { findFirst: jest.fn().mockResolvedValue(integration) },
      orderItem: { findFirst: jest.fn().mockResolvedValue({ id: orderItemId, catalogItemType: "LAB_TEST" }) },
    };
    const clinical: any = {
      read: jest.fn().mockResolvedValue({
        resourceType: "ServiceRequest",
        id: orderItemId,
        status: "active",
        authoredOn: "2026-09-15T12:00:00.000Z",
        code: { coding: [{ system: "urn:medora:catalog", code: "lab-cbc" }] },
      }),
    };
    const audit: any = { log: jest.fn().mockResolvedValue(undefined) };
    return { service: new FhirDiagnosticOutboundService(prisma, clinical, audit), prisma, clinical, audit };
  }

  it("prepares a facility-bound LAB ServiceRequest with deterministic idempotency", async () => {
    const { service, audit } = setup();
    const first = await service.prepareServiceRequest({ integrationId, facilityId, orderItemId });
    const second = await service.prepareServiceRequest({ integrationId, facilityId, orderItemId });
    expect(first.target.domain).toBe("LAB");
    expect(first.resourceType).toBe("ServiceRequest");
    expect(first.idempotencyKey).toBe(second.idempotencyKey);
    expect(first.idempotencyKey).toMatch(/^medora-diag-[a-f0-9]{64}$/);
    expect(audit.log).toHaveBeenCalled();
    expect(JSON.stringify(audit.log.mock.calls)).not.toContain("lab-cbc");
  });

  it("rejects an integration without facility authorization", async () => {
    const { service } = setup({ facilities: [] });
    await expect(service.prepareServiceRequest({ integrationId, facilityId, orderItemId })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects inbound-only partners and missing ServiceRequest permission", async () => {
    const inbound = setup({ direction: "INBOUND" }).service;
    await expect(inbound.prepareServiceRequest({ integrationId, facilityId, orderItemId })).rejects.toBeInstanceOf(ForbiddenException);
    const noScope = setup({ permissions: [] }).service;
    await expect(noScope.prepareServiceRequest({ integrationId, facilityId, orderItemId })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects production unauthenticated transport", async () => {
    const { service } = setup({ environment: "PRODUCTION" });
    await expect(service.prepareServiceRequest({ integrationId, facilityId, orderItemId })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects non-diagnostic order items", async () => {
    const { service, prisma } = setup();
    prisma.orderItem.findFirst.mockResolvedValueOnce(null);
    await expect(service.prepareServiceRequest({ integrationId, facilityId, orderItemId })).rejects.toBeInstanceOf(NotFoundException);
  });

  it("requires a configured secure URL outside local sandbox", async () => {
    const { service } = setup({ endpointConfig: { baseUrl: "http://lab.example/fhir", authMethod: "NONE" } });
    await expect(service.prepareServiceRequest({ integrationId, facilityId, orderItemId })).rejects.toBeInstanceOf(BadRequestException);
  });
});
