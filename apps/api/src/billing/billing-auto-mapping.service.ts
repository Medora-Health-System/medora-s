import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AuditAction,
  BillingReviewStatus,
  EncounterBillingFinalizationStatus,
  type BillingEvent,
  type Prisma,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { BillingService } from "./billing.service";
import { syncBillingCaptureItemFromLedgerRow } from "./billing-capture-sync-from-ledger.util";
import { resolveBillingAutoMappingProposal } from "./billing-auto-mapping-resolver.util";
import {
  buildBillingAutoMappingCandidateSignature,
  billingEventHasManualLedgerEdit,
  computeBillingAutoMappingCounts,
  groupBillingAutoMappingCandidates,
  ledgerLineLooksUnmapped,
  readBillingAutoMappingAppliedMetadata,
  resolveBillingAutoMappingDecision,
  validateBulkAutoMappingSelection,
  workspaceRowFromCandidate,
  type BillingAutoMappingCandidate,
  type BillingAutoMappingWorkspaceRow,
} from "@medora/shared";

const AUDIT_ENTITY = "BILLING_AUTO_MAPPING" as const;
const BULK_AUDIT_ENTITY = "AUTO_MAPPING_APPLIED" as const;
const MAX_APPLY_COUNT = 100;
const MAX_BULK_APPLY_COUNT = 500;

export type BillingAutoMappingPreviewResult = {
  encounterId: string;
  candidates: BillingAutoMappingCandidate[];
  applyCount: number;
  reviewCount: number;
  skipCount: number;
};

export type BillingAutoMappingApplyResult = {
  encounterId: string;
  appliedCount: number;
  skippedCount: number;
  staleCount: number;
  appliedLedgerLineIds: string[];
};

export type BillingAutoMappingWorkspaceResult = {
  counts: {
    applyReady: number;
    reviewRequired: number;
    skipped: number;
    mapped: number;
    total: number;
  };
  rows: BillingAutoMappingWorkspaceRow[];
};

export type BillingAutoMappingBulkApplyResult = {
  requested: number;
  applied: number;
  skipped: number;
  failed: number;
  appliedLedgerRowIds: string[];
};

