/**
 * Rule-based triage documentation for the ER panel (no AI).
 * Uses only structured fields already carried by GET/PUT triage.
 */

import { productUiBcp47Tag, type SupportedLanguage } from "@/i18n/config";
import {
  canonicalHeightCm,
  canonicalTemperatureCelsius,
  canonicalWeightKg,
  displayHeightCmStringFromStored,
  displayTemperatureFromStoredC,
  displayWeightKgFromStored,
  heightFeetInchStringsFromStoredCm,
} from "@medora/shared";
import { erTriageMessagesEn } from "@/i18n/messages/erTriage.en";
import { erTriageMessagesFr } from "@/i18n/messages/erTriage.fr";
import {
  formatHeightDualLine,
  formatTemperatureDualLine,
  formatVitalsHeaderLineForLocale,
  formatWeightDualLine,
} from "@/lib/patientVitals";
import { defaultVitalsEntryUnits } from "@/lib/vitalsEntryDefaults";
import { erTriageT } from "./erTriageI18nLookup";
import {
  erTriageV1FormFromVitalsJson,
  type ErTraumaActivationForm,
  type ErTraumaLevel,
  type ErTriageV1Form,
} from "./medoraErTriageV1";
import {
  safetyAssessmentHasDocumentedConcern,
  travelDetailsHasContent,
} from "./edTriageEfficiencyGovernance";
import { buildEdHeaderAllergySummary } from "./edHeaderAllergySummary";

function interpolatePreview(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    params[k] !== undefined ? String(params[k]) : `{${k}}`
  );
}

function previewLocaleTag(locale: SupportedLanguage): string {
  return productUiBcp47Tag(locale);
}

function ynuPreview(locale: SupportedLanguage, v: string): string {
  if (v === "yes") return erTriageT(locale, "erTriage.preview.ynuYes");
  if (v === "no") return erTriageT(locale, "erTriage.preview.ynuNo");
  if (v === "unknown") return erTriageT(locale, "erTriage.preview.ynuUnknown");
  return "";
}

/** Returns E/V/M strings and total when all three GCS subscores are valid; otherwise null. */
export function gcsEvmTriadForTriagePreview(er: ErTriageV1Form): { e: string; v: string; m: string; total: number } | null {
  const e = er.gcsEye.trim();
  const v = er.gcsVerbal.trim();
  const m = er.gcsMotor.trim();
  if (!e || !v || !m) return null;
  const ne = parseInt(e, 10);
  const nv = parseInt(v, 10);
  const nm = parseInt(m, 10);
  if (Number.isNaN(ne) || Number.isNaN(nv) || Number.isNaN(nm)) return null;
  if (ne < 1 || ne > 4 || nv < 1 || nv > 5 || nm < 1 || nm > 6) return null;
  const total = ne + nv + nm;
  if (total < 3 || total > 15) return null;
  return { e, v, m, total };
}

function abcPreview(locale: SupportedLanguage, v: string): string {
  if (v === "wnl") return erTriageT(locale, "erTriage.preview.abcWnl");
  return ynuPreview(locale, v);
}

function ynPreview(locale: SupportedLanguage, v: "" | "yes" | "no"): string {
  if (v === "yes") return erTriageT(locale, "erTriage.preview.ynuYes");
  if (v === "no") return erTriageT(locale, "erTriage.preview.ynuNo");
  return erTriageT(locale, "erTriage.preview.emptyOption");
}

const TRAUMA_CRITERION_I18N: Record<string, string> = {
  hypotension: "erTriage.v1.traumaCriteriaHypotension",
  respiratory_distress: "erTriage.v1.traumaCriteriaRespiratory",
  neuro_alteration: "erTriage.v1.traumaCriteriaNeuro",
  major_fall: "erTriage.v1.traumaCriteriaFall",
  high_energy_mechanism: "erTriage.v1.traumaCriteriaHighEnergy",
  penetrating_wound: "erTriage.v1.traumaCriteriaPenetrating",
  amputation_crush: "erTriage.v1.traumaCriteriaAmputation",
  other_major: "erTriage.v1.traumaCriteriaOther",
};

function traumaCriterionPreviewLabel(locale: SupportedLanguage, id: string): string {
  const p = TRAUMA_CRITERION_I18N[id];
  return p ? erTriageT(locale, p) : id;
}

function traumaLevelShortPreview(locale: SupportedLanguage, level: ErTraumaLevel): string | null {
  if (level === "LEVEL_1") return erTriageT(locale, "erTriage.preview.traumaLevel1");
  if (level === "LEVEL_2") return erTriageT(locale, "erTriage.preview.traumaLevel2");
  if (level === "LEVEL_3") return erTriageT(locale, "erTriage.preview.traumaLevel3");
  if (level === "LEVEL_4") return erTriageT(locale, "erTriage.preview.traumaLevel4");
  return null;
}

