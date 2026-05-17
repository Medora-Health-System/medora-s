/**
 * Phase 15F-C.2 — read-only operational aging, escalation, and shift-handoff signals.
 * Uses documented operational timestamps for aging anchors (not effective* overlays).
 * Outputs are not consumed by billing, claims, or audit writers.
 */

import { parseLabRadiologyEffectiveClinicalTimeIso } from "./labRadiologyEffectiveClinicalTime.js";
import type {
  LabRadReconciliationDomain,
  LabRadReconciliationFlag,
  LabRadReconciliationOrderInput,
  LabRadReconciliationOrderItemInput,
} from "./labRadiologyOperationalReconciliation.js";
import { labRadReconciliationNeedsFollowUp } from "./labRadiologyOperationalReconciliation.js";

/** Configurable operational aging thresholds. */
export const LAB_RAD_AGING_WATCH_MS = 60 * 60 * 1000;
export const LAB_RAD_AGING_DELAYED_MS = 4 * 60 * 60 * 1000;
export const LAB_RAD_AGING_CRITICAL_DELAY_MS = 8 * 60 * 60 * 1000;
export const LAB_RAD_CRITICAL_ACK_WATCH_MS = 15 * 60 * 1000;
export const LAB_RAD_CRITICAL_ACK_DELAYED_MS = 30 * 60 * 1000;
export const LAB_RAD_SHIFT_HANDOFF_PENDING_MS = 4 * 60 * 60 * 1000;

export type LabRadAgingBucket = "ON_TRACK" | "WATCH" | "DELAYED" | "CRITICAL_DELAY";

export type LabRadWorkflowPhase =
  | "LAB_AWAITING_COLLECTION"
  | "LAB_AWAITING_RESULT"
  | "LAB_AWAITING_CRITICAL_ACK"
  | "RAD_AWAITING_PERFORMED"
  | "RAD_AWAITING_FINALIZED"
  | "RAD_AWAITING_CRITICAL_ACK"
  | "COMPLETE"
  | "IDLE";

export type LabRadEscalationFlag =
  | "AGING"
  | "DELAYED"
  | "CRITICAL_DELAY"
  | "AWAITING_ACKNOWLEDGEMENT"
  | "CRITICAL_ACK_OVERDUE"
  | "SHIFT_HANDOFF_REVIEW";

export type LabRadEscalationItemInput = LabRadReconciliationOrderItemInput & {
  updatedAt?: string | Date | null;
  result?: (LabRadReconciliationOrderItemInput["result"] & {
    criticalValue?: boolean | null;
    acknowledgedByProviderAt?: string | Date | null;
  }) | null;
};

export type LabRadOperationalEscalationAnalysis = {
  phase: LabRadWorkflowPhase;
  /** Age in current phase from documented operational anchor (ms). */
  phaseAgeMs: number;
  agingBucket: LabRadAgingBucket;
  escalationFlags: LabRadEscalationFlag[];
  needsEscalation: boolean;
  awaitingResultOrFinalization: boolean;
  awaitingCriticalAck: boolean;
  shiftHandoffReview: boolean;
  /** Sort priority (lower = more urgent). */
  urgencyRank: number;
  /** Timestamp used for "oldest first" sort. */
  phaseAnchorMs: number | null;
  /** Recently touched (item/result update). */
  lastUpdatedMs: number | null;
};

function toMs(raw: string | Date | null | undefined): number | null {
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw.getTime();
  if (typeof raw === "string" && raw.trim()) {
    const d = parseLabRadiologyEffectiveClinicalTimeIso(raw);
    return d ? d.getTime() : null;
  }
  return null;
}

function bucketFromAgeMs(
  ageMs: number,
  thresholds: { watchMs: number; delayedMs: number; criticalMs: number }
): LabRadAgingBucket {
  if (ageMs > thresholds.criticalMs) return "CRITICAL_DELAY";
  if (ageMs > thresholds.delayedMs) return "DELAYED";
  if (ageMs > thresholds.watchMs) return "WATCH";
  return "ON_TRACK";
}

