import { Injectable, NotFoundException } from "@nestjs/common";
import { ClaimSubmissionStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

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
  const accepted = ak9Code === "A" || ik5Code === "A";
  const rejected = ["R", "E"].includes(ak9Code ?? "") || ["R", "E"].includes(ik5Code ?? "");
  const statusCode = accepted ? "ACCEPTED" : rejected ? "REJECTED" : "UNKNOWN";
  return { statusCode, stCtrl, parsed: { ak9Code, ik5Code, stCtrl } };
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
  const statusCode = accepted ? "ACCEPTED" : rejected ? "REJECTED" : needsCorrection ? "NEEDS_CORRECTION" : "UNKNOWN";
  return { statusCode, trnRef, parsed: { stc: stcFirst, trnRef } };
}

function ackStatusToSubmissionStatus(s: string): ClaimSubmissionStatus | null {
  if (s === "ACCEPTED") return ClaimSubmissionStatus.ACCEPTED;
  if (s === "REJECTED") return ClaimSubmissionStatus.REJECTED;
  if (s === "NEEDS_CORRECTION") return ClaimSubmissionStatus.NEEDS_CORRECTION;
  return null;
}

@Injectable()
export class ClaimAcknowledgmentService {
  constructor(private readonly prisma: PrismaService) {}

  async ingestAcknowledgment(input: {
    facilityId: string;
    rawText: string;
    kind: AckKind;
    refs?: { submissionId?: string; batchId?: string; transactionCtrl?: string };
  }) {
    const parsed = input.kind === "999" ? parse999(input.rawText) : parse277ca(input.rawText);

    let submissionId = input.refs?.submissionId ?? null;
    let batchId = input.refs?.batchId ?? null;
    let warningCode: string | null = null;

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
    if (!submissionId && input.kind === "999" && "stCtrl" in parsed && parsed.stCtrl) {
      const found = await this.prisma.claimSubmission.findFirst({
        where: { facilityId: input.facilityId, transactionCtrl: parsed.stCtrl },
        select: { id: true, batchId: true },
      });
      if (found) {
        submissionId = found.id;
        batchId = found.batchId;
      }
    }
    if (!submissionId) {
      warningCode = "ACK_UNMATCHED";
    }

    const ack = await this.prisma.claimAcknowledgment.create({
      data: {
        facilityId: input.facilityId,
        submissionId,
        batchId: batchId ?? null,
        kind: input.kind,
        rawText: input.rawText,
        parsedJson: parsed.parsed,
        statusCode: parsed.statusCode,
        message: parsed.statusCode,
        warningCode,
      },
    });

    if (submissionId) {
      const next = ackStatusToSubmissionStatus(parsed.statusCode);
      if (next) {
        const existing = await this.prisma.claimSubmission.findUnique({ where: { id: submissionId } });
        if (existing && existing.status === ClaimSubmissionStatus.ACK_PENDING) {
          await this.prisma.claimSubmission.update({ where: { id: submissionId }, data: { status: next } });
        }
      }
    }

    return ack;
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
