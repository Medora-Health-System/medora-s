/**
 * MEDUI.D4C.5A — Clinic Clinical Board operational analytics contracts.
 * Presentation / aggregation only over ambulatory Encounter + Appointment + FollowUp.
 * No parallel clinical engines. No fabricated metrics. No shared Revenue KPI.
 */

import {
  facilityLocalDayUtcBounds,
  isClinicCareAmbulatoryEncounterType,
  isClinicCareFollowUpDue,
  projectClinicCareStage,
} from "./clinicCareTrackboardProjectionD4c2.js";
import { projectClinicCareNursingQueueStage } from "./clinicCareNursingQueueD4c4.js";
import {
  getZonedWallClockParts,
  wallClockToUtc,
} from "../medication/medicationDoseExpansionPlanner.js";
import { resolveFacilityTimezone } from "../clinical/facilityTimezoneDefaults.js";
import type { ProfessionGroup } from "./professionResolver.js";

/** Dashboard period controls (facility-local). */
export const CLINIC_CARE_DASHBOARD_PERIODS = ["TODAY", "WEEK", "MONTH"] as const;
export type ClinicCareDashboardPeriod = (typeof CLINIC_CARE_DASHBOARD_PERIODS)[number];

/** Shared KPI strip — five cards only (Revenue forbidden on shared board). */
export const CLINIC_CARE_ANALYTICS_KPI_IDS = [
  "TODAYS_VISITS",
  "COMPLETED_VISITS",
  "WAITING",
  "AVERAGE_WAIT_MINUTES",
  "FOLLOW_UPS_TO_SCHEDULE",
] as const;
export type ClinicCareAnalyticsKpiId = (typeof CLINIC_CARE_ANALYTICS_KPI_IDS)[number];

/**
 * Visits-by-Day stacked segments — mutually exclusive classification (no double-count).
 * Priority: CANCELLED → COMPLETED → TELECONSULTATION → WAITING → NEW.
 *
 * TELECONSULTATION: no durable visit-modality field exists yet → always false (count 0).
 * Documented deferral — do not invent teleconsult flags from free text.
 */
export const CLINIC_CARE_VISITS_BY_DAY_SEGMENTS = [
  "COMPLETED",
  "WAITING",
  "NEW",
  "TELECONSULTATION",
  "CANCELLED",
] as const;
export type ClinicCareVisitsByDaySegment = (typeof CLINIC_CARE_VISITS_BY_DAY_SEGMENTS)[number];

/** Visit-type donut buckets from EncounterVisitOrigin (+ ambulatory type when origin missing). */
export const CLINIC_CARE_VISIT_TYPE_BUCKETS = [
  "CONSULTATION",
  "FOLLOW_UP",
  "WALK_IN",
  "URGENT_CARE",
  "OTHER",
] as const;
export type ClinicCareVisitTypeBucket = (typeof CLINIC_CARE_VISIT_TYPE_BUCKETS)[number];

/** Patient-flow funnel from workflow / nursing projection (open ambulatory only for live stages). */
export const CLINIC_CARE_PATIENT_FLOW_STAGES = [
  "ARRIVED",
  "NURSING_MA",
  "WITH_PROVIDER",
  "COMPLETED",
] as const;
export type ClinicCarePatientFlowStage = (typeof CLINIC_CARE_PATIENT_FLOW_STAGES)[number];

export type ClinicCareAnalyticsKpiValue = {
  id: ClinicCareAnalyticsKpiId;
  value: number | null;
  /** Comparison vs prior equivalent period when both sides reliable; null = omit (never fabricate). */
  comparison: {
    delta: number;
    direction: "up" | "down" | "flat";
    priorValue: number;
    labelKey: string;
  } | null;
  /** Sparkline samples (oldest → newest); empty when unreliable. */
  sparkline: number[];
  /** Unit hint for UI (count | minutes | patients). */
  unit: "count" | "minutes" | "patients";
  /** Coverage for wait-time (included / eligible); null for other KPIs. */
  coverage: { included: number; eligible: number } | null;
};