/** Locale-aware trauma lines for triage documentation preview (replaces French-only helper). */
export function traumaActivationPreviewLines(ta: ErTraumaActivationForm, locale: SupportedLanguage): string[] {
  if (!ta.activated) return [];
  const lines: string[] = [];
  const level = ta.level ? traumaLevelShortPreview(locale, ta.level) : null;
  if (level) {
    lines.push(
      interpolatePreview(erTriageT(locale, "erTriage.preview.traumaActivatedWithLevel"), { level })
    );
  } else {
    lines.push(erTriageT(locale, "erTriage.preview.traumaActivated"));
  }
  if (ta.activatedAt) {
    const d = new Date(ta.activatedAt);
    if (!Number.isNaN(d.getTime())) {
      const time = d.toLocaleTimeString(previewLocaleTag(locale), { hour: "2-digit", minute: "2-digit" });
      lines.push(interpolatePreview(erTriageT(locale, "erTriage.preview.traumaActivationTime"), { time }));
    }
  }
  if (ta.criteria.length) {
    const labels = ta.criteria.map((id) => traumaCriterionPreviewLabel(locale, id).toLowerCase());
    lines.push(interpolatePreview(erTriageT(locale, "erTriage.preview.traumaCriteria"), { list: labels.join(", ") }));
  }
  if (ta.notes.trim()) {
    lines.push(interpolatePreview(erTriageT(locale, "erTriage.preview.traumaNotes"), { text: ta.notes.trim() }));
  }
  return lines;
}

/** Stored as `Triage.strokeScreen` / `Triage.sepsisScreen` JSON (ER triage screening). */
export type ErScreeningYnu = "" | "yes" | "no" | "unknown";

function screeningYnuFromUnknown(v: unknown): ErScreeningYnu {
  const s = typeof v === "string" ? v : "";
  if (s === "yes" || s === "no" || s === "unknown") return s;
  return "";
}

function screeningYnFromUnknown(v: unknown): "" | "yes" | "no" {
  const s = typeof v === "string" ? v : "";
  if (s === "yes" || s === "no") return s;
  return "";
}

export type ErStrokeScreenForm = {
  faceDroop: ErScreeningYnu;
  armWeakness: ErScreeningYnu;
  speechDifficulty: ErScreeningYnu;
  lastKnownWell: string;
  strokeAlertActivated: "" | "yes" | "no";
  comments: string;
};

export type ErSepsisScreenForm = {
  suspectedInfection: ErScreeningYnu;
  rrGte22: ErScreeningYnu;
  sbpLte100: ErScreeningYnu;
  alteredMentalStatus: ErScreeningYnu;
  lactateOrdered: ErScreeningYnu;
  sepsisAlertActivated: "" | "yes" | "no";
  comments: string;
};

export function emptyStrokeScreenForm(): ErStrokeScreenForm {
  return {
    faceDroop: "",
    armWeakness: "",
    speechDifficulty: "",
    lastKnownWell: "",
    strokeAlertActivated: "",
    comments: "",
  };
}

export function emptySepsisScreenForm(): ErSepsisScreenForm {
  return {
    suspectedInfection: "",
    rrGte22: "",
    sbpLte100: "",
    alteredMentalStatus: "",
    lactateOrdered: "",
    sepsisAlertActivated: "",
    comments: "",
  };
}

export function strokeScreenFromUnknown(raw: unknown): ErStrokeScreenForm {
  const e = emptyStrokeScreenForm();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return e;
  const o = raw as Record<string, unknown>;
  e.faceDroop = screeningYnuFromUnknown(o.faceDroop);
  e.armWeakness = screeningYnuFromUnknown(o.armWeakness);
  e.speechDifficulty = screeningYnuFromUnknown(o.speechDifficulty);
  e.lastKnownWell = typeof o.lastKnownWell === "string" ? o.lastKnownWell : "";
  e.strokeAlertActivated = screeningYnFromUnknown(o.strokeAlertActivated);
  e.comments = typeof o.comments === "string" ? o.comments : "";
  return e;
}

export function sepsisScreenFromUnknown(raw: unknown): ErSepsisScreenForm {
  const e = emptySepsisScreenForm();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return e;
  const o = raw as Record<string, unknown>;
  e.suspectedInfection = screeningYnuFromUnknown(o.suspectedInfection);
  e.rrGte22 = screeningYnuFromUnknown(o.rrGte22);
  e.sbpLte100 = screeningYnuFromUnknown(o.sbpLte100);
  e.alteredMentalStatus = screeningYnuFromUnknown(o.alteredMentalStatus);
  e.lactateOrdered = screeningYnuFromUnknown(o.lactateOrdered);
  e.sepsisAlertActivated = screeningYnFromUnknown(o.sepsisAlertActivated);
  e.comments = typeof o.comments === "string" ? o.comments : "";
  return e;
}

export function strokeScreenFormHasContent(f: ErStrokeScreenForm): boolean {
  return !!(
    f.faceDroop ||
    f.armWeakness ||
    f.speechDifficulty ||
    f.lastKnownWell.trim() ||
    f.strokeAlertActivated ||
    f.comments.trim()
  );
}

export function sepsisScreenFormHasContent(f: ErSepsisScreenForm): boolean {
  return !!(
    f.suspectedInfection ||
    f.rrGte22 ||
    f.sbpLte100 ||
    f.alteredMentalStatus ||
    f.lactateOrdered ||
    f.sepsisAlertActivated ||
    f.comments.trim()
  );
}

