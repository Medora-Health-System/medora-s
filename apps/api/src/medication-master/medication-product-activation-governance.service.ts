import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import { AuditService } from "../common/services/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { MedicationMasterExplorerService } from "./medication-master-explorer.service";
import {
  MEDICATION_BILLING_ENABLED_AUDIT,
  MEDICATION_BILLING_REVIEW_REQUESTED_AUDIT,
  MEDICATION_FORMULARY_APPROVED_AUDIT,
  MEDICATION_MAR_ENABLED_AUDIT,
  MEDICATION_ORDER_SEARCH_ENABLED_AUDIT,
  MEDICATION_RUNTIME_DISABLED_AUDIT,
  type MedicationActivationAuditAction,
} from "./medication-product-activation-governance.constants";
import type {
  MedicationActivationEnableBillingBody,
  MedicationActivationGovernanceActionBody,
  MedicationActivationGovernanceListQuery,
} from "./dto/medication-product-activation-governance.dto";
import {
  RUNTIME_ACTIVATION_MARKER_START,
  deriveRuntimeActivationState,
  mergeProductRuntimeActivation,
  parseProductRuntimeActivation,
  type MedicationRuntimeActivationState,
  type ProductRuntimeActivationMeta,
} from "./medication-product-runtime-activation.util";
import {
  evaluateApproveFormularyGate,
  evaluateDuplicateGovernanceForActivation,
  evaluateEnableBillingGate,
  evaluateEnableMarGate,
  evaluateEnableOrderSearchGate,
  evaluateProviderOrderSearchGate,
  parseStagingGovernanceFromRow,
  type ActivationGateBlockerCode,
} from "./medication-product-activation-gates.util";
import type { PriorityErGovernanceMeta } from "./priority-er-inventory-governance.util";
import { parsePriorityErSourceTrace } from "./priority-er-inventory-staging-source.util";

export type ActivationCandidateDto = {
  productId: string;
  conceptId: string;
  productCode: string;
  governanceStatus: string;
  productIsActive: boolean;
  conceptIsActive: boolean;
  activationState: MedicationRuntimeActivationState;
  runtime: ProductRuntimeActivationMeta;
  exactSourceMedication: string | null;
  exactSourceDose: string | null;
  exactSourceFormRoute: string | null;
  duplicateGovernanceStatus: string | null;
  duplicateGovernanceResolved: boolean;
  formularyOnFormulary: boolean;
  facilityFormularyItemId: string | null;
  packageId: string | null;
  legacyCatalogMedicationId: string | null;
  blockerReasons: ActivationGateBlockerCode[];
};

