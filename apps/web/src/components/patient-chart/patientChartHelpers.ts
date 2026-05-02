import type { SupportedLanguage } from "@/i18n/config";
import { nursingProcedureSummaryLinesForLocale } from "@/lib/nursingProcedures";

/** Libellés des sections d’évaluation infirmière (`nursingEvalV1.sections`) — aligné sur `NursingAssessmentTab`. */
export const NURSING_ASSESSMENT_SECTION_LABELS_FR: Record<string, string> = {
  etatGeneral: "État général",
  neurologique: "Neurologique",
  respiratoire: "Respiratoire",
  cardiaque: "Cardiaque",
  cardiovasculaire: "Cardiaque",
  digestif: "Digestif",
  gastro: "Digestif",
  genito: "Génito-urinaire",
  musculo: "Musculo-squelettique",
  peau: "Peau / plaies",
  douleur: "Douleur",
  securite: "Risques / sécurité",
  observationsInfirmieres: "Observations infirmières",
  interventionsInfirmieres: "Interventions infirmières",
  notesInfirmieresLibres: "Note infirmière, autres",
  notesInfirmieres: "Observations infirmières",
};

const NURSING_ASSESSMENT_SECTION_LABELS_EN: Record<string, string> = {
  etatGeneral: "General appearance",
  neurologique: "Neurological",
  respiratoire: "Respiratory",
  cardiaque: "Cardiac",
  cardiovasculaire: "Cardiac",
  digestif: "Gastrointestinal",
  gastro: "Gastrointestinal",
  genito: "Genitourinary",
  musculo: "Musculoskeletal",
  peau: "Skin / wounds",
  douleur: "Pain",
  securite: "Safety / risks",
  observationsInfirmieres: "Nursing observations",
  interventionsInfirmieres: "Nursing interventions",
  notesInfirmieresLibres: "Other nursing notes",
  notesInfirmieres: "Nursing observations",
};

function nursingSectionLabelForKey(
  k: string,
  language: SupportedLanguage
): string {
  if (language === "en") {
    return NURSING_ASSESSMENT_SECTION_LABELS_EN[k] ?? NURSING_ASSESSMENT_SECTION_LABELS_FR[k] ?? k;
  }
  return NURSING_ASSESSMENT_SECTION_LABELS_FR[k] ?? k;
}

/** Sections remplies pour affichage dossier / timeline (pas de bloc vide). */
export function parseNursingAssessmentSectionsForChart(
  raw: unknown,
  language: SupportedLanguage = "fr"
): { label: string; text: string }[] {
  if (!raw || typeof raw !== "object") return [];
  const o = raw as Record<string, unknown>;
  const inner = o.nursingEvalV1;
  if (!inner || typeof inner !== "object") return [];
  const sections = (inner as Record<string, unknown>).sections;
  if (!sections || typeof sections !== "object") return [];
  const out: { label: string; text: string }[] = [];
  for (const [k, v] of Object.entries(sections)) {
    if (v && typeof v === "object" && "text" in v && typeof (v as { text: unknown }).text === "string") {
      const text = (v as { text: string }).text.trim();
      if (!text) continue;
      const label = nursingSectionLabelForKey(k, language);
      out.push({ label, text });
    }
  }
  return out;
}

/** Ligne de signature infirmière si enregistrée (`nursingEvalV1.signature`) — French UI. */
export function nursingAssessmentSignatureLineFr(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const inner = o.nursingEvalV1;
  if (!inner || typeof inner !== "object") return null;
  const sig = (inner as Record<string, unknown>).signature;
  if (!sig || typeof sig !== "object") return null;
  const name = (sig as Record<string, unknown>).savedByDisplayName;
  const at = (sig as Record<string, unknown>).savedAt;
  if (typeof name !== "string" || !name.trim()) return null;
  const dt =
    typeof at === "string"
      ? new Date(at).toLocaleString("fr-FR")
      : "—";
  return `Saisi par ${name.trim()} le ${dt}`;
}

/**
 * Signature line for nursing assessment when saved — uses facility language for template and date format.
 */
export function nursingAssessmentSignatureForLocale(
  raw: unknown,
  language: SupportedLanguage,
  t: (key: string) => string
): string | null {
  if (language === "fr") {
    return nursingAssessmentSignatureLineFr(raw);
  }
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const inner = o.nursingEvalV1;
  if (!inner || typeof inner !== "object") return null;
  const sig = (inner as Record<string, unknown>).signature;
  if (!sig || typeof sig !== "object") return null;
  const name = (sig as Record<string, unknown>).savedByDisplayName;
  const at = (sig as Record<string, unknown>).savedAt;
  if (typeof name !== "string" || !name.trim()) return null;
  const dt =
    typeof at === "string"
      ? new Date(at).toLocaleString("en-US")
      : "—";
  return t("encounterChrome.chartTabs.nursingSignature")
    .replace("{name}", name.trim())
    .replace("{datetime}", dt);
}

/** Résumé court infirmier (lignes pré-calculées ou dérivées des sections). */
export function nursingAssessmentDisplayLines(
  raw: unknown,
  language: SupportedLanguage = "fr"
): string[] {
  if (!raw || typeof raw !== "object") return [];
  const o = raw as Record<string, unknown>;
  const inner = o.nursingEvalV1;
  let base: string[] = [];
  if (inner && typeof inner === "object") {
    const sl = (inner as Record<string, unknown>).summaryLinesFr;
    if (Array.isArray(sl)) {
      const lines = sl.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
      if (lines.length) base = [...lines];
    }
  }
  if (base.length === 0) {
    const sep = language === "en" ? ": " : " : ";
    base = parseNursingAssessmentSectionsForChart(raw, language).map(
      (s) => `${s.label}${sep}${s.text}`
    );
  }
  const proc = nursingProcedureSummaryLinesForLocale(raw, language);
  if (proc.length === 0) return base;
  return [...base, ...proc];
}