/** Merges into a copy of `previous` so unknown JSON keys are preserved until overwritten. */
export function strokeScreenFormToJson(f: ErStrokeScreenForm, previous?: unknown): Record<string, unknown> {
  const base: Record<string, unknown> =
    previous && typeof previous === "object" && !Array.isArray(previous)
      ? { ...(previous as Record<string, unknown>) }
      : {};
  const setOrDel = (k: string, v: string | undefined) => {
    if (v) base[k] = v;
    else delete base[k];
  };
  setOrDel("faceDroop", f.faceDroop);
  setOrDel("armWeakness", f.armWeakness);
  setOrDel("speechDifficulty", f.speechDifficulty);
  if (f.lastKnownWell.trim()) base.lastKnownWell = f.lastKnownWell.trim();
  else delete base.lastKnownWell;
  setOrDel("strokeAlertActivated", f.strokeAlertActivated);
  if (f.comments.trim()) base.comments = f.comments.trim();
  else delete base.comments;
  return base;
}

export function sepsisScreenFormToJson(f: ErSepsisScreenForm, previous?: unknown): Record<string, unknown> {
  const base: Record<string, unknown> =
    previous && typeof previous === "object" && !Array.isArray(previous)
      ? { ...(previous as Record<string, unknown>) }
      : {};
  const setOrDel = (k: string, v: string | undefined) => {
    if (v) base[k] = v;
    else delete base[k];
  };
  setOrDel("suspectedInfection", f.suspectedInfection);
  setOrDel("rrGte22", f.rrGte22);
  setOrDel("sbpLte100", f.sbpLte100);
  setOrDel("alteredMentalStatus", f.alteredMentalStatus);
  setOrDel("lactateOrdered", f.lactateOrdered);
  setOrDel("sepsisAlertActivated", f.sepsisAlertActivated);
  if (f.comments.trim()) base.comments = f.comments.trim();
  else delete base.comments;
  return base;
}

function screeningYnuPreview(locale: SupportedLanguage, v: ErScreeningYnu): string {
  if (v === "yes" || v === "no" || v === "unknown") return ynuPreview(locale, v);
  return erTriageT(locale, "erTriage.preview.emptyOption");
}

export function strokeScreenToPreviewLines(raw: unknown, locale: SupportedLanguage): string[] {
  const f = strokeScreenFromUnknown(raw);
  if (!strokeScreenFormHasContent(f)) return [];
  const lines: string[] = [];
  if (f.faceDroop) {
    lines.push(
      interpolatePreview(erTriageT(locale, "erTriage.preview.strokeFace"), {
        value: screeningYnuPreview(locale, f.faceDroop),
      })
    );
  }
  if (f.armWeakness) {
    lines.push(
      interpolatePreview(erTriageT(locale, "erTriage.preview.strokeArm"), {
        value: screeningYnuPreview(locale, f.armWeakness),
      })
    );
  }
  if (f.speechDifficulty) {
    lines.push(
      interpolatePreview(erTriageT(locale, "erTriage.preview.strokeSpeech"), {
        value: screeningYnuPreview(locale, f.speechDifficulty),
      })
    );
  }
  if (f.lastKnownWell.trim()) {
    const d = new Date(f.lastKnownWell);
    lines.push(
      !Number.isNaN(d.getTime())
        ? interpolatePreview(erTriageT(locale, "erTriage.preview.strokeLkw"), {
            datetime: d.toLocaleString(previewLocaleTag(locale)),
          })
        : interpolatePreview(erTriageT(locale, "erTriage.preview.strokeLkw"), {
            datetime: f.lastKnownWell.trim(),
          })
    );
  }
  if (f.strokeAlertActivated) {
    lines.push(
      interpolatePreview(erTriageT(locale, "erTriage.preview.strokeAlert"), {
        value: ynPreview(locale, f.strokeAlertActivated),
      })
    );
  }
  if (f.comments.trim()) {
    lines.push(
      interpolatePreview(erTriageT(locale, "erTriage.preview.strokeComments"), { text: f.comments.trim() })
    );
  }
  return lines;
}

export function sepsisScreenToPreviewLines(raw: unknown, locale: SupportedLanguage): string[] {
  const f = sepsisScreenFromUnknown(raw);
  if (!sepsisScreenFormHasContent(f)) return [];
  const lines: string[] = [];
  if (f.suspectedInfection) {
    lines.push(
      interpolatePreview(erTriageT(locale, "erTriage.preview.sepsisSuspected"), {
        value: screeningYnuPreview(locale, f.suspectedInfection),
      })
    );
  }
  if (f.rrGte22) {
    lines.push(
      interpolatePreview(erTriageT(locale, "erTriage.preview.sepsisRr"), {
        value: screeningYnuPreview(locale, f.rrGte22),
      })
    );
  }
  if (f.sbpLte100) {
    lines.push(
      interpolatePreview(erTriageT(locale, "erTriage.preview.sepsisSbp"), {
        value: screeningYnuPreview(locale, f.sbpLte100),
      })
    );
  }
  if (f.alteredMentalStatus) {
    lines.push(
      interpolatePreview(erTriageT(locale, "erTriage.preview.sepsisAms"), {
        value: screeningYnuPreview(locale, f.alteredMentalStatus),
      })
    );
  }
  if (f.lactateOrdered) {
    lines.push(
      interpolatePreview(erTriageT(locale, "erTriage.preview.sepsisLactate"), {
        value: screeningYnuPreview(locale, f.lactateOrdered),
      })
    );
  }
  if (f.sepsisAlertActivated) {
    lines.push(
      interpolatePreview(erTriageT(locale, "erTriage.preview.sepsisAlert"), {
        value: ynPreview(locale, f.sepsisAlertActivated),
      })
    );
  }
  if (f.comments.trim()) {
    lines.push(
      interpolatePreview(erTriageT(locale, "erTriage.preview.sepsisComments"), { text: f.comments.trim() })
    );
  }
  return lines;
}

