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

/** Stable criterion ids — labels from i18n (`erTriage.v1.traumaCriteria*`). */
export const ER_TRAUMA_ACTIVATION_CRITERIA_IDS: readonly ErTraumaActivationCriterionId[] = [
  "hypotension",
  "respiratory_distress",
  "neuro_alteration",
  "major_fall",
  "high_energy_mechanism",
  "penetrating_wound",
  "amputation_crush",
  "other_major",
] as const;

const CRITERION_ID_SET = new Set<string>(ER_TRAUMA_ACTIVATION_CRITERIA_IDS);

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
  /** Glasgow eye (1–4), verbal (1–5), motor (1–6); empty until scored. */
  gcsEye: string;
  gcsVerbal: string;
  gcsMotor: string;
  /** Sum 3–15 when all components set; kept in sync in UI. */
  gcsTotal: string;
  /** Synced from components when triad complete; legacy-only when components absent. */
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

  /** Optional structured quick-picks (stable codes); parallel to free-text fields below. */
  sourceRoutingSelections: string[];
  ppeSelections: string[];
  socialHistorySelections: string[];
  medicationSummarySelections: string[];
  allergyDetailSelections: string[];
  nursingCareSelections: string[];
};

/**
 * Triage V1 nursing-care fields stored under `vitalsJson.medoraErTriageV1` — edited from the
 * nursing reassessment panel as well as triage (same JSON keys; no migration).
 */
export type ErTriageV1NursingCarePersistSlice = Pick<
  ErTriageV1Form,
  | "nursingCareNote"
  | "nursingCareSelections"
  | "callLightInReach"
  | "bedLockedLow"
  | "familyAtBedside"
  | "inViewOfNursingStation"
  | "patientUpdatedOnPlan"
  | "comfortMeasuresProvided"
  | "edCoursePpeNote"
  | "nursingNotesAddendum"
>;

export function emptyErTriageV1NursingCarePersistSlice(): ErTriageV1NursingCarePersistSlice {
  return {
    nursingCareNote: "",
    nursingCareSelections: [],
    callLightInReach: "",
    bedLockedLow: "",
    familyAtBedside: "",
    inViewOfNursingStation: "",
    patientUpdatedOnPlan: "",
    comfortMeasuresProvided: "",
    edCoursePpeNote: "",
    nursingNotesAddendum: "",
  };
}

