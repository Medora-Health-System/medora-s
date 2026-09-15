import { BadRequestException, ForbiddenException, ServiceUnavailableException } from "@nestjs/common";
import { AdminIntegrationsService, INTEGRATION_CONTROL_PLANE_NOT_READY } from "./admin-integrations.service";
import { FhirCapabilityRegistry } from "../fhir/fhir-capability.registry";
import { integrationEndpointConfigSchema, integrationInputSchema, integrationPatchSchema } from "./dto/admin-integration.dto";

describe("AdminIntegrationsService security contract", () => {
  beforeAll(() => { process.env.MEDORA_INTEROP_ENABLED = "true"; });
  afterAll(() => { delete process.env.MEDORA_INTEROP_ENABLED; });

  const facilityId = "00000000-0000-0000-0000-000000000001";
  const authorizedUser = { id: "u", isActive: true, canCreateFacilities: true, userRoles: [{ id: "r" }] };
  const tx: any = {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    integration: { create: jest.fn(), update: jest.fn() },
    integrationFacilityAuthorization: { deleteMany: jest.fn(), createMany: jest.fn() },
    integrationPermission: { deleteMany: jest.fn(), createMany: jest.fn() },
  };
  const prisma: any = {
    user: { findUnique: jest.fn().mockResolvedValue(authorizedUser) },
    facility: { count: jest.fn().mockResolvedValue(1), findMany: jest.fn().mockResolvedValue([]) },
    integration: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() },
    $transaction: jest.fn(async (callback: (client: any) => Promise<unknown>) => callback(tx)),
  };
  const audit: any = { log: jest.fn().mockResolvedValue(undefined) };
  const service = new AdminIntegrationsService(prisma, audit, new FhirCapabilityRegistry());

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue(authorizedUser);
    prisma.facility.count.mockResolvedValue(1);
    prisma.facility.findMany.mockResolvedValue([]);
    prisma.integration.findMany.mockResolvedValue([]);
    prisma.$transaction.mockImplementation(async (callback: (client: any) => Promise<unknown>) => callback(tx));
    tx.$queryRaw.mockResolvedValue([]);
    tx.$executeRaw.mockResolvedValue(0);
    audit.log.mockResolvedValue(undefined);
  });

  test("normal user is denied by database-backed platform authority", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ ...authorizedUser, canCreateFacilities: false });
    await expect(service.list("u")).rejects.toBeInstanceOf(ForbiddenException);
  });

  test("permissions cannot exceed live capability registry", async () => {
    await expect(service.create("u", { protocol: "FHIR_R4", permissionCodes: ["patient.delete"], facilityIds: [] })).rejects.toBeInstanceOf(BadRequestException);
  });

  test("facility authorization is explicit and active facilities are verified", async () => {
    prisma.facility.count.mockResolvedValueOnce(0);
    await expect(service.create("u", { protocol: "FHIR_R4", permissionCodes: ["patient.read"], facilityIds: [facilityId] })).rejects.toBeInstanceOf(BadRequestException);
  });

  test("platform facility options do not depend on a selected browser facility", async () => {
    await expect(service.facilityOptions("u")).resolves.toEqual([]);
    expect(prisma.facility.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isActive: true } }));
  });

  test("requires a facility and an implemented FHIR permission server-side", async () => {
    await expect(service.create("u", { protocol: "FHIR_R4", permissionCodes: ["patient.read"], facilityIds: [] })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create("u", { protocol: "FHIR_R4", permissionCodes: [], facilityIds: [facilityId] })).rejects.toBeInstanceOf(BadRequestException);
  });

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
    const valid = { displayName:"National Lab",partnerName:"National Laboratory Ltd",organizationType:"LABORATORY",jurisdiction:"GB",addressLine1:"1 High Street",city:"London",country:"GB",primaryContactFirstName:"Amina",primaryContactLastName:"Khan",primaryContactJobTitle:"Director",primaryContactEmail:"amina@example.org",primaryContactPhone:"+44 20 7946 0958",technicalContactSameAsPrimary:true,protocol:"FHIR_R4",direction:"BIDIRECTIONAL",environment:"SANDBOX",facilityIds:[facilityId],permissionCodes:["patient.read"] };
    expect(integrationInputSchema.safeParse(valid).success).toBe(true);
    const result = integrationInputSchema.safeParse({ ...valid, primaryContactEmail:"not-email" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors.primaryContactEmail).toBeDefined();
  });

  test("PATCH contact and address validation is as strict as CREATE for formatted fields", () => {
    expect(integrationPatchSchema.safeParse({ primaryContactEmail: "bad-email" }).success).toBe(false);
    expect(integrationPatchSchema.safeParse({ primaryContactPhone: "x" }).success).toBe(false);
    expect(integrationPatchSchema.safeParse({ website: "not-a-url" }).success).toBe(false);
    expect(integrationPatchSchema.safeParse({ country: "USA" }).success).toBe(false);
    expect(integrationPatchSchema.safeParse({ primaryContactEmail: "ops@example.org", primaryContactPhone: "+1 972 555 0100", website: "https://partner.example", country: "us" }).success).toBe(true);
  });

  test("create, facility grants, permissions, and critical audit events share one transaction", async () => {
    tx.integration.create.mockResolvedValueOnce({
      id: "integration-1",
      endpointConfig: null,
      facilities: [{ facilityId, active: true }],
      permissions: [{ capabilityCode: "patient.read" }],
    });

    const result: any = await service.create("u", {
      displayName: "Priority Lab",
      partnerName: "Priority Lab LLC",
      organizationType: "LABORATORY",
      jurisdiction: "US",
      country: "US",
      addressLine1: "1 Main St",
      city: "Dallas",
      primaryContactFirstName: "Amina",
      primaryContactLastName: "Khan",
      primaryContactJobTitle: "Director",
      primaryContactEmail: "amina@example.org",
      primaryContactPhone: "+1 972 555 0100",
      technicalContactSameAsPrimary: true,
      protocol: "FHIR_R4",
      direction: "INBOUND",
      environment: "SANDBOX",
      facilityIds: [facilityId],
      permissionCodes: ["patient.read"],
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.integration.create).toHaveBeenCalledTimes(1);
    expect(result.id).toBe("integration-1");
    expect(audit.log).toHaveBeenCalledTimes(3);
    for (const call of audit.log.mock.calls) expect(call[2]).toEqual(expect.objectContaining({ tx, critical: true }));
  });

  test("permission removal retires stored machine-client scopes under the integration write lock", async () => {
    prisma.integration.findUnique.mockResolvedValueOnce({
      id: "integration-1",
      protocol: "FHIR_R4",
      technicalContactSameAsPrimary: false,
      endpointConfig: null,
      facilities: [],
      permissions: [{ capabilityCode: "patient.read" }, { capabilityCode: "condition.read" }],
    });
    tx.integration.update.mockResolvedValueOnce({
      id: "integration-1",
      protocol: "FHIR_R4",
      endpointConfig: null,
      facilities: [],
      permissions: [{ capabilityCode: "patient.read" }],
    });

    await service.update("u", "integration-1", { permissionCodes: ["patient.read"] });

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    const lockSql = tx.$queryRaw.mock.calls[0]?.[0] as { strings?: readonly string[] };
    expect(lockSql.strings?.join(" ")).toContain("FOR UPDATE");
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    const sql = tx.$executeRaw.mock.calls[0]?.[0] as { values?: unknown[] };
    expect(sql.values).toEqual(["integration-1", "condition.read"]);
    expect(tx.integrationPermission.deleteMany).toHaveBeenCalledWith({ where: { integrationId: "integration-1" } });
    expect(tx.integrationPermission.createMany).toHaveBeenCalledWith({ data: [{ integrationId: "integration-1", capabilityCode: "patient.read" }] });
  });

  test("newly granted permissions do not silently expand existing machine-client scopes", async () => {
    prisma.integration.findUnique.mockResolvedValueOnce({
      id: "integration-1",
      protocol: "FHIR_R4",
      technicalContactSameAsPrimary: false,
      endpointConfig: null,
      facilities: [],
      permissions: [{ capabilityCode: "patient.read" }],
    });
    tx.integration.update.mockResolvedValueOnce({
      id: "integration-1",
      protocol: "FHIR_R4",
      endpointConfig: null,
      facilities: [],
      permissions: [{ capabilityCode: "patient.read" }, { capabilityCode: "condition.read" }],
    });

    await service.update("u", "integration-1", { permissionCodes: ["patient.read", "condition.read"] });

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });

  test("audit failure inside create transaction rejects the save instead of reporting a partial success", async () => {
    tx.integration.create.mockResolvedValueOnce({ id: "integration-2", endpointConfig: null, facilities: [], permissions: [] });
    audit.log.mockRejectedValueOnce(new Error("audit unavailable"));
    await expect(service.create("u", {
      protocol: "FHIR_R4",
      direction: "INBOUND",
      environment: "SANDBOX",
      facilityIds: [facilityId],
      permissionCodes: ["patient.read"],
      technicalContactSameAsPrimary: true,
      primaryContactFirstName: "A",
      primaryContactLastName: "B",
      primaryContactJobTitle: "Director",
      primaryContactEmail: "a@example.org",
      primaryContactPhone: "+1 972 555 0100",
    })).rejects.toThrow("audit unavailable");
  });

  test("missing Integration tables or onboarding columns return an actionable readiness error", async () => {
    prisma.integration.findMany.mockRejectedValueOnce({ code: "P2021", message: "table does not exist" });
    await expect(service.list("u")).rejects.toBeInstanceOf(ServiceUnavailableException);
    try {
      await service.list("u");
    } catch {
      // second call is intentionally ignored; the first assertion above exercises the mapped error.
    }

    prisma.integration.findMany.mockRejectedValueOnce({ code: "P2022", message: "column does not exist" });
    try {
      await service.list("u");
      throw new Error("expected readiness error");
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      const response = (error as ServiceUnavailableException).getResponse() as any;
      expect(response.code).toBe(INTEGRATION_CONTROL_PLANE_NOT_READY);
      expect(response.message).toContain("Prisma migrations");
    }
  });
});