export type TriageDocPreviewFormSlice = {
  chiefComplaint: string;
  onsetAt: string;
  esi: string;
  tempC: string;
  hr: string;
  rr: string;
  bpSys: string;
  bpDia: string;
  spo2: string;
  weightKg: string;
  heightCm: string;
  painScore?: string;
  allergyNote: string;
  triageCompleteAt: string;
  /** When set, `tempC` / `weightKg` / height fields are interpreted in these units for save + abnormality checks. */
  tempInputUnit?: "C" | "F";
  weightInputUnit?: "kg" | "lb";
  heightInputMode?: "cm" | "ftin";
  heightFeet?: string;
  heightInches?: string;
};

export type TriagePreviewSection = {
  id: string;
  title: string;
  lines: string[];
};

/**
 * Maps GET `/encounters/:id/triage` JSON to the preview slice + ER V1 form (same field mapping as `EmergencyTriagePanel`).
 * When `language` is set, vitals display strings use locale-typical entry units (en: °F / lb / ft·in) while storage stays canonical.
 */
export function triagePreviewSliceFromTriageGet(
  triage: Record<string, unknown> | null,
  language?: SupportedLanguage
): {
  slice: TriageDocPreviewFormSlice;
  er: ErTriageV1Form;
} | null {
  if (!triage) return null;
  const d = triage;
  const v = (d.vitalsJson || {}) as Record<string, number | string | null>;
  const slice: TriageDocPreviewFormSlice = {
    chiefComplaint: (d.chiefComplaint as string) || "",
    onsetAt: d.onsetAt ? new Date(d.onsetAt as string).toISOString().slice(0, 16) : "",
    esi: d.esi != null ? String(d.esi) : "",
    tempC: v.tempC?.toString() ?? "",
    hr: v.hr?.toString() ?? "",
    rr: v.rr?.toString() ?? "",
    bpSys: v.bpSys?.toString() ?? "",
    bpDia: v.bpDia?.toString() ?? "",
    spo2: v.spo2?.toString() ?? "",
    weightKg: v.weightKg?.toString() ?? "",
    heightCm: v.heightCm?.toString() ?? "",
    painScore: (() => {
      if (v.painScore != null && v.painScore !== "") return String(v.painScore);
      if (v.pain != null && v.pain !== "") return String(v.pain);
      return "";
    })(),
    allergyNote: (v as { allergyNote?: string | null }).allergyNote ?? "",
    triageCompleteAt: d.triageCompleteAt
      ? new Date(d.triageCompleteAt as string).toISOString().slice(0, 16)
      : "",
    heightFeet: "",
    heightInches: "",
  };

  if (language) {
    const u = defaultVitalsEntryUnits(language);
    slice.tempInputUnit = u.tempInputUnit;
    slice.weightInputUnit = u.weightInputUnit;
    slice.heightInputMode = u.heightInputMode;

    const tempNum = parseFloat(String(v.tempC ?? "").trim());
    if (Number.isFinite(tempNum)) {
      if (u.tempInputUnit === "F") {
        slice.tempC = displayTemperatureFromStoredC(tempNum, "F");
      } else {
        slice.tempC = displayTemperatureFromStoredC(tempNum, "C");
      }
    }

    const wNum = parseFloat(String(v.weightKg ?? "").trim());
    if (Number.isFinite(wNum)) {
      slice.weightKg = displayWeightKgFromStored(wNum, u.weightInputUnit);
    }

    const hNum = parseFloat(String(v.heightCm ?? "").trim());
    if (Number.isFinite(hNum)) {
      if (u.heightInputMode === "ftin") {
        const fi = heightFeetInchStringsFromStoredCm(hNum);
        slice.heightFeet = fi.feet;
        slice.heightInches = fi.inches;
        slice.heightCm = "";
      } else {
        slice.heightCm = displayHeightCmStringFromStored(hNum);
      }
    }
  }

  const er = erTriageV1FormFromVitalsJson(d.vitalsJson);
  if (!slice.painScore?.trim() && er.painScale0to10.trim()) {
    slice.painScore = er.painScale0to10;
  }
  return { slice, er };
}

/** TA syst./diast. for compact strip (no wide label/value gap). */
export function formatTriageBpStrip(sys: string, dia: string, locale: SupportedLanguage): string {
  const dash = erTriageT(locale, "erTriage.preview.emptyOption");
  const s = String(sys ?? "").trim();
  const d = String(dia ?? "").trim();
  if (!s && !d) return dash;
  return `${s || dash}/${d || dash}`;
}