function standardThresholds() {
  return {
    watchMs: LAB_RAD_AGING_WATCH_MS,
    delayedMs: LAB_RAD_AGING_DELAYED_MS,
    criticalMs: LAB_RAD_AGING_CRITICAL_DELAY_MS,
  };
}

function criticalAckThresholds() {
  return {
    watchMs: LAB_RAD_CRITICAL_ACK_WATCH_MS,
    delayedMs: LAB_RAD_CRITICAL_ACK_DELAYED_MS,
    criticalMs: LAB_RAD_CRITICAL_ACK_DELAYED_MS,
  };
}

function hasResultVerified(item: LabRadEscalationItemInput): boolean {
  return toMs(item.result?.verifiedAt) != null;
}

function isCriticalUnacked(item: LabRadEscalationItemInput): boolean {
  const r = item.result;
  if (!r?.criticalValue) return false;
  return !toMs(r.acknowledgedByProviderAt);
}

function resolvePhase(
  domain: LabRadReconciliationDomain,
  order: LabRadReconciliationOrderInput,
  item: LabRadEscalationItemInput
): { phase: LabRadWorkflowPhase; anchorMs: number | null } {
  const status = String(item.status ?? "");
  const orderMs = toMs(order.createdAt) ?? toMs(item.createdAt);
  const collected = toMs(item.documentedCollectedAt);
  const performed = toMs(item.documentedPerformedAt);
  const verified = toMs(item.result?.verifiedAt);

  if (isCriticalUnacked(item) && verified != null) {
    return {
      phase:
        domain === "LAB" ? "LAB_AWAITING_CRITICAL_ACK" : "RAD_AWAITING_CRITICAL_ACK",
      anchorMs: verified,
    };
  }

  if (domain === "LAB") {
    if (verified != null && !isCriticalUnacked(item)) {
      return { phase: "COMPLETE", anchorMs: verified };
    }
    if (collected != null) {
      return { phase: "LAB_AWAITING_RESULT", anchorMs: collected };
    }
    if (status === "CANCELLED" || status === "DRAFT") {
      return { phase: "IDLE", anchorMs: orderMs };
    }
    return { phase: "LAB_AWAITING_COLLECTION", anchorMs: orderMs };
  }

  if (verified != null && !isCriticalUnacked(item)) {
    return { phase: "COMPLETE", anchorMs: verified };
  }
  if (performed != null) {
    return { phase: "RAD_AWAITING_FINALIZED", anchorMs: performed };
  }
  if (status === "CANCELLED" || status === "DRAFT") {
    return { phase: "IDLE", anchorMs: orderMs };
  }
  return { phase: "RAD_AWAITING_PERFORMED", anchorMs: orderMs };
}

function escalationFlagsFromBucket(input: {
  bucket: LabRadAgingBucket;
  phase: LabRadWorkflowPhase;
  phaseAgeMs: number;
  awaitingCriticalAck: boolean;
  shiftHandoffReview: boolean;
}): LabRadEscalationFlag[] {
  const flags: LabRadEscalationFlag[] = [];
  const { bucket, phase, awaitingCriticalAck, shiftHandoffReview } = input;

  if (phase === "COMPLETE" || phase === "IDLE") {
    if (shiftHandoffReview) flags.push("SHIFT_HANDOFF_REVIEW");
    return flags;
  }

  if (bucket === "WATCH" || bucket === "DELAYED" || bucket === "CRITICAL_DELAY") {
    flags.push("AGING");
  }
  if (bucket === "DELAYED") flags.push("DELAYED");
  if (bucket === "CRITICAL_DELAY") flags.push("CRITICAL_DELAY");

  if (awaitingCriticalAck) {
    flags.push("AWAITING_ACKNOWLEDGEMENT");
    if (bucket === "DELAYED" || bucket === "CRITICAL_DELAY") {
      flags.push("CRITICAL_ACK_OVERDUE");
    }
  }

  if (shiftHandoffReview) flags.push("SHIFT_HANDOFF_REVIEW");

  return [...new Set(flags)];
}