export type ClinicCareVisitsByDayPoint = {
  localDateKey: string;
  labelParts: { weekdayShort: string; day: number; monthShort: string };
  completed: number;
  waiting: number;
  newVisits: number;
  teleconsultations: number;
  cancelled: number;
  total: number;
};

export type ClinicCareVisitTypeSlice = {
  bucket: ClinicCareVisitTypeBucket;
  count: number;
  percent: number;
};

export type ClinicCareProviderProductivityRow = {
  /** Stable opaque id — never patient PHI. Display name is staff only. */
  providerUserId: string;
  providerDisplayName: string;
  completedVisitCount: number;
};

export type ClinicCarePatientFlowSlice = {
  stage: ClinicCarePatientFlowStage;
  count: number;
};

export type ClinicCareWaitTrendPoint = {
  localDateKey: string;
  averageWaitMinutes: number | null;
  included: number;
  eligible: number;
};

export type ClinicCareMissedAppointmentsSummary = {
  today: number;
  week: number;
  /** Canonical AppointmentStatus.NO_SHOW only. */
  statusSource: "NO_SHOW";
};

export type ClinicCareDeterministicInsight = {
  id: string;
  /** i18n message key under clinicCareD4c5a.insights.* */
  messageKey: string;
  /** Safe interpolations — never patient names / MRN / DOB. */
  params: Record<string, string | number>;
  /** Optional drill-down path (Clinic workspace). */
  href: string | null;
  severity: "info" | "positive" | "attention";
  /** Period label for grounding (TODAY | WEEK | MONTH). */
  period: ClinicCareDashboardPeriod;
};

export type ClinicCareDashboardAccessFlags = {
  canViewDashboard: boolean;
  /** ADMIN only (no OWNER role in Medora — ADMIN is facility owner-equivalent). */
  canViewProviderProductivity: boolean;
  /** Financial / revenue insights — ADMIN only; never on shared KPI strip. */
  canViewFinancialInsights: boolean;
};

/** Resolve dashboard period window as UTC bounds (inclusive start, exclusive end). */
export function facilityLocalPeriodUtcBounds(
  now: Date,
  facilityTimeZone: string | null | undefined,
  period: ClinicCareDashboardPeriod
): {
  startUtc: Date;
  endExclusiveUtc: Date;
  localDateKey: string;
  timeZone: string;
  dayKeys: string[];
} {
  const today = facilityLocalDayUtcBounds(now, facilityTimeZone);
  const tz = today.timeZone;
  const dayCount = period === "TODAY" ? 1 : period === "WEEK" ? 7 : 30;
  const dayKeys: string[] = [];
  let cursor = { ...getZonedWallClockParts(now, tz) };

  for (let i = 0; i < dayCount; i++) {
    dayKeys.unshift(
      `${cursor.year}-${String(cursor.month).padStart(2, "0")}-${String(cursor.day).padStart(2, "0")}`
    );
    cursor = addCalendarDayParts(cursor.year, cursor.month, cursor.day, -1);
  }

  const first = dayKeys[0]!;
  const [fy, fm, fd] = first.split("-").map((x) => Number(x));
  const startUtc = wallClockToUtc(fy!, fm!, fd!, 0, 0, tz);

  return {
    startUtc,
    endExclusiveUtc: today.endExclusiveUtc,
    localDateKey: today.localDateKey,
    timeZone: tz,
    dayKeys,
  };
}

function addCalendarDayParts(
  year: number,
  month: number,
  day: number,
  delta: number
): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const d = new Date(Date.UTC(year, month - 1, day + delta, 12, 0, 0, 0));
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: 0,
    minute: 0,
    second: 0,
  };
}

export function localDateKeyForInstant(
  instant: Date | string,
  facilityTimeZone: string | null | undefined
): string {
  const tz = resolveFacilityTimezone(facilityTimeZone);
  const d = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(d.getTime())) return "";
  const parts = getZonedWallClockParts(d, tz);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

/**
 * Exclusive visits-by-day segment. Teleconsultation always false until durable modality exists.
 */
