/**
 * ER Triage V1 extension stored inside `Triage.vitalsJson` under key `medoraErTriageV1`.
 * No backend migration — uses existing Json column. Preserves unknown keys on merge.
 */

export const MEDORA_ER_TRIAGE_V1_KEY = "medoraErTriageV1" as const;

/** ABC-style triage assessment options. */
export type ErAbcOption = "" | "wnl" | "yes" | "no" | "unknown";

/** Yes / no / unknown (incl. sécurité). */
export type ErYesNoUnknown = "" | "yes" | "no" | "unknown";

/** Trauma activation level. */
export type ErTraumaLevel = "" | "LEVEL_1" | "LEVEL_2" | "LEVEL_3" | "LEVEL_4";

export type ErTraumaActivationCriterionId =
  | "hypotension"
  | "respiratory_distress"
  | "neuro_alteration"
  | "major_fall"
  | "high_energy_mechanism"
  | "penetrating_wound"
  | "amputation_crush"
  | "other_major";

/** Stable criterion ids with French labels (UI + preview). */
export const ER_TRAUMA_ACTIVATION_CRITERIA_OPTIONS: { id: ErTraumaActivationCriterionId; labelFr: string }[] = [
  { id: "hypotension", labelFr: "Hypotension" },
  { id: "respiratory_distress", labelFr: "Détresse respiratoire" },
  { id: "neuro_alteration", labelFr: "Altération neurologique" },
  { id: "major_fall", labelFr: "Chute importante" },
  { id: "high_energy_mechanism", labelFr: "Mécanisme à haute énergie" },
  { id: "penetrating_wound", labelFr: "Plaie pénétrante" },
  { id: "amputation_crush", labelFr: "Amputation / écrasement" },
  { id: "other_major", labelFr: "Autre critère majeur" },
];

const CRITERION_ID_SET = new Set<string>(ER_TRAUMA_ACTIVATION_CRITERIA_OPTIONS.map((o) => o.id));

export function traumaActivationCriterionLabelFr(id: string): string {
  const f = ER_TRAUMA_ACTIVATION_CRITERIA_OPTIONS.find((o) => o.id === id);
  return f ? f.labelFr : id;
}

/**
 * Stored under `medoraErTriageV1.traumaActivation` (JSON).
 * Form shape mirrors storage for UI, with empty-string defaults.
 */
export type ErTraumaActivationForm = {
  activated: boolean;
  level: ErTraumaLevel;
  activatedAt: string;
  criteria: string[];
  notes: string;
};

export function emptyErTraumaActivationForm(): ErTraumaActivationForm {
  return {
    activated: false,
    level: "",
    activatedAt: "",
    criteria: [],
    notes: "",
  };
}

export type ErTriageV1Form = {
  triageNarrative: string;
  ppeNote: string;
  airway: ErAbcOption;
  breathing: ErAbcOption;
  circulation: ErAbcOption;
  gcs15: ErYesNoUnknown;
  triageExceptionsNote: string;
  painScale0to10: string;
  referralSource: string;
  triageStartedAt: string;
  traumaActivation: ErTraumaActivationForm;

  nursingCareNote: string;
  callLightInReach: ErYesNoUnknown;
  bedLockedLow: ErYesNoUnknown;
  familyAtBedside: ErYesNoUnknown;
  inViewOfNursingStation: ErYesNoUnknown;
  patientUpdatedOnPlan: ErYesNoUnknown;
  comfortMeasuresProvided: ErYesNoUnknown;
  edCoursePpeNote: string;
  nursingNotesAddendum: string;
  feelsSafeAtHome: ErYesNoUnknown;
  travelOutsideCountry14d: ErYesNoUnknown;

  medicationsSummary: string;
  medicationAllergiesDetail: string;
  foodAllergiesDetail: string;
  additionalAllergyInfo: string;
  preferredPharmacy: string;
  immunizationStatusNote: string;

  pastMedicalHistory: string;
  pastSurgicalHistory: string;
  familyHistory: string;
  smokingStatus: string;
  alcoholUse: string;
  marijuanaUse: string;
  stimulantUse: string;
  opioidHeroinUse: string;
  historySocialComments: string;
};

