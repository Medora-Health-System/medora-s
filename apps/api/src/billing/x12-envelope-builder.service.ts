import { Injectable } from "@nestjs/common";
import type { X12Segment } from "@medora/shared";
import { x12SegmentsToText } from "./x12-segment-builder.util";

const GS_VER_PROF = "005010X222";
const GS_VER_INST = "005010X223";

export type EnvelopeTransactionInput = {
  kind: "837P" | "837I";
  segments: X12Segment[];
  transactionControl: string;
};

export type BuiltInterchangeResult = {
  fullText: string;
  warnings: string[];
  /** One entry per input, same order — ST…SE text for that transaction only. */
  transactionBodies: { kind: "837P" | "837I"; text: string }[];
};

function padIsa15(value: string): string {
  const v = value.replace(/[\n\r*~^|]/g, " ").trim() || "UNKNOWN";
  return v.length > 15 ? v.slice(0, 15) : v.padEnd(15, " ");
}

function yyMmDd(d: Date): string {
  const y = String(d.getUTCFullYear()).slice(-2);
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function hhMm(d: Date): string {
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}${mm}`;
}

function yyyymmdd(d: Date): string {
  const y = String(d.getUTCFullYear());
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function hhmmss(d: Date): string {
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${hh}${mm}${ss}`;
}

/** Rewrite ST/SE transaction set reference and SE segment count (inclusive ST…SE). */
export function rewriteTransactionStSe(segments: X12Segment[], transactionControl: string): X12Segment[] {
  const tc = transactionControl.slice(0, 9);
  let stIdx = -1;
  let seIdx = -1;
  for (let i = 0; i < segments.length; i++) {
    if (segments[i]!.tag === "ST") stIdx = i;
    if (segments[i]!.tag === "SE") seIdx = i;
  }
  if (stIdx < 0 || seIdx < 0 || seIdx < stIdx) {
    return segments.map((s) => ({ tag: s.tag, elements: [...s.elements] }));
  }
  const out = segments.map((s) => ({ tag: s.tag, elements: [...s.elements] }));
  const st = out[stIdx]!;
  if (st.elements.length >= 2) st.elements[1] = tc;
  const inclusive = seIdx - stIdx + 1;
  const se = out[seIdx]!;
  if (se.elements.length >= 1) se.elements[0] = String(inclusive);
  if (se.elements.length >= 2) se.elements[1] = tc;
  return out;
}

function buildIsaLine(params: {
  interchangeCtrl: string;
  sender15: string;
  receiver15: string;
  now: Date;
}): string {
  const isa02 = "".padEnd(10, " ");
  const isa04 = "".padEnd(10, " ");
  const parts = [
    "ISA",
    "00",
    isa02,
    "00",
    isa04,
    "ZZ",
    padIsa15(params.sender15),
    "ZZ",
    padIsa15(params.receiver15),
    yyMmDd(params.now),
    hhMm(params.now),
    "^",
    "00501",
    params.interchangeCtrl,
    "0",
    "P",
    ":",
  ];
  return `${parts.join("*")}~`;
}

function buildGsLine(params: {
  sender: string;
  receiver: string;
  groupCtrl: string;
  gsVersion: string;
  now: Date;
}): string {
  const g2 = params.sender.slice(0, 15);
  const g3 = params.receiver.slice(0, 15);
  const parts = ["GS", "HC", g2, g3, yyyymmdd(params.now), hhmmss(params.now), params.groupCtrl, "X", params.gsVersion];
  return `${parts.join("*")}~`;
}

function buildGeLine(transactionSetCount: number, groupCtrl: string): string {
  return `GE*${transactionSetCount}*${groupCtrl}~`;
}

function buildIeaLine(functionalGroupCount: number, interchangeCtrl: string): string {
  return `IEA*${functionalGroupCount}*${interchangeCtrl}~`;
}

@Injectable()
export class X12EnvelopeBuilderService {
  /**
   * Builds ISA + one GS…GE per 837 kind (P vs I separate groups) + IEA.
   * Multiple ST…SE sets of the same kind can share one GS (future); v1 passes one ST per kind max from caller.
   */
  buildInterchange(params: {
    interchangeCtrl: string;
    senderId: string;
    receiverId: string;
    transactions: EnvelopeTransactionInput[];
    groupControls: string[];
    now?: Date;
  }): BuiltInterchangeResult {
    const warnings: string[] = [];
    const sender = params.senderId.trim() || "MEDORA_SENDER_PLACEHOLDER";
    const receiver = params.receiverId.trim() || "MEDORA_RECEIVER_PLACEHOLDER";
    if (!params.senderId.trim()) warnings.push("X12_ENVELOPE_SENDER_ID_PLACEHOLDER");
    if (!params.receiverId.trim()) warnings.push("X12_ENVELOPE_RECEIVER_ID_PLACEHOLDER");

    const now = params.now ?? new Date();
    const profTxs = params.transactions.filter((t) => t.kind === "837P");
    const instTxs = params.transactions.filter((t) => t.kind === "837I");

    if (profTxs.length + instTxs.length !== params.transactions.length) {
      warnings.push("X12_ENVELOPE_UNKNOWN_TRANSACTION_KIND");
    }

    const groups: { kind: "837P" | "837I"; txs: EnvelopeTransactionInput[]; gsVer: string }[] = [];
    if (profTxs.length > 0) {
      groups.push({ kind: "837P", txs: profTxs, gsVer: GS_VER_PROF });
    }
    if (instTxs.length > 0) {
      groups.push({ kind: "837I", txs: instTxs, gsVer: GS_VER_INST });
    }

    if (groups.length === 0) {
      return { fullText: "", warnings: ["X12_ENVELOPE_NO_TRANSACTIONS"], transactionBodies: [] };
    }

    if (params.groupControls.length < groups.length) {
      warnings.push("X12_ENVELOPE_GROUP_CTRL_MISMATCH");
    }

    const transactionBodies: { kind: "837P" | "837I"; text: string }[] = [];
    const chunkLines: string[] = [];

    chunkLines.push(
      buildIsaLine({
        interchangeCtrl: params.interchangeCtrl,
        sender15: sender,
        receiver15: receiver,
        now,
      })
    );

    for (let groupNum = 0; groupNum < groups.length; groupNum++) {
      const g = groups[groupNum]!;
      const groupCtrl = params.groupControls[groupNum] ?? params.interchangeCtrl;
      chunkLines.push(
        buildGsLine({
          sender,
          receiver,
          groupCtrl,
          gsVersion: g.gsVer,
          now,
        })
      );

      for (const tx of g.txs) {
        const rewritten = rewriteTransactionStSe(tx.segments, tx.transactionControl);
        const bodyText = x12SegmentsToText(rewritten);
        transactionBodies.push({ kind: tx.kind, text: bodyText });
        for (const line of bodyText.split(/\r?\n/)) {
          if (line.trim()) chunkLines.push(line);
        }
      }

      chunkLines.push(buildGeLine(g.txs.length, groupCtrl));
    }

    chunkLines.push(buildIeaLine(groups.length, params.interchangeCtrl));

    return {
      fullText: chunkLines.join("\n"),
      warnings,
      transactionBodies,
    };
  }
}

export { GS_VER_PROF, GS_VER_INST };
