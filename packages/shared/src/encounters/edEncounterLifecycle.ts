/**
 * MEDUI.ED.LIFECYCLE.2 — ED encounter lifecycle read model (projection only).
 * Never mutates encounters; pure classification from snapshot fields.
 */

import { erHandoffV1SatisfiesInpatientTransferConfirm } from "../erHandoffV1.js";
import { DISCHARGE_MODE_FR_ADMISSION } from "./observationAdmissionDischargeRouting.js";
import { readEdDischargeSortieExecutionFromNursingAssessment } from "./edDispositionExecutionV1.js";
import { adaptiveNursingDepartureSatisfied } from "./adaptiveEdNursingExecutionD4a2.js";

/** Canonical French discharge mode labels (aligned with web + API). */
export const ED_DISCHARGE_MODE_HOME = "Domicile";
export const ED_DISCHARGE_MODE_TRANSFER = "Transfert vers un autre établissement";
export const ED_DISCHARGE_MODE_ADMISSION = DISCHARGE_MODE_FR_ADMISSION;
export const ED_DISCHARGE_MODE_AMA = "Contre avis médical (LAMA)";
export const ED_DISCHARGE_MODE_DECEASED = "Décès";
export const ED_DISCHARGE_MODE_OTHER = "Autre";
/** D2.5 — first-class LWBS mode (legacy OTHER + lwbsNarrative still resolves to LWBS). */
export const ED_DISCHARGE_MODE_LWBS = "Départ avant évaluation (LWBS)";
/** D2.5 — distinct from LWBS (post-evaluation unauthorized departure). */
export const ED_DISCHARGE_MODE_ELOPEMENT = "Fugue / départ non autorisé";

export const ER_DISPOSITION_V1_KEY = "erDispositionV1" as const;

export type EdDispositionPath =
  | "HOME"
  | "ADMISSION"
  | "TRANSFER"
  | "AMA"
  | "DECEASED"
  | "LWBS"
  | "ELOPEMENT"
  | "OTHER"
  | "NONE";

export const EdEncounterLifecycleState = {
  ACTIVE_ED: "ACTIVE_ED",
  DISPOSITION_ORDERED: "DISPOSITION_ORDERED",
  INCOMPLETE_CHART: "INCOMPLETE_CHART",
  READY_FOR_CLOSURE: "READY_FOR_CLOSURE",
  CLOSED_ENCOUNTER: "CLOSED_ENCOUNTER",
  ARCHIVED_ALL_ENCOUNTERS: "ARCHIVED_ALL_ENCOUNTERS",
} as const;

export type EdEncounterLifecycleState =
  (typeof EdEncounterLifecycleState)[keyof typeof EdEncounterLifecycleState];

export type EdEncounterLifecycleDisplaySeverity =
  | "routine"
  | "monitoring"
  | "warning"
  | "success"
  | "neutral";

export type EdEncounterLifecycleProjection = {
  state: EdEncounterLifecycleState;
  displayLabel: string;
  displaySeverity: EdEncounterLifecycleDisplaySeverity;
  physicalDepartureComplete: boolean;
  documentationComplete: boolean;
  readyForClosure: boolean;
  closed: boolean;
  archived: boolean;
};

/** Encounter snapshot input — no database access. */
export type EdEncounterLifecycleEncounterSnapshot = {
  status: string;
  workflowState?: string | null;
  providerDocumentationStatus?: string | null;
  dischargeSummaryJson?: unknown;
  admissionSummaryJson?: unknown;
  nursingAssessment?: unknown;
  billingFinalizationStatus?: string | null;
  dischargedAt?: string | Date | null;
  /** Optional encounter fields for close-documentation deficiency evaluation. */
  chiefComplaint?: string | null;
  providerNote?: string | null;
  treatmentPlan?: string | null;
  encounterType?: string | null;
  /** Caller-supplied disposition safety (orders/vitals context). Enables READY_FOR_CLOSURE without DB. */
  dispositionSafetyReadiness?: { canClose: boolean } | null;
  /** Assignment metadata — ignored by lifecycle classifier (workload only). */
  nurseAssignedUserId?: string | null;
  physicianAssignedUserId?: string | null;
};