export function emptyErTriageV1Form(): ErTriageV1Form {
  return {
    triageNarrative: "",
    ppeNote: "",
    airway: "",
    breathing: "",
    circulation: "",
    gcs15: "",
    triageExceptionsNote: "",
    painScale0to10: "",
    referralSource: "",
    triageStartedAt: "",
    traumaActivation: emptyErTraumaActivationForm(),

    nursingCareNote: "",
    callLightInReach: "",
    bedLockedLow: "",
    familyAtBedside: "",
    inViewOfNursingStation: "",
    patientUpdatedOnPlan: "",
    comfortMeasuresProvided: "",
    edCoursePpeNote: "",
    nursingNotesAddendum: "",
    feelsSafeAtHome: "",
    travelOutsideCountry14d: "",

    medicationsSummary: "",
    medicationAllergiesDetail: "",
    foodAllergiesDetail: "",
    additionalAllergyInfo: "",
    preferredPharmacy: "",
    immunizationStatusNote: "",

    pastMedicalHistory: "",
    pastSurgicalHistory: "",
    familyHistory: "",
    smokingStatus: "",
    alcoholUse: "",
    marijuanaUse: "",
    stimulantUse: "",
    opioidHeroinUse: "",
    historySocialComments: "",
  };
}

function isEmptyString(v: unknown): boolean {
  return v == null || (typeof v === "string" && v.trim() === "");
}

function extractMedoraObject(vitalsJson: unknown): Record<string, unknown> | null {
  if (vitalsJson == null || typeof vitalsJson !== "object" || Array.isArray(vitalsJson)) return null;
  const raw = (vitalsJson as Record<string, unknown>)[MEDORA_ER_TRIAGE_V1_KEY];
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  return { ...(raw as Record<string, unknown>) };
}

function stringFromStorage(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function abcFromStorage(v: unknown): ErAbcOption {
  const s = stringFromStorage(v);
  if (s === "wnl" || s === "yes" || s === "no" || s === "unknown") return s;
  return "";
}

function ynuFromStorage(v: unknown): ErYesNoUnknown {
  const s = stringFromStorage(v);
  if (s === "yes" || s === "no" || s === "unknown") return s;
  return "";
}

function traumaLevelFromStorage(v: unknown): ErTraumaLevel {
  const s = stringFromStorage(v);
  if (s === "LEVEL_1" || s === "LEVEL_2" || s === "LEVEL_3" || s === "LEVEL_4") return s;
  return "";
}

function criteriaFromUnknown(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    const s = typeof x === "string" ? x.trim() : "";
    if (s && CRITERION_ID_SET.has(s)) out.push(s);
  }
  return out;
}

function traumaActivationFromMedoraObject(o: Record<string, unknown>): ErTraumaActivationForm {
  const e = emptyErTraumaActivationForm();
  const raw = o.traumaActivation;
  if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
    const t = raw as Record<string, unknown>;
    e.level = traumaLevelFromStorage(t.level);
    const at = t.activatedAt;
    if (typeof at === "string" && at) {
      try {
        e.activatedAt = new Date(at).toISOString().slice(0, 16);
      } catch {
        e.activatedAt = "";
      }
    }
    e.criteria = criteriaFromUnknown(t.criteria);
    e.notes = typeof t.notes === "string" ? t.notes : "";
    if (typeof t.activated === "boolean") {
      e.activated = t.activated;
    } else {
      e.activated = !!(
        e.level ||
        e.activatedAt.trim() ||
        e.criteria.length ||
        e.notes.trim()
      );
    }
    return e;
  }
  const legacy = traumaLevelFromStorage(o.traumaLevel);
  if (legacy) {
    return {
      ...e,
      activated: true,
      level: legacy,
    };
  }
  return e;
}

/** Concise preview lines (French) when `traumaActivation.activated` — for triage résumé / état initial. */
export function traumaActivationPreviewLinesFrench(ta: ErTraumaActivationForm): string[] {
  if (!ta.activated) return [];
  const lines: string[] = [];
  const level = ta.level ? traumaLevelFrShort(ta.level) : null;
  if (level) lines.push(`Trauma activé : ${level}`);
  else lines.push("Trauma activé");
  if (ta.activatedAt) {
    const d = new Date(ta.activatedAt);
    if (!Number.isNaN(d.getTime())) {
      lines.push(`Heure d'activation : ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`);
    }
  }
  if (ta.criteria.length) {
    const labels = ta.criteria.map((id) => traumaActivationCriterionLabelFr(id).toLowerCase());
    lines.push(`Critères : ${labels.join(", ")}`);
  }
  if (ta.notes.trim()) {
    lines.push(`Notes : ${ta.notes.trim()}`);
  }
  return lines;
}

function traumaLevelFrShort(v: ErTraumaLevel): string | null {
  if (v === "LEVEL_1") return "Niveau 1";
  if (v === "LEVEL_2") return "Niveau 2";
  if (v === "LEVEL_3") return "Niveau 3";
  if (v === "LEVEL_4") return "Niveau 4";
  return null;
}

