import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import {
  AuditAction,
  BillingReviewDecisionStatus,
  EncounterClinicalEventType,
  EncounterStatus,
} from "@prisma/client";
import {
  BILLING_CAPTURE_VERSION,
  DOCUMENTED_PROCEDURE_CPT_PENDING_EVIDENCE,
  DOCUMENTED_PROCEDURE_REVIEW_REASON,
  buildBillingReadinessExplainerSummary,
  computeClaimPackageSummaries,
  displayNameFrForDocumentedProcedureType,
  isProviderProcedureDocumentationForBilling,
  medoraCodeForDocumentedProcedureType,
  readBillingCaptureV1,
  validateManualBillingReviewBulkApproval,
  billingLedgerRowMissingBillableCodeBlocksReadiness,
  type BillingCaptureItem,
  type BillingReadinessExplainerSummary,
  type InfusionBillingReviewDecision,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { throwEncounterConcurrentModification } from "../encounters/encounter-concurrency.util";
import { upsertBillingEventFromCaptureItem } from "./billing-ledger.sync";
import { evaluateEncounterBillingReadinessFromData } from "./billing-encounter-readiness.util";
import { evaluateClaimIdentityGaps } from "./claim-billing-identity.util";
import type { PatchInfusionBillingReviewBody } from "./dto/infusion-billing-review.dto";
import type {
  BillingAutoBillDecisionDto,
  BillingExportRowDto,
  BillingManualReviewGateDto,
  BillingManualReviewGateItemDto,
  BillingManualReviewRowDto,
  BillingManualReviewBulkDecisionResponseDto,
  BillingManualReviewBulkDecisionResultItemDto,
  BillingReviewAnchorType,
  BillingReviewDecisionAuditEntryDto,
  BillingReviewDecisionDto,
  BillingReadinessCategory,
  BillingReadinessItemDto,
  BillingReadinessStatus,
} from "./dto/billing-readiness.dto";

export const MANUAL_BILLING_REVIEW_UNRESOLVED_MESSAGE = "Manual billing review unresolved for this encounter.";

const BILLING_REVIEW_DECISION_AUDIT_ENTITY = "BILLING_REVIEW_DECISION";

function infusionBillingCaptureItemHasEvidence(item: BillingCaptureItem): boolean {
  if (item.infusionStartedAt?.trim() && item.infusionStoppedAt?.trim()) return true;
  if (
    item.infusionDurationMinutes != null &&
    Number.isFinite(item.infusionDurationMinutes) &&
    item.infusionDurationMinutes >= 0
  ) {
    return true;
  }
  return false;
}

function buildInfusionBillingReviewDecision(
  item: BillingCaptureItem,
  body: PatchInfusionBillingReviewBody,
  reviewerId: string
): InfusionBillingReviewDecision {
  const sug = item.infusionBillingSuggestion!;
  const snap: NonNullable<InfusionBillingReviewDecision["suggestedUnitsSnapshot"]> = {
    initialHour: sug.suggestedUnits.initialHour ?? null,
    additionalHoursOrIntervals: sug.suggestedUnits.additionalHoursOrIntervals ?? null,
  };
  const reviewedAt = new Date().toISOString();
  const note = body.reviewerNote;

  if (body.status === "REJECTED") {
    return {
      status: "REJECTED",
      suggestedUnitsSnapshot: snap,
      reviewerNote: note,
      reviewedByUserId: reviewerId,
      reviewedAt,
    };
  }

  if (body.status === "APPROVED") {
    const billingClassFinal = body.billingClassFinal ?? sug.billingClass;
    const initialHour =
      body.approvedInitialHour !== undefined ? body.approvedInitialHour : sug.suggestedUnits.initialHour;
    const additionalHoursOrIntervals =
      body.approvedAdditionalHoursOrIntervals !== undefined
        ? body.approvedAdditionalHoursOrIntervals
        : sug.suggestedUnits.additionalHoursOrIntervals;
    const approvedUnits: NonNullable<InfusionBillingReviewDecision["approvedUnits"]> = {};
    if (initialHour !== undefined && initialHour !== null) approvedUnits.initialHour = initialHour;
    if (additionalHoursOrIntervals !== undefined && additionalHoursOrIntervals !== null) {
      approvedUnits.additionalHoursOrIntervals = additionalHoursOrIntervals;
    }
    return {
      status: "APPROVED",
      billingClassFinal,
      approvedUnits,
      suggestedUnitsSnapshot: snap,
      ...(note ? { reviewerNote: note } : {}),
      reviewedByUserId: reviewerId,
      reviewedAt,
    };
  }

  const billingClassFinal = body.billingClassFinal ?? sug.billingClass;
  const approvedUnits: NonNullable<InfusionBillingReviewDecision["approvedUnits"]> = {};
  if (body.approvedInitialHour !== undefined) approvedUnits.initialHour = body.approvedInitialHour;
  if (body.approvedAdditionalHoursOrIntervals !== undefined) {
    approvedUnits.additionalHoursOrIntervals = body.approvedAdditionalHoursOrIntervals;
  }
  return {
    status: "ADJUSTED",
    billingClassFinal,
    approvedUnits,
    suggestedUnitsSnapshot: snap,
    reviewerNote: note!,
    reviewedByUserId: reviewerId,
    reviewedAt,
  };
}

export type BillingReadinessClassifierInput = {
  category: BillingReadinessCategory;
  medoraCode: string | null;
  billingCodeDefault: string | null;
  officialLabBillingCodeMatched?: boolean;
};

export function getBillingReadinessStatus(
  item: BillingReadinessClassifierInput
): BillingReadinessStatus {
  if (item.category === "LAB") {
    return item.billingCodeDefault?.trim() && item.officialLabBillingCodeMatched
      ? "official_validated"
      : "missing";
  }

  if (item.category === "IMAGING") {
    return "pending_license";
  }

  if (item.category === "MEDICATION") {
    return "candidate_only";
  }

  return item.medoraCode?.trim() ? "pending_license" : "missing";
}

export function getAutoBillDecision(row: BillingExportRowDto): BillingAutoBillDecisionDto {
  const medoraCode = row.medoraCode?.trim() ?? "";

  if (row.reviewAnchorType === "PROCEDURE_DOCUMENTED") {
    return {
      orderItemId: row.orderItemId,
      medoraCode,
      category: "CARE",
      billingStatus: row.billingStatus,
      canAutoBill: false,
      requiredReview: true,
      reason: DOCUMENTED_PROCEDURE_REVIEW_REASON,
      displayName: row.displayName,
      evidenceSource: row.evidenceSource ?? DOCUMENTED_PROCEDURE_CPT_PENDING_EVIDENCE,
      reviewAnchorType: "PROCEDURE_DOCUMENTED",
    };
  }

  if (row.category === "LAB" && row.billingStatus === "official_validated" && row.billingCodeDefault?.trim()) {
    return {
      orderItemId: row.orderItemId,
      medoraCode,
      category: row.category,
      billingStatus: row.billingStatus,
      canAutoBill: true,
      requiredReview: false,
      reason: "Officially validated lab billing code is present.",
    };
  }

  if (row.category === "MEDICATION") {
    return {
      orderItemId: row.orderItemId,
      medoraCode,
      category: row.category,
      billingStatus: row.billingStatus,
      canAutoBill: false,
      requiredReview: true,
      reason: "Medication auto-billing is disabled until dose/unit conversion and payer policy are implemented.",
    };
  }

  if (row.category === "IMAGING") {
    return {
      orderItemId: row.orderItemId,
      medoraCode,
      category: row.category,
      billingStatus: row.billingStatus,
      canAutoBill: false,
      requiredReview: true,
      reason: "Imaging auto-billing is disabled until licensed CPT/facility chargemaster integration is complete.",
    };
  }

  if (row.category === "CARE") {
    return {
      orderItemId: row.orderItemId,
      medoraCode,
      category: row.category,
      billingStatus: row.billingStatus,
      canAutoBill: false,
      requiredReview: true,
      reason: "Care/procedure auto-billing is disabled until licensed CPT/facility chargemaster integration is complete.",
    };
  }

  return {
    orderItemId: row.orderItemId,
    medoraCode,
    category: row.category,
    billingStatus: row.billingStatus,
    canAutoBill: false,
    requiredReview: true,
    reason: reasonForNonAutoBillStatus(row.billingStatus),
    displayName: row.displayName,
    evidenceSource: row.evidenceSource ?? null,
    reviewAnchorType: (row.reviewAnchorType ?? "ORDER_ITEM") as BillingReviewAnchorType,
  };
}

type BillingExportOrderItem = {
  id: string;
  catalogItemId: string | null;
  catalogItemType: string;
  manualLabel: string | null;
  quantity: number | null;
};

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async getEncounterOrderItemReadiness(
    facilityId: string,
    encounterId: string
  ): Promise<BillingReadinessItemDto[]> {
    const rows = await this.getEncounterBillingExportRows(facilityId, encounterId);
    return rows.map(({ displayName: _displayName, quantity: _quantity, unit: _unit, ...row }) => row);
  }

  async getEncounterBillingExportRows(
    facilityId: string,
    encounterId: string
  ): Promise<BillingExportRowDto[]> {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: { id: true },
    });
    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: { encounterId, facilityId },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        catalogItemId: true,
        catalogItemType: true,
        manualLabel: true,
        quantity: true,
      },
    });

    const orderRows = await this.buildBillingExportRowsFromOrderItems(orderItems);
    const procRows = await this.loadDocumentedProcedureBillingExportRows(facilityId, {
      encounterId,
      onlyClosedEncounters: false,
      orderBy: "asc",
    });
    return [...orderRows, ...procRows];
  }

  async getEncounterAutoBillDecisions(
    facilityId: string,
    encounterId: string
  ): Promise<BillingAutoBillDecisionDto[]> {
    const rows = await this.getEncounterBillingExportRows(facilityId, encounterId);
    return rows.map(getAutoBillDecision);
  }

  async getManualBillingReviewQueue(facilityId: string): Promise<BillingManualReviewRowDto[]> {
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          facilityId,
          encounter: {
            facilityId,
            status: "CLOSED",
          },
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        catalogItemId: true,
        catalogItemType: true,
        manualLabel: true,
        quantity: true,
        createdAt: true,
        order: {
          select: {
            encounterId: true,
            patientId: true,
            encounter: {
              select: {
                patient: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const exportRows = await this.buildBillingExportRowsFromOrderItems(orderItems);
    const itemById = new Map(orderItems.map((item) => [item.id, item]));
    const manualReviewStatuses: BillingReadinessStatus[] = ["candidate_only", "pending_license", "missing"];

    type QueueCandidate = Omit<BillingManualReviewRowDto, "latestDecision" | "decisionAuditTrail">;

    const candidates: QueueCandidate[] = [];
    for (const row of exportRows) {
      const source = itemById.get(row.orderItemId);
      const autoDecision = getAutoBillDecision(row);
      if (!source || !autoDecision.requiredReview || !manualReviewStatuses.includes(autoDecision.billingStatus)) {
        continue;
      }

      const patientName = `${source.order.encounter.patient.firstName} ${source.order.encounter.patient.lastName}`.trim();
      candidates.push({
        encounterId: source.order.encounterId,
        patientId: source.order.patientId,
        patientName,
        orderItemId: row.orderItemId,
        medoraCode: autoDecision.medoraCode,
        category: row.category,
        displayName: row.displayName,
        billingStatus: autoDecision.billingStatus,
        reason: autoDecision.reason,
        createdAt: source.createdAt.toISOString(),
        evidenceSource: row.evidenceSource ?? null,
        reviewAnchorType: row.reviewAnchorType ?? "ORDER_ITEM",
        procedureClinicalEventId: row.procedureClinicalEventId ?? null,
      });
    }

    const procedureEvents = await this.prisma.encounterClinicalEvent.findMany({
      where: {
        facilityId,
        eventType: EncounterClinicalEventType.PROCEDURE_DOCUMENTED,
        encounter: { facilityId, status: EncounterStatus.CLOSED },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        encounterId: true,
        patientId: true,
        payloadJson: true,
        encounter: {
          select: {
            patient: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    for (const ev of procedureEvents) {
      const row = this.procedureClinicalEventToBillingExportRow(ev);
      if (!row) continue;
      const autoDecision = getAutoBillDecision(row);
      if (!autoDecision.requiredReview || !manualReviewStatuses.includes(autoDecision.billingStatus)) continue;
      const patientName =
        `${ev.encounter.patient.firstName ?? ""} ${ev.encounter.patient.lastName ?? ""}`.trim() || "—";
      candidates.push({
        encounterId: ev.encounterId,
        patientId: ev.patientId,
        patientName,
        orderItemId: row.orderItemId,
        medoraCode: autoDecision.medoraCode,
        category: row.category,
        displayName: row.displayName,
        billingStatus: autoDecision.billingStatus,
        reason: autoDecision.reason,
        createdAt: ev.createdAt.toISOString(),
        evidenceSource: row.evidenceSource ?? null,
        reviewAnchorType: "PROCEDURE_DOCUMENTED",
        procedureClinicalEventId: row.procedureClinicalEventId ?? null,
      });
    }

    candidates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (candidates.length === 0) return [];

    const queueOrderItemIds = [...new Set(candidates.map((c) => c.orderItemId))];
    const queueIdSet = new Set(queueOrderItemIds);

    const [decisions, auditLogs] = await Promise.all([
      this.prisma.billingReviewDecision.findMany({
        where: { facilityId, orderItemId: { in: queueOrderItemIds } },
        include: { reviewer: { select: { firstName: true, lastName: true, email: true } } },
      }),
      queueOrderItemIds.length
        ? this.prisma.auditLog.findMany({
            where: {
              facilityId,
              entityType: BILLING_REVIEW_DECISION_AUDIT_ENTITY,
              OR: queueOrderItemIds.map((id) => ({ metadata: { path: ["orderItemId"], equals: id } })),
            },
            orderBy: { createdAt: "desc" },
            take: 600,
            include: { user: { select: { firstName: true, lastName: true, email: true } } },
          })
        : Promise.resolve([]),
    ]);

    const decisionByOrderItemId = new Map(decisions.map((d) => [d.orderItemId, d]));
    const auditByOrderItemId = new Map<string, BillingReviewDecisionAuditEntryDto[]>();
    for (const log of auditLogs) {
      const parsed = parseBillingReviewAuditMetadata(log.metadata);
      if (!parsed.orderItemId || !queueIdSet.has(parsed.orderItemId)) continue;
      const entry = billingReviewAuditEntryFromLog(log);
      const list = auditByOrderItemId.get(parsed.orderItemId) ?? [];
      if (list.length < 35) {
        list.push(entry);
        auditByOrderItemId.set(parsed.orderItemId, list);
      }
    }

    return candidates.map((c) => ({
      ...c,
      latestDecision: toBillingReviewDecisionDto(decisionByOrderItemId.get(c.orderItemId)),
      decisionAuditTrail: auditByOrderItemId.get(c.orderItemId) ?? [],
    }));
  }

  async getEncounterBillingReviewDecisions(facilityId: string, encounterId: string): Promise<BillingReviewDecisionDto[]> {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: { id: true },
    });
    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    const rows = await this.prisma.billingReviewDecision.findMany({
      where: { facilityId, encounterId },
      include: { reviewer: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { reviewedAt: "desc" },
    });

    return rows.map((r) => toBillingReviewDecisionDto(r)!);
  }

  async getEncounterManualReviewGate(facilityId: string, encounterId: string): Promise<BillingManualReviewGateDto> {
    const rows = await this.getEncounterBillingExportRows(facilityId, encounterId);
    const manualReviewStatuses: BillingReadinessStatus[] = ["candidate_only", "pending_license", "missing"];
    const decisions = rows.length
      ? await this.prisma.billingReviewDecision.findMany({
          where: { facilityId, encounterId, orderItemId: { in: rows.map((row) => row.orderItemId) } },
          include: { reviewer: { select: { firstName: true, lastName: true, email: true } } },
        })
      : [];
    const decisionByOrderItemId = new Map(decisions.map((decision) => [decision.orderItemId, decision]));
    const unresolvedItems: BillingManualReviewGateItemDto[] = [];
    const doNotBillOrderItemIds: string[] = [];

    for (const row of rows) {
      if (row.reviewAnchorType === "PROCEDURE_DOCUMENTED") {
        continue;
      }
      const autoBillDecision = getAutoBillDecision(row);
      if (!autoBillDecision.requiredReview || !manualReviewStatuses.includes(autoBillDecision.billingStatus)) continue;

      const latestDecision = decisionByOrderItemId.get(row.orderItemId);
      if (latestDecision?.decision === BillingReviewDecisionStatus.DO_NOT_BILL) {
        doNotBillOrderItemIds.push(row.orderItemId);
        continue;
      }
      if (latestDecision?.decision === BillingReviewDecisionStatus.APPROVED) continue;

      unresolvedItems.push({
        orderItemId: row.orderItemId,
        medoraCode: autoBillDecision.medoraCode,
        category: row.category,
        displayName: row.displayName,
        billingStatus: row.billingStatus,
        reason: autoBillDecision.reason,
        latestDecision: toBillingReviewDecisionDto(latestDecision),
      });
    }

    return {
      encounterId,
      unresolvedCount: unresolvedItems.length,
      unresolvedItems,
      doNotBillOrderItemIds,
    };
  }

  async assertEncounterManualReviewResolved(facilityId: string, encounterId: string): Promise<BillingManualReviewGateDto> {
    const gate = await this.getEncounterManualReviewGate(facilityId, encounterId);
    if (gate.unresolvedCount > 0) {
      throw new BadRequestException(MANUAL_BILLING_REVIEW_UNRESOLVED_MESSAGE);
    }
    return gate;
  }

  async getDoNotBillBillingEventIdsForEncounter(facilityId: string, encounterId: string): Promise<Set<string>> {
    const gate = await this.getEncounterManualReviewGate(facilityId, encounterId);
    if (gate.doNotBillOrderItemIds.length === 0) return new Set();

    const orderItemIds = gate.doNotBillOrderItemIds;
    const [results, medicationAdministrations, medicationDispenses] = await Promise.all([
      this.prisma.result.findMany({
        where: { facilityId, orderItemId: { in: orderItemIds } },
        select: { id: true },
      }),
      this.prisma.medicationAdministration.findMany({
        where: { facilityId, encounterId, orderItemId: { in: orderItemIds } },
        select: { id: true },
      }),
      this.prisma.medicationDispense.findMany({
        where: { facilityId, encounterId, orderItemId: { in: orderItemIds } },
        select: { id: true },
      }),
    ]);

    const sourceRecordIds = new Set<string>([
      ...orderItemIds,
      ...results.map((row) => row.id),
      ...medicationAdministrations.map((row) => row.id),
      ...medicationDispenses.map((row) => row.id),
    ]);
    const events = await this.prisma.billingEvent.findMany({
      where: { facilityId, encounterId, sourceRecordId: { in: [...sourceRecordIds] } },
      select: { id: true },
    });
    return new Set(events.map((event) => event.id));
  }

  async upsertManualBillingReviewDecision(
    facilityId: string,
    orderItemId: string,
    body: Record<string, unknown>,
    reviewerId?: string
  ): Promise<BillingReviewDecisionDto> {
    if (!reviewerId) {
      throw new ForbiddenException("Authentication required");
    }

    if (orderItemId.startsWith("proc-doc_")) {
      throw new BadRequestException(
        "Les procédures documentées sont listées en revue facturation seulement ; aucune décision n'est enregistrée sur cet identifiant pour l'instant."
      );
    }

    const decision = parseBillingReviewDecisionStatus(body?.decision);
    const notes = typeof body?.notes === "string" ? body.notes.trim() : "";
    const auditSource = typeof body?.auditSource === "string" ? body.auditSource.trim() : null;
    const bulkReason = typeof body?.bulkReason === "string" ? body.bulkReason.trim() : null;
    if ((decision === BillingReviewDecisionStatus.NEEDS_INFO || decision === BillingReviewDecisionStatus.DO_NOT_BILL) && !notes) {
      throw new BadRequestException("notes are required for this decision");
    }

    const orderItem = await this.prisma.orderItem.findFirst({
      where: { id: orderItemId, order: { facilityId } },
      select: {
        id: true,
        order: {
          select: {
            id: true,
            encounterId: true,
            patientId: true,
          },
        },
      },
    });
    if (!orderItem) {
      throw new NotFoundException("Order item not found");
    }

    let billingEventId: string | null = null;
    const billingEventIdRaw = typeof body?.billingEventId === "string" ? body.billingEventId.trim() : "";
    if (billingEventIdRaw) {
      const billingEvent = await this.prisma.billingEvent.findFirst({
        where: {
          id: billingEventIdRaw,
          facilityId,
          encounterId: orderItem.order.encounterId,
          patientId: orderItem.order.patientId,
        },
        select: { id: true },
      });
      if (!billingEvent) {
        throw new BadRequestException("billingEventId does not match this manual review item");
      }
      billingEventId = billingEvent.id;
    }

    const reviewedAt = new Date();
    const saved = await this.prisma.$transaction(async (tx) => {
      const row = await tx.billingReviewDecision.upsert({
        where: { facilityId_orderItemId: { facilityId, orderItemId } },
        create: {
          facilityId,
          encounterId: orderItem.order.encounterId,
          patientId: orderItem.order.patientId,
          orderItemId,
          billingEventId,
          decision,
          notes: notes || null,
          reviewerId,
          reviewedAt,
        },
        update: {
          encounterId: orderItem.order.encounterId,
          patientId: orderItem.order.patientId,
          billingEventId,
          decision,
          notes: notes || null,
          reviewerId,
          reviewedAt,
        },
      });

      await this.audit.log(AuditAction.UPDATE, "BILLING_REVIEW_DECISION", {
        tx,
        userId: reviewerId,
        facilityId,
        patientId: orderItem.order.patientId,
        encounterId: orderItem.order.encounterId,
        orderId: orderItem.order.id,
        entityId: row.id,
        metadata: {
          orderItemId,
          billingEventId,
          decision,
          hasNotes: Boolean(notes),
          ...(auditSource ? { source: auditSource } : {}),
          ...(bulkReason ? { bulkReason } : {}),
        },
        critical: true,
      });

      return row;
    });

    const withReviewer = await this.prisma.billingReviewDecision.findUnique({
      where: { id: saved.id },
      include: { reviewer: { select: { firstName: true, lastName: true, email: true } } },
    });
    return toBillingReviewDecisionDto(withReviewer)!;
  }

  async bulkUpsertManualBillingReviewDecision(
    facilityId: string,
    body: Record<string, unknown>,
    reviewerId?: string
  ): Promise<BillingManualReviewBulkDecisionResponseDto> {
    if (!reviewerId) {
      throw new ForbiddenException("Authentication required");
    }

    const itemIdsRaw = Array.isArray(body.itemIds) ? body.itemIds : [];
    const validation = validateManualBillingReviewBulkApproval({
      itemIds: itemIdsRaw.filter((id): id is string => typeof id === "string"),
      decision: typeof body.decision === "string" ? body.decision : "",
    });
    if (!validation.ok) {
      throw new BadRequestException(validation.message);
    }

    const bulkReason = typeof body.reason === "string" ? body.reason.trim() : "";
    const results: BillingManualReviewBulkDecisionResultItemDto[] = [];
    let approved = 0;
    let skipped = 0;
    let failed = 0;

    for (const orderItemId of validation.itemIds) {
      if (orderItemId.startsWith("proc-doc_")) {
        results.push({
          orderItemId,
          status: "skipped",
          error: "Procedure documented rows cannot receive billing decisions.",
        });
        skipped += 1;
        continue;
      }

      const existing = await this.prisma.billingReviewDecision.findUnique({
        where: { facilityId_orderItemId: { facilityId, orderItemId } },
        select: { decision: true },
      });
      if (existing?.decision === BillingReviewDecisionStatus.APPROVED) {
        results.push({ orderItemId, status: "skipped" });
        skipped += 1;
        continue;
      }

      try {
        await this.upsertManualBillingReviewDecision(
          facilityId,
          orderItemId,
          {
            decision: BillingReviewDecisionStatus.APPROVED,
            notes: bulkReason || undefined,
            auditSource: "BULK_APPROVAL",
            bulkReason: bulkReason || null,
          },
          reviewerId
        );
        results.push({ orderItemId, status: "approved" });
        approved += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Bulk approval failed";
        results.push({ orderItemId, status: "failed", error: message });
        failed += 1;
      }
    }

    return {
      requested: validation.itemIds.length,
      approved,
      skipped,
      failed,
      results,
    };
  }

  async summarizeManualReviewForEncounters(
    facilityId: string,
    encounterIds: readonly string[]
  ): Promise<Map<string, { unresolvedCount: number; requiresReviewCount: number }>> {
    const idSet = new Set(encounterIds);
    const rows = await this.getManualBillingReviewQueue(facilityId);
    const summary = new Map<string, { unresolvedCount: number; requiresReviewCount: number }>();
    for (const row of rows) {
      if (!idSet.has(row.encounterId)) continue;
      if (row.reviewAnchorType === "PROCEDURE_DOCUMENTED") continue;
      const current = summary.get(row.encounterId) ?? { unresolvedCount: 0, requiresReviewCount: 0 };
      current.requiresReviewCount += 1;
      const decision = row.latestDecision?.decision;
      if (decision !== BillingReviewDecisionStatus.APPROVED && decision !== BillingReviewDecisionStatus.DO_NOT_BILL) {
        current.unresolvedCount += 1;
      }
      summary.set(row.encounterId, current);
    }
    return summary;
  }

  async getEncounterReadinessExplainer(
    facilityId: string,
    encounterId: string
  ): Promise<BillingReadinessExplainerSummary> {
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: {
        id: true,
        status: true,
        dischargeStatus: true,
        physicianAssignedUserId: true,
        patientId: true,
        dischargedAt: true,
        billingFinalizationStatus: true,
      },
    });
    if (!enc) {
      throw new NotFoundException("Encounter not found");
    }

    const [events, diagnosisCount, identityGaps] = await Promise.all([
      this.prisma.billingEvent.findMany({
        where: { facilityId, encounterId },
        select: {
          reviewStatus: true,
          sourceModule: true,
          billingSide: true,
          procedureCode: true,
          hcpcsCode: true,
          code: true,
          diagnosisCodes: true,
        },
      }),
      this.prisma.diagnosis.count({
        where: { facilityId, encounterId, status: "ACTIVE" },
      }),
      evaluateClaimIdentityGaps(this.prisma, {
        facilityId,
        patientId: enc.patientId,
        serviceDate: enc.dischargedAt ?? null,
      }),
    ]);
    const manualSummary = await this.summarizeManualReviewForEncounters(facilityId, [encounterId]);
    const manualReview = manualSummary.get(encounterId) ?? { unresolvedCount: 0, requiresReviewCount: 0 };

    let needsReview = 0;
    let missingCode = 0;
    let unmappedLinesCount = 0;
    for (const event of events) {
      if (event.reviewStatus === "CAPTURED") needsReview += 1;
      if (billingLedgerRowMissingBillableCodeBlocksReadiness(event)) missingCode += 1;
      if (event.procedureCode?.trim() === "UNMAPPED" || event.code?.trim() === "UNMAPPED") {
        unmappedLinesCount += 1;
      }
    }

    const readiness = evaluateEncounterBillingReadinessFromData(
      {
        status: enc.status,
        dischargeStatus: enc.dischargeStatus,
        physicianAssignedUserId: enc.physicianAssignedUserId,
      },
      events,
      diagnosisCount
    );
    const claimPackages = computeClaimPackageSummaries(events);

    return buildBillingReadinessExplainerSummary({
      readiness,
      ledger: {
        total: events.length,
        needsReview,
        missingCode,
        unmappedLinesCount,
      },
      claimPackages,
      manualReview,
      identityGaps,
      billingFinalizationStatus: enc.billingFinalizationStatus,
      hasAttendingProvider: Boolean(enc.physicianAssignedUserId?.trim()),
    });
  }

  /**
   * Phase 7 — record biller decision on infusion suggestion (capture JSON + ledger metadata + audit).
   * Does not submit claims or auto-assign payer CPT.
   */
  async patchEncounterInfusionBillingReview(
    facilityId: string,
    encounterId: string,
    captureItemId: string,
    body: PatchInfusionBillingReviewBody,
    reviewerId: string,
    ip?: string,
    userAgent?: string
  ): Promise<{ item: BillingCaptureItem }> {
    if (!reviewerId) throw new ForbiddenException("Authentication required");

    let resultItem!: BillingCaptureItem;

    await this.prisma.$transaction(async (tx) => {
      const enc = await tx.encounter.findFirst({
        where: { id: encounterId, facilityId },
        select: { id: true, billingCaptureJson: true, version: true },
      });
      if (!enc) throw new NotFoundException("Encounter not found");

      const stored = readBillingCaptureV1(enc.billingCaptureJson);
      const idx = stored.items.findIndex((it) => it.id === captureItemId);
      if (idx < 0) throw new NotFoundException("Billing capture item not found");

      const item = stored.items[idx]!;
      if (item.sourceType !== "MEDICATION_ADMINISTRATION") {
        throw new BadRequestException("Capture item is not a medication administration line");
      }
      if (!item.infusionBillingSuggestion) {
        throw new BadRequestException("No infusion billing suggestion on this capture item");
      }
      if (!infusionBillingCaptureItemHasEvidence(item)) {
        throw new BadRequestException("Infusion duration evidence is required before review");
      }
      if (item.encounterId?.trim() && item.encounterId.trim() !== encounterId) {
        throw new BadRequestException("captureItemId does not belong to this encounter");
      }

      const oldDecision = item.infusionBillingReviewDecision ?? null;
      const decision = buildInfusionBillingReviewDecision(item, body, reviewerId);
      const nextItem: BillingCaptureItem = { ...item, infusionBillingReviewDecision: decision };
      const nextItems = stored.items.map((it) => (it.id === captureItemId ? nextItem : it));
      const merged = { version: BILLING_CAPTURE_VERSION, items: nextItems };

      const u = await tx.encounter.updateMany({
        where: { id: encounterId, facilityId, version: enc.version },
        data: {
          billingCaptureJson: merged as unknown as Prisma.InputJsonValue,
          version: { increment: 1 },
        },
      });
      if (u.count === 0) throwEncounterConcurrentModification();

      await upsertBillingEventFromCaptureItem(tx, nextItem);

      await this.audit.log(AuditAction.UPDATE, "INFUSION_BILLING_REVIEW", {
        tx,
        userId: reviewerId,
        facilityId,
        encounterId,
        entityId: captureItemId,
        ip,
        userAgent,
        metadata: {
          encounterId,
          captureItemId,
          medicationAdministrationId: item.sourceId?.trim() ?? null,
          oldDecisionStatus: oldDecision?.status ?? null,
          newDecisionStatus: decision.status,
          billingClassFinal: decision.billingClassFinal ?? null,
          approvedUnits: decision.approvedUnits ?? null,
          reviewerNotePresent: Boolean(decision.reviewerNote?.trim()),
          source: "BILLING_INFUSION_REVIEW",
        },
        critical: true,
      });

      resultItem = nextItem;
    });

    return { item: resultItem };
  }

  private procedureClinicalEventToBillingExportRow(ev: {
    id: string;
    payloadJson: unknown;
  }): BillingExportRowDto | null {
    if (!isProviderProcedureDocumentationForBilling(ev.payloadJson)) return null;
    const procedureType = readProcedureTypeFromClinicalEventPayload(ev.payloadJson);
    const medoraCode = medoraCodeForDocumentedProcedureType(procedureType);
    if (!procedureType || !medoraCode) return null;
    const displayName = displayNameFrForDocumentedProcedureType(procedureType);
    const billingStatus = getBillingReadinessStatus({
      category: "CARE",
      medoraCode,
      billingCodeDefault: null,
    });
    return {
      orderItemId: `proc-doc_${ev.id}`,
      medoraCode,
      category: "CARE",
      displayName,
      billingStatus,
      billingCodeDefault: null,
      quantity: null,
      unit: null,
      notes: `[${DOCUMENTED_PROCEDURE_CPT_PENDING_EVIDENCE}] ${displayName}: revue CPT / grille tarifaire requise (procédure documentée).`,
      evidenceSource: DOCUMENTED_PROCEDURE_CPT_PENDING_EVIDENCE,
      reviewAnchorType: "PROCEDURE_DOCUMENTED",
      procedureClinicalEventId: ev.id,
    };
  }

  private async loadDocumentedProcedureBillingExportRows(
    facilityId: string,
    options: {
      encounterId?: string;
      onlyClosedEncounters: boolean;
      orderBy: "asc" | "desc";
    }
  ): Promise<BillingExportRowDto[]> {
    const events = await this.prisma.encounterClinicalEvent.findMany({
      where: {
        facilityId,
        eventType: EncounterClinicalEventType.PROCEDURE_DOCUMENTED,
        ...(options.encounterId ? { encounterId: options.encounterId } : {}),
        encounter: {
          facilityId,
          ...(options.onlyClosedEncounters ? { status: EncounterStatus.CLOSED } : {}),
        },
      },
      orderBy: { createdAt: options.orderBy },
      select: {
        id: true,
        payloadJson: true,
      },
    });
    const out: BillingExportRowDto[] = [];
    for (const ev of events) {
      const row = this.procedureClinicalEventToBillingExportRow(ev);
      if (row) out.push(row);
    }
    return out;
  }

  private async buildBillingExportRowsFromOrderItems(
    orderItems: BillingExportOrderItem[]
  ): Promise<BillingExportRowDto[]> {
    const labIds = orderItems
      .filter((item) => item.catalogItemType === "LAB_TEST" && item.catalogItemId)
      .map((item) => item.catalogItemId!);
    const imagingIds = orderItems
      .filter((item) => item.catalogItemType === "IMAGING_STUDY" && item.catalogItemId)
      .map((item) => item.catalogItemId!);
    const medicationIds = orderItems
      .filter((item) => item.catalogItemType === "MEDICATION" && item.catalogItemId)
      .map((item) => item.catalogItemId!);

    const [labs, imagingStudies, medications] = await Promise.all([
      labIds.length
        ? this.prisma.catalogLabTest.findMany({
            where: { id: { in: labIds } },
            select: { id: true, code: true, displayNameEn: true, displayNameFr: true, name: true, billingCodeDefault: true },
          })
        : Promise.resolve([]),
      imagingIds.length
        ? this.prisma.catalogImagingStudy.findMany({
            where: { id: { in: imagingIds } },
            select: { id: true, code: true, displayNameEn: true, displayNameFr: true, name: true, billingCodeDefault: true },
          })
        : Promise.resolve([]),
      medicationIds.length
        ? this.prisma.catalogMedication.findMany({
            where: { id: { in: medicationIds } },
            select: { id: true, code: true, displayNameEn: true, displayNameFr: true, name: true, billingCodeDefault: true, billingUnitType: true },
          })
        : Promise.resolve([]),
    ]);

    const labById = new Map(labs.map((lab) => [lab.id, lab]));
    const imagingById = new Map(imagingStudies.map((study) => [study.id, study]));
    const medicationById = new Map(medications.map((medication) => [medication.id, medication]));

    const labMappings = labs.length
      ? await this.prisma.billingCatalog.findMany({
          where: {
            triggerSource: "LAB",
            externalCode: { in: labs.map((lab) => lab.code) },
          },
          select: { externalCode: true, code: true },
        })
      : [];
    const labBillingCodeByExternalCode = new Map(
      labMappings
        .filter((mapping) => mapping.externalCode?.trim())
        .map((mapping) => [mapping.externalCode!, mapping.code])
    );

    return orderItems.map((item) => {
      const category = categoryForCatalogItemType(item.catalogItemType);
      const catalog =
        category === "LAB"
          ? labById.get(item.catalogItemId ?? "")
          : category === "IMAGING"
            ? imagingById.get(item.catalogItemId ?? "")
            : category === "MEDICATION"
              ? medicationById.get(item.catalogItemId ?? "")
              : null;
      const medoraCode = catalog?.code ?? item.manualLabel?.trim() ?? null;
      const billingCodeDefault = catalog?.billingCodeDefault?.trim() || null;
      const displayName = displayNameForCatalog(catalog, item.manualLabel);
      const officialLabBillingCodeMatched =
        category === "LAB" &&
        Boolean(
          medoraCode &&
            billingCodeDefault &&
            labBillingCodeByExternalCode.get(medoraCode) === billingCodeDefault
        );
      const billingStatus = getBillingReadinessStatus({
        category,
        medoraCode,
        billingCodeDefault,
        officialLabBillingCodeMatched,
      });

      return {
        orderItemId: item.id,
        medoraCode,
        category,
        displayName,
        billingStatus,
        billingCodeDefault,
        quantity: item.quantity ?? null,
        unit: category === "MEDICATION" ? medicationById.get(item.catalogItemId ?? "")?.billingUnitType?.trim() || null : null,
        notes: notesForReadiness({
          category,
          billingStatus,
          displayName,
          officialLabBillingCodeMatched,
        }),
      };
    });
  }

  toBillingExportCsv(rows: BillingExportRowDto[]): string {
    const headers = [
      "orderItemId",
      "medoraCode",
      "category",
      "displayName",
      "billingStatus",
      "billingCodeDefault",
      "quantity",
      "unit",
      "notes",
    ];
    const lines = rows.map((row) =>
      [
        row.orderItemId,
        row.medoraCode,
        row.category,
        row.displayName,
        row.billingStatus,
        row.billingCodeDefault,
        row.quantity,
        row.unit,
        row.notes,
      ]
        .map(csvCell)
        .join(",")
    );
    return [headers.join(","), ...lines].join("\n");
  }
}

function parseBillingReviewDecisionStatus(value: unknown): BillingReviewDecisionStatus {
  if (typeof value === "string" && Object.values(BillingReviewDecisionStatus).includes(value as BillingReviewDecisionStatus)) {
    return value as BillingReviewDecisionStatus;
  }
  throw new BadRequestException("Invalid decision");
}

type ReviewerNameFields = { firstName: string; lastName: string; email: string };

function formatReviewerDisplayName(user: ReviewerNameFields | null | undefined): string | null {
  if (!user) return null;
  const n = `${user.firstName} ${user.lastName}`.trim();
  return n || user.email;
}

function parseBillingReviewAuditMetadata(metadata: Prisma.JsonValue | null | undefined): {
  orderItemId: string | null;
  decision: BillingReviewDecisionStatus | null;
  hasNotes: boolean | null;
  billingEventId: string | null;
  source: string | null;
  bulkReason: string | null;
} {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return { orderItemId: null, decision: null, hasNotes: null, billingEventId: null, source: null, bulkReason: null };
  }
  const m = metadata as Record<string, unknown>;
  const orderItemId = typeof m.orderItemId === "string" ? m.orderItemId : null;
  let decision: BillingReviewDecisionStatus | null = null;
  if (
    typeof m.decision === "string" &&
    Object.values(BillingReviewDecisionStatus).includes(m.decision as BillingReviewDecisionStatus)
  ) {
    decision = m.decision as BillingReviewDecisionStatus;
  }
  const hasNotes = typeof m.hasNotes === "boolean" ? m.hasNotes : null;
  const billingEventId = typeof m.billingEventId === "string" ? m.billingEventId : null;
  const source = typeof m.source === "string" ? m.source : null;
  const bulkReason = typeof m.bulkReason === "string" ? m.bulkReason : null;
  return { orderItemId, decision, hasNotes, billingEventId, source, bulkReason };
}

function billingReviewAuditEntryFromLog(log: {
  id: string;
  createdAt: Date;
  action: AuditAction;
  userId: string | null;
  metadata: Prisma.JsonValue | null;
  user: ReviewerNameFields | null;
}): BillingReviewDecisionAuditEntryDto {
  const meta = parseBillingReviewAuditMetadata(log.metadata);
  return {
    id: log.id,
    createdAt: log.createdAt.toISOString(),
    action: String(log.action),
    userId: log.userId,
    actorDisplayName: formatReviewerDisplayName(log.user),
    decision: meta.decision,
    hasNotes: meta.hasNotes,
    billingEventId: meta.billingEventId,
    source: meta.source,
    bulkReason: meta.bulkReason,
  };
}

function toBillingReviewDecisionDto(
  row:
    | ({
        id: string;
        orderItemId: string;
        decision: BillingReviewDecisionStatus;
        notes: string | null;
        reviewerId: string;
        reviewedAt: Date;
        billingEventId: string | null;
        createdAt: Date;
        updatedAt: Date;
        reviewer?: ReviewerNameFields | null;
      })
    | null
    | undefined
): BillingReviewDecisionDto | null {
  if (!row) return null;
  return {
    id: row.id,
    orderItemId: row.orderItemId,
    decision: row.decision,
    notes: row.notes,
    reviewerId: row.reviewerId,
    reviewerName: formatReviewerDisplayName(row.reviewer ?? null),
    reviewedAt: row.reviewedAt.toISOString(),
    billingEventId: row.billingEventId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function categoryForCatalogItemType(catalogItemType: string): BillingReadinessCategory {
  if (catalogItemType === "LAB_TEST") return "LAB";
  if (catalogItemType === "IMAGING_STUDY") return "IMAGING";
  if (catalogItemType === "MEDICATION") return "MEDICATION";
  return "CARE";
}

function displayNameForCatalog(
  catalog:
    | { displayNameEn: string | null; displayNameFr: string | null; name: string | null }
    | null
    | undefined,
  manualLabel: string | null
): string {
  return catalog?.displayNameEn?.trim() || catalog?.displayNameFr?.trim() || catalog?.name?.trim() || manualLabel?.trim() || "Order item";
}

function notesForReadiness(input: {
  category: BillingReadinessCategory;
  billingStatus: BillingReadinessStatus;
  displayName: string;
  officialLabBillingCodeMatched: boolean;
}): string {
  if (input.category === "LAB") {
    return input.officialLabBillingCodeMatched
      ? `${input.displayName}: lab billingCodeDefault matches an existing BillingCatalog LAB mapping.`
      : `${input.displayName}: no validated LAB BillingCatalog match for billingCodeDefault.`;
  }
  if (input.category === "IMAGING") {
    return `${input.displayName}: imaging billing requires licensed CPT/facility chargemaster review.`;
  }
  if (input.category === "MEDICATION") {
    return `${input.displayName}: medication billing requires manual review; HCPCS/NDC evidence is candidate-only.`;
  }
  return input.billingStatus === "pending_license"
    ? `${input.displayName}: care/procedure billing requires licensed CPT/facility chargemaster review.`
    : `${input.displayName}: no safe care/procedure billing mapping found.`;
}

function reasonForNonAutoBillStatus(status: BillingReadinessStatus): string {
  if (status === "candidate_only") return "Candidate-only billing evidence requires manual review.";
  if (status === "pending_license") return "Licensed billing source or facility chargemaster review is required.";
  if (status === "missing") return "No safe billing code is available for auto-billing.";
  return "Auto-billing requires a validated lab billing code.";
}

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function readProcedureTypeFromClinicalEventPayload(payloadJson: unknown): string | null {
  if (!payloadJson || typeof payloadJson !== "object" || Array.isArray(payloadJson)) return null;
  const pt = (payloadJson as Record<string, unknown>).procedureType;
  return typeof pt === "string" && pt.trim() ? pt.trim() : null;
}
