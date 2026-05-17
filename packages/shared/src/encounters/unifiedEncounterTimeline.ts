/**
 * Phase 15F-D.2 — Unified longitudinal encounter timeline (read-model only).
 * Merges cross-department sources without mutating storage or reordering by effective time.
 */

import { OBSERVATION_REASSESSMENT_EVENT_SOURCE } from "../observationReassessmentV1.js";
import {
  buildClinicalTimeDisplayPair,
  clinicalTimelineCarePhaseForDisplayEventType,
  resolveClinicalTimelineDisplayEventType,
  type ClinicalTimelineCarePhase,
} from "./clinicalTimelineDisplayNormalization.js";

export type UnifiedTimelineSourceKind =
  | "ENCOUNTER_CLINICAL_EVENT"
  | "ORDER_EVENT"
  | "MEDICATION_ADMINISTRATION"
  | "ORDER_ITEM_RESULT";

export type UnifiedTimelineDisplayGroup =
  | "CLINICAL"
  | "MEDICATION"
  | "LABORATORY"
  | "IMAGING"
  | "PROCEDURE"
  | "OBSERVATION";

export type UnifiedTimelineChip =
  | "ADJUSTED"
  | "OBSERVATION"
  | "INFUSION_STARTED"
  | "INFUSION_STOPPED"
  | "RESULT_CORRECTED";

/** Raw row from API read layer — one persisted source record. */
export type UnifiedTimelineSourceRow = {
  sourceKind: UnifiedTimelineSourceKind;
  sourceId: string;
  storedEventType: string;
  documentedAtIso: string;
  effectiveClinicalAtIso?: string | null;
  adjustmentVersion?: number;
  actorUserId?: string | null;
  actorDisplayName?: string | null;
  actorRole?: string | null;
  sourceDepartment?: string | null;
  orderType?: string | null;
  orderId?: string | null;
  orderItemId?: string | null;
  titleFr?: string | null;
  titleEn?: string | null;
  summaryFr?: string | null;
  summaryEn?: string | null;
  payloadJson?: unknown;
  /** When set, only one row per key is kept (first wins). */
  dedupeKey?: string | null;
  displayGroup?: UnifiedTimelineDisplayGroup;
  extraChips?: UnifiedTimelineChip[];
};

export type UnifiedTimelineActor = {
  userId: string | null;
  displayName: string | null;
  role: string | null;
  department: string | null;
};

export type UnifiedTimelineEntry = {
  id: string;
  sourceKind: UnifiedTimelineSourceKind;
  sourceId: string;
  storedEventType: string;
  displayEventType: string;
  displayGroup: UnifiedTimelineDisplayGroup;
  carePhase: ClinicalTimelineCarePhase;
  documentedAtIso: string;
  effectiveClinicalAtIso: string | null;
  hasClinicalTimeCorrection: boolean;
  actor: UnifiedTimelineActor;
  chips: UnifiedTimelineChip[];
  titleFr: string | null;
  titleEn: string | null;
  summaryFr: string | null;
  summaryEn: string | null;
  orderId: string | null;
  orderItemId: string | null;
  /** Optional source payload for UI summarization (read-model only). */
  payloadJson?: unknown;
};