function urgencyRank(input: {
  bucket: LabRadAgingBucket;
  phase: LabRadWorkflowPhase;
  awaitingCriticalAck: boolean;
  orderPriority?: string | null;
}): number {
  let rank = 100;
  if (input.awaitingCriticalAck) rank -= 50;
  if (input.bucket === "CRITICAL_DELAY") rank -= 40;
  else if (input.bucket === "DELAYED") rank -= 25;
  else if (input.bucket === "WATCH") rank -= 10;
  if (
    input.phase === "LAB_AWAITING_RESULT" ||
    input.phase === "RAD_AWAITING_FINALIZED"
  ) {
    rank -= 5;
  }
  const p = String(input.orderPriority ?? "ROUTINE").toUpperCase();
  if (p === "STAT") rank -= 30;
  else if (p === "URGENT") rank -= 15;
  return rank;
}

export function analyzeLabRadOperationalEscalation(input: {
  domain: LabRadReconciliationDomain;
  order: LabRadReconciliationOrderInput;
  item: LabRadEscalationItemInput;
  reconciliationFlags?: LabRadReconciliationFlag[];
  now?: Date;
  orderPriority?: string | null;
}): LabRadOperationalEscalationAnalysis {
  const nowMs = (input.now ?? new Date()).getTime();
  const { phase, anchorMs } = resolvePhase(input.domain, input.order, input.item);
  const phaseAgeMs = anchorMs != null ? Math.max(0, nowMs - anchorMs) : 0;

  const awaitingCriticalAck =
    phase === "LAB_AWAITING_CRITICAL_ACK" || phase === "RAD_AWAITING_CRITICAL_ACK";
  const thresholds = awaitingCriticalAck ? criticalAckThresholds() : standardThresholds();
  const agingBucket = bucketFromAgeMs(phaseAgeMs, thresholds);

  const awaitingResultOrFinalization =
    phase === "LAB_AWAITING_RESULT" || phase === "RAD_AWAITING_FINALIZED";

  const reconFlags = input.reconciliationFlags ?? [];
  const needsReconFollowUp = labRadReconciliationNeedsFollowUp(reconFlags);
  const hasAdjusted = reconFlags.includes("ADJUSTED_CLINICAL_TIME");
  const hasOvernight = reconFlags.includes("OVERNIGHT_TIMING");

  const pendingTooLong =
    (phase === "LAB_AWAITING_COLLECTION" || phase === "RAD_AWAITING_PERFORMED") &&
    phaseAgeMs > LAB_RAD_SHIFT_HANDOFF_PENDING_MS;

  const shiftHandoffReview =
    pendingTooLong ||
    (awaitingResultOrFinalization &&
      (agingBucket === "DELAYED" || agingBucket === "CRITICAL_DELAY")) ||
    awaitingCriticalAck ||
    (hasAdjusted && needsReconFollowUp) ||
    (hasOvernight &&
      phase !== "COMPLETE" &&
      phase !== "IDLE");

  const escalationFlags = escalationFlagsFromBucket({
    bucket: agingBucket,
    phase,
    phaseAgeMs,
    awaitingCriticalAck,
    shiftHandoffReview,
  });

  const needsEscalation = escalationFlags.some(
    (f) =>
      f === "DELAYED" ||
      f === "CRITICAL_DELAY" ||
      f === "CRITICAL_ACK_OVERDUE" ||
      f === "SHIFT_HANDOFF_REVIEW"
  );

  const lastUpdatedMs =
    toMs(input.item.updatedAt) ??
    toMs(input.item.result?.createdAt) ??
    anchorMs;

  return {
    phase,
    phaseAgeMs,
    agingBucket,
    escalationFlags,
    needsEscalation,
    awaitingResultOrFinalization,
    awaitingCriticalAck,
    shiftHandoffReview,
    urgencyRank: urgencyRank({
      bucket: agingBucket,
      phase,
      awaitingCriticalAck,
      orderPriority: input.orderPriority,
    }),
    phaseAnchorMs: anchorMs,
    lastUpdatedMs,
  };
}

export type LabRadWorklistSortMode =
  | "OLDEST_FIRST"
  | "MOST_URGENT"
  | "CRITICAL_ACK_FIRST"
  | "RECENTLY_UPDATED";

