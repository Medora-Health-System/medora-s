import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { MedicationMasterExplorerService } from "./medication-master-explorer.service";
import type {
  ResolveStagingDuplicateBody,
  StagingDuplicateGovernanceActionBody,
  StagingDuplicateGovernanceListQuery,
} from "./dto/medication-staging-duplicate-governance.dto";
import { evaluatePriorityErPromotionEligibility } from "./priority-er-inventory-promotion-eligibility.util";
import { loadMedicationCatalogIndex } from "./priority-er-inventory-catalog-index";
import {
  scorePriorityErMatchCandidates,
  type PriorityErGovernanceMatchCandidate,
} from "./priority-er-inventory-governance-match.util";
import {
  GOVERNANCE_REVIEW_FLAG_BLOCKED,
  type DuplicateGovernanceStatus,
  governanceNeedsReviewFlags,
  isGovernanceBlocked,
  mergeGovernanceIntoRawJson,
  parsePriorityErGovernance,
} from "./priority-er-inventory-governance.util";
import {
  isPriorityErInventoryStagingRow,
  parsePriorityErReconciliationMeta,
  parsePriorityErSourceTrace,
} from "./priority-er-inventory-staging-source.util";
import { medicationFormularyImportStagingPromotionSelect } from "./medication-formulary-import-staging.types";

export type StagingDuplicateGovernanceRowDto = {
  id: string;
  batchId: string;
  sourceRowId: string;
  exactSourceText: string;
  medication: string;
  dose: string;
  form: string;
  reconciliationStatus: string;
  duplicateWarnings: string[];
  reviewFlags: string[];
  governance: ReturnType<typeof parsePriorityErGovernance>;
  matchCandidates: PriorityErGovernanceMatchCandidate[];
  canonicalMatches: Array<{
    kind: "concept" | "product" | "catalog";
    id: string;
    code: string | null;
    displayName: string;
    strengthDisplay: string | null;
    dosageForm: string | null;
    isActive: boolean;
    isOnFormulary: boolean | null;
    isEDFormulary: boolean | null;
    governanceStatus: string | null;
    legacyCatalogMedicationId: string | null;
  }>;
  promotionEligible: boolean;
  promotionBlockReasons: Array<{ code: string; message: string }>;
  promoted: boolean;
  canonicalConceptId: string | null;
  canonicalProductId: string | null;
  duplicateReason: string | null;
  importedAt: string | null;
};

