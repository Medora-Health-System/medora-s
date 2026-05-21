/**
 * Phase 19H — Global Priority ER baseline promotion (no runtime activation).
 */
import { randomUUID } from "node:crypto";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import * as argon2 from "argon2";
import { Prisma, RoleCode } from "@prisma/client";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";
import { applyE2eAuthTestEnv, assertE2eLoginAccessToken } from "../test-utils/e2e-auth-env";
import {
  buildPriorityErStagingRawJson,
  LIFECYCLE_TEST_MEDICATION,
} from "./medication-governance-lifecycle.harness";
import { mergeGovernanceIntoRawJson } from "./priority-er-inventory-governance.util";
import { MEDICATION_BASELINE_SOURCE_PRIORITY_ER } from "./medication-baseline.constants";
import { parseProductRuntimeActivation } from "./medication-product-runtime-activation.util";

describe("Medication global baseline (19H e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let facilityA: string;
  let facilityB: string;
  let adminToken: string;
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

    const facA = await prisma.facility.create({
      data: { code: `19H-A-${Date.now()}`, name: "Facility A", country: "Test", timezone: "UTC" },
    });
    facilityA = facA.id;
    const facB = await prisma.facility.create({
      data: { code: `19H-B-${Date.now()}`, name: "Facility B", country: "Test", timezone: "UTC" },
    });
    facilityB = facB.id;

    const adminRole = await prisma.role.upsert({
      where: { code: RoleCode.ADMIN },
      update: {},
      create: { code: RoleCode.ADMIN, name: "Admin" },
    });

    const adminUser = await prisma.user.create({
      data: {
        email: `admin-19h-${randomUUID()}@test.local`,
        firstName: "Admin",
        lastName: "Baseline",
        passwordHash: await argon2.hash("Test123!"),
      },
    });
    adminUserId = adminUser.id;
    await prisma.userRole.create({
      data: { userId: adminUser.id, roleId: adminRole.id, facilityId: facilityA },
    });
    await prisma.userRole.create({
      data: { userId: adminUser.id, roleId: adminRole.id, facilityId: facilityB },
    });

    adminToken = assertE2eLoginAccessToken(
      (
        await request(app.getHttpServer())
          .post("/auth/login")
          .send({ username: adminUser.email, password: "Test123!" })
          .expect(201)
      ).body,
      adminUser.email!
    );
  }, 120000);

  afterAll(async () => {
    await app?.close();
  });

  async function seedStagingRow(suffix: string, facilityId: string | null) {
    const medName = `${LIFECYCLE_TEST_MEDICATION.name} ${suffix}`;
    const dose = `${LIFECYCLE_TEST_MEDICATION.dose}`;
    const form = LIFECYCLE_TEST_MEDICATION.form;
    const exactSourceText = `${medName} ${dose} ${form}`;
    const rawJson = mergeGovernanceIntoRawJson(
      {
        ...buildPriorityErStagingRawJson(),
        medication: medName,
        dose,
        form,
        exact_source_text: exactSourceText,
        __sourceTrace: {
          exactSourceText,
          sourceNameExact: medName,
          sourceStrengthExact: dose,
          sourceRouteExact: form,
          sourcePackageExact: form,
          sourceReviewStatus: "MANUAL_REVIEW_REQUIRED",
        },
      },
      {
        duplicateResolutionStatus: "CREATE_NEW_APPROVED",
        governanceDecision: "CREATE_NEW_APPROVED",
      }
    );
    return prisma.medicationFormularyImportStaging.create({
      data: {
        facilityId,
        batchId: `19H-BATCH-${suffix}`,
        sourceRowId: `PRI_ER_19H_${suffix}`,
        sourceInventoryDescription: exactSourceText,
        rawJson: rawJson as Prisma.InputJsonValue,
        reconciliationStatus: "NEW_CANDIDATE",
        importGateStatus: "BLOCKED",
        overallStatus: "draft",
        reviewFlags: [],
        ndc11: `123456789${suffix.slice(0, 2)}`,
        importedByUserId: adminUserId,
      },
    });
  }

  it("promotes staging to global baseline with exact source preserved", async () => {
    const suffix = randomUUID().slice(0, 8);
    const staging = await seedStagingRow(suffix, null);

    const res = await request(app.getHttpServer())
      .post(`/medication-master/governance/baseline/promote-priority-er/${staging.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-facility-id", facilityA)
      .send({ facilityOverlayId: facilityA })
      .expect(201);

    expect(res.body.status).toBe("promoted");
    expect(res.body.result.globalBaseline).toBe(true);

    const product = await prisma.medicationProduct.findUnique({
      where: { id: res.body.result.productId },
    });
    expect(product?.baselineAvailable).toBe(true);
    expect(product?.baselineSource).toBe(MEDICATION_BASELINE_SOURCE_PRIORITY_ER);
    expect(product?.baselineSourceRowId).toBe(staging.sourceRowId);
    expect(product?.strengthDisplay).toBe(LIFECYCLE_TEST_MEDICATION.dose);
    expect(product?.isActive).toBe(false);

    const runtime = parseProductRuntimeActivation(product?.governanceNotes ?? null);
    expect(runtime.orderSearchEnabled).toBe(false);
    expect(runtime.marEnabled).toBe(false);
    expect(runtime.billingEnabled).toBe(false);
  });

  it("global baseline promote is idempotent", async () => {
    const suffix = randomUUID().slice(0, 8);
    const staging = await seedStagingRow(suffix, null);

    const first = await request(app.getHttpServer())
      .post(`/medication-master/governance/baseline/promote-priority-er/${staging.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-facility-id", facilityA)
      .send({})
      .expect(201);

    const second = await request(app.getHttpServer())
      .post(`/medication-master/governance/baseline/promote-priority-er/${staging.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-facility-id", facilityA)
      .send({})
      .expect(201);

    expect(second.body.result.productId).toBe(first.body.result.productId);

    const count = await prisma.medicationProduct.count({
      where: {
        baselineSourceRowId: staging.sourceRowId,
        baselineSource: MEDICATION_BASELINE_SOURCE_PRIORITY_ER,
      },
    });
    expect(count).toBe(1);
  });

  it("baseline visible in explorer across facilities without enabling provider search", async () => {
    const suffix = randomUUID().slice(0, 8);
    const staging = await seedStagingRow(suffix, null);

    const promo = await request(app.getHttpServer())
      .post(`/medication-master/governance/baseline/promote-priority-er/${staging.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-facility-id", facilityA)
      .send({ facilityOverlayId: facilityA })
      .expect(201);

    const listB = await request(app.getHttpServer())
      .get("/medication-master/governance/baseline/priority-er-products")
      .query({ q: suffix })
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-facility-id", facilityB)
      .expect(200);

    const ids = (listB.body.items as Array<{ productId: string }>).map((i) => i.productId);
    expect(ids).toContain(promo.body.result.productId);

    const searchB = await request(app.getHttpServer())
      .get("/medication-master/search")
      .query({ q: `${LIFECYCLE_TEST_MEDICATION.name} ${suffix}`, baselineOnly: "true", limit: 50 })
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-facility-id", facilityB)
      .expect(200);

    expect(
      (searchB.body.items as Array<{ productId: string | null }>).some(
        (h) => h.productId === promo.body.result.productId
      )
    ).toBe(true);
  });
});
