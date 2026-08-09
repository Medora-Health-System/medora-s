import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { randomBytes } from "crypto";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";
import { applyE2eAuthTestEnv, assertE2eLoginAccessToken } from "../test-utils/e2e-auth-env";
import { closeE2eApp, createE2eApp } from "../test-utils/e2e-app";
import * as argon2 from "argon2";
import { RoleCode } from "@prisma/client";

describe("RBAC (e2e)", () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let frontDeskToken: string;
  let labToken: string;
  let providerToken: string;
  let facilityId: string | undefined;
  let patientId: string;
  const createdUserIds: string[] = [];

  const suffix = randomBytes(4).toString("hex");
  const email = (local: string) => `${local}+${suffix}@rbac-test.local`;
  const password = "Test123!";

  beforeAll(async () => {
    applyE2eAuthTestEnv();

    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = await createE2eApp(moduleRef);
    applyE2eAuthTestEnv();

    prisma = moduleRef.get<PrismaService>(PrismaService);

    const facility = await prisma.facility.create({
      data: {
        code: `RBAC-${suffix}`,
        name: "RBAC Test Facility",
        country: "Test",
        timezone: "UTC",
      },
    });
    facilityId = facility.id;

    const frontDeskRole = await prisma.role.upsert({
      where: { code: RoleCode.FRONT_DESK },
      update: {},
      create: { code: RoleCode.FRONT_DESK, name: "Front Desk" },
    });

    const labRole = await prisma.role.upsert({
      where: { code: RoleCode.LAB },
      update: {},
      create: { code: RoleCode.LAB, name: "Lab" },
    });

    const providerRole = await prisma.role.upsert({
      where: { code: RoleCode.PROVIDER },
      update: {},
      create: { code: RoleCode.PROVIDER, name: "Provider" },
    });

    const frontDeskUser = await prisma.user.create({
      data: {
        email: email("frontdesk"),
        firstName: "Front",
        lastName: "Desk",
        passwordHash: await argon2.hash(password),
      },
    });
    createdUserIds.push(frontDeskUser.id);

    const labUser = await prisma.user.create({
      data: {
        email: email("lab"),
        firstName: "Lab",
        lastName: "User",
        passwordHash: await argon2.hash(password),
      },
    });
    createdUserIds.push(labUser.id);

    const providerUser = await prisma.user.create({
      data: {
        email: email("provider"),
        firstName: "Provider",
        lastName: "User",
        passwordHash: await argon2.hash(password),
      },
    });
    createdUserIds.push(providerUser.id);

    await prisma.userRole.create({
      data: {
        userId: frontDeskUser.id,
        roleId: frontDeskRole.id,
        facilityId: facility.id,
      },
    });

    await prisma.userRole.create({
      data: {
        userId: labUser.id,
        roleId: labRole.id,
        facilityId: facility.id,
      },
    });

    await prisma.userRole.create({
      data: {
        userId: providerUser.id,
        roleId: providerRole.id,
        facilityId: facility.id,
      },
    });

    const frontDeskLogin = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ username: email("frontdesk"), password })
      .expect(201);

    frontDeskToken = assertE2eLoginAccessToken(frontDeskLogin.body, email("frontdesk"));

    const labLogin = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ username: email("lab"), password })
      .expect(201);

    labToken = assertE2eLoginAccessToken(labLogin.body, email("lab"));

    const providerLogin = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ username: email("provider"), password })
      .expect(201);

    providerToken = assertE2eLoginAccessToken(providerLogin.body, email("provider"));

    const patient = await prisma.patient.create({
      data: {
        facilityId: facility.id,
        registeredAtFacilityId: facility.id,
        firstName: "Test",
        lastName: "Patient",
        mrn: `RBAC-${suffix}`,
        globalMrn: `RBAC-G-${suffix}`,
      },
    });
    patientId = patient.id;
  });

  afterAll(async () => {
    try {
      if (prisma && facilityId) {
        await prisma.userRole.deleteMany({ where: { facilityId } });
        if (createdUserIds.length > 0) {
          // Authenticated requests may have durable AuditLog actor references. Deactivation is the
          // production lifecycle invariant; CI uses unique identities in a disposable database.
          await prisma.user.updateMany({
            where: { id: { in: createdUserIds } },
            data: { isActive: false },
          });
        }
        await prisma.patient.deleteMany({ where: { facilityId } });
        await prisma.facility.update({
          where: { id: facilityId },
          data: { isActive: false },
        });
      }
    } finally {
      await closeE2eApp({ app, moduleRef, prisma });
    }
  });

  describe("FRONT_DESK role access", () => {
    it("should allow FRONT_DESK to search patients", () => {
      return request(app.getHttpServer())
        .get("/patients/search?q=Test")
        .set("Authorization", `Bearer ${frontDeskToken}`)
        .set("x-facility-id", facilityId!)
        .expect(200);
    });

    it("should allow FRONT_DESK to read patient details", () => {
      return request(app.getHttpServer())
        .get(`/patients/${patientId}`)
        .set("Authorization", `Bearer ${frontDeskToken}`)
        .set("x-facility-id", facilityId!)
        .expect(200);
    });

    it("should allow FRONT_DESK to list patient encounters", () => {
      return request(app.getHttpServer())
        .get(`/patients/${patientId}/encounters`)
        .set("Authorization", `Bearer ${frontDeskToken}`)
        .set("x-facility-id", facilityId!)
        .expect(200);
    });
  });

  describe("LAB role restrictions", () => {
    it("should deny LAB access to patient clinical details", () => {
      return request(app.getHttpServer())
        .get(`/patients/${patientId}`)
        .set("Authorization", `Bearer ${labToken}`)
        .set("x-facility-id", facilityId!)
        .expect(403);
    });

    it("should allow LAB access to lab queue", () => {
      return request(app.getHttpServer())
        .get("/lab/queue")
        .set("Authorization", `Bearer ${labToken}`)
        .set("x-facility-id", facilityId!)
        .expect(200);
    });
  });

  describe("PROVIDER role access", () => {
    it("should allow PROVIDER full access to patient details", () => {
      return request(app.getHttpServer())
        .get(`/patients/${patientId}`)
        .set("Authorization", `Bearer ${providerToken}`)
        .set("x-facility-id", facilityId!)
        .expect(200);
    });

    it("should allow PROVIDER access to patient encounters", () => {
      return request(app.getHttpServer())
        .get(`/patients/${patientId}/encounters`)
        .set("Authorization", `Bearer ${providerToken}`)
        .set("x-facility-id", facilityId!)
        .expect(200);
    });
  });
});