const LIFECYCLE_DISPLAY_LABEL: Record<EdEncounterLifecycleState, string> = {
  ACTIVE_ED: "Active ED",
  DISPOSITION_ORDERED: "Disposition Ordered",
  INCOMPLETE_CHART: "Incomplete Chart",
  READY_FOR_CLOSURE: "Ready For Closure",
  CLOSED_ENCOUNTER: "Closed Encounter",
  ARCHIVED_ALL_ENCOUNTERS: "Archived",
};

const LIFECYCLE_DISPLAY_SEVERITY: Record<EdEncounterLifecycleState, EdEncounterLifecycleDisplaySeverity> =
  {
    ACTIVE_ED: "routine",
    DISPOSITION_ORDERED: "monitoring",
    INCOMPLETE_CHART: "warning",
    READY_FOR_CLOSURE: "success",
    CLOSED_ENCOUNTER: "neutral",
    ARCHIVED_ALL_ENCOUNTERS: "neutral",
  };

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function strField(o: Record<string, unknown> | null, key: string): string {
  if (!o) return "";
  const v = o[key];
  return typeof v === "string" ? v.trim() : "";
}

function hasPhysicianEvalV1Content(nursingAssessment: unknown): boolean {
  const nursing = asObject(nursingAssessment);
  if (!nursing) return false;
  const pe = nursing.physicianEvalV1;
  const evalObj = asObject(pe);
  if (!evalObj) return false;
  for (const k of ["hpi", "ros", "physicalExam", "mdm"]) {
    const v = evalObj[k];
    if (typeof v === "string" && v.trim().length > 0) return true;
  }
  return false;
}

function encounterHasSignableProviderContent(snapshot: EdEncounterLifecycleEncounterSnapshot): boolean {
  if (snapshot.providerNote?.trim()) return true;
  if (snapshot.treatmentPlan?.trim()) return true;
  return hasPhysicianEvalV1Content(snapshot.nursingAssessment);
}

function nursingAssessmentHasContent(raw: unknown): boolean {
  const o = asObject(raw);
  if (!o) return false;

  // Common alternate / legacy nursing note shapes (avoid false "missing" when evalV1 absent).
  for (const key of ["nursingNote", "assessment", "note", "nursingAssessmentText"]) {
    const v = o[key];
    if (typeof v === "string" && v.trim().length > 0) return true;
  }

  const inner = o.nursingEvalV1;
  const ne = asObject(inner);
  if (!ne) return false;
  const sections = ne.sections;
  if (sections && typeof sections === "object") {
    for (const v of Object.values(sections as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim().length > 0) return true;
      const section = asObject(v);
      if (section && typeof section.text === "string" && section.text.trim().length > 0) return true;
    }
  }
  const sl = ne.summaryLinesFr;
  if (Array.isArray(sl) && sl.some((x) => typeof x === "string" && x.trim().length > 0)) return true;
  const pv = ne.proceduresV1;
  const proc = asObject(pv);
  if (proc) {
    const iv = asObject(proc.ivInsertion);
    if (iv && iv.performed === true) return true;
  }
  return false;
}

function admissionSummaryHasContent(raw: unknown): boolean {
  const o = asObject(raw);
  if (!o) return false;
  return Object.values(o).some((v) => typeof v === "string" && v.trim().length > 0);
}

function dischargeSummaryHasPersistedContent(raw: unknown): boolean {
  const o = asObject(raw);
  if (!o) return false;
  // dischargeMode alone is disposition selection — not a completed discharge packet.
  const keys = Object.keys(o).filter((k) => k !== "dischargeMode");
  if (keys.length === 0) return false;
  return keys.some((k) => {
    const v = o[k];
    if (typeof v === "string") return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0;
    if (v && typeof v === "object") return Object.keys(v as object).length > 0;
    return v != null && v !== false;
  });
}

function hasErDispositionLwbsDocumented(nursingAssessment: unknown): boolean {
  const nursing = asObject(nursingAssessment);
  if (!nursing) return false;
  const sup = asObject(nursing[ER_DISPOSITION_V1_KEY]);
  if (!sup) return false;
  const lwbs = sup.lwbsNarrative;
  return typeof lwbs === "string" && lwbs.trim().length > 0;
}