/** One row per vital for the ER workspace header strip (order: TA, FC, FR, Temp, SpO₂, Poids, Taille). */
export function buildErWorkspaceVitalPairs(
  slice: TriageDocPreviewFormSlice,
  locale: SupportedLanguage
): { label: string; value: string }[] {
  const f = slice;
  const dash = erTriageT(locale, "erTriage.preview.emptyOption");
  const vs = erTriageMessagesForLocale(locale).preview.vitalStrip;
  return [
    { label: vs.ta, value: formatTriageBpStrip(f.bpSys, f.bpDia, locale) },
    {
      label: vs.hr,
      value: f.hr.trim()
        ? interpolatePreview(vs.perMin, { n: f.hr.trim() })
        : dash,
    },
    {
      label: vs.rr,
      value: f.rr.trim()
        ? interpolatePreview(vs.perMin, { n: f.rr.trim() })
        : dash,
    },
    {
      label: vs.temp,
      value: (() => {
        const tCanon = canonicalTemperatureCelsius(f.tempC, f.tempInputUnit);
        return tCanon != null ? formatTemperatureDualLine(tCanon, locale) : dash;
      })(),
    },
    {
      label: vs.spo2,
      value: f.spo2.trim()
        ? interpolatePreview(vs.pct, { n: f.spo2.trim() })
        : dash,
    },
    {
      label: vs.weight,
      value: (() => {
        const wCanon = canonicalWeightKg(f.weightKg, f.weightInputUnit);
        return wCanon != null ? formatWeightDualLine(wCanon, locale) : dash;
      })(),
    },
    {
      label: vs.height,
      value: (() => {
        const hCanon = canonicalHeightCm({
          heightCmStr: f.heightCm,
          heightInputMode: f.heightInputMode,
          heightFeetStr: f.heightFeet,
          heightInchesStr: f.heightInches,
        });
        return hCanon != null ? formatHeightDualLine(hCanon, locale) : dash;
      })(),
    },
  ];
}

function erTriageMessagesForLocale(locale: SupportedLanguage) {
  return locale === "en" ? erTriageMessagesEn : erTriageMessagesFr;
}

/** Canonical vitals record for header / MSE lines (interprets entry units on the slice). */
export function vitalsCanonicalRecordFromTriageSlice(
  f: TriageDocPreviewFormSlice
): Record<string, number | string | null | undefined> {
  const tCanon = canonicalTemperatureCelsius(f.tempC, f.tempInputUnit);
  const wCanon = canonicalWeightKg(f.weightKg, f.weightInputUnit);
  const hCanon = canonicalHeightCm({
    heightCmStr: f.heightCm,
    heightInputMode: f.heightInputMode,
    heightFeetStr: f.heightFeet,
    heightInchesStr: f.heightInches,
  });
  return {
    tempC: tCanon ?? "",
    hr: f.hr ? parseInt(f.hr, 10) : "",
    rr: f.rr ? parseInt(f.rr, 10) : "",
    bpSys: f.bpSys ? parseInt(f.bpSys, 10) : "",
    bpDia: f.bpDia ? parseInt(f.bpDia, 10) : "",
    spo2: f.spo2 ? parseInt(f.spo2, 10) : "",
    weightKg: wCanon ?? "",
    heightCm: hCanon ?? "",
    painScore: f.painScore?.trim() ? parseInt(f.painScore, 10) : "",
  };
}

function vitalsRecordForHeader(f: TriageDocPreviewFormSlice): Record<string, number | string | null | undefined> {
  return vitalsCanonicalRecordFromTriageSlice(f);
}

function collectVitalAbnormalities(f: TriageDocPreviewFormSlice, locale: SupportedLanguage): string[] {
  const out: string[] = [];
  const t = canonicalTemperatureCelsius(f.tempC, f.tempInputUnit);
  if (t != null) {
    if (t > 38.0) out.push(erTriageT(locale, "erTriage.preview.vitalFever"));
    if (t < 36.0) out.push(erTriageT(locale, "erTriage.preview.vitalHypothermia"));
  }
  const hr = f.hr ? parseInt(f.hr, 10) : NaN;
  if (!Number.isNaN(hr)) {
    if (hr > 120) out.push(erTriageT(locale, "erTriage.preview.vitalTachy"));
    if (hr < 50) out.push(erTriageT(locale, "erTriage.preview.vitalBrady"));
  }
  const rr = f.rr ? parseInt(f.rr, 10) : NaN;
  if (!Number.isNaN(rr)) {
    if (rr > 24) out.push(erTriageT(locale, "erTriage.preview.vitalTachypnea"));
    if (rr < 10) out.push(erTriageT(locale, "erTriage.preview.vitalRrLow"));
  }
  const spo2 = f.spo2 ? parseInt(f.spo2, 10) : NaN;
  if (!Number.isNaN(spo2) && spo2 < 94) out.push(erTriageT(locale, "erTriage.preview.vitalSpo2Low"));
  const sys = f.bpSys ? parseInt(f.bpSys, 10) : NaN;
  const dia = f.bpDia ? parseInt(f.bpDia, 10) : NaN;
  if (!Number.isNaN(sys)) {
    if (sys < 90) out.push(erTriageT(locale, "erTriage.preview.vitalSbpLow"));
    if (sys > 180) out.push(erTriageT(locale, "erTriage.preview.vitalSbpHigh"));
  }
  if (!Number.isNaN(dia) && dia > 110) out.push(erTriageT(locale, "erTriage.preview.vitalDbpHigh"));
  return out;
}

