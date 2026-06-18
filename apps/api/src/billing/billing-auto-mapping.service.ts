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
  groupBillingAutoMappingCandidates,
  ledgerLineLooksUnmapped,
  resolveBillingAutoMappingDecision,
  type BillingAutoMappingCandidate,
} from "@medora/shared";

const AUDIT_ENTITY = "BILLING_AUTO_MAPPING" as const;
const MAX_APPLY_COUNT = 100;

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

      const row = await this.prisma.billingEvent.findFirst({
        where: { id: candidateId, facilityId, encounterId },
      });
      if (!row) {
        staleCount += 1;
        continue;
      }

      const fresh = await this.buildCandidateForRow(facilityId, encounterId, row);
      if (!fresh || fresh.candidateSignature !== candidate.candidateSignature || fresh.decision !== "APPLY") {
        staleCount += 1;
        continue;
      }

      const proposal = await resolveBillingAutoMappingProposal(this.prisma, row);
      if (!proposal) {
        staleCount += 1;
        continue;
      }

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
                source: "AUTO_MAPPING_USER_APPLIED",
                candidateType: candidate.candidateType,
                confidence: candidate.confidence,
                previousCode: row.code,
                previousProcedureCode: row.procedureCode,
                previousHcpcsCode: row.hcpcsCode,
                previousBillingSide: row.billingSide,
                previousCodeType: row.codeType,
              },
            } as Prisma.InputJsonValue,
          },
        });
        await syncBillingCaptureItemFromLedgerRow(tx, updated);
      });

      await this.audit.log(AuditAction.UPDATE, AUDIT_ENTITY, {
        userId,
        facilityId,
        patientId: row.patientId,
        encounterId: row.encounterId,
        entityId: row.id,
        metadata: {
          ledgerLineId: row.id,
          encounterId: row.encounterId,
          previousCode: row.code,
          newCode: proposal.code,
          previousCodeType: row.codeType,
          newCodeType: proposal.codeType,
          previousBillingSide: row.billingSide,
          newBillingSide: proposal.billingSide,
          candidateType: candidate.candidateType,
          confidence: candidate.confidence,
          source: "AUTO_MAPPING_USER_APPLIED",
        },
      });

      appliedCount += 1;
      appliedLedgerLineIds.push(row.id);
    }

    return {
      encounterId,
      appliedCount,
      skippedCount,
      staleCount,
      appliedLedgerLineIds,
    };
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
