import { Injectable } from "@nestjs/common";
import {
  BillingReviewStatus,
  BillingSourceModule,
  Prisma,
} from "@prisma/client";
import {
  REVENUE_CYCLE_QUEUE_DEFAULT_LIMIT,
  REVENUE_CYCLE_QUEUE_MAX_LIMIT,
  buildRevenueCycleQueueRowDto,
  computeRevenueCycleQueueCounts,
  filterRevenueCycleQueueRows,
  mapClaimSubmissionStatusesToRevenueClaimStatus,
  mapClaimSubmissionStatusesToRevenuePaymentStatus,
  searchRevenueCycleQueueRows,
  type RevenueCycleManualReviewStatus,
  type RevenueCycleQueueFilter,
  type RevenueCycleQueueResponse,
  type RevenueCycleQueueRowDto,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import {
  evaluateEncounterBillingReadinessFromData,
  type BillingEventReadinessRow,
} from "./billing-encounter-readiness.util";

export type RevenueCycleQueueQuery = {
  facilityId: string;
  queue?: RevenueCycleQueueFilter;
  search?: string;
  limit?: number;
  offset?: number;
};

function formatPersonName(first: string | null | undefined, last: string | null | undefined): string {
  const full = `${first?.trim() ?? ""} ${last?.trim() ?? ""}`.trim();
  return full || "—";
}

function resolveManualReviewStatus(input: {
  totalBillingEvents: number;
  ledgerLinesNeedingReview: number;
}): RevenueCycleManualReviewStatus {
  if (input.totalBillingEvents === 0) return "NOT_APPLICABLE";
  if (input.ledgerLinesNeedingReview > 0) return "UNRESOLVED";
  return "RESOLVED";
}

@Injectable()
export class RevenueCycleQueueService {
  static readonly DEFAULT_LIMIT = REVENUE_CYCLE_QUEUE_DEFAULT_LIMIT;
  static readonly MAX_LIMIT = REVENUE_CYCLE_QUEUE_MAX_LIMIT;

  constructor(private readonly prisma: PrismaService) {}

  async listRevenueCycleQueue(query: RevenueCycleQueueQuery): Promise<RevenueCycleQueueResponse> {
    const limit = Math.min(
      Math.max(query.limit ?? RevenueCycleQueueService.DEFAULT_LIMIT, 1),
      RevenueCycleQueueService.MAX_LIMIT
    );
    const offset = Math.max(query.offset ?? 0, 0);
    const queueFilter = query.queue ?? "ALL";
    const search = (query.search ?? "").trim();

    const encounterWhere: Prisma.EncounterWhereInput = {
      facilityId: query.facilityId,
      status: "CLOSED",
      dischargeStatus: { not: null },
    };

    if (search) {
      encounterWhere.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { patient: { firstName: { contains: search, mode: "insensitive" } } },
        { patient: { lastName: { contains: search, mode: "insensitive" } } },
        { patient: { mrn: { contains: search, mode: "insensitive" } } },
      ];
    }

    const encounters = await this.prisma.encounter.findMany({
      where: encounterWhere,
      select: {
        id: true,
        createdAt: true,
        dischargedAt: true,
        physicianAssignedUserId: true,
        status: true,
        dischargeStatus: true,
        patient: {
          select: {
            firstName: true,
            lastName: true,
            mrn: true,
          },
        },
      },
      orderBy: [{ dischargedAt: "desc" }, { createdAt: "desc" }],
      take: RevenueCycleQueueService.MAX_LIMIT,
    });

    const encounterIds = encounters.map((encounter) => encounter.id);
    const providerIds = [
      ...new Set(
        encounters
          .map((encounter) => encounter.physicianAssignedUserId)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    const [diagGroup, ledgerRows, claimSubmissions, providers] = await Promise.all([
      encounterIds.length
        ? this.prisma.diagnosis.groupBy({
            by: ["encounterId"],
            where: { facilityId: query.facilityId, encounterId: { in: encounterIds }, status: "ACTIVE" },
            _count: { _all: true },
          })
        : Promise.resolve([] as { encounterId: string; _count: { _all: number } }[]),
      encounterIds.length
        ? this.prisma.billingEvent.findMany({
            where: { facilityId: query.facilityId, encounterId: { in: encounterIds } },
            select: {
              encounterId: true,
              reviewStatus: true,
              sourceModule: true,
              procedureCode: true,
              hcpcsCode: true,
              code: true,
              diagnosisCodes: true,
            },
          })
        : Promise.resolve([]),
      encounterIds.length
        ? this.prisma.claimSubmission.findMany({
            where: { facilityId: query.facilityId, encounterId: { in: encounterIds } },
            select: { encounterId: true, status: true },
          })
        : Promise.resolve([]),
      providerIds.length
        ? this.prisma.user.findMany({
            where: { id: { in: providerIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : Promise.resolve([]),
    ]);

    const diagMap = new Map(diagGroup.map((group) => [group.encounterId, group._count._all]));
    const eventsByEncounter = new Map<string, BillingEventReadinessRow[]>();
    for (const row of ledgerRows) {
      const current = eventsByEncounter.get(row.encounterId) ?? [];
      current.push({
        reviewStatus: row.reviewStatus as BillingReviewStatus,
        sourceModule: row.sourceModule as BillingSourceModule,
        procedureCode: row.procedureCode,
        hcpcsCode: row.hcpcsCode,
        code: row.code,
        diagnosisCodes: row.diagnosisCodes,
      });
      eventsByEncounter.set(row.encounterId, current);
    }

    const claimStatusesByEncounter = new Map<string, string[]>();
    for (const submission of claimSubmissions) {
      const current = claimStatusesByEncounter.get(submission.encounterId) ?? [];
      current.push(submission.status);
      claimStatusesByEncounter.set(submission.encounterId, current);
    }

    const providerMap = new Map(
      providers.map((provider) => [
        provider.id,
        formatPersonName(provider.firstName, provider.lastName),
      ])
    );

    const projected: RevenueCycleQueueRowDto[] = encounters.map((encounter) => {
      const events = eventsByEncounter.get(encounter.id) ?? [];
      const diagnosisCount = diagMap.get(encounter.id) ?? 0;
      const readiness = evaluateEncounterBillingReadinessFromData(
        {
          status: encounter.status,
          dischargeStatus: encounter.dischargeStatus,
          physicianAssignedUserId: encounter.physicianAssignedUserId,
        },
        events,
        diagnosisCount
      );
      const claimStatuses = claimStatusesByEncounter.get(encounter.id) ?? [];
      const claimStatus = mapClaimSubmissionStatusesToRevenueClaimStatus(claimStatuses);
      const paymentStatus = mapClaimSubmissionStatusesToRevenuePaymentStatus(claimStatuses);
      const provider =
        (encounter.physicianAssignedUserId
          ? providerMap.get(encounter.physicianAssignedUserId)
          : null) ?? null;

      const billingBlockers = readiness.blockers.filter(
        (blocker) => blocker.code !== "no_diagnosis_documented"
      );
      const billingReady =
        billingBlockers.length === 0 &&
        readiness.counts.totalBillingEvents > 0 &&
        encounter.status === "CLOSED" &&
        encounter.dischargeStatus != null;
      const codingReady = diagnosisCount > 0;

      return buildRevenueCycleQueueRowDto({
        encounterId: encounter.id,
        patientName: formatPersonName(encounter.patient?.firstName, encounter.patient?.lastName),
        mrn: encounter.patient?.mrn ?? null,
        dateOfService: (encounter.dischargedAt ?? encounter.createdAt)?.toISOString() ?? null,
        provider,
        billingReady,
        codingReady,
        claimStatus,
        paymentStatus,
        manualReviewStatus: resolveManualReviewStatus({
          totalBillingEvents: readiness.counts.totalBillingEvents,
          ledgerLinesNeedingReview: readiness.counts.ledgerLinesNeedingReview,
        }),
      });
    });

    const searched = search
      ? searchRevenueCycleQueueRows(projected, search)
      : projected;
    const counts = computeRevenueCycleQueueCounts(searched);
    const filtered = filterRevenueCycleQueueRows(searched, queueFilter);
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
