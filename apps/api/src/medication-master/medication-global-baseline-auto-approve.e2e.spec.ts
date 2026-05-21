/**
 * Phase 19I — Tiered global baseline auto-approval e2e.
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
import { MEDICATION_GLOBAL_BASELINE_AUTO_APPROVE_AUDIT_ENTITY } from "./medication-global-baseline-auto-approve.service";

describe("Medication global baseline auto-approve tiered (19I e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let facilityA: string;
  let adminToken: string;
  let adminUserId: string;

  const endpoint = "/medication-master/governance/global-baseline/auto-approve-tiered";

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
      data: { code: `19I-A-${Date.now()}`, name: "Facility A", country: "Test", timezone: "UTC" },
    });
    facilityA = facA.id;

    const adminRole = await prisma.role.upsert({
      where: { code: RoleCode.ADMIN },
      update: {},
      create: { code: RoleCode.ADMIN, name: "Admin" },
    });

    const adminUser = await prisma.user.create({
      data: {
        email: `admin-19i-${randomUUID()}@test.local`,
        firstName: "Admin",
        lastName: "Baseline",
        passwordHash: await argon2.hash("Test123!"),
      },
    });
    adminUserId = adminUser.id;
    await prisma.userRole.create({
      data: { userId: adminUser.id, roleId: adminRole.id, facilityId: facilityA },
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

  async function seedAndPromote(suffix: string, overrides?: { medName?: string; reconciliationStatus?: string }) {
    const medName = overrides?.medName ?? `${LIFECYCLE_TEST_MEDICATION.name} ${suffix}`;
    const dose = LIFECYCLE_TEST_MEDICATION.dose;
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
    const staging = await prisma.medicationFormularyImportStaging.create({
      data: {
        facilityId: facilityA,
        batchId: `19I-BATCH-${suffix}`,
        sourceRowId: `PRI_ER_19I_${suffix}`,
        sourceInventoryDescription: exactSourceText,
        rawJson: rawJson as Prisma.InputJsonValue,
        reconciliationStatus: overrides?.reconciliationStatus ?? "NEW_CANDIDATE",
        importGateStatus: "BLOCKED",
        overallStatus: "draft",
        reviewFlags: [],
        ndc11: `223456789${suffix.slice(0, 2)}`,
        importedByUserId: adminUserId,
      },
    });

    const promo = await request(app.getHttpServer())
      .post(`/medication-master/governance/baseline/promote-priority-er/${staging.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-facility-id", facilityA)
      .send({})
      .expect(201);

    return { staging, productId: promo.body.result.productId as string };
  }

  it("dry-run mutates nothing and tier 1 counts clean promoted product", async () => {
    const suffix = randomUUID().slice(0, 8);
    const { productId } = await seedAndPromote(suffix);

    const before = await prisma.medicationProduct.findUnique({ where: { id: productId } });
    expect(before?.governanceStatus).toBe("REVIEW_REQUIRED");

    const dry = await request(app.getHttpServer())
      .post(endpoint)
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-facility-id", facilityA)
      .send({ dryRun: true, source: "PRIORITY_ER_INVENTORY", limit: 50 })
      .expect(201);

    expect(dry.body.dryRun).toBe(true);
    expect(dry.body.tier1AutoApprovable).toBeGreaterThanOrEqual(1);
    expect(
      (dry.body.sampleRows as Array<{ productId: string; tier: number }>).some(
        (r) => r.productId === productId && r.tier === 1
      )
    ).toBe(true);

    const after = await prisma.medicationProduct.findUnique({ where: { id: productId } });
    expect(after?.governanceStatus).toBe("REVIEW_REQUIRED");
  });

  it("duplicate and high-risk rows stay tier 2", async () => {
    const isolatedFac = await prisma.facility.create({
      data: { code: `19I-ISO-${Date.now()}`, name: "Iso", country: "Test", timezone: "UTC" },
    });
    const adminRole = await prisma.role.findUnique({ where: { code: RoleCode.ADMIN } });
    if (adminRole) {
      await prisma.userRole.create({
        data: { userId: adminUserId, roleId: adminRole.id, facilityId: isolatedFac.id },
      });
    }

    const dupSuffix = randomUUID().slice(0, 8);
    const { productId: dupProductId } = await seedAndPromote(dupSuffix, {
      reconciliationStatus: "POSSIBLE_DUPLICATE",
    });
    await prisma.medicationFormularyImportStaging.updateMany({
      where: { sourceRowId: `PRI_ER_19I_${dupSuffix}` },
      data: { facilityId: isolatedFac.id, reconciliationStatus: "POSSIBLE_DUPLICATE" },
    });

    const insulinSuffix = randomUUID().slice(0, 8);
    const { productId: insulinProductId } = await seedAndPromote(insulinSuffix, {
      medName: `Regular Insulin ${insulinSuffix}`,
    });
    await prisma.medicationFormularyImportStaging.updateMany({
      where: { sourceRowId: `PRI_ER_19I_${insulinSuffix}` },
      data: { facilityId: isolatedFac.id },
    });

    const dry = await request(app.getHttpServer())
      .post(endpoint)
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-facility-id", isolatedFac.id)
      .send({ dryRun: true, source: "PRIORITY_ER_INVENTORY", limit: 20, facilityId: isolatedFac.id })
      .expect(201);

    const rows = dry.body.sampleRows as Array<{
      productId: string;
      tier: number;
      tier2Reasons: string[];
    }>;
    expect(dry.body.tier2ManualReview).toBeGreaterThanOrEqual(2);

    const dupRow = rows.find((r) => r.productId === dupProductId);
    expect(dupRow?.tier).toBe(2);
    expect(dupRow?.tier2Reasons).toContain("POSSIBLE_DUPLICATE");

    const insulinRow = rows.find((r) => r.productId === insulinProductId);
    expect(insulinRow?.tier).toBe(2);
    expect(insulinRow?.tier2Reasons).toContain("HIGH_RISK_MEDICATION");
  });

  it("commit updates governance/baseline only without runtime activation", async () => {
    const suffix = randomUUID().slice(0, 8);
    const { productId } = await seedAndPromote(suffix);

    const commit = await request(app.getHttpServer())
      .post(endpoint)
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-facility-id", facilityA)
      .send({
        dryRun: false,
        source: "PRIORITY_ER_INVENTORY",
        limit: 50,
        adminNote: "19I e2e tier1 commit",
      })
      .expect(201);

    expect(commit.body.committedCount).toBeGreaterThanOrEqual(1);

    const product = await prisma.medicationProduct.findUnique({ where: { id: productId } });
    expect(product?.governanceStatus).toBe("ACTIVATION_APPROVED");
    expect(product?.baselineAvailable).toBe(true);
    expect(product?.isActive).toBe(false);

    const runtime = parseProductRuntimeActivation(product?.governanceNotes ?? null);
    expect(runtime.orderSearchEnabled).toBe(false);
    expect(runtime.marEnabled).toBe(false);
    expect(runtime.billingEnabled).toBe(false);

    const audit = await prisma.auditLog.findFirst({
      where: { entityType: MEDICATION_GLOBAL_BASELINE_AUTO_APPROVE_AUDIT_ENTITY },
      orderBy: { createdAt: "desc" },
    });
    expect(audit?.metadata).toBeTruthy();
    const meta = audit!.metadata as Record<string, unknown>;
    expect(meta.runtimeOrderSearchEnabled).toBe(false);
    expect(meta.runtimeMarEnabled).toBe(false);
    expect(meta.runtimeBillingEnabled).toBe(false);
    expect(JSON.stringify(meta)).not.toMatch(/Acetaminophen|Insulin/i);
  });
});