export function classifyClinicCareVisitsByDaySegment(input: {
  encounterStatus: string | null | undefined;
  workflowState?: string | null;
  /** Reserved — durable teleconsult flag does not exist; ignored (always non-tele). */
  isTeleconsultation?: boolean | null;
}): ClinicCareVisitsByDaySegment {
  void input.isTeleconsultation;
  const status = String(input.encounterStatus ?? "")
    .trim()
    .toUpperCase();
  if (status === "CANCELLED") return "CANCELLED";
  if (status === "CLOSED") return "COMPLETED";
  // Durable teleconsult modality absent → never TELECONSULTATION.
  const wf = String(input.workflowState ?? "")
    .trim()
    .toUpperCase();
  if (status === "OPEN" && (wf === "ARRIVED" || wf === "TRIAGE")) return "WAITING";
  return "NEW";
}

export function bucketClinicCareVisitType(input: {
  visitOrigin?: string | null;
  encounterType?: string | null;
}): ClinicCareVisitTypeBucket {
  const origin = String(input.visitOrigin ?? "")
    .trim()
    .toUpperCase();
  const type = String(input.encounterType ?? "")
    .trim()
    .toUpperCase();
  if (type === "URGENT_CARE") return "URGENT_CARE";
  if (origin === "FOLLOW_UP") return "FOLLOW_UP";
  if (origin === "WALK_IN") return "WALK_IN";
  if (origin === "SCHEDULED" || origin === "REFERRAL" || origin === "") return "CONSULTATION";
  return "OTHER";
}

export function projectClinicCarePatientFlowStage(input: {
  encounterStatus?: string | null;
  workflowState?: string | null;
  resultsPendingCount?: number | null;
}): ClinicCarePatientFlowStage | null {
  const status = String(input.encounterStatus ?? "")
    .trim()
    .toUpperCase();
  if (status === "CANCELLED") return null;
  if (status === "CLOSED") return "COMPLETED";

  const nursing = projectClinicCareNursingQueueStage(input);
  const wf = String(input.workflowState ?? "")
    .trim()
    .toUpperCase();

  if (wf === "ARRIVED" || nursing === "WAITING_FOR_INTAKE") return "ARRIVED";
  if (nursing === "IN_PROGRESS" || nursing === "RETURNED") return "NURSING_MA";
  if (
    nursing === "READY_FOR_PROVIDER" ||
    wf === "IN_TREATMENT" ||
    wf === "DISPOSITION" ||
    wf === "RESULTS_PENDING" ||
    wf === "DISCHARGE_READY" ||
    wf === "FINALIZED"
  ) {
    return "WITH_PROVIDER";
  }
  const stage = projectClinicCareStage(input).stageId;
  if (stage === "WAITING") return "ARRIVED";
  if (stage === "IN_PROGRESS" || stage === "DISCHARGE_PENDING" || stage === "RESULTS_PENDING") {
    return "WITH_PROVIDER";
  }
  return "ARRIVED";
}

/**
 * Wait minutes = providerStart − arrival/check-in.
 * Provider start proxy: physicianAssignedAt (assignment instant) — no dedicated “seen” timestamp.
 * Missing either side → exclude (not zero).
 */
export function computeClinicCareWaitMinutes(input: {
  arrivedAt?: Date | string | null;
  checkedInAt?: Date | string | null;
  physicianAssignedAt?: Date | string | null;
}): number | null {
  const startRaw = input.physicianAssignedAt;
  if (startRaw == null || startRaw === "") return null;
  const start = startRaw instanceof Date ? startRaw : new Date(startRaw);
  if (Number.isNaN(start.getTime())) return null;

  const arrivalCandidate = input.checkedInAt ?? input.arrivedAt;
  if (arrivalCandidate == null || arrivalCandidate === "") return null;
  const arrival =
    arrivalCandidate instanceof Date ? arrivalCandidate : new Date(arrivalCandidate);
  if (Number.isNaN(arrival.getTime())) return null;

  const ms = start.getTime() - arrival.getTime();
  if (ms < 0) return null;
  return Math.round(ms / 60_000);
}

