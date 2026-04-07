/**
 * ER Nursing Progress / Reassessment V1 — stored under `Encounter.nursingAssessment.erNursingReassessmentV1` (Json).
 * Persists via existing PATCH /encounters/:id (merge with other nursingAssessment keys). No backend migration.
 */

import { formatVitalsHeaderLine } from "@/lib/patientVitals";

export const ER_NURSING_REASSESSMENT_V1_KEY = "erNursingReassessmentV1" as const;

export type ErAbcOption = "" | "wnl" | "yes" | "no" | "unknown";

export type ErTrend = "" | "improved" | "unchanged" | "worse";

export type ErNursingReassessmentForm = {
  reassessmentAt: string;
  narrative: string;
  generalAppearance: string;
  pain0to10: string;
  bedsideStatus: string;
  airway: ErAbcOption;
  breathing: ErAbcOption;
  circulation: ErAbcOption;
  vitalsSummaryNote: string;
  responseToTreatment: string;
  trend: ErTrend;
  interventionsPerformed: string;
  safetyRoundingNote: string;
  addendum: string;
};

export function emptyErNursingReassessmentForm(): ErNursingReassessmentForm {
  return {
    reassessmentAt: "",
    narrative: "",
    generalAppearance: "",
    pain0to10: "",
    bedsideStatus: "",
    airway: "",
    breathing: "",
    circulation: "",
    vitalsSummaryNote: "",
    responseToTreatment: "",
    trend: "",
    interventionsPerformed: "",
    safetyRoundingNote: "",
    addendum: "",
  };
}

export type ErNursingReassessmentSignature = {
  savedAt: string;
  savedByDisplayName: string;
};

export type ErNursingReassessmentStored = {
  reassessmentAt: string | null;
  narrative: string;
  generalAppearance: string;
  pain0to10: number | null;
  bedsideStatus: string;
  airway: ErAbcOption;
  breathing: ErAbcOption;
  circulation: ErAbcOption;
  vitalsSummaryNote: string;
  responseToTreatment: string;
  trend: ErTrend;
  interventionsPerformed: string;
  safetyRoundingNote: string;
  addendum: string;
  signature?: ErNursingReassessmentSignature;
};

function abcFromUnknown(v: unknown): ErAbcOption {
  const s = typeof v === "string" ? v : "";
  if (s === "wnl" || s === "yes" || s === "no" || s === "unknown") return s;
  return "";
}

function trendFromUnknown(v: unknown): ErTrend {
  const s = typeof v === "string" ? v : "";
  if (s === "improved" || s === "unchanged" || s === "worse") return s;
  return "";
}

