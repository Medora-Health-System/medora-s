/**
 * ER Nursing Progress / Reassessment V1 — stored under `Encounter.nursingAssessment.erNursingReassessmentV1` (Json).
 * Persists via existing PATCH /encounters/:id (merge with other nursingAssessment keys). No backend migration.
 */

import type { SupportedLanguage } from "@/i18n/config";
import { i18nMessage } from "@/lib/i18nMessagesLookup";
import { formatVitalsHeaderLineForLocale } from "@/lib/patientVitals";

export const ER_NURSING_REASSESSMENT_V1_KEY = "erNursingReassessmentV1" as const;

/** Legacy ABCD-style values (prior reassessment saves). */
export type ErNursingAbcLegacy = "wnl" | "yes" | "no" | "unknown";

/** Airway / breathing / circulation reassessment (string codes in JSON; legacy values still load). */
export type ErAbcOption =
  | ""
  | ErNursingAbcLegacy
  | "air_patent"
  | "air_needs_suction"
  | "air_obstructed_concern"
  | "air_support_in_place"
  | "air_unable_to_assess"
  | "br_even_unlabored"
  | "br_increased_wob"
  | "br_wheezing"
  | "br_sob"
  | "br_o2_in_use"
  | "br_unable_to_assess"
  | "circ_warm_perfused"
  | "circ_pale_cool"
  | "circ_diaphoretic"
  | "circ_weak_pulses"
  | "circ_hypotension_concern"
  | "circ_unable_to_assess";

/** Patient trend (string codes in JSON; legacy improved/worse normalized on read). */
export type ErTrend =
  | ""
  | "improved"
  | "unchanged"
  | "worse"
  | "improving"
  | "stable"
  | "worsening"
  | "awaiting_reassessment"
  | "provider_notified"
  | "unable_to_assess";

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

/** Dropdown order: clinical options first, then legacy scale (prior saves). */
export const ER_NURSING_AIRWAY_SELECT_OPTIONS: readonly ErAbcOption[] = [
  "air_patent",
  "air_needs_suction",
  "air_obstructed_concern",
  "air_support_in_place",
  "air_unable_to_assess",
  "wnl",
  "yes",
  "no",
  "unknown",
];

export const ER_NURSING_BREATHING_SELECT_OPTIONS: readonly ErAbcOption[] = [
  "br_even_unlabored",
  "br_increased_wob",
  "br_wheezing",
  "br_sob",
  "br_o2_in_use",
  "br_unable_to_assess",
  "wnl",
  "yes",
  "no",
  "unknown",
];

export const ER_NURSING_CIRCULATION_SELECT_OPTIONS: readonly ErAbcOption[] = [
  "circ_warm_perfused",
  "circ_pale_cool",
  "circ_diaphoretic",
  "circ_weak_pulses",
  "circ_hypotension_concern",
  "circ_unable_to_assess",
  "wnl",
  "yes",
  "no",
  "unknown",
];

const NURSING_ABC_VALUES = new Set<string>([
  ...ER_NURSING_AIRWAY_SELECT_OPTIONS,
  ...ER_NURSING_BREATHING_SELECT_OPTIONS,
  ...ER_NURSING_CIRCULATION_SELECT_OPTIONS,
]);

function abcFromUnknown(v: unknown): ErAbcOption {
  const s = typeof v === "string" ? v : "";
  if (!s) return "";
  return NURSING_ABC_VALUES.has(s) ? (s as ErAbcOption) : "";
}

const NURSING_TREND_VALUES = new Set<string>([
  "improved",
  "unchanged",
  "worse",
  "improving",
  "stable",
  "worsening",
  "awaiting_reassessment",
  "provider_notified",
  "unable_to_assess",
]);

/** Dropdown order for patient trend (legacy improved/worse normalized on load). */
export const ER_NURSING_TREND_SELECT_OPTIONS: readonly ErTrend[] = [
  "improving",
  "stable",
  "unchanged",
  "worsening",
  "awaiting_reassessment",
  "provider_notified",
  "unable_to_assess",
];