@Injectable()
export class MedicationStagingDuplicateGovernanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly explorer: MedicationMasterExplorerService
  ) {}

  assertFacilityScope(facilityId: string | undefined, callerFacilityId: string | undefined) {
    if (facilityId) {
      this.explorer.assertFacilityScope(facilityId, callerFacilityId);
    }
  }

  async listStagingDuplicates(
    query: StagingDuplicateGovernanceListQuery
  ): Promise<{ items: StagingDuplicateGovernanceRowDto[]; total: number }> {
    const where: {
      facilityId?: string;
      batchId?: string;
      reconciliationStatus?: string;
    } = {};
    if (query.facilityId) where.facilityId = query.facilityId;
    if (query.batchId) where.batchId = query.batchId;
    if (query.reconciliationStatus) where.reconciliationStatus = query.reconciliationStatus;
    if (query.filter === "POSSIBLE_DUPLICATE") where.reconciliationStatus = "POSSIBLE_DUPLICATE";
    if (query.filter === "EXACT_MATCH") where.reconciliationStatus = "EXACT_MATCH";
    if (query.filter === "NEW_CANDIDATE") where.reconciliationStatus = "NEW_CANDIDATE";
    if (query.filter === "REVIEW_REQUIRED") where.reconciliationStatus = "REVIEW_REQUIRED";

    const rows = await this.prisma.medicationFormularyImportStaging.findMany({
      where,
      select: medicationFormularyImportStagingPromotionSelect,
      orderBy: [{ importedAt: "desc" }, { sourceRowId: "asc" }],
      take: 2000,
    });

    const priorityErRows = rows.filter((r) => isPriorityErInventoryStagingRow(r.rawJson));
    const catalogIndex = await loadMedicationCatalogIndex(this.prisma);

    let mapped = await Promise.all(
      priorityErRows.map((row) => this.mapRow(row, catalogIndex.entries))
    );

    if (query.governanceStatus) {
      mapped = mapped.filter((r) => r.governance.governanceDecision === query.governanceStatus);
    }
    if (query.filter === "PROMOTED_INACTIVE") {
      mapped = mapped.filter((r) => r.promoted);
    }
    if (query.filter === "BLOCKED") {
      mapped = mapped.filter((r) => isGovernanceBlocked(r.governance, r.reviewFlags));
    }
    if (query.filter === "MISSING_NDC") {
      mapped = mapped.filter((r) => r.reviewFlags.includes("NDC_REVIEW_REQUIRED"));
    }
    if (query.filter === "MISSING_BILLING") {
      mapped = mapped.filter((r) => r.reviewFlags.includes("BILLING_REVIEW_REQUIRED"));
    }
    if (query.q?.trim()) {
      const q = query.q.trim().toLowerCase();
      mapped = mapped.filter(
        (r) =>
          r.exactSourceText.toLowerCase().includes(q) ||
          r.medication.toLowerCase().includes(q) ||
          r.batchId.toLowerCase().includes(q) ||
          r.sourceRowId.toLowerCase().includes(q)
      );
    }

    const total = mapped.length;
    const items = mapped.slice(query.offset, query.offset + query.limit);
    return { items, total };
  }

  async resolveStagingDuplicate(
    stagingRowId: string,
    body: ResolveStagingDuplicateBody,
    userId: string,
    auditMeta?: { ip?: string; userAgent?: string }
  ) {
    const row = await this.loadPriorityErRow(stagingRowId, body.facilityId);
    if (body.decision === "LINK_TO_EXISTING") {
      if (!body.linkedConceptId && !body.linkedProductId) {
        throw new BadRequestException(
          "linkedConceptId ou linkedProductId requis pour LINK_TO_EXISTING."
        );
      }
      if (body.linkedConceptId) {
        const c = await this.prisma.medicationConcept.findUnique({
          where: { id: body.linkedConceptId },
          select: { id: true },
        });
        if (!c) throw new BadRequestException("linkedConceptId introuvable.");
      }
      if (body.linkedProductId) {
        const p = await this.prisma.medicationProduct.findUnique({
          where: { id: body.linkedProductId },
          select: { id: true },
        });
        if (!p) throw new BadRequestException("linkedProductId introuvable.");
      }
    }
    if (body.duplicateOfStagingRowId) {
      const other = await this.prisma.medicationFormularyImportStaging.findUnique({
        where: { id: body.duplicateOfStagingRowId },
        select: { id: true },
      });
      if (!other) throw new BadRequestException("duplicateOfStagingRowId introuvable.");
    }

    const decision = body.decision as DuplicateGovernanceStatus;
    const reviewFlags = this.applyGovernanceReviewFlags(row.reviewFlags, decision);
    const rawJson = mergeGovernanceIntoRawJson(row.rawJson, {
      duplicateResolutionStatus: decision,
      governanceDecision: decision,
      duplicateResolutionNote: body.note,
      linkedConceptId: body.linkedConceptId ?? null,
      linkedProductId: body.linkedProductId ?? null,
      duplicateOfStagingRowId: body.duplicateOfStagingRowId ?? null,
      reviewedByUserId: userId,
      reviewedAt: new Date().toISOString(),
    });

    const updated = await this.prisma.medicationFormularyImportStaging.update({
      where: { id: stagingRowId },
      data: {
        rawJson: rawJson as Prisma.InputJsonValue,
        reviewFlags,
        importGateStatus: "BLOCKED",
        overallStatus: "draft",
      },
      select: medicationFormularyImportStagingPromotionSelect,
    });

    await this.audit.log(AuditAction.UPDATE, "MEDICATION_DUPLICATE_REVIEWED", {
      userId,
      facilityId: row.facilityId ?? body.facilityId ?? undefined,
      entityId: stagingRowId,
      ip: auditMeta?.ip,
      userAgent: auditMeta?.userAgent,
      metadata: this.phiSafeAuditMetadata(updated, decision),
    });

    const catalogIndex = await loadMedicationCatalogIndex(this.prisma);
    return this.mapRow(updated, catalogIndex.entries);
  }

  async blockStagingDuplicate(
    stagingRowId: string,
    body: StagingDuplicateGovernanceActionBody,
    userId: string,
    auditMeta?: { ip?: string; userAgent?: string }
  ) {
    const row = await this.loadPriorityErRow(stagingRowId, body.facilityId);
    const reviewFlags = [...new Set([...this.flagList(row.reviewFlags), GOVERNANCE_REVIEW_FLAG_BLOCKED])];
    const rawJson = mergeGovernanceIntoRawJson(row.rawJson, {
      duplicateResolutionStatus: "BLOCKED_DUPLICATE",
      governanceDecision: "BLOCKED_DUPLICATE",
      duplicateResolutionNote: body.note,
      reviewedByUserId: userId,
      reviewedAt: new Date().toISOString(),
    });

    const updated = await this.prisma.medicationFormularyImportStaging.update({
      where: { id: stagingRowId },
      data: {
        rawJson: rawJson as Prisma.InputJsonValue,
        reviewFlags,
        importGateStatus: "BLOCKED",
      },
      select: medicationFormularyImportStagingPromotionSelect,
    });

    await this.audit.log(AuditAction.UPDATE, "MEDICATION_DUPLICATE_BLOCKED", {
      userId,
      facilityId: row.facilityId ?? body.facilityId ?? undefined,
      entityId: stagingRowId,
      ip: auditMeta?.ip,
      userAgent: auditMeta?.userAgent,
      metadata: this.phiSafeAuditMetadata(updated, "BLOCKED_DUPLICATE"),
    });

    const catalogIndex = await loadMedicationCatalogIndex(this.prisma);
    return this.mapRow(updated, catalogIndex.entries);
  }

  async unblockStagingDuplicate(
    stagingRowId: string,
    body: StagingDuplicateGovernanceActionBody,
    userId: string,
    auditMeta?: { ip?: string; userAgent?: string }
  ) {
    const row = await this.loadPriorityErRow(stagingRowId, body.facilityId);
    const reviewFlags = this.flagList(row.reviewFlags).filter((f) => f !== GOVERNANCE_REVIEW_FLAG_BLOCKED);
    const rawJson = mergeGovernanceIntoRawJson(row.rawJson, {
      duplicateResolutionStatus: "UNREVIEWED",
      governanceDecision: "UNREVIEWED",
      duplicateResolutionNote: body.note,
      linkedConceptId: null,
      linkedProductId: null,
      duplicateOfStagingRowId: null,
      reviewedByUserId: userId,
      reviewedAt: new Date().toISOString(),
    });

    const updated = await this.prisma.medicationFormularyImportStaging.update({
      where: { id: stagingRowId },
      data: {
        rawJson: rawJson as Prisma.InputJsonValue,
        reviewFlags,
        importGateStatus: "BLOCKED",
      },
      select: medicationFormularyImportStagingPromotionSelect,
    });

    await this.audit.log(AuditAction.UPDATE, "MEDICATION_DUPLICATE_UNBLOCKED", {
      userId,
      facilityId: row.facilityId ?? body.facilityId ?? undefined,
      entityId: stagingRowId,
      ip: auditMeta?.ip,
      userAgent: auditMeta?.userAgent,
      metadata: this.phiSafeAuditMetadata(updated, "UNREVIEWED"),
    });

    const catalogIndex = await loadMedicationCatalogIndex(this.prisma);
    return this.mapRow(updated, catalogIndex.entries);
  }

  private async loadPriorityErRow(stagingRowId: string, facilityId?: string) {
    const row = await this.prisma.medicationFormularyImportStaging.findUnique({
      where: { id: stagingRowId },
      select: medicationFormularyImportStagingPromotionSelect,
    });
    if (!row) throw new NotFoundException("Ligne de staging introuvable.");
    if (!isPriorityErInventoryStagingRow(row.rawJson)) {
      throw new BadRequestException("Ligne non éligible (inventaire Priority ER requis).");
    }
    if (facilityId && row.facilityId && row.facilityId !== facilityId) {
      throw new BadRequestException("Ligne hors périmètre établissement.");
    }
    return row;
  }

  private flagList(flags: unknown): string[] {
    return Array.isArray(flags) ? (flags as string[]) : [];
  }

  private applyGovernanceReviewFlags(flags: unknown, decision: DuplicateGovernanceStatus): string[] {
    const base = this.flagList(flags).filter((f) => f !== GOVERNANCE_REVIEW_FLAG_BLOCKED);
    const extra = governanceNeedsReviewFlags(decision);
    if (decision === "BLOCKED_DUPLICATE") {
      return [...new Set([...base, ...extra, GOVERNANCE_REVIEW_FLAG_BLOCKED])];
    }
    return [...new Set([...base, ...extra])];
  }

  private phiSafeAuditMetadata(
    row: {
      id: string;
      batchId: string;
      facilityId: string | null;
      reviewFlags: unknown;
      rawJson: unknown;
    },
    decision: string
  ) {
    const gov = parsePriorityErGovernance(row.rawJson);
    return {
      stagingRowId: row.id,
      batchId: row.batchId,
      decision,
      linkedConceptId: gov.linkedConceptId,
      linkedProductId: gov.linkedProductId,
      duplicateOfStagingRowId: gov.duplicateOfStagingRowId,
      reviewFlagCount: this.flagList(row.reviewFlags).length,
      facilityId: row.facilityId,
    };
  }

  private async mapRow(
    row: import("./medication-formulary-import-staging.types").MedicationFormularyImportStagingPromotionRow,
    catalogEntries: Awaited<ReturnType<typeof loadMedicationCatalogIndex>>["entries"]
  ): Promise<StagingDuplicateGovernanceRowDto> {
    const trace = parsePriorityErSourceTrace(row.rawJson);
    const reconciliation = parsePriorityErReconciliationMeta(row.rawJson);
    const raw = row.rawJson as Record<string, unknown>;
    const recBlock =
      raw.__reconciliation != null &&
      typeof raw.__reconciliation === "object" &&
      !Array.isArray(raw.__reconciliation)
        ? (raw.__reconciliation as Record<string, unknown>)
        : {};
    const matchedRefs = Array.isArray(recBlock.matchedRefs)
      ? (recBlock.matchedRefs as Array<{
          kind: "concept" | "product" | "package" | "catalog";
          id: string;
          code: string | null;
          conceptId: string | null;
          productId: string | null;
        }>)
      : [];

    const governance = parsePriorityErGovernance(row.rawJson);
    const reviewFlags = this.flagList(row.reviewFlags);
    const matchCandidates = scorePriorityErMatchCandidates({
      trace,
      entries: catalogEntries,
      matchedRefs,
    });

    const canonicalMatches = await this.loadCanonicalMatches(
      reconciliation.matchedConceptIds,
      reconciliation.matchedProductIds,
      matchedRefs.filter((m) => m.kind === "catalog").map((m) => m.id)
    );

    const promotionEligibility = evaluatePriorityErPromotionEligibility(row);
    const promotionResult =
      row.promotionResultJson != null &&
      typeof row.promotionResultJson === "object" &&
      !Array.isArray(row.promotionResultJson)
        ? (row.promotionResultJson as Record<string, unknown>)
        : null;

    const duplicateWarnings = reconciliation.duplicateWarnings;
    return {
      id: row.id,
      batchId: row.batchId,
      sourceRowId: row.sourceRowId,
      exactSourceText: row.sourceInventoryDescription,
      medication: trace.sourceNameExact,
      dose: trace.sourceStrengthExact,
      form: trace.sourceRouteExact,
      reconciliationStatus: row.reconciliationStatus,
      duplicateWarnings,
      reviewFlags,
      governance,
      matchCandidates,
      canonicalMatches,
      promotionEligible: promotionEligibility.eligible,
      promotionBlockReasons: promotionEligibility.eligible ? [] : promotionEligibility.reasons,
      promoted: Boolean(promotionResult?.conceptId && promotionResult?.productId),
      canonicalConceptId:
        typeof promotionResult?.conceptId === "string" ? promotionResult.conceptId : governance.linkedConceptId,
      canonicalProductId:
        typeof promotionResult?.productId === "string" ? promotionResult.productId : governance.linkedProductId,
      duplicateReason: duplicateWarnings[0] ?? null,
      importedAt: row.importedAt ? row.importedAt.toISOString() : null,
    };
  }

  private async loadCanonicalMatches(
    conceptIds: string[],
    productIds: string[],
    catalogIds: string[]
  ): Promise<StagingDuplicateGovernanceRowDto["canonicalMatches"]> {
    const out: StagingDuplicateGovernanceRowDto["canonicalMatches"] = [];
    if (conceptIds.length) {
      const concepts = await this.prisma.medicationConcept.findMany({
        where: { id: { in: conceptIds.slice(0, 8) } },
        select: {
          id: true,
          code: true,
          genericName: true,
          displayName: true,
          isActive: true,
        },
      });
      for (const c of concepts) {
        out.push({
          kind: "concept",
          id: c.id,
          code: c.code,
          displayName: c.displayName || c.genericName,
          strengthDisplay: null,
          dosageForm: null,
          isActive: c.isActive,
          isOnFormulary: null,
          isEDFormulary: null,
          governanceStatus: null,
          legacyCatalogMedicationId: null,
        });
      }
    }
    if (productIds.length) {
      const products = await this.prisma.medicationProduct.findMany({
        where: { id: { in: productIds.slice(0, 8) } },
        select: {
          id: true,
          code: true,
          strengthDisplay: true,
          dosageForm: true,
          isActive: true,
          governanceStatus: true,
          legacyCatalogMedicationId: true,
          concept: { select: { genericName: true, displayName: true } },
          packages: {
            take: 1,
            select: {
              facilityFormularyItems: { take: 1, select: { isOnFormulary: true, isEDFormulary: true } },
            },
          },
        },
      });
      for (const p of products) {
        const ffi = p.packages[0]?.facilityFormularyItems[0];
        out.push({
          kind: "product",
          id: p.id,
          code: p.code,
          displayName: p.concept.displayName || p.concept.genericName,
          strengthDisplay: p.strengthDisplay,
          dosageForm: p.dosageForm,
          isActive: p.isActive,
          isOnFormulary: ffi?.isOnFormulary ?? null,
          isEDFormulary: ffi?.isEDFormulary ?? null,
          governanceStatus: p.governanceStatus,
          legacyCatalogMedicationId: p.legacyCatalogMedicationId,
        });
      }
    }
    if (catalogIds.length) {
      const catalog = await this.prisma.catalogMedication.findMany({
        where: { id: { in: catalogIds.slice(0, 8) } },
        select: {
          id: true,
          code: true,
          name: true,
          genericName: true,
          displayNameEn: true,
          strength: true,
          dosageForm: true,
          isActive: true,
        },
      });
      for (const cm of catalog) {
        out.push({
          kind: "catalog",
          id: cm.id,
          code: cm.code,
          displayName: cm.displayNameEn || cm.name,
          strengthDisplay: cm.strength,
          dosageForm: cm.dosageForm,
          isActive: cm.isActive,
          isOnFormulary: null,
          isEDFormulary: null,
          governanceStatus: null,
          legacyCatalogMedicationId: cm.id,
        });
      }
    }
    return out;
  }
}
