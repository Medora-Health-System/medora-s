/**
 * MEDUI.D4C.2 — Clinic Care trackboard stage / metric / view projection helpers.
 * Presentation-only: maps existing EncounterWorkflowState + ops onto ambulatory UI.
 * Does not invent parallel workflow persistence or ClinicDischarge tables.
 */

import {
  CLINIC_CARE_PRIMARY_TRACKBOARD_METRIC_IDS,
  CLINIC_CARE_SECONDARY_TRACKBOARD_METRIC_IDS,
  CLINIC_CARE_TRACKBOARD_METRIC_CONTRACTS,
  type ClinicCareTrackboardMetricId,
} from "./facilityClinicCareProfileD4c1.js";
import {
  getZonedWallClockParts,
  wallClockToUtc,
} from "../medication/medicationDoseExpansionPlanner.js";
import { resolveFacilityTimezone } from "../clinical/facilityTimezoneDefaults.js";
import type { ProfessionGroup } from "./professionResolver.js";

/** Ambulatory encounter types for Clinic Care board (exclude ED / inpatient). */
export const CLINIC_CARE_AMBULATORY_ENCOUNTER_TYPES = ["OUTPATIENT", "URGENT_CARE"] as const;
export type ClinicCareAmbulatoryEncounterType =
  (typeof CLINIC_CARE_AMBULATORY_ENCOUNTER_TYPES)[number];

/**
 * D4C.1 ambulatory operating-mode / subtype → durable Encounter.type mapping.
 * No duplicate encounter types. Walk-in / Preventive / Occupational / Specialty
 * visit typing without durable fields remains D4C.3; they map to OUTPATIENT when
 * represented by existing ambulatory facility + OUTPATIENT encounters.
 */
export const CLINIC_CARE_AMBULATORY_MODE_ENCOUNTER_TYPE_MAP = {
  CLINIC: ["OUTPATIENT"] as const,
  PRIMARY_CARE: ["OUTPATIENT"] as const,
  SPECIALTY: ["OUTPATIENT"] as const,
  WALK_IN: ["OUTPATIENT"] as const,
  PREVENTIVE: ["OUTPATIENT"] as const,
  OCCUPATIONAL_HEALTH: ["OUTPATIENT"] as const,
  URGENT_CARE: ["URGENT_CARE"] as const,
} as const;

export type ClinicCareAmbulatoryModeLabel = keyof typeof CLINIC_CARE_AMBULATORY_MODE_ENCOUNTER_TYPE_MAP;

export const CLINIC_CARE_TRACKBOARD_VIEWS = [
  "ALL_TODAY",
  "WAITING",
  "NURSING_MA",
  "PROVIDER",
  "RESULTS_PENDING",
  "DISCHARGE_PENDING",
  "FOLLOW_UP_DUE",
  "COMPLETED",
] as const;
export type ClinicCareTrackboardView = (typeof CLINIC_CARE_TRACKBOARD_VIEWS)[number];

/**
 * Canonical EncounterWorkflowState values that mean provider-authorized discharge /
 * end-visit pathway with outstanding completion steps (still OPEN).
 * Source of Discharge Pending KPI — no parallel ClinicDischarge flag.
 */
export const CLINIC_CARE_DISCHARGE_PENDING_SOURCE_WORKFLOW_STATES = [
  "DISCHARGE_READY",
  "FINALIZED",
] as const;

/**
 * Private legacy alias — prior D4C.2 drafts labeled this READY_FOR_COMPLETION.
 * Same source states as DISCHARGE_PENDING. Not a user-facing KPI id.
 * Kept so audits can prove we reused enterprise pathway states rather than inventing new ones.
 */
export const CLINIC_CARE_LEGACY_READY_FOR_COMPLETION_SOURCE_STATES =
  CLINIC_CARE_DISCHARGE_PENDING_SOURCE_WORKFLOW_STATES;

/**
 * UI stage tokens projected from EncounterWorkflowState (+ ops).
 * DISCHARGE_PENDING ← source DISCHARGE_READY / FINALIZED while OPEN.
 */
export const CLINIC_CARE_STAGE_IDS = [
  "WAITING",
  "IN_PROGRESS",
  "RESULTS_PENDING",
  "DISCHARGE_PENDING",
  "COMPLETED",
  "NEEDS_REVIEW",
  "STATUS_UNAVAILABLE",
] as const;
export type ClinicCareStageId = (typeof CLINIC_CARE_STAGE_IDS)[number];