const PHYSICIAN_EVAL_LABELS: Record<SupportedLanguage, Record<string, string>> = {
  fr: {
    hpi: "HPI",
    ros: "ROS",
    physicalExam: "Examen physique",
    mdm: "MDM",
  },
  en: {
    hpi: "HPI",
    ros: "ROS",
    physicalExam: "Physical exam",
    mdm: "MDM",
  },
};

/** Champs non vides de `nursingAssessment.physicianEvalV1` pour affichage résumé / timeline. */
export function parsePhysicianEvalV1ForChart(
  raw: unknown,
  language: SupportedLanguage = "fr"
): { label: string; text: string }[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const o = raw as Record<string, unknown>;
  const pe = o.physicianEvalV1;
  if (!pe || typeof pe !== "object" || Array.isArray(pe)) return [];
  const p = pe as Record<string, unknown>;
  const keys = ["hpi", "ros", "physicalExam", "mdm"] as const;
  const labels = PHYSICIAN_EVAL_LABELS[language] ?? PHYSICIAN_EVAL_LABELS.fr;
  const out: { label: string; text: string }[] = [];
  for (const key of keys) {
    const v = p[key];
    if (typeof v !== "string" || !v.trim()) continue;
    out.push({ label: labels[key] ?? key, text: v.trim() });
  }
  return out;
}

/** Champs dossier de sortie historiques (V1). */
export const DISCHARGE_SUMMARY_CORE_STRING_KEYS = [
  "disposition",
  "exitCondition",
  "dischargeInstructions",
  "medicationsGiven",
  "followUp",
  "returnIfWorse",
  "patientDestination",
  "dischargeMode",
] as const;

/** S16A — instructions patient structurées (même JSON `dischargeSummaryJson`). */
export const PATIENT_DISCHARGE_INSTRUCTION_STRING_KEYS = [
  "dischargeDiagnosisSummary",
  "medicationInstructions",
  "returnPrecautions",
  "followUpInstructions",
  "activityInstructions",
  "woundCareInstructions",
  "workSchoolNote",
] as const;

export type DischargeSummaryFieldsFr = {
  disposition?: string;
  exitCondition?: string;
  dischargeInstructions?: string;
  medicationsGiven?: string;
  followUp?: string;
  returnIfWorse?: string;
  patientDestination?: string;
  dischargeMode?: string;
  dischargeDiagnosisSummary?: string;
  medicationInstructions?: string;
  returnPrecautions?: string;
  followUpInstructions?: string;
  activityInstructions?: string;
  woundCareInstructions?: string;
  workSchoolNote?: string;
  patientInstructionsGiven?: boolean;
  instructionsGivenBy?: string;
  instructionsGivenAt?: string;
};

/** Résumé de sortie structuré ; `null` si aucun champ renseigné. */
export function parseDischargeSummaryForChart(raw: unknown): DischargeSummaryFieldsFr | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const out: DischargeSummaryFieldsFr = {};
  let any = false;
  for (const k of DISCHARGE_SUMMARY_CORE_STRING_KEYS) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) {
      (out as Record<string, string>)[k] = v.trim();
      any = true;
    }
  }
  for (const k of PATIENT_DISCHARGE_INSTRUCTION_STRING_KEYS) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) {
      (out as Record<string, string>)[k] = v.trim();
      any = true;
    }
  }
  for (const k of ["instructionsGivenBy", "instructionsGivenAt"] as const) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) {
      (out as Record<string, string>)[k] = v.trim();
      any = true;
    }
  }
  const pig = o.patientInstructionsGiven;
  if (typeof pig === "boolean") {
    out.patientInstructionsGiven = pig;
    any = true;
  } else if (pig === "true" || pig === "1") {
    out.patientInstructionsGiven = true;
    any = true;
  } else if (pig === "false" || pig === "0") {
    out.patientInstructionsGiven = false;
    any = true;
  }
  return any ? out : null;
}

/** Champs alignés sur `admissionSummaryFieldsSchema` (@medora/shared). */
export type AdmissionSummaryFieldsFr = {
  admissionReason?: string;
  serviceUnit?: string;
  admissionDiagnosis?: string;
  careLevel?: string;
  conditionAtAdmission?: string;
  initialPlan?: string;
  responsiblePhysicianName?: string;
};

/** Dossier d'admission structuré ; `null` si aucun champ renseigné. */
export function parseAdmissionSummaryForChart(raw: unknown): AdmissionSummaryFieldsFr | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const keys = [
    "admissionReason",
    "serviceUnit",
    "admissionDiagnosis",
    "careLevel",
    "conditionAtAdmission",
    "initialPlan",
    "responsiblePhysicianName",
  ] as const;
  const out: AdmissionSummaryFieldsFr = {};
  let any = false;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) {
      (out as Record<string, string>)[k] = v.trim();
      any = true;
    }
  }
  return any ? out : null;
}

/** Libellé diagnostic : privilégier la description ; éviter d’afficher seul un code brut non contextualisé. */
export function diagnosisDisplayFr(description: string | null | undefined, code: string): string {
  const d = description?.trim();
  if (d) return d;
  const c = code?.trim();
  if (!c) return "—";
  return `Code ${c}`;
}

export function nirMrnDisplay(patient: {
  nationalId?: string | null;
  mrn?: string | null;
  globalMrn?: string | null;
}): string {
  const parts = [patient.nationalId, patient.mrn, patient.globalMrn].filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0
  );
  if (parts.length === 0) return "—";
  return [...new Set(parts)].join(" · ");
}
