import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ClaimSubmissionKind, ClaimSubmissionStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { displayAckSourceFromParsedJson } from "./ack-inbound-parse.util";
import { scrubRecordForPersistence } from "./clearinghouse-audit.util";
import {
  clearinghouseIntegrationTier,
  clearinghouseLiveSendExplicitlyEnabled,
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
import { evaluateSubmissionGate, type SubmissionGateScope } from "./claim-submission-gate.util";
import {
  evaluateOutboundSendIdempotency,
  stabilizationMetaFromBlock,
  stabilizationOkFields,
  stabilizationResponseFlagsForCode,
} from "./claim-send-idempotency.util";
import { ClearinghouseStabilizationService } from "./clearinghouse-stabilization.service";
import { operationalEventTypeForOutboundBlockCode } from "./claim-operational-event.constants";
import { ClaimOperationalEventService } from "./claim-operational-event.service";
import type { AppendClaimOperationalEventInput } from "./claim-operational-event.service";

export type TransportKind = ClearinghouseTransportHint;

function summarizeBatchSendResults(
  results: Array<{ ok?: boolean; sideSkipped?: boolean }>,
  extras?: { batchTruncated?: boolean; batchTotalBeforeTruncation?: number; batchProcessedCount?: number }
) {
  let transportSucceeded = 0;
  let transportFailed = 0;
  let sideSkippedCount = 0;
  for (const r of results) {
    if (r.sideSkipped === true) sideSkippedCount += 1;
    if (r.ok === true) transportSucceeded += 1;
    if (r.ok === false && r.sideSkipped !== true) transportFailed += 1;
  }
  return {
    submissionCount: results.length,
    transportSucceeded,
    transportFailed,
    sideSkipped: sideSkippedCount,
    batchTruncated: extras?.batchTruncated ?? false,
    batchTotalBeforeTruncation: extras?.batchTotalBeforeTruncation ?? results.length,
    batchProcessedCount: extras?.batchProcessedCount ?? results.length,
  };
}

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
    private readonly claimExportService: ClaimExportService,
    private readonly clearinghouseStabilization: ClearinghouseStabilizationService,
    private readonly claimOperationalEventService: ClaimOperationalEventService
  ) {}

  private submissionGateScopeForKind(claimType: ClaimSubmissionKind): SubmissionGateScope {
    if (claimType === ClaimSubmissionKind.FACILITY_837I) return "facility";
    if (claimType === ClaimSubmissionKind.PROFESSIONAL_837P) return "professional";
    return "encounter";
  }

  getClearinghouseConfigStatus() {
    return getClearinghousePublicConfigStatus();
  }

  /**
   * Send a single persisted submission row (837P or 837I). Gate and lifecycle are evaluated for that row only.
   */
  async sendSubmission(facilityId: string, submissionId: string, transportKind: TransportKind = "MANUAL") {
    const sub = await this.prisma.claimSubmission.findFirst({ where: { id: submissionId, facilityId } });
    if (!sub) throw new NotFoundException("Submission not found");
    const transport = this.resolveTransport(transportKind);
    return this.sendOneSubmission(submissionId, transport, {
      allowNonReady: false,
      attemptTrigger: "MANUAL",
    });
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
    const limit = this.clearinghouseStabilization.getPacingConfigPublic().batchSendLimit;
    const allSubs = batch.submissions;
    const slice = allSubs.slice(0, Math.max(1, limit));
    const out = [];
    for (const s of slice) {
      out.push(await this.sendOneSubmission(s.id, transport, { allowNonReady: false, attemptTrigger: "BATCH" }));
    }
    return {
      batchId,
      transport: transport.key,
      clearinghouse: getClearinghousePublicConfigStatus(),
      results: out,
      batchSummary: summarizeBatchSendResults(out, {
        batchTruncated: allSubs.length > slice.length,
        batchTotalBeforeTruncation: allSubs.length,
        batchProcessedCount: slice.length,
      }),
    };
  }

  async sendEncounterSubmissions(facilityId: string, encounterId: string, transportKind: TransportKind = "MANUAL") {
    const transport = this.resolveTransport(transportKind);
    const submissions = await this.prisma.claimSubmission.findMany({
      where: { facilityId, encounterId },
      orderBy: { createdAt: "asc" },
    });
    const limit = this.clearinghouseStabilization.getPacingConfigPublic().batchSendLimit;
    const slice = submissions.slice(0, Math.max(1, limit));
    const results = [];
    for (const s of slice) {
      results.push(await this.sendOneSubmission(s.id, transport, { allowNonReady: false, attemptTrigger: "BATCH" }));
    }
    return {
      facilityId,
      encounterId,
      transport: transport.key,
      clearinghouse: getClearinghousePublicConfigStatus(),
      results,
      batchSummary: summarizeBatchSendResults(results, {
        batchTruncated: submissions.length > slice.length,
        batchTotalBeforeTruncation: submissions.length,
        batchProcessedCount: slice.length,
      }),
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
    const submissionGateEncounter = evaluateSubmissionGate(exportSnapshot.summary, "encounter");
    const submissionGateForSend = evaluateSubmissionGate(
      exportSnapshot.summary,
      this.submissionGateScopeForKind(sub.claimType)
    );
    const lastAck = sub.acknowledgments[0];
    return {
      submissionId: sub.id,
      claimType: sub.claimType,
      currentStatus: sub.status,
      claimReady: submissionGateEncounter.claimReady,
      blockedByCompleteness: !submissionGateEncounter.allowed,
      submissionGateReasonCode: submissionGateEncounter.reasonCode,
      submissionGateBlockers: submissionGateEncounter.blockers,
      submissionGateScope: this.submissionGateScopeForKind(sub.claimType),
      submissionSideGateAllowed: submissionGateForSend.allowed,
      submissionSideGateReasonCode: submissionGateForSend.reasonCode,
      submissionSideGateBlockers: submissionGateForSend.blockers,
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
    const submissionGate = evaluateSubmissionGate(exportSnapshot.summary, "encounter");

    return {
      encounterId,
      claimReady: submissionGate.claimReady,
      blockedByCompleteness: !submissionGate.allowed,
      submissionGateReasonCode: submissionGate.reasonCode,
      submissionGateBlockers: submissionGate.blockers,
      submissions: submissions.map((s) => {
        const sideGate = evaluateSubmissionGate(exportSnapshot.summary, this.submissionGateScopeForKind(s.claimType));
        return {
        lastTransitionReason: (() => {
          const first = s.acknowledgments[0];
          return first ? lifecycleReasonFromParsedJson(first.parsedJson) : null;
        })(),
        submissionId: s.id,
        claimType: s.claimType,
        type: s.claimType === "PROFESSIONAL_837P" ? "837P" : "837I",
        submissionGateScope: this.submissionGateScopeForKind(s.claimType),
        submissionSideGateAllowed: sideGate.allowed,
        submissionSideGateReasonCode: sideGate.reasonCode,
        submissionSideGateBlockers: sideGate.blockers,
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
      };
      }),
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
      const att = await this.prisma.claimSubmissionAttempt.create({
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
            ...(opts.attemptTrigger ? { attemptTrigger: opts.attemptTrigger } : {}),
          }) as Prisma.InputJsonValue,
          responseMetaJson: scrubRecordForPersistence({ currentStatus: submission.status }) as Prisma.InputJsonValue,
          errorMessage: skipReason,
        },
      });
      this.emitSubmissionOperational(submission, {
        eventType: skipReason === "DUPLICATE_SEND_BLOCKED" ? "SEND_BLOCKED_DUPLICATE" : "SEND_ATTEMPT_FAILED",
        statusBefore: submission.status,
        statusAfter: submission.status,
        reasonCode: skipReason,
        message: skipReason,
        metadata: {
          attemptId: att.id,
          transport: transport.key,
          attemptTrigger: opts.attemptTrigger ?? null,
        },
      });
      return {
        submissionId,
        claimType: submission.claimType,
        skipped: true,
        status: submission.status,
        skipReason,
        blockedByCompleteness: false,
        submissionGateReasonCode: skipReason,
        submissionGateBlockers: [],
        claimReady: null,
        sideGateAllowed: null,
        sideGateReasonCode: null,
        sideGateBlockers: [] as string[],
        sideSent: false,
        sideSkipped: true,
        sideRetryEligible: false,
        ...stabilizationResponseFlagsForCode(skipReason),
      };
    }

    const exportSnapshot = await this.claimExportService.buildEncounterClaimExport(submission.facilityId, submission.encounterId);
    const submissionGate = evaluateSubmissionGate(
      exportSnapshot.summary,
      this.submissionGateScopeForKind(submission.claimType)
    );
    if (!submissionGate.allowed) {
      const skipReason = opts.retryFlow ? "RETRY_SKIPPED_CLAIM_NOT_READY" : "SEND_BLOCKED_CLAIM_NOT_READY";
      const skipClass = classifyOutboundAttemptFailure({ ok: false, skipped: true, skipReason });
      const att = await this.prisma.claimSubmissionAttempt.create({
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
      this.emitSubmissionOperational(submission, {
        eventType: opts.retryFlow ? "RETRY_SKIPPED" : "SEND_ATTEMPT_FAILED",
        statusBefore: submission.status,
        statusAfter: submission.status,
        reasonCode: skipReason,
        message: skipReason,
        metadata: {
          attemptId: att.id,
          transport: transport.key,
          submissionGateReasonCode: submissionGate.reasonCode,
          attemptTrigger: opts.attemptTrigger ?? null,
        },
      });
      return {
        submissionId,
        claimType: submission.claimType,
        skipped: true,
        status: submission.status,
        skipReason,
        blockedByCompleteness: true,
        submissionGateReasonCode: submissionGate.reasonCode,
        submissionGateBlockers: submissionGate.blockers,
        claimReady: submissionGate.claimReady,
        sideGateAllowed: submissionGate.allowed,
        sideGateReasonCode: submissionGate.reasonCode,
        sideGateBlockers: submissionGate.blockers,
        sideSent: false,
        sideSkipped: true,
        sideRetryEligible: false,
        ...stabilizationOkFields(),
      };
    }

    const idemp = await evaluateOutboundSendIdempotency(this.prisma, {
      submissionId,
      transportKey: transport.key,
      now: new Date(),
      retryFlow: opts.retryFlow === true,
      submission: { status: submission.status, externalReference: submission.externalReference },
    });
    if (!idemp.allowed) {
      const skipReason = idemp.code;
      this.clearinghouseStabilization.recordOutboundDuplicateSendDbBlock(submission.facilityId);
      const skipClass = classifyOutboundAttemptFailure({ ok: false, skipped: true, skipReason });
      const att = await this.prisma.claimSubmissionAttempt.create({
        data: {
          submissionId,
          transport: transport.key,
          ok: false,
          failureCode: skipClass.failureCode,
          retryEligible: false,
          nextRetryAt: null,
          requestMetaJson: scrubRecordForPersistence({
            ...stabilizationMetaFromBlock(skipReason),
            clearinghouseMode: cfgSnapshot.mode,
            transportHint: transport.key,
            ...(opts.attemptTrigger ? { attemptTrigger: opts.attemptTrigger } : {}),
          }) as Prisma.InputJsonValue,
          responseMetaJson: scrubRecordForPersistence({ currentStatus: submission.status }) as Prisma.InputJsonValue,
          errorMessage: skipReason,
        },
      });
      this.emitSubmissionOperational(submission, {
        eventType: "SEND_BLOCKED_DUPLICATE",
        statusBefore: submission.status,
        statusAfter: submission.status,
        reasonCode: skipReason,
        message: skipReason,
        metadata: { attemptId: att.id, transport: transport.key, blockSource: "idempotency" },
      });
      return {
        submissionId,
        claimType: submission.claimType,
        skipped: true,
        status: submission.status,
        skipReason,
        blockedByCompleteness: false,
        submissionGateReasonCode: submissionGate.reasonCode,
        submissionGateBlockers: submissionGate.blockers,
        claimReady: submissionGate.claimReady,
        sideGateAllowed: submissionGate.allowed,
        sideGateReasonCode: submissionGate.reasonCode,
        sideGateBlockers: submissionGate.blockers,
        sideSent: false,
        sideSkipped: true,
        sideRetryEligible: false,
        ...stabilizationResponseFlagsForCode(skipReason),
      };
    }

    const slot = this.clearinghouseStabilization.acquireOutboundSlot(
      submission.facilityId,
      submissionId,
      transport.key
    );
    if (!slot.allowed) {
      const skipReason = slot.code;
      const skipClass = classifyOutboundAttemptFailure({ ok: false, skipped: true, skipReason });
      const att = await this.prisma.claimSubmissionAttempt.create({
        data: {
          submissionId,
          transport: transport.key,
          ok: false,
          failureCode: skipClass.failureCode,
          retryEligible: false,
          nextRetryAt: null,
          requestMetaJson: scrubRecordForPersistence({
            ...stabilizationMetaFromBlock(skipReason),
            clearinghouseMode: cfgSnapshot.mode,
            transportHint: transport.key,
            ...(opts.attemptTrigger ? { attemptTrigger: opts.attemptTrigger } : {}),
          }) as Prisma.InputJsonValue,
          responseMetaJson: scrubRecordForPersistence({ currentStatus: submission.status }) as Prisma.InputJsonValue,
          errorMessage: skipReason,
        },
      });
      this.emitSubmissionOperational(submission, {
        eventType: operationalEventTypeForOutboundBlockCode(skipReason),
        statusBefore: submission.status,
        statusAfter: submission.status,
        reasonCode: skipReason,
        message: skipReason,
        metadata: { attemptId: att.id, transport: transport.key, blockSource: "pacing" },
      });
      return {
        submissionId,
        claimType: submission.claimType,
        skipped: true,
        status: submission.status,
        skipReason,
        blockedByCompleteness: false,
        submissionGateReasonCode: submissionGate.reasonCode,
        submissionGateBlockers: submissionGate.blockers,
        claimReady: submissionGate.claimReady,
        sideGateAllowed: submissionGate.allowed,
        sideGateReasonCode: submissionGate.reasonCode,
        sideGateBlockers: submissionGate.blockers,
        sideSent: false,
        sideSkipped: true,
        sideRetryEligible: false,
        ...stabilizationResponseFlagsForCode(skipReason),
      };
    }

    let releaseOutcome: "completed" | "aborted_before_transport" = "completed";
    try {
      const priorRetryEligibleFailures = await this.prisma.claimSubmissionAttempt.count({
        where: { submissionId, ok: false, retryEligible: true },
      });

      this.emitSubmissionOperational(submission, {
        eventType: "SEND_ATTEMPT_STARTED",
        statusBefore: submission.status,
        statusAfter: submission.status,
        metadata: {
          transport: transport.key,
          attemptTrigger: opts.attemptTrigger ?? null,
        },
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
        integrationTier: clearinghouseIntegrationTier(cfgSnapshot.mode),
        liveSendExplicitlyEnabled: clearinghouseLiveSendExplicitlyEnabled(),
        transportHint: transport.key,
        claimType: submission.claimType,
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

      if (transport.key === "LIVE_API" || transport.key === "LIVE_SFTP") {
        if (result.ok) this.clearinghouseStabilization.recordLiveTransportSuccess(submission.facilityId);
        else this.clearinghouseStabilization.recordLiveTransportFailure(submission.facilityId);
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

      this.emitSubmissionOperational(submission, {
        eventType: result.ok ? "SEND_ATTEMPT_SUCCEEDED" : "SEND_ATTEMPT_FAILED",
        statusBefore: submission.status,
        statusAfter: updated.status,
        reasonCode: failureCode,
        message: result.errorMessage ?? (result.ok ? null : failureCode),
        metadata: {
          attemptId: attempt.id,
          transport: transport.key,
          retryEligible,
          nextRetryAt: nextRetryAt?.toISOString() ?? null,
          attemptTrigger: opts.attemptTrigger ?? null,
        },
      });
      if (!result.ok && nextRetryAt) {
        this.emitSubmissionOperational(submission, {
          eventType: "RETRY_SCHEDULED",
          statusBefore: updated.status,
          statusAfter: updated.status,
          reasonCode: failureCode,
          metadata: {
            attemptId: attempt.id,
            nextRetryAt: nextRetryAt.toISOString(),
            transport: transport.key,
          },
        });
      }

      return {
        submissionId,
        claimType: submission.claimType,
        attemptId: attempt.id,
        status: updated.status,
        ok: result.ok,
        blockedByCompleteness: false,
        submissionGateReasonCode: submissionGate.reasonCode,
        submissionGateBlockers: submissionGate.blockers,
        claimReady: submissionGate.claimReady,
        sideGateAllowed: submissionGate.allowed,
        sideGateReasonCode: submissionGate.reasonCode,
        sideGateBlockers: submissionGate.blockers,
        sideSent: result.ok,
        sideSkipped: false,
        sideRetryEligible: !result.ok && retryEligible,
        ...stabilizationOkFields(),
      };
    } catch (e) {
      releaseOutcome = "aborted_before_transport";
      throw e;
    } finally {
      slot.release(releaseOutcome);
    }
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

  private emitSubmissionOperational(
    submission: {
      id: string;
      facilityId: string;
      encounterId: string;
      claimType: ClaimSubmissionKind;
      batchId: string | null;
      status: ClaimSubmissionStatus;
    },
    partial: Omit<AppendClaimOperationalEventInput, "facilityId" | "encounterId" | "submissionId" | "batchId" | "claimType">
  ): void {
    void this.claimOperationalEventService.append({
      facilityId: submission.facilityId,
      encounterId: submission.encounterId,
      submissionId: submission.id,
      batchId: submission.batchId,
      claimType: submission.claimType,
      ...partial,
    });
  }
}