export function emptyErTriageV1Form(): ErTriageV1Form {
  return {
    triageNarrative: "",
    ppeNote: "",
    airway: "",
    breathing: "",
    circulation: "",
    gcsEye: "",
    gcsVerbal: "",
    gcsMotor: "",
    gcsTotal: "",
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

    sourceRoutingSelections: [],
    ppeSelections: [],
    socialHistorySelections: [],
    medicationSummarySelections: [],
    allergyDetailSelections: [],
    nursingCareSelections: [],
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

/** Parse GCS subscore from JSON (number or string); returns "" if invalid. */
export function gcsSubscoreFromStorage(v: unknown, max: number): string {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : parseInt(stringFromStorage(v), 10);
  if (Number.isNaN(n) || n < 1 || n > max) return "";
  return String(n);
}

/**
 * After changing eye / verbal / motor: compute total + sync gcs15 when triad is complete;
 * when incomplete, clear total and gcs15 (do not infer "no" from missing data).
 */
export function nextGcsStateAfterComponentChange(
  prev: ErTriageV1Form,
  field: "gcsEye" | "gcsVerbal" | "gcsMotor",
  rawValue: string
): Partial<ErTriageV1Form> {
  const next: ErTriageV1Form = { ...prev, [field]: rawValue };
  const e = next.gcsEye.trim();
  const ve = next.gcsVerbal.trim();
  const m = next.gcsMotor.trim();
  const ne = parseInt(e, 10);
  const nv = parseInt(ve, 10);
  const nm = parseInt(m, 10);
  const triadComplete =
    !Number.isNaN(ne) &&
    !Number.isNaN(nv) &&
    !Number.isNaN(nm) &&
    ne >= 1 &&
    ne <= 4 &&
    nv >= 1 &&
    nv <= 5 &&
    nm >= 1 &&
    nm <= 6;
  if (!triadComplete) {
    return { [field]: rawValue, gcsTotal: "", gcs15: "" };
  }
  const sum = ne + nv + nm;
  if (sum < 3 || sum > 15) {
    return { [field]: rawValue, gcsTotal: "", gcs15: "" };
  }
  return {
    [field]: rawValue,
    gcsTotal: String(sum),
    gcs15: sum === 15 ? "yes" : "no",
  };
}

/**
 * Quick-chip helper: set field when empty; otherwise append ", value" if that exact fragment
 * is not already present (substring check on trimmed current). Does not replace nurse text.
 */
export function appendIfNotPresent(current: string, value: string): string {
  const fragment = value.trim();
  if (!fragment) return current;
  const trimmed = current.trim();
  if (!trimmed) return fragment;
  if (trimmed.includes(fragment)) return current;
  return `${trimmed}, ${fragment}`;
}

/** Stable codes + `erTriage.v1.${i18nKey}` labels for routing quick-picks. */
export const ER_TRIAGE_ROUTING_CHIP_DEFS = [
  { code: "SELF", i18nKey: "chipsRoutingSelf" },
  { code: "AMBULANCE", i18nKey: "chipsRoutingAmbulance" },
  { code: "WALK_IN", i18nKey: "chipsRoutingWalkIn" },
  { code: "TRANSFER", i18nKey: "chipsRoutingTransfer" },
  { code: "OTHER", i18nKey: "chipsRoutingOther" },
] as const;

/** PPE quick-picks (parallel to `ppeNote`). */
export const ER_TRIAGE_PPE_CHIP_DEFS = [
  { code: "MASK", i18nKey: "chipsPpeMask" },
  { code: "GLOVES", i18nKey: "chipsPpeGloves" },
  { code: "ISOLATION", i18nKey: "chipsPpeIsolation" },
  { code: "CONTACT", i18nKey: "chipsPpeContact" },
  { code: "AIRBORNE", i18nKey: "chipsPpeAirborne" },
] as const;

/** Social / substance quick-picks (parallel to `historySocialComments`). */
export const ER_TRIAGE_SOCIAL_CHIP_DEFS = [
  { code: "SMOKER", i18nKey: "chipsSocialSmoker" },
  { code: "FORMER_SMOKER", i18nKey: "chipsSocialFormerSmoker" },
  { code: "ALCOHOL_USE", i18nKey: "chipsSocialAlcohol" },
  { code: "CANNABIS_USE", i18nKey: "chipsSocialCannabis" },
  { code: "OPIOID_USE", i18nKey: "chipsSocialOpioid" },
  { code: "STIMULANT_USE", i18nKey: "chipsSocialStimulant" },
] as const;

export const ER_TRIAGE_MEDS_CHIP_DEFS = [
  { code: "NO_MEDICATIONS", i18nKey: "chipsMedsNone" },
  { code: "UNKNOWN_MEDICATIONS", i18nKey: "chipsMedsUnknown" },
  { code: "POLYPHARMACY", i18nKey: "chipsMedsPolypharmacy" },
] as const;

export const ER_TRIAGE_ALLERGY_CHIP_DEFS = [
  { code: "NKDA", i18nKey: "chipsAllergyNkda" },
  { code: "FOOD_ALLERGY", i18nKey: "chipsAllergyFood" },
  { code: "DRUG_ALLERGY", i18nKey: "chipsAllergyDrug" },
  { code: "LATEX_ALLERGY", i18nKey: "chipsAllergyLatex" },
] as const;

export const ER_TRIAGE_NURSING_CHIP_DEFS = [
  { code: "CONTINUOUS_MONITORING", i18nKey: "chipsNursingContinuousMonitor" },
  { code: "CARDIAC_MONITOR", i18nKey: "chipsNursingCardiacMonitor" },
  { code: "OXYGEN_THERAPY", i18nKey: "chipsNursingOxygen" },
  { code: "IV_ACCESS_ESTABLISHED", i18nKey: "chipsNursingIvAccess" },
] as const;

const SOURCE_ROUTING_CODE_SET = new Set<string>(ER_TRIAGE_ROUTING_CHIP_DEFS.map((d) => d.code));
const PPE_SELECTION_CODE_SET = new Set<string>(ER_TRIAGE_PPE_CHIP_DEFS.map((d) => d.code));
const SOCIAL_HISTORY_CODE_SET = new Set<string>(ER_TRIAGE_SOCIAL_CHIP_DEFS.map((d) => d.code));
const MED_SUMMARY_CODE_SET = new Set<string>(ER_TRIAGE_MEDS_CHIP_DEFS.map((d) => d.code));
const ALLERGY_DETAIL_CODE_SET = new Set<string>(ER_TRIAGE_ALLERGY_CHIP_DEFS.map((d) => d.code));
const NURSING_CARE_CODE_SET = new Set<string>(ER_TRIAGE_NURSING_CHIP_DEFS.map((d) => d.code));

function selectionCodesFromStorage(raw: unknown, allowed: Set<string>): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== "string") continue;
    const c = x.trim();
    if (!c || !allowed.has(c) || seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}

function selectionCodesForMerge(values: string[], allowed: Set<string>): string[] {
  return selectionCodesFromStorage(values, allowed);
}

function applyStructuredSelectionsToMerged(merged: Record<string, unknown>, form: ErTriageV1Form): void {
  const sr = selectionCodesForMerge(form.sourceRoutingSelections, SOURCE_ROUTING_CODE_SET);
  if (sr.length) merged.sourceRoutingSelections = sr;
  else delete merged.sourceRoutingSelections;

  const pe = selectionCodesForMerge(form.ppeSelections, PPE_SELECTION_CODE_SET);
  if (pe.length) merged.ppeSelections = pe;
  else delete merged.ppeSelections;

  const sh = selectionCodesForMerge(form.socialHistorySelections, SOCIAL_HISTORY_CODE_SET);
  if (sh.length) merged.socialHistorySelections = sh;
  else delete merged.socialHistorySelections;

  const ms = selectionCodesForMerge(form.medicationSummarySelections, MED_SUMMARY_CODE_SET);
  if (ms.length) merged.medicationSummarySelections = ms;
  else delete merged.medicationSummarySelections;

  const ad = selectionCodesForMerge(form.allergyDetailSelections, ALLERGY_DETAIL_CODE_SET);
  if (ad.length) merged.allergyDetailSelections = ad;
  else delete merged.allergyDetailSelections;

  const nc = selectionCodesForMerge(form.nursingCareSelections, NURSING_CARE_CODE_SET);
  if (nc.length) merged.nursingCareSelections = nc;
  else delete merged.nursingCareSelections;
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
    gcsEye: gcsSubscoreFromStorage(g("gcsEye"), 4),
    gcsVerbal: gcsSubscoreFromStorage(g("gcsVerbal"), 5),
    gcsMotor: gcsSubscoreFromStorage(g("gcsMotor"), 6),
    ...(() => {
      const eye = gcsSubscoreFromStorage(g("gcsEye"), 4);
      const verbal = gcsSubscoreFromStorage(g("gcsVerbal"), 5);
      const motor = gcsSubscoreFromStorage(g("gcsMotor"), 6);
      if (eye && verbal && motor) {
        const sum = parseInt(eye, 10) + parseInt(verbal, 10) + parseInt(motor, 10);
        if (sum >= 3 && sum <= 15) {
          return {
            gcsTotal: String(sum),
            gcs15: (sum === 15 ? "yes" : "no") as ErYesNoUnknown,
          };
        }
      }
      return {
        gcsTotal: "",
        gcs15: ynuFromStorage(g("gcs15")),
      };
    })(),
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

    sourceRoutingSelections: selectionCodesFromStorage(g("sourceRoutingSelections"), SOURCE_ROUTING_CODE_SET),
    ppeSelections: selectionCodesFromStorage(g("ppeSelections"), PPE_SELECTION_CODE_SET),
    socialHistorySelections: selectionCodesFromStorage(g("socialHistorySelections"), SOCIAL_HISTORY_CODE_SET),
    medicationSummarySelections: selectionCodesFromStorage(
      g("medicationSummarySelections"),
      MED_SUMMARY_CODE_SET
    ),
    allergyDetailSelections: selectionCodesFromStorage(g("allergyDetailSelections"), ALLERGY_DETAIL_CODE_SET),
    nursingCareSelections: selectionCodesFromStorage(g("nursingCareSelections"), NURSING_CARE_CODE_SET),
  };
}

