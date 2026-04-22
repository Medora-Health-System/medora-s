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
import { ClaimExportService } from "./claim-export.service";
import {
  classifyOutboundAttemptFailure,
  nextRetryAtForOutboundFailureOrdinal,
} from "./clearinghouse-retry-policy.util";
import { evaluateSubmissionGate } from "./claim-submission-gate.util";

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
    private readonly clearinghouseTransportFactory: ClearinghouseTransportFactory,
    private readonly claimExportService: ClaimExportService
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
    const exportSnapshot = await this.claimExportService.buildEncounterClaimExport(facilityId, sub.encounterId);
    const submissionGate = evaluateSubmissionGate(exportSnapshot.summary);
    const lastAck = sub.acknowledgments[0];
    return {
      submissionId: sub.id,
      currentStatus: sub.status,
      claimReady: submissionGate.claimReady,
      blockedByCompleteness: !submissionGate.allowed,
      submissionGateReasonCode: submissionGate.reasonCode,
      submissionGateBlockers: submissionGate.blockers,
      attempts: sub.attempts.map((a) => ({
        attemptId: a.id,
        transport: a.transport,
        status: a.ok ? "OK" : "FAILED",
        createdAt: a.createdAt,
        errorMessage: a.errorMessage,
        failureCode: a.failureCode,
        retryEligible: a.retryEligible,
        nextRetryAt: a.nextRetryAt,
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
    const exportSnapshot = await this.claimExportService.buildEncounterClaimExport(facilityId, encounterId);
    const submissionGate = evaluateSubmissionGate(exportSnapshot.summary);

    return {
      encounterId,
      claimReady: submissionGate.claimReady,
      blockedByCompleteness: !submissionGate.allowed,
      submissionGateReasonCode: submissionGate.reasonCode,
      submissionGateBlockers: submissionGate.blockers,
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
          failureCode: a.failureCode,
          retryEligible: a.retryEligible,
          nextRetryAt: a.nextRetryAt,
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
    opts: { allowNonReady: boolean; attemptTrigger?: "WORKER" | "MANUAL" | "BATCH"; retryFlow?: boolean }
  ) {
    const submission = await this.prisma.claimSubmission.findUnique({ where: { id: submissionId } });
    if (!submission) throw new NotFoundException("Submission not found");
    if (!submission.batchId) throw new BadRequestException("Submission has no batch");
    if (!submission.x12Text?.trim()) throw new BadRequestException("Submission has no x12 text");

    const cfgSnapshot = loadClearinghouseConfig();

    if (!opts.allowNonReady && submission.status !== ClaimSubmissionStatus.READY_TO_SEND) {
      const skipReason = sendSkipReason(submission.status);
      const skipClass = classifyOutboundAttemptFailure({ ok: false, skipped: true, skipReason });
      await this.prisma.claimSubmissionAttempt.create({
        data: {
          submissionId,
          transport: transport.key,
          ok: false,
          failureCode: skipClass.failureCode,
          retryEligible: false,
          nextRetryAt: null,
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
      return {
        submissionId,
        skipped: true,
        status: submission.status,
        skipReason,
        blockedByCompleteness: false,
        submissionGateReasonCode: skipReason,
        submissionGateBlockers: [],
        claimReady: null,
      };
    }

    const exportSnapshot = await this.claimExportService.buildEncounterClaimExport(submission.facilityId, submission.encounterId);
    const submissionGate = evaluateSubmissionGate(exportSnapshot.summary);
    if (!submissionGate.allowed) {
      const skipReason = opts.retryFlow ? "RETRY_SKIPPED_CLAIM_NOT_READY" : "SEND_BLOCKED_CLAIM_NOT_READY";
      const skipClass = classifyOutboundAttemptFailure({ ok: false, skipped: true, skipReason });
      await this.prisma.claimSubmissionAttempt.create({
        data: {
          submissionId,
          transport: transport.key,
          ok: false,
          failureCode: skipClass.failureCode,
          retryEligible: false,
          nextRetryAt: null,
          requestMetaJson: scrubRecordForPersistence({
            skipped: true,
            reason: skipReason,
            submissionGateReasonCode: submissionGate.reasonCode,
            submissionGateBlockers: submissionGate.blockers,
            claimReady: submissionGate.claimReady,
            blockedByCompleteness: true,
            clearinghouseMode: cfgSnapshot.mode,
            transportHint: transport.key,
            ...(opts.attemptTrigger ? { attemptTrigger: opts.attemptTrigger } : {}),
          }) as Prisma.InputJsonValue,
          responseMetaJson: scrubRecordForPersistence({
            currentStatus: submission.status,
            gate: submissionGate,
          }) as Prisma.InputJsonValue,
          errorMessage: skipReason,
        },
      });
      return {
        submissionId,
        skipped: true,
        status: submission.status,
        skipReason,
        blockedByCompleteness: true,
        submissionGateReasonCode: submissionGate.reasonCode,
        submissionGateBlockers: submissionGate.blockers,
        claimReady: submissionGate.claimReady,
      };
    }

    const priorRetryEligibleFailures = await this.prisma.claimSubmissionAttempt.count({
      where: { submissionId, ok: false, retryEligible: true },
    });

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
      ...(opts.attemptTrigger ? { attemptTrigger: opts.attemptTrigger } : {}),
    };
    const rawResponse = {
      ...result.responseMeta,
      ...(result.transportMeta ? { transportMeta: result.transportMeta } : {}),
    };

    const classified = classifyOutboundAttemptFailure({
      ok: result.ok,
      errorMessage: result.errorMessage,
    });
    let failureCode: string | null = classified.failureCode;
    let retryEligible = classified.retryEligible;
    let nextRetryAt: Date | null = null;
    if (!result.ok && classified.failureClass === "retryable") {
      const failureOrdinal = priorRetryEligibleFailures + 1;
      nextRetryAt = nextRetryAtForOutboundFailureOrdinal(failureOrdinal);
      if (!nextRetryAt) {
        retryEligible = false;
        failureCode = classified.failureCode ?? "RETRY_EXHAUSTED";
      }
    } else if (result.ok) {
      failureCode = null;
      retryEligible = false;
      nextRetryAt = null;
    }

    const attempt = await this.prisma.claimSubmissionAttempt.create({
      data: {
        submissionId,
        transport: transport.key,
        ok: result.ok,
        failureCode,
        retryEligible,
        nextRetryAt,
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

    return {
      submissionId,
      attemptId: attempt.id,
      status: updated.status,
      ok: result.ok,
      blockedByCompleteness: false,
      submissionGateReasonCode: submissionGate.reasonCode,
      submissionGateBlockers: submissionGate.blockers,
      claimReady: submissionGate.claimReady,
    };
  }

  /**
   * Operator-triggered resend for a submission whose last transport attempt failed in a retryable way.
   * Does not bypass READY_TO_SEND or the state machine.
   */
  async retrySubmissionSend(
    facilityId: string,
    submissionId: string,
    transportKind: TransportKind = "MANUAL",
    opts?: { attemptTrigger?: "WORKER" | "MANUAL" }
  ) {
    const sub = await this.prisma.claimSubmission.findFirst({
      where: { id: submissionId, facilityId },
      include: { attempts: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (!sub) throw new NotFoundException("Submission not found");
    if (sub.status !== ClaimSubmissionStatus.READY_TO_SEND) {
      throw new BadRequestException({
        code: "SUBMISSION_NOT_RETRYABLE_STATE",
        message: `Submission must be READY_TO_SEND to retry send (current: ${sub.status})`,
      });
    }
    const last = sub.attempts[0];
    if (!last || last.ok || !last.retryEligible) {
      throw new BadRequestException({
        code: "SUBMISSION_NOT_RETRY_ELIGIBLE",
        message: "Last attempt must be a failed, retry-eligible transport attempt",
      });
    }
    const transport = this.resolveTransport(transportKind);
    return this.sendOneSubmission(submissionId, transport, {
      allowNonReady: false,
      attemptTrigger: opts?.attemptTrigger ?? "MANUAL",
      retryFlow: true,
    });
  }
}