export function averageNullable(values: Array<number | null | undefined>): {
  average: number | null;
  included: number;
  eligible: number;
} {
  const eligible = values.length;
  const nums = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (nums.length === 0) {
    return { average: null, included: 0, eligible };
  }
  const sum = nums.reduce((a, b) => a + b, 0);
  return { average: Math.round(sum / nums.length), included: nums.length, eligible };
}

/** ADMIN (facility owner-equivalent) only — no OWNER role code exists. */
export function canViewClinicCareProviderProductivity(
  professionGroup: ProfessionGroup | string
): boolean {
  return String(professionGroup ?? "")
    .trim()
    .toUpperCase() === "ADMIN";
}

export function canViewClinicCareFinancialInsights(
  professionGroup: ProfessionGroup | string
): boolean {
  return canViewClinicCareProviderProductivity(professionGroup);
}

export function resolveClinicCareDashboardAccess(input: {
  canAccessClinicCareShell: boolean;
  professionGroup: ProfessionGroup | string;
}): ClinicCareDashboardAccessFlags {
  const admin = canViewClinicCareProviderProductivity(input.professionGroup);
  return {
    canViewDashboard: input.canAccessClinicCareShell,
    canViewProviderProductivity: admin,
    canViewFinancialInsights: admin,
  };
}

export function buildClinicCareVisitsByDaySeries(input: {
  dayKeys: string[];
  encounters: Array<{
    createdAt: Date | string;
    status: string | null | undefined;
    workflowState?: string | null;
  }>;
  facilityTimeZone: string | null | undefined;
}): ClinicCareVisitsByDayPoint[] {
  const buckets = new Map<
    string,
    {
      completed: number;
      waiting: number;
      newVisits: number;
      teleconsultations: number;
      cancelled: number;
    }
  >();
  for (const key of input.dayKeys) {
    buckets.set(key, {
      completed: 0,
      waiting: 0,
      newVisits: 0,
      teleconsultations: 0,
      cancelled: 0,
    });
  }

  for (const enc of input.encounters) {
    const key = localDateKeyForInstant(enc.createdAt, input.facilityTimeZone);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    const segment = classifyClinicCareVisitsByDaySegment({
      encounterStatus: enc.status,
      workflowState: enc.workflowState,
    });
    switch (segment) {
      case "COMPLETED":
        bucket.completed += 1;
        break;
      case "WAITING":
        bucket.waiting += 1;
        break;
      case "NEW":
        bucket.newVisits += 1;
        break;
      case "TELECONSULTATION":
        bucket.teleconsultations += 1;
        break;
      case "CANCELLED":
        bucket.cancelled += 1;
        break;
    }
  }

  return input.dayKeys.map((localDateKey) => {
    const b = buckets.get(localDateKey)!;
    const total =
      b.completed + b.waiting + b.newVisits + b.teleconsultations + b.cancelled;
    const [y, m, d] = localDateKey.split("-").map(Number);
    const utcNoon = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0));
    const weekdayShort = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" })
      .format(utcNoon)
      .replace(/\.$/, "");
    const monthShort = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" })
      .format(utcNoon)
      .replace(/\.$/, "");
    return {
      localDateKey,
      labelParts: { weekdayShort, day: d!, monthShort },
      completed: b.completed,
      waiting: b.waiting,
      newVisits: b.newVisits,
      teleconsultations: b.teleconsultations,
      cancelled: b.cancelled,
      total,
    };
  });
}

