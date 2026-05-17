/**
 * Phase 15F-D.1 — Unified cross-department clinical timeline display normalization.
 * Display-only: never mutates stored events, timestamps, or billing fields.
 */

import {
  dischargeSnapshotIsObservationAdmissionRoutingOnly,
  mislabeledDischargeEventIsObservationAdmission,
} from "./observationAdmissionDischargeRouting.js";

export {
  DISCHARGE_MODE_FR_ADMISSION,
  dischargeSnapshotHasClinicalDischargeContent,
  dischargeSnapshotIsObservationAdmissionRoutingOnly,
  mislabeledDischargeEventIsObservationAdmission,
  resolveClinicalDocumentationDisplayEventType,
  type ClinicalDocumentationDisplayEventType,
} from "./observationAdmissionDischargeRouting.js";

export type ClinicalTimelineStoredRow = {
  id?: string;
  eventType?: string | null;
  createdAt?: string | null;
  payloadJson?: unknown;
};

/** Timeline ordering anchor — always documented/system time, never effective overlays. */
export type ClinicalTimelineSortAnchor = "DOCUMENTED_AT" | "CREATED_AT";

export function clinicalTimelineSortAtIso(row: ClinicalTimelineStoredRow): string | null {
  const created = typeof row.createdAt === "string" && row.createdAt.trim() ? row.createdAt.trim() : null;
  return created;
}

/**
 * Display event type for UI/export (stored `eventType` in DB is unchanged).
 */
export function resolveClinicalTimelineDisplayEventType(row: ClinicalTimelineStoredRow): string {
  const stored = String(row.eventType ?? "").trim();
  if (!stored) return "UNKNOWN";
  if (
    mislabeledDischargeEventIsObservationAdmission({
      eventType: stored,
      payloadJson: row.payloadJson,
    })
  ) {
    return "OBSERVATION_ADMISSION_PACKET_SAVED";
  }
  return stored;
}

/** Care phase for continuous ED → observation → discharge narrative. */
export type ClinicalTimelineCarePhase =
  | "ED"
  | "OBSERVATION"
  | "DISCHARGE"
  | "DOCUMENTATION"
  | "PROCEDURE"
  | "HANDOFF"
  | "VITALS"
  | "OTHER";

export function clinicalTimelineCarePhaseForDisplayEventType(displayEventType: string): ClinicalTimelineCarePhase {
  switch (displayEventType) {
    case "OBSERVATION_ADMISSION_PACKET_SAVED":
    case "ADMISSION_SUMMARY_SAVED":
      return "OBSERVATION";
    case "DISCHARGE_SUMMARY_SAVED":
      return "DISCHARGE";
    case "DISPOSITION_SUPPLEMENT_SAVED":
    case "TRIAGE_ASSESSMENT_SAVED":
    case "PROVIDER_MSE_SAVED":
      return "ED";
    case "HANDOFF_NURSING":
    case "HANDOFF_PROVIDER":
      return "HANDOFF";
    case "VITALS_RECORDED":
      return "VITALS";
    case "PROCEDURE_DOCUMENTED":
    case "IV_INSERTED":
    case "IV_REMOVED":
      return "PROCEDURE";
    case "NURSING_ASSESSMENT_SAVED":
    case "PROVIDER_SIGNED":
    case "PROVIDER_UNLOCKED":
      return "DOCUMENTATION";
    default:
      return "OTHER";
  }
}

/** i18n path (`apps/web` mirrors in en.ts / fr.ts). */
export function clinicalTimelineDisplayLabelKey(displayEventType: string): string {
  const alias: Record<string, string> = {
    VITALS_RECORDED: "emergencyVisitSummaryPanel.clinicalTimeline.event.vitalsRecorded",
    PROVIDER_SIGNED: "emergencyVisitSummaryPanel.clinicalTimeline.event.providerSigned",
    PROVIDER_UNLOCKED: "emergencyVisitSummaryPanel.clinicalTimeline.event.providerUnlocked",
    PROVIDER_MSE_SAVED: "emergencyVisitSummaryPanel.clinicalTimeline.event.providerMseSaved",
    NURSING_ASSESSMENT_SAVED: "emergencyVisitSummaryPanel.clinicalTimeline.event.nursingAssessmentSaved",
    HANDOFF_PROVIDER: "emergencyVisitSummaryPanel.clinicalTimeline.event.handoffProvider",
    HANDOFF_NURSING: "emergencyVisitSummaryPanel.clinicalTimeline.event.handoffNursing",
    IV_INSERTED: "emergencyVisitSummaryPanel.clinicalTimeline.event.ivInserted",
    IV_REMOVED: "emergencyVisitSummaryPanel.clinicalTimeline.event.ivRemoved",
    PROCEDURE_DOCUMENTED: "emergencyVisitSummaryPanel.clinicalTimeline.event.procedureDocumented",
  };
  return alias[displayEventType] ?? `clinicalTimelineDisplay.event.${displayEventType}`;
}

/** French labels for server-rendered export HTML (product language). */
export const CLINICAL_TIMELINE_DISPLAY_LABEL_FR: Record<string, string> = {
  VITALS_RECORDED: "Signes vitaux enregistrés",
  PROVIDER_SIGNED: "Documentation signée par le médecin",
  PROVIDER_UNLOCKED: "Documentation déverrouillée par le médecin",
  PROVIDER_MSE_SAVED: "Examen médical mis à jour",
  NURSING_ASSESSMENT_SAVED: "Évaluation infirmière mise à jour",
  HANDOFF_PROVIDER: "Passation médecin",
  HANDOFF_NURSING: "Passation infirmière",
  IV_INSERTED: "IV posé",
  IV_REMOVED: "IV retiré",
  PROCEDURE_DOCUMENTED: "Procédure documentée",
  DISCHARGE_SUMMARY_SAVED: "Dossier de sortie enregistré",
  ADMISSION_SUMMARY_SAVED: "Dossier d'admission (observation) enregistré",
  OBSERVATION_ADMISSION_PACKET_SAVED: "Admission en observation enregistrée",
  DISPOSITION_SUPPLEMENT_SAVED: "Complément de disposition enregistré",
  TRIAGE_ASSESSMENT_SAVED: "Triage enregistré",
};