export type ClinicCareStageProjection = {
  stageId: ClinicCareStageId;
  /** Raw workflow state when known; null when unavailable. Canonical names preserved. */
  sourceWorkflowState: string | null;
  /** True when stage was inferred from pending diagnostics rather than workflow state alone. */
  inferredFromPendingDiagnostics: boolean;
};

export type ClinicCareMetricCountMap = Record<ClinicCareTrackboardMetricId, number>;

/** Role-filtered trackboard column / PHI visibility (presentation only). */
export type ClinicCareTrackboardFieldVisibility = {
  showChiefComplaint: boolean;
  showNurseName: boolean;
  showOpenOrderCount: boolean;
  showResultsPendingCount: boolean;
  showNextStepHint: boolean;
  showClinicalActionLinks: boolean;
  showProviderName: boolean;
  /** Discharge Pending KPI is primary for all board viewers; role gates actions separately. */
  showDischargePendingKpi: boolean;
  /** Existing discharge / complete actions only when clinical authority already grants them. */
  showDischargeActions: boolean;
};

export function emptyClinicCareMetricCounts(): ClinicCareMetricCountMap {
  return {
    TODAYS_VISITS: 0,
    WAITING: 0,
    IN_PROGRESS: 0,
    RESULTS_PENDING: 0,
    DISCHARGE_PENDING: 0,
    FOLLOW_UPS_DUE: 0,
  };
}

export function isClinicCareAmbulatoryEncounterType(
  type: string | null | undefined
): type is ClinicCareAmbulatoryEncounterType {
  const u = String(type ?? "")
    .trim()
    .toUpperCase();
  return u === "OUTPATIENT" || u === "URGENT_CARE";
}

/** Encounter types included for a D4C.1 ambulatory mode/subtype label. */
export function encounterTypesForClinicCareAmbulatoryMode(
  mode: ClinicCareAmbulatoryModeLabel | string
): readonly ClinicCareAmbulatoryEncounterType[] {
  const key = String(mode ?? "")
    .trim()
    .toUpperCase() as ClinicCareAmbulatoryModeLabel;
  const mapped = CLINIC_CARE_AMBULATORY_MODE_ENCOUNTER_TYPE_MAP[key];
  if (mapped) return mapped;
  // Safe generic ambulatory label when durable visit-type missing (D4C.3 deferral).
  return CLINIC_CARE_AMBULATORY_ENCOUNTER_TYPES;
}

/**
 * Whether a visit represented under a D4C.1 mode label is included in the ambulatory board
 * when stored as the given Encounter.type (no inventing missing subtypes).
 */
export function ambulatoryModeIncludedByEncounterType(input: {
  modeLabel: ClinicCareAmbulatoryModeLabel | string;
  encounterType: string | null | undefined;
}): boolean {
  if (!isClinicCareAmbulatoryEncounterType(input.encounterType)) return false;
  const allowed = encounterTypesForClinicCareAmbulatoryMode(input.modeLabel);
  return (allowed as readonly string[]).includes(
    String(input.encounterType).trim().toUpperCase()
  );
}

