/**
 * Phase 19G.1 — Single-medication governance lifecycle smoke test (API-level).
 * Uses Acetaminophen 500mg Tablet only; no bulk activation.
 */
import { randomUUID } from "node:crypto";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import * as argon2 from "argon2";
import { RoleCode } from "@prisma/client";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";
import { applyE2eAuthTestEnv, assertE2eLoginAccessToken } from "../test-utils/e2e-auth-env";
import {
  LIFECYCLE_TEST_MEDICATION,
  runMedicationGovernanceLifecycle,
} from "./medication-governance-lifecycle.harness";

describe("Medication governance lifecycle smoke (19G.1 e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let facilityId: string;
  let adminToken: string;
  let providerToken: string;
  let adminUserId: string;

  beforeAll(async () => {
    applyE2eAuthTestEnv();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    applyE2eAuthTestEnv();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    const facility = await prisma.facility.create({
      data: {
        code: `19G1-${Date.now()}`,
        name: "19G.1 Lifecycle Facility",
        country: "Test",
        timezone: "UTC",
      },
    });
    facilityId = facility.id;

    const adminRole = await prisma.role.upsert({
      where: { code: RoleCode.ADMIN },
      update: {},
      create: { code: RoleCode.ADMIN, name: "Admin" },
    });
    const providerRole = await prisma.role.upsert({
      where: { code: RoleCode.PROVIDER },
      update: {},
      create: { code: RoleCode.PROVIDER, name: "Provider" },
    });

    const adminUser = await prisma.user.create({
      data: {
        email: `admin-19g1-${randomUUID()}@test.local`,
        firstName: "Admin",
        lastName: "Lifecycle",
        passwordHash: await argon2.hash("Test123!"),
      },
    });
    adminUserId = adminUser.id;

    const providerUser = await prisma.user.create({
      data: {
        email: `provider-19g1-${randomUUID()}@test.local`,
        firstName: "Provider",
        lastName: "Lifecycle",
        passwordHash: await argon2.hash("Test123!"),
      },
    });

    await prisma.userRole.create({
      data: { userId: adminUser.id, roleId: adminRole.id, facilityId },
    });
    await prisma.userRole.create({
      data: { userId: providerUser.id, roleId: providerRole.id, facilityId },
    });

    const adminLogin = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ username: adminUser.email, password: "Test123!" })
      .expect(201);
    adminToken = assertE2eLoginAccessToken(adminLogin.body, adminUser.email!);

    const providerLogin = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ username: providerUser.email, password: "Test123!" })
      .expect(201);
    providerToken = assertE2eLoginAccessToken(providerLogin.body, providerUser.email!);
  }, 120000);

  afterAll(async () => {
    await app?.close();
  });

  it("runs full controlled activation lifecycle for Acetaminophen 500mg Tablet", async () => {
    const report = await runMedicationGovernanceLifecycle({
      app,
      prisma,
      facilityId,
      adminToken,
      providerToken,
      adminUserId,
    });

    const failed = report.steps.filter((s) => !s.ok);
    if (failed.length > 0) {
      // eslint-disable-next-line no-console
      console.error("Lifecycle failures:", JSON.stringify(failed, null, 2));
    }

    expect(report.ok).toBe(true);
    expect(report.searchBeforeOrderSearch).toBe(false);
    expect(report.searchAfterOrderSearch).toBe(true);
    expect(report.searchAfterDisable).toBe(false);
    expect(report.productId).toBeTruthy();
    expect(report.stagingRowId).toBeTruthy();

    const product = await prisma.medicationProduct.findUnique({
      where: { id: report.productId! },
      select: { strengthDisplay: true, dosageForm: true, concept: { select: { genericName: true } } },
    });
    expect(product?.concept.genericName).toBe(LIFECYCLE_TEST_MEDICATION.name);
    expect(product?.strengthDisplay).toBe(LIFECYCLE_TEST_MEDICATION.dose);
    expect(product?.dosageForm).toBe(LIFECYCLE_TEST_MEDICATION.form);
  }, 180000);
});
