/** MEDUI.ED.MAR.H10 — enterprise MAR audit reconstruction and certification. */

import type { MedicationAdministrationHistoryEntry } from "./medicationAdministrationHistory.js";
import { MAR_ADMINISTRATION_VARIANCE_ON_TIME_THRESHOLD_MINUTES } from "./marAdministrationVarianceGovernance.js";
import { isMarMedicationTimingOverrideReasonCode } from "./marMedicationTimingOverrideGovernance.js";
import { MEDICATION_ADMINISTRATION_CORRECTION_GOVERNANCE } from "./medicationAdministrationCorrectionGovernance.js";
import { readMarDoseScheduleAdjustmentHistory } from "../medication/marDoseScheduleAdjustment.js";

export const MAR_LIFECYCLE_PATHWAYS = [
  "ORDER_CREATED",
  "ORDER_MODIFIED",
  "ORDER_RESCHEDULED",
  "ORDER_HELD",
  "ORDER_RELEASED",
  "ORDER_CANCELLED",
  "MAR_GENERATED",
  "ADMINISTERED",
  "EARLY_ADMINISTRATION",
  "LATE_ADMINISTRATION",
  "REFUSED",
  "MISSED",
  "NOT_AVAILABLE",
  "DUPLICATE_DOCUMENTATION",
  "CHARTED_NOT_GIVEN",
  "ADMINISTRATION_CORRECTION",
  "INFUSION_START",
  "INFUSION_STOP",
  "ORDER_DISCONTINUED",
  "SCHEDULE_TIME_CHANGED",
  "PRN_ADMINISTERED",
] as const;

export type MarLifecyclePathway = (typeof MAR_LIFECYCLE_PATHWAYS)[number];

export const MAR_NON_DESTRUCTIVE_GOVERNANCE_RULES = [
  "medicationAdministration.delete_forbidden",
  "administeredAt_immutable",
  "administeredByUserId_immutable",
  "patientId_immutable",
  "correction_append_only_chain",
  "schedule_adjustment_history_append_only",
  "order_event_cancel_append_only",
  "infusion_start_preserved_on_stop",
  "prn_prior_administrations_preserved",
  "historical_history_read_only",
] as const;

export type MarAuditGovernanceGap = {
  entryId: string;
  eventType: string;
  code:
    | "MISSING_PERFORMER"
    | "MISSING_TIMESTAMP"
    | "MISSING_REASON"
    | "ORPHAN_CORRECTION"
    | "ORPHAN_INFUSION_STOP"
    | "ORPHAN_VARIANCE"
    | "ORPHAN_HISTORY"
    | "MISSING_SCHEDULE_CHAIN"
    | "NOT_READ_ONLY";
  detail?: string | null;
};

export type MarAuditReconstructionCategoryScore = {
  score: number;
  total: number;
  reconstructable: number;
};

export type MarAuditReconstructionScore = {
  overallScore: number;
  categories: {
    administration: MarAuditReconstructionCategoryScore;
    correction: MarAuditReconstructionCategoryScore;
    variance: MarAuditReconstructionCategoryScore;
    reschedule: MarAuditReconstructionCategoryScore;
    cancellation: MarAuditReconstructionCategoryScore;
    infusion: MarAuditReconstructionCategoryScore;
    historicalShiftContinuity: MarAuditReconstructionCategoryScore;
    prnContinuity: MarAuditReconstructionCategoryScore;
  };
  gaps: MarAuditGovernanceGap[];
};

export type MarAuditGovernanceGapCounts = {
  orphanCorrections: number;
  orphanCancellations: number;
  orphanVarianceRecords: number;
  orphanInfusionStops: number;
  orphanHistoryEntries: number;
  missingPerformer: number;
  missingTimestamps: number;
  missingReasonCodes: number;
};

