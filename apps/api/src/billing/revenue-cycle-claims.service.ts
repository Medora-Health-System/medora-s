import { Injectable } from "@nestjs/common";
import { ClaimSubmissionStatus, Prisma } from "@prisma/client";
import {
  REVENUE_CLAIM_SUBMISSION_DEFAULT_LIMIT,
  REVENUE_CLAIM_SUBMISSION_MAX_LIMIT,
  buildRevenueClaimSubmissionRowDto,
  computeRevenueClaimSubmissionCounts,
  filterRevenueClaimSubmissionRows,
  searchRevenueClaimSubmissionRows,
  type RevenueClaimSubmissionFilter,
  type RevenueClaimSubmissionResponse,
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

export type RevenueCycleClaimsQuery = {
  facilityId: string;
  queue?: RevenueClaimSubmissionFilter;
  search?: string;
  limit?: number;
  offset?: number;
};

function formatPersonName(first: string | null | undefined, last: string | null | undefined): string {
  const full = `${first?.trim() ?? ""} ${last?.trim() ?? ""}`.trim();
  return full || "—";
}

function resolveAckStatus(input: {
  statusCode: string | null;
  kind: string;
  message: string | null;
} | null): string | null {
  if (!input) return null;
  if (input.statusCode?.trim()) return input.statusCode.trim();
  if (input.message?.trim()) return input.message.trim();
  return input.kind?.trim() || null;
}

function resolvePayerLabel(coverage: Awaited<ReturnType<typeof resolvePrimaryCoverage>>): string | null {
  if (!coverage.ok) return null;
  return (
    coverage.coverage.payer?.name ??
    coverage.coverage.payerNameFreeText?.trim() ??
    null
  );
}

@Injectable()
export class RevenueCycleClaimsService {
  static readonly DEFAULT_LIMIT = REVENUE_CLAIM_SUBMISSION_DEFAULT_LIMIT;
  static readonly MAX_LIMIT = REVENUE_CLAIM_SUBMISSION_MAX_LIMIT;

  constructor(private readonly prisma: PrismaService) {}

  async listRevenueCycleClaims(query: RevenueCycleClaimsQuery): Promise<RevenueClaimSubmissionResponse> {
    const limit = Math.min(
      Math.max(query.limit ?? RevenueCycleClaimsService.DEFAULT_LIMIT, 1),
      RevenueCycleClaimsService.MAX_LIMIT
    );
    const offset = Math.max(query.offset ?? 0, 0);
    const queueFilter = query.queue ?? "ALL";
    const search = (query.search ?? "").trim();

    const submissionWhere: Prisma.ClaimSubmissionWhereInput = {
      facilityId: query.facilityId,
      status: { in: WORKSPACE_STATUSES },
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
        updatedAt: true,
        encounterId: true,
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
        acknowledgments: {
          orderBy: { receivedAt: "desc" },
          take: 1,
          select: {
            statusCode: true,
            kind: true,
            message: true,
          },
        },
        attempts: {
          where: { ok: true },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { createdAt: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: RevenueCycleClaimsService.MAX_LIMIT,
    });

    const providerIds = [
      ...new Set(
        submissions
          .map((submission) => submission.encounter.physicianAssignedUserId)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    const providers = providerIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: providerIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];

    const providerMap = new Map(
      providers.map((provider) => [
        provider.id,
        formatPersonName(provider.firstName, provider.lastName),
      ])
    );

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
        payerCache.set(payerKey, resolvePayerLabel(coverage));
      }

      const row = buildRevenueClaimSubmissionRowDto({
        encounterId: submission.encounterId,
        patientName: formatPersonName(encounter.patient?.firstName, encounter.patient?.lastName),
        mrn: encounter.patient?.mrn ?? null,
        dateOfService: serviceDate.toISOString(),
        provider:
          (encounter.physicianAssignedUserId
            ? providerMap.get(encounter.physicianAssignedUserId)
            : null) ?? null,
        claimId: submission.id,
        payer: payerCache.get(payerKey) ?? null,
        submissionStatus: submission.status,
        submittedAt: submission.attempts[0]?.createdAt.toISOString() ?? null,
        ackStatus: resolveAckStatus(submission.acknowledgments[0] ?? null),
        lastUpdatedAt: submission.updatedAt.toISOString(),
      });
      if (row) projected.push(row);
    }

    const searched = search
      ? searchRevenueClaimSubmissionRows(projected, search)
      : projected;
    const counts = computeRevenueClaimSubmissionCounts(searched);
    const filtered = filterRevenueClaimSubmissionRows(searched, queueFilter);
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
