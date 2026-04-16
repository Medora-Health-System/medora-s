/**
 * Rules-based clinical decision support v1 (ER workspace only).
 * Assistive only: deterministic rules, no ML, no background inference, no mutations.
 * Does not place orders or alter server state.
 */

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
  | "cds_er_esi_urgent"
  | "cds_er_stroke_pathway"
  | "cds_er_sepsis_bundle";

/**
 * One assistive card worth of logic output (no user-facing strings here).
 */
export type ErCdsRecommendation = {
  id: ErCdsRecommendationId;
  severity: "info" | "warning" | "critical";
  /** Interpolation values for i18n templates. */
  params?: Record<string, string | number>;
  /** Maps to `erCds.actions.*` in messages. */
  actionKey?: "goOrders" | "openTriage" | "seeDiagnostics";
  actionTarget?: ErCdsNavigableSection;
  /** Optional assist hint when navigating to Ordres (consumed once client-side). */
  preselectKey?: ErCdsAssistPreselectKey;
};

export type ErCdsContext = {
  /** Must be EMERGENCY for any CDS output. */
  encounterType: string | null | undefined;
  /** GET `/encounters/:id/triage` payload (or equivalent). */
  triage: Record<string, unknown> | null;
};

function traumaLevelLabelFr(level: string): string {
  if (level === "LEVEL_1") return "Niveau 1";
  if (level === "LEVEL_2") return "Niveau 2";
  if (level === "LEVEL_3") return "Niveau 3";
  if (level === "LEVEL_4") return "Niveau 4";
  return "non précisé";
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
    const lvl = traumaLevelLabelFr(er.traumaActivation.level);
    out.push({
      id: "cds_er_trauma_protocol",
      severity: "warning",
      params: { level: lvl },
      actionKey: "goOrders",
      actionTarget: "orders",
      preselectKey: "trauma_protocol",
    });
  }

  let vitalConcerns = collectVitalConcerns(slice);
  if (sepsisConcern) {
    vitalConcerns = vitalConcerns.filter(
      (c) => c !== "hypotension" && c !== "tachycardia" && c !== "tachypnea"
    );
  }

  if (vitalConcerns.length >= 2) {
    out.push({
      id: "cds_er_vitals_escalation",
      severity: "critical",
      actionKey: "openTriage",
      actionTarget: "triage",
    });
  } else if (vitalConcerns.length === 1) {
    out.push(vitalConcernToRecommendation(vitalConcerns[0], slice));
  } else if (esiIsUrgent(slice.esi)) {
    out.push({
      id: "cds_er_esi_urgent",
      severity: "warning",
      actionKey: "openTriage",
      actionTarget: "triage",
    });
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
