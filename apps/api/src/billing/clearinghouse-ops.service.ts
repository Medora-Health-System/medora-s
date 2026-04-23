import { Injectable } from "@nestjs/common";
import { ClaimSubmissionStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { getClearinghousePublicConfigStatus } from "./clearinghouse-config.util";
import { AckSftpPollerService } from "./ack-sftp-poller.service";
import { ClaimRetryWorkerService } from "./claim-retry-worker.service";
import { isLatestAttemptDueForWorkerRetry } from "./clearinghouse-retry-policy.util";
import { ClearinghouseStabilizationService } from "./clearinghouse-stabilization.service";

/**
 * Facility-scoped operational snapshot for clearinghouse send/ACK (no secrets).
 */
@Injectable()
export class ClearinghouseOpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ackSftpPollerService: AckSftpPollerService,
    private readonly claimRetryWorkerService: ClaimRetryWorkerService,
    private readonly clearinghouseStabilization: ClearinghouseStabilizationService
  ) {}

  async getOpsStatus(facilityId: string) {
    const cfg = getClearinghousePublicConfigStatus();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const now = new Date();
    const workerSnap = this.claimRetryWorkerService.getLastSnapshot();

    const [
      retryReadySubs,
      deadLetterOpen,
      recentTransportFailures,
      sftpSnap,
      recentWorkerRows,
      lastLiveAttempt,
      recentLiveTransportFailures,
      deadLetterReplayed24h,
    ] = await Promise.all([
      this.prisma.claimSubmission.findMany({
        where: { facilityId, status: ClaimSubmissionStatus.READY_TO_SEND },
        select: {
          id: true,
          attempts: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { ok: true, retryEligible: true, nextRetryAt: true, failureCode: true },
          },
        },
      }),
      this.prisma.claimAcknowledgmentDeadLetter.count({
        where: { facilityId, replayedAt: null },
      }),
      this.prisma.claimSubmissionAttempt.count({
        where: {
          ok: false,
          createdAt: { gte: since },
          submission: { facilityId },
        },
      }),
      Promise.resolve(this.ackSftpPollerService.getLastPollSnapshot()),
      this.prisma.$queryRaw<[{ c: bigint }]>(
        Prisma.sql`
          SELECT COUNT(*)::bigint AS c
          FROM "ClaimSubmissionAttempt" a
          INNER JOIN "ClaimSubmission" s ON s.id = a."submissionId"
          WHERE s."facilityId" = ${facilityId}
            AND a."createdAt" >= ${since}
            AND COALESCE(a."requestMetaJson"::jsonb->>'attemptTrigger', '') = 'WORKER'
        `
      ),
      this.prisma.claimSubmissionAttempt.findFirst({
        where: {
          submission: { facilityId },
          transport: { in: ["LIVE_API", "LIVE_SFTP"] },
        },
        orderBy: { createdAt: "desc" },
        select: { ok: true, createdAt: true, transport: true, errorMessage: true },
      }),
      this.prisma.claimSubmissionAttempt.count({
        where: {
          ok: false,
          createdAt: { gte: since },
          transport: { in: ["LIVE_API", "LIVE_SFTP"] },
          submission: { facilityId },
        },
      }),
      this.prisma.claimAcknowledgmentDeadLetter.count({
        where: { facilityId, replayedAt: { gte: since } },
      }),
    ]);

    let retryEligibleSubmissionCount = 0;
    let retryDueSubmissionCount = 0;
    let retryExhaustedCount = 0;
    for (const s of retryReadySubs) {
      const a = s.attempts[0];
      if (!a || a.ok) continue;
      if (a.failureCode === "RETRY_EXHAUSTED") {
        retryExhaustedCount += 1;
      }
      if (a.retryEligible) {
        retryEligibleSubmissionCount += 1;
        if (isLatestAttemptDueForWorkerRetry({ latestAttempt: a, now })) {
          retryDueSubmissionCount += 1;
        }
      }
    }

    const recentRetryAttemptCount = Number(recentWorkerRows[0]?.c ?? 0n);
    const circuit = this.clearinghouseStabilization.getLiveCircuitState(facilityId);
    const rolling = this.clearinghouseStabilization.getRollingSnapshotForFacility(facilityId);
    const stabilizationProcessMetrics = this.clearinghouseStabilization.getMetricsSnapshot();
    const liveSendPacingConfig = this.clearinghouseStabilization.getPacingConfigPublic();

    return {
      clearinghouseMode: cfg.mode,
      integrationTier: cfg.integrationTier,
      liveSendExplicitlyEnabled: cfg.liveSendExplicitlyEnabled,
      liveOutboundReady: cfg.liveOutboundReady,
      outboundLiveConfigComplete: cfg.outboundLiveConfigComplete,
      inboundAckPollEnabled: cfg.inboundAckPollEnabled,
      inboundAckPathConfigured: cfg.inboundAckPathConfigured,
      clearinghouseConfigWarningCodes: cfg.configWarningCodes,
      outboundConfigured: cfg.configured,
      inboundSftpEnabled: cfg.ackSftpIngestEnabled,
      inboundWebhookEnabled: cfg.ackWebhookIngestEnabled,
      lastLiveOutboundAttemptAt: lastLiveAttempt?.createdAt?.toISOString() ?? null,
      lastLiveOutboundAttemptOk: lastLiveAttempt?.ok ?? null,
      lastLiveOutboundTransport: lastLiveAttempt?.transport ?? null,
      lastLiveOutboundError: lastLiveAttempt?.errorMessage ?? null,
      recentLiveTransportFailureCount: recentLiveTransportFailures,
      lastSftpPollAt: sftpSnap?.at ?? null,
      lastSftpPollStatus: sftpSnap?.status ?? null,
      lastSftpPollDetail: sftpSnap?.detail ?? null,
      lastSftpAckPollTruncated: sftpSnap?.ackPollTruncated ?? false,
      lastSftpAckPollFilesSeen: sftpSnap?.ackPollFilesSeen ?? null,
      lastSftpAckPollFilesProcessed: sftpSnap?.ackPollFilesProcessed ?? null,
      lastSftpAckPollMaxFilesPerCycle: sftpSnap?.ackPollMaxFilesPerCycle ?? null,
      retryEligibleSubmissionCount,
      retryDueSubmissionCount,
      retryExhaustedCount,
      recentRetryAttemptCount,
      clearinghouseRetryWorkerEnabled: this.claimRetryWorkerService.isGloballyEnabled(),
      lastRetryWorkerRunAt: workerSnap?.at ?? null,
      lastRetryWorkerStatus: workerSnap?.status ?? null,
      lastRetryWorkerDetail: workerSnap?.detail ?? null,
      deadLetterAckCount: deadLetterOpen,
      deadLetterReplayed24hCount: deadLetterReplayed24h,
      recentTransportFailureCount: recentTransportFailures,
      liveCircuitOpen: circuit.liveCircuitOpen,
      liveCircuitOpenedAt: circuit.liveCircuitOpenedAt,
      liveCircuitReason: circuit.liveCircuitReason,
      liveCircuitOpenUntil: circuit.liveCircuitOpenUntil,
      recentDuplicateAckCount: rolling.recentDuplicateAckCount,
      recentDuplicateSendBlockedCount: rolling.recentDuplicateSendBlockedCount,
      recentRateLimitedSendCount: rolling.recentRateLimitedSendCount,
      recentThrottleSkips: rolling.recentThrottleSkips,
      recentCircuitBlockedSendCount: rolling.recentCircuitBlockedSendCount,
      recentConcurrentLimitedSendCount: rolling.recentConcurrentLimitedSendCount,
      recentDeadLetterReplays: rolling.recentDeadLetterReplays,
      stabilizationProcessMetrics,
      liveSendPacingConfig,
    };
  }
}