function addCalendarDay(year: number, month: number, day: number): {
  year: number;
  month: number;
  day: number;
} {
  const d = new Date(Date.UTC(year, month - 1, day + 1, 12, 0, 0, 0));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Facility-local calendar day bounds as UTC instants (inclusive start, exclusive end). */
export function facilityLocalDayUtcBounds(
  now: Date,
  facilityTimeZone: string | null | undefined
): { startUtc: Date; endExclusiveUtc: Date; localDateKey: string; timeZone: string } {
  const tz = resolveFacilityTimezone(facilityTimeZone);
  const parts = getZonedWallClockParts(now, tz);
  const startUtc = wallClockToUtc(parts.year, parts.month, parts.day, 0, 0, tz);
  const next = addCalendarDay(parts.year, parts.month, parts.day);
  const endExclusiveUtc = wallClockToUtc(next.year, next.month, next.day, 0, 0, tz);
  const localDateKey = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
  return {
    startUtc,
    endExclusiveUtc,
    localDateKey,
    timeZone: tz,
  };
}

/**
 * FOLLOW_UPS_DUE inclusion (due today + overdue; tomorrow excluded).
 * Equivalent to D4C.5B.1 `projectClinicFollowUpStatus` with periodEnd = today end
 * (see clinicFollowUpProjectionD4c5b1 — keep semantics aligned; tests assert equivalence).
 * Closed encounters do not drop valid follow-ups (encounter status unused).
 */
export function isClinicCareFollowUpDue(input: {
  authenticatedFacilityId: string;
  followUpFacilityId: string;
  status: string | null | undefined;
  dueDate: Date | string | null | undefined;
  dayEndExclusiveUtc: Date;
  /** When linked, encounter must be ambulatory; null/undefined = unlinked (allowed at facility). */
  linkedEncounterType?: string | null;
  encounterFacilityId?: string | null;
  appointmentFacilityId?: string | null;
}): boolean {
  const auth = String(input.authenticatedFacilityId ?? "").trim();
  if (!auth) return false;
  const scopeIds = [
    input.followUpFacilityId,
    input.encounterFacilityId,
    input.appointmentFacilityId,
  ]
    .map((x) => String(x ?? "").trim())
    .filter(Boolean);
  if (!scopeIds.some((id) => id === auth)) return false;

  const status = String(input.status ?? "")
    .trim()
    .toUpperCase();
  if (status !== "OPEN") return false;

  if (input.linkedEncounterType != null && String(input.linkedEncounterType).trim() !== "") {
    if (!isClinicCareAmbulatoryEncounterType(input.linkedEncounterType)) return false;
  }

  if (input.dueDate == null || input.dueDate === "") return false;
  const due =
    input.dueDate instanceof Date ? input.dueDate : new Date(input.dueDate);
  if (Number.isNaN(due.getTime())) return false;

  // Due today + overdue: dueDate < end of facility-local today (exclusive).
  return due.getTime() < input.dayEndExclusiveUtc.getTime();
}

/**
 * Deterministic Discharge Pending inclusion against enterprise discharge / pathway engine.
 *
 * Inclusion (all required):
 * 1. Ambulatory encounter type OUTPATIENT | URGENT_CARE
 * 2. Encounter.status === OPEN (not CLOSED / CANCELLED)
 * 3. Encounter.workflowState ∈ { DISCHARGE_READY, FINALIZED }
 *    — these states mean provider pathway advanced to discharge/end-visit authorization
 *      with outstanding completion steps still remaining
 *
 * Removal / exclusion:
 * - status CLOSED or CANCELLED (departed / finalized / closed per legal close)
 * - EMERGENCY / INPATIENT / transferred-away types (not on Clinic Care board)
 * - wait time alone, orders complete, results complete, unassigned, filter changes
 * - DISPOSITION / IN_TREATMENT without DISCHARGE_READY or FINALIZED
 *
 * Provider action → canonical state → KPI:
 * Provider advances pathway to DISCHARGE_READY (or FINALIZED) → include.
 * Encounter close() → status CLOSED / workflow CLOSED → leave KPI.
 */
export function isClinicCareDischargePending(input: {
  encounterType?: string | null;
  encounterStatus?: string | null;
  workflowState?: string | null;
  /** Optional dischargeStatus — TRANSFERRED / DECEASED with OPEN still follow workflow; CLOSED excludes. */
  dischargeStatus?: string | null;
}): boolean {
  if (!isClinicCareAmbulatoryEncounterType(input.encounterType)) return false;

  const status = String(input.encounterStatus ?? "")
    .trim()
    .toUpperCase();
  if (status !== "OPEN") return false;

  const wf = String(input.workflowState ?? "")
    .trim()
    .toUpperCase();
  if (
    !(CLINIC_CARE_DISCHARGE_PENDING_SOURCE_WORKFLOW_STATES as readonly string[]).includes(wf)
  ) {
    return false;
  }

  // Do not invent inclusion from dischargeStatus alone (e.g. DISCHARGED with CLOSED is excluded above).
  void input.dischargeStatus;
  return true;
}

/**
 * Project a clinic care stage from shared workflow state + pending diagnostics.
 * Unknown / missing → STATUS_UNAVAILABLE or NEEDS_REVIEW (never invent completed care).
 * Source states DISCHARGE_READY / FINALIZED → DISCHARGE_PENDING (ambulatory KPI terminology).
 */
export function projectClinicCareStage(input: {
  workflowState?: string | null;
  encounterStatus?: string | null;
  resultsPendingCount?: number | null;
  encounterType?: string | null;
}): ClinicCareStageProjection {
  const status = String(input.encounterStatus ?? "")
    .trim()
    .toUpperCase();
  const raw = input.workflowState == null ? "" : String(input.workflowState).trim();
  const wf = raw.toUpperCase();
  const pending = Math.max(0, Number(input.resultsPendingCount ?? 0) || 0);

  if (status === "CANCELLED") {
    return {
      stageId: "STATUS_UNAVAILABLE",
      sourceWorkflowState: raw || null,
      inferredFromPendingDiagnostics: false,
    };
  }

  if (status === "CLOSED" || wf === "CLOSED") {
    return {
      stageId: "COMPLETED",
      sourceWorkflowState: raw || "CLOSED",
      inferredFromPendingDiagnostics: false,
    };
  }

  if (!wf) {
    return {
      stageId: "STATUS_UNAVAILABLE",
      sourceWorkflowState: null,
      inferredFromPendingDiagnostics: false,
    };
  }

  if (wf === "ARRIVED" || wf === "TRIAGE") {
    return {
      stageId: "WAITING",
      sourceWorkflowState: raw,
      inferredFromPendingDiagnostics: false,
    };
  }

  if (wf === "RESULTS_PENDING" || (pending > 0 && (wf === "IN_TREATMENT" || wf === "DISPOSITION"))) {
    return {
      stageId: "RESULTS_PENDING",
      sourceWorkflowState: raw,
      inferredFromPendingDiagnostics: wf !== "RESULTS_PENDING" && pending > 0,
    };
  }

  if (wf === "IN_TREATMENT" || wf === "DISPOSITION") {
    return {
      stageId: "IN_PROGRESS",
      sourceWorkflowState: raw,
      inferredFromPendingDiagnostics: false,
    };
  }

  if (wf === "DISCHARGE_READY" || wf === "FINALIZED") {
    return {
      stageId: "DISCHARGE_PENDING",
      sourceWorkflowState: raw,
      inferredFromPendingDiagnostics: false,
    };
  }

  // Known enum-ish but unexpected for ambulatory → needs review (not fake progress).
  return {
    stageId: "NEEDS_REVIEW",
    sourceWorkflowState: raw,
    inferredFromPendingDiagnostics: false,
  };
}

export function clinicCareNextStepHint(stageId: ClinicCareStageId): string {
  switch (stageId) {
    case "WAITING":
      return "ROOM_PATIENT";
    case "IN_PROGRESS":
      return "PROVIDER_EVAL";
    case "RESULTS_PENDING":
      return "REVIEW_RESULTS";
    case "DISCHARGE_PENDING":
      return "COMPLETE_ENCOUNTER";
    case "COMPLETED":
      return "NONE";
    case "NEEDS_REVIEW":
      return "NEEDS_REVIEW";
    case "STATUS_UNAVAILABLE":
    default:
      return "STATUS_UNAVAILABLE";
  }
}

/** Whether an encounter contributes to a D4C.1 metric id (excluding FOLLOW_UPS_DUE). */
export function encounterMatchesClinicCareMetric(input: {
  metricId: ClinicCareTrackboardMetricId;
  workflowState?: string | null;
  encounterStatus?: string | null;
  encounterType?: string | null;
  createdAt: Date | string;
  dayStartUtc: Date;
  dayEndExclusiveUtc: Date;
  resultsPendingCount?: number | null;
}): boolean {
  const contract = CLINIC_CARE_TRACKBOARD_METRIC_CONTRACTS.find((c) => c.id === input.metricId);
  if (!contract || input.metricId === "FOLLOW_UPS_DUE") return false;

  const status = String(input.encounterStatus ?? "")
    .trim()
    .toUpperCase();
  const wf = String(input.workflowState ?? "")
    .trim()
    .toUpperCase();
  const created =
    input.createdAt instanceof Date ? input.createdAt : new Date(input.createdAt);
  if (Number.isNaN(created.getTime())) return false;

  const statusOk =
    contract.encounterStatuses.includes("ANY") ||
    (contract.encounterStatuses as readonly string[]).includes(status);
  if (!statusOk) return false;

  if (contract.scope === "FACILITY_LOCAL_TODAY") {
    if (created < input.dayStartUtc || created >= input.dayEndExclusiveUtc) return false;
  }

  if (input.metricId === "DISCHARGE_PENDING") {
    return isClinicCareDischargePending({
      encounterType: input.encounterType ?? "OUTPATIENT",
      encounterStatus: status,
      workflowState: wf,
    });
  }

  if (input.metricId === "RESULTS_PENDING") {
    const inState = (contract.encounterWorkflowStates as readonly string[]).includes(wf);
    const pending = Math.max(0, Number(input.resultsPendingCount ?? 0) || 0) > 0;
    return inState || (contract.includePendingDiagnosticOrders && pending && status === "OPEN");
  }

  if (contract.encounterWorkflowStates.length === 0) return false;
  return (contract.encounterWorkflowStates as readonly string[]).includes(wf);
}

export function countClinicCareMetricsFromEncounters(input: {
  encounters: Array<{
    workflowState?: string | null;
    status?: string | null;
    type?: string | null;
    createdAt: Date | string;
    resultsPendingCount?: number | null;
  }>;
  followUpsDue: number;
  dayStartUtc: Date;
  dayEndExclusiveUtc: Date;
}): ClinicCareMetricCountMap {
  const counts = emptyClinicCareMetricCounts();
  counts.FOLLOW_UPS_DUE = Math.max(0, Math.floor(input.followUpsDue));

  for (const enc of input.encounters) {
    for (const metricId of [
      "TODAYS_VISITS",
      "WAITING",
      "IN_PROGRESS",
      "RESULTS_PENDING",
      "DISCHARGE_PENDING",
    ] as const) {
      if (
        encounterMatchesClinicCareMetric({
          metricId,
          workflowState: enc.workflowState,
          encounterStatus: enc.status,
          encounterType: enc.type ?? "OUTPATIENT",
          createdAt: enc.createdAt,
          dayStartUtc: input.dayStartUtc,
          dayEndExclusiveUtc: input.dayEndExclusiveUtc,
          resultsPendingCount: enc.resultsPendingCount,
        })
      ) {
        counts[metricId] += 1;
      }
    }
  }
  return counts;
}

export function defaultClinicCareTrackboardViewForProfession(
  professionGroup: string
): ClinicCareTrackboardView {
  switch (professionGroup) {
    case "PROVIDER":
      return "PROVIDER";
    case "RN":
      return "NURSING_MA";
    case "TECHNICIAN":
      return "NURSING_MA";
    case "FRONT_DESK":
    case "BILLING":
    case "PHARMACY":
    case "ADMIN":
    default:
      return "ALL_TODAY";
  }
}

/** Client/server filter: does a projected row belong in a board view? */
export function clinicCareRowMatchesView(input: {
  view: ClinicCareTrackboardView;
  stageId: ClinicCareStageId;
  createdAt: Date | string;
  dayStartUtc: Date;
  dayEndExclusiveUtc: Date;
  hasOpenFollowUpDue?: boolean;
}): boolean {
  const created =
    input.createdAt instanceof Date ? input.createdAt : new Date(input.createdAt);
  const isToday =
    !Number.isNaN(created.getTime()) &&
    created >= input.dayStartUtc &&
    created < input.dayEndExclusiveUtc;

  switch (input.view) {
    case "ALL_TODAY":
      return isToday || input.stageId !== "COMPLETED";
    case "WAITING":
      return input.stageId === "WAITING";
    case "NURSING_MA":
      return input.stageId === "WAITING" || input.stageId === "IN_PROGRESS";
    case "PROVIDER":
      // MEDUI.D4C.5B — include WAITING so assigned ARRIVED / ready patients are not excluded.
      return (
        input.stageId === "WAITING" ||
        input.stageId === "IN_PROGRESS" ||
        input.stageId === "RESULTS_PENDING" ||
        input.stageId === "DISCHARGE_PENDING"
      );
    case "RESULTS_PENDING":
      return input.stageId === "RESULTS_PENDING";
    case "DISCHARGE_PENDING":
      return input.stageId === "DISCHARGE_PENDING";
    case "FOLLOW_UP_DUE":
      return input.hasOpenFollowUpDue === true;
    case "COMPLETED":
      return input.stageId === "COMPLETED";
    default:
      return true;
  }
}

/**
 * Role-filtered trackboard field visibility.
 * Front Desk / Billing: minimum operational PHI — no hidden clinical depth because they see the board.
 * Provider / RN / Admin: full operational columns + existing discharge actions only.
 * Technician: safe ops without clinical authorship / discharge authority.
 */
export function resolveClinicCareTrackboardFieldVisibility(
  professionGroup: ProfessionGroup | string
): ClinicCareTrackboardFieldVisibility {
  const p = String(professionGroup ?? "")
    .trim()
    .toUpperCase();

  if (p === "FRONT_DESK") {
    return {
      showChiefComplaint: false,
      showNurseName: false,
      showOpenOrderCount: false,
      showResultsPendingCount: false,
      showNextStepHint: true,
      showClinicalActionLinks: false,
      showProviderName: true,
      showDischargePendingKpi: true,
      showDischargeActions: false,
    };
  }

  if (p === "BILLING") {
    return {
      showChiefComplaint: false,
      showNurseName: false,
      showOpenOrderCount: false,
      showResultsPendingCount: false,
      showNextStepHint: false,
      showClinicalActionLinks: false,
      showProviderName: true,
      showDischargePendingKpi: true,
      showDischargeActions: false,
    };
  }

  if (p === "PHARMACY") {
    return {
      showChiefComplaint: false,
      showNurseName: false,
      showOpenOrderCount: false,
      showResultsPendingCount: false,
      showNextStepHint: true,
      showClinicalActionLinks: false,
      showProviderName: true,
      showDischargePendingKpi: true,
      showDischargeActions: false,
    };
  }

  if (p === "TECHNICIAN") {
    return {
      showChiefComplaint: true,
      showNurseName: true,
      showOpenOrderCount: true,
      showResultsPendingCount: true,
      showNextStepHint: true,
      showClinicalActionLinks: false,
      showProviderName: true,
      showDischargePendingKpi: true,
      showDischargeActions: false,
    };
  }

  // PROVIDER / RN / ADMIN
  return {
    showChiefComplaint: true,
    showNurseName: true,
    showOpenOrderCount: true,
    showResultsPendingCount: true,
    showNextStepHint: true,
    showClinicalActionLinks: true,
    showProviderName: true,
    showDischargePendingKpi: true,
    showDischargeActions: true,
  };
}

/** Strip sensitive / unnecessary fields from a row for the viewer role. */
export function filterClinicCareTrackboardRowForRole<
  T extends {
    chiefComplaint: string | null;
    nurseName: string | null;
    openOrderCount: number;
    resultsPendingCount: number;
    nextStepHint: string;
    providerName: string | null;
  },
>(row: T, visibility: ClinicCareTrackboardFieldVisibility): T {
  return {
    ...row,
    chiefComplaint: visibility.showChiefComplaint ? row.chiefComplaint : null,
    nurseName: visibility.showNurseName ? row.nurseName : null,
    openOrderCount: visibility.showOpenOrderCount ? row.openOrderCount : 0,
    resultsPendingCount: visibility.showResultsPendingCount ? row.resultsPendingCount : 0,
    nextStepHint: visibility.showNextStepHint ? row.nextStepHint : "NONE",
    providerName: visibility.showProviderName ? row.providerName : null,
  };
}

export {
  CLINIC_CARE_PRIMARY_TRACKBOARD_METRIC_IDS,
  CLINIC_CARE_SECONDARY_TRACKBOARD_METRIC_IDS,
};

/** KPI tile accent tokens (secondary to text labels). */
export const CLINIC_CARE_METRIC_COLOR_TOKENS: Record<
  ClinicCareTrackboardMetricId,
  { accent: string; bg: string; border: string; text: string }
> = {
  TODAYS_VISITS: { accent: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
  WAITING: { accent: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", text: "#166534" },
  IN_PROGRESS: { accent: "#ea580c", bg: "#fff7ed", border: "#fed7aa", text: "#9a3412" },
  RESULTS_PENDING: { accent: "#9333ea", bg: "#faf5ff", border: "#e9d5ff", text: "#6b21a8" },
  DISCHARGE_PENDING: { accent: "#0d9488", bg: "#f0fdfa", border: "#99f6e4", text: "#115e59" },
  FOLLOW_UPS_DUE: { accent: "#dc2626", bg: "#fef2f2", border: "#fecaca", text: "#991b1b" },
};

export const CLINIC_CARE_STAGE_COLOR_TOKENS: Record<
  ClinicCareStageId,
  { bg: string; text: string; border: string }
> = {
  WAITING: { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" },
  IN_PROGRESS: { bg: "#ffedd5", text: "#9a3412", border: "#fdba74" },
  RESULTS_PENDING: { bg: "#f3e8ff", text: "#6b21a8", border: "#d8b4fe" },
  DISCHARGE_PENDING: { bg: "#ccfbf1", text: "#115e59", border: "#5eead4" },
  COMPLETED: { bg: "#dcfce7", text: "#166534", border: "#86efac" },
  NEEDS_REVIEW: { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  STATUS_UNAVAILABLE: { bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" },
};
