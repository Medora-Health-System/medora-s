import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";
import * as argon2 from "argon2";
import { RoleCode } from "@prisma/client";

describe("RBAC (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let frontDeskToken: string;
  let labToken: string;
  let providerToken: string;
  let facilityId: string;
  let patientId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Create facility
    const facility = await prisma.facility.create({
      data: {
        code: "TEST",
        name: "Test Facility",
        country: "Test",
        timezone: "UTC",
      },
    });
    facilityId = facility.id;

    // Create roles
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

    // Create users
    const frontDeskUser = await prisma.user.create({
      data: {
        email: "frontdesk@test.local",
        firstName: "Front",
        lastName: "Desk",
        passwordHash: await argon2.hash("Test123!"),
      },
    });

    const labUser = await prisma.user.create({
      data: {
        email: "lab@test.local",
        firstName: "Lab",
        lastName: "User",
        passwordHash: await argon2.hash("Test123!"),
      },
    });

    const providerUser = await prisma.user.create({
      data: {
        email: "provider@test.local",
        firstName: "Provider",
        lastName: "User",
        passwordHash: await argon2.hash("Test123!"),
      },
    });

    // Assign roles
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

    // Login and get tokens
    const frontDeskLogin = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ username: "frontdesk@test.local", password: "Test123!" });

    frontDeskToken = frontDeskLogin.body.accessToken;

    const labLogin = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ username: "lab@test.local", password: "Test123!" });

    labToken = labLogin.body.accessToken;

    const providerLogin = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ username: "provider@test.local", password: "Test123!" });

    providerToken = providerLogin.body.accessToken;

    // Create a test patient
    const patient = await prisma.patient.create({
      data: {
        facilityId: facility.id,
        registeredAtFacilityId: facility.id,
        firstName: "Test",
        lastName: "Patient",
        mrn: "TEST001",
        globalMrn: "GLOBAL001",
      },
    });
    patientId = patient.id;
  });

  afterAll(async () => {
    await prisma.userRole.deleteMany({ where: { facilityId } });
    await prisma.user.deleteMany({ where: { email: { contains: "@test.local" } } });
    await prisma.patient.deleteMany({ where: { facilityId } });
    await prisma.facility.delete({ where: { id: facilityId } });
    await app.close();
  });

  describe("FRONT_DESK role access", () => {
    it("should allow FRONT_DESK to search patients", () => {
      return request(app.getHttpServer())
        .get("/patients/search?q=Test")
        .set("Authorization", `Bearer ${frontDeskToken}`)
        .set("x-facility-id", facilityId)
        .expect(200);
    });

    it("should allow FRONT_DESK to read patient details", () => {
      return request(app.getHttpServer())
        .get(`/patients/${patientId}`)
        .set("Authorization", `Bearer ${frontDeskToken}`)
        .set("x-facility-id", facilityId)
        .expect(200);
    });

    it("should allow FRONT_DESK to list patient encounters", () => {
      return request(app.getHttpServer())
        .get(`/patients/${patientId}/encounters`)
        .set("Authorization", `Bearer ${frontDeskToken}`)
        .set("x-facility-id", facilityId)
        .expect(200);
    });
  });

  describe("LAB role restrictions", () => {
    it("should deny LAB access to patient clinical details", () => {
      return request(app.getHttpServer())
        .get(`/patients/${patientId}`)
        .set("Authorization", `Bearer ${labToken}`)
        .set("x-facility-id", facilityId)
        .expect(403);
    });

    it("should allow LAB access to lab queue", () => {
      return request(app.getHttpServer())
        .get("/lab/queue")
        .set("Authorization", `Bearer ${labToken}`)
        .set("x-facility-id", facilityId)
        .expect(200);
    });
  });

  describe("PROVIDER role access", () => {
    it("should allow PROVIDER full access to patient details", () => {
      return request(app.getHttpServer())
        .get(`/patients/${patientId}`)
        .set("Authorization", `Bearer ${providerToken}`)
        .set("x-facility-id", facilityId)
        .expect(200);
    });

    it("should allow PROVIDER access to patient encounters", () => {
      return request(app.getHttpServer())
        .get(`/patients/${patientId}/encounters`)
        .set("Authorization", `Bearer ${providerToken}`)
        .set("x-facility-id", facilityId)
        .expect(200);
    });
  });
});