@Injectable()
export class MedicationProductActivationGovernanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly explorer: MedicationMasterExplorerService,
    private readonly audit: AuditService
  ) {}

  assertFacilityScope(requestedFacilityId: string, callerFacilityId: string | undefined): void {
    this.explorer.assertFacilityScope(requestedFacilityId, callerFacilityId);
  }

  async listActivationCandidates(
    query: MedicationActivationGovernanceListQuery
  ): Promise<{ items: ActivationCandidateDto[]; total: number }> {
    if (!query.facilityId) {
      throw new BadRequestException("facilityId est requis.");
    }

    const products = await this.prisma.medicationProduct.findMany({
      where: {
        OR: [
          { isActive: false },
          {
            governanceNotes: { contains: RUNTIME_ACTIVATION_MARKER_START },
          },
        ],
      },
      include: {
        concept: { select: { id: true, isActive: true, code: true } },
        packages: {
          orderBy: [{ isDefaultForProduct: "desc" }, { createdAt: "asc" }],
          take: 3,
          include: {
            facilityFormularyItems: {
              where: { facilityId: query.facilityId },
              take: 1,
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: query.limit ?? 100,
    });

    const q = query.q?.trim().toLowerCase();
    const stagingByProduct = await this.loadStagingContextByProductIds(
      products.map((p) => p.id),
      query.facilityId
    );

    let items = await Promise.all(
      products.map((p) =>
        this.toCandidateDto(p, query.facilityId!, stagingByProduct.get(p.id) ?? null)
      )
    );

    items = items.filter((row) => {
      if (row.runtime.orderSearchEnabled && row.productIsActive) return true;
      if (!row.productIsActive) return true;
      if (row.runtime.formularyApprovedInactive) return true;
      return row.governanceStatus !== "RETIRED";
    });

    if (q) {
      items = items.filter((row) => {
        const hay = [
          row.productCode,
          row.exactSourceMedication,
          row.exactSourceDose,
          row.exactSourceFormRoute,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    return { items, total: items.length };
  }

  async approveFormularyInactive(
    productId: string,
    body: MedicationActivationGovernanceActionBody,
    userId: string,
    auditMeta?: { ip?: string; userAgent?: string }
  ) {
    const ctx = await this.loadActivationContext(productId, body.facilityId);
    const gate = evaluateApproveFormularyGate({
      governanceStatus: ctx.product.governanceStatus,
      confirmExactSourcePreserved: body.confirmExactSourcePreserved,
      confirmDuplicateGovernanceResolved: body.confirmDuplicateGovernanceResolved,
      note: body.note,
      duplicateGate: ctx.duplicateGate,
      hasExactSourceFields: ctx.hasExactSourceFields,
      facilityFormularyExists: Boolean(ctx.defaultPackage?.facilityFormulary),
    });
    this.assertGate(gate);

    const now = new Date().toISOString();
    const runtime = mergeProductRuntimeActivation(ctx.product.governanceNotes, {
      formularyApprovedInactive: true,
      formularyApprovedAt: now,
    });

    await this.prisma.$transaction(async (tx) => {
      if (ctx.defaultPackage?.facilityFormulary) {
        await tx.facilityFormularyItem.update({
          where: { id: ctx.defaultPackage.facilityFormulary.id },
          data: { isOnFormulary: true },
        });
      }
      await tx.medicationProduct.update({
        where: { id: productId },
        data: { governanceNotes: runtime },
      });
    });

    const stateAfter = deriveRuntimeActivationState({
      productIsActive: ctx.product.isActive,
      conceptIsActive: ctx.product.concept.isActive,
      governanceStatus: ctx.product.governanceStatus,
      formularyOnFormulary: true,
      runtime: parseProductRuntimeActivation(runtime),
    });

    await this.writeActivationAudit({
      entityType: MEDICATION_FORMULARY_APPROVED_AUDIT,
      action: "APPROVE_FORMULARY_INACTIVE",
      userId,
      facilityId: body.facilityId,
      productId,
      conceptId: ctx.product.conceptId,
      statusBefore: ctx.activationState,
      statusAfter: stateAfter,
      blockerCount: gate.blockers.length,
      auditMeta,
    });

    return { activationState: stateAfter, runtimeOrderable: false };
  }

  async enableOrderSearch(
    productId: string,
    body: MedicationActivationGovernanceActionBody,
    userId: string,
    auditMeta?: { ip?: string; userAgent?: string }
  ) {
    const ctx = await this.loadActivationContext(productId, body.facilityId);
    const runtime = ctx.runtime;
    const gate = evaluateEnableOrderSearchGate({
      governanceStatus: ctx.product.governanceStatus,
      productIsActive: ctx.product.isActive,
      conceptIsActive: ctx.product.concept.isActive,
      runtime,
      confirmExactSourcePreserved: body.confirmExactSourcePreserved,
      confirmDuplicateGovernanceResolved: body.confirmDuplicateGovernanceResolved,
      note: body.note,
      duplicateGate: ctx.duplicateGate,
      formularyOnFormulary:
        runtime.formularyApprovedInactive ||
        Boolean(ctx.defaultPackage?.facilityFormulary?.isOnFormulary),
      ndcReviewRequired: ctx.ndcReviewRequired,
    });
    this.assertGate(gate);

    const now = new Date().toISOString();
    const notes = mergeProductRuntimeActivation(ctx.product.governanceNotes, {
      orderSearchEnabled: true,
      orderSearchEnabledAt: now,
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.medicationConcept.update({
        where: { id: ctx.product.conceptId },
        data: { isActive: true },
      });
      await tx.medicationProduct.update({
        where: { id: productId },
        data: { isActive: true, governanceNotes: notes },
      });
      if (ctx.defaultPackage) {
        await tx.medicationPackage.update({
          where: { id: ctx.defaultPackage.id },
          data: { isActive: true },
        });
        if (ctx.defaultPackage.facilityFormulary) {
          await tx.facilityFormularyItem.update({
            where: { id: ctx.defaultPackage.facilityFormulary.id },
            data: { isOnFormulary: true },
          });
        }
      }
    });

    const stateAfter = "ORDER_SEARCH_ENABLED" as const;
    await this.writeActivationAudit({
      entityType: MEDICATION_ORDER_SEARCH_ENABLED_AUDIT,
      action: "ENABLE_ORDER_SEARCH",
      userId,
      facilityId: body.facilityId,
      productId,
      conceptId: ctx.product.conceptId,
      statusBefore: ctx.activationState,
      statusAfter: stateAfter,
      blockerCount: 0,
      auditMeta,
    });

    return { activationState: stateAfter, orderSearchEnabled: true };
  }

  async enableMar(
    productId: string,
    body: MedicationActivationGovernanceActionBody,
    userId: string,
    auditMeta?: { ip?: string; userAgent?: string }
  ) {
    const ctx = await this.loadActivationContext(productId, body.facilityId);
    const gate = evaluateEnableMarGate({
      runtime: ctx.runtime,
      administrationType: ctx.product.administrationType,
      confirmExactSourcePreserved: body.confirmExactSourcePreserved,
      confirmDuplicateGovernanceResolved: body.confirmDuplicateGovernanceResolved,
      note: body.note,
      duplicateGate: ctx.duplicateGate,
    });
    this.assertGate(gate);

    const now = new Date().toISOString();
    const notes = mergeProductRuntimeActivation(ctx.product.governanceNotes, {
      marEnabled: true,
      marEnabledAt: now,
    });

    await this.prisma.medicationProduct.update({
      where: { id: productId },
      data: { governanceNotes: notes },
    });

    const stateAfter = "MAR_ENABLED" as const;
    await this.writeActivationAudit({
      entityType: MEDICATION_MAR_ENABLED_AUDIT,
      action: "ENABLE_MAR",
      userId,
      facilityId: body.facilityId,
      productId,
      conceptId: ctx.product.conceptId,
      statusBefore: ctx.activationState,
      statusAfter: stateAfter,
      blockerCount: 0,
      auditMeta,
    });

    return { activationState: stateAfter, marEnabled: true };
  }

  async requestBillingReview(
    productId: string,
    body: MedicationActivationGovernanceActionBody,
    userId: string,
    auditMeta?: { ip?: string; userAgent?: string }
  ) {
    const ctx = await this.loadActivationContext(productId, body.facilityId);
    if (!ctx.runtime.orderSearchEnabled) {
      this.assertGate({ allowed: false, blockers: ["ORDER_SEARCH_NOT_ENABLED"] });
    }
    this.assertGate({
      allowed: gateNoteOnly(body),
      blockers: gateNoteOnly(body) ? [] : ["NOTE_REQUIRED"],
    });

    const now = new Date().toISOString();
    const notes = mergeProductRuntimeActivation(ctx.product.governanceNotes, {
      billingReviewRequired: true,
      billingReviewRequestedAt: now,
    });

    await this.prisma.medicationProduct.update({
      where: { id: productId },
      data: { governanceNotes: notes },
    });

    const stateAfter = "BILLING_REVIEW_REQUIRED" as const;
    await this.writeActivationAudit({
      entityType: MEDICATION_BILLING_REVIEW_REQUESTED_AUDIT,
      action: "REQUEST_BILLING_REVIEW",
      userId,
      facilityId: body.facilityId,
      productId,
      conceptId: ctx.product.conceptId,
      statusBefore: ctx.activationState,
      statusAfter: stateAfter,
      blockerCount: 0,
      auditMeta,
    });

    return { activationState: stateAfter, billingReviewRequired: true };
  }

  async enableBilling(
    productId: string,
    body: MedicationActivationEnableBillingBody,
    userId: string,
    auditMeta?: { ip?: string; userAgent?: string }
  ) {
    const ctx = await this.loadActivationContext(productId, body.facilityId);
    const gate = evaluateEnableBillingGate({
      runtime: ctx.runtime,
      reviewedBillingCode: body.reviewedBillingCode,
      reviewedBillingUnit: body.reviewedBillingUnit,
      reviewedByRole: body.reviewedByRole,
      confirmExactSourcePreserved: body.confirmExactSourcePreserved,
      confirmDuplicateGovernanceResolved: body.confirmDuplicateGovernanceResolved,
      note: body.note,
      duplicateGate: ctx.duplicateGate,
    });
    this.assertGate(gate);

    const now = new Date().toISOString();
    const notes = mergeProductRuntimeActivation(ctx.product.governanceNotes, {
      billingEnabled: true,
      billingEnabledAt: now,
      billingReviewRequired: false,
      reviewedBillingCode: body.reviewedBillingCode.trim(),
      reviewedBillingUnit: body.reviewedBillingUnit.trim(),
      reviewedByRole: body.reviewedByRole.trim(),
    });

    await this.prisma.medicationProduct.update({
      where: { id: productId },
      data: { governanceNotes: notes },
    });

    const stateAfter = "BILLING_ENABLED" as const;
    await this.writeActivationAudit({
      entityType: MEDICATION_BILLING_ENABLED_AUDIT,
      action: "ENABLE_BILLING",
      userId,
      facilityId: body.facilityId,
      productId,
      conceptId: ctx.product.conceptId,
      statusBefore: ctx.activationState,
      statusAfter: stateAfter,
      blockerCount: 0,
      auditMeta,
      billingCodeCategory: body.reviewedBillingCode.trim().slice(0, 8),
    });

    return { activationState: stateAfter, billingEnabled: true };
  }

  async disableRuntime(
    productId: string,
    body: MedicationActivationGovernanceActionBody,
    userId: string,
    auditMeta?: { ip?: string; userAgent?: string }
  ) {
    const ctx = await this.loadActivationContext(productId, body.facilityId);
    this.assertGate({
      allowed: gateNoteOnly(body),
      blockers: gateNoteOnly(body) ? [] : ["NOTE_REQUIRED"],
    });

    const notes = mergeProductRuntimeActivation(ctx.product.governanceNotes, {
      orderSearchEnabled: false,
      orderSearchEnabledAt: null,
      marEnabled: false,
      marEnabledAt: null,
      billingEnabled: false,
      billingEnabledAt: null,
      billingReviewRequired: false,
      billingReviewRequestedAt: null,
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.medicationProduct.update({
        where: { id: productId },
        data: { isActive: false, governanceNotes: notes },
      });
      await tx.medicationConcept.update({
        where: { id: ctx.product.conceptId },
        data: { isActive: false },
      });
      if (ctx.defaultPackage) {
        await tx.medicationPackage.update({
          where: { id: ctx.defaultPackage.id },
          data: { isActive: false },
        });
      }
    });

    const stateAfter = deriveRuntimeActivationState({
      productIsActive: false,
      conceptIsActive: false,
      governanceStatus: ctx.product.governanceStatus,
      formularyOnFormulary: Boolean(ctx.defaultPackage?.facilityFormulary?.isOnFormulary),
      runtime: parseProductRuntimeActivation(notes),
    });

    await this.writeActivationAudit({
      entityType: MEDICATION_RUNTIME_DISABLED_AUDIT,
      action: "DISABLE_RUNTIME",
      userId,
      facilityId: body.facilityId,
      productId,
      conceptId: ctx.product.conceptId,
      statusBefore: ctx.activationState,
      statusAfter: stateAfter,
      blockerCount: 0,
      auditMeta,
    });

    return { activationState: stateAfter, runtimeDisabled: true };
  }

  /** Provider medication search — exclude canonical-linked catalog rows failing order-search gate. */
  async filterProviderSearchCatalogIds(
    facilityId: string,
    catalogMedicationIds: string[]
  ): Promise<Set<string>> {
    const unique = [...new Set(catalogMedicationIds.filter(Boolean))];
    if (unique.length === 0) return new Set();

    const products = await this.prisma.medicationProduct.findMany({
      where: { legacyCatalogMedicationId: { in: unique } },
      include: {
        concept: { select: { isActive: true } },
        packages: {
          orderBy: [{ isDefaultForProduct: "desc" }, { createdAt: "asc" }],
          take: 1,
          include: {
            facilityFormularyItems: { where: { facilityId }, take: 1 },
          },
        },
      },
    });

    const excluded = new Set<string>();
    const stagingByProduct = await this.loadStagingContextByProductIds(
      products.map((p) => p.id),
      facilityId
    );

    for (const product of products) {
      const catalogId = product.legacyCatalogMedicationId;
      if (!catalogId) continue;

      const pkg = product.packages[0];
      const formulary = pkg?.facilityFormularyItems[0];
      const runtime = parseProductRuntimeActivation(product.governanceNotes);
      const staging = stagingByProduct.get(product.id) ?? null;

      const gate = evaluateProviderOrderSearchGate({
        productIsActive: product.isActive,
        conceptIsActive: product.concept.isActive,
        governanceStatus: product.governanceStatus,
        formularyOnFormulary: Boolean(formulary?.isOnFormulary),
        facilityId,
        formularyFacilityId: formulary?.facilityId ?? null,
        runtime,
        stagingGovernance: staging?.governance ?? null,
        reconciliationStatus: staging?.reconciliationStatus ?? null,
        reviewFlags: staging?.reviewFlags ?? [],
      });

      if (!gate.allowed) excluded.add(catalogId);
    }

    return new Set(unique.filter((id) => !excluded.has(id)));
  }

  private async loadActivationContext(productId: string, facilityId: string) {
    const product = await this.prisma.medicationProduct.findUnique({
      where: { id: productId },
      include: {
        concept: { select: { id: true, isActive: true } },
        packages: {
          orderBy: [{ isDefaultForProduct: "desc" }, { createdAt: "asc" }],
          take: 1,
          include: {
            facilityFormularyItems: { where: { facilityId }, take: 1 },
            billingProfiles: { select: { requiresManualReview: true } },
          },
        },
      },
    });
    if (!product) throw new NotFoundException("Produit médicamenteux introuvable.");

    const defaultPackage = product.packages[0]
      ? {
          id: product.packages[0].id,
          facilityFormulary: product.packages[0].facilityFormularyItems[0] ?? null,
        }
      : null;

    const stagingCtx = (await this.loadStagingContextByProductIds([productId], facilityId)).get(
      productId
    );

    const runtime = parseProductRuntimeActivation(product.governanceNotes);
    const duplicateGate = evaluateDuplicateGovernanceForActivation(
      stagingCtx?.governance ?? null,
      stagingCtx?.reconciliationStatus ?? null,
      stagingCtx?.reviewFlags ?? []
    );

    const trace = stagingCtx?.sourceTrace ?? null;
    const hasExactSourceFields = Boolean(
      trace?.sourceNameExact?.trim() && trace?.sourceStrengthExact?.trim() && trace?.sourceRouteExact?.trim()
    );

    const ndcReviewRequired =
      stagingCtx?.reviewFlags.includes("NDC_REVIEW_REQUIRED") ?? false;

    const activationState = deriveRuntimeActivationState({
      productIsActive: product.isActive,
      conceptIsActive: product.concept.isActive,
      governanceStatus: product.governanceStatus,
      formularyOnFormulary: Boolean(defaultPackage?.facilityFormulary?.isOnFormulary),
      runtime,
    });

    return {
      product,
      defaultPackage,
      runtime,
      duplicateGate,
      hasExactSourceFields,
      ndcReviewRequired,
      activationState,
      stagingCtx,
    };
  }

  private async toCandidateDto(
    product: {
      id: string;
      code: string;
      conceptId: string;
      governanceStatus: string;
      isActive: boolean;
      governanceNotes: string | null;
      legacyCatalogMedicationId: string | null;
      concept: { id: string; isActive: boolean };
      packages: Array<{
        id: string;
        facilityFormularyItems: Array<{ id: string; isOnFormulary: boolean; facilityId: string }>;
      }>;
    },
    facilityId: string,
    staging: StagingProductContext | null
  ): Promise<ActivationCandidateDto> {
    const pkg = product.packages[0];
    const formulary = pkg?.facilityFormularyItems[0];
    const runtime = parseProductRuntimeActivation(product.governanceNotes);
    const duplicateGate = evaluateDuplicateGovernanceForActivation(
      staging?.governance ?? null,
      staging?.reconciliationStatus ?? null,
      staging?.reviewFlags ?? []
    );

    const approveGate = evaluateApproveFormularyGate({
      governanceStatus: product.governanceStatus,
      confirmExactSourcePreserved: true,
      confirmDuplicateGovernanceResolved: true,
      note: "preview",
      duplicateGate,
      hasExactSourceFields: Boolean(
        staging?.sourceTrace?.sourceNameExact &&
          staging?.sourceTrace?.sourceStrengthExact &&
          staging?.sourceTrace?.sourceRouteExact
      ),
      facilityFormularyExists: Boolean(formulary),
    });

    return {
      productId: product.id,
      conceptId: product.conceptId,
      productCode: product.code,
      governanceStatus: product.governanceStatus,
      productIsActive: product.isActive,
      conceptIsActive: product.concept.isActive,
      activationState: deriveRuntimeActivationState({
        productIsActive: product.isActive,
        conceptIsActive: product.concept.isActive,
        governanceStatus: product.governanceStatus,
        formularyOnFormulary: Boolean(formulary?.isOnFormulary),
        runtime,
      }),
      runtime,
      exactSourceMedication: staging?.sourceTrace?.sourceNameExact ?? null,
      exactSourceDose: staging?.sourceTrace?.sourceStrengthExact ?? null,
      exactSourceFormRoute: staging?.sourceTrace?.sourceRouteExact ?? null,
      duplicateGovernanceStatus: staging?.governance?.governanceDecision ?? null,
      duplicateGovernanceResolved: duplicateGate.allowed,
      formularyOnFormulary: Boolean(formulary?.isOnFormulary),
      facilityFormularyItemId: formulary?.id ?? null,
      packageId: pkg?.id ?? null,
      legacyCatalogMedicationId: product.legacyCatalogMedicationId,
      blockerReasons: approveGate.blockers.filter((c) => c !== "NOTE_REQUIRED"),
    };
  }

  private async loadStagingContextByProductIds(
    productIds: string[],
    facilityId: string
  ): Promise<Map<string, StagingProductContext>> {
    const map = new Map<string, StagingProductContext>();
    if (productIds.length === 0) return map;

    const rows = await this.prisma.medicationFormularyImportStaging.findMany({
      where: { facilityId, promotionResultJson: { not: Prisma.DbNull } },
      select: {
        promotionResultJson: true,
        rawJson: true,
        reconciliationStatus: true,
        reviewFlags: true,
      },
      take: 500,
    });

    for (const row of rows) {
      const promo =
        row.promotionResultJson != null &&
        typeof row.promotionResultJson === "object" &&
        !Array.isArray(row.promotionResultJson)
          ? (row.promotionResultJson as Record<string, unknown>)
          : null;
      const pid = typeof promo?.productId === "string" ? promo.productId : null;
      if (!pid || !productIds.includes(pid) || map.has(pid)) continue;

      const sourceTrace = parsePriorityErSourceTrace(row.rawJson);
      const flags = Array.isArray(row.reviewFlags)
        ? row.reviewFlags.filter((f): f is string => typeof f === "string")
        : [];
      map.set(pid, {
        governance: parseStagingGovernanceFromRow(row.rawJson),
        reconciliationStatus: row.reconciliationStatus,
        reviewFlags: flags,
        sourceTrace,
      });
    }

    return map;
  }

  private assertGate(gate: { allowed: boolean; blockers: ActivationGateBlockerCode[] }): void {
    if (gate.allowed) return;
    throw new BadRequestException({
      message: "Activation bloquée par les garde-fous de gouvernance.",
      blockers: gate.blockers,
    });
  }

  private async writeActivationAudit(params: {
    entityType: string;
    action: MedicationActivationAuditAction;
    userId: string;
    facilityId: string;
    productId: string;
    conceptId: string;
    statusBefore: string;
    statusAfter: string;
    blockerCount: number;
    auditMeta?: { ip?: string; userAgent?: string };
    billingCodeCategory?: string;
  }) {
    await this.audit.log(AuditAction.UPDATE, params.entityType, {
      userId: params.userId,
      facilityId: params.facilityId,
      entityId: params.productId,
      ip: params.auditMeta?.ip,
      userAgent: params.auditMeta?.userAgent,
      critical: true,
      metadata: {
        activationAction: params.action,
        productId: params.productId,
        conceptId: params.conceptId,
        facilityId: params.facilityId,
        statusBefore: params.statusBefore,
        statusAfter: params.statusAfter,
        blockerCount: params.blockerCount,
        governanceOnly: false,
        runtimeCutover: params.action === "ENABLE_ORDER_SEARCH" || params.action === "ENABLE_MAR",
        ...(params.billingCodeCategory
          ? { reviewedBillingCodeCategory: params.billingCodeCategory }
          : {}),
      },
    });
  }
}

type StagingProductContext = {
  governance: PriorityErGovernanceMeta;
  reconciliationStatus: string;
  reviewFlags: string[];
  sourceTrace: ReturnType<typeof parsePriorityErSourceTrace>;
};

function gateNoteOnly(body: MedicationActivationGovernanceActionBody): boolean {
  return Boolean(body.note?.trim());
}
