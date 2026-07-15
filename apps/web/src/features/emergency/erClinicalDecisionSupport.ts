/**
 * Rules-based clinical decision support v1 (ER workspace only).
 * Assistive only: deterministic rules, no ML, no background inference, no mutations.
 * Does not place orders or alter server state.
 */

import { hasMeaningfulVitalMeasurement, type PatientTriageVitalsSnapshot } from "@/lib/patientVitals";
import {
  strokeScreenFromUnknown,
  sepsisScreenFromUnknown,
  triagePreviewSliceFromTriageGet,
} from "./emergencyTriageDocPreview";

/** Subset of ER workspace sections CDS actions may target (no circular imports with the view). */
export type ErCdsNavigableSection = "orders" | "triage" | "nursing" | "diagnostics";

/**
 * Rules-based CDS v2 — safe preselection hint only (UI); never triggers API or orders.
 * Receiving panels apply once then clear parent intent.
 */
export type ErCdsAssistPreselectKey = "trauma_protocol" | "sepsis_protocol" | "stroke_pathway";

/** Machine ids; copy lives in i18n (`erCds.recommendations.<id>`). */
export type ErCdsRecommendationId =
  | "cds_er_trauma_protocol"
  | "cds_er_vitals_escalation"
  | "cds_er_hypotension"
  | "cds_er_tachycardia"
  | "cds_er_hypoxemia"
  | "cds_er_tachypnea"
  | "cds_er_temperature_concern"
  | "cds_er_hemodynamic_trend"
  | "cds_er_respiratory_trend"
  | "cds_er_esi_urgent"
  | "cds_er_stroke_pathway"
  | "cds_er_sepsis_bundle";

/**
 * Neutral trauma level codes for CDS params — must match `erCds.params.traumaLevel.*` i18n keys.
 * Not for display; the panel resolves localized wording.
 */
export type ErCdsTraumaLevelCode = "LEVEL_1" | "LEVEL_2" | "LEVEL_3" | "LEVEL_4" | "UNSPECIFIED";

/**
 * One assistive card worth of logic output (no user-facing strings here).
 */
export type ErCdsRecommendation = {
  id: ErCdsRecommendationId;
  severity: "info" | "warning" | "critical";
  /**
   * Locale-agnostic interpolation inputs only (e.g. `levelCode` for trauma).
   * Display strings are resolved in the UI via i18n.
   */
  params?: Record<string, string | number>;
  /** Maps to `erCds.actions.*` in messages. */
  actionKey?: "goOrders" | "openTriage" | "openNursing" | "seeDiagnostics";
  actionTarget?: ErCdsNavigableSection;
  /** Optional assist hint when navigating to Ordres (consumed once client-side). */
  preselectKey?: ErCdsAssistPreselectKey;
};

export type ErCdsContext = {
  /** Must be EMERGENCY for any CDS output. */
  encounterType: string | null | undefined;
  /** GET `/encounters/:id/triage` payload (or equivalent). */
  triage: Record<string, unknown> | null;
  /**
   * Same-encounter vitals snapshots, oldest → newest (e.g. from GET `/patients/:id/triage?latest=true`, filtered).
   * Used only for deterministic trend rules; omit or pass [] when unavailable.
   */
  encounterVitalsSnapshotsOldestFirst?: PatientTriageVitalsSnapshot[] | null;
};

function normalizeTraumaLevelCodeForCds(level: string): ErCdsTraumaLevelCode {
  if (level === "LEVEL_1" || level === "LEVEL_2" || level === "LEVEL_3" || level === "LEVEL_4") {
    return level;
  }
  return "UNSPECIFIED";
}