export function erNursingReassessmentFormFromEncounter(nursingAssessment: unknown): ErNursingReassessmentForm {
  const e = emptyErNursingReassessmentForm();
  if (!nursingAssessment || typeof nursingAssessment !== "object" || Array.isArray(nursingAssessment)) return e;
  const raw = (nursingAssessment as Record<string, unknown>)[ER_NURSING_REASSESSMENT_V1_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return e;
  const o = raw as Record<string, unknown>;

  const ra = o.reassessmentAt;
  if (typeof ra === "string" && ra) {
    try {
      e.reassessmentAt = new Date(ra).toISOString().slice(0, 16);
    } catch {
      e.reassessmentAt = "";
    }
  }
  e.narrative = typeof o.narrative === "string" ? o.narrative : "";
  e.generalAppearance = typeof o.generalAppearance === "string" ? o.generalAppearance : "";
  e.pain0to10 =
    typeof o.pain0to10 === "number" && !Number.isNaN(o.pain0to10) ? String(Math.min(10, Math.max(0, o.pain0to10))) : "";
  e.bedsideStatus = typeof o.bedsideStatus === "string" ? o.bedsideStatus : "";
  e.airway = abcFromUnknown(o.airway);
  e.breathing = abcFromUnknown(o.breathing);
  e.circulation = abcFromUnknown(o.circulation);
  e.vitalsSummaryNote = typeof o.vitalsSummaryNote === "string" ? o.vitalsSummaryNote : "";
  e.responseToTreatment = typeof o.responseToTreatment === "string" ? o.responseToTreatment : "";
  e.trend = trendFromUnknown(o.trend);
  e.interventionsPerformed = typeof o.interventionsPerformed === "string" ? o.interventionsPerformed : "";
  e.safetyRoundingNote = typeof o.safetyRoundingNote === "string" ? o.safetyRoundingNote : "";
  e.addendum = typeof o.addendum === "string" ? o.addendum : "";
  return e;
}

function formToStored(form: ErNursingReassessmentForm, signature: ErNursingReassessmentSignature): ErNursingReassessmentStored {
  const pain =
    form.pain0to10.trim() === "" ? null : Math.min(10, Math.max(0, parseInt(form.pain0to10, 10) || 0));
  return {
    reassessmentAt: form.reassessmentAt ? new Date(form.reassessmentAt).toISOString() : null,
    narrative: form.narrative.trim().slice(0, 8000),
    generalAppearance: form.generalAppearance.trim().slice(0, 4000),
    pain0to10: pain,
    bedsideStatus: form.bedsideStatus.trim().slice(0, 2000),
    airway: form.airway,
    breathing: form.breathing,
    circulation: form.circulation,
    vitalsSummaryNote: form.vitalsSummaryNote.trim().slice(0, 2000),
    responseToTreatment: form.responseToTreatment.trim().slice(0, 4000),
    trend: form.trend,
    interventionsPerformed: form.interventionsPerformed.trim().slice(0, 8000),
    safetyRoundingNote: form.safetyRoundingNote.trim().slice(0, 4000),
    addendum: form.addendum.trim().slice(0, 8000),
    signature,
  };
}

/** True if stored object has any clinical content (signature alone does not count). */
export function storedHasClinicalContent(s: ErNursingReassessmentStored): boolean {
  return Boolean(
    s.reassessmentAt ||
      s.narrative.trim() ||
      s.generalAppearance.trim() ||
      s.pain0to10 != null ||
      s.bedsideStatus.trim() ||
      s.airway ||
      s.breathing ||
      s.circulation ||
      s.vitalsSummaryNote.trim() ||
      s.responseToTreatment.trim() ||
      s.trend ||
      s.interventionsPerformed.trim() ||
      s.safetyRoundingNote.trim() ||
      s.addendum.trim()
  );
}

/**
 * Merge ER reassessment blob into full nursingAssessment for PATCH.
 * Preserves nursingEvalV1, physicianEvalV1, etc.
 */
export function mergeErNursingReassessmentIntoNursingAssessment(
  previousNursingAssessment: unknown,
  form: ErNursingReassessmentForm,
  signature: ErNursingReassessmentSignature
): Record<string, unknown> {
  const base =
    previousNursingAssessment && typeof previousNursingAssessment === "object" && !Array.isArray(previousNursingAssessment)
      ? { ...(previousNursingAssessment as Record<string, unknown>) }
      : {};
  const stored = formToStored(form, signature);
  if (storedHasClinicalContent(stored)) {
    base[ER_NURSING_REASSESSMENT_V1_KEY] = stored;
  } else {
    delete base[ER_NURSING_REASSESSMENT_V1_KEY];
  }
  return base;
}

function abcFr(v: ErAbcOption): string {
  if (v === "wnl") return "Dans les limites (WNL)";
  if (v === "yes") return "Oui";
  if (v === "no") return "Non";
  if (v === "unknown") return "Inconnu";
  return "";
}

function trendFr(v: ErTrend): string {
  if (v === "improved") return "Amélioration";
  if (v === "unchanged") return "Stable";
  if (v === "worse") return "Aggravation";
  return "";
}

export type ErNursingPreviewSection = { id: string; title: string; lines: string[] };

export type ErNursingPreviewModel = {
  sections: ErNursingPreviewSection[];
  narrative: string;
};

export function buildErNursingReassessmentPreviewModel(form: ErNursingReassessmentForm): ErNursingPreviewModel {
  const sections: ErNursingPreviewSection[] = [];

  const timing: string[] = [];
  if (form.reassessmentAt) {
    const d = new Date(form.reassessmentAt);
    if (!Number.isNaN(d.getTime())) timing.push(`Heure de réévaluation : ${d.toLocaleString("fr-FR")}`);
  }
  if (timing.length) sections.push({ id: "timing", title: "Temps / contexte", lines: timing });

  const etat: string[] = [];
  const nar = form.narrative.trim();
  if (nar) etat.push(`Narratif : ${nar.length > 500 ? `${nar.slice(0, 500)}…` : nar}`);
  const ga = form.generalAppearance.trim();
  if (ga) etat.push(`Apparence générale : ${ga}`);
  if (form.pain0to10.trim()) {
    const n = parseInt(form.pain0to10, 10);
    if (!Number.isNaN(n)) etat.push(`Douleur (0–10) : ${n}`);
  }
  if (form.airway) etat.push(`Voie aérienne : ${abcFr(form.airway)}`);
  if (form.breathing) etat.push(`Ventilation : ${abcFr(form.breathing)}`);
  if (form.circulation) etat.push(`Circulation : ${abcFr(form.circulation)}`);
  const bs = form.bedsideStatus.trim();
  if (bs) etat.push(`Statut au lit : ${bs}`);
  if (etat.length) sections.push({ id: "etat", title: "État clinique", lines: etat });

  const vitalsNote: string[] = [];
  const vn = form.vitalsSummaryNote.trim();
  if (vn) vitalsNote.push(`Note sur les signes vitaux : ${vn}`);
  if (vitalsNote.length) sections.push({ id: "vitals", title: "Signes vitaux (relevé)", lines: vitalsNote });

  const resp: string[] = [];
  const rt = form.responseToTreatment.trim();
  if (rt) resp.push(`Réponse au traitement : ${rt}`);
  if (form.trend) resp.push(`Tendance : ${trendFr(form.trend)}`);
  if (resp.length) sections.push({ id: "response", title: "Réponse / évolution", lines: resp });

  const soins: string[] = [];
  const intv = form.interventionsPerformed.trim();
  if (intv) soins.push(`Interventions : ${intv}`);
  const safe = form.safetyRoundingNote.trim();
  if (safe) soins.push(`Sécurité / passage : ${safe}`);
  if (soins.length) sections.push({ id: "soins", title: "Soins et sécurité", lines: soins });

  const add: string[] = [];
  const ad = form.addendum.trim();
  if (ad) add.push(ad);
  if (add.length) sections.push({ id: "addendum", title: "Addendum", lines: add });

  const parts: string[] = [];
  if (form.reassessmentAt) {
    const d = new Date(form.reassessmentAt);
    if (!Number.isNaN(d.getTime())) parts.push(`réévaluation ${d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}`);
  }
  if (form.trend) parts.push(trendFr(form.trend).toLowerCase());
  if (form.pain0to10.trim()) {
    const n = parseInt(form.pain0to10, 10);
    if (!Number.isNaN(n)) parts.push(`douleur ${n}/10`);
  }
  const narrative =
    parts.length > 0 ? `Résumé infirmier (urgences) : ${parts.join(" · ")}.` : "";

  if (sections.length === 0 && !narrative) {
    return {
      sections: [{ id: "empty", title: "Aperçu", lines: ["Aucune donnée saisie pour l’aperçu."] }],
      narrative: "",
    };
  }

  return { sections, narrative };
}

/** Vitals one-liner from triage GET vitalsJson (same as bandeau triage). */
export function vitalsLineFromTriageVitalsJson(vitalsJson: unknown): string {
  if (vitalsJson == null || typeof vitalsJson !== "object" || Array.isArray(vitalsJson)) return "";
  const v = vitalsJson as Record<string, number | string | null | undefined>;
  return formatVitalsHeaderLine({
    tempC: v.tempC ?? "",
    hr: v.hr ?? "",
    rr: v.rr ?? "",
    bpSys: v.bpSys ?? "",
    bpDia: v.bpDia ?? "",
    spo2: v.spo2 ?? "",
    weightKg: v.weightKg ?? "",
    heightCm: v.heightCm ?? "",
  });
}
