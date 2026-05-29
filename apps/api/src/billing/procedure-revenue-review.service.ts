import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AuditAction,
  BillingReviewDecisionStatus,
  BillingReviewStatus,
  BillingSourceModule,
} from "@prisma/client";
import {
  appendProcedureRevenueReviewDecision,
  classifyProcedureBillingSideReview,
  deriveInitialProcedureRevenueReviewStatus,
  isEnterpriseProcedureBillableReviewMetadata,
  mapProcedureRevenueDecisionToReviewStatus,
  parseEnterpriseProcedureBillableReviewEventSummary,
  recommendProcedureRevenueReviewDecision,
  resolveProcedureRevenueReviewStatus,
  type EnterpriseProcedureBillableReviewMetadataWithGovernance,
  type ProcedureBillingSideReview,
  type ProcedureRevenueReviewDecisionAction,
  type ProcedureRevenueReviewQueueRow,
  type ProcedureRevenueReviewReasonCode,
  type ProcedureRevenueReviewStatus,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";

const MEDPROC6_EVENT_TYPE = "PROCEDURE_ORDER_REVIEW";

const DECISION_ACTIONS = new Set<ProcedureRevenueReviewDecisionAction>([
  "APPROVE_FOR_EXPORT_REVIEW",
  "HOLD_FOR_DOCUMENTATION",
  "HOLD_FOR_CODER_REVIEW",
  "HOLD_FOR_CHARGE_MASTER",
  "REJECT_NOT_BILLABLE",
  "REQUEST_PROVIDER_CLARIFICATION",
  "MARK_DUPLICATE_REVIEW",
]);

const REASON_CODES = new Set<ProcedureRevenueReviewReasonCode>([
  "DOCUMENTATION_MISSING",
  "CHARGE_MASTER_MISSING",
  "CODER_REVIEW_REQUIRED",
  "DUPLICATE_PROCEDURE_EVENT",
  "NOT_BILLABLE_PER_POLICY",
  "FACILITY_REVIEW_REQUIRED",
  "PROFESSIONAL_REVIEW_REQUIRED",
  "OTHER_REVIEW_REQUIRED",
]);

export type ProcedureRevenueReviewQueueFilters = {
  facilityId: string;
  reviewStatus?: ProcedureRevenueReviewStatus;
  mappingStatus?: string;
  documentationMissing?: boolean;
  billingSideReview?: ProcedureBillingSideReview;
  enterpriseProcedureId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
};

function mapToBillingReviewDecisionStatus(
  action: ProcedureRevenueReviewDecisionAction
): BillingReviewDecisionStatus {
  if (action === "APPROVE_FOR_EXPORT_REVIEW") return BillingReviewDecisionStatus.APPROVED;
  if (action === "REJECT_NOT_BILLABLE") return BillingReviewDecisionStatus.DO_NOT_BILL;
  return BillingReviewDecisionStatus.NEEDS_INFO;
}

function mapToLedgerReviewStatus(
  action: ProcedureRevenueReviewDecisionAction
): BillingReviewStatus {
  if (action === "APPROVE_FOR_EXPORT_REVIEW") return BillingReviewStatus.REVIEWED;
  if (action === "REJECT_NOT_BILLABLE") return BillingReviewStatus.SKIPPED;
  return BillingReviewStatus.CAPTURED;
}

@Injectable()
export class ProcedureRevenueReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async getQueue(filters: ProcedureRevenueReviewQueueFilters): Promise<{
    rows: ProcedureRevenueReviewQueueRow[];
    previewOnly: true;
  }> {
    const limit = Math.min(Math.max(filters.limit ?? 100, 1), 250);
    const where: Record<string, unknown> = {
      facilityId: filters.facilityId,
      sourceModule: BillingSourceModule.PROCEDURE,
      eventType: MEDPROC6_EVENT_TYPE,
      reviewStatus: { not: BillingReviewStatus.VOIDED },
    };
    if (filters.dateFrom || filters.dateTo) {
      where.serviceDate = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {}),
      };
    }

    const events = await this.prisma.billingEvent.findMany({
      where,
      select: {
        id: true,
        sourceRecordId: true,
        encounterId: true,
        metadata: true,
        reviewStatus: true,
        createdAt: true,
        serviceDate: true,
        encounter: {
          select: {
            billingClassification: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit * 3,
    });

    const orderItemIds = events.map((e) => e.sourceRecordId);
    const orderItems = orderItemIds.length
      ? await this.prisma.orderItem.findMany({
          where: { id: { in: orderItemIds } },
          select: { id: true, enterpriseProcedureId: true },
        })
      : [];
    const orderItemExists = new Set(orderItems.map((o) => o.id));

    const enterpriseIds = events
      .flatMap((e) => {
        const m = e.metadata;
        if (!isEnterpriseProcedureBillableReviewMetadata(m)) return [];
        return [m.enterpriseProcedureId];
      })
      .filter(Boolean);
    const duplicateCounts = new Map<string, number>();
    for (const e of events) {
      const m = e.metadata;
      if (!isEnterpriseProcedureBillableReviewMetadata(m)) continue;
      const key = `${e.encounterId}:${m.enterpriseProcedureId}`;
      duplicateCounts.set(key, (duplicateCounts.get(key) ?? 0) + 1);
    }

    const rows: ProcedureRevenueReviewQueueRow[] = [];
    for (const event of events) {
      if (!isEnterpriseProcedureBillableReviewMetadata(event.metadata)) continue;
      const meta = event.metadata as EnterpriseProcedureBillableReviewMetadataWithGovernance;
      if (filters.enterpriseProcedureId && meta.enterpriseProcedureId !== filters.enterpriseProcedureId) {
        continue;
      }
      if (filters.mappingStatus && meta.mappingStatus !== filters.mappingStatus) continue;

      const revenueReviewStatus = resolveProcedureRevenueReviewStatus(
        meta,
        event.reviewStatus
      );
      if (filters.reviewStatus && revenueReviewStatus !== filters.reviewStatus) continue;

      const documentationLinked = meta.documentationLinked;
      if (filters.documentationMissing === true && documentationLinked) continue;
      if (filters.documentationMissing === false && !documentationLinked) continue;

      const procedureBillingSideReview =
        meta.procedureBillingSideReview ??
        classifyProcedureBillingSideReview({
          enterpriseProcedureId: meta.enterpriseProcedureId,
          billingClassification: event.encounter.billingClassification,
        });
      if (filters.billingSideReview && procedureBillingSideReview !== filters.billingSideReview) {
        continue;
      }

      const orphanWarning = !orderItemExists.has(event.sourceRecordId);
      const dupKey = `${event.encounterId}:${meta.enterpriseProcedureId}`;
      const duplicateReviewWarning = (duplicateCounts.get(dupKey) ?? 0) > 1;

      const summary = parseEnterpriseProcedureBillableReviewEventSummary({
        billingEventId: event.id,
        orderItemId: event.sourceRecordId,
        metadata: meta,
        reviewStatus: event.reviewStatus,
        createdAt: event.createdAt.toISOString(),
      });
      if (!summary) continue;

      rows.push({
        billingEventId: event.id,
        orderItemId: event.sourceRecordId,
        encounterId: event.encounterId,
        enterpriseProcedureId: meta.enterpriseProcedureId,
        displayNameEn: summary.displayNameEn,
        displayNameFr: summary.displayNameFr,
        encounterDate: (event.serviceDate ?? event.encounter.createdAt).toISOString(),
        billingClassification: event.encounter.billingClassification,
        mappingStatus: meta.mappingStatus,
        documentationLinked,
        facilityChargeMasterLinked: meta.facilityChargeMasterLinked,
        requiresDocumentationReview: meta.requiresDocumentationReview,
        requiresCoderReview: meta.requiresCoderReview,
        revenueReviewStatus,
        procedureBillingSideReview,
        reviewWarnings: [
          ...summary.reviewWarnings,
          ...(orphanWarning ? ["ORPHAN_ORDER_ITEM"] : []),
          ...(duplicateReviewWarning ? ["DUPLICATE_REVIEW"] : []),
        ],
        ledgerReviewStatus: event.reviewStatus,
        recommendedDecision: recommendProcedureRevenueReviewDecision(meta),
        orphanWarning,
        duplicateReviewWarning,
        previewOnly: true,
      });
      if (rows.length >= limit) break;
    }

    return { rows, previewOnly: true as const };
  }

  async recordDecision(
    facilityId: string,
    billingEventId: string,
    body: Record<string, unknown>,
    reviewerId: string | undefined
  ) {
    if (!reviewerId) throw new ForbiddenException("Authentification requise");

    const decisionRaw = String(body.decision ?? "").trim();
    if (!DECISION_ACTIONS.has(decisionRaw as ProcedureRevenueReviewDecisionAction)) {
      throw new BadRequestException("Décision invalide");
    }
    const decision = decisionRaw as ProcedureRevenueReviewDecisionAction;

    const reasonCodeRaw = String(body.reasonCode ?? "").trim();
    if (!REASON_CODES.has(reasonCodeRaw as ProcedureRevenueReviewReasonCode)) {
      throw new BadRequestException("Code motif requis");
    }
    const reasonCode = reasonCodeRaw as ProcedureRevenueReviewReasonCode;

    const note = typeof body.note === "string" ? body.note.trim().slice(0, 512) : "";

    const billingEvent = await this.prisma.billingEvent.findFirst({
      where: { id: billingEventId, facilityId },
      select: {
        id: true,
        encounterId: true,
        patientId: true,
        sourceRecordId: true,
        reviewStatus: true,
        metadata: true,
        eventType: true,
        sourceModule: true,
      },
    });
    if (!billingEvent) throw new NotFoundException("Événement facturation introuvable");
    if (
      billingEvent.sourceModule !== BillingSourceModule.PROCEDURE ||
      billingEvent.eventType !== MEDPROC6_EVENT_TYPE ||
      !isEnterpriseProcedureBillableReviewMetadata(billingEvent.metadata)
    ) {
      throw new BadRequestException("Événement non éligible à la revue procédure entreprise");
    }

    const meta = billingEvent.metadata as EnterpriseProcedureBillableReviewMetadataWithGovernance;
    const reviewStatusBefore = resolveProcedureRevenueReviewStatus(
      meta,
      billingEvent.reviewStatus
    );
    const reviewStatusAfter = mapProcedureRevenueDecisionToReviewStatus(decision);
    const ledgerStatus = mapToLedgerReviewStatus(decision);

    const orderItem = await this.prisma.orderItem.findFirst({
      where: { id: billingEvent.sourceRecordId },
      select: { id: true, order: { select: { id: true } } },
    });

    const updatedMetadata = appendProcedureRevenueReviewDecision(
      {
        ...meta,
        medproc7: true,
        procedureBillingSideReview:
          meta.procedureBillingSideReview ??
          classifyProcedureBillingSideReview({
            enterpriseProcedureId: meta.enterpriseProcedureId,
            billingClassification: null,
          }),
        orphanWarning: !orderItem,
      },
      {
        decision,
        reasonCode,
        decidedAt: new Date().toISOString(),
        decidedByUserId: reviewerId,
        reviewStatusBefore,
        reviewStatusAfter,
        ...(note ? { note } : {}),
      }
    );

    const billingDecisionStatus = mapToBillingReviewDecisionStatus(decision);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedEvent = await tx.billingEvent.update({
        where: { id: billingEventId },
        data: {
          reviewStatus: ledgerStatus,
          metadata: updatedMetadata as object,
        },
        select: { id: true, reviewStatus: true, metadata: true },
      });

      let reviewDecisionId: string | null = null;
      if (orderItem) {
        const reviewedAt = new Date();
        const saved = await tx.billingReviewDecision.upsert({
          where: {
            facilityId_orderItemId: { facilityId, orderItemId: orderItem.id },
          },
          create: {
            facilityId,
            encounterId: billingEvent.encounterId,
            patientId: billingEvent.patientId,
            orderItemId: orderItem.id,
            billingEventId,
            decision: billingDecisionStatus,
            notes: note || null,
            reviewerId,
            reviewedAt,
          },
          update: {
            billingEventId,
            decision: billingDecisionStatus,
            notes: note || null,
            reviewerId,
            reviewedAt,
          },
        });
        reviewDecisionId = saved.id;
      }

      await this.audit.log(AuditAction.UPDATE, "PROCEDURE_REVENUE_REVIEW_DECISION", {
        tx,
        userId: reviewerId,
        facilityId,
        patientId: billingEvent.patientId,
        encounterId: billingEvent.encounterId,
        entityId: billingEventId,
        metadata: {
          billingEventId,
          encounterId: billingEvent.encounterId,
          enterpriseProcedureId: meta.enterpriseProcedureId,
          decision,
          reasonCode,
          reviewStatusBefore,
          reviewStatusAfter,
          ledgerReviewStatus: ledgerStatus,
          billingReviewDecisionId: reviewDecisionId,
        },
        critical: true,
      });

      return updatedEvent;
    });

    return {
      previewOnly: true as const,
      billingEventId: result.id,
      reviewStatus: result.reviewStatus,
      revenueReviewStatus: reviewStatusAfter,
      decisionHistory: readDecisionHistoryFromMetadata(result.metadata),
    };
  }
}

function readDecisionHistoryFromMetadata(metadata: unknown) {
  if (!isEnterpriseProcedureBillableReviewMetadata(metadata)) return [];
  const ext = metadata as EnterpriseProcedureBillableReviewMetadataWithGovernance;
  return ext.decisionHistory ?? [];
}