function parseNum(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

/** Simple explicit thresholds (audit-friendly). °C, mmHg, bpm, /min, %. */
const VITAL_HYPOTENSION_SBP_LT = 90;
const VITAL_TACHYCARDIA_HR_GT = 130;
const VITAL_TACHYPNEA_RR_GT = 28;
const VITAL_HYPOXEMIA_SPO2_LT = 92;
const VITAL_FEVER_GT = 39.5;
const VITAL_HYPOTHERMIA_LT = 35.0;

type VitalConcernKind =
  | "hypotension"
  | "tachycardia"
  | "hypoxemia"
  | "tachypnea"
  | "temperature";

function collectVitalConcerns(vitalsSlice: {
  tempC: string;
  hr: string;
  rr: string;
  bpSys: string;
  spo2: string;
}): VitalConcernKind[] {
  const out: VitalConcernKind[] = [];
  const t = parseNum(vitalsSlice.tempC);
  const hr = parseNum(vitalsSlice.hr);
  const rr = parseNum(vitalsSlice.rr);
  const sys = parseNum(vitalsSlice.bpSys);
  const spo2 = parseNum(vitalsSlice.spo2);

  if (t != null && (t > VITAL_FEVER_GT || t < VITAL_HYPOTHERMIA_LT)) out.push("temperature");
  if (hr != null && hr > VITAL_TACHYCARDIA_HR_GT) out.push("tachycardia");
  if (rr != null && rr > VITAL_TACHYPNEA_RR_GT) out.push("tachypnea");
  if (sys != null && sys < VITAL_HYPOTENSION_SBP_LT) out.push("hypotension");
  if (spo2 != null && spo2 < VITAL_HYPOXEMIA_SPO2_LT) out.push("hypoxemia");
  return out;
}

function vitalConcernToRecommendation(
  kind: VitalConcernKind,
  vitalsSlice: { tempC: string }
): ErCdsRecommendation {
  switch (kind) {
    case "hypotension":
      return {
        id: "cds_er_hypotension",
        severity: "critical",
        actionKey: "goOrders",
        actionTarget: "orders",
      };
    case "tachycardia":
      return {
        id: "cds_er_tachycardia",
        severity: "warning",
        actionKey: "openTriage",
        actionTarget: "triage",
      };
    case "hypoxemia":
      return {
        id: "cds_er_hypoxemia",
        severity: "critical",
        actionKey: "goOrders",
        actionTarget: "orders",
      };
    case "tachypnea":
      return {
        id: "cds_er_tachypnea",
        severity: "warning",
        actionKey: "openTriage",
        actionTarget: "triage",
      };
    case "temperature": {
      const t = parseNum(vitalsSlice.tempC);
      const hypothermia = t != null && t < VITAL_HYPOTHERMIA_LT;
      return {
        id: "cds_er_temperature_concern",
        severity: hypothermia ? "critical" : "warning",
        actionKey: "openTriage",
        actionTarget: "triage",
      };
    }
  }
}

/** Pull numeric vitals from stored triage vitalsJson (same keys as triage preview). */
function vitalsNumsFromSnapshot(s: PatientTriageVitalsSnapshot): {
  hr: number | null;
  rr: number | null;
  spo2: number | null;
  sys: number | null;
} {
  const v = s.vitalsJson;
  if (!v || typeof v !== "object" || Array.isArray(v)) {
    return { hr: null, rr: null, spo2: null, sys: null };
  }
  const o = v as Record<string, unknown>;
  const n = (x: unknown) => parseNum(String(x ?? "").trim());
  return {
    hr: n(o.hr),
    rr: n(o.rr),
    spo2: n(o.spo2),
    sys: n(o.bpSys),
  };
}

/**
 * Trend rules — explicit step thresholds (audit-friendly).
 * Two points: require a larger single-step change.
 * Three+ points: require monotonic worsening with a minimum per-step delta.
 */
const TREND_HR_STEP_MIN = 8; // bpm between consecutive readings (3+ points)
const TREND_HR_TWO_POINT_MIN = 15; // bpm when only two readings
const TREND_SBP_STEP_MIN = 8; // mmHg drop per step (3+ points)
const TREND_SBP_TWO_POINT_MIN = 15; // mmHg when only two readings
const TREND_SPO2_STEP_MIN = 2; // % points per step (3+)
const TREND_SPO2_TWO_POINT_MIN = 4; // % when only two readings
const TREND_RR_STEP_MIN = 2; // /min per step (3+)
const TREND_RR_TWO_POINT_MIN = 4; // /min when only two readings

function seriesRisingWorsening(values: number[], stepMin: number, twoPointMin: number): boolean {
  if (values.length < 2) return false;
  if (values.length === 2) {
    return values[1]! > values[0]! + twoPointMin;
  }
  for (let i = 1; i < values.length; i++) {
    if (values[i]! <= values[i - 1]! + stepMin) return false;
  }
  return true;
}

function seriesFallingWorsening(values: number[], stepMin: number, twoPointMin: number): boolean {
  if (values.length < 2) return false;
  if (values.length === 2) {
    return values[0]! > values[1]! + twoPointMin;
  }
  for (let i = 1; i < values.length; i++) {
    if (values[i]! >= values[i - 1]! - stepMin) return false;
  }
  return true;
}

function hemodynamicTrendFromSnapshots(snapshotsOldestFirst: PatientTriageVitalsSnapshot[]): boolean {
  const hrs = snapshotsOldestFirst.map((s) => vitalsNumsFromSnapshot(s).hr).filter((x): x is number => x != null);
  const sbps = snapshotsOldestFirst.map((s) => vitalsNumsFromSnapshot(s).sys).filter((x): x is number => x != null);
  const hrTrend = hrs.length >= 2 && seriesRisingWorsening(hrs, TREND_HR_STEP_MIN, TREND_HR_TWO_POINT_MIN);
  const sbpTrend = sbps.length >= 2 && seriesFallingWorsening(sbps, TREND_SBP_STEP_MIN, TREND_SBP_TWO_POINT_MIN);
  return hrTrend || sbpTrend;
}

function respiratoryTrendFromSnapshots(snapshotsOldestFirst: PatientTriageVitalsSnapshot[]): boolean {
  const spo2s = snapshotsOldestFirst.map((s) => vitalsNumsFromSnapshot(s).spo2).filter((x): x is number => x != null);
  const rrs = snapshotsOldestFirst.map((s) => vitalsNumsFromSnapshot(s).rr).filter((x): x is number => x != null);
  const spo2Trend =
    spo2s.length >= 2 && seriesFallingWorsening(spo2s, TREND_SPO2_STEP_MIN, TREND_SPO2_TWO_POINT_MIN);
  const rrTrend = rrs.length >= 2 && seriesRisingWorsening(rrs, TREND_RR_STEP_MIN, TREND_RR_TWO_POINT_MIN);
  return spo2Trend || rrTrend;
}

function esiIsUrgent(esi: string): boolean {
  const n = parseInt(esi.trim(), 10);
  return !Number.isNaN(n) && n <= 2;
}

/**
 * Returns ordered recommendation descriptors for the ER active workspace.
 * Empty array when not applicable or insufficient data.
 */
export function buildErCdsRecommendations(ctx: ErCdsContext): ErCdsRecommendation[] {
  if (ctx.encounterType !== "EMERGENCY") return [];
  if (!ctx.triage || typeof ctx.triage !== "object" || Array.isArray(ctx.triage)) return [];

  const parsed = triagePreviewSliceFromTriageGet(ctx.triage);
  if (!parsed) return [];

  const { slice, er } = parsed;
  const stroke = strokeScreenFromUnknown(ctx.triage.strokeScreen);
  const sepsis = sepsisScreenFromUnknown(ctx.triage.sepsisScreen);

  const sepsisConcern =
    sepsis.suspectedInfection === "yes" &&
    (sepsis.rrGte22 === "yes" || sepsis.sbpLte100 === "yes" || sepsis.alteredMentalStatus === "yes");

  const out: ErCdsRecommendation[] = [];

  if (er.traumaActivation.activated) {
    out.push({
      id: "cds_er_trauma_protocol",
      severity: "warning",
      params: { levelCode: normalizeTraumaLevelCodeForCds(er.traumaActivation.level) },
      actionKey: "goOrders",
      actionTarget: "orders",
      preselectKey: "trauma_protocol",
    });
  }

  // Instant vitals rules use newest meaningful same-encounter reading when available.
  const trendSnapsForCurrent = ctx.encounterVitalsSnapshotsOldestFirst;
  const newestMeaningful =
    Array.isArray(trendSnapsForCurrent) && trendSnapsForCurrent.length > 0
      ? trendSnapsForCurrent[trendSnapsForCurrent.length - 1]
      : null;
  const instantVitalsSlice =
    newestMeaningful && hasMeaningfulVitalMeasurement(newestMeaningful.vitalsJson)
      ? {
          ...slice,
          tempC:
            newestMeaningful.vitalsJson.tempC != null && newestMeaningful.vitalsJson.tempC !== ""
              ? String(newestMeaningful.vitalsJson.tempC)
              : "",
          hr:
            newestMeaningful.vitalsJson.hr != null && newestMeaningful.vitalsJson.hr !== ""
              ? String(newestMeaningful.vitalsJson.hr)
              : "",
          rr:
            newestMeaningful.vitalsJson.rr != null && newestMeaningful.vitalsJson.rr !== ""
              ? String(newestMeaningful.vitalsJson.rr)
              : "",
          bpSys:
            newestMeaningful.vitalsJson.bpSys != null && newestMeaningful.vitalsJson.bpSys !== ""
              ? String(newestMeaningful.vitalsJson.bpSys)
              : "",
          spo2:
            newestMeaningful.vitalsJson.spo2 != null && newestMeaningful.vitalsJson.spo2 !== ""
              ? String(newestMeaningful.vitalsJson.spo2)
              : "",
        }
      : hasMeaningfulVitalMeasurement({
            tempC: slice.tempC,
            hr: slice.hr,
            rr: slice.rr,
            bpSys: slice.bpSys,
            spo2: slice.spo2,
          })
        ? slice
        : { ...slice, tempC: "", hr: "", rr: "", bpSys: "", bpDia: "", spo2: "" };

  let vitalConcerns = collectVitalConcerns(instantVitalsSlice);
  if (sepsisConcern) {
    vitalConcerns = vitalConcerns.filter(
      (c) => c !== "hypotension" && c !== "tachycardia" && c !== "tachypnea"
    );
  }

  let instantVitalRec: ErCdsRecommendation | null = null;
  if (vitalConcerns.length >= 2) {
    instantVitalRec = {
      id: "cds_er_vitals_escalation",
      severity: "critical",
      actionKey: "openTriage",
      actionTarget: "triage",
    };
  } else if (vitalConcerns.length === 1) {
    instantVitalRec = vitalConcernToRecommendation(vitalConcerns[0], instantVitalsSlice);
  } else if (esiIsUrgent(slice.esi)) {
    instantVitalRec = {
      id: "cds_er_esi_urgent",
      severity: "warning",
      actionKey: "openTriage",
      actionTarget: "triage",
    };
  }
  if (instantVitalRec) {
    out.push(instantVitalRec);
  }

  /**
   * Trend cards (hemodynamic / respiratory) — precedence vs instant vitals:
   * - Instant snapshot rules run first; trend detection uses separate same-encounter history (2+ readings).
   * - Suppress hemodynamic trend if sepsis bundle already covers overlapping hemodynamic signal, or
   *   multi-trigger vitals escalation is shown, or a single instant card is already hypotension/tachycardia.
   * - Suppress respiratory trend if sepsis bundle applies, vitals escalation (multi), or instant
   *   hypoxemia/tachypnea already covers that axis.
   * - Trauma / stroke / sepsis cards below are unchanged; trends are additive when not suppressed.
   */
  const suppressHemodynamicTrend =
    !!sepsisConcern ||
    vitalConcerns.length >= 2 ||
    (vitalConcerns.length === 1 &&
      (vitalConcerns[0] === "hypotension" || vitalConcerns[0] === "tachycardia"));

  const suppressRespiratoryTrend =
    !!sepsisConcern ||
    vitalConcerns.length >= 2 ||
    (vitalConcerns.length === 1 &&
      (vitalConcerns[0] === "hypoxemia" || vitalConcerns[0] === "tachypnea"));

  const trendSnaps = ctx.encounterVitalsSnapshotsOldestFirst;
  if (Array.isArray(trendSnaps) && trendSnaps.length >= 2) {
    if (!suppressHemodynamicTrend && hemodynamicTrendFromSnapshots(trendSnaps)) {
      out.push({
        id: "cds_er_hemodynamic_trend",
        severity: "warning",
        actionKey: "openNursing",
        actionTarget: "nursing",
      });
    }
    if (!suppressRespiratoryTrend && respiratoryTrendFromSnapshots(trendSnaps)) {
      out.push({
        id: "cds_er_respiratory_trend",
        severity: "warning",
        actionKey: "openNursing",
        actionTarget: "nursing",
      });
    }
  }

  const strokePositive =
    stroke.faceDroop === "yes" ||
    stroke.armWeakness === "yes" ||
    stroke.speechDifficulty === "yes";
  const strokeAlert = stroke.strokeAlertActivated === "yes";
  if (strokePositive || strokeAlert) {
    out.push({
      id: "cds_er_stroke_pathway",
      severity: strokePositive ? "critical" : "warning",
      actionKey: "seeDiagnostics",
      actionTarget: "diagnostics",
      preselectKey: "stroke_pathway",
    });
  }

  if (sepsisConcern) {
    out.push({
      id: "cds_er_sepsis_bundle",
      severity: "warning",
      actionKey: "goOrders",
      actionTarget: "orders",
      preselectKey: "sepsis_protocol",
    });
  }

  return out;
}
