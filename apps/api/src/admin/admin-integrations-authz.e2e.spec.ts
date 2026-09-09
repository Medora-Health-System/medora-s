import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { RoleCode } from "@prisma/client";
import * as argon2 from "argon2";
import * as request from "supertest";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";
import { FhirCapabilityRegistry } from "../fhir/fhir-capability.registry";
import { applyE2eAuthTestEnv, assertE2eLoginAccessToken } from "../test-utils/e2e-auth-env";
import { closeE2eApp, createE2eApp } from "../test-utils/e2e-app";

applyE2eAuthTestEnv();
process.env.MEDORA_INTEROP_ENABLED = "true";
jest.setTimeout(120_000);

describe("Admin integrations authorization (e2e)", () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  const suffix = Date.now().toString(36);
  const password = "Test123!";
  const emails = [`facility-admin-${suffix}@test.local`, `platform-admin-${suffix}@test.local`];
  let facilityId: string;
  let secondFacilityId: string;
  let inactiveFacilityId: string;
  let platformAdminId: string;
  let createdIntegrationId: string;
  let legacyIntegrationId: string;
  let facilityAdminToken: string;
  let platformAdminToken: string;
  let displacedPlatformId: string | undefined;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = await createE2eApp(moduleRef);
    prisma = moduleRef.get(PrismaService);
    const facility = await prisma.facility.create({ data: { code: `INT-AUTH-${suffix}`, name: "Integration Auth Test", country: "US", timezone: "UTC", billingCity: "Boston", billingStateProvince: "MA" } });
    facilityId = facility.id;
    const secondFacility = await prisma.facility.create({ data: { code: `INT-SECOND-${suffix}`, name: "Integration Second Test", country: "DO", timezone: "UTC", billingCity: "Santo Domingo" } });
    secondFacilityId = secondFacility.id;
    const inactiveFacility = await prisma.facility.create({ data: { code: `INT-INACTIVE-${suffix}`, name: "Integration Inactive Test", country: "HT", timezone: "UTC", isActive: false } });
    inactiveFacilityId = inactiveFacility.id;
    const adminRole = await prisma.role.upsert({ where: { code: RoleCode.ADMIN }, update: {}, create: { code: RoleCode.ADMIN, name: "Admin" } });
    const superRole = await prisma.role.upsert({ where: { code: RoleCode.MEDORA_SUPER_ADMIN }, update: {}, create: { code: RoleCode.MEDORA_SUPER_ADMIN, name: "Medora Super Admin" } });
    const existingPlatform = await prisma.user.findFirst({ where: { canCreateFacilities: true }, select: { id: true } });
    displacedPlatformId = existingPlatform?.id;
    if (displacedPlatformId) await prisma.user.update({ where: { id: displacedPlatformId }, data: { canCreateFacilities: false } });
    const [facilityAdmin, platformAdmin] = await Promise.all([
      prisma.user.create({ data: { email: emails[0]!, firstName: "Facility", lastName: "Admin", passwordHash: await argon2.hash(password), userRoles: { create: { facilityId, roleId: adminRole.id, professionCode: "ADMINISTRATOR", isActive: true } } } }),
      prisma.user.create({ data: { email: emails[1]!, firstName: "Platform", lastName: "Admin", passwordHash: await argon2.hash(password), canCreateFacilities: true, userRoles: { create: { facilityId, roleId: superRole.id, professionCode: "PLATFORM_ADMINISTRATOR", isActive: true } } } }),
    ]);
    platformAdminId = platformAdmin.id;
    const legacy = await prisma.integration.create({ data: { displayName: "Legacy P0.3A", partnerName: "Legacy Partner", organizationType: "LABORATORY", protocol: "FHIR_R4", direction: "INBOUND", environment: "SANDBOX", jurisdiction: "US", createdById: platformAdmin.id, updatedById: platformAdmin.id } });
    legacyIntegrationId = legacy.id;
    const login = async (email: string) => assertE2eLoginAccessToken((await request(app.getHttpServer()).post("/auth/login").send({ username: email, password }).expect(201)).body, email);
    [facilityAdminToken, platformAdminToken] = await Promise.all([login(facilityAdmin.email), login(platformAdmin.email)]);
  });

  afterAll(async () => {
    if (prisma) {
      const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
      const userIds = users.map((user) => user.id);
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.integration.deleteMany({ where: { createdById: { in: userIds } } });
      await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { email: { in: emails } } });
      if (displacedPlatformId) await prisma.user.update({ where: { id: displacedPlatformId }, data: { canCreateFacilities: true } });
      await prisma.facility.deleteMany({ where: { id: { in: [facilityId, secondFacilityId, inactiveFacilityId] } } });
    }
    await closeE2eApp({ app, moduleRef, prisma });
  });

  it("denies unauthenticated callers", () => request(app.getHttpServer()).get("/admin/integrations").expect(401));
  it("denies a facility-only ADMIN without platform authority", () => request(app.getHttpServer()).get("/admin/integrations").set("Authorization", `Bearer ${facilityAdminToken}`).set("x-facility-id", facilityId).expect(403));
  it("lists integrations without selected clinical facility and reads a legacy P0.3A row", async () => {
    const response = await request(app.getHttpServer()).get("/admin/integrations").set("Authorization", `Bearer ${platformAdminToken}`).expect(200);
    const legacy = response.body.find((row: any) => row.id === legacyIntegrationId);
    expect(legacy).toMatchObject({ displayName: "Legacy P0.3A", partnerName: "Legacy Partner" });
    expect(legacy.addressLine1).toBeNull();
    expect(legacy.primaryContactEmail).toBeNull();
  });

  it("returns only active safe facility metadata without selected clinical facility", async () => {
    const response = await request(app.getHttpServer()).get("/admin/integrations/facility-options").set("Authorization", `Bearer ${platformAdminToken}`).expect(200);
    expect(response.body.some((row: any) => row.id === facilityId)).toBe(true);
    expect(response.body.some((row: any) => row.id === inactiveFacilityId)).toBe(false);
    for (const row of response.body) expect(Object.keys(row).sort()).toEqual(["billingCity", "billingStateProvince", "code", "country", "id", "name"]);
  });

  it("derives permission options from FhirCapabilityRegistry", async () => {
    const response = await request(app.getHttpServer()).get("/admin/integrations/permission-options").set("Authorization", `Bearer ${platformAdminToken}`).expect(200);
    expect(response.body).toEqual(moduleRef.get(FhirCapabilityRegistry).permissionOptions());
  });

  it("creates a complete integration and persists non-PII audit metadata", async () => {
    const payload = { displayName: "UK National Lab", partnerName: "National Laboratory Limited", organizationType: "LABORATORY", jurisdiction: "GB", organizationRegistrationId: "REG-123", website: "https://lab.example.org", addressLine1: "1 High Street", addressLine2: "Floor 2", city: "London", stateProvinceRegion: "Greater London", postalCode: "SW1A 1AA", country: "GB", primaryContactFirstName: "Amina", primaryContactLastName: "Khan", primaryContactJobTitle: "Integration Director", primaryContactDepartment: "Operations", primaryContactEmail: "amina.khan@example.org", primaryContactPhone: "+44 20 7946 0958", primaryContactExtension: "42", primaryContactMobile: "+44 7700 900123", technicalContactSameAsPrimary: false, technicalContactName: "Tariq Ali", technicalContactJobTitle: "Integration Engineer", technicalContactEmail: "tariq.ali@example.org", technicalContactPhone: "+44 20 7946 0999", technicalContactExtension: "51", protocol: "FHIR_R4", direction: "BIDIRECTIONAL", environment: "SANDBOX", facilityIds: [facilityId], permissionCodes: ["patient.read"] };
    const response = await request(app.getHttpServer()).post("/admin/integrations").set("Authorization", `Bearer ${platformAdminToken}`).send(payload).expect(201);
    createdIntegrationId = response.body.id;
    expect(response.body).toMatchObject({ displayName: payload.displayName, addressLine1: payload.addressLine1, primaryContactEmail: payload.primaryContactEmail, provisioningState: "PENDING_PROVISIONING" });
    const audits = await prisma.auditLog.findMany({ where: { userId: platformAdminId, entityId: createdIntegrationId } });
    expect(audits.map((row) => (row.metadata as any)?.event)).toEqual(expect.arrayContaining(["INTEGRATION_CREATED", "FACILITY_ACCESS_GRANTED", "SCOPE_GRANTED"]));
    expect(JSON.stringify(audits)).not.toContain(payload.primaryContactEmail);
    expect(JSON.stringify(audits)).not.toContain(payload.primaryContactPhone);
  });

  it.each([
    ["fabricated facility", { facilityIds: ["00000000-0000-0000-0000-000000000001"], permissionCodes: ["patient.read"] }],
    ["inactive facility", { facilityIds: () => [inactiveFacilityId], permissionCodes: ["patient.read"] }],
    ["fabricated permission", { facilityIds: () => [facilityId], permissionCodes: ["patient.delete"] }],
    ["zero facilities", { facilityIds: [], permissionCodes: ["patient.read"] }],
    ["zero FHIR permissions", { facilityIds: () => [facilityId], permissionCodes: [] }],
  ])("rejects %s", async (_name, overrides: any) => {
    const facilityIds = typeof overrides.facilityIds === "function" ? overrides.facilityIds() : overrides.facilityIds;
    await request(app.getHttpServer()).post("/admin/integrations").set("Authorization", `Bearer ${platformAdminToken}`).send({ displayName: "Rejected Integration", partnerName: "Rejected Partner", organizationType: "OTHER", jurisdiction: "US", addressLine1: "1 Main St", city: "Boston", country: "US", primaryContactFirstName: "Pat", primaryContactLastName: "Lee", primaryContactJobTitle: "Owner", primaryContactEmail: "pat@example.org", primaryContactPhone: "+1 617 555 0100", technicalContactSameAsPrimary: true, protocol: "FHIR_R4", direction: "INBOUND", environment: "SANDBOX", facilityIds, permissionCodes: overrides.permissionCodes }).expect(400);
  });

  it("persists update and grant/revoke audit events without contact PII", async () => {
    await request(app.getHttpServer()).patch(`/admin/integrations/${createdIntegrationId}`).set("Authorization", `Bearer ${platformAdminToken}`).send({ displayName: "UK National Lab Updated", facilityIds: [secondFacilityId], permissionCodes: ["encounter.read"] }).expect(200);
    const audits = await prisma.auditLog.findMany({ where: { userId: platformAdminId, entityId: createdIntegrationId } });
    expect(audits.map((row) => (row.metadata as any)?.event)).toEqual(expect.arrayContaining(["INTEGRATION_UPDATED", "FACILITY_ACCESS_GRANTED", "FACILITY_ACCESS_REVOKED", "SCOPE_GRANTED", "SCOPE_REVOKED"]));
    expect(JSON.stringify(audits)).not.toContain("amina.khan@example.org");
  });
});
