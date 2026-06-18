import { Injectable } from "@nestjs/common";
import { ClaimSubmissionStatus, Prisma } from "@prisma/client";
import {
  REVENUE_PAYMENT_DEFAULT_LIMIT,
  REVENUE_PAYMENT_MAX_LIMIT,
  buildRevenuePaymentProjection,
  computeRevenuePaymentCounts,
  filterRevenuePaymentRows,
  searchRevenuePaymentRows,
  type RevenuePaymentFilter,
  type RevenuePaymentResponse,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { resolvePrimaryCoverage } from "./claim-coverage-resolution.util";

const PAYMENT_STATUSES: ClaimSubmissionStatus[] = [
  ClaimSubmissionStatus.SENT,
  ClaimSubmissionStatus.ACK_PENDING,
  ClaimSubmissionStatus.ACCEPTED,
  ClaimSubmissionStatus.REJECTED,
  ClaimSubmissionStatus.NEEDS_CORRECTION,
];

export type RevenueCyclePaymentsQuery = {
  facilityId: string;
  queue?: RevenuePaymentFilter;
  search?: string;
  limit?: number;
  offset?: number;
};

function formatPersonName(first: string | null | undefined, last: string | null | undefined): string {
  const full = `${first?.trim() ?? ""} ${last?.trim() ?? ""}`.trim();
  return full || "—";
}

function paidAmountHintFromParsedJson(parsedJson: Prisma.JsonValue | null): number | null {
  if (!parsedJson || typeof parsedJson !== "object" || Array.isArray(parsedJson)) return null;
  const rec = parsedJson as Record<string, unknown>;
  const payment = rec.payment;
  if (!payment || typeof payment !== "object" || Array.isArray(payment)) return null;
  const amount = (payment as Record<string, unknown>).paidAmount;
  return typeof amount === "number" && Number.isFinite(amount) ? amount : null;
}

function latestDenialFromAcks(
  acknowledgments: readonly {
    statusCode: string | null;
    message: string | null;
    parsedJson: Prisma.JsonValue | null;
    kind: string;
  }[]
): { code: string | null; description: string | null } {
  for (let i = acknowledgments.length - 1; i >= 0; i -= 1) {
    const ack = acknowledgments[i]!;
    const code = ack.statusCode;
    const upper = (code ?? "").toUpperCase();
    if (
      upper.includes("REJECT") ||
      upper.includes("DENIED") ||
      upper.includes("NEEDS_CORRECTION") ||
      upper.includes("A3")
    ) {
      const parsed =
        ack.parsedJson && typeof ack.parsedJson === "object" && !Array.isArray(ack.parsedJson)
          ? (ack.parsedJson as Record<string, unknown>).lifecycle
          : null;
      const lifecycleCode =
        parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>).reasonCode
          : null;
      return {
        code: (typeof lifecycleCode === "string" ? lifecycleCode : null) ?? code,
        description: ack.message,
      };
    }
  }
  return { code: null, description: null };
}

@Injectable()
export class RevenueCyclePaymentsService {
  static readonly DEFAULT_LIMIT = REVENUE_PAYMENT_DEFAULT_LIMIT;
  static readonly MAX_LIMIT = REVENUE_PAYMENT_MAX_LIMIT;

  constructor(private readonly prisma: PrismaService) {}

  async listRevenueCyclePayments(query: RevenueCyclePaymentsQuery): Promise<RevenuePaymentResponse> {
    const limit = Math.min(
      Math.max(query.limit ?? RevenueCyclePaymentsService.DEFAULT_LIMIT, 1),
      RevenueCyclePaymentsService.MAX_LIMIT
    );
    const offset = Math.max(query.offset ?? 0, 0);
    const queueFilter = query.queue ?? "ALL";
    const search = (query.search ?? "").trim();

    const submissionWhere: Prisma.ClaimSubmissionWhereInput = {
      facilityId: query.facilityId,
      status: { in: PAYMENT_STATUSES },
    };

    if (search) {
      submissionWhere.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { externalReference: { contains: search, mode: "insensitive" } },
        {
          encounter: {
            patient: { firstName: { contains: search, mode: "insensitive" } },
          },
        },
        {
          encounter: {
            patient: { lastName: { contains: search, mode: "insensitive" } },
          },
        },
        {
          encounter: {
            patient: { mrn: { contains: search, mode: "insensitive" } },
          },
        },
      ];
    }

    const submissions = await this.prisma.claimSubmission.findMany({
      where: submissionWhere,
      select: {
        id: true,
        status: true,
        encounterId: true,
        encounter: {
          select: {
            id: true,
            createdAt: true,
            dischargedAt: true,
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
        acknowledgments: {
          orderBy: { receivedAt: "asc" },
          select: {
            statusCode: true,
            message: true,
            parsedJson: true,
            kind: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: RevenueCyclePaymentsService.MAX_LIMIT,
    });

    const encounterIds = [...new Set(submissions.map((s) => s.encounterId))];
    const billingByEncounter = new Map<string, number>();

    if (encounterIds.length) {
      const billingRows = await this.prisma.billingEvent.findMany({
        where: { facilityId: query.facilityId, encounterId: { in: encounterIds } },
        select: { encounterId: true, priceSnapshot: true, units: true },
      });
      for (const row of billingRows) {
        const price = row.priceSnapshot ? Number(row.priceSnapshot) : 0;
        const units = row.units ?? 1;
        billingByEncounter.set(
          row.encounterId,
          (billingByEncounter.get(row.encounterId) ?? 0) + price * units
        );
      }
    }

    const payerCache = new Map<string, string | null>();
    const projected = [];

    for (const submission of submissions) {
      const encounter = submission.encounter;
      const serviceDate = encounter.dischargedAt ?? encounter.createdAt;
      const payerKey = `${encounter.patientId}:${serviceDate.toISOString()}`;
      if (!payerCache.has(payerKey)) {
        const coverage = await resolvePrimaryCoverage(this.prisma, {
          facilityId: query.facilityId,
          patientId: encounter.patientId,
          serviceDate,
        });
        payerCache.set(
          payerKey,
          coverage.ok
            ? coverage.coverage.payer?.name ?? coverage.coverage.payerNameFreeText?.trim() ?? null
            : null
        );
      }

      const expectedRaw = billingByEncounter.get(submission.encounterId) ?? 0;
      const expectedAmount = expectedRaw > 0 ? Math.round(expectedRaw * 100) / 100 : null;
      const denial = latestDenialFromAcks(submission.acknowledgments);
      const paidHint = [...submission.acknowledgments]
        .reverse()
        .map((ack) => paidAmountHintFromParsedJson(ack.parsedJson))
        .find((amount) => amount != null);

      const row = buildRevenuePaymentProjection({
        encounterId: submission.encounterId,
        patientName: formatPersonName(encounter.patient?.firstName, encounter.patient?.lastName),
        mrn: encounter.patient?.mrn ?? null,
        claimId: submission.id,
        payer: payerCache.get(payerKey) ?? null,
        submissionStatus: submission.status,
        expectedAmount,
        paidAmountHint: paidHint ?? null,
        denialCode: submission.status === "REJECTED" ? denial.code : denial.code,
        denialDescription: denial.description,
      });

      if (row) projected.push(row);
    }

    const searched = search ? searchRevenuePaymentRows(projected, search) : projected;
    const counts = computeRevenuePaymentCounts(searched);
    const filtered = filterRevenuePaymentRows(searched, queueFilter);
    const rows = filtered.slice(offset, offset + limit);

    return {
      rows,
      total: filtered.length,
      limit,
      offset,
      counts,
    };
  }
}