/** Resolve disposition path from persisted JSON (no inference from status alone). */
export function resolveEdDispositionPath(
  snapshot: Pick<
    EdEncounterLifecycleEncounterSnapshot,
    "dischargeSummaryJson" | "admissionSummaryJson" | "nursingAssessment"
  >
): EdDispositionPath {
  const discharge = asObject(snapshot.dischargeSummaryJson);
  const mode = strField(discharge, "dischargeMode");
  if (mode === ED_DISCHARGE_MODE_HOME) return "HOME";
  if (mode === ED_DISCHARGE_MODE_AMA) return "AMA";
  if (mode === ED_DISCHARGE_MODE_TRANSFER) return "TRANSFER";
  if (mode === ED_DISCHARGE_MODE_ADMISSION) return "ADMISSION";
  if (mode === ED_DISCHARGE_MODE_DECEASED) return "DECEASED";
  if (mode === ED_DISCHARGE_MODE_LWBS) return "LWBS";
  if (mode === ED_DISCHARGE_MODE_ELOPEMENT) return "ELOPEMENT";
  // Legacy: LWBS stored as OTHER + lwbsNarrative before D2.5 first-class mode.
  if (mode === ED_DISCHARGE_MODE_OTHER && hasErDispositionLwbsDocumented(snapshot.nursingAssessment)) {
    return "LWBS";
  }
  if (mode === ED_DISCHARGE_MODE_OTHER) return "OTHER";
  if (admissionSummaryHasContent(snapshot.admissionSummaryJson)) return "ADMISSION";
  return "NONE";
}

/** True when a disposition decision is documented but physical ED departure is not complete. */
export function isEdDispositionOrdered(snapshot: EdEncounterLifecycleEncounterSnapshot): boolean {
  if (isEdPhysicalDepartureCompleted(snapshot)) return false;
  return resolveEdDispositionPath(snapshot) !== "NONE";
}

/**
 * Audit-derived physical departure completion (HOME, AMA, TRANSFER, ADMISSION).
 * Read-only — uses erDispositionExecutionV1, erHandoffV1, and (D4A.2.1) adaptive nursing completion.
 */
export function isEdPhysicalDepartureCompleted(
  snapshot: Pick<
    EdEncounterLifecycleEncounterSnapshot,
    "dischargeSummaryJson" | "admissionSummaryJson" | "nursingAssessment"
  >
): boolean {
  const path = resolveEdDispositionPath(snapshot);
  if (path === "NONE") return false;

  if (path === "HOME" || path === "AMA") {
    return readEdDischargeSortieExecutionFromNursingAssessment(snapshot.nursingAssessment) != null;
  }

  if (path === "TRANSFER" || path === "ADMISSION") {
    // Legacy handoff OR D4A.2.1 adaptive nursing departure completion (either satisfies).
    return (
      erHandoffV1SatisfiesInpatientTransferConfirm(snapshot.nursingAssessment) ||
      adaptiveNursingDepartureSatisfied(snapshot.nursingAssessment)
    );
  }

  if (path === "DECEASED" || path === "LWBS" || path === "ELOPEMENT" || path === "OTHER") {
    return true;
  }

  return false;
}

export function isEdProviderDocumentationSigned(
  snapshot: Pick<EdEncounterLifecycleEncounterSnapshot, "providerDocumentationStatus">
): boolean {
  return (snapshot.providerDocumentationStatus ?? "").trim() === "SIGNED";
}

/** Close-documentation deficiencies mirroring API evaluateEncounterDocumentationDeficiencies (snapshot-only). */
export function evaluateEdEncounterDocumentationDeficiencies(
  snapshot: EdEncounterLifecycleEncounterSnapshot
): { deficiencies: Array<{ code: string }>; hasDeficiencies: boolean } {
  const deficiencies: Array<{ code: string }> = [];

  if (!snapshot.chiefComplaint?.trim()) {
    deficiencies.push({ code: "CHIEF_COMPLAINT" });
  }
  if (!encounterHasSignableProviderContent(snapshot)) {
    deficiencies.push({ code: "PROVIDER_DOCUMENTATION" });
  }
  if (!nursingAssessmentHasContent(snapshot.nursingAssessment)) {
    deficiencies.push({ code: "NURSING_ASSESSMENT" });
  }
  // D2.5 — home discharge packet applies to HOME only (AMA uses dedicated board).
  // Admission/transfer/deceased/LWBS/elopement/other must not inherit home-discharge requirements.
  const dispositionPath = resolveEdDispositionPath(snapshot);
  if (
    dispositionPath === "HOME" &&
    !dischargeSummaryHasPersistedContent(snapshot.dischargeSummaryJson)
  ) {
    deficiencies.push({ code: "DISCHARGE_SUMMARY" });
  }
  if (
    (snapshot.encounterType ?? "").trim() === "INPATIENT" ||
    dispositionPath === "ADMISSION"
  ) {
    if (!admissionSummaryHasContent(snapshot.admissionSummaryJson)) {
      deficiencies.push({ code: "ADMISSION_SUMMARY" });
    }
  }

  return { deficiencies, hasDeficiencies: deficiencies.length > 0 };
}

