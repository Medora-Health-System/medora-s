/**
 * Phase 19I — Tiered global baseline auto-approval (Priority ER promoted products).
 */

import { BadRequestException, Injectable } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { MEDICATION_BASELINE_SOURCE_PRIORITY_ER } from "./medication-baseline.constants";
import type { MedicationGlobalBaselineAutoApproveBody } from "./dto/medication-global-baseline-auto-approve.dto";
import {
  evaluateGlobalBaselineTier,
  GLOBAL_BASELINE_AUTO_APPROVE_NOTE,
  type GlobalBaselineTier2Reason,
} from "./medication-global-baseline-tier-rules.util";
import { medicationFormularyImportStagingPromotionSelect } from "./medication-formulary-import-staging.types";
import {
  isPriorityErInventoryStagingRow,
  parsePriorityErSourceTrace,
} from "./priority-er-inventory-staging-source.util";
import {
  isGovernanceBlocked,
  parsePriorityErGovernance,
} from "./priority-er-inventory-governance.util";
import { parseProductRuntimeActivation } from "./medication-product-runtime-activation.util";

export const MEDICATION_GLOBAL_BASELINE_AUTO_APPROVE_AUDIT_ENTITY =
  "MEDICATION_GLOBAL_BASELINE_AUTO_APPROVE";

export type GlobalBaselineAutoApproveSampleRow = {
  productId: string;
  productCode: string;
  tier: 1 | 2;
  tier2Reasons: GlobalBaselineTier2Reason[];
  exactSourceText: string | null;
  governanceStatus: string;
};

export type GlobalBaselineAutoApproveResult = {
  dryRun: boolean;
  source: string;
  totalCandidates: number;
  tier1AutoApprovable: number;
  tier2ManualReview: number;
  skippedDuplicates: number;
  skippedHighRisk: number;
  skippedControlled: number;
  skippedAmbiguousDose: number;
  skippedMissingRequiredFields: number;
  skippedAlreadyApproved: number;
  committedCount?: number;
  sampleRows: GlobalBaselineAutoApproveSampleRow[];
};

type ProductCandidateInput = {
  id: string;
  code: string;
  governanceStatus: string;
  governanceNotes: string | null;
  baselineAvailable: boolean;
  baselineSourceRowId: string | null;
  strengthDisplay: string;
  dosageForm: string;
  administrationType: string;
  administrationProfile: { requiresInfusionSession: boolean } | null;
  infusionProfile: { id: string } | null;
  concept: {
    genericName: string;
    safetyProfile: { isHighAlert: boolean; isControlled: boolean } | null;
  };
};

type StagingCandidateInput = {
  sourceRowId: string;
  rawJson: unknown;
  reconciliationStatus: string;
  reviewFlags: unknown;
};

type CandidateRow = {
  productId: string;
  productCode: string;
  governanceStatus: string;
  governanceNotes: string | null;
  baselineAvailable: boolean;
  baselineSourceRowId: string | null;
  sourceNameExact: string;
  sourceStrengthExact: string;
  sourceRouteExact: string;
  exactSourceText: string;
  reconciliationStatus: string;
  reviewFlags: string[];
  isHighAlert: boolean;
  isControlled: boolean;
  requiresInfusionSession: boolean;
  administrationType: string;
  governanceBlocked: boolean;
};

function parsePromotionProductId(value: unknown): string | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null;
  const id = (value as Record<string, unknown>).productId;
  return typeof id === "string" && id.length > 0 ? id : null;
}

function appendGovernanceNote(existing: string | null, adminNote: string): string {
  const parts = [existing?.trim(), GLOBAL_BASELINE_AUTO_APPROVE_NOTE, adminNote.trim()].filter(
    Boolean
  ) as string[];
  return parts.join("\n\n");
}

