import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ClaimSubmissionStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  ClearinghouseTransport,
  ManualClearinghouseTransport,
  StubApiClearinghouseTransport,
} from "./clearinghouse-transport.interface";

export type TransportKind = "MANUAL" | "STUB_API";

function canTransition(from: ClaimSubmissionStatus, to: ClaimSubmissionStatus): boolean {
  const allowed: Record<ClaimSubmissionStatus, ClaimSubmissionStatus[]> = {
    DRAFT: [ClaimSubmissionStatus.GENERATED],
    GENERATED: [ClaimSubmissionStatus.READY_TO_SEND],
    READY_TO_SEND: [ClaimSubmissionStatus.SENT],
    SENT: [ClaimSubmissionStatus.ACK_PENDING],
    ACK_PENDING: [ClaimSubmissionStatus.ACCEPTED, ClaimSubmissionStatus.REJECTED, ClaimSubmissionStatus.NEEDS_CORRECTION],
    ACCEPTED: [],
    REJECTED: [],
    NEEDS_CORRECTION: [],
    CANCELLED: [],
  };
  return allowed[from].includes(to);
}

@Injectable()
export class ClaimTransmissionService {
  constructor(private readonly prisma: PrismaService) {}

  private buildTransport(kind: TransportKind): ClearinghouseTransport {
    return kind === "STUB_API" ? new StubApiClearinghouseTransport() : new ManualClearinghouseTransport();
  }

  async sendSubmissionBatch(facilityId: string, batchId: string, transportKind: TransportKind = "MANUAL") {
    const transport = this.buildTransport(transportKind);
    const batch = await this.prisma.claimSubmissionBatch.findFirst({
      where: { id: batchId, facilityId },
      include: { submissions: true },
    });
    if (!batch) throw new NotFoundException("Submission batch not found");
    const out = [];
    for (const s of batch.submissions) {
      out.push(await this.sendOneSubmission(s.id, transport, { allowNonReady: false }));
    }
    return { batchId, transport: transport.key, results: out };
  }

  async sendEncounterSubmissions(facilityId: string, encounterId: string, transportKind: TransportKind = "MANUAL") {
    const transport = this.buildTransport(transportKind);
    const submissions = await this.prisma.claimSubmission.findMany({
      where: { facilityId, encounterId },
      orderBy: { createdAt: "asc" },
    });
    const results = [];
    for (const s of submissions) {
      results.push(await this.sendOneSubmission(s.id, transport, { allowNonReady: false }));
    }
    return { facilityId, encounterId, transport: transport.key, results };
  }

  async getSubmissionAttemptHistory(facilityId: string, submissionId: string) {
    const sub = await this.prisma.claimSubmission.findFirst({ where: { id: submissionId, facilityId }, select: { id: true } });
    if (!sub) throw new NotFoundException("Submission not found");
    return this.prisma.claimSubmissionAttempt.findMany({
      where: { submissionId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getEncounterSubmissionDebug(facilityId: string, encounterId: string) {
    const submissions = await this.prisma.claimSubmission.findMany({
      where: { facilityId, encounterId },
      orderBy: { createdAt: "desc" },
      include: {
        attempts: { orderBy: { createdAt: "desc" } },
        acknowledgments: { orderBy: { receivedAt: "desc" } },
      },
    });

    return {
      encounterId,
      submissions: submissions.map((s) => ({
        submissionId: s.id,
        type: s.claimType === "PROFESSIONAL_837P" ? "837P" : "837I",
        status: s.status,
        createdAt: s.createdAt,
        attempts: s.attempts.map((a) => ({
          attemptId: a.id,
          transport: a.transport,
          status: a.ok ? "OK" : "FAILED",
          createdAt: a.createdAt,
          payloadSize:
            a.requestMetaJson && typeof a.requestMetaJson === "object" && "bytes" in (a.requestMetaJson as Record<string, unknown>)
              ? Number((a.requestMetaJson as Record<string, unknown>).bytes ?? 0)
              : 0,
          errorMessage: a.errorMessage,
        })),
        acknowledgments: s.acknowledgments.map((ack) => ({
          ackId: ack.id,
          type: ack.kind,
          status: ack.statusCode,
          receivedAt: ack.receivedAt,
          rawSummary: ack.rawText.slice(0, 140),
        })),
      })),
    };
  }

  private async sendOneSubmission(
    submissionId: string,
    transport: ClearinghouseTransport,
    opts: { allowNonReady: boolean }
  ) {
    const submission = await this.prisma.claimSubmission.findUnique({ where: { id: submissionId } });
    if (!submission) throw new NotFoundException("Submission not found");
    if (!submission.batchId) throw new BadRequestException("Submission has no batch");
    if (!submission.x12Text?.trim()) throw new BadRequestException("Submission has no x12 text");

    if (!opts.allowNonReady && submission.status !== ClaimSubmissionStatus.READY_TO_SEND) {
      await this.prisma.claimSubmissionAttempt.create({
        data: {
          submissionId,
          transport: transport.key,
          ok: false,
          requestMetaJson: { skipped: true, reason: "STATUS_NOT_READY_TO_SEND" },
          responseMetaJson: { currentStatus: submission.status },
          errorMessage: "STATUS_NOT_READY_TO_SEND",
        },
      });
      return { submissionId, skipped: true, status: submission.status };
    }

    const result = await transport.send({
      facilityId: submission.facilityId,
      batchId: submission.batchId,
      submissionId: submission.id,
      x12Text: submission.x12Text,
      claimType: submission.claimType,
      transactionCtrl: submission.transactionCtrl,
    });

    const attempt = await this.prisma.claimSubmissionAttempt.create({
      data: {
        submissionId,
        transport: transport.key,
        ok: result.ok,
        requestMetaJson: result.requestMeta as Prisma.InputJsonValue,
        responseMetaJson: result.responseMeta as Prisma.InputJsonValue,
        errorMessage: result.errorMessage ?? null,
      },
    });

    let nextStatus = submission.status;
    if (result.ok && canTransition(submission.status, ClaimSubmissionStatus.SENT)) {
      nextStatus = ClaimSubmissionStatus.SENT;
      if (canTransition(nextStatus, ClaimSubmissionStatus.ACK_PENDING)) {
        nextStatus = ClaimSubmissionStatus.ACK_PENDING;
      }
    }

    const updated = await this.prisma.claimSubmission.update({
      where: { id: submissionId },
      data: {
        status: nextStatus,
        externalReference: result.externalReference ?? submission.externalReference,
      },
    });

    return { submissionId, attemptId: attempt.id, status: updated.status, ok: result.ok };
  }
}