export function buildClinicCareVisitTypeSlices(
  encounters: Array<{ visitOrigin?: string | null; encounterType?: string | null }>
): ClinicCareVisitTypeSlice[] {
  const counts: Record<ClinicCareVisitTypeBucket, number> = {
    CONSULTATION: 0,
    FOLLOW_UP: 0,
    WALK_IN: 0,
    URGENT_CARE: 0,
    OTHER: 0,
  };
  for (const enc of encounters) {
    counts[bucketClinicCareVisitType(enc)] += 1;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return CLINIC_CARE_VISIT_TYPE_BUCKETS.map((bucket) => ({
    bucket,
    count: counts[bucket],
    percent: total === 0 ? 0 : Math.round((counts[bucket] / total) * 100),
  })).filter((s) => s.count > 0 || total === 0);
}

export function buildClinicCarePatientFlow(
  encounters: Array<{
    status?: string | null;
    workflowState?: string | null;
    resultsPendingCount?: number | null;
  }>
): ClinicCarePatientFlowSlice[] {
  const counts: Record<ClinicCarePatientFlowStage, number> = {
    ARRIVED: 0,
    NURSING_MA: 0,
    WITH_PROVIDER: 0,
    COMPLETED: 0,
  };
  for (const enc of encounters) {
    const stage = projectClinicCarePatientFlowStage({
      encounterStatus: enc.status,
      workflowState: enc.workflowState,
      resultsPendingCount: enc.resultsPendingCount,
    });
    if (stage) counts[stage] += 1;
  }
  return CLINIC_CARE_PATIENT_FLOW_STAGES.map((stage) => ({ stage, count: counts[stage] }));
}

export function buildClinicCareMissedAppointments(input: {
  appointments: Array<{ status: string | null | undefined; scheduledStartAt: Date | string }>;
  facilityTimeZone: string | null | undefined;
  todayKey: string;
  weekDayKeys: string[];
}): ClinicCareMissedAppointmentsSummary {
  let today = 0;
  let week = 0;
  const weekSet = new Set(input.weekDayKeys);
  for (const appt of input.appointments) {
    const status = String(appt.status ?? "")
      .trim()
      .toUpperCase();
    if (status !== "NO_SHOW") continue;
    const key = localDateKeyForInstant(appt.scheduledStartAt, input.facilityTimeZone);
    if (key === input.todayKey) today += 1;
    if (weekSet.has(key)) week += 1;
  }
  return { today, week, statusSource: "NO_SHOW" };
}

export function percentChange(current: number, prior: number): {
  delta: number;
  direction: "up" | "down" | "flat";
} | null {
  if (!Number.isFinite(current) || !Number.isFinite(prior)) return null;
  if (prior === 0) {
    if (current === 0) return { delta: 0, direction: "flat" };
    return null; // unreliable % from zero baseline — omit rather than fabricate
  }
  const delta = Math.round(((current - prior) / prior) * 100);
  const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  return { delta: Math.abs(delta), direction };
}

/**
 * Deterministic insights provider contract — grounded metrics only.
 * Implementations must not call external AI and must never emit patient PHI.
 */
export interface ClinicInsightsProvider {
  buildInsights(input: ClinicCareInsightsInput): ClinicCareDeterministicInsight[];
}

export type ClinicCareInsightsInput = {
  period: ClinicCareDashboardPeriod;
  kpis: ClinicCareAnalyticsKpiValue[];
  visitsByDay: ClinicCareVisitsByDayPoint[];
  visitTypes: ClinicCareVisitTypeSlice[];
  patientFlow: ClinicCarePatientFlowSlice[];
  waitTrend: ClinicCareWaitTrendPoint[];
  missed: ClinicCareMissedAppointmentsSummary;
  providerProductivity: ClinicCareProviderProductivityRow[] | null;
  canViewFinancialInsights: boolean;
  /** Prescription count when available from ops; null → skip insight. */
  prescriptionsToday: number | null;
  followUpPlanningRatePercent: number | null;
  /** Typed Follow-up list drill-down matching period KPI (D4C.5B.1). */
  followUpDrillDownHref?: string | null;
};

export class DeterministicClinicInsightsProvider implements ClinicInsightsProvider {
  buildInsights(input: ClinicCareInsightsInput): ClinicCareDeterministicInsight[] {
    const out: ClinicCareDeterministicInsight[] = [];
    const period = input.period;

    const todays = input.kpis.find((k) => k.id === "TODAYS_VISITS");
    if (todays?.comparison && todays.value != null) {
      out.push({
        id: "visits-delta",
        messageKey:
          todays.comparison.direction === "down"
            ? "visitsDecreased"
            : todays.comparison.direction === "up"
              ? "visitsIncreased"
              : "visitsFlat",
        params: {
          percent: todays.comparison.delta,
          value: todays.value,
        },
        href: "/app/clinic-care/todays-visits",
        severity: todays.comparison.direction === "down" ? "attention" : "positive",
        period,
      });
    }

    const wait = input.kpis.find((k) => k.id === "AVERAGE_WAIT_MINUTES");
    if (wait?.comparison && wait.value != null) {
      out.push({
        id: "wait-delta",
        messageKey:
          wait.comparison.direction === "down"
            ? "waitDecreased"
            : wait.comparison.direction === "up"
              ? "waitIncreased"
              : "waitFlat",
        params: {
          minutes: wait.comparison.delta,
          value: wait.value,
        },
        href: null,
        severity: wait.comparison.direction === "up" ? "attention" : "positive",
        period,
      });
    }

    const topProvider = input.providerProductivity?.[0];
    if (topProvider && topProvider.completedVisitCount > 0) {
      out.push({
        id: "top-provider",
        messageKey: "topProviderCompleted",
        params: {
          providerName: topProvider.providerDisplayName,
          count: topProvider.completedVisitCount,
        },
        href: null,
        severity: "info",
        period,
      });
    }

    if (input.prescriptionsToday != null && input.prescriptionsToday > 0) {
      out.push({
        id: "rx-today",
        messageKey: "prescriptionsToday",
        params: { count: input.prescriptionsToday },
        href: null,
        severity: "info",
        period,
      });
    }

    if (
      input.followUpPlanningRatePercent != null &&
      Number.isFinite(input.followUpPlanningRatePercent)
    ) {
      out.push({
        id: "follow-up-rate",
        messageKey: "followUpPlanningRate",
        params: { percent: Math.round(input.followUpPlanningRatePercent) },
        href: input.followUpDrillDownHref ?? "/app/clinic-care/follow-up",
        severity: input.followUpPlanningRatePercent < 70 ? "attention" : "positive",
        period,
      });
    }

    const followUps = input.kpis.find((k) => k.id === "FOLLOW_UPS_TO_SCHEDULE");
    if (followUps?.value != null && followUps.value > 0) {
      out.push({
        id: "follow-ups-due",
        messageKey: "followUpsToSchedule",
        params: { count: followUps.value },
        href: input.followUpDrillDownHref ?? "/app/clinic-care/follow-up",
        severity: "attention",
        period,
      });
    }

    if (input.missed.today > 0 || input.missed.week > 0) {
      out.push({
        id: "missed-appts",
        messageKey: "missedAppointments",
        params: { today: input.missed.today, week: input.missed.week },
        href: "/app/clinic-care/registration",
        severity: "attention",
        period,
      });
    }

    const waiting = input.kpis.find((k) => k.id === "WAITING");
    if (waiting?.value != null && waiting.value > 0) {
      out.push({
        id: "waiting-now",
        messageKey: "patientsWaiting",
        params: { count: waiting.value },
        href: "/app/clinic-care/todays-visits",
        severity: "info",
        period,
      });
    }

    // Financial insight only for ADMIN — still no fabricated revenue; omit unless grounded.
    // Revenue aggregates are deferred (no shared durable clinic revenue rollup) → never emit.
    void input.canViewFinancialInsights;

    return out.slice(0, 8);
  }
}

/** Drill-down href to ambulatory encounters with facility-local date filter. */
export function clinicCareEncountersDrillDownHref(input: {
  localDateKey: string;
  flowStage?: ClinicCarePatientFlowStage | null;
  visitType?: ClinicCareVisitTypeBucket | null;
}): string {
  const params = new URLSearchParams();
  params.set("date", input.localDateKey);
  if (input.flowStage) params.set("flow", input.flowStage);
  if (input.visitType) params.set("visitType", input.visitType);
  return `/app/clinic-care/encounters?${params.toString()}`;
}

export function isClinicCareAnalyticsAmbulatoryEncounter(input: {
  type?: string | null;
  status?: string | null;
}): boolean {
  return isClinicCareAmbulatoryEncounterType(input.type);
}

export { isClinicCareFollowUpDue };