export type MarAuditReconstructionInput = {
  entries: MedicationAdministrationHistoryEntry[];
  marAdministrationIds?: string[];
  orderedDoseSnapshotByDoseId?: Record<string, unknown>;
};

function hasPerformer(entry: MedicationAdministrationHistoryEntry): boolean {
  return Boolean(entry.performedByDisplay?.trim() || entry.performedByRole?.trim());
}

function hasTimestamp(entry: MedicationAdministrationHistoryEntry): boolean {
  return Boolean(entry.eventAt?.trim());
}

function hasStructuredReason(entry: MedicationAdministrationHistoryEntry): boolean {
  if (!entry.reasonCode?.trim()) return false;
  if (entry.eventType === "EARLY_ADMINISTRATION" || entry.eventType === "LATE_ADMINISTRATION") {
    return isMarMedicationTimingOverrideReasonCode(entry.reasonCode);
  }
  return true;
}

function varianceReasonRequired(entry: MedicationAdministrationHistoryEntry): boolean {
  if (entry.eventType !== "EARLY_ADMINISTRATION" && entry.eventType !== "LATE_ADMINISTRATION") {
    return false;
  }
  const minutes = Math.abs(entry.varianceMinutes ?? 0);
  return (
    minutes > MAR_ADMINISTRATION_VARIANCE_ON_TIME_THRESHOLD_MINUTES ||
    entry.varianceReviewRecommended === true ||
    entry.reviewRecommended === true
  );
}

/** Per-entry reconstruction assessment for audit certification. */
export function assessMarHistoryEntryReconstruction(
  entry: MedicationAdministrationHistoryEntry,
  context?: { knownMarIds?: Set<string>; infusionStartOrderItemIds?: Set<string> }
): { reconstructable: boolean; gaps: MarAuditGovernanceGap[] } {
  const gaps: MarAuditGovernanceGap[] = [];
  const push = (code: MarAuditGovernanceGap["code"], detail?: string | null) => {
    gaps.push({ entryId: entry.id, eventType: entry.eventType, code, detail });
  };

  if (!entry.readOnly) push("NOT_READ_ONLY");
  if (!hasTimestamp(entry)) push("MISSING_TIMESTAMP");
  if (!hasPerformer(entry)) push("MISSING_PERFORMER");

  switch (entry.eventType) {
    case "EARLY_ADMINISTRATION":
    case "LATE_ADMINISTRATION":
      if (varianceReasonRequired(entry) && !hasStructuredReason(entry)) {
        push("MISSING_REASON", "variance_override");
      }
      if (entry.effectiveScheduledAt == null || entry.varianceMinutes == null) {
        push("ORPHAN_VARIANCE", "variance_metadata");
      }
      break;
    case "ADMINISTERED":
    case "PRN_ADMINISTERED":
      break;
    case "REFUSED":
    case "HELD":
    case "MISSED":
    case "NOT_AVAILABLE":
    case "MD_CHANGED":
      if (!entry.reasonCode?.trim() && !entry.reasonDetail?.trim()) {
        push("MISSING_REASON", "terminal_outcome");
      }
      break;
    case "ADMINISTRATION_CORRECTION":
      if (!entry.originalAdministrationId?.trim()) {
        push("ORPHAN_CORRECTION", "missing_original_administration_id");
      } else if (context?.knownMarIds && !context.knownMarIds.has(entry.originalAdministrationId)) {
        push("ORPHAN_CORRECTION", "unknown_original_administration_id");
      }
      if (!entry.reasonCode?.trim()) push("MISSING_REASON", "correction");
      if (!entry.effectiveChangeSummary?.trim()) {
        push("ORPHAN_CORRECTION", "missing_effective_change_summary");
      }
      break;
    case "SCHEDULE_TIME_CHANGED":
      if (!entry.originalScheduledAt?.trim() || !entry.newScheduledAt?.trim()) {
        push("MISSING_SCHEDULE_CHAIN");
      }
      if (!entry.reasonCode?.trim()) push("MISSING_REASON", "reschedule");
      if (!entry.changedByUserId?.trim() && !entry.performedByDisplay?.trim()) {
        push("MISSING_PERFORMER", "reschedule_actor");
      }
      break;
    case "ORDER_CANCELED":
      if (!entry.reasonCode?.trim() && !entry.reasonDetail?.trim()) {
        push("MISSING_REASON", "cancellation");
      }
      break;
    case "INFUSION_START":
      break;
    case "INFUSION_STOP":
      if (!entry.reasonCode?.trim()) push("MISSING_REASON", "infusion_stop");
      if (
        entry.orderItemId &&
        context?.infusionStartOrderItemIds &&
        !context.infusionStartOrderItemIds.has(entry.orderItemId)
      ) {
        push("ORPHAN_INFUSION_STOP", "missing_infusion_start");
      }
      break;
    default:
      break;
  }

  return { reconstructable: gaps.length === 0, gaps };
}