@Injectable()
export class BillingAutoMappingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly billingService: BillingService
  ) {}

  async previewAutoMappingsForEncounter(
    facilityId: string,
    encounterId: string
  ): Promise<BillingAutoMappingPreviewResult> {
    await this.assertEncounterAccessible(facilityId, encounterId);
    const candidates = await this.buildCandidatesForEncounter(facilityId, encounterId);
    const grouped = groupBillingAutoMappingCandidates(candidates);
    return {
      encounterId,
      candidates,
      applyCount: grouped.apply.length,
      reviewCount: grouped.review.length,
      skipCount: grouped.skip.length,
    };
  }

  async getAutoMappingWorkspace(
    facilityId: string,
    filters?: { limit?: number; queue?: string }
  ): Promise<BillingAutoMappingWorkspaceResult> {
    const limit = Math.min(Math.max(filters?.limit ?? 500, 1), 2000);
    const rows = await this.prisma.billingEvent.findMany({
      where: {
        facilityId,
        OR: [
          { code: { equals: "UNMAPPED", mode: "insensitive" } },
          { procedureCode: { equals: "UNMAPPED", mode: "insensitive" } },
          { hcpcsCode: { equals: "UNMAPPED", mode: "insensitive" } },
          {
            metadata: {
              path: ["autoMappingApplied"],
              not: { equals: null },
            },
          },
        ],
      },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true, globalMrn: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    const doNotBillByEncounter = new Map<string, Set<string>>();
    const finalizedByEncounter = new Map<string, boolean>();
    const workspaceRows: BillingAutoMappingWorkspaceRow[] = [];

    for (const row of rows) {
      const appliedMeta = readBillingAutoMappingAppliedMetadata(row.metadata);
      if (appliedMeta) {
        const patientName = `${row.patient.firstName} ${row.patient.lastName}`.trim();
        workspaceRows.push(
          workspaceRowFromCandidate(
            {
              ledgerLineId: row.id,
              candidateType: appliedMeta.candidateType ?? "UNKNOWN",
              sourceLabel: row.descriptionSnapshot?.trim() || row.sourceModule,
              normalizedKey: "",
              currentCode: appliedMeta.previousCode ?? null,
              proposedCode: appliedMeta.newCode ?? row.code ?? "",
              proposedCodeType: "CPT",
              proposedBillingSide: row.billingSide,
              confidence: appliedMeta.confidence ?? "HIGH",
              decision: "APPLY",
              reason: "Auto-mapping applied",
              warnings: [],
              candidateSignature: "",
            },
            {
              encounterId: row.encounterId,
              patientName,
              patientMrn: row.patient.mrn ?? row.patient.globalMrn ?? null,
              manuallyEdited: billingEventHasManualLedgerEdit(row.metadata),
              doNotBill: false,
              metadata: row.metadata,
            }
          )
        );
        continue;
      }

      let doNotBillIds = doNotBillByEncounter.get(row.encounterId);
      if (!doNotBillIds) {
        doNotBillIds = await this.billingService.getDoNotBillBillingEventIdsForEncounter(
          facilityId,
          row.encounterId
        );
        doNotBillByEncounter.set(row.encounterId, doNotBillIds);
      }

      let isFinalized = finalizedByEncounter.get(row.encounterId);
      if (isFinalized == null) {
        const enc = await this.prisma.encounter.findFirst({
          where: { id: row.encounterId, facilityId },
          select: { billingFinalizationStatus: true },
        });
        isFinalized = enc?.billingFinalizationStatus === EncounterBillingFinalizationStatus.FINALIZED;
        finalizedByEncounter.set(row.encounterId, isFinalized);
      }

      const candidate = await this.buildCandidateForRow(facilityId, row.encounterId, row, {
        doNotBillIds,
        isFinalized,
      });
      if (!candidate) continue;

      const patientName = `${row.patient.firstName} ${row.patient.lastName}`.trim();
      const wsRow = workspaceRowFromCandidate(candidate, {
        encounterId: row.encounterId,
        patientName,
        patientMrn: row.patient.mrn ?? row.patient.globalMrn ?? null,
        manuallyEdited: billingEventHasManualLedgerEdit(row.metadata),
        doNotBill: doNotBillIds.has(row.id),
        metadata: row.metadata,
        ambiguousCatalogMatch: candidate.warnings.some((w) =>
          w.toLowerCase().includes("alternate lookup")
        ),
      });
      workspaceRows.push(wsRow);
    }

    const queueFilter = filters?.queue?.trim().toUpperCase();
    const filtered =
      queueFilter && ["APPLY_READY", "REVIEW_REQUIRED", "SKIPPED", "MAPPED"].includes(queueFilter)
        ? workspaceRows.filter((r) => r.queue === queueFilter)
        : workspaceRows;

    return {
      counts: computeBillingAutoMappingCounts(workspaceRows),
      rows: filtered,
    };
  }

  async bulkApplyAutoMappings(
    facilityId: string,
    ledgerRowIds: string[],
    userId?: string
  ): Promise<BillingAutoMappingBulkApplyResult> {
    if (!ledgerRowIds.length) {
      throw new BadRequestException("ledgerRowIds is required");
    }
    if (ledgerRowIds.length > MAX_BULK_APPLY_COUNT) {
      throw new BadRequestException(`Maximum ${MAX_BULK_APPLY_COUNT} mappings per bulk apply request`);
    }

    const workspace = await this.getAutoMappingWorkspace(facilityId, { limit: 2000 });
    const selectionRows = workspace.rows.map((row) => ({
      ledgerRowId: row.ledgerRowId,
      queue: row.queue,
      confidence: row.confidence,
      manuallyEdited: row.manuallyEdited,
      doNotBill: row.doNotBill,
      ambiguousCatalogMatch: row.ambiguousCatalogMatch ?? false,
    }));
    const validation = validateBulkAutoMappingSelection(selectionRows, ledgerRowIds);

    let applied = 0;
    let skipped = validation.invalidIds.length;
    let failed = 0;
    const appliedLedgerRowIds: string[] = [];

    for (const ledgerRowId of validation.validIds) {
      const row = await this.prisma.billingEvent.findFirst({
        where: { id: ledgerRowId, facilityId },
      });
      if (!row) {
        failed += 1;
        continue;
      }

      const enc = await this.prisma.encounter.findFirst({
        where: { id: row.encounterId, facilityId },
        select: { billingFinalizationStatus: true },
      });
      if (enc?.billingFinalizationStatus === EncounterBillingFinalizationStatus.FINALIZED) {
        skipped += 1;
        continue;
      }

      const result = await this.applySingleMapping(
        facilityId,
        row.encounterId,
        ledgerRowId,
        userId,
        "BULK_AUTO_MAPPING"
      );
      if (result === "applied") {
        applied += 1;
        appliedLedgerRowIds.push(ledgerRowId);
      } else if (result === "stale") {
        skipped += 1;
      } else {
        failed += 1;
      }
    }

    return {
      requested: ledgerRowIds.length,
      applied,
      skipped,
      failed,
      appliedLedgerRowIds,
    };
  }

  async previewAutoMappingsForFacility(
    facilityId: string,
    filters?: { limit?: number }
  ): Promise<{ rows: BillingAutoMappingPreviewResult[] }> {
    const limit = Math.min(Math.max(filters?.limit ?? 25, 1), 100);
    const encounters = await this.prisma.encounter.findMany({
      where: { facilityId, status: "CLOSED" },
      select: { id: true },
      orderBy: { dischargedAt: "desc" },
      take: limit,
    });
    const rows: BillingAutoMappingPreviewResult[] = [];
    for (const enc of encounters) {
      const preview = await this.previewAutoMappingsForEncounter(facilityId, enc.id);
      if (preview.candidates.length > 0) rows.push(preview);
    }
    return { rows };
  }

  async applyAutoMappingsForEncounter(
    facilityId: string,
    encounterId: string,
    candidateIds: string[],
    userId?: string
  ): Promise<BillingAutoMappingApplyResult> {
    if (!candidateIds.length) {
      throw new BadRequestException("candidateIds is required");
    }
    if (candidateIds.length > MAX_APPLY_COUNT) {
      throw new BadRequestException(`Maximum ${MAX_APPLY_COUNT} mappings per apply request`);
    }

    await this.assertEncounterAccessible(facilityId, encounterId);
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: { billingFinalizationStatus: true },
    });
    if (enc?.billingFinalizationStatus === EncounterBillingFinalizationStatus.FINALIZED) {
      throw new BadRequestException("Encounter billing is finalized. Reopen billing before applying mappings.");
    }

    const preview = await this.previewAutoMappingsForEncounter(facilityId, encounterId);
    const byId = new Map(preview.candidates.map((c) => [c.ledgerLineId, c]));

    let appliedCount = 0;
    let skippedCount = 0;
    let staleCount = 0;
    const appliedLedgerLineIds: string[] = [];

    for (const candidateId of candidateIds) {
      const candidate = byId.get(candidateId);
      if (!candidate) {
        staleCount += 1;
        continue;
      }
      if (candidate.decision !== "APPLY") {
        skippedCount += 1;
        continue;
      }

      const result = await this.applySingleMapping(
        facilityId,
        encounterId,
        candidateId,
        userId,
        "AUTO_MAPPING_USER_APPLIED",
        candidate
      );
      if (result === "applied") {
        appliedCount += 1;
        appliedLedgerLineIds.push(candidateId);
      } else if (result === "stale") {
        staleCount += 1;
      } else {
        skippedCount += 1;
      }
    }

    return {
      encounterId,
      appliedCount,
      skippedCount,
      staleCount,
      appliedLedgerLineIds,
    };
  }

  private async applySingleMapping(
    facilityId: string,
    encounterId: string,
    ledgerLineId: string,
    userId: string | undefined,
    source: "AUTO_MAPPING_USER_APPLIED" | "BULK_AUTO_MAPPING",
    expectedCandidate?: BillingAutoMappingCandidate
  ): Promise<"applied" | "stale" | "skipped"> {
    const row = await this.prisma.billingEvent.findFirst({
      where: { id: ledgerLineId, facilityId, encounterId },
    });
    if (!row) return "stale";

    const fresh = await this.buildCandidateForRow(facilityId, encounterId, row);
    if (!fresh || fresh.decision !== "APPLY") return "stale";
    if (expectedCandidate) {
      if (
        fresh.candidateSignature !== expectedCandidate.candidateSignature ||
        fresh.decision !== "APPLY"
      ) {
        return "stale";
      }
    }

    const proposal = await resolveBillingAutoMappingProposal(this.prisma, row);
    if (!proposal) return "stale";

    const prevMeta =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {};

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.billingEvent.update({
        where: { id: row.id },
        data: {
          procedureCode: proposal.procedureCode,
          hcpcsCode: proposal.hcpcsCode,
          code: proposal.code,
          codeType: proposal.codeType,
          billingSide: proposal.billingSide,
          descriptionSnapshot: proposal.descriptionSnapshot,
          metadata: {
            ...prevMeta,
            autoMappingApplied: {
              at: new Date().toISOString(),
              source,
              userId: userId ?? null,
              candidateType: fresh.candidateType,
              confidence: fresh.confidence,
              previousCode: row.code,
              previousProcedureCode: row.procedureCode,
              previousHcpcsCode: row.hcpcsCode,
              previousBillingSide: row.billingSide,
              previousCodeType: row.codeType,
              newCode: proposal.code,
            },
          } as Prisma.InputJsonValue,
        },
      });
      await syncBillingCaptureItemFromLedgerRow(tx, updated);
    });

    const auditEntity = source === "BULK_AUTO_MAPPING" ? BULK_AUDIT_ENTITY : AUDIT_ENTITY;
    await this.audit.log(AuditAction.UPDATE, auditEntity, {
      userId,
      facilityId,
      patientId: row.patientId,
      encounterId: row.encounterId,
      entityId: row.id,
      metadata: {
        ledgerRowId: row.id,
        encounterId: row.encounterId,
        code: proposal.code,
        confidence: fresh.confidence,
        source,
        previousCode: row.code,
        newCode: proposal.code,
        previousCodeType: row.codeType,
        newCodeType: proposal.codeType,
        previousBillingSide: row.billingSide,
        newBillingSide: proposal.billingSide,
        candidateType: fresh.candidateType,
      },
    });

    return "applied";
  }

  private async assertEncounterAccessible(facilityId: string, encounterId: string): Promise<void> {
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: { id: true },
    });
    if (!enc) throw new NotFoundException("Encounter not found");
  }

  private async buildCandidatesForEncounter(
    facilityId: string,
    encounterId: string
  ): Promise<BillingAutoMappingCandidate[]> {
    const [rows, doNotBillIds, enc] = await Promise.all([
      this.prisma.billingEvent.findMany({
        where: { facilityId, encounterId },
        orderBy: { createdAt: "asc" },
      }),
      this.billingService.getDoNotBillBillingEventIdsForEncounter(facilityId, encounterId),
      this.prisma.encounter.findFirst({
        where: { id: encounterId, facilityId },
        select: { billingFinalizationStatus: true },
      }),
    ]);

    const isFinalized = enc?.billingFinalizationStatus === EncounterBillingFinalizationStatus.FINALIZED;
    const candidates: BillingAutoMappingCandidate[] = [];
    for (const row of rows) {
      const candidate = await this.buildCandidateForRow(facilityId, encounterId, row, {
        doNotBillIds,
        isFinalized,
      });
      if (candidate) candidates.push(candidate);
    }
    return candidates;
  }

  private async buildCandidateForRow(
    facilityId: string,
    encounterId: string,
    row: BillingEvent,
    ctx?: { doNotBillIds: Set<string>; isFinalized: boolean }
  ): Promise<BillingAutoMappingCandidate | null> {
    const doNotBillIds =
      ctx?.doNotBillIds ??
      (await this.billingService.getDoNotBillBillingEventIdsForEncounter(facilityId, encounterId));
    let isFinalized = ctx?.isFinalized;
    if (isFinalized == null) {
      const enc = await this.prisma.encounter.findFirst({
        where: { id: encounterId, facilityId },
        select: { billingFinalizationStatus: true },
      });
      isFinalized = enc?.billingFinalizationStatus === EncounterBillingFinalizationStatus.FINALIZED;
    }

    const proposal = await resolveBillingAutoMappingProposal(this.prisma, row);
    const isUnmapped = ledgerLineLooksUnmapped(row);
    const isManuallyEdited = billingEventHasManualLedgerEdit(row.metadata);
    const isDoNotBill = doNotBillIds.has(row.id);
    const isVoidedOrSkipped =
      row.reviewStatus === BillingReviewStatus.VOIDED || row.reviewStatus === BillingReviewStatus.SKIPPED;

    if (!proposal && isUnmapped) {
      const decision = resolveBillingAutoMappingDecision({
        confidence: "LOW",
        candidateType: "UNKNOWN",
        isUnmapped,
        isManuallyEdited,
        isDoNotBill,
        isVoidedOrSkipped,
        isFinalizedEncounter: isFinalized,
        hasCatalogMatch: false,
      });
      if (decision === "SKIP") {
        return {
          ledgerLineId: row.id,
          candidateType: "UNKNOWN",
          sourceLabel: row.descriptionSnapshot?.trim() || row.sourceModule,
          normalizedKey: normalizeFallbackKey(row),
          currentCode: row.code,
          proposedCode: "",
          proposedCodeType: "CPT",
          proposedBillingSide: row.billingSide,
          confidence: "LOW",
          decision: "SKIP",
          reason: "No deterministic catalog match",
          warnings: [],
          candidateSignature: buildBillingAutoMappingCandidateSignature({
            ledgerLineId: row.id,
            currentCode: row.code,
            proposedCode: "",
            normalizedKey: normalizeFallbackKey(row),
            proposedCodeType: "CPT",
          }),
        };
      }
    }

    if (!proposal) return null;

    const proposedCodeType = proposal.codeType === "HCPCS" ? "HCPCS" : "CPT";
    const warnings: string[] = [];
    if (proposal.ambiguousCatalogMatch) warnings.push("Catalog match used alternate lookup key");
    if (proposal.medicationAdministrationRouteMissing) {
      warnings.push("Missing optional administration route for therapeutic CPT");
    }

    const decision = resolveBillingAutoMappingDecision({
      confidence: proposal.confidence,
      candidateType: proposal.candidateType,
      isUnmapped,
      isManuallyEdited,
      isDoNotBill,
      isVoidedOrSkipped,
      isFinalizedEncounter: isFinalized,
      medicationAdministrationRouteMissing: proposal.medicationAdministrationRouteMissing,
      ambiguousCatalogMatch: proposal.ambiguousCatalogMatch,
      hasCatalogMatch: true,
    });

    const reason =
      decision === "APPLY"
        ? "Deterministic high-confidence catalog match"
        : decision === "REVIEW"
          ? warnings[0] ?? "Requires billing review before apply"
          : isManuallyEdited
            ? "Manually edited ledger line"
            : isDoNotBill
              ? "Marked DO NOT BILL"
              : "Not eligible for auto-apply";

    return {
      ledgerLineId: row.id,
      candidateType: proposal.candidateType,
      sourceLabel: proposal.sourceLabel,
      normalizedKey: proposal.normalizedKey,
      currentCode: row.code,
      proposedCode: proposal.code,
      proposedCodeType,
      proposedBillingSide: proposal.billingSide,
      proposedProcedureCode: proposal.procedureCode,
      proposedHcpcsCode: proposal.hcpcsCode,
      confidence: proposal.confidence,
      decision,
      reason,
      warnings,
      candidateSignature: buildBillingAutoMappingCandidateSignature({
        ledgerLineId: row.id,
        currentCode: row.code,
        proposedCode: proposal.code,
        normalizedKey: proposal.normalizedKey,
        proposedCodeType,
      }),
    };
  }
}

function normalizeFallbackKey(row: BillingEvent): string {
  return `${row.sourceModule}:${row.sourceRecordId}`.toLowerCase();
}