/** Documentation complete for lifecycle (provider signed + no close deficiencies). */
export function isEdEncounterDocumentationComplete(
  snapshot: EdEncounterLifecycleEncounterSnapshot
): boolean {
  if (!isEdProviderDocumentationSigned(snapshot)) return false;
  return !evaluateEdEncounterDocumentationDeficiencies(snapshot).hasDeficiencies;
}

/** Ready for legal closure — requires caller-supplied disposition safety when orders/vitals matter. */
export function isEdEncounterReadyForClosure(snapshot: EdEncounterLifecycleEncounterSnapshot): boolean {
  if ((snapshot.status ?? "").trim() !== "OPEN") return false;
  if (!isEdPhysicalDepartureCompleted(snapshot)) return false;
  if (!isEdProviderDocumentationSigned(snapshot)) return false;
  if (!isEdEncounterDocumentationComplete(snapshot)) return false;
  return snapshot.dispositionSafetyReadiness?.canClose === true;
}

export function isEdEncounterArchived(snapshot: EdEncounterLifecycleEncounterSnapshot): boolean {
  if ((snapshot.status ?? "").trim() !== "CLOSED") return false;
  return isEdProviderDocumentationSigned(snapshot);
}

/**
 * Authoritative ED lifecycle classifier — read-only projection.
 * Assignment fields do not affect classification.
 */
export function resolveEdEncounterLifecycleState(
  snapshot: EdEncounterLifecycleEncounterSnapshot
): EdEncounterLifecycleState {
  const status = (snapshot.status ?? "").trim();

  if (status === "CLOSED") {
    if (isEdEncounterArchived(snapshot)) {
      return EdEncounterLifecycleState.ARCHIVED_ALL_ENCOUNTERS;
    }
    return EdEncounterLifecycleState.CLOSED_ENCOUNTER;
  }

  if (status !== "OPEN") {
    return EdEncounterLifecycleState.CLOSED_ENCOUNTER;
  }

  const physicalDepartureComplete = isEdPhysicalDepartureCompleted(snapshot);

  if (physicalDepartureComplete) {
    if (isEdEncounterReadyForClosure(snapshot)) {
      return EdEncounterLifecycleState.READY_FOR_CLOSURE;
    }
    return EdEncounterLifecycleState.INCOMPLETE_CHART;
  }

  if (isEdDispositionOrdered(snapshot)) {
    return EdEncounterLifecycleState.DISPOSITION_ORDERED;
  }

  return EdEncounterLifecycleState.ACTIVE_ED;
}

export function buildEdEncounterLifecycleProjection(
  snapshot: EdEncounterLifecycleEncounterSnapshot
): EdEncounterLifecycleProjection {
  const state = resolveEdEncounterLifecycleState(snapshot);
  const physicalDepartureComplete = isEdPhysicalDepartureCompleted(snapshot);
  const documentationComplete = isEdEncounterDocumentationComplete(snapshot);
  const readyForClosure = state === EdEncounterLifecycleState.READY_FOR_CLOSURE;
  const closed =
    state === EdEncounterLifecycleState.CLOSED_ENCOUNTER ||
    state === EdEncounterLifecycleState.ARCHIVED_ALL_ENCOUNTERS;
  const archived = state === EdEncounterLifecycleState.ARCHIVED_ALL_ENCOUNTERS;

  return {
    state,
    displayLabel: LIFECYCLE_DISPLAY_LABEL[state],
    displaySeverity: LIFECYCLE_DISPLAY_SEVERITY[state],
    physicalDepartureComplete,
    documentationComplete,
    readyForClosure,
    closed,
    archived,
  };
}

/** Read-only certification marker for tests and governance audits. */
export const ED_ENCOUNTER_LIFECYCLE_READ_ONLY = true as const;