export function clinicalTimelineDisplayLabelFr(displayEventType: string): string {
  return CLINICAL_TIMELINE_DISPLAY_LABEL_FR[displayEventType] ?? displayEventType;
}

export function clinicalDocumentationEventBelongsInDischargeHistory(event: ClinicalTimelineStoredRow): boolean {
  const display = resolveClinicalTimelineDisplayEventType(event);
  if (display !== "DISCHARGE_SUMMARY_SAVED") return false;
  const payload = event.payloadJson;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return true;
  const snap = (payload as Record<string, unknown>).snapshot;
  return !dischargeSnapshotIsObservationAdmissionRoutingOnly(snap);
}

export function clinicalDocumentationEventBelongsInAdmissionHistory(event: ClinicalTimelineStoredRow): boolean {
  const display = resolveClinicalTimelineDisplayEventType(event);
  return display === "ADMISSION_SUMMARY_SAVED" || display === "OBSERVATION_ADMISSION_PACKET_SAVED";
}

/* ---------- Order attribution (display) ---------- */

export type OrderAttributionActionKind =
  | "ORDERED"
  | "PERFORMED"
  | "RESULTED"
  | "ACKNOWLEDGED"
  | "CANCELLED"
  | "ADJUSTED";

export function orderAttributionLabelKey(kind: OrderAttributionActionKind): string {
  switch (kind) {
    case "ORDERED":
      return "attribution.orderedBy";
    case "PERFORMED":
      return "attribution.performedBy";
    case "RESULTED":
      return "attribution.resultedBy";
    case "ACKNOWLEDGED":
      return "attribution.acknowledgedBy";
    case "CANCELLED":
      return "attribution.cancelledBy";
    case "ADJUSTED":
      return "attribution.adjustedBy";
    default:
      return "attribution.actionBy";
  }
}

export function orderAttributionActionFromLastAction(action: string | null | undefined): OrderAttributionActionKind | null {
  switch ((action ?? "").trim().toUpperCase()) {
    case "CANCELLED":
      return "CANCELLED";
    case "COMPLETED":
    case "ADMINISTERED":
      return "PERFORMED";
    case "RESULTED":
      return "RESULTED";
    case "ACKNOWLEDGED":
      return "ACKNOWLEDGED";
    case "ADJUSTED":
      return "ADJUSTED";
    default:
      return null;
  }
}

export function orderAttributionActionForOrderType(
  action: string | null | undefined,
  orderType: string | null | undefined
): OrderAttributionActionKind | null {
  const base = orderAttributionActionFromLastAction(action);
  if (!base) return null;
  const ot = (orderType ?? "").trim().toUpperCase();
  if (base === "PERFORMED" && (action ?? "").trim().toUpperCase() === "COMPLETED") {
    if (ot === "LAB" || ot === "IMAGING") return "RESULTED";
  }
  if (base === "PERFORMED" && (action ?? "").trim().toUpperCase() === "RESULTED") {
    return "RESULTED";
  }
  return base;
}

/** True when order creator must not be shown as performer/resulted actor. */
export function orderCreatorMustNotDisplayAsPerformer(input: {
  creatorName?: string | null;
  actorName?: string | null;
}): boolean {
  const c = (input.creatorName ?? "").trim();
  const a = (input.actorName ?? "").trim();
  return Boolean(c && a && c === a);
}

/* ---------- Clinical time correction (display) ---------- */

function toValidIso(raw: string | Date | null | undefined): string | null {
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw.toISOString();
  }
  if (typeof raw === "string" && raw.trim()) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

export type ClinicalTimeDisplayPair = {
  /** Use for timeline sort — documented time only. */
  sortAtIso: string | null;
  documentedAtIso: string | null;
  effectiveAtIso: string | null;
  hasCorrection: boolean;
};

/**
 * Effective clinical overlays never replace documented time for ordering.
 * `hasCorrection` when version > 0 or effective materially differs from documented.
 */
export function buildClinicalTimeDisplayPair(input: {
  documentedAt?: string | Date | null;
  effectiveAt?: string | Date | null;
  adjustmentVersion?: number | null;
  /** Fallback when documented missing (e.g. createdAt). */
  sortFallbackAt?: string | Date | null;
}): ClinicalTimeDisplayPair {
  const documentedAtIso = toValidIso(input.documentedAt) ?? toValidIso(input.sortFallbackAt);
  const effectiveAtIso = toValidIso(input.effectiveAt);
  const version = typeof input.adjustmentVersion === "number" ? input.adjustmentVersion : 0;
  const timesDiffer =
    documentedAtIso &&
    effectiveAtIso &&
    new Date(documentedAtIso).getTime() !== new Date(effectiveAtIso).getTime();
  const hasCorrection = version > 0 || Boolean(timesDiffer);
  return {
    sortAtIso: documentedAtIso,
    documentedAtIso,
    effectiveAtIso: hasCorrection ? effectiveAtIso ?? documentedAtIso : documentedAtIso,
    hasCorrection,
  };
}