export function erTriageNursingCareSliceFromVitalsJson(vitalsJson: unknown): ErTriageV1NursingCarePersistSlice {
  const er = erTriageV1FormFromVitalsJson(vitalsJson);
  return {
    nursingCareNote: er.nursingCareNote,
    nursingCareSelections: [...er.nursingCareSelections],
    callLightInReach: er.callLightInReach,
    bedLockedLow: er.bedLockedLow,
    familyAtBedside: er.familyAtBedside,
    inViewOfNursingStation: er.inViewOfNursingStation,
    patientUpdatedOnPlan: er.patientUpdatedOnPlan,
    comfortMeasuresProvided: er.comfortMeasuresProvided,
    edCoursePpeNote: er.edCoursePpeNote,
    nursingNotesAddendum: er.nursingNotesAddendum,
  };
}

export type ErTriageV1StructuredSelectionKey =
  | "sourceRoutingSelections"
  | "ppeSelections"
  | "socialHistorySelections"
  | "medicationSummarySelections"
  | "allergyDetailSelections"
  | "nursingCareSelections";

type ErTriageV1FlatKey = Exclude<keyof ErTriageV1Form, "traumaActivation" | ErTriageV1StructuredSelectionKey>;

const FLAT_FORM_KEYS: ErTriageV1FlatKey[] = [
  "triageNarrative",
  "ppeNote",
  "airway",
  "breathing",
  "circulation",
  "gcsEye",
  "gcsVerbal",
  "gcsMotor",
  "gcsTotal",
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
  if (key === "gcsEye") {
    const n = parseInt(t, 10);
    if (!Number.isNaN(n) && n >= 1 && n <= 4) return n;
    return undefined;
  }
  if (key === "gcsVerbal") {
    const n = parseInt(t, 10);
    if (!Number.isNaN(n) && n >= 1 && n <= 5) return n;
    return undefined;
  }
  if (key === "gcsMotor") {
    const n = parseInt(t, 10);
    if (!Number.isNaN(n) && n >= 1 && n <= 6) return n;
    return undefined;
  }
  if (key === "gcsTotal") {
    const n = parseInt(t, 10);
    if (!Number.isNaN(n) && n >= 3 && n <= 15) return n;
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

  applyStructuredSelectionsToMerged(merged, form);

  return Object.keys(merged).length > 0 ? merged : null;
}

/**
 * Updates only `medoraErTriageV1` inside `vitalsJson`, preserving all other vitals keys and
 * unknown keys inside the ER V1 blob. Use when PATCHing triage from contexts that do not hold
 * the full triage form (e.g. nursing reassessment).
 */
export function patchMedoraErTriageV1FieldsInVitalsJson(
  previousVitalsJson: unknown,
  erPatch: Partial<ErTriageV1Form>
): Record<string, unknown> | null {
  const prevForm = erTriageV1FormFromVitalsJson(previousVitalsJson);
  const nextForm: ErTriageV1Form = { ...prevForm, ...erPatch };
  const base =
    previousVitalsJson && typeof previousVitalsJson === "object" && !Array.isArray(previousVitalsJson)
      ? { ...(previousVitalsJson as Record<string, unknown>) }
      : {};
  const erBlob = mergeMedoraErTriageV1Blob(previousVitalsJson, nextForm);
  if (erBlob) base[MEDORA_ER_TRIAGE_V1_KEY] = erBlob;
  else delete base[MEDORA_ER_TRIAGE_V1_KEY];
  return Object.keys(base).length > 0 ? base : null;
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

const STRUCTURED_SELECTION_KEYS: ErTriageV1StructuredSelectionKey[] = [
  "sourceRoutingSelections",
  "ppeSelections",
  "socialHistorySelections",
  "medicationSummarySelections",
  "allergyDetailSelections",
  "nursingCareSelections",
];

/** True if any known V1 field is non-empty in the form (for badges / summary). */
export function erTriageV1FormHasAnyContent(form: ErTriageV1Form): boolean {
  if (traumaActivationHasAnyContent(form.traumaActivation)) return true;
  if (FLAT_FORM_KEYS.some((k) => !isEmptyString(form[k]))) return true;
  return STRUCTURED_SELECTION_KEYS.some((k) => form[k].length > 0);
}

/** ER trauma protocol assist (orders panel): visible only for EMERGENCY + trauma activation on triage. */
export function erTraumaProtocolAssistContext(
  encounterType: string | null | undefined,
  vitalsJson: unknown
): { visible: boolean; traumaLevel: ErTraumaLevel } {
  if (encounterType !== "EMERGENCY") return { visible: false, traumaLevel: "" };
  const er = erTriageV1FormFromVitalsJson(vitalsJson);
  if (!er.traumaActivation.activated) return { visible: false, traumaLevel: "" };
  return { visible: true, traumaLevel: er.traumaActivation.level };
}