/** Load ER V1 form fields from GET vitalsJson (unknown keys inside medoraErTriageV1 are ignored for form). */
export function erTriageV1FormFromVitalsJson(vitalsJson: unknown): ErTriageV1Form {
  const o = extractMedoraObject(vitalsJson);
  const e = emptyErTriageV1Form();
  if (!o) return e;

  const g = (k: keyof ErTriageV1Form): unknown => o[k as string];

  return {
    ...e,
    triageNarrative: stringFromStorage(g("triageNarrative")),
    ppeNote: stringFromStorage(g("ppeNote")),
    airway: abcFromStorage(g("airway")),
    breathing: abcFromStorage(g("breathing")),
    circulation: abcFromStorage(g("circulation")),
    gcs15: ynuFromStorage(g("gcs15")),
    triageExceptionsNote: stringFromStorage(g("triageExceptionsNote")),
    painScale0to10: (() => {
      const p = g("painScale0to10");
      if (typeof p === "number" && !Number.isNaN(p)) return String(Math.min(10, Math.max(0, p)));
      const s = stringFromStorage(p);
      return s;
    })(),
    referralSource: stringFromStorage(g("referralSource")),
    triageStartedAt: (() => {
      const t = g("triageStartedAt");
      if (typeof t !== "string" || !t) return "";
      try {
        return new Date(t).toISOString().slice(0, 16);
      } catch {
        return "";
      }
    })(),
    traumaActivation: traumaActivationFromMedoraObject(o),

    nursingCareNote: stringFromStorage(g("nursingCareNote")),
    callLightInReach: ynuFromStorage(g("callLightInReach")),
    bedLockedLow: ynuFromStorage(g("bedLockedLow")),
    familyAtBedside: ynuFromStorage(g("familyAtBedside")),
    inViewOfNursingStation: ynuFromStorage(g("inViewOfNursingStation")),
    patientUpdatedOnPlan: ynuFromStorage(g("patientUpdatedOnPlan")),
    comfortMeasuresProvided: ynuFromStorage(g("comfortMeasuresProvided")),
    edCoursePpeNote: stringFromStorage(g("edCoursePpeNote")),
    nursingNotesAddendum: stringFromStorage(g("nursingNotesAddendum")),
    feelsSafeAtHome: ynuFromStorage(g("feelsSafeAtHome")),
    travelOutsideCountry14d: ynuFromStorage(g("travelOutsideCountry14d")),

    medicationsSummary: stringFromStorage(g("medicationsSummary")),
    medicationAllergiesDetail: stringFromStorage(g("medicationAllergiesDetail")),
    foodAllergiesDetail: stringFromStorage(g("foodAllergiesDetail")),
    additionalAllergyInfo: stringFromStorage(g("additionalAllergyInfo")),
    preferredPharmacy: stringFromStorage(g("preferredPharmacy")),
    immunizationStatusNote: stringFromStorage(g("immunizationStatusNote")),

    pastMedicalHistory: stringFromStorage(g("pastMedicalHistory")),
    pastSurgicalHistory: stringFromStorage(g("pastSurgicalHistory")),
    familyHistory: stringFromStorage(g("familyHistory")),
    smokingStatus: stringFromStorage(g("smokingStatus")),
    alcoholUse: stringFromStorage(g("alcoholUse")),
    marijuanaUse: stringFromStorage(g("marijuanaUse")),
    stimulantUse: stringFromStorage(g("stimulantUse")),
    opioidHeroinUse: stringFromStorage(g("opioidHeroinUse")),
    historySocialComments: stringFromStorage(g("historySocialComments")),
  };
}

type ErTriageV1FlatKey = Exclude<keyof ErTriageV1Form, "traumaActivation">;

const FLAT_FORM_KEYS: ErTriageV1FlatKey[] = [
  "triageNarrative",
  "ppeNote",
  "airway",
  "breathing",
  "circulation",
  "gcs15",
  "triageExceptionsNote",
  "painScale0to10",
  "referralSource",
  "triageStartedAt",
  "nursingCareNote",
  "callLightInReach",
  "bedLockedLow",
  "familyAtBedside",
  "inViewOfNursingStation",
  "patientUpdatedOnPlan",
  "comfortMeasuresProvided",
  "edCoursePpeNote",
  "nursingNotesAddendum",
  "feelsSafeAtHome",
  "travelOutsideCountry14d",
  "medicationsSummary",
  "medicationAllergiesDetail",
  "foodAllergiesDetail",
  "additionalAllergyInfo",
  "preferredPharmacy",
  "immunizationStatusNote",
  "pastMedicalHistory",
  "pastSurgicalHistory",
  "familyHistory",
  "smokingStatus",
  "alcoholUse",
  "marijuanaUse",
  "stimulantUse",
  "opioidHeroinUse",
  "historySocialComments",
];

