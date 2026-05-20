/**
 * Phase 19G.1 — Single-medication governance lifecycle harness (e2e + dev debug).
 * Not registered in production unless explicitly invoked via guarded debug route.
 */

import type { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import type { PrismaService } from "../prisma/prisma.service";
import { mergeProductRuntimeActivation } from "./medication-product-runtime-activation.util";
import {
  MEDICATION_BILLING_ENABLED_AUDIT,
  MEDICATION_BILLING_REVIEW_REQUESTED_AUDIT,
  MEDICATION_FORMULARY_APPROVED_AUDIT,
  MEDICATION_MAR_ENABLED_AUDIT,
  MEDICATION_ORDER_SEARCH_ENABLED_AUDIT,
  MEDICATION_RUNTIME_DISABLED_AUDIT,
} from "./medication-product-activation-governance.constants";
import { parseProductRuntimeActivation } from "./medication-product-runtime-activation.util";
export const LIFECYCLE_TEST_MEDICATION = {
  name: "Acetaminophen",
  dose: "500mg",
  form: "Tablet",
  exactSourceText: "Acetaminophen 500mg Tablet",
} as const;

export type LifecycleStepResult = {
  step: string;
  ok: boolean;
  detail?: string;
  blockers?: string[];
};

export type LifecycleReport = {
  ok: boolean;
  steps: LifecycleStepResult[];
  productId?: string;
  stagingRowId?: string;
  catalogMedicationId?: string;
  searchBeforeOrderSearch?: boolean;
  searchAfterOrderSearch?: boolean;
  searchAfterDisable?: boolean;
};

async function ensureFacilityFormularyForProduct(
  prisma: PrismaService,
  productId: string,
  facilityId: string
): Promise<string | null> {
  const pkg = await prisma.medicationPackage.findFirst({
    where: { productId },
    orderBy: [{ isDefaultForProduct: "desc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  if (!pkg) return null;

  const existing = await prisma.facilityFormularyItem.findUnique({
    where: { facilityId_packageId: { facilityId, packageId: pkg.id } },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.facilityFormularyItem.create({
    data: {
      facilityId,
      packageId: pkg.id,
      isOnFormulary: false,
      isEDFormulary: false,
      allowManualOverride: false,
    },
  });
  return created.id;
}

/** Reset runtime flags for a repeatable lifecycle run (single product only). */
async function resetProductForLifecycleRerun(prisma: PrismaService, productId: string) {
  const product = await prisma.medicationProduct.findUnique({
    where: { id: productId },
    select: { id: true, conceptId: true, governanceNotes: true },
  });
  if (!product) return;

  const notes = mergeProductRuntimeActivation(product.governanceNotes, {
    formularyApprovedInactive: false,
    formularyApprovedAt: null,
    orderSearchEnabled: false,
    orderSearchEnabledAt: null,
    marEnabled: false,
    marEnabledAt: null,
    billingReviewRequired: false,
    billingReviewRequestedAt: null,
    billingEnabled: false,
    billingEnabledAt: null,
    reviewedBillingCode: null,
    reviewedBillingUnit: null,
    reviewedByRole: null,
  });

  await prisma.$transaction(async (tx) => {
    await tx.medicationProduct.update({
      where: { id: productId },
      data: {
        isActive: false,
        governanceStatus: "REVIEW_REQUIRED",
        governanceNotes: notes,
        activationApprovedAt: null,
        activationApprovedByUserId: null,
        administrationType: "ORAL",
      },
    });
    await tx.medicationConcept.update({
      where: { id: product.conceptId },
      data: { isActive: false },
    });
    await tx.medicationPackage.updateMany({
      where: { productId },
      data: { isActive: false },
    });
    await tx.facilityFormularyItem.updateMany({
      where: { package: { productId } },
      data: { isOnFormulary: false },
    });
  });
}

export function activationActionBody(facilityId: string, note = "19G.1 lifecycle smoke test") {
  return {
    facilityId,
    note,
    confirmExactSourcePreserved: true as const,
    confirmDuplicateGovernanceResolved: true as const,
  };
}

export async function assertProviderCatalogSearch(params: {
  app: INestApplication;
  token: string;
  facilityId: string;
  catalogMedicationId: string;
  query: string;
  expectIncluded: boolean;
}): Promise<void> {
  const res = await request(params.app.getHttpServer())
    .get("/catalog/medications/search")
    .query({ q: params.query, limit: 50 })
    .set("Authorization", `Bearer ${params.token}`)
    .set("x-facility-id", params.facilityId)
    .expect(200);

  const items = (res.body?.items ?? []) as Array<{ id: string }>;
  const ids = items.map((i) => i.id);
  if (params.expectIncluded) {
    if (!ids.includes(params.catalogMedicationId)) {
      throw new Error(
        `Expected catalog ${params.catalogMedicationId} in search for "${params.query}"; got ${ids.join(",")}`
      );
    }
  } else if (ids.includes(params.catalogMedicationId)) {
    throw new Error(
      `Expected catalog ${params.catalogMedicationId} excluded from search for "${params.query}"; got ${ids.join(",")}`
    );
  }
}

export async function loadRuntimeFlags(prisma: PrismaService, productId: string) {
  const product = await prisma.medicationProduct.findUnique({
    where: { id: productId },
    select: { governanceNotes: true, isActive: true, administrationType: true },
  });
  if (!product) throw new Error(`Product ${productId} not found`);
  return {
    ...parseProductRuntimeActivation(product.governanceNotes),
    productIsActive: product.isActive,
    administrationType: product.administrationType,
  };
}

export async function countActivationAudits(
  prisma: PrismaService,
  productId: string,
  entityType: string
): Promise<number> {
  return prisma.auditLog.count({
    where: { entityId: productId, entityType },
  });
}

export function buildPriorityErStagingRawJson() {
  return {
    medication: LIFECYCLE_TEST_MEDICATION.name,
    dose: LIFECYCLE_TEST_MEDICATION.dose,
    form: LIFECYCLE_TEST_MEDICATION.form,
    exact_source_text: LIFECYCLE_TEST_MEDICATION.exactSourceText,
    __preservation: { phase: "19G.1", rule: "priority_er_inventory_exact_source" },
    __sourceTrace: {
      exactSourceText: LIFECYCLE_TEST_MEDICATION.exactSourceText,
      sourceNameExact: LIFECYCLE_TEST_MEDICATION.name,
      sourceStrengthExact: LIFECYCLE_TEST_MEDICATION.dose,
      sourceRouteExact: LIFECYCLE_TEST_MEDICATION.form,
      sourcePackageExact: LIFECYCLE_TEST_MEDICATION.form,
      sourceReviewStatus: "MANUAL_REVIEW_REQUIRED",
    },
    __reconciliation: {
      category: "NEW_CANDIDATE",
      duplicateWarnings: [],
      matchedConceptIds: [],
      matchedProductIds: [],
      matchedCatalogMedicationIds: [],
    },
    __governance: {
      duplicateResolutionStatus: "UNREVIEWED",
      governanceDecision: "UNREVIEWED",
    },
  };
}

export async function runMedicationGovernanceLifecycle(params: {
  app: INestApplication;
  prisma: PrismaService;
  facilityId: string;
  adminToken: string;
  providerToken: string;
  adminUserId: string;
  stagingRowId?: string;
  productId?: string;
}): Promise<LifecycleReport> {
  const steps: LifecycleStepResult[] = [];
  const push = (step: string, ok: boolean, detail?: string, blockers?: string[]) => {
    steps.push({ step, ok, detail, blockers });
  };

  let stagingRowId = params.stagingRowId;
  let productId = params.productId;
  let catalogMedicationId: string | undefined;
  let searchBeforeOrderSearch: boolean | undefined;
  let searchAfterOrderSearch: boolean | undefined;
  let searchAfterDisable: boolean | undefined;

  try {
    if (!stagingRowId) {
      const batchId = `19G1-LIFECYCLE-${Date.now()}`;
      const row = await params.prisma.medicationFormularyImportStaging.create({
        data: {
          facilityId: params.facilityId,
          batchId,
          sourceRowId: `PRI_ER_LIFECYCLE_${Date.now()}`,
          sourceInventoryDescription: LIFECYCLE_TEST_MEDICATION.exactSourceText,
          rawJson: buildPriorityErStagingRawJson(),
          reconciliationStatus: "NEW_CANDIDATE",
          importGateStatus: "BLOCKED",
          overallStatus: "draft",
          reviewFlags: [],
          ndc11: "12345678901",
          hcpcsCodeSuggested: "J0130",
          importedByUserId: params.adminUserId,
        },
      });
      stagingRowId = row.id;
    }

    const stagingExists = await params.prisma.medicationFormularyImportStaging.findUnique({
      where: { id: stagingRowId },
    });
    push("1_staging_row_exists", Boolean(stagingExists), stagingRowId);

    const resolveRes = await request(params.app.getHttpServer())
      .post(`/medication-master/governance/duplicates/${stagingRowId}/resolve`)
      .set("Authorization", `Bearer ${params.adminToken}`)
      .set("x-facility-id", params.facilityId)
      .send({
        facilityId: params.facilityId,
        decision: "CREATE_NEW_APPROVED",
        note: "19G.1 smoke: duplicate governance resolved",
        confirmExactSourcePreserved: true,
      })
      .expect(201);

    const govDecision = resolveRes.body?.governance?.governanceDecision;
    push("2_duplicate_governance_resolved", govDecision === "CREATE_NEW_APPROVED", String(govDecision));

    const promoteRes = await request(params.app.getHttpServer())
      .post(`/medication-master/import-staging/promote-priority-er/${stagingRowId}`)
      .set("Authorization", `Bearer ${params.adminToken}`)
      .set("x-facility-id", params.facilityId)
      .send({
        activateBilling: true,
        activatePackageWithNdc: true,
      });

    const promoteBody = promoteRes.body;

    if (promoteRes.status === 409 && typeof promoteBody?.productId === "string") {
      const existingProductId = promoteBody.productId as string;
      productId = existingProductId;
      await resetProductForLifecycleRerun(params.prisma, existingProductId);
      await ensureFacilityFormularyForProduct(
        params.prisma,
        existingProductId,
        params.facilityId
      );
      await params.prisma.medicationFormularyImportStaging.update({
        where: { id: stagingRowId },
        data: {
          promotionResultJson: {
            productId,
            conceptId: promoteBody.conceptId,
            runtimeOrderable: false,
          },
        },
      });
      push(
        "3_promote_inactive",
        true,
        `reused existing canonical product ${productId} (duplicate guard)`
      );
    } else if (promoteRes.status >= 400) {
      push("3_promote_inactive", false, `HTTP ${promoteRes.status}: ${JSON.stringify(promoteBody)}`);
      return { ok: false, steps, stagingRowId, productId, catalogMedicationId };
    } else if (promoteBody.status !== "promoted") {
      push("3_promote_inactive", false, JSON.stringify(promoteBody.reasons ?? promoteBody));
    } else {
      productId = promoteBody.result.productId;
      const product = await params.prisma.medicationProduct.findUnique({
        where: { id: productId },
        include: { concept: true, packages: true },
      });
      const inactive =
        product?.isActive === false &&
        product.concept.isActive === false &&
        product.packages.every((p) => !p.isActive);
      push("3_promote_inactive", inactive && promoteBody.result.runtimeOrderable === false, productId);
    }

    if (productId) {
      await params.prisma.medicationProduct.update({
        where: { id: productId },
        data: { administrationType: "ORAL" },
      });

      const catalog = await params.prisma.catalogMedication.create({
        data: {
          code: `19G1-ACET-${Date.now()}`,
          name: LIFECYCLE_TEST_MEDICATION.exactSourceText,
          displayNameEn: LIFECYCLE_TEST_MEDICATION.exactSourceText,
          strength: LIFECYCLE_TEST_MEDICATION.dose,
          dosageForm: LIFECYCLE_TEST_MEDICATION.form,
          searchText: "acetaminophen 500mg tablet",
          isActive: true,
        },
      });
      catalogMedicationId = catalog.id;
      await params.prisma.medicationProduct.update({
        where: { id: productId },
        data: { legacyCatalogMedicationId: catalog.id },
      });
    }

    if (!productId || !catalogMedicationId) {
      return { ok: false, steps, stagingRowId, productId, catalogMedicationId };
    }

    const approveGovRes = await request(params.app.getHttpServer())
      .post(`/medication-master/governance/approve/${productId}`)
      .set("Authorization", `Bearer ${params.adminToken}`)
      .set("x-facility-id", params.facilityId)
      .send({
        facilityId: params.facilityId,
        governanceNote: "19G.1 smoke: governance activation approved",
      });

    push(
      "3b_governance_activation_approved",
      approveGovRes.status === 201,
      approveGovRes.status === 201 ? undefined : JSON.stringify(approveGovRes.body)
    );

    const formularyRes = await request(params.app.getHttpServer())
      .post(`/medication-master/governance/activation/${productId}/approve-formulary`)
      .set("Authorization", `Bearer ${params.adminToken}`)
      .set("x-facility-id", params.facilityId)
      .send(activationActionBody(params.facilityId))
      .expect(201);

    const runtimeAfterFormulary = await loadRuntimeFlags(params.prisma, productId);
    push(
      "4_approve_formulary_inactive",
      runtimeAfterFormulary.formularyApprovedInactive &&
        !runtimeAfterFormulary.orderSearchEnabled &&
        formularyRes.body.runtimeOrderable === false,
      JSON.stringify(runtimeAfterFormulary)
    );

    try {
      await assertProviderCatalogSearch({
        app: params.app,
        token: params.providerToken,
        facilityId: params.facilityId,
        catalogMedicationId,
        query: "acetaminophen",
        expectIncluded: false,
      });
      searchBeforeOrderSearch = false;
      push("5_provider_search_excludes_inactive", true);
    } catch (e) {
      searchBeforeOrderSearch = true;
      push("5_provider_search_excludes_inactive", false, (e as Error).message);
    }

    await request(params.app.getHttpServer())
      .post(`/medication-master/governance/activation/${productId}/enable-order-search`)
      .set("Authorization", `Bearer ${params.adminToken}`)
      .set("x-facility-id", params.facilityId)
      .send(activationActionBody(params.facilityId))
      .expect(201);

    const runtimeOrderSearch = await loadRuntimeFlags(params.prisma, productId);
    push(
      "6_enable_order_search",
      runtimeOrderSearch.orderSearchEnabled && runtimeOrderSearch.productIsActive,
      JSON.stringify(runtimeOrderSearch)
    );

    try {
      await assertProviderCatalogSearch({
        app: params.app,
        token: params.providerToken,
        facilityId: params.facilityId,
        catalogMedicationId,
        query: "acetaminophen",
        expectIncluded: true,
      });
      searchAfterOrderSearch = true;
      push("7_provider_search_includes_enabled", true);
    } catch (e) {
      searchAfterOrderSearch = false;
      push("7_provider_search_includes_enabled", false, (e as Error).message);
    }

    push(
      "8_mar_still_disabled",
      !runtimeOrderSearch.marEnabled,
      `marEnabled=${runtimeOrderSearch.marEnabled}`
    );
    push(
      "10_billing_still_disabled",
      !runtimeOrderSearch.billingEnabled && !runtimeOrderSearch.billingReviewRequired,
      JSON.stringify(runtimeOrderSearch)
    );

    await request(params.app.getHttpServer())
      .post(`/medication-master/governance/activation/${productId}/enable-mar`)
      .set("Authorization", `Bearer ${params.adminToken}`)
      .set("x-facility-id", params.facilityId)
      .send(activationActionBody(params.facilityId))
      .expect(201);

    const runtimeMar = await loadRuntimeFlags(params.prisma, productId);
    push("9_enable_mar", runtimeMar.marEnabled && runtimeMar.orderSearchEnabled, JSON.stringify(runtimeMar));

    await request(params.app.getHttpServer())
      .post(`/medication-master/governance/activation/${productId}/request-billing-review`)
      .set("Authorization", `Bearer ${params.adminToken}`)
      .set("x-facility-id", params.facilityId)
      .send(activationActionBody(params.facilityId))
      .expect(201);

    const runtimeBillingReview = await loadRuntimeFlags(params.prisma, productId);
    push(
      "11_request_billing_review",
      runtimeBillingReview.billingReviewRequired && !runtimeBillingReview.billingEnabled,
      JSON.stringify(runtimeBillingReview)
    );
    push(
      "12_billing_still_disabled_after_review_request",
      !runtimeBillingReview.billingEnabled,
      `billingEnabled=${runtimeBillingReview.billingEnabled}`
    );

    await request(params.app.getHttpServer())
      .post(`/medication-master/governance/activation/${productId}/enable-billing`)
      .set("Authorization", `Bearer ${params.adminToken}`)
      .set("x-facility-id", params.facilityId)
      .send({
        ...activationActionBody(params.facilityId),
        reviewedBillingCode: "J0130",
        reviewedBillingUnit: "each",
        reviewedByRole: "PHARMACY",
      })
      .expect(201);

    const runtimeBilling = await loadRuntimeFlags(params.prisma, productId);
    push("13_enable_billing", runtimeBilling.billingEnabled, JSON.stringify(runtimeBilling));

    await request(params.app.getHttpServer())
      .post(`/medication-master/governance/activation/${productId}/disable-runtime`)
      .set("Authorization", `Bearer ${params.adminToken}`)
      .set("x-facility-id", params.facilityId)
      .send(activationActionBody(params.facilityId))
      .expect(201);

    const runtimeDisabled = await loadRuntimeFlags(params.prisma, productId);
    push(
      "14_disable_runtime",
      !runtimeDisabled.orderSearchEnabled &&
        !runtimeDisabled.marEnabled &&
        !runtimeDisabled.billingEnabled &&
        !runtimeDisabled.productIsActive,
      JSON.stringify(runtimeDisabled)
    );

    try {
      await assertProviderCatalogSearch({
        app: params.app,
        token: params.providerToken,
        facilityId: params.facilityId,
        catalogMedicationId,
        query: "acetaminophen",
        expectIncluded: false,
      });
      searchAfterDisable = false;
      push("15_provider_search_excludes_after_disable", true);
    } catch (e) {
      searchAfterDisable = true;
      push("15_provider_search_excludes_after_disable", false, (e as Error).message);
    }

    const auditChecks: Array<[string, string]> = [
      ["audit_formulary_approved", MEDICATION_FORMULARY_APPROVED_AUDIT],
      ["audit_order_search_enabled", MEDICATION_ORDER_SEARCH_ENABLED_AUDIT],
      ["audit_mar_enabled", MEDICATION_MAR_ENABLED_AUDIT],
      ["audit_billing_review_requested", MEDICATION_BILLING_REVIEW_REQUESTED_AUDIT],
      ["audit_billing_enabled", MEDICATION_BILLING_ENABLED_AUDIT],
      ["audit_runtime_disabled", MEDICATION_RUNTIME_DISABLED_AUDIT],
    ];

    for (const [step, entityType] of auditChecks) {
      const count = await countActivationAudits(params.prisma, productId, entityType);
      const sample = await params.prisma.auditLog.findFirst({
        where: { entityId: productId, entityType },
        orderBy: { createdAt: "desc" },
        select: { metadata: true },
      });
      const meta =
        sample?.metadata && typeof sample.metadata === "object" && !Array.isArray(sample.metadata)
          ? (sample.metadata as Record<string, unknown>)
          : {};
      const phiSafe =
        !("medicationName" in meta) &&
        !("patientId" in meta) &&
        !("governanceNote" in meta) &&
        typeof meta.productId === "string";
      push(step, count >= 1 && phiSafe, `count=${count}`);
    }
  } catch (err) {
    push("lifecycle_exception", false, (err as Error).message);
  }

  const ok = steps.every((s) => s.ok);
  return {
    ok,
    steps,
    productId,
    stagingRowId,
    catalogMedicationId,
    searchBeforeOrderSearch,
    searchAfterOrderSearch,
    searchAfterDisable,
  };
}