function trendFromUnknown(v: unknown): ErTrend {
  const s = typeof v === "string" ? v : "";
  if (!s) return "";
  if (!NURSING_TREND_VALUES.has(s)) return "";
  if (s === "improved") return "improving";
  if (s === "worse") return "worsening";
  return s as ErTrend;
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

function interpolatePreviewModel(template: string, vars: Record<string, string | number>): string {
  let s = template;
  for (const [k, v] of Object.entries(vars)) {
    s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}

function previewModelString(locale: SupportedLanguage, key: string): string {
  return i18nMessage(locale, `emergencyNursingReassessment.previewModel.${key}`);
}

function abcOptionLabel(locale: SupportedLanguage, v: ErAbcOption): string {
  if (v === "wnl") return i18nMessage(locale, "emergencyNursingReassessment.abcOptionWnl");
  if (v === "yes") return i18nMessage(locale, "emergencyNursingReassessment.abcOptionYes");
  if (v === "no") return i18nMessage(locale, "emergencyNursingReassessment.abcOptionNo");
  if (v === "unknown") return i18nMessage(locale, "emergencyNursingReassessment.abcOptionUnknown");
  if (v === "air_patent") return i18nMessage(locale, "emergencyNursingReassessment.abcAirPatent");
  if (v === "air_needs_suction") return i18nMessage(locale, "emergencyNursingReassessment.abcAirNeedsSuction");
  if (v === "air_obstructed_concern") return i18nMessage(locale, "emergencyNursingReassessment.abcAirObstructedConcern");
  if (v === "air_support_in_place") return i18nMessage(locale, "emergencyNursingReassessment.abcAirSupportInPlace");
  if (v === "air_unable_to_assess") return i18nMessage(locale, "emergencyNursingReassessment.abcAirUnableToAssess");
  if (v === "br_even_unlabored") return i18nMessage(locale, "emergencyNursingReassessment.abcBrEvenUnlabored");
  if (v === "br_increased_wob") return i18nMessage(locale, "emergencyNursingReassessment.abcBrIncreasedWob");
  if (v === "br_wheezing") return i18nMessage(locale, "emergencyNursingReassessment.abcBrWheezing");
  if (v === "br_sob") return i18nMessage(locale, "emergencyNursingReassessment.abcBrSob");
  if (v === "br_o2_in_use") return i18nMessage(locale, "emergencyNursingReassessment.abcBrO2InUse");
  if (v === "br_unable_to_assess") return i18nMessage(locale, "emergencyNursingReassessment.abcBrUnableToAssess");
  if (v === "circ_warm_perfused") return i18nMessage(locale, "emergencyNursingReassessment.abcCircWarmPerfused");
  if (v === "circ_pale_cool") return i18nMessage(locale, "emergencyNursingReassessment.abcCircPaleCool");
  if (v === "circ_diaphoretic") return i18nMessage(locale, "emergencyNursingReassessment.abcCircDiaphoretic");
  if (v === "circ_weak_pulses") return i18nMessage(locale, "emergencyNursingReassessment.abcCircWeakPulses");
  if (v === "circ_hypotension_concern") return i18nMessage(locale, "emergencyNursingReassessment.abcCircHypotensionConcern");
  if (v === "circ_unable_to_assess") return i18nMessage(locale, "emergencyNursingReassessment.abcCircUnableToAssess");
  return "";
}

function trendLineLabel(locale: SupportedLanguage, v: ErTrend): string {
  if (v === "improved" || v === "improving") return i18nMessage(locale, "emergencyNursingReassessment.trendImproving");
  if (v === "unchanged") return i18nMessage(locale, "emergencyNursingReassessment.trendUnchanged");
  if (v === "worse" || v === "worsening") return i18nMessage(locale, "emergencyNursingReassessment.trendWorsening");
  if (v === "stable") return i18nMessage(locale, "emergencyNursingReassessment.trendStable");
  if (v === "awaiting_reassessment") return i18nMessage(locale, "emergencyNursingReassessment.trendAwaitingReassessment");
  if (v === "provider_notified") return i18nMessage(locale, "emergencyNursingReassessment.trendProviderNotified");
  if (v === "unable_to_assess") return i18nMessage(locale, "emergencyNursingReassessment.trendUnableToAssess");
  return "";
}

function trendNarrativeFragment(locale: SupportedLanguage, v: ErTrend): string {
  if (v === "improved" || v === "improving") return previewModelString(locale, "narrativeTrendImproved");
  if (v === "unchanged") return previewModelString(locale, "narrativeTrendUnchanged");
  if (v === "worse" || v === "worsening") return previewModelString(locale, "narrativeTrendWorse");
  if (v === "stable") return previewModelString(locale, "narrativeTrendStable");
  if (v === "awaiting_reassessment") return previewModelString(locale, "narrativeTrendAwaitingReassessment");
  if (v === "provider_notified") return previewModelString(locale, "narrativeTrendProviderNotified");
  if (v === "unable_to_assess") return previewModelString(locale, "narrativeTrendUnableToAssess");
  return "";
}

export type ErNursingPreviewSection = { id: string; title: string; lines: string[] };

export type ErNursingPreviewModel = {
  sections: ErNursingPreviewSection[];
  narrative: string;
};

export function buildErNursingReassessmentPreviewModel(
  form: ErNursingReassessmentForm,
  locale: SupportedLanguage
): ErNursingPreviewModel {
  const dateTag = locale === "en" ? "en-US" : "fr-FR";
  const sections: ErNursingPreviewSection[] = [];

  const timing: string[] = [];
  if (form.reassessmentAt) {
    const d = new Date(form.reassessmentAt);
    if (!Number.isNaN(d.getTime())) {
      timing.push(
        interpolatePreviewModel(previewModelString(locale, "timingLine"), {
          datetime: d.toLocaleString(dateTag),
        })
      );
    }
  }
  if (timing.length) {
    sections.push({ id: "timing", title: previewModelString(locale, "sectionTimingContext"), lines: timing });
  }

  const etat: string[] = [];
  const nar = form.narrative.trim();
  if (nar) {
    etat.push(
      interpolatePreviewModel(previewModelString(locale, "lineNarrative"), {
        text: nar.length > 500 ? `${nar.slice(0, 500)}…` : nar,
      })
    );
  }
  const ga = form.generalAppearance.trim();
  if (ga) etat.push(interpolatePreviewModel(previewModelString(locale, "lineAppearance"), { text: ga }));
  if (form.pain0to10.trim()) {
    const n = parseInt(form.pain0to10, 10);
    if (!Number.isNaN(n)) {
      etat.push(interpolatePreviewModel(previewModelString(locale, "linePain"), { n: String(n) }));
    }
  }
  if (form.airway) {
    etat.push(
      interpolatePreviewModel(previewModelString(locale, "lineAirway"), {
        value: abcOptionLabel(locale, form.airway),
      })
    );
  }
  if (form.breathing) {
    etat.push(
      interpolatePreviewModel(previewModelString(locale, "lineBreathing"), {
        value: abcOptionLabel(locale, form.breathing),
      })
    );
  }
  if (form.circulation) {
    etat.push(
      interpolatePreviewModel(previewModelString(locale, "lineCirculation"), {
        value: abcOptionLabel(locale, form.circulation),
      })
    );
  }
  const bs = form.bedsideStatus.trim();
  if (bs) etat.push(interpolatePreviewModel(previewModelString(locale, "lineBedside"), { text: bs }));
  if (etat.length) {
    sections.push({ id: "etat", title: previewModelString(locale, "sectionClinicalState"), lines: etat });
  }

  const vitalsNote: string[] = [];
  const vn = form.vitalsSummaryNote.trim();
  if (vn) vitalsNote.push(interpolatePreviewModel(previewModelString(locale, "lineVitalsNote"), { text: vn }));
  if (vitalsNote.length) {
    sections.push({
      id: "vitals",
      title: previewModelString(locale, "sectionVitalsRecording"),
      lines: vitalsNote,
    });
  }

  const resp: string[] = [];
  const rt = form.responseToTreatment.trim();
  if (rt) resp.push(interpolatePreviewModel(previewModelString(locale, "lineResponseToCare"), { text: rt }));
  if (form.trend) {
    resp.push(
      interpolatePreviewModel(previewModelString(locale, "lineTrend"), {
        value: trendLineLabel(locale, form.trend),
      })
    );
  }
  if (resp.length) {
    sections.push({
      id: "response",
      title: previewModelString(locale, "sectionResponseEvolution"),
      lines: resp,
    });
  }

  const soins: string[] = [];
  const intv = form.interventionsPerformed.trim();
  if (intv) soins.push(interpolatePreviewModel(previewModelString(locale, "lineInterventions"), { text: intv }));
  const safe = form.safetyRoundingNote.trim();
  if (safe) soins.push(interpolatePreviewModel(previewModelString(locale, "lineSafetyRounding"), { text: safe }));
  if (soins.length) {
    sections.push({ id: "soins", title: previewModelString(locale, "sectionCareSafety"), lines: soins });
  }

  const add: string[] = [];
  const ad = form.addendum.trim();
  if (ad) add.push(ad);
  if (add.length) {
    sections.push({ id: "addendum", title: previewModelString(locale, "sectionAddendum"), lines: add });
  }

  const parts: string[] = [];
  if (form.reassessmentAt) {
    const d = new Date(form.reassessmentAt);
    if (!Number.isNaN(d.getTime())) {
      parts.push(
        interpolatePreviewModel(previewModelString(locale, "narrativeFragmentReassessment"), {
          datetime: d.toLocaleString(dateTag, { dateStyle: "short", timeStyle: "short" }),
        })
      );
    }
  }
  if (form.trend) {
    const frag = trendNarrativeFragment(locale, form.trend);
    if (frag) parts.push(frag);
  }
  if (form.pain0to10.trim()) {
    const n = parseInt(form.pain0to10, 10);
    if (!Number.isNaN(n)) {
      parts.push(interpolatePreviewModel(previewModelString(locale, "narrativeFragmentPain"), { n: String(n) }));
    }
  }
  const narrative =
    parts.length > 0
      ? interpolatePreviewModel(previewModelString(locale, "narrativeSummaryFull"), { parts: parts.join(" · ") })
      : "";

  if (sections.length === 0 && !narrative) {
    return {
      sections: [
        {
          id: "empty",
          title: i18nMessage(locale, "emergencyNursingReassessment.previewEmptyTitle"),
          lines: [i18nMessage(locale, "emergencyNursingReassessment.previewEmptyLine")],
        },
      ],
      narrative: "",
    };
  }

  return { sections, narrative };
}

/** Vitals one-liner from triage GET vitalsJson (same as triage strip). */
export function vitalsLineFromTriageVitalsJson(
  vitalsJson: unknown,
  language: SupportedLanguage
): string {
  if (vitalsJson == null || typeof vitalsJson !== "object" || Array.isArray(vitalsJson)) return "";
  const v = vitalsJson as Record<string, number | string | null | undefined>;
  return formatVitalsHeaderLineForLocale(
    {
      tempC: v.tempC ?? "",
      hr: v.hr ?? "",
      rr: v.rr ?? "",
      bpSys: v.bpSys ?? "",
      bpDia: v.bpDia ?? "",
      spo2: v.spo2 ?? "",
      weightKg: v.weightKg ?? "",
      heightCm: v.heightCm ?? "",
    },
    language
  );
}
