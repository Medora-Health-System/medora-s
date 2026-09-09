import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { AdminIntegrationsService } from "./admin-integrations.service";
import { FhirCapabilityRegistry } from "../fhir/fhir-capability.registry";
import { integrationEndpointConfigSchema, integrationInputSchema } from "./dto/admin-integration.dto";

describe("AdminIntegrationsService security contract", () => {
  beforeAll(() => { process.env.MEDORA_INTEROP_ENABLED = "true"; });
  afterAll(() => { delete process.env.MEDORA_INTEROP_ENABLED; });
  const authorizedUser = { id: "u", isActive: true, canCreateFacilities: true, userRoles: [{ id: "r" }] };
  const prisma: any = { user: { findUnique: jest.fn().mockResolvedValue(authorizedUser) }, facility: { count: jest.fn().mockResolvedValue(1), findMany: jest.fn().mockResolvedValue([]) }, integration: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() } };
  const audit: any = { log: jest.fn() };
  const service = new AdminIntegrationsService(prisma, audit, new FhirCapabilityRegistry());
  test("normal user is denied by database-backed platform authority", async () => { prisma.user.findUnique.mockResolvedValueOnce({ ...authorizedUser, canCreateFacilities: false }); await expect(service.list("u")).rejects.toBeInstanceOf(ForbiddenException); });
  test("permissions cannot exceed live capability registry", async () => { await expect(service.create("u", { protocol: "FHIR_R4", permissionCodes: ["patient.delete"], facilityIds: [] })).rejects.toBeInstanceOf(BadRequestException); });
  test("facility authorization is explicit and active facilities are verified", async () => { prisma.facility.count.mockResolvedValueOnce(0); await expect(service.create("u", { protocol: "FHIR_R4", permissionCodes: ["patient.read"], facilityIds: ["00000000-0000-0000-0000-000000000001"] })).rejects.toBeInstanceOf(BadRequestException); });
  test("platform facility options do not depend on a selected browser facility", async () => { await expect(service.facilityOptions("u")).resolves.toEqual([]); expect(prisma.facility.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isActive: true } })); });
  test("requires a facility and an implemented FHIR permission server-side", async () => { await expect(service.create("u", { protocol: "FHIR_R4", permissionCodes: ["patient.read"], facilityIds: [] })).rejects.toBeInstanceOf(BadRequestException); await expect(service.create("u", { protocol: "FHIR_R4", permissionCodes: [], facilityIds: ["00000000-0000-0000-0000-000000000001"] })).rejects.toBeInstanceOf(BadRequestException); });
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
  test("onboarding validation accepts an international phone and rejects an invalid email", () => {
    const valid = { displayName:"National Lab",partnerName:"National Laboratory Ltd",organizationType:"LABORATORY",jurisdiction:"GB",addressLine1:"1 High Street",city:"London",country:"GB",primaryContactFirstName:"Amina",primaryContactLastName:"Khan",primaryContactJobTitle:"Director",primaryContactEmail:"amina@example.org",primaryContactPhone:"+44 20 7946 0958",technicalContactSameAsPrimary:true,protocol:"FHIR_R4",direction:"BIDIRECTIONAL",environment:"SANDBOX",facilityIds:["00000000-0000-0000-0000-000000000001"],permissionCodes:["patient.read"] };
    expect(integrationInputSchema.safeParse(valid).success).toBe(true);
    const result = integrationInputSchema.safeParse({ ...valid, primaryContactEmail:"not-email" });
    expect(result.success).toBe(false); if (!result.success) expect(result.error.flatten().fieldErrors.primaryContactEmail).toBeDefined();
  });
});
