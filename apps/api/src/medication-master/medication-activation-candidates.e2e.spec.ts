/**
 * Phase 19G.2 — GET /medication-master/governance/activation-candidates wiring + safety.
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
import { parseProductRuntimeActivation } from "./medication-product-runtime-activation.util";

describe("Medication activation candidates (19G.2 e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let facilityId: string;
  let otherFacilityId: string;
  let adminToken: string;
  let providerToken: string;
  let adminUserId: string;

  const ACTIVATION_CANDIDATES_PATH = "/medication-master/governance/activation-candidates";

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
        code: `19G2-${Date.now()}`,
        name: "19G.2 Activation Facility",
        country: "Test",
        timezone: "UTC",
      },
    });
    facilityId = facility.id;

    const otherFacility = await prisma.facility.create({
      data: {
        code: `19G2-OTHER-${Date.now()}`,
        name: "Other Facility",
        country: "Test",
        timezone: "UTC",
      },
    });
    otherFacilityId = otherFacility.id;

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
        email: `admin-19g2-${randomUUID()}@test.local`,
        firstName: "Admin",
        lastName: "Activation",
        passwordHash: await argon2.hash("Test123!"),
      },
    });
    adminUserId = adminUser.id;

    const providerUser = await prisma.user.create({
      data: {
        email: `provider-19g2-${randomUUID()}@test.local`,
        firstName: "Provider",
        lastName: "User",
        passwordHash: await argon2.hash("Test123!"),
      },
    });

    await prisma.userRole.create({
      data: { userId: adminUser.id, roleId: adminRole.id, facilityId },
    });
    await prisma.userRole.create({
      data: { userId: providerUser.id, roleId: providerRole.id, facilityId },
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

    providerToken = assertE2eLoginAccessToken(
      (
        await request(app.getHttpServer())
          .post("/auth/login")
          .send({ username: providerUser.email, password: "Test123!" })
          .expect(201)
      ).body,
      providerUser.email!
    );
  }, 120000);

  afterAll(async () => {
    await app?.close();
  });

  async function seedPromotedInactiveProduct(targetFacilityId: string, suffix: string) {
    const rawJson = mergeGovernanceIntoRawJson(buildPriorityErStagingRawJson(), {
      duplicateResolutionStatus: "CREATE_NEW_APPROVED",
      governanceDecision: "CREATE_NEW_APPROVED",
    });
    const staging = await prisma.medicationFormularyImportStaging.create({
      data: {
        facilityId: targetFacilityId,
        batchId: `19G2-BATCH-${suffix}`,
        sourceRowId: `PRI_ER_19G2_${suffix}`,
        sourceInventoryDescription: `${LIFECYCLE_TEST_MEDICATION.exactSourceText} ${suffix}`,
        rawJson: rawJson as Prisma.InputJsonValue,
        reconciliationStatus: "NEW_CANDIDATE",
        importGateStatus: "PROMOTED",
        overallStatus: "promoted",
        reviewFlags: [],
        ndc11: "12345678901",
        importedByUserId: adminUserId,
      },
    });

    const concept = await prisma.medicationConcept.create({
      data: {
        code: `19G2-CONCEPT-${suffix}`,
        genericName: LIFECYCLE_TEST_MEDICATION.name,
        displayName: LIFECYCLE_TEST_MEDICATION.name,
        isActive: false,
      },
    });
    const product = await prisma.medicationProduct.create({
      data: {
        code: `19G2-PRODUCT-${suffix}`,
        conceptId: concept.id,
        strengthDisplay: LIFECYCLE_TEST_MEDICATION.dose,
        dosageForm: LIFECYCLE_TEST_MEDICATION.form,
        administrationType: "ORAL",
        billingClass: "UNKNOWN",
        isActive: false,
        governanceStatus: "ACTIVATION_APPROVED",
      },
    });
    const pkg = await prisma.medicationPackage.create({
      data: {
        code: `19G2-PKG-${suffix}`,
        productId: product.id,
        packageDescription: LIFECYCLE_TEST_MEDICATION.exactSourceText,
        packageType: "OTHER",
        isDefaultForProduct: true,
        isActive: false,
      },
    });
    await prisma.facilityFormularyItem.create({
      data: {
        facilityId: targetFacilityId,
        packageId: pkg.id,
        isOnFormulary: false,
        isEDFormulary: false,
      },
    });
    await prisma.medicationFormularyImportStaging.update({
      where: { id: staging.id },
      data: {
        promotionResultJson: {
          productId: product.id,
          conceptId: concept.id,
          packageId: pkg.id,
          runtimeOrderable: false,
        },
      },
    });
    return { productId: product.id, stagingId: staging.id };
  }

  it("registers GET activation-candidates (not 404)", async () => {
    const res = await request(app.getHttpServer())
      .get(ACTIVATION_CANDIDATES_PATH)
      .query({ facilityId, limit: 10 })
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-facility-id", facilityId);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("items");
    expect(res.body).toHaveProperty("total");
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it("returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get(ACTIVATION_CANDIDATES_PATH)
      .query({ facilityId })
      .expect(401);
  });

  it("returns 403 for provider role", async () => {
    await request(app.getHttpServer())
      .get(ACTIVATION_CANDIDATES_PATH)
      .query({ facilityId })
      .set("Authorization", `Bearer ${providerToken}`)
      .set("x-facility-id", facilityId)
      .expect(403);
  });

  it("enforces facility isolation on list", async () => {
    const { productId } = await seedPromotedInactiveProduct(facilityId, randomUUID().slice(0, 8));

    const wrongFacility = await request(app.getHttpServer())
      .get(ACTIVATION_CANDIDATES_PATH)
      .query({ facilityId: otherFacilityId })
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-facility-id", facilityId)
      .expect(403);

    expect(wrongFacility.body.message).toBeTruthy();

    const ok = await request(app.getHttpServer())
      .get(ACTIVATION_CANDIDATES_PATH)
      .query({ facilityId, limit: 200 })
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-facility-id", facilityId)
      .expect(200);

    const ids = (ok.body.items as Array<{ productId: string }>).map((r) => r.productId);
    expect(ids).toContain(productId);
  });

  it("includes promoted inactive product and excludes blocked duplicate staging", async () => {
    const suffix = randomUUID().slice(0, 8);
    const { productId } = await seedPromotedInactiveProduct(facilityId, suffix);

    const blockedRaw = mergeGovernanceIntoRawJson(buildPriorityErStagingRawJson(), {
      duplicateResolutionStatus: "BLOCKED_DUPLICATE",
      governanceDecision: "BLOCKED_DUPLICATE",
    });
    const blockedStaging = await prisma.medicationFormularyImportStaging.create({
      data: {
        facilityId,
        batchId: `19G2-BLOCKED-${suffix}`,
        sourceRowId: `PRI_ER_BLOCKED_${suffix}`,
        sourceInventoryDescription: "Blocked Med 10mg Tablet",
        rawJson: blockedRaw as Prisma.InputJsonValue,
        reconciliationStatus: "POSSIBLE_DUPLICATE",
        importGateStatus: "BLOCKED",
        overallStatus: "draft",
        reviewFlags: ["GOVERNANCE_BLOCKED"],
        importedByUserId: adminUserId,
      },
    });
    const blockedConcept = await prisma.medicationConcept.create({
      data: {
        code: `19G2-BLOCKED-C-${suffix}`,
        genericName: "Blocked Med",
        displayName: "Blocked Med",
        isActive: false,
      },
    });
    const blockedProduct = await prisma.medicationProduct.create({
      data: {
        code: `19G2-BLOCKED-P-${suffix}`,
        conceptId: blockedConcept.id,
        strengthDisplay: "10mg",
        dosageForm: "Tablet",
        administrationType: "ORAL",
        billingClass: "UNKNOWN",
        isActive: false,
        governanceStatus: "REVIEW_REQUIRED",
      },
    });
    const blockedPkg = await prisma.medicationPackage.create({
      data: {
        code: `19G2-BLOCKED-PKG-${suffix}`,
        productId: blockedProduct.id,
        packageDescription: "Blocked Med 10mg Tablet",
        packageType: "OTHER",
        isActive: false,
      },
    });
    await prisma.facilityFormularyItem.create({
      data: { facilityId, packageId: blockedPkg.id, isOnFormulary: false },
    });
    await prisma.medicationFormularyImportStaging.update({
      where: { id: blockedStaging.id },
      data: {
        promotionResultJson: { productId: blockedProduct.id, conceptId: blockedConcept.id },
      },
    });

    const res = await request(app.getHttpServer())
      .get(ACTIVATION_CANDIDATES_PATH)
      .query({ facilityId, limit: 200 })
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-facility-id", facilityId)
      .expect(200);

    const items = res.body.items as Array<{ productId: string; runtime: { orderSearchEnabled: boolean } }>;
    expect(items.map((i) => i.productId)).toContain(productId);
    expect(items.map((i) => i.productId)).not.toContain(blockedProduct.id);

    const row = items.find((i) => i.productId === productId)!;
    expect(row.runtime.orderSearchEnabled).toBe(false);
    expect(row).toMatchObject({
      facilityId,
      exactSourceMedication: LIFECYCLE_TEST_MEDICATION.name,
    });
  });

  it("does not mutate product on GET (read-only)", async () => {
    const { productId } = await seedPromotedInactiveProduct(facilityId, randomUUID().slice(0, 8));
    const before = await prisma.medicationProduct.findUnique({
      where: { id: productId },
      select: { isActive: true, governanceNotes: true, updatedAt: true },
    });

    await request(app.getHttpServer())
      .get(ACTIVATION_CANDIDATES_PATH)
      .query({ facilityId })
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-facility-id", facilityId)
      .expect(200);

    const after = await prisma.medicationProduct.findUnique({
      where: { id: productId },
      select: { isActive: true, governanceNotes: true, updatedAt: true },
    });

    expect(after?.isActive).toBe(before?.isActive);
    expect(parseProductRuntimeActivation(after?.governanceNotes).orderSearchEnabled).toBe(
      parseProductRuntimeActivation(before?.governanceNotes).orderSearchEnabled
    );
  });
});