function pushIf(lines: string[], prefix: string, text: string) {
  const t = text.trim();
  if (t) lines.push(`${prefix}${t}`);
}

/** Combined allergy text (no duplicate labels — legacy medicationAllergiesDetail still included if present). */
function allergyDetailLines(f: TriageDocPreviewFormSlice, er: ErTriageV1Form, locale: SupportedLanguage): string[] {
  const chunks: string[] = [];
  const note = f.allergyNote.trim();
  if (note) chunks.push(note);
  const med = er.medicationAllergiesDetail.trim();
  if (med) chunks.push(interpolatePreview(erTriageT(locale, "erTriage.preview.allergyMedLine"), { text: med }));
  const food = er.foodAllergiesDetail.trim();
  if (food) chunks.push(interpolatePreview(erTriageT(locale, "erTriage.preview.allergyFoodLine"), { text: food }));
  const add = er.additionalAllergyInfo.trim();
  if (add) chunks.push(add);
  if (chunks.length === 0) return [];
  return [
    interpolatePreview(erTriageT(locale, "erTriage.preview.allergyCombined"), {
      text: chunks.join(" — "),
    }),
  ];
}

/** Latest vitals one-liner for clinical strip (same logic as chart header). */
export function buildVitalsStripLine(f: TriageDocPreviewFormSlice, locale: SupportedLanguage): string {
  return formatVitalsHeaderLineForLocale(vitalsRecordForHeader(f), locale);
}

/**
 * Compact allergy summary for ED header strip — short names/status only (M1.7B.8).
 * Empty string when nothing documented.
 */
export function buildAllergyStripSummary(
  f: TriageDocPreviewFormSlice,
  er: ErTriageV1Form,
  locale: SupportedLanguage = "fr"
): string {
  return buildEdHeaderAllergySummary(f, er, locale);
}

export type TriagePreviewModel = {
  sections: TriagePreviewSection[];
  /** Short rule-based sentence; empty if nothing to say. */
  narrative: string;
};

function buildNarrative(f: TriageDocPreviewFormSlice, er: ErTriageV1Form, locale: SupportedLanguage): string {
  const parts: string[] = [];
  const m = f.chiefComplaint.trim();
  if (m) {
    parts.push(
      interpolatePreview(erTriageT(locale, "erTriage.preview.narrativeMotif"), {
        text: m.length > 100 ? `${m.slice(0, 100)}…` : m,
      })
    );
  }
  if (f.esi) {
    parts.push(interpolatePreview(erTriageT(locale, "erTriage.preview.narrativeEsi"), { n: f.esi }));
  }
  const vitalsLine = formatVitalsHeaderLineForLocale(vitalsRecordForHeader(f), locale);
  if (vitalsLine) parts.push(vitalsLine);
  if (er.painScale0to10.trim()) {
    const n = parseInt(er.painScale0to10, 10);
    if (!Number.isNaN(n)) {
      parts.push(interpolatePreview(erTriageT(locale, "erTriage.preview.narrativePain"), { n: String(n) }));
    }
  }
  if (parts.length === 0) return "";
  return interpolatePreview(erTriageT(locale, "erTriage.preview.narrativeIntro"), {
    parts: parts.join(" · "),
  });
}

/**
 * Grouped preview for MedoraCard layout — rule-based only, no new fields.
 */