/** Tier 2 skip tallies (19I.2B). skippedDuplicates/skippedControlled stay 0 for API compatibility. */
function incrementSkipCounters(
  tier2Reasons: GlobalBaselineTier2Reason[],
  counters: Omit<
    GlobalBaselineAutoApproveResult,
    "dryRun" | "source" | "totalCandidates" | "tier1AutoApprovable" | "tier2ManualReview" | "sampleRows" | "committedCount"
  >
) {
  for (const r of tier2Reasons) {
    if (r === "HIGH_RISK_MEDICATION") counters.skippedHighRisk += 1;
    if (r === "AMBIGUOUS_DOSE") counters.skippedAmbiguousDose += 1;
    if (
      r === "MISSING_MEDICATION_NAME" ||
      r === "MISSING_DOSE" ||
      r === "MISSING_FORM" ||
      r === "MISSING_EXACT_SOURCE"
    ) {
      counters.skippedMissingRequiredFields += 1;
    }
    if (r === "ALREADY_BASELINE_APPROVED") counters.skippedAlreadyApproved += 1;
  }
}

@Injectable()
export class MedicationGlobalBaselineAutoApproveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async runTieredAutoApproval(
    body: MedicationGlobalBaselineAutoApproveBody,
    userId: string,
    auditMeta?: { ip?: string; userAgent?: string }
  ): Promise<GlobalBaselineAutoApproveResult> {
    if (body.source !== MEDICATION_BASELINE_SOURCE_PRIORITY_ER) {
      throw new BadRequestException("Source non pris en charge pour l’auto-approbation.");
    }

    const dryRun = body.dryRun !== false;
    if (!dryRun) {
      const note = body.adminNote?.trim();
      if (!note) {
        throw new BadRequestException(
          "Une note administrateur est requise pour valider l’auto-approbation (dryRun=false)."
        );
      }
    }

    const candidates = await this.loadCandidates(body.facilityId, body.limit ?? 500);
    const evaluated = candidates.map((c) => {
      const tierResult = evaluateGlobalBaselineTier({
        sourceNameExact: c.sourceNameExact,
        sourceStrengthExact: c.sourceStrengthExact,
        sourceRouteExact: c.sourceRouteExact,
        exactSourceText: c.exactSourceText,
        reconciliationStatus: c.reconciliationStatus,
        reviewFlags: c.reviewFlags,
        isHighAlert: c.isHighAlert,
        isControlled: c.isControlled,
        requiresInfusionSession: c.requiresInfusionSession,
        administrationType: c.administrationType,
        governanceStatus: c.governanceStatus,
        baselineAvailable: c.baselineAvailable,
        alreadyActivationApproved: c.governanceStatus === "ACTIVATION_APPROVED",
        governanceBlocked: c.governanceBlocked,
      });
      return { candidate: c, tier: tierResult.tier, tier2Reasons: tierResult.tier2Reasons };
    });

    const skipCounters = {
      skippedDuplicates: 0,
      skippedHighRisk: 0,
      skippedControlled: 0,
      skippedAmbiguousDose: 0,
      skippedMissingRequiredFields: 0,
      skippedAlreadyApproved: 0,
    };

    let tier1AutoApprovable = 0;
    let tier2ManualReview = 0;

    for (const row of evaluated) {
      if (row.tier === 1) tier1AutoApprovable += 1;
      else {
        tier2ManualReview += 1;
        incrementSkipCounters(row.tier2Reasons, skipCounters);
      }
    }

    const sampleRows: GlobalBaselineAutoApproveSampleRow[] = evaluated.slice(0, 25).map((r) => ({
      productId: r.candidate.productId,
      productCode: r.candidate.productCode,
      tier: r.tier,
      tier2Reasons: r.tier2Reasons,
      exactSourceText: r.candidate.exactSourceText || null,
      governanceStatus: r.candidate.governanceStatus,
    }));

    const baseResult: GlobalBaselineAutoApproveResult = {
      dryRun,
      source: body.source,
      totalCandidates: candidates.length,
      tier1AutoApprovable,
      tier2ManualReview,
      ...skipCounters,
      sampleRows,
    };

    if (dryRun) return baseResult;

    const tier1Rows = evaluated.filter((r) => r.tier === 1);
    let committedCount = 0;

    for (const row of tier1Rows) {
      const runtimeBefore = parseProductRuntimeActivation(row.candidate.governanceNotes);
      const updated = await this.prisma.medicationProduct.update({
        where: { id: row.candidate.productId },
        data: {
          baselineAvailable: true,
          baselineSource: MEDICATION_BASELINE_SOURCE_PRIORITY_ER,
          baselineSourceRowId: row.candidate.baselineSourceRowId,
          governanceStatus: "ACTIVATION_APPROVED",
          isActive: false,
          governanceNotes: appendGovernanceNote(
            row.candidate.governanceNotes,
            body.adminNote!.trim()
          ),
        },
        select: { id: true, governanceNotes: true, governanceStatus: true },
      });

      const runtimeAfter = parseProductRuntimeActivation(updated.governanceNotes);
      if (
        runtimeAfter.orderSearchEnabled !== runtimeBefore.orderSearchEnabled ||
        runtimeAfter.marEnabled !== runtimeBefore.marEnabled ||
        runtimeAfter.billingEnabled !== runtimeBefore.billingEnabled
      ) {
        throw new BadRequestException(
          "État d’activation runtime modifié de façon inattendue — opération annulée."
        );
      }

      committedCount += 1;
    }

    await this.audit.log(AuditAction.UPDATE, MEDICATION_GLOBAL_BASELINE_AUTO_APPROVE_AUDIT_ENTITY, {
      userId,
      facilityId: body.facilityId,
      entityId: "global-baseline-tiered-auto-approve",
      ip: auditMeta?.ip,
      userAgent: auditMeta?.userAgent,
      critical: true,
      metadata: {
        dryRun: false,
        source: body.source,
        totalCandidates: candidates.length,
        tier1AutoApprovable,
        tier2ManualReview,
        committedCount,
        skippedDuplicates: skipCounters.skippedDuplicates,
        skippedHighRisk: skipCounters.skippedHighRisk,
        skippedControlled: skipCounters.skippedControlled,
        skippedAmbiguousDose: skipCounters.skippedAmbiguousDose,
        skippedMissingRequiredFields: skipCounters.skippedMissingRequiredFields,
        skippedAlreadyApproved: skipCounters.skippedAlreadyApproved,
        runtimeOrderSearchEnabled: false,
        runtimeMarEnabled: false,
        runtimeBillingEnabled: false,
        facilityRuntimeActivation: false,
      },
    });

    return { ...baseResult, committedCount };
  }

  private async loadCandidates(
    facilityId: string | undefined,
    limit: number
  ): Promise<CandidateRow[]> {
    const stagingWhere: Prisma.MedicationFormularyImportStagingWhereInput = {
      promotionResultJson: { not: Prisma.JsonNull },
      ...(facilityId ? { OR: [{ facilityId }, { facilityId: null }] } : {}),
    };

    const stagingRows = await this.prisma.medicationFormularyImportStaging.findMany({
      where: stagingWhere,
      select: medicationFormularyImportStagingPromotionSelect,
      orderBy: { updatedAt: "desc" },
      take: limit * 2,
    });

    const byProductId = new Map<string, CandidateRow>();

    const productIdsFromStaging: string[] = [];
    const stagingByProductId = new Map<
      string,
      (typeof stagingRows)[number]
    >();

    for (const row of stagingRows) {
      if (productIdsFromStaging.length >= limit) break;
      if (!isPriorityErInventoryStagingRow(row.rawJson)) continue;
      const productId = parsePromotionProductId(row.promotionResultJson);
      if (!productId) continue;
      if (!stagingByProductId.has(productId)) {
        productIdsFromStaging.push(productId);
        stagingByProductId.set(productId, row);
      }
    }

    const productSelect = {
      id: true,
      code: true,
      governanceStatus: true,
      governanceNotes: true,
      baselineAvailable: true,
      baselineSourceRowId: true,
      strengthDisplay: true,
      dosageForm: true,
      administrationType: true,
      administrationProfile: { select: { requiresInfusionSession: true } },
      infusionProfile: { select: { id: true } },
      concept: {
        select: {
          genericName: true,
          safetyProfile: { select: { isHighAlert: true, isControlled: true } },
        },
      },
    } as const;

    if (productIdsFromStaging.length > 0) {
      const products = await this.prisma.medicationProduct.findMany({
        where: { id: { in: productIdsFromStaging.slice(0, limit) } },
        select: productSelect,
      });

      for (const product of products) {
        const staging = stagingByProductId.get(product.id);
        if (!staging) continue;
        this.registerCandidate(byProductId, product, staging);
      }
    }

    const orphanProducts = await this.prisma.medicationProduct.findMany({
      where: {
        baselineSource: MEDICATION_BASELINE_SOURCE_PRIORITY_ER,
        OR: [
          { baselineAvailable: false },
          { governanceStatus: { not: "ACTIVATION_APPROVED" } },
        ],
      },
      select: productSelect,
      take: limit,
      orderBy: { updatedAt: "desc" },
    });

    for (const product of orphanProducts) {
      if (byProductId.has(product.id)) continue;
      const staging = product.baselineSourceRowId
        ? await this.prisma.medicationFormularyImportStaging.findFirst({
            where: { sourceRowId: product.baselineSourceRowId },
            select: medicationFormularyImportStagingPromotionSelect,
          })
        : null;
      this.registerCandidate(byProductId, product, staging);
    }

    return [...byProductId.values()].slice(0, limit);
  }

  private registerCandidate(
    byProductId: Map<string, CandidateRow>,
    product: ProductCandidateInput,
    staging: StagingCandidateInput | null
  ): void {
    const mapped = this.mapCandidate(product, staging);
    if (mapped) byProductId.set(mapped.productId, mapped);
  }

  private normalizeReviewFlags(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((f): f is string => typeof f === "string");
  }

  private mapCandidate(
    product: ProductCandidateInput,
    staging: StagingCandidateInput | null
  ): CandidateRow | null {
    const trace = staging ? parsePriorityErSourceTrace(staging.rawJson) : null;
    const governance = staging ? parsePriorityErGovernance(staging.rawJson) : null;
    const flags = staging ? this.normalizeReviewFlags(staging.reviewFlags) : [];

    const sourceNameExact = trace?.sourceNameExact || product.concept.genericName || "";
    const sourceStrengthExact = trace?.sourceStrengthExact || product.strengthDisplay || "";
    const sourceRouteExact = trace?.sourceRouteExact || product.dosageForm || "";
    const exactSourceText =
      trace?.exactSourceText ||
      [sourceNameExact, sourceStrengthExact, sourceRouteExact].filter(Boolean).join(" ");

    if (product.baselineAvailable && product.governanceStatus === "ACTIVATION_APPROVED") {
      return null;
    }

    return {
      productId: product.id,
      productCode: product.code,
      governanceStatus: product.governanceStatus,
      governanceNotes: product.governanceNotes,
      baselineAvailable: product.baselineAvailable,
      baselineSourceRowId: product.baselineSourceRowId ?? staging?.sourceRowId ?? null,
      sourceNameExact,
      sourceStrengthExact,
      sourceRouteExact,
      exactSourceText,
      reconciliationStatus: staging?.reconciliationStatus ?? "NEW_CANDIDATE",
      reviewFlags: flags,
      isHighAlert: product.concept.safetyProfile?.isHighAlert ?? false,
      isControlled: product.concept.safetyProfile?.isControlled ?? false,
      requiresInfusionSession:
        (product.administrationProfile?.requiresInfusionSession ?? false) ||
        Boolean(product.infusionProfile),
      administrationType: product.administrationType,
      governanceBlocked: governance ? isGovernanceBlocked(governance, flags) : false,
    };
  }
}
