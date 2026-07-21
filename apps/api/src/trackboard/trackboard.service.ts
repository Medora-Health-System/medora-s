import { Injectable } from "@nestjs/common";
import { EncounterStatus, EncounterType, Prisma } from "@prisma/client";
import { computeObservationOperationalSnapshot } from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import {
  emptyTrackboardOperationalAggregate,
  mergeOperationalIntoEncounters,
  type TrackboardOperationalAggregate,
} from "./trackboard-operational.util";
import { TRACKBOARD_ACTIVE_ENCOUNTER_SELECT } from "./trackboard-encounter-select";

@Injectable()
export class TrackboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveEncounters(
    facilityId: string,
    status?: string,
    type?: string,
    options?: { observationPatientsOnly?: boolean }
  ) {
    const where: any = {
      facilityId,
      status: status === "OPEN" ? EncounterStatus.OPEN : undefined,
    };

    if (type === "INPATIENT") {
      where.type = EncounterType.INPATIENT;
    } else if (status === "OPEN") {
      where.type = { not: EncounterType.INPATIENT };
    }

    /**
     * Explicit select (not bare `include`) — MEDORA.PROD.TRACKBOARD_PRISMA_500_2026_07_20.
     * Omits D3B `hospitalEpisodeId` so Trackboard stays compatible before that migration.
     */
    const encounters = await this.prisma.encounter.findMany({
      where,
      select: TRACKBOARD_ACTIVE_ENCOUNTER_SELECT,
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    const encounterIds = encounters.map((e) => e.id);
    const opMap = await this.getOperationalAggregatesForEncounterIds(facilityId, encounterIds);
    const merged = mergeOperationalIntoEncounters(encounters, opMap);
    const enriched = merged.map((e) => {
      if (e.type !== EncounterType.INPATIENT) {
        return { ...e, observationOps: null };
      }
      const ops = e.trackboardOps;
      const observationOps = computeObservationOperationalSnapshot({
        encounterType: e.type,
        status: e.status,
        workflowState: e.workflowState,
        admittedAt: e.admittedAt,
        createdAt: e.createdAt,
        physicianAssignedUserId: e.physicianAssignedUserId,
        nurseAssignedUserId: e.nurseAssignedUserId,
        providerDocumentationStatus: e.providerDocumentationStatus,
        providerDocumentationSignedAt: e.providerDocumentationSignedAt,
        trackboardOps: {
          resultsPendingCount: ops.resultsPendingCount,
          criticalResultUnacknowledged: ops.criticalResultUnacknowledged,
          lastNursingReassessmentAt: ops.lastNursingReassessmentAt,
          lastProviderObservationReassessmentAt: ops.lastProviderObservationReassessmentAt,
          lastRnObservationReassessmentAt: ops.lastRnObservationReassessmentAt,
          firstDispositionDocAt: ops.firstDispositionDocAt,
          lastTriageVitalsRecordedAt: ops.lastTriageVitalsRecordedAt,
        },
      });
      return { ...e, observationOps };
    });

    if (options?.observationPatientsOnly) {
      return enriched.filter((row) => row.observationOps != null);
    }

    return enriched;
  }

  /**
   * Phase 10B / 13C — facility-scoped aggregates (counts / timestamps / booleans).
   * Reusable for chart summary and trackboard; bounded to the supplied id set.
   */
  async getOperationalAggregatesForEncounterIds(
    facilityId: string,
    encounterIds: string[]
  ): Promise<Map<string, TrackboardOperationalAggregate>> {
    const map = new Map<string, TrackboardOperationalAggregate>();
    for (const id of encounterIds) {
      map.set(id, emptyTrackboardOperationalAggregate());
    }
    if (encounterIds.length === 0) {
      return map;
    }

    const idsSql = Prisma.join(encounterIds);

    const [labRows, reassessRows, dispositionDocRows, vitalsRows, openOrderRows] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{
          encounterId: string;
          resultsPendingCount: bigint;
          criticalResultUnacknowledged: boolean;
        }>
      >(Prisma.sql`
        SELECT o."encounterId" AS "encounterId",
          COUNT(*) FILTER (
            WHERE (
              r.id IS NULL
              OR r."verifiedAt" IS NULL
            )
          )::bigint AS "resultsPendingCount",
          COALESCE(
            BOOL_OR(
              r.id IS NOT NULL
              AND r."criticalValue" = true
              AND r."acknowledgedByProviderAt" IS NULL
            ),
            false
          ) AS "criticalResultUnacknowledged"
        FROM "OrderItem" oi
        INNER JOIN "Order" o ON oi."orderId" = o.id
        LEFT JOIN "Result" r ON r."orderItemId" = oi.id
        WHERE o."facilityId" = ${facilityId}
          AND o."encounterId" IN (${idsSql})
          AND o."type" IN ('LAB', 'IMAGING')
          AND o."status" <> 'CANCELLED'::"OrderStatus"
          AND oi."catalogItemType" IN ('LAB_TEST', 'IMAGING_STUDY')
          AND oi."status" <> 'CANCELLED'::"OrderStatus"
        GROUP BY o."encounterId"
      `),
      this.prisma.$queryRaw<
        Array<{
          encounterId: string;
          lastNursingAt: Date | null;
          lastProviderObsAt: Date | null;
          lastRnObservationAt: Date | null;
        }>
      >(Prisma.sql`
        SELECT e."encounterId" AS "encounterId",
          MAX(e."createdAt") FILTER (
            WHERE e."payloadJson"->>'namespace' = 'erNursingReassessmentV1'
            OR (
              e."payloadJson"->>'source' = 'OBSERVATION_REASSESSMENT_V1'
              AND (e."payloadJson"->'observationReassessmentV1'->>'role') = 'RN'
            )
          ) AS "lastNursingAt",
          MAX(e."createdAt") FILTER (
            WHERE e."payloadJson"->>'source' = 'OBSERVATION_REASSESSMENT_V1'
              AND (e."payloadJson"->'observationReassessmentV1'->>'role') = 'PROVIDER'
          ) AS "lastProviderObsAt",
          MAX(e."createdAt") FILTER (
            WHERE e."payloadJson"->>'source' = 'OBSERVATION_REASSESSMENT_V1'
              AND (e."payloadJson"->'observationReassessmentV1'->>'role') = 'RN'
          ) AS "lastRnObservationAt"
        FROM "EncounterClinicalEvent" e
        WHERE e."facilityId" = ${facilityId}
          AND e."encounterId" IN (${idsSql})
          AND e."eventType" = 'NURSING_ASSESSMENT_SAVED'::"EncounterClinicalEventType"
        GROUP BY e."encounterId"
      `),
      this.prisma.$queryRaw<Array<{ encounterId: string; firstAt: Date }>>(Prisma.sql`
        SELECT e."encounterId" AS "encounterId",
          MIN(e."createdAt") AS "firstAt"
        FROM "EncounterClinicalEvent" e
        WHERE e."facilityId" = ${facilityId}
          AND e."encounterId" IN (${idsSql})
          AND e."eventType" IN (
            'DISCHARGE_SUMMARY_SAVED'::"EncounterClinicalEventType",
            'ADMISSION_SUMMARY_SAVED'::"EncounterClinicalEventType"
          )
        GROUP BY e."encounterId"
      `),
      this.prisma.$queryRaw<Array<{ encounterId: string; lastAt: Date }>>(Prisma.sql`
        SELECT t."encounterId" AS "encounterId",
          MAX(t."measuredAt") AS "lastAt"
        FROM "TriageVitalsReading" t
        WHERE t."facilityId" = ${facilityId}
          AND t."encounterId" IN (${idsSql})
          AND t."status" = 'ACTIVE'::"TriageVitalsReadingStatus"
        GROUP BY t."encounterId"
      `),
      this.prisma.$queryRaw<Array<{ encounterId: string; openOrderCount: bigint }>>(Prisma.sql`
        SELECT o."encounterId" AS "encounterId",
          COUNT(*)::bigint AS "openOrderCount"
        FROM "OrderItem" oi
        INNER JOIN "Order" o ON oi."orderId" = o.id
        WHERE o."facilityId" = ${facilityId}
          AND o."encounterId" IN (${idsSql})
          AND o."status" <> 'CANCELLED'::"OrderStatus"
          AND oi."status" NOT IN (
            'CANCELLED'::"OrderStatus",
            'COMPLETED'::"OrderStatus",
            'RESULTED'::"OrderStatus",
            'VERIFIED'::"OrderStatus"
          )
          AND oi."lifecycleState" NOT IN (
            'CANCELLED'::"OrderItemLifecycleState",
            'COMPLETED'::"OrderItemLifecycleState",
            'REVIEWED'::"OrderItemLifecycleState"
          )
        GROUP BY o."encounterId"
      `),
    ]);

    for (const row of labRows) {
      const cur = map.get(row.encounterId) ?? emptyTrackboardOperationalAggregate();
      const n = typeof row.resultsPendingCount === "bigint" ? Number(row.resultsPendingCount) : Number(row.resultsPendingCount);
      map.set(row.encounterId, {
        ...cur,
        resultsPendingCount: Number.isFinite(n) ? n : 0,
        criticalResultUnacknowledged: Boolean(row.criticalResultUnacknowledged),
      });
    }

    for (const row of reassessRows) {
      const cur = map.get(row.encounterId) ?? emptyTrackboardOperationalAggregate();
      const lastN = row.lastNursingAt;
      const lastP = row.lastProviderObsAt;
      const lastRnObs = row.lastRnObservationAt;
      map.set(row.encounterId, {
        ...cur,
        lastNursingReassessmentAt:
          lastN instanceof Date ? lastN.toISOString() : lastN ? new Date(lastN as string).toISOString() : null,
        lastProviderObservationReassessmentAt:
          lastP instanceof Date ? lastP.toISOString() : lastP ? new Date(lastP as string).toISOString() : null,
        lastRnObservationReassessmentAt:
          lastRnObs instanceof Date
            ? lastRnObs.toISOString()
            : lastRnObs
              ? new Date(lastRnObs as string).toISOString()
              : null,
      });
    }

    for (const row of dispositionDocRows) {
      const cur = map.get(row.encounterId) ?? emptyTrackboardOperationalAggregate();
      map.set(row.encounterId, {
        ...cur,
        firstDispositionDocAt:
          row.firstAt instanceof Date ? row.firstAt.toISOString() : new Date(row.firstAt).toISOString(),
      });
    }

    for (const row of vitalsRows) {
      const cur = map.get(row.encounterId) ?? emptyTrackboardOperationalAggregate();
      map.set(row.encounterId, {
        ...cur,
        lastTriageVitalsRecordedAt:
          row.lastAt instanceof Date ? row.lastAt.toISOString() : new Date(row.lastAt).toISOString(),
      });
    }

    for (const row of openOrderRows) {
      const cur = map.get(row.encounterId) ?? emptyTrackboardOperationalAggregate();
      const n = typeof row.openOrderCount === "bigint" ? Number(row.openOrderCount) : Number(row.openOrderCount);
      map.set(row.encounterId, {
        ...cur,
        openOrderCount: Number.isFinite(n) ? n : 0,
      });
    }

    return map;
  }
}