export function buildTriageDocumentationPreviewModel(
  f: TriageDocPreviewFormSlice,
  opts: {
    strokeScreen: unknown;
    sepsisScreen: unknown;
    erV1: ErTriageV1Form;
    locale: SupportedLanguage;
  }
): TriagePreviewModel {
  const { locale } = opts;
  const er = opts.erV1;
  const sections: TriagePreviewSection[] = [];

  const presentation: string[] = [];
  const complaint = f.chiefComplaint.trim();
  if (complaint) {
    presentation.push(interpolatePreview(erTriageT(locale, "erTriage.preview.lineChief"), { text: complaint }));
  }
  if (f.onsetAt) {
    const d = new Date(f.onsetAt);
    if (!Number.isNaN(d.getTime())) {
      presentation.push(
        interpolatePreview(erTriageT(locale, "erTriage.preview.lineOnset"), {
          datetime: d.toLocaleString(previewLocaleTag(locale)),
        })
      );
    }
  }
  if (f.esi) {
    presentation.push(interpolatePreview(erTriageT(locale, "erTriage.preview.lineEsi"), { n: f.esi }));
  }
  if (presentation.length) {
    sections.push({
      id: "presentation",
      title: erTriageT(locale, "erTriage.preview.sections.presentation"),
      lines: presentation,
    });
  }

  const etatInitial: string[] = [];
  pushIf(etatInitial, erTriageT(locale, "erTriage.preview.prefixTriageNarrative"), er.triageNarrative);
  pushIf(etatInitial, erTriageT(locale, "erTriage.preview.prefixPpe"), er.ppeNote);
  if (er.airway) {
    etatInitial.push(
      interpolatePreview(erTriageT(locale, "erTriage.preview.lineAirway"), { value: abcPreview(locale, er.airway) })
    );
  }
  if (er.breathing) {
    etatInitial.push(
      interpolatePreview(erTriageT(locale, "erTriage.preview.lineBreathing"), {
        value: abcPreview(locale, er.breathing),
      })
    );
  }
  if (er.circulation) {
    etatInitial.push(
      interpolatePreview(erTriageT(locale, "erTriage.preview.lineCirculation"), {
        value: abcPreview(locale, er.circulation),
      })
    );
  }
  const gcsEvm = gcsEvmTriadForTriagePreview(er);
  if (gcsEvm) {
    etatInitial.push(
      interpolatePreview(erTriageT(locale, "erTriage.preview.lineGcsComponents"), {
        total: String(gcsEvm.total),
        e: gcsEvm.e,
        v: gcsEvm.v,
        m: gcsEvm.m,
      })
    );
  } else if (er.gcs15) {
    etatInitial.push(
      interpolatePreview(erTriageT(locale, "erTriage.preview.lineGcs"), { value: ynuPreview(locale, er.gcs15) })
    );
  }
  if (er.traumaActivation.activated) {
    etatInitial.push(...traumaActivationPreviewLines(er.traumaActivation, locale));
  }
  pushIf(etatInitial, erTriageT(locale, "erTriage.preview.prefixExceptions"), er.triageExceptionsNote);
  pushIf(etatInitial, erTriageT(locale, "erTriage.preview.prefixReferral"), er.referralSource);
  if (er.triageStartedAt) {
    const d = new Date(er.triageStartedAt);
    if (!Number.isNaN(d.getTime())) {
      etatInitial.push(
        interpolatePreview(erTriageT(locale, "erTriage.preview.lineTriageStart"), {
          datetime: d.toLocaleString(previewLocaleTag(locale)),
        })
      );
    }
  }
  if (etatInitial.length) {
    sections.push({
      id: "etat_initial",
      title: erTriageT(locale, "erTriage.preview.sections.etat_initial"),
      lines: etatInitial,
    });
  }

  const signes: string[] = [];
  const vitalsLine = formatVitalsHeaderLineForLocale(vitalsRecordForHeader(f), locale);
  if (vitalsLine) {
    signes.push(interpolatePreview(erTriageT(locale, "erTriage.preview.vitalsRecorded"), { line: vitalsLine }));
  }
  const abn = collectVitalAbnormalities(f, locale);
  if (abn.length) {
    signes.push(interpolatePreview(erTriageT(locale, "erTriage.preview.vitalsNote"), { items: abn.join(" ; ") }));
  }
  if (f.triageCompleteAt) {
    const d = new Date(f.triageCompleteAt);
    if (!Number.isNaN(d.getTime())) {
      signes.push(
        interpolatePreview(erTriageT(locale, "erTriage.preview.triageCompletedAt"), {
          datetime: d.toLocaleString(previewLocaleTag(locale)),
        })
      );
    }
  }
  if (signes.length) {
    sections.push({
      id: "signes_vitaux",
      title: erTriageT(locale, "erTriage.preview.sections.signes_vitaux"),
      lines: signes,
    });
  }

  const securite: string[] = [];
  pushIf(securite, erTriageT(locale, "erTriage.preview.prefixNursingCare"), er.nursingCareNote);
  if (er.callLightInReach) {
    securite.push(
      interpolatePreview(erTriageT(locale, "erTriage.preview.lineCallLight"), {
        value: ynuPreview(locale, er.callLightInReach),
      })
    );
  }
  if (er.bedLockedLow) {
    securite.push(
      interpolatePreview(erTriageT(locale, "erTriage.preview.lineBedLow"), {
        value: ynuPreview(locale, er.bedLockedLow),
      })
    );
  }
  if (er.familyAtBedside) {
    securite.push(
      interpolatePreview(erTriageT(locale, "erTriage.preview.lineFamily"), {
        value: ynuPreview(locale, er.familyAtBedside),
      })
    );
  }
  if (er.inViewOfNursingStation) {
    securite.push(
      interpolatePreview(erTriageT(locale, "erTriage.preview.lineInView"), {
        value: ynuPreview(locale, er.inViewOfNursingStation),
      })
    );
  }
  if (er.patientUpdatedOnPlan) {
    securite.push(
      interpolatePreview(erTriageT(locale, "erTriage.preview.linePlan"), {
        value: ynuPreview(locale, er.patientUpdatedOnPlan),
      })
    );
  }
  if (er.comfortMeasuresProvided) {
    securite.push(
      interpolatePreview(erTriageT(locale, "erTriage.preview.lineComfort"), {
        value: ynuPreview(locale, er.comfortMeasuresProvided),
      })
    );
  }
  pushIf(securite, erTriageT(locale, "erTriage.preview.prefixEdPpe"), er.edCoursePpeNote);
  pushIf(securite, erTriageT(locale, "erTriage.preview.prefixNursingNotes"), er.nursingNotesAddendum);
  if (er.feelsSafeAtHome) {
    securite.push(
      interpolatePreview(erTriageT(locale, "erTriage.preview.lineSafeHome"), {
        value: ynuPreview(locale, er.feelsSafeAtHome),
      })
    );
    if (er.feelsSafeAtHome === "no" || er.feelsSafeAtHome === "unknown") {
      if (safetyAssessmentHasDocumentedConcern(er)) {
        if (er.safetyImmediateDanger === "yes") {
          securite.push(erTriageT(locale, "erTriage.preview.safetyImmediateDanger"));
        }
        if (er.safetyAbuseNeglect === "yes") {
          securite.push(erTriageT(locale, "erTriage.preview.safetyAbuseNeglect"));
        }
        if (er.safetyHumanTrafficking === "yes") {
          securite.push(erTriageT(locale, "erTriage.preview.safetyHumanTrafficking"));
        }
        if (er.safetySelfHarm === "yes") {
          securite.push(erTriageT(locale, "erTriage.preview.safetySelfHarm"));
        }
        if (er.safetyNeedsSocialWork === "yes") {
          securite.push(erTriageT(locale, "erTriage.preview.safetyNeedsSocialWork"));
        }
        pushIf(securite, erTriageT(locale, "erTriage.preview.prefixSafetyNotes"), er.safetyAssessmentNotes);
      } else if (er.feelsSafeAtHome === "no") {
        securite.push(erTriageT(locale, "erTriage.preview.safetyHomeConcern"));
      }
    }
  }
  if (er.travelOutsideCountry14d) {
    securite.push(
      interpolatePreview(erTriageT(locale, "erTriage.preview.lineTravel"), {
        value: ynuPreview(locale, er.travelOutsideCountry14d),
      })
    );
    if (er.travelOutsideCountry14d === "yes" && travelDetailsHasContent(er)) {
      pushIf(securite, erTriageT(locale, "erTriage.preview.prefixTravelDestination"), er.travelDestinationCountry);
      pushIf(securite, erTriageT(locale, "erTriage.preview.prefixTravelDate"), er.travelDateOrReturn);
      pushIf(securite, erTriageT(locale, "erTriage.preview.prefixTravelExposure"), er.travelExposureConcern);
      pushIf(securite, erTriageT(locale, "erTriage.preview.prefixTravelNotes"), er.travelScreeningNotes);
    }
  }
  const strokeLines = strokeScreenToPreviewLines(opts.strokeScreen, locale);
  if (strokeLines.length) {
    securite.push(erTriageT(locale, "erTriage.preview.strokeHeader"));
    strokeLines.forEach((line) =>
      securite.push(interpolatePreview(erTriageT(locale, "erTriage.preview.strokeBullet"), { line }))
    );
  }
  const sepsisLines = sepsisScreenToPreviewLines(opts.sepsisScreen, locale);
  if (sepsisLines.length) {
    securite.push(erTriageT(locale, "erTriage.preview.sepsisHeader"));
    sepsisLines.forEach((line) =>
      securite.push(interpolatePreview(erTriageT(locale, "erTriage.preview.strokeBullet"), { line }))
    );
  }
  if (securite.length) {
    sections.push({
      id: "securite",
      title: erTriageT(locale, "erTriage.preview.sections.securite"),
      lines: securite,
    });
  }

  const meds: string[] = [];
  pushIf(meds, erTriageT(locale, "erTriage.preview.prefixMeds"), er.medicationsSummary);
  meds.push(...allergyDetailLines(f, er, locale));
  pushIf(meds, erTriageT(locale, "erTriage.preview.prefixPharmacy"), er.preferredPharmacy);
  pushIf(meds, erTriageT(locale, "erTriage.preview.prefixImmu"), er.immunizationStatusNote);
  if (meds.length) {
    sections.push({
      id: "meds",
      title: erTriageT(locale, "erTriage.preview.sections.meds"),
      lines: meds,
    });
  }

  const hist: string[] = [];
  pushIf(hist, erTriageT(locale, "erTriage.preview.prefixPmh"), er.pastMedicalHistory);
  pushIf(hist, erTriageT(locale, "erTriage.preview.prefixPsh"), er.pastSurgicalHistory);
  pushIf(hist, erTriageT(locale, "erTriage.preview.prefixFh"), er.familyHistory);
  pushIf(hist, erTriageT(locale, "erTriage.preview.prefixSmoking"), er.smokingStatus);
  pushIf(hist, erTriageT(locale, "erTriage.preview.prefixAlcohol"), er.alcoholUse);
  pushIf(hist, erTriageT(locale, "erTriage.preview.prefixCannabis"), er.marijuanaUse);
  pushIf(hist, erTriageT(locale, "erTriage.preview.prefixStimulant"), er.stimulantUse);
  pushIf(hist, erTriageT(locale, "erTriage.preview.prefixOpioid"), er.opioidHeroinUse);
  pushIf(hist, erTriageT(locale, "erTriage.preview.prefixSocial"), er.historySocialComments);
  if (hist.length) {
    sections.push({
      id: "histoire",
      title: erTriageT(locale, "erTriage.preview.sections.histoire"),
      lines: hist,
    });
  }

  const narrative = buildNarrative(f, er, locale);

  if (sections.length === 0 && !narrative) {
    return {
      sections: [
        {
          id: "empty",
          title: erTriageT(locale, "erTriage.preview.sections.empty"),
          lines: [erTriageT(locale, "erTriage.preview.emptyBody")],
        },
      ],
      narrative: "",
    };
  }

  return { sections, narrative };
}
