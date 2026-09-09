import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { RoleCode } from "@prisma/client";
import * as argon2 from "argon2";
import * as request from "supertest";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";
import { applyE2eAuthTestEnv, assertE2eLoginAccessToken } from "../test-utils/e2e-auth-env";
import { closeE2eApp, createE2eApp } from "../test-utils/e2e-app";

applyE2eAuthTestEnv();
process.env.MEDORA_INTEROP_ENABLED = "true";
jest.setTimeout(30_000);

describe("Admin integrations authorization (e2e)", () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  const suffix = Date.now().toString(36);
  const password = "Test123!";
  const emails = [`facility-admin-${suffix}@test.local`, `platform-admin-${suffix}@test.local`];
  let facilityId: string;
  let facilityAdminToken: string;
  let platformAdminToken: string;
  let displacedPlatformId: string | undefined;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = await createE2eApp(moduleRef);
    prisma = moduleRef.get(PrismaService);
    const facility = await prisma.facility.create({ data: { code: `INT-AUTH-${suffix}`, name: "Integration Auth Test", country: "US", timezone: "UTC" } });
    facilityId = facility.id;
    const adminRole = await prisma.role.upsert({ where: { code: RoleCode.ADMIN }, update: {}, create: { code: RoleCode.ADMIN, name: "Admin" } });
    const superRole = await prisma.role.upsert({ where: { code: RoleCode.MEDORA_SUPER_ADMIN }, update: {}, create: { code: RoleCode.MEDORA_SUPER_ADMIN, name: "Medora Super Admin" } });
    const existingPlatform = await prisma.user.findFirst({ where: { canCreateFacilities: true }, select: { id: true } });
    displacedPlatformId = existingPlatform?.id;
    if (displacedPlatformId) await prisma.user.update({ where: { id: displacedPlatformId }, data: { canCreateFacilities: false } });
    const [facilityAdmin, platformAdmin] = await Promise.all([
      prisma.user.create({ data: { email: emails[0]!, firstName: "Facility", lastName: "Admin", passwordHash: await argon2.hash(password), userRoles: { create: { facilityId, roleId: adminRole.id, professionCode: "ADMINISTRATOR", isActive: true } } } }),
      prisma.user.create({ data: { email: emails[1]!, firstName: "Platform", lastName: "Admin", passwordHash: await argon2.hash(password), canCreateFacilities: true, userRoles: { create: { facilityId, roleId: superRole.id, professionCode: "PLATFORM_ADMINISTRATOR", isActive: true } } } }),
    ]);
    const login = async (email: string) => assertE2eLoginAccessToken((await request(app.getHttpServer()).post("/auth/login").send({ username: email, password }).expect(201)).body, email);
    [facilityAdminToken, platformAdminToken] = await Promise.all([login(facilityAdmin.email), login(platformAdmin.email)]);
  });

  afterAll(async () => {
    if (prisma) {
      const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
      const userIds = users.map((user) => user.id);
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { email: { in: emails } } });
      if (displacedPlatformId) await prisma.user.update({ where: { id: displacedPlatformId }, data: { canCreateFacilities: true } });
      await prisma.facility.deleteMany({ where: { id: facilityId } });
    }
    await closeE2eApp({ app, moduleRef, prisma });
  });

  it("denies unauthenticated callers", () => request(app.getHttpServer()).get("/admin/integrations").expect(401));
  it("denies a facility-only ADMIN without platform authority", () => request(app.getHttpServer()).get("/admin/integrations").set("Authorization", `Bearer ${facilityAdminToken}`).set("x-facility-id", facilityId).expect(403));
  it("permits the current database-backed Medora platform administrator", () => request(app.getHttpServer()).get("/admin/integrations").set("Authorization", `Bearer ${platformAdminToken}`).set("x-facility-id", facilityId).expect(200));
});