function valueForStorageFlat(key: ErTriageV1FlatKey, form: ErTriageV1Form): unknown | undefined {
  const raw = form[key];
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  if (t === "") return undefined;

  if (key === "painScale0to10") {
    const n = parseInt(t, 10);
    if (Number.isNaN(n)) return undefined;
    return Math.min(10, Math.max(0, n));
  }
  if (key === "triageStartedAt") {
    try {
      return new Date(t).toISOString();
    } catch {
      return undefined;
    }
  }
  if (key === "airway" || key === "breathing" || key === "circulation") {
    if (t === "wnl" || t === "yes" || t === "no" || t === "unknown") return t;
    return undefined;
  }
  if (
    key === "gcs15" ||
    key === "callLightInReach" ||
    key === "bedLockedLow" ||
    key === "familyAtBedside" ||
    key === "inViewOfNursingStation" ||
    key === "patientUpdatedOnPlan" ||
    key === "comfortMeasuresProvided" ||
    key === "feelsSafeAtHome" ||
    key === "travelOutsideCountry14d"
  ) {
    if (t === "yes" || t === "no" || t === "unknown") return t;
    return undefined;
  }
  return t.slice(0, 8000);
}

function traumaActivationStorageObject(
  previousTraumaRaw: unknown,
  form: ErTraumaActivationForm
): Record<string, unknown> | null {
  if (!form.activated) {
    return null;
  }
  const prev =
    previousTraumaRaw != null && typeof previousTraumaRaw === "object" && !Array.isArray(previousTraumaRaw)
      ? { ...(previousTraumaRaw as Record<string, unknown>) }
      : {};
  const out: Record<string, unknown> = { ...prev };
  out.activated = true;

  const lvl = form.level;
  if (lvl === "LEVEL_1" || lvl === "LEVEL_2" || lvl === "LEVEL_3" || lvl === "LEVEL_4") {
    out.level = lvl;
  } else {
    delete out.level;
  }

  if (form.activatedAt.trim()) {
    try {
      out.activatedAt = new Date(form.activatedAt.trim()).toISOString();
    } catch {
      delete out.activatedAt;
    }
  } else {
    delete out.activatedAt;
  }

  const crit = [...new Set(form.criteria)].filter((c) => CRITERION_ID_SET.has(c));
  if (crit.length) out.criteria = crit;
  else delete out.criteria;

  const notes = form.notes.trim();
  if (notes) out.notes = notes.slice(0, 4000);
  else delete out.notes;

  return out;
}

/**
 * Merges form into previous `medoraErTriageV1` object; unknown keys from previous are kept
 * unless overwritten by a known key with a new value.
 */
export function mergeMedoraErTriageV1Blob(previousVitalsJson: unknown, form: ErTriageV1Form): Record<string, unknown> | null {
  const prev = extractMedoraObject(previousVitalsJson);
  const merged: Record<string, unknown> = { ...(prev || {}) };

  for (const key of FLAT_FORM_KEYS) {
    const v = valueForStorageFlat(key, form);
    if (v === undefined) {
      delete merged[key as string];
    } else {
      merged[key as string] = v;
    }
  }

  const prevTa = merged.traumaActivation;
  const taStored = traumaActivationStorageObject(prevTa, form.traumaActivation);
  delete merged.traumaLevel;
  if (taStored === null) {
    delete merged.traumaActivation;
  } else {
    merged.traumaActivation = taStored;
  }

  return Object.keys(merged).length > 0 ? merged : null;
}

function traumaActivationHasAnyContent(ta: ErTraumaActivationForm): boolean {
  return (
    ta.activated ||
    ta.level !== "" ||
    ta.activatedAt.trim() !== "" ||
    ta.criteria.length > 0 ||
    ta.notes.trim() !== ""
  );
}

/** True if any known V1 field is non-empty in the form (for badges / summary). */
export function erTriageV1FormHasAnyContent(form: ErTriageV1Form): boolean {
  if (traumaActivationHasAnyContent(form.traumaActivation)) return true;
  return FLAT_FORM_KEYS.some((k) => !isEmptyString(form[k]));
}