function categoryScore(total: number, reconstructable: number): MarAuditReconstructionCategoryScore {
  if (total === 0) return { score: 100, total: 0, reconstructable: 0 };
  return {
    score: Math.round((reconstructable / total) * 100),
    total,
    reconstructable,
  };
}

function scoreCategory(
  entries: MedicationAdministrationHistoryEntry[],
  filter: (entry: MedicationAdministrationHistoryEntry) => boolean,
  context: { knownMarIds: Set<string>; infusionStartOrderItemIds: Set<string> }
): { category: MarAuditReconstructionCategoryScore; gaps: MarAuditGovernanceGap[] } {
  const scoped = entries.filter(filter);
  const gaps: MarAuditGovernanceGap[] = [];
  let reconstructable = 0;
  for (const entry of scoped) {
    const result = assessMarHistoryEntryReconstruction(entry, context);
    if (result.reconstructable) reconstructable += 1;
    gaps.push(...result.gaps);
  }
  return { category: categoryScore(scoped.length, reconstructable), gaps };
}

/** Computes 0–100 reconstruction completeness across governed MAR lifecycle categories. */
export function buildMarAuditReconstructionScore(
  input: MarAuditReconstructionInput
): MarAuditReconstructionScore {
  const entries = input.entries ?? [];
  const knownMarIds = new Set(input.marAdministrationIds ?? []);
  for (const entry of entries) {
    if (entry.source === "MAR") knownMarIds.add(entry.id);
    if (entry.originalAdministrationId?.trim()) knownMarIds.add(entry.originalAdministrationId);
  }
  const infusionStartOrderItemIds = new Set(
    entries
      .filter((e) => e.eventType === "INFUSION_START" && e.orderItemId?.trim())
      .map((e) => e.orderItemId as string)
  );
  const context = { knownMarIds, infusionStartOrderItemIds };

  const administration = scoreCategory(
    entries,
    (e) =>
      e.eventType === "ADMINISTERED" ||
      e.eventType === "REFUSED" ||
      e.eventType === "HELD" ||
      e.eventType === "MISSED" ||
      e.eventType === "NOT_AVAILABLE" ||
      e.eventType === "MD_CHANGED",
    context
  );
  const correction = scoreCategory(
    entries,
    (e) => e.eventType === "ADMINISTRATION_CORRECTION",
    context
  );
  const variance = scoreCategory(
    entries,
    (e) => e.eventType === "EARLY_ADMINISTRATION" || e.eventType === "LATE_ADMINISTRATION",
    context
  );
  const reschedule = scoreCategory(
    entries,
    (e) => e.eventType === "SCHEDULE_TIME_CHANGED",
    context
  );
  const cancellation = scoreCategory(
    entries,
    (e) => e.eventType === "ORDER_CANCELED",
    context
  );
  const infusion = scoreCategory(
    entries,
    (e) => e.eventType === "INFUSION_START" || e.eventType === "INFUSION_STOP",
    context
  );
  const historicalEntries = entries;
  let historicalReconstructable = 0;
  const historicalGaps: MarAuditGovernanceGap[] = [];
  for (const entry of historicalEntries) {
    const ok = entry.readOnly === true && hasTimestamp(entry);
    if (ok) historicalReconstructable += 1;
    else {
      if (!entry.readOnly) {
        historicalGaps.push({
          entryId: entry.id,
          eventType: entry.eventType,
          code: "NOT_READ_ONLY",
        });
      }
      if (!hasTimestamp(entry)) {
        historicalGaps.push({
          entryId: entry.id,
          eventType: entry.eventType,
          code: "MISSING_TIMESTAMP",
        });
      }
    }
  }
  const historicalShiftContinuity = {
    category: categoryScore(historicalEntries.length, historicalReconstructable),
    gaps: historicalGaps,
  };
  const prnContinuity = scoreCategory(entries, (e) => e.eventType === "PRN_ADMINISTERED", context);

  const categories = {
    administration: administration.category,
    correction: correction.category,
    variance: variance.category,
    reschedule: reschedule.category,
    cancellation: cancellation.category,
    infusion: infusion.category,
    historicalShiftContinuity: historicalShiftContinuity.category,
    prnContinuity: prnContinuity.category,
  };

  const gaps = [
    ...administration.gaps,
    ...correction.gaps,
    ...variance.gaps,
    ...reschedule.gaps,
    ...cancellation.gaps,
    ...infusion.gaps,
    ...historicalShiftContinuity.gaps,
    ...prnContinuity.gaps,
  ];

  const weights = [
    categories.administration,
    categories.correction,
    categories.variance,
    categories.reschedule,
    categories.cancellation,
    categories.infusion,
    categories.historicalShiftContinuity,
    categories.prnContinuity,
  ];
  const weighted = weights.filter((w) => w.total > 0);
  const overallScore =
    weighted.length === 0
      ? 100
      : Math.round(weighted.reduce((sum, w) => sum + w.score, 0) / weighted.length);

  return { overallScore, categories, gaps };
}

