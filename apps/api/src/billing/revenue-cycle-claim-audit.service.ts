import { Injectable, NotFoundException } from "@nestjs/common";
import { ClaimSubmissionStatus, Prisma } from "@prisma/client";
import {
  buildRevenueClaimAudit,
  resolveRevenueClaimCorrectionGuidance,
  type RevenueClaimAuditAcknowledgment,
  type RevenueClaimAuditAttempt,
  type RevenueClaimAuditRejection,
  type RevenueClaimAuditSummaryCounts,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { resolvePrimaryCoverage } from "./claim-coverage-resolution.util";

const WORKSPACE_STATUSES: ClaimSubmissionStatus[] = [
  ClaimSubmissionStatus.READY_TO_SEND,
  ClaimSubmissionStatus.SENT,
  ClaimSubmissionStatus.ACK_PENDING,
  ClaimSubmissionStatus.ACCEPTED,
  ClaimSubmissionStatus.REJECTED,
  ClaimSubmissionStatus.NEEDS_CORRECTION,
];

function formatPersonName(first: string | null | undefined, last: string | null | undefined): string {
  const full = `${first?.trim() ?? ""} ${last?.trim() ?? ""}`.trim();
  return full || "—";
}

function lifecycleReasonFromParsedJson(parsedJson: Prisma.JsonValue | null): string | null {
  if (!parsedJson || typeof parsedJson !== "object" || Array.isArray(parsedJson)) return null;
  const rec = parsedJson as Record<string, unknown>;
  const lc = rec.lifecycle;
  if (!lc || typeof lc !== "object" || Array.isArray(lc)) return null;
  const r = (lc as Record<string, unknown>).reasonCode;
  return typeof r === "string" ? r : null;
}

function isRejectionAck(statusCode: string | null, kind: string): boolean {
  const code = (statusCode ?? "").toUpperCase();
  if (code.includes("REJECT") || code.includes("NEEDS_CORRECTION")) return true;
  if (kind === "277CA" && (code.includes("A3") || code.includes("A6") || code.includes("A7"))) {
    return true;
  }
  return false;
}

function rejectionDescription(
  statusCode: string | null,
  lifecycleReason: string | null,
  message: string | null
): string | null {
  if (message?.trim()) return message.trim();
  if (lifecycleReason?.trim()) return lifecycleReason.trim();
  if (statusCode?.trim()) return statusCode.trim();
  return null;
}

@Injectable()
export class RevenueCycleClaimAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async getClaimAudit(facilityId: string, claimId: string) {
    const submission = await this.prisma.claimSubmission.findFirst({
      where: { id: claimId, facilityId },
      include: {
        encounter: {
          select: {
            id: true,
            createdAt: true,
            dischargedAt: true,
            physicianAssignedUserId: true,
            patientId: true,
            patient: {
              select: {
                firstName: true,
                lastName: true,
                mrn: true,
              },
            },
          },
        },
        attempts: { orderBy: { createdAt: "asc" } },
        acknowledgments: { orderBy: { receivedAt: "asc" } },
        operationalEvents: {
          where: { statusAfter: { not: null } },
          orderBy: { eventAt: "asc" },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException("Claim submission not found");
    }

    const encounter = submission.encounter;
    const serviceDate = encounter.dischargedAt ?? encounter.createdAt;

    const [provider, coverage, billingEvents, facilitySummary] = await Promise.all([
      encounter.physicianAssignedUserId
        ? this.prisma.user.findUnique({
            where: { id: encounter.physicianAssignedUserId },
            select: { id: true, firstName: true, lastName: true },
          })
        : Promise.resolve(null),
      resolvePrimaryCoverage(this.prisma, {
        facilityId,
        patientId: encounter.patientId,
        serviceDate,
      }),
      this.prisma.billingEvent.findMany({
        where: { facilityId, encounterId: encounter.id },
        select: { priceSnapshot: true, units: true },
      }),
      this.loadFacilitySummaryCounts(facilityId),
    ]);

    const claimAmount = billingEvents.reduce((sum, event) => {
      const price = event.priceSnapshot ? Number(event.priceSnapshot) : 0;
      const units = event.units ?? 1;
      return sum + price * units;
    }, 0);

    const firstSuccessfulAttempt = submission.attempts.find((attempt) => attempt.ok);

    const attemptHistory: RevenueClaimAuditAttempt[] = submission.attempts.map((attempt) => ({
      attemptId: attempt.id,
      transport: attempt.transport,
      ok: attempt.ok,
      failureCode: attempt.failureCode,
      errorMessage: attempt.errorMessage,
      retryEligible: attempt.retryEligible,
      createdAt: attempt.createdAt.toISOString(),
    }));

    const acknowledgmentHistory: RevenueClaimAuditAcknowledgment[] = submission.acknowledgments.map(
      (ack) => ({
        ackId: ack.id,
        kind: ack.kind,
        statusCode: ack.statusCode,
        message: ack.message,
        warningCode: ack.warningCode,
        receivedAt: ack.receivedAt.toISOString(),
        lifecycleReason: lifecycleReasonFromParsedJson(ack.parsedJson),
      })
    );

    const rejections: RevenueClaimAuditRejection[] = [];

    for (const ack of submission.acknowledgments) {
      const lifecycleReason = lifecycleReasonFromParsedJson(ack.parsedJson);
      if (!isRejectionAck(ack.statusCode, ack.kind)) continue;
      const code = ack.statusCode ?? lifecycleReason ?? ack.warningCode;
      rejections.push({
        code,
        description: rejectionDescription(ack.statusCode, lifecycleReason, ack.message),
        clearinghouseMessage: ack.message ?? ack.rawText.slice(0, 280),
        correctionGuidance: resolveRevenueClaimCorrectionGuidance(code),
        occurredAt: ack.receivedAt.toISOString(),
      });
    }

    for (const attempt of submission.attempts) {
      if (attempt.ok) continue;
      const code = attempt.failureCode ?? "TRANSPORT_FAILED";
      rejections.push({
        code,
        description: attempt.errorMessage ?? code,
        clearinghouseMessage: attempt.errorMessage,
        correctionGuidance: resolveRevenueClaimCorrectionGuidance(code),
        occurredAt: attempt.createdAt.toISOString(),
      });
    }

    const payerName = coverage.ok
      ? coverage.coverage.payer?.name ?? coverage.coverage.payerNameFreeText?.trim() ?? null
      : null;
    const memberId = coverage.ok ? coverage.coverage.memberId ?? coverage.coverage.policyNumber : null;

    return buildRevenueClaimAudit({
      claimId: submission.id,
      encounterId: submission.encounterId,
      claimType: submission.claimType,
      submissionStatus: submission.status,
      claimAmount: claimAmount > 0 ? claimAmount : null,
      submittedAt: firstSuccessfulAttempt?.createdAt.toISOString() ?? null,
      createdAt: submission.createdAt.toISOString(),
      updatedAt: submission.updatedAt.toISOString(),
      externalReference: submission.externalReference,
      patientId: encounter.patientId,
      patientName: formatPersonName(encounter.patient?.firstName, encounter.patient?.lastName),
      mrn: encounter.patient?.mrn ?? null,
      providerId: provider?.id ?? null,
      providerName: provider
        ? formatPersonName(provider.firstName, provider.lastName)
        : null,
      payerName,
      memberId,
      statusTransitions: submission.operationalEvents
        .filter((event) => event.statusAfter)
        .map((event) => ({
          at: event.eventAt.toISOString(),
          statusAfter: event.statusAfter!,
          message: event.message,
        })),
      attempts: attemptHistory,
      acknowledgments: acknowledgmentHistory,
      rejections,
      facilitySummary,
    });
  }

  private async loadFacilitySummaryCounts(
    facilityId: string
  ): Promise<RevenueClaimAuditSummaryCounts> {
    const grouped = await this.prisma.claimSubmission.groupBy({
      by: ["status"],
      where: { facilityId, status: { in: WORKSPACE_STATUSES } },
      _count: { _all: true },
    });

    const counts: RevenueClaimAuditSummaryCounts = {
      accepted: 0,
      rejected: 0,
      needsCorrection: 0,
      pendingAck: 0,
    };

    for (const row of grouped) {
      if (row.status === ClaimSubmissionStatus.ACCEPTED) counts.accepted = row._count._all;
      if (row.status === ClaimSubmissionStatus.REJECTED) counts.rejected = row._count._all;
      if (row.status === ClaimSubmissionStatus.NEEDS_CORRECTION) {
        counts.needsCorrection = row._count._all;
      }
      if (
        row.status === ClaimSubmissionStatus.SENT ||
        row.status === ClaimSubmissionStatus.ACK_PENDING
      ) {
        counts.pendingAck += row._count._all;
      }
    }

    return counts;
  }
}
