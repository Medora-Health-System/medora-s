import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ClaimSubmissionStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { displayAckSourceFromParsedJson } from "./ack-inbound-parse.util";
import { scrubRecordForPersistence } from "./clearinghouse-audit.util";
import {
  getClearinghousePublicConfigStatus,
  loadClearinghouseConfig,
} from "./clearinghouse-config.util";
import type { ClearinghouseTransportHint } from "./clearinghouse-config.util";
import type { ClearinghouseTransport } from "./clearinghouse-transport.interface";
import { ClearinghouseTransportFactory } from "./clearinghouse-transport.factory";
import {
  isTerminalSubmissionStatus,
  nextStatusAfterSuccessfulSend,
  SubmissionTransitionReasonCode,
} from "./claim-submission-state-machine.util";

export type TransportKind = ClearinghouseTransportHint;

function sendSkipReason(current: ClaimSubmissionStatus): SubmissionTransitionReasonCode {
  if (isTerminalSubmissionStatus(current)) {
    return "TERMINAL_STATE_ALREADY_REACHED";
  }
  if (current === ClaimSubmissionStatus.SENT || current === ClaimSubmissionStatus.ACK_PENDING) {
    return "DUPLICATE_SEND_BLOCKED";
  }
  return "SEND_NOT_ALLOWED";
}

function lifecycleReasonFromParsedJson(parsedJson: Prisma.JsonValue | null): string | null {
  if (!parsedJson || typeof parsedJson !== "object" || Array.isArray(parsedJson)) return null;
  const rec = parsedJson as Record<string, unknown>;
  const lc = rec.lifecycle;
  if (!lc || typeof lc !== "object" || Array.isArray(lc)) return null;
  const r = (lc as Record<string, unknown>).reasonCode;
  return typeof r === "string" ? r : null;
}

@Injectable()
export class ClaimTransmissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clearinghouseTransportFactory: ClearinghouseTransportFactory
  ) {}

  getClearinghouseConfigStatus() {
    return getClearinghousePublicConfigStatus();
  }

  private resolveTransport(kind: TransportKind): ClearinghouseTransport {
    return this.clearinghouseTransportFactory.resolve(kind);
  }

  async sendSubmissionBatch(facilityId: string, batchId: string, transportKind: TransportKind = "MANUAL") {
    const transport = this.resolveTransport(transportKind);
    const batch = await this.prisma.claimSubmissionBatch.findFirst({
      where: { id: batchId, facilityId },
      include: { submissions: true },
    });
    if (!batch) throw new NotFoundException("Submission batch not found");
    const out = [];
    for (const s of batch.submissions) {
      out.push(await this.sendOneSubmission(s.id, transport, { allowNonReady: false }));
    }
    return {
      batchId,
      transport: transport.key,
      clearinghouse: getClearinghousePublicConfigStatus(),
      results: out,
    };
  }

  async sendEncounterSubmissions(facilityId: string, encounterId: string, transportKind: TransportKind = "MANUAL") {
    const transport = this.resolveTransport(transportKind);
    const submissions = await this.prisma.claimSubmission.findMany({
      where: { facilityId, encounterId },
      orderBy: { createdAt: "asc" },
    });
    const results = [];
    for (const s of submissions) {
      results.push(await this.sendOneSubmission(s.id, transport, { allowNonReady: false }));
    }
    return {
      facilityId,
      encounterId,
      transport: transport.key,
      clearinghouse: getClearinghousePublicConfigStatus(),
      results,
    };
  }

  async getSubmissionLifecycleDebug(facilityId: string, submissionId: string) {
    const sub = await this.prisma.claimSubmission.findFirst({
      where: { id: submissionId, facilityId },
      include: {
        attempts: { orderBy: { createdAt: "desc" } },
        acknowledgments: { orderBy: { receivedAt: "desc" } },
      },
    });
    if (!sub) throw new NotFoundException("Submission not found");
    const lastAck = sub.acknowledgments[0];
    return {
      submissionId: sub.id,
      currentStatus: sub.status,
      attempts: sub.attempts.map((a) => ({
        attemptId: a.id,
        transport: a.transport,
        status: a.ok ? "OK" : "FAILED",
        createdAt: a.createdAt,
        errorMessage: a.errorMessage,
      })),
      acknowledgments: sub.acknowledgments.map((ack) => ({
        ackId: ack.id,
        type: ack.kind,
        status: ack.statusCode,
        warningCode: ack.warningCode,
        lifecycleReason: lifecycleReasonFromParsedJson(ack.parsedJson),
        ackSource: displayAckSourceFromParsedJson(ack.parsedJson),
        receivedAt: ack.receivedAt,
        rawSummary: ack.rawText.slice(0, 140),
      })),
      lastTransitionReason: lastAck ? lifecycleReasonFromParsedJson(lastAck.parsedJson) : null,
    };
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
        lastTransitionReason: (() => {
          const first = s.acknowledgments[0];
          return first ? lifecycleReasonFromParsedJson(first.parsedJson) : null;
        })(),
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
          warningCode: ack.warningCode,
          lifecycleReason: lifecycleReasonFromParsedJson(ack.parsedJson),
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

    const cfgSnapshot = loadClearinghouseConfig();

    if (!opts.allowNonReady && submission.status !== ClaimSubmissionStatus.READY_TO_SEND) {
      const skipReason = sendSkipReason(submission.status);
      await this.prisma.claimSubmissionAttempt.create({
        data: {
          submissionId,
          transport: transport.key,
          ok: false,
          requestMetaJson: scrubRecordForPersistence({
            skipped: true,
            reason: skipReason,
            clearinghouseMode: cfgSnapshot.mode,
            transportHint: transport.key,
          }) as Prisma.InputJsonValue,
          responseMetaJson: scrubRecordForPersistence({ currentStatus: submission.status }) as Prisma.InputJsonValue,
          errorMessage: skipReason,
        },
      });
      return { submissionId, skipped: true, status: submission.status, skipReason };
    }

    const result = await transport.send({
      facilityId: submission.facilityId,
      batchId: submission.batchId,
      submissionId: submission.id,
      x12Text: submission.x12Text,
      claimType: submission.claimType,
      transactionCtrl: submission.transactionCtrl,
    });

    const rawRequest = {
      ...result.requestMeta,
      clearinghouseMode: cfgSnapshot.mode,
      transportHint: transport.key,
    };
    const rawResponse = {
      ...result.responseMeta,
      ...(result.transportMeta ? { transportMeta: result.transportMeta } : {}),
    };

    const attempt = await this.prisma.claimSubmissionAttempt.create({
      data: {
        submissionId,
        transport: transport.key,
        ok: result.ok,
        requestMetaJson: scrubRecordForPersistence(rawRequest) as Prisma.InputJsonValue,
        responseMetaJson: scrubRecordForPersistence(rawResponse) as Prisma.InputJsonValue,
        errorMessage: result.errorMessage ?? null,
      },
    });

    let nextStatus = submission.status;
    if (result.ok) {
      const t = nextStatusAfterSuccessfulSend(submission.status);
      if (t.next) {
        nextStatus = t.next;
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