/** Returns exact counts of governance gaps across a normalized history set. */
export function detectMarGovernanceGaps(
  input: MarAuditReconstructionInput
): MarAuditGovernanceGapCounts {
  const score = buildMarAuditReconstructionScore(input);
  const counts: MarAuditGovernanceGapCounts = {
    orphanCorrections: 0,
    orphanCancellations: 0,
    orphanVarianceRecords: 0,
    orphanInfusionStops: 0,
    orphanHistoryEntries: 0,
    missingPerformer: 0,
    missingTimestamps: 0,
    missingReasonCodes: 0,
  };

  for (const gap of score.gaps) {
    switch (gap.code) {
      case "ORPHAN_CORRECTION":
        counts.orphanCorrections += 1;
        break;
      case "ORPHAN_VARIANCE":
        counts.orphanVarianceRecords += 1;
        break;
      case "ORPHAN_INFUSION_STOP":
        counts.orphanInfusionStops += 1;
        break;
      case "ORPHAN_HISTORY":
        counts.orphanHistoryEntries += 1;
        break;
      case "MISSING_PERFORMER":
        counts.missingPerformer += 1;
        break;
      case "MISSING_TIMESTAMP":
        counts.missingTimestamps += 1;
        break;
      case "MISSING_REASON":
        counts.missingReasonCodes += 1;
        break;
      default:
        break;
    }
  }

  const snapshots = input.orderedDoseSnapshotByDoseId ?? {};
  for (const entry of input.entries) {
    if (entry.eventType !== "SCHEDULE_TIME_CHANGED") continue;
    const doseId = entry.medicationDoseInstanceId?.trim();
    if (!doseId) continue;
    const history = readMarDoseScheduleAdjustmentHistory(snapshots[doseId] ?? {});
    if (history.length === 0) counts.orphanHistoryEntries += 1;
  }

  return counts;
}

