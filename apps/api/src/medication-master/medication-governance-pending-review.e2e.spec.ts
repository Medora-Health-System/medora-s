/**
 * Phase 19G.2C — pending governance activation review + approve/block safety.
 */
import { randomUUID } from "node:crypto";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import * as argon2 from "argon2";
import { MedicationMarWorkflow, Prisma, RoleCode } from "@prisma/client";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";
import { applyE2eAuthTestEnv, assertE2eLoginAccessToken } from "../test-utils/e2e-auth-env";
import {
  buildPriorityErStagingRawJson,
  LIFECYCLE_TEST_MEDICATION,
} from "./medication-governance-lifecycle.harness";
import { mergeGovernanceIntoRawJson } from "./priority-er-inventory-governance.util";
import { parseProductRuntimeActivation } from "./medication-product-runtime-activation.util";

const PENDING_PATH = "/medication-master/governance/pending-activation-review";
const APPROVE_PATH = (productId: string) =>
  `/medication-master/governance/approve/${productId}`;
const ACTIVATION_CANDIDATES_PATH = "/medication-master/governance/activation-candidates";

describe("Medication governance pending activation review (19G.2C e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let facilityId: string;
  let otherFacilityId: string;
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
        code: `19G2C-${Date.now()}`,
        name: "19G.2C Pending Review Facility",
        country: "Test",
        timezone: "UTC",
      },
    });
    facilityId = facility.id;

    const otherFacility = await prisma.facility.create({
      data: {
        code: `19G2C-OTHER-${Date.now()}`,
        name: "Other Facility 19G2C",
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
        email: `admin-19g2c-${randomUUID()}@test.local`,
        firstName: "Admin",
        lastName: "Pending",
        passwordHash: await argon2.hash("Test123!"),
      },
    });
    adminUserId = adminUser.id;

    const providerUser = await prisma.user.create({
      data: {
        email: `provider-19g2c-${randomUUID()}@test.local`,
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

  function uniqueNdc11(suffix: string): string {
    const hex = suffix.replace(/[^a-f0-9]/gi, "").padEnd(2, "0").slice(0, 2);
    return `123456789${hex.charCodeAt(0) % 10}${hex.charCodeAt(1) % 10}`;
  }

  async function seedReviewRequiredProduct(targetFacilityId: string, suffix: string) {
    const ndc11 = uniqueNdc11(suffix);
    const rawJson = mergeGovernanceIntoRawJson(buildPriorityErStagingRawJson(), {
      duplicateResolutionStatus: "CREATE_NEW_APPROVED",
      governanceDecision: "CREATE_NEW_APPROVED",
    });
    const staging = await prisma.medicationFormularyImportStaging.create({
      data: {
        facilityId: targetFacilityId,
        batchId: `19G2C-BATCH-${suffix}`,
        sourceRowId: `PRI_ER_19G2C_${suffix}`,
        sourceInventoryDescription: `${LIFECYCLE_TEST_MEDICATION.exactSourceText} ${suffix}`,
        rawJson: rawJson as Prisma.InputJsonValue,
        reconciliationStatus: "NEW_CANDIDATE",
        importGateStatus: "PROMOTED",
        overallStatus: "promoted",
        reviewFlags: [],
        ndc11,
        importedByUserId: adminUserId,
      },
    });

    const concept = await prisma.medicationConcept.create({
      data: {
        code: `19G2C-CONCEPT-${suffix}`,
        genericName: LIFECYCLE_TEST_MEDICATION.name,
        displayName: LIFECYCLE_TEST_MEDICATION.name,
        isActive: false,
        safetyProfile: {
          create: {
            isHighAlert: false,
            isControlled: false,
          },
        },
      },
      include: { safetyProfile: true },
    });

    const product = await prisma.medicationProduct.create({
      data: {
        code: `19G2C-PRODUCT-${suffix}`,
        conceptId: concept.id,
        strengthDisplay: LIFECYCLE_TEST_MEDICATION.dose,
        dosageForm: LIFECYCLE_TEST_MEDICATION.form,
        administrationType: "ORAL",
        billingClass: "UNKNOWN",
        isActive: false,
        governanceStatus: "REVIEW_REQUIRED",
        administrationProfile: {
          create: {
            defaultMarWorkflow: MedicationMarWorkflow.SINGLE_DOSE,
            requiresInfusionSession: false,
          },
        },
      },
    });

    const pkg = await prisma.medicationPackage.create({
      data: {
        code: `19G2C-PKG-${suffix}`,
        productId: product.id,
        packageDescription: LIFECYCLE_TEST_MEDICATION.exactSourceText,
        packageType: "OTHER",
        isDefaultForProduct: true,
        isActive: false,
        ndc11,
        billingProfiles: {
          create: [{ requiresManualReview: false }],
        },
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

    return { productId: product.id };
  }

  const validApproveBody = (fid: string) => ({
    facilityId: fid,
    governanceNote: "19G.2C pharmacy approval note",
    confirmExactSourcePreserved: true,
    confirmDuplicateGovernanceResolved: true,
  });

  it("lists promoted REVIEW_REQUIRED products on pending-activation-review", async () => {
    const suffix = randomUUID().slice(0, 8);
    const { productId } = await seedReviewRequiredProduct(facilityId, suffix);

    const res = await request(app.getHttpServer())
      .get(PENDING_PATH)
      .query({ facilityId, limit: 200 })
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-facility-id", facilityId)
      .expect(200);

    const ids = (res.body.items as Array<{ productId: string }>).map((r) => r.productId);
    expect(ids).toContain(productId);

    const row = (res.body.items as Array<{ productId: string; governanceStatus: string }>).find(
      (r) => r.productId === productId
    );
    expect(row?.governanceStatus).toBe("REVIEW_REQUIRED");
  });

  it("requires note and confirmations for approve", async () => {
    const { productId } = await seedReviewRequiredProduct(facilityId, randomUUID().slice(0, 8));

    await request(app.getHttpServer())
      .post(APPROVE_PATH(productId))
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-facility-id", facilityId)
      .send({ facilityId })
      .expect(400);

    await request(app.getHttpServer())
      .post(APPROVE_PATH(productId))
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-facility-id", facilityId)
      .send({
        facilityId,
        governanceNote: "note ok",
        confirmExactSourcePreserved: false,
        confirmDuplicateGovernanceResolved: true,
      })
      .expect(400);
  });

  it("approve sets ACTIVATION_APPROVED only without enabling runtime", async () => {
    const { productId } = await seedReviewRequiredProduct(facilityId, randomUUID().slice(0, 8));

    const approveRes = await request(app.getHttpServer())
      .post(APPROVE_PATH(productId))
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-facility-id", facilityId)
      .send(validApproveBody(facilityId))
      .expect(201);

    expect(approveRes.body.governanceOnly).toBe(true);
    expect(approveRes.body.product.governanceStatus).toBe("ACTIVATION_APPROVED");

    const product = await prisma.medicationProduct.findUnique({
      where: { id: productId },
      select: { governanceStatus: true, isActive: true, governanceNotes: true },
    });
    expect(product?.governanceStatus).toBe("ACTIVATION_APPROVED");
    expect(product?.isActive).toBe(false);

    const runtime = parseProductRuntimeActivation(product?.governanceNotes ?? null);
    expect(runtime.orderSearchEnabled).toBe(false);
    expect(runtime.marEnabled).toBe(false);
    expect(runtime.billingEnabled).toBe(false);
    expect(runtime.formularyApprovedInactive).toBe(false);
  });

  it("activation queue drops GOVERNANCE_REVIEW_REQUIRED after governance approval", async () => {
    const { productId } = await seedReviewRequiredProduct(facilityId, randomUUID().slice(0, 8));

    await request(app.getHttpServer())
      .post(APPROVE_PATH(productId))
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-facility-id", facilityId)
      .send(validApproveBody(facilityId))
      .expect(201);

    const listRes = await request(app.getHttpServer())
      .get(ACTIVATION_CANDIDATES_PATH)
      .query({ facilityId, limit: 200 })
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-facility-id", facilityId)
      .expect(200);

    const row = (
      listRes.body.items as Array<{ productId: string; blockerReasons: string[] }>
    ).find((r) => r.productId === productId);
    expect(row).toBeTruthy();
    expect(row?.blockerReasons).not.toContain("GOVERNANCE_REVIEW_REQUIRED");
  });

  it("block action prevents activation approval", async () => {
    const { productId } = await seedReviewRequiredProduct(facilityId, randomUUID().slice(0, 8));

    await request(app.getHttpServer())
      .post(`/medication-master/governance/block/${productId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-facility-id", facilityId)
      .send({
        ...validApproveBody(facilityId),
        governanceNote: "Blocked for safety review",
      })
      .expect(201);

    const product = await prisma.medicationProduct.findUnique({
      where: { id: productId },
      select: { governanceStatus: true },
    });
    expect(product?.governanceStatus).toBe("BLOCKED");

    const pending = await request(app.getHttpServer())
      .get(PENDING_PATH)
      .query({ facilityId, limit: 200 })
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-facility-id", facilityId)
      .expect(200);

    const ids = (pending.body.items as Array<{ productId: string }>).map((r) => r.productId);
    expect(ids).not.toContain(productId);
  });

  it("rejects provider role on pending list and approve", async () => {
    const { productId } = await seedReviewRequiredProduct(facilityId, randomUUID().slice(0, 8));

    await request(app.getHttpServer())
      .get(PENDING_PATH)
      .query({ facilityId })
      .set("Authorization", `Bearer ${providerToken}`)
      .set("x-facility-id", facilityId)
      .expect(403);

    await request(app.getHttpServer())
      .post(APPROVE_PATH(productId))
      .set("Authorization", `Bearer ${providerToken}`)
      .set("x-facility-id", facilityId)
      .send(validApproveBody(facilityId))
      .expect(403);
  });

  it("enforces facility isolation on pending list", async () => {
    await seedReviewRequiredProduct(facilityId, randomUUID().slice(0, 8));

    await request(app.getHttpServer())
      .get(PENDING_PATH)
      .query({ facilityId: otherFacilityId })
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-facility-id", facilityId)
      .expect(403);
  });
});
