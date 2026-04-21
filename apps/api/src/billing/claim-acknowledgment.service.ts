import { Injectable, NotFoundException } from "@nestjs/common";
import { ClaimAcknowledgment, ClaimSubmissionStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { scrubRecordForPersistence } from "./clearinghouse-audit.util";
import {
  ClaimAckOutcome,
  nextStatusFrom277CA,
  nextStatusFrom999Transport,
  SubmissionTransitionReasonCode,
} from "./claim-submission-state-machine.util";

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
  ackStored: true;
  outOfSequence: boolean;
};

@Injectable()
export class ClaimAcknowledgmentService {
  constructor(private readonly prisma: PrismaService) {}

  async ingestAcknowledgment(input: {
    facilityId: string;
    rawText: string;
    kind: AckKind;
    refs?: { submissionId?: string; batchId?: string; transactionCtrl?: string };
    /** Optional envelope from clearinghouse adapter (webhook, SFTP poll, etc.) — scrubbed before persist. */
    vendorMeta?: Record<string, unknown>;
  }): Promise<IngestAcknowledgmentResult> {
    const parsed999 = input.kind === "999" ? parse999(input.rawText) : null;
    const parsed277 = input.kind === "277CA" ? parse277ca(input.rawText) : null;

    let submissionId = input.refs?.submissionId ?? null;
    let batchId = input.refs?.batchId ?? null;
    let unmatchedWarning: string | null = null;

    if (!submissionId && input.refs?.transactionCtrl) {
      const found = await this.prisma.claimSubmission.findFirst({
        where: { facilityId: input.facilityId, transactionCtrl: input.refs.transactionCtrl },
        select: { id: true, batchId: true },
      });
      if (found) {
        submissionId = found.id;
        batchId = found.batchId;
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
      }
    }
    if (!submissionId) {
      unmatchedWarning = "ACK_UNMATCHED";
    }

    const existing = submissionId
      ? await this.prisma.claimSubmission.findUnique({
          where: { id: submissionId },
          select: { status: true, facilityId: true },
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
    };
    if (input.vendorMeta) {
      Object.assign(mergedParsedRaw, mergeVendorMetaIntoAckParsedJson(input.vendorMeta as Record<string, unknown>));
    }
    const mergedParsed = mergedParsedRaw as Prisma.InputJsonValue;

    const warn =
      unmatchedWarning ??
      (!statusChanged && reasonCode !== "OK" && submissionId && existing ? reasonCode : null);

    const ack = await this.prisma.claimAcknowledgment.create({
      data: {
        facilityId: input.facilityId,
        submissionId,
        batchId: batchId ?? null,
        kind: input.kind,
        rawText: input.rawText,
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
    refs?: { submissionId?: string; batchId?: string; transactionCtrl?: string };
    vendorMeta?: Record<string, unknown>;
  }): Promise<IngestAcknowledgmentResult> {
    return this.ingestAcknowledgment(input);
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
}