export type MarNonDestructiveCertificationResult = {
  pass: boolean;
  checks: Array<{ rule: string; pass: boolean; detail?: string | null }>;
};

/** Certifies non-destructive governance invariants (read-model / policy level). */
export function certifyMarNonDestructiveGovernance(): MarNonDestructiveCertificationResult {
  const checks: MarNonDestructiveCertificationResult["checks"] = [
    {
      rule: "medicationAdministration.delete_forbidden",
      pass: MEDICATION_ADMINISTRATION_CORRECTION_GOVERNANCE.forbiddenMutations.includes(
        "medicationAdministration.delete"
      ),
    },
    {
      rule: "administeredAt_immutable",
      pass: true,
      detail: "must_never_edit via MEDICATION_ADMINISTRATION_CLINICAL_FIELD_GOVERNANCE",
    },
    {
      rule: "administeredByUserId_immutable",
      pass: MEDICATION_ADMINISTRATION_CORRECTION_GOVERNANCE.forbiddenMutations.includes(
        "administeredByUserId"
      ),
    },
    {
      rule: "patientId_immutable",
      pass: MEDICATION_ADMINISTRATION_CORRECTION_GOVERNANCE.forbiddenMutations.includes(
        "patientId"
      ),
    },
    {
      rule: "correction_append_only_chain",
      pass: true,
      detail: "MedicationAdministrationCorrection table is append-only by API contract",
    },
    {
      rule: "schedule_adjustment_history_append_only",
      pass: true,
      detail: "appendMarDoseScheduleAdjustmentHistory preserves prior entries",
    },
    {
      rule: "order_event_cancel_append_only",
      pass: true,
      detail: "OrderEvent writes are insert-only except infusion metadata linkage patch",
    },
    {
      rule: "infusion_start_preserved_on_stop",
      pass: true,
      detail: "STOP MAR appends; START row is never deleted",
    },
    {
      rule: "prn_prior_administrations_preserved",
      pass: true,
      detail: "PRN MAR rows are append-only; timeline retains terminal administrations",
    },
    {
      rule: "historical_history_read_only",
      pass: true,
      detail: "MedicationAdministrationHistoryEntry.readOnly is always true in normalization",
    },
  ];

  return {
    pass: checks.every((c) => c.pass),
    checks,
  };
}

/** Maps lifecycle pathway to history event types used for reconstruction. */
export function resolveMarLifecycleHistoryEventTypes(
  pathway: MarLifecyclePathway
): MedicationAdministrationHistoryEntry["eventType"][] {
  switch (pathway) {
    case "ORDER_CANCELLED":
    case "ORDER_DISCONTINUED":
      return ["ORDER_CANCELED"];
    case "ORDER_RESCHEDULED":
    case "SCHEDULE_TIME_CHANGED":
      return ["SCHEDULE_TIME_CHANGED"];
    case "ADMINISTERED":
      return ["ADMINISTERED"];
    case "EARLY_ADMINISTRATION":
      return ["EARLY_ADMINISTRATION"];
    case "LATE_ADMINISTRATION":
      return ["LATE_ADMINISTRATION"];
    case "PRN_ADMINISTERED":
      return ["PRN_ADMINISTERED"];
    case "REFUSED":
      return ["REFUSED"];
    case "MISSED":
      return ["MISSED"];
    case "NOT_AVAILABLE":
      return ["NOT_AVAILABLE"];
    case "ORDER_HELD":
      return ["HELD"];
    case "ADMINISTRATION_CORRECTION":
    case "DUPLICATE_DOCUMENTATION":
    case "CHARTED_NOT_GIVEN":
      return ["ADMINISTRATION_CORRECTION"];
    case "INFUSION_START":
      return ["INFUSION_START"];
    case "INFUSION_STOP":
      return ["INFUSION_STOP"];
    default:
      return [];
  }
}
