/**
 * ER Triage V1 extension stored inside `Triage.vitalsJson` under key `medoraErTriageV1`.
 * No backend migration — uses existing Json column. Preserves unknown keys on merge.
 */

export const MEDORA_ER_TRIAGE_V1_KEY = "medoraErTriageV1" as const;

/** ABC-style triage assessment options. */
export type ErAbcOption = "" | "wnl" | "yes" | "no" | "unknown";

/** Yes / no / unknown (incl. sécurité). */
export type ErYesNoUnknown = "" | "yes" | "no" | "unknown";

/** Trauma center / activation level (optional). */
export type ErTraumaLevel = "" | "LEVEL_1" | "LEVEL_2" | "LEVEL_3" | "LEVEL_4";

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
  traumaLevel: ErTraumaLevel;

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
    traumaLevel: "",

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
    traumaLevel: traumaLevelFromStorage(g("traumaLevel")),

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

const KNOWN_KEYS: (keyof ErTriageV1Form)[] = [
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
  "traumaLevel",
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

function valueForStorage(key: keyof ErTriageV1Form, form: ErTriageV1Form): unknown | undefined {
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
  if (key === "traumaLevel") {
    if (t === "LEVEL_1" || t === "LEVEL_2" || t === "LEVEL_3" || t === "LEVEL_4") return t;
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

/**
 * Merges form into previous `medoraErTriageV1` object; unknown keys from previous are kept
 * unless overwritten by a known key with a new value.
 */
export function mergeMedoraErTriageV1Blob(
  previousVitalsJson: unknown,
  form: ErTriageV1Form
): Record<string, unknown> | null {
  const prev = extractMedoraObject(previousVitalsJson);
  const merged: Record<string, unknown> = { ...(prev || {}) };

  for (const key of KNOWN_KEYS) {
    const v = valueForStorage(key, form);
    if (v === undefined) {
      delete merged[key as string];
    } else {
      merged[key as string] = v;
    }
  }

  return Object.keys(merged).length > 0 ? merged : null;
}

/** True if any known V1 field is non-empty in the form (for badges / summary). */
export function erTriageV1FormHasAnyContent(form: ErTriageV1Form): boolean {
  return KNOWN_KEYS.some((k) => !isEmptyString(form[k]));
}
