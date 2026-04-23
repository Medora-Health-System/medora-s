import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type ClearinghouseTimelineItem = {
  at: string;
  source: "operational_event" | "submission_attempt" | "acknowledgment";
  kind: string;
  summary: string;
  detail: Record<string, unknown>;
};

@Injectable()
export class ClaimClearinghouseObservabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getSubmissionTimeline(facilityId: string, submissionId: string) {
    const sub = await this.prisma.claimSubmission.findFirst({
      where: { id: submissionId, facilityId },
      include: {
        attempts: { orderBy: { createdAt: "asc" } },
        acknowledgments: { orderBy: { receivedAt: "asc" } },
      },
    });
    if (!sub) throw new NotFoundException("Submission not found");

    const ops = await this.prisma.claimOperationalEvent.findMany({
      where: { submissionId },
      orderBy: { eventAt: "asc" },
    });

    const items: ClearinghouseTimelineItem[] = [];

    for (const e of ops) {
      items.push({
        at: e.eventAt.toISOString(),
        source: "operational_event",
        kind: e.eventType,
        summary: e.message ?? e.eventType,
        detail: {
          id: e.id,
          reasonCode: e.reasonCode,
          statusBefore: e.statusBefore,
          statusAfter: e.statusAfter,
          claimType: e.claimType,
          metadataJson: e.metadataJson,
        },
      });
    }

    for (const a of sub.attempts) {
      items.push({
        at: a.createdAt.toISOString(),
        source: "submission_attempt",
        kind: a.ok ? "ATTEMPT_TRANSPORT_OK" : "ATTEMPT_TRANSPORT_FAILED",
        summary: a.ok ? `Transport OK (${a.transport})` : `Transport failed (${a.transport})`,
        detail: {
          attemptId: a.id,
          transport: a.transport,
          ok: a.ok,
          failureCode: a.failureCode,
          retryEligible: a.retryEligible,
          nextRetryAt: a.nextRetryAt?.toISOString() ?? null,
          errorMessage: a.errorMessage,
        },
      });
    }

    for (const ack of sub.acknowledgments) {
      items.push({
        at: ack.receivedAt.toISOString(),
        source: "acknowledgment",
        kind: `ACK_${ack.kind}`,
        summary: `${ack.kind} · ${ack.statusCode ?? "—"}`,
        detail: {
          ackId: ack.id,
          kind: ack.kind,
          statusCode: ack.statusCode,
          warningCode: ack.warningCode,
          submissionId: ack.submissionId,
          batchId: ack.batchId,
        },
      });
    }

    items.sort((a, b) => a.at.localeCompare(b.at));

