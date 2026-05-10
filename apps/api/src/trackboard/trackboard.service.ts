import { Injectable } from "@nestjs/common";
import { EncounterStatus, EncounterType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  emptyTrackboardOperationalAggregate,
  mergeOperationalIntoEncounters,
  type TrackboardOperationalAggregate,
} from "./trackboard-operational.util";

@Injectable()
export class TrackboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveEncounters(facilityId: string, status?: string, type?: string) {
    const where: any = {
      facilityId,
      status: status === "OPEN" ? EncounterStatus.OPEN : undefined,
    };

    if (type === "INPATIENT") {
      where.type = EncounterType.INPATIENT;
    } else if (status === "OPEN") {
      where.type = { not: EncounterType.INPATIENT };
    }

    const encounters = await this.prisma.encounter.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dob: true,
            sexAtBirth: true,
            mrn: true,
          },
        },
        physicianAssigned: {
          select: { id: true, firstName: true, lastName: true },
        },
        /** Phase 10A — RN currently responsible for the encounter (operational ownership). */
        nurseAssigned: {
          select: { id: true, firstName: true, lastName: true },
        },
        triage: {
          select: {
            esi: true,
            chiefComplaint: true,
            triageCompleteAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    const encounterIds = encounters.map((e) => e.id);
    const opMap = await this.loadTrackboardOperationalAggregates(facilityId, encounterIds);
    return mergeOperationalIntoEncounters(encounters, opMap);
  }

  /**
   * Phase 10B — facility-scoped aggregates only (counts / timestamps / booleans).
   * Bounded to the same encounter id set returned by the list query (max 100).
   */
  private async loadTrackboardOperationalAggregates(
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

    const [labRows, reassessRows, dispositionDocRows] = await Promise.all([
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
      this.prisma.$queryRaw<Array<{ encounterId: string; lastAt: Date }>>(Prisma.sql`
        SELECT e."encounterId" AS "encounterId",
          MAX(e."createdAt") AS "lastAt"
        FROM "EncounterClinicalEvent" e
        WHERE e."facilityId" = ${facilityId}
          AND e."encounterId" IN (${idsSql})
          AND e."eventType" = 'NURSING_ASSESSMENT_SAVED'::"EncounterClinicalEventType"
          AND e."payloadJson"->>'namespace' = 'erNursingReassessmentV1'
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
      map.set(row.encounterId, {
        ...cur,
        lastNursingReassessmentAt: row.lastAt instanceof Date ? row.lastAt.toISOString() : new Date(row.lastAt).toISOString(),
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

    return map;
  }
}
