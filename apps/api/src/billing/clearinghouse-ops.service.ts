import { Injectable } from "@nestjs/common";
import { ClaimSubmissionStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { getClearinghousePublicConfigStatus } from "./clearinghouse-config.util";
import { AckSftpPollerService } from "./ack-sftp-poller.service";

/**
 * Facility-scoped operational snapshot for clearinghouse send/ACK (no secrets).
 */
@Injectable()
export class ClearinghouseOpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ackSftpPollerService: AckSftpPollerService
  ) {}

  async getOpsStatus(facilityId: string) {
    const cfg = getClearinghousePublicConfigStatus();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [retryReadySubs, deadLetterOpen, recentTransportFailures, sftpSnap] = await Promise.all([
      this.prisma.claimSubmission.findMany({
        where: { facilityId, status: ClaimSubmissionStatus.READY_TO_SEND },
        select: {
          id: true,
          attempts: { orderBy: { createdAt: "desc" }, take: 1, select: { ok: true, retryEligible: true } },
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
    ]);

    const retryEligibleSubmissionCount = retryReadySubs.filter((s) => {
      const a = s.attempts[0];
      return a && !a.ok && a.retryEligible;
    }).length;

    return {
      clearinghouseMode: cfg.mode,
      outboundConfigured: cfg.configured,
      inboundSftpEnabled: cfg.ackSftpIngestEnabled,
      inboundWebhookEnabled: cfg.ackWebhookIngestEnabled,
      lastSftpPollAt: sftpSnap?.at ?? null,
      lastSftpPollStatus: sftpSnap?.status ?? null,
      lastSftpPollDetail: sftpSnap?.detail ?? null,
      retryEligibleSubmissionCount,
      deadLetterAckCount: deadLetterOpen,
      recentTransportFailureCount: recentTransportFailures,
    };
  }
}