    return {
      submissionId: sub.id,
      encounterId: sub.encounterId,
      facilityId: sub.facilityId,
      claimType: sub.claimType,
      currentStatus: sub.status,
      timeline: items,
    };
  }

  async getEncounterClaimOps(facilityId: string, encounterId: string) {
    const subs = await this.prisma.claimSubmission.findMany({
      where: { facilityId, encounterId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        claimType: true,
        status: true,
        createdAt: true,
        batchId: true,
        externalReference: true,
        _count: { select: { attempts: true, acknowledgments: true, operationalEvents: true } },
      },
    });

    const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [op24, op7] = await Promise.all([
      this.prisma.claimOperationalEvent.groupBy({
        by: ["eventType"],
        where: { facilityId, encounterId, eventAt: { gte: since24 } },
        _count: { _all: true },
      }),
      this.prisma.claimOperationalEvent.groupBy({
        by: ["eventType"],
        where: { facilityId, encounterId, eventAt: { gte: since7 } },
        _count: { _all: true },
      }),
    ]);

    const mapCounts = (rows: { eventType: string; _count: { _all: number } }[]) => {
      const o: Record<string, number> = {};
      for (const r of rows) o[r.eventType] = r._count._all;
      return o;
    };

    return {
      encounterId,
      facilityId,
      submissions: subs.map((s) => ({
        submissionId: s.id,
        claimType: s.claimType,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
        batchId: s.batchId,
        externalReference: s.externalReference,
        attemptCount: s._count.attempts,
        acknowledgmentCount: s._count.acknowledgments,
        operationalEventCount: s._count.operationalEvents,
      })),
      operationalEventsByType24h: mapCounts(op24),
      operationalEventsByType7d: mapCounts(op7),
    };
  }

  async getFacilityClearinghouseMetrics(facilityId: string) {
    const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [op24, op7, op24Prof, op24Fac, sendOk24, ackRows, dlCreated24, dlReplayed24] = await Promise.all([
      this.prisma.claimOperationalEvent.groupBy({
        by: ["eventType"],
        where: { facilityId, eventAt: { gte: since24 } },
        _count: { _all: true },
      }),
      this.prisma.claimOperationalEvent.groupBy({
        by: ["eventType"],
        where: { facilityId, eventAt: { gte: since7 } },
        _count: { _all: true },
      }),
      this.prisma.claimOperationalEvent.groupBy({
        by: ["eventType"],
        where: { facilityId, eventAt: { gte: since24 }, claimType: "PROFESSIONAL_837P" },
        _count: { _all: true },
      }),
      this.prisma.claimOperationalEvent.groupBy({
        by: ["eventType"],
        where: { facilityId, eventAt: { gte: since24 }, claimType: "FACILITY_837I" },
        _count: { _all: true },
      }),
      this.prisma.claimOperationalEvent.count({
        where: { facilityId, eventAt: { gte: since24 }, eventType: "SEND_ATTEMPT_SUCCEEDED" },
      }),
      this.prisma.$queryRaw<
        { submission_id: string; send_at: Date; ack_at: Date; delta_ms: number }[]
      >(Prisma.sql`
        WITH sends AS (
          SELECT "submissionId" AS sid, MIN("eventAt") AS t
          FROM "ClaimOperationalEvent"
          WHERE "facilityId" = ${facilityId}
            AND "eventAt" >= ${since7}
            AND "eventType" = 'SEND_ATTEMPT_SUCCEEDED'
            AND "submissionId" IS NOT NULL
          GROUP BY "submissionId"
        ),
        first_ack AS (
          SELECT ca."submissionId" AS sid, MIN(ca."receivedAt") AS t
          FROM "ClaimAcknowledgment" ca
          WHERE ca."facilityId" = ${facilityId}
            AND ca."receivedAt" >= ${since7}
            AND ca."submissionId" IS NOT NULL
          GROUP BY ca."submissionId"
        )
        SELECT s.sid AS submission_id, s.t AS send_at, a.t AS ack_at,
               EXTRACT(EPOCH FROM (a.t - s.t)) * 1000 AS delta_ms
        FROM sends s
        INNER JOIN first_ack a ON a.sid = s.sid AND a.t >= s.t
        WHERE s.sid IS NOT NULL
        LIMIT 500
      `),
      this.prisma.claimAcknowledgmentDeadLetter.count({
        where: { facilityId, createdAt: { gte: since24 } },
      }),
      this.prisma.claimAcknowledgmentDeadLetter.count({
        where: { facilityId, replayedAt: { gte: since24 } },
      }),
    ]);

    const mapCounts = (rows: { eventType: string; _count: { _all: number } }[]) => {
      const o: Record<string, number> = {};
      for (const r of rows) o[r.eventType] = r._count._all;
      return o;
    };

    const deltas = ackRows.map((r) => Number(r.delta_ms)).filter((n) => Number.isFinite(n) && n >= 0);
    const avgAckLatencyMs =
      deltas.length > 0 ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length) : null;

    return {
      facilityId,
      windows: { since24h: since24.toISOString(), since7d: since7.toISOString() },
      operationalEventsByType24h: mapCounts(op24),
      operationalEventsByType7d: mapCounts(op7),
      operationalEventsByType24hProfessional: mapCounts(op24Prof),
      operationalEventsByType24hFacility: mapCounts(op24Fac),
      sendAttemptSucceeded24h: sendOk24,
      deadLettersCreated24h: dlCreated24,
      deadLettersReplayed24h: dlReplayed24,
      ackLatencySample7d: {
        sampleCount: deltas.length,
        avgAckLatencyMs,
      },
    };
  }

  async getRecentOperationalEvents(facilityId: string, opts?: { take?: number; encounterId?: string }) {
    const take = Math.min(Math.max(opts?.take ?? 80, 1), 300);
    const rows = await this.prisma.claimOperationalEvent.findMany({
      where: {
        facilityId,
        ...(opts?.encounterId ? { encounterId: opts.encounterId } : {}),
      },
      orderBy: { eventAt: "desc" },
      take,
      select: {
        id: true,
        eventAt: true,
        eventType: true,
        encounterId: true,
        submissionId: true,
        batchId: true,
        claimType: true,
        statusBefore: true,
        statusAfter: true,
        reasonCode: true,
        message: true,
        metadataJson: true,
      },
    });
    return {
      facilityId,
      take,
      items: rows.map((r) => ({
        id: r.id,
        eventAt: r.eventAt.toISOString(),
        eventType: r.eventType,
        encounterId: r.encounterId,
        submissionId: r.submissionId,
        batchId: r.batchId,
        claimType: r.claimType,
        statusBefore: r.statusBefore,
        statusAfter: r.statusAfter,
        reasonCode: r.reasonCode,
        message: r.message,
        metadataJson: r.metadataJson,
      })),
    };
  }
}