export type UnifiedEncounterTimelineResult = {
  items: UnifiedTimelineEntry[];
  totalBeforeDedupe: number;
  totalAfterDedupe: number;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v != null && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function parseMeta(payload: unknown): Record<string, unknown> | null {
  return asRecord(payload);
}

function isObservationReassessmentPayload(payload: unknown): boolean {
  const p = asRecord(payload);
  return p?.source === OBSERVATION_REASSESSMENT_EVENT_SOURCE;
}

function isObservationDisplayType(displayEventType: string): boolean {
  return (
    displayEventType === "OBSERVATION_ADMISSION_PACKET_SAVED" ||
    displayEventType === "ADMISSION_SUMMARY_SAVED" ||
    displayEventType === "OBSERVATION_REASSESSMENT_SAVED"
  );
}

export function resolveDisplayGroupForSourceRow(row: UnifiedTimelineSourceRow): UnifiedTimelineDisplayGroup {
  if (row.displayGroup) return row.displayGroup;

  const orderType = (row.orderType ?? "").trim().toUpperCase();
  const stored = row.storedEventType.trim().toUpperCase();

  if (row.sourceKind === "MEDICATION_ADMINISTRATION") return "MEDICATION";

  if (row.sourceKind === "ORDER_ITEM_RESULT") {
    return orderType === "IMAGING" ? "IMAGING" : "LABORATORY";
  }

  if (row.sourceKind === "ORDER_EVENT") {
    if (orderType === "LAB") return "LABORATORY";
    if (orderType === "IMAGING") return "IMAGING";
    if (orderType === "MEDICATION") return "MEDICATION";
    if (orderType === "CARE") return "PROCEDURE";
    return "CLINICAL";
  }

  if (row.sourceKind === "ENCOUNTER_CLINICAL_EVENT") {
    const display = resolveClinicalTimelineDisplayEventType({
      eventType: row.storedEventType,
      payloadJson: row.payloadJson,
    });
    if (isObservationDisplayType(display) || isObservationReassessmentPayload(row.payloadJson)) {
      return "OBSERVATION";
    }
    if (
      stored === "PROCEDURE_DOCUMENTED" ||
      stored === "IV_INSERTED" ||
      stored === "IV_REMOVED"
    ) {
      return "PROCEDURE";
    }
    return "CLINICAL";
  }

  return "CLINICAL";
}

export function resolveDisplayEventTypeForSourceRow(row: UnifiedTimelineSourceRow): string {
  if (row.sourceKind === "ENCOUNTER_CLINICAL_EVENT") {
    if (
      row.storedEventType === "NURSING_ASSESSMENT_SAVED" &&
      isObservationReassessmentPayload(row.payloadJson)
    ) {
      return "OBSERVATION_REASSESSMENT_SAVED";
    }
    return resolveClinicalTimelineDisplayEventType({
      eventType: row.storedEventType,
      payloadJson: row.payloadJson,
    });
  }
  if (row.sourceKind === "ORDER_EVENT") {
    const ot = (row.orderType ?? "").trim().toUpperCase();
    return `ORDER_${row.storedEventType}_${ot || "UNKNOWN"}`;
  }
  if (row.sourceKind === "MEDICATION_ADMINISTRATION") {
    return `MAR_${row.storedEventType || "ADMINISTERED"}`;
  }
  if (row.sourceKind === "ORDER_ITEM_RESULT") {
    const ot = (row.orderType ?? "").trim().toUpperCase();
    return ot === "IMAGING" ? "RESULT_IMAGING_FINALIZED" : "RESULT_LAB_RECORDED";
  }
  return row.storedEventType || "UNKNOWN";
}

function carePhaseForUnifiedEntry(
  displayEventType: string,
  displayGroup: UnifiedTimelineDisplayGroup
): ClinicalTimelineCarePhase {
  if (displayGroup === "OBSERVATION") return "OBSERVATION";
  if (displayEventType === "DISCHARGE_SUMMARY_SAVED") return "DISCHARGE";
  if (displayGroup === "PROCEDURE") return "PROCEDURE";
  if (displayGroup === "MEDICATION") return "DOCUMENTATION";
  if (displayGroup === "LABORATORY" || displayGroup === "IMAGING") return "ED";
  return clinicalTimelineCarePhaseForDisplayEventType(displayEventType);
}

export function deriveUnifiedTimelineChips(
  row: UnifiedTimelineSourceRow,
  displayEventType: string
): UnifiedTimelineChip[] {
  const chips = new Set<UnifiedTimelineChip>(row.extraChips ?? []);
  const timePair = buildClinicalTimeDisplayPair({
    documentedAt: row.documentedAtIso,
    effectiveAt: row.effectiveClinicalAtIso,
    adjustmentVersion: row.adjustmentVersion ?? 0,
  });
  if (timePair.hasCorrection) {
    chips.add("ADJUSTED");
  }
  if (isObservationDisplayType(displayEventType) || isObservationReassessmentPayload(row.payloadJson)) {
    chips.add("OBSERVATION");
  }
  const meta = parseMeta(row.payloadJson);
  if (meta?.infusionAction === "START") chips.add("INFUSION_STARTED");
  if (meta?.infusionAction === "STOP") chips.add("INFUSION_STOPPED");
  if (row.sourceKind === "ORDER_ITEM_RESULT" && timePair.hasCorrection) {
    chips.add("RESULT_CORRECTED");
  }
  return [...chips];
}

function defaultDedupeKey(row: UnifiedTimelineSourceRow): string {
  if (row.dedupeKey?.trim()) return row.dedupeKey.trim();
  return `${row.sourceKind}:${row.sourceId}`;
}

/**
 * Drop order events superseded by MAR rows (same medicationAdministrationId).
 */
export function filterSourceRowsForDedupe(rows: UnifiedTimelineSourceRow[]): UnifiedTimelineSourceRow[] {
  const marAdminIds = new Set<string>();
  for (const row of rows) {
    if (row.sourceKind === "MEDICATION_ADMINISTRATION") {
      marAdminIds.add(row.sourceId);
    }
  }
  const seen = new Set<string>();
  const out: UnifiedTimelineSourceRow[] = [];
  for (const row of rows) {
    if (row.sourceKind === "ORDER_EVENT") {
      const meta = parseMeta(row.payloadJson);
      const marId =
        typeof meta?.medicationAdministrationId === "string" ? meta.medicationAdministrationId.trim() : "";
      if (marId && marAdminIds.has(marId)) continue;
    }
    const key = defaultDedupeKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

export function mapSourceRowToUnifiedEntry(row: UnifiedTimelineSourceRow): UnifiedTimelineEntry {
  const displayEventType = resolveDisplayEventTypeForSourceRow(row);
  const displayGroup = resolveDisplayGroupForSourceRow(row);
  const timePair = buildClinicalTimeDisplayPair({
    documentedAt: row.documentedAtIso,
    effectiveAt: row.effectiveClinicalAtIso,
    adjustmentVersion: row.adjustmentVersion ?? 0,
  });
  return {
    id: `${row.sourceKind}:${row.sourceId}`,
    sourceKind: row.sourceKind,
    sourceId: row.sourceId,
    storedEventType: row.storedEventType,
    displayEventType,
    displayGroup,
    carePhase: carePhaseForUnifiedEntry(displayEventType, displayGroup),
    documentedAtIso: timePair.documentedAtIso ?? row.documentedAtIso,
    effectiveClinicalAtIso: timePair.hasCorrection ? timePair.effectiveAtIso : null,
    hasClinicalTimeCorrection: timePair.hasCorrection,
    actor: {
      userId: row.actorUserId ?? null,
      displayName: row.actorDisplayName ?? null,
      role: row.actorRole ?? null,
      department: row.sourceDepartment ?? row.actorRole ?? null,
    },
    chips: deriveUnifiedTimelineChips(row, displayEventType),
    titleFr: row.titleFr ?? null,
    titleEn: row.titleEn ?? null,
    summaryFr: row.summaryFr ?? null,
    summaryEn: row.summaryEn ?? null,
    orderId: row.orderId ?? null,
    orderItemId: row.orderItemId ?? null,
    payloadJson: row.payloadJson,
  };
}

/**
 * Merge and sort unified timeline — **documented operational chronology** (ascending).
 * Pass `newestFirst: true` for UI feeds that show latest at top.
 */
export function aggregateUnifiedEncounterTimeline(
  rows: UnifiedTimelineSourceRow[],
  options?: { newestFirst?: boolean }
): UnifiedEncounterTimelineResult {
  const totalBeforeDedupe = rows.length;
  const filtered = filterSourceRowsForDedupe(rows);
  const items = filtered.map(mapSourceRowToUnifiedEntry);
  items.sort((a, b) => {
    const am = new Date(a.documentedAtIso).getTime();
    const bm = new Date(b.documentedAtIso).getTime();
    if (options?.newestFirst) return bm - am;
    return am - bm;
  });
  return {
    items,
    totalBeforeDedupe,
    totalAfterDedupe: items.length,
  };
}

/** Apply cap after sort (keeps most recent when newestFirst). */
export function capUnifiedTimeline(
  result: UnifiedEncounterTimelineResult,
  limit: number,
  newestFirst = true
): UnifiedEncounterTimelineResult & { capped: boolean } {
  if (result.items.length <= limit) {
    return { ...result, capped: false };
  }
  const items = newestFirst ? result.items.slice(0, limit) : result.items.slice(-limit);
  return { ...result, items, capped: true };
}
