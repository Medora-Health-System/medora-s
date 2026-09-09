import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { AdminIntegrationsService } from "./admin-integrations.service";
import { FhirCapabilityRegistry } from "../fhir/fhir-capability.registry";
import { integrationEndpointConfigSchema, integrationInputSchema } from "./dto/admin-integration.dto";

describe("AdminIntegrationsService security contract", () => {
  beforeAll(() => { process.env.MEDORA_INTEROP_ENABLED = "true"; });
  afterAll(() => { delete process.env.MEDORA_INTEROP_ENABLED; });
  const authorizedUser = { id: "u", isActive: true, canCreateFacilities: true, userRoles: [{ id: "r" }] };
  const prisma: any = { user: { findUnique: jest.fn().mockResolvedValue(authorizedUser) }, facility: { count: jest.fn().mockResolvedValue(1) }, integration: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() } };
  const audit: any = { log: jest.fn() };
  const service = new AdminIntegrationsService(prisma, audit, new FhirCapabilityRegistry());
  test("normal user is denied by database-backed platform authority", async () => { prisma.user.findUnique.mockResolvedValueOnce({ ...authorizedUser, canCreateFacilities: false }); await expect(service.list("u")).rejects.toBeInstanceOf(ForbiddenException); });
  test("permissions cannot exceed live capability registry", async () => { await expect(service.create("u", { protocol: "FHIR_R4", permissionCodes: ["patient.delete"], facilityIds: [] })).rejects.toBeInstanceOf(BadRequestException); });
  test("facility authorization is explicit and active facilities are verified", async () => { prisma.facility.count.mockResolvedValueOnce(0); await expect(service.create("u", { protocol: "FHIR_R4", permissionCodes: [], facilityIds: ["00000000-0000-0000-0000-000000000001"] })).rejects.toThrow("Unknown or inactive facility"); });
  test.each(["clientSecret", "secret", "apiKey", "api_key", "password", "privateKey", "private_key", "bearerToken", "accessToken", "refreshToken", "databaseUrl", "connectionString", "credentials"])("rejects hostile endpointConfig credential key %s", (key) => {
    expect(integrationEndpointConfigSchema.safeParse({ baseUrl: "https://partner.example", [key]: "do-not-store" }).success).toBe(false);
    expect(integrationInputSchema.safeParse({ displayName: "Lab", partnerName: "Partner", organizationType: "LABORATORY", protocol: "FHIR_R4", direction: "INBOUND", environment: "SANDBOX", jurisdiction: "US", facilityIds: [], permissionCodes: [], endpointConfig: { nested: { [key]: "do-not-store" } } }).success).toBe(false);
  });
  test("GET response allowlists endpoint metadata even for a legacy hostile database row", async () => {
    prisma.integration.findUnique.mockResolvedValueOnce({ id: "i", endpointConfig: { baseUrl: "https://safe.example", clientSecret: "leak", nested: { password: "leak" } }, facilities: [], permissions: [] });
    const result: any = await service.get("u", "i");
    expect(result.endpointConfig).toEqual({ baseUrl: "https://safe.example" });
    expect(JSON.stringify(result)).not.toContain("leak");
  });
});
