import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ClaimAcknowledgment, ClaimSubmissionKind, ClaimSubmissionStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { scrubRecordForPersistence } from "./clearinghouse-audit.util";
import {
  computeAckDedupeKey,
  detectAckKindFromRaw,
  extractAk2TransactionControl,
  extractGsGroupControl,
  extractIsaInterchangeControl,
  extractTrnReference,
  normalizeAckRawText,
} from "./ack-inbound-parse.util";
import {
  ClaimAckOutcome,
  nextStatusFrom277CA,
  nextStatusFrom999Transport,
  SubmissionTransitionReasonCode,
} from "./claim-submission-state-machine.util";
import { ClearinghouseStabilizationService } from "./clearinghouse-stabilization.service";
import type { ClaimOperationalEventType } from "./claim-operational-event.constants";
import { ClaimOperationalEventService } from "./claim-operational-event.service";

type AckKind = "999" | "277CA";

function splitSegments(rawText: string): string[] {
  return rawText
    .split("~")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parse999(rawText: string) {
  const segs = splitSegments(rawText);
  const ak9 = segs.find((s) => s.startsWith("AK9*"));
  const ik5 = segs.find((s) => s.startsWith("IK5*"));
  const ak2 = segs.find((s) => s.startsWith("AK2*"));
  const stCtrl = ak2?.split("*")[2] ?? null;
  const ak9Code = ak9?.split("*")[1] ?? null;
  const ik5Code = ik5?.split("*")[1] ?? null;
  const transportAccept = ak9Code === "A" || ik5Code === "A";
  const transportReject = ["R", "E"].includes(ak9Code ?? "") || ["R", "E"].includes(ik5Code ?? "");
  const statusCode = transportAccept ? "TRANSPORT_ACCEPT" : transportReject ? "TRANSPORT_REJECT" : "UNKNOWN";
  return {
    statusCode,
    transportAccept,
    transportReject,
    stCtrl,
    parsed: { ak9Code, ik5Code, stCtrl },
  };
}

function parse277ca(rawText: string) {
  const segs = splitSegments(rawText);
  const stc = segs.find((s) => s.startsWith("STC*"));
  const trn = segs.find((s) => s.startsWith("TRN*"));
  const stcFirst = stc?.split("*")[1] ?? "";
  const trnRef = trn?.split("*")[2] ?? null;
  const upper = stcFirst.toUpperCase();
  const accepted = upper.includes("A1");
  const rejected = upper.includes("A3");
  const needsCorrection = upper.includes("A6") || upper.includes("A7");
  const statusCode = accepted ? "CLAIM_ACCEPTED" : rejected ? "CLAIM_REJECTED" : needsCorrection ? "NEEDS_CORRECTION" : "UNKNOWN";
  return { statusCode, trnRef, parsed: { stc: stcFirst, trnRef } };
}

/** Merge scrubbed vendor metadata into `parsedJson` for audit (adapters / webhooks). */
export function mergeVendorMetaIntoAckParsedJson(vendorMeta: Record<string, unknown>): Record<string, unknown> {
  return { vendorMeta: scrubRecordForPersistence(vendorMeta) };
}


function claimOutcomeFrom277(parsed: ReturnType<typeof parse277ca>): ClaimAckOutcome | null {
  const upper = (parsed.parsed.stc ?? "").toUpperCase();
  if (upper.includes("A1")) return "ACCEPTED";
  if (upper.includes("A3")) return "REJECTED";
  if (upper.includes("A6") || upper.includes("A7")) return "NEEDS_CORRECTION";
  return null;
}

export type IngestAcknowledgmentResult = {
  ack: ClaimAcknowledgment;
  previousStatus: ClaimSubmissionStatus | null;
  nextStatus: ClaimSubmissionStatus | null;
  statusChanged: boolean;
  reasonCode: SubmissionTransitionReasonCode;
  /** False when identical payload was already ingested (idempotent replay). */
  ackStored: boolean;
  outOfSequence: boolean;
  /** Phase 8.1 — explicit duplicate/replay outcome (omit when a new ACK row was stored). */
  ackStabilization?: {
    duplicateAckIgnored: true;
    reasonCode: "ACK_DUPLICATE_SAME_DEDUPE_KEY";
    priorAckId: string;
    dedupeKey: string;
  };
};

export type InboundAckDeadLetterListItem = {
  id: string;
  source: string;
  failureCode: string;
  failureDetail: string | null;
  createdAt: Date;
  replayedAt: Date | null;
  replayedToAckId: string | null;
  rawText: string;
};

export type InboundAckDeadLetterListResult = {
  items: InboundAckDeadLetterListItem[];
  summary: { openCount: number; replayedLast24hCount: number; returnedCount: number };
  filtersApplied: { replayed: "open" | "all" | "replayed"; source: string | null; failureCode: string | null; take: number };
};

export type ReplayInboundAckDeadLetterResult = IngestAcknowledgmentResult & {
  deadLetterReplay: { deadLetterId: string; replayedAt: string; replayedToAckId: string };
};

@Injectable()
export class ClaimAcknowledgmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clearinghouseStabilization: ClearinghouseStabilizationService,
    private readonly claimOperationalEventService: ClaimOperationalEventService
  ) {}

  async ingestAcknowledgment(input: {
    facilityId: string;
    rawText: string;
    kind: AckKind;
    refs?: { submissionId?: string; batchId?: string; transactionCtrl?: string; externalReference?: string };
    /** Optional envelope from clearinghouse adapter (webhook, SFTP poll, etc.) — scrubbed before persist. */
    vendorMeta?: Record<string, unknown>;
  }): Promise<IngestAcknowledgmentResult> {
    const normText = normalizeAckRawText(input.rawText);
    const dedupeKey = computeAckDedupeKey(input.facilityId, input.kind, normText);

    const recent = await this.prisma.claimAcknowledgment.findMany({
      where: { facilityId: input.facilityId, kind: input.kind },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    const priorDup = recent.find((c) => {
      const pj = c.parsedJson;
      if (!pj || typeof pj !== "object" || Array.isArray(pj)) return false;
      return (pj as Record<string, unknown>).dedupeKey === dedupeKey;
    });
    if (priorDup) {
      this.clearinghouseStabilization.recordDuplicateAckIgnored(input.facilityId);
      const sub = priorDup.submissionId
        ? await this.prisma.claimSubmission.findUnique({
            where: { id: priorDup.submissionId },
            select: { status: true, encounterId: true },
          })
        : null;
      void this.claimOperationalEventService.append({
        facilityId: input.facilityId,
        encounterId: sub?.encounterId ?? null,
        submissionId: priorDup.submissionId,
        batchId: priorDup.batchId,
        eventType: "ACK_DUPLICATE_IGNORED",
        claimType: null,
        statusBefore: sub?.status ?? null,
        statusAfter: sub?.status ?? null,
        reasonCode: "ACK_DUPLICATE_SAME_DEDUPE_KEY",
        message: "DUPLICATE_ACK_REPLAY_IGNORED",
        metadata: {
          priorAckId: priorDup.id,
          dedupeKey,
          kind: input.kind,
        },
      });
      return {
        ack: priorDup,
        previousStatus: sub?.status ?? null,
        nextStatus: sub?.status ?? null,
        statusChanged: false,
        reasonCode: "DUPLICATE_ACK_REPLAY_IGNORED",
        ackStored: false,
        outOfSequence: false,
        ackStabilization: {
          duplicateAckIgnored: true,
          reasonCode: "ACK_DUPLICATE_SAME_DEDUPE_KEY",
          priorAckId: priorDup.id,
          dedupeKey,
        },
      };
    }

    const parsed999 = input.kind === "999" ? parse999(normText) : null;
    const parsed277 = input.kind === "277CA" ? parse277ca(normText) : null;

    let submissionId = input.refs?.submissionId ?? null;
    let batchId = input.refs?.batchId ?? null;
    let unmatchedWarning: string | null = null;
    let correlationMatchMethod: string | null = submissionId ? "EXPLICIT_SUBMISSION_ID" : null;

    if (!submissionId && input.refs?.externalReference?.trim()) {
      const ref = input.refs.externalReference.trim();
      const matches = await this.prisma.claimSubmission.findMany({
        where: { facilityId: input.facilityId, externalReference: ref },
        select: { id: true, batchId: true },
      });
      if (matches.length === 1) {
        submissionId = matches[0]!.id;
        batchId = matches[0]!.batchId;
        correlationMatchMethod = "EXTERNAL_REFERENCE";
      } else if (matches.length > 1) {
        unmatchedWarning = "ACK_EXTERNAL_REF_AMBIGUOUS";
      }
    }

    if (!submissionId && input.refs?.transactionCtrl) {
      const found = await this.prisma.claimSubmission.findFirst({
        where: { facilityId: input.facilityId, transactionCtrl: input.refs.transactionCtrl },
        select: { id: true, batchId: true },
      });
      if (found) {
        submissionId = found.id;
        batchId = found.batchId;
        correlationMatchMethod = correlationMatchMethod ?? "REF_TRANSACTION_CTRL";
      }
    }
    if (!submissionId && parsed999?.stCtrl) {
      const found = await this.prisma.claimSubmission.findFirst({
        where: { facilityId: input.facilityId, transactionCtrl: parsed999.stCtrl },
        select: { id: true, batchId: true },
      });
      if (found) {
        submissionId = found.id;
        batchId = found.batchId;
        correlationMatchMethod = correlationMatchMethod ?? "X12_999_ST_CTRL";
      }
    }
    const trnRef = parsed277?.trnRef ?? extractTrnReference(normText);
    if (!submissionId && input.kind === "277CA" && trnRef) {
      const found = await this.prisma.claimSubmission.findFirst({
        where: { facilityId: input.facilityId, transactionCtrl: trnRef },
        select: { id: true, batchId: true },
      });
      if (found) {
        submissionId = found.id;
        batchId = found.batchId;
        correlationMatchMethod = correlationMatchMethod ?? "X12_277_TRN";
      }
    }

    const isa13 = extractIsaInterchangeControl(normText);
    if (!submissionId && isa13) {
      const b = await this.prisma.claimSubmissionBatch.findFirst({
        where: { facilityId: input.facilityId, interchangeCtrl: isa13 },
        include: { submissions: { orderBy: { createdAt: "asc" } } },
      });
      if (b) {
        if (b.submissions.length === 1) {
          submissionId = b.submissions[0].id;
          batchId = b.id;
          correlationMatchMethod = correlationMatchMethod ?? "X12_ISA_INTERCHANGE";
        } else {
          const trx =
            parsed999?.stCtrl ?? extractAk2TransactionControl(normText) ?? trnRef ?? input.refs?.transactionCtrl ?? null;
          if (trx) {
            const sub = b.submissions.find((s) => s.transactionCtrl === trx);
            if (sub) {
              submissionId = sub.id;
              batchId = b.id;
              correlationMatchMethod = correlationMatchMethod ?? "X12_ISA_PLUS_TRX";
            }
          }
        }
      }
    }

    const gs6 = extractGsGroupControl(normText);
    if (!submissionId && gs6) {
      const b = await this.prisma.claimSubmissionBatch.findFirst({
        where: { facilityId: input.facilityId, groupCtrl: gs6 },
        include: { submissions: { orderBy: { createdAt: "asc" } } },
      });
      if (b) {
        if (b.submissions.length === 1) {
          submissionId = b.submissions[0].id;
          batchId = b.id;
          correlationMatchMethod = "X12_GS_GROUP_CTRL";
        } else {
          const trx =
            parsed999?.stCtrl ?? extractAk2TransactionControl(normText) ?? trnRef ?? input.refs?.transactionCtrl ?? null;
          if (trx) {
            const sub = b.submissions.find((s) => s.transactionCtrl === trx);
            if (sub) {
              submissionId = sub.id;
              batchId = b.id;
              correlationMatchMethod = "X12_GS_GROUP_CTRL_PLUS_TRX";
            }
          }
        }
      }
    }

    if (!submissionId) {
      unmatchedWarning = "ACK_UNMATCHED";
    }

    const weakCorrelation =
      correlationMatchMethod === "EXTERNAL_REFERENCE" && !input.refs?.submissionId;

    const existing = submissionId
      ? await this.prisma.claimSubmission.findUnique({
          where: { id: submissionId },
          select: { status: true, facilityId: true, encounterId: true, claimType: true },
        })
      : null;

    if (existing && existing.facilityId !== input.facilityId) {
      submissionId = null;
      batchId = null;
      unmatchedWarning = "ACK_UNMATCHED";
    }

    const previousStatus = existing?.status ?? null;

    let reasonCode: SubmissionTransitionReasonCode = "OK";
    let proposedStatus: ClaimSubmissionStatus | null = null;
    let statusChanged = false;
    let outOfSequence = false;
    let lifecycleExtra: Record<string, unknown> = {};

    if (!submissionId || !existing) {
      reasonCode = "ACK_UNMATCHED";
      lifecycleExtra = { reasonCode: "ACK_UNMATCHED", previousStatus: null };
    } else if (input.kind === "999" && parsed999) {
      const t = nextStatusFrom999Transport(existing.status, parsed999.transportAccept);
      reasonCode = t.reason;
      proposedStatus = t.next;
      outOfSequence = t.reason === "ACK_OUT_OF_SEQUENCE";
      if (t.next && t.reason === "OK") {
        statusChanged = true;
      }
      lifecycleExtra = {
        kind: "999",
        transportAccept: parsed999.transportAccept,
        previousStatus: existing.status,
        proposedStatus,
        reasonCode: t.reason,
      };
    } else if (input.kind === "277CA" && parsed277) {
      const outcome = claimOutcomeFrom277(parsed277);
      if (!outcome) {
        reasonCode = "ACK_PARSE_INCONCLUSIVE";
        proposedStatus = null;
        lifecycleExtra = {
          kind: "277CA",
          previousStatus: existing.status,
          reasonCode,
        };
      } else {
        const t = nextStatusFrom277CA(existing.status, outcome);
        reasonCode = t.reason;
        proposedStatus = t.next;
        outOfSequence = t.reason === "ACK_OUT_OF_SEQUENCE";
        if (t.next && t.reason === "OK") {
          statusChanged = true;
        }
        lifecycleExtra = {
          kind: "277CA",
          claimOutcome: outcome,
          previousStatus: existing.status,
          proposedStatus,
          reasonCode: t.reason,
        };
      }
    }

    const statusCodeStr = input.kind === "999" ? parsed999!.statusCode : parsed277!.statusCode;

    const parsedBase =
      input.kind === "999"
        ? { ...parsed999!.parsed, transportAccept: parsed999!.transportAccept }
        : parsed277!.parsed;

    const mergedParsedRaw: Record<string, unknown> = {
      ...parsedBase,
      lifecycle: lifecycleExtra,
      dedupeKey,
      matchingHints: {
        isaInterchangeCtrl: isa13 ?? null,
        gsGroupCtrl: gs6 ?? null,
        trnRef: trnRef ?? null,
        ak2StCtrl: extractAk2TransactionControl(normText),
        correlationMatchMethod,
        weakCorrelation: weakCorrelation && submissionId ? true : false,
      },
    };
    if (input.vendorMeta) {
      Object.assign(mergedParsedRaw, mergeVendorMetaIntoAckParsedJson(input.vendorMeta as Record<string, unknown>));
    }
    const mergedParsed = mergedParsedRaw as Prisma.InputJsonValue;

    let warn =
      unmatchedWarning ??
      (!statusChanged && reasonCode !== "OK" && submissionId && existing ? reasonCode : null);
    if (!warn && weakCorrelation && submissionId && existing) {
      warn = "ACK_WEAK_CORRELATION";
    }

    const ack = await this.prisma.claimAcknowledgment.create({
      data: {
        facilityId: input.facilityId,
        submissionId,
        batchId: batchId ?? null,
        kind: input.kind,
        rawText: normText,
        parsedJson: mergedParsed,
        statusCode: statusCodeStr,
        message: statusCodeStr,
        warningCode: warn,
      },
    });

    if (submissionId && existing && proposedStatus && statusChanged) {
      await this.prisma.claimSubmission.update({
        where: { id: submissionId },
        data: { status: proposedStatus },
      });
    }

    const nextStatus: ClaimSubmissionStatus | null =
      statusChanged && proposedStatus ? proposedStatus : previousStatus;

    if (reasonCode === "ACK_PARSE_INCONCLUSIVE") {
      const src =
        input.vendorMeta && typeof (input.vendorMeta as Record<string, unknown>).source === "string"
          ? String((input.vendorMeta as Record<string, unknown>).source)
          : "INGEST";
      await this.recordInboundAckDeadLetter({
        facilityId: input.facilityId,
        rawText: normText,
        source: src,
        failureCode: "ACK_PARSE_INCONCLUSIVE",
        failureDetail: `ackId=${ack.id}`,
        vendorMeta: {
          ...(input.vendorMeta ?? {}),
          linkedAckId: ack.id,
          reasonCode,
        },
      });
    }

    const ackEventType: ClaimOperationalEventType = (() => {
      if (warn === "ACK_WEAK_CORRELATION") return "ACK_MATCH_WEAK";
      if (input.kind === "999" && parsed999?.transportReject) return "ACK_REJECTED";
      const o277 = parsed277 ? claimOutcomeFrom277(parsed277) : null;
      if (input.kind === "277CA" && o277 === "REJECTED") return "ACK_REJECTED";
      if (submissionId && existing) return "ACK_MATCHED";
      return "ACK_RECEIVED";
    })();

    void this.claimOperationalEventService.append({
      facilityId: input.facilityId,
      encounterId: existing?.encounterId ?? null,
      submissionId,
      batchId: batchId ?? null,
      eventType: ackEventType,
      claimType: existing?.claimType ?? null,
      statusBefore: previousStatus,
      statusAfter: nextStatus,
      reasonCode,
      message: statusCodeStr,
      metadata: scrubRecordForPersistence({
        ackId: ack.id,
        kind: input.kind,
        warningCode: warn,
        correlationMatchMethod,
        unmatched: !submissionId,
      }) as Record<string, unknown>,
    });

    return {
      ack,
      previousStatus,
      nextStatus,
      statusChanged,
      reasonCode,
      ackStored: true,
      outOfSequence,
    };
  }

  /**
   * Integration point for inbound clearinghouse delivery (file drop, webhook, polling job).
   * Delegates to `ingestAcknowledgment` — no duplicate parsing or direct status mutation outside the state machine.
   */
  async ingestClearinghouseInboundAcknowledgment(input: {
    facilityId: string;
    rawText: string;
    kind: AckKind;
    refs?: { submissionId?: string; batchId?: string; transactionCtrl?: string; externalReference?: string };
    vendorMeta?: Record<string, unknown>;
  }): Promise<IngestAcknowledgmentResult> {
    return this.ingestAcknowledgment(input);
  }

  /**
   * Inbound file/webhook path: optional AUTO kind — detects 999 vs 277 from ST segment.
   */
  async ingestInboundAckPayload(input: {
    facilityId: string;
    rawText: string;
    kind?: AckKind | "AUTO";
    refs?: { submissionId?: string; batchId?: string; transactionCtrl?: string; externalReference?: string };
    vendorMeta?: Record<string, unknown>;
  }): Promise<IngestAcknowledgmentResult> {
    const norm = normalizeAckRawText(input.rawText);
    const kind =
      input.kind === "AUTO" || input.kind === undefined ? detectAckKindFromRaw(norm) : input.kind;
    if (!kind) {
      throw new BadRequestException({
        code: "ACK_KIND_UNDETECTABLE",
        message: "Could not detect ST*999* or ST*277* in payload",
      });
    }
    return this.ingestAcknowledgment({
      facilityId: input.facilityId,
      rawText: input.rawText,
      kind,
      refs: input.refs,
      vendorMeta: input.vendorMeta,
    });
  }

  async getAcknowledgmentsForSubmission(facilityId: string, submissionId: string) {
    const exists = await this.prisma.claimSubmission.findFirst({
      where: { id: submissionId, facilityId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException("Submission not found");
    return this.prisma.claimAcknowledgment.findMany({
      where: { submissionId },
      orderBy: { createdAt: "desc" },
    });
  }

  async recordInboundAckDeadLetter(input: {
    facilityId: string;
    rawText: string;
    source: string;
    failureCode: string;
    failureDetail?: string;
    vendorMeta?: Record<string, unknown>;
  }) {
    const row = await this.prisma.claimAcknowledgmentDeadLetter.create({
      data: {
        facilityId: input.facilityId,
        rawText: input.rawText,
        source: input.source,
        failureCode: input.failureCode,
        failureDetail: input.failureDetail ?? null,
        ...(input.vendorMeta
          ? { vendorMeta: scrubRecordForPersistence(input.vendorMeta as Record<string, unknown>) as Prisma.InputJsonValue }
          : {}),
      },
    });
    void this.claimOperationalEventService.append({
      facilityId: input.facilityId,
      eventType: "DEAD_LETTER_CREATED",
      reasonCode: input.failureCode,
      message: input.source,
      metadata: {
        deadLetterId: row.id,
        source: input.source,
        rawTextChars: input.rawText.length,
      },
    });
    return row;
  }

  async listInboundAckDeadLetters(
    facilityId: string,
    opts?: {
      openOnly?: boolean;
      replayed?: "open" | "all" | "replayed";
      source?: string;
      failureCode?: string;
      take?: number;
    }
  ): Promise<InboundAckDeadLetterListResult> {
    const take = Math.min(opts?.take ?? 50, 200);
    const replayed = opts?.replayed ?? (opts?.openOnly === true ? "open" : "all");
    const where: Prisma.ClaimAcknowledgmentDeadLetterWhereInput = { facilityId };
    if (replayed === "open") where.replayedAt = null;
    if (replayed === "replayed") where.replayedAt = { not: null };
    if (opts?.source?.trim()) where.source = opts.source.trim();
    if (opts?.failureCode?.trim()) where.failureCode = opts.failureCode.trim();

    const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [items, openCount, replayedLast24hCount] = await Promise.all([
      this.prisma.claimAcknowledgmentDeadLetter.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        select: {
          id: true,
          source: true,
          failureCode: true,
          failureDetail: true,
          createdAt: true,
          replayedAt: true,
          replayedToAckId: true,
          rawText: true,
        },
      }),
      this.prisma.claimAcknowledgmentDeadLetter.count({ where: { facilityId, replayedAt: null } }),
      this.prisma.claimAcknowledgmentDeadLetter.count({
        where: { facilityId, replayedAt: { gte: since24 } },
      }),
    ]);

    return {
      items,
      summary: {
        openCount,
        replayedLast24hCount,
        returnedCount: items.length,
      },
      filtersApplied: {
        replayed,
        source: opts?.source?.trim() ?? null,
        failureCode: opts?.failureCode?.trim() ?? null,
        take,
      },
    };
  }

  async replayInboundAckDeadLetter(facilityId: string, deadLetterId: string): Promise<ReplayInboundAckDeadLetterResult> {
    const row = await this.prisma.claimAcknowledgmentDeadLetter.findFirst({
      where: { id: deadLetterId, facilityId, replayedAt: null },
    });
    if (!row) throw new NotFoundException("Dead letter not found or already replayed");
    const vm =
      row.vendorMeta && typeof row.vendorMeta === "object" && !Array.isArray(row.vendorMeta)
        ? (row.vendorMeta as Record<string, unknown>)
        : {};
    const result = await this.ingestInboundAckPayload({
      facilityId,
      rawText: row.rawText,
      kind: "AUTO",
      vendorMeta: {
        ...vm,
        source: "DEAD_LETTER_REPLAY",
        deadLetterId: row.id,
        replayedAt: new Date().toISOString(),
      },
    });
    const replayedAt = new Date();
    await this.prisma.claimAcknowledgmentDeadLetter.update({
      where: { id: row.id },
      data: { replayedAt, replayedToAckId: result.ack.id },
    });
    this.clearinghouseStabilization.recordDeadLetterReplayed(facilityId);
    let encounterId: string | null = null;
    let claimType: ClaimSubmissionKind | null = null;
    if (result.ack.submissionId) {
      const s = await this.prisma.claimSubmission.findUnique({
        where: { id: result.ack.submissionId },
        select: { encounterId: true, claimType: true },
      });
      encounterId = s?.encounterId ?? null;
      claimType = s?.claimType ?? null;
    }
    void this.claimOperationalEventService.append({
      facilityId,
      encounterId,
      submissionId: result.ack.submissionId,
      batchId: result.ack.batchId,
      claimType,
      eventType: "DEAD_LETTER_REPLAYED",
      metadata: { deadLetterId: row.id, ackId: result.ack.id },
    });
    return {
      ...result,
      deadLetterReplay: {
        deadLetterId: row.id,
        replayedAt: replayedAt.toISOString(),
        replayedToAckId: result.ack.id,
      },
    };
  }
}