export function compareLabRadWorklistPairs(
  a: { escalation: LabRadOperationalEscalationAnalysis },
  b: { escalation: LabRadOperationalEscalationAnalysis },
  mode: LabRadWorklistSortMode
): number {
  if (mode === "MOST_URGENT") {
    return a.escalation.urgencyRank - b.escalation.urgencyRank;
  }
  if (mode === "CRITICAL_ACK_FIRST") {
    const aAck = a.escalation.awaitingCriticalAck ? 0 : 1;
    const bAck = b.escalation.awaitingCriticalAck ? 0 : 1;
    if (aAck !== bAck) return aAck - bAck;
    return b.escalation.phaseAgeMs - a.escalation.phaseAgeMs;
  }
  if (mode === "RECENTLY_UPDATED") {
    const aU = a.escalation.lastUpdatedMs ?? 0;
    const bU = b.escalation.lastUpdatedMs ?? 0;
    return bU - aU;
  }
  const aA = a.escalation.phaseAnchorMs ?? 0;
  const bA = b.escalation.phaseAnchorMs ?? 0;
  return aA - bA;
}

export type LabRadEscalationFilterState = {
  needsEscalation: boolean;
  criticalDelay: boolean;
  awaitingResultOrFinalization: boolean;
  awaitingAcknowledgement: boolean;
  shiftHandoffReview: boolean;
  adjustedReconciled: boolean;
};

export function pairPassesLabRadEscalationFilters(
  escalation: LabRadOperationalEscalationAnalysis,
  reconciliationFlags: LabRadReconciliationFlag[],
  filters: LabRadEscalationFilterState
): boolean {
  const any =
    filters.needsEscalation ||
    filters.criticalDelay ||
    filters.awaitingResultOrFinalization ||
    filters.awaitingAcknowledgement ||
    filters.shiftHandoffReview ||
    filters.adjustedReconciled;
  if (!any) return true;

  if (filters.needsEscalation && escalation.needsEscalation) return true;
  if (filters.criticalDelay && escalation.agingBucket === "CRITICAL_DELAY") return true;
  if (filters.awaitingResultOrFinalization && escalation.awaitingResultOrFinalization) return true;
  if (filters.awaitingAcknowledgement && escalation.awaitingCriticalAck) return true;
  if (filters.shiftHandoffReview && escalation.shiftHandoffReview) return true;
  if (
    filters.adjustedReconciled &&
    (reconciliationFlags.includes("ADJUSTED_CLINICAL_TIME") ||
      labRadReconciliationNeedsFollowUp(reconciliationFlags))
  ) {
    return true;
  }
  return false;
}

export type LabRadWorklistOperationalSummary = {
  totalActive: number;
  needsEscalation: number;
  criticalDelay: number;
  awaitingAcknowledgement: number;
  shiftHandoffReview: number;
  adjustedClinicalTime: number;
};

export function summarizeLabRadWorklistOperational(
  rows: Array<{
    escalation: LabRadOperationalEscalationAnalysis;
    reconciliationFlags: LabRadReconciliationFlag[];
    isActive: boolean;
  }>
): LabRadWorklistOperationalSummary {
  let totalActive = 0;
  let needsEscalation = 0;
  let criticalDelay = 0;
  let awaitingAcknowledgement = 0;
  let shiftHandoffReview = 0;
  let adjustedClinicalTime = 0;

  for (const row of rows) {
    if (!row.isActive) continue;
    totalActive += 1;
    if (row.escalation.needsEscalation) needsEscalation += 1;
    if (row.escalation.agingBucket === "CRITICAL_DELAY") criticalDelay += 1;
    if (row.escalation.awaitingCriticalAck) awaitingAcknowledgement += 1;
    if (row.escalation.shiftHandoffReview) shiftHandoffReview += 1;
    if (row.reconciliationFlags.includes("ADJUSTED_CLINICAL_TIME")) adjustedClinicalTime += 1;
  }

  return {
    totalActive,
    needsEscalation,
    criticalDelay,
    awaitingAcknowledgement,
    shiftHandoffReview,
    adjustedClinicalTime,
  };
}
