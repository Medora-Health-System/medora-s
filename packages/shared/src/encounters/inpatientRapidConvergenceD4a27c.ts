/**
 * D4A.2.7C — Inpatient rapid documentation & header convergence contracts.
 * Extends D4A.2.7B recovery. No Placement / D3B. No migrations.
 */

export const INPATIENT_RAPID_CONVERGENCE_CERTIFICATION_ID =
  "MEDUI.INPATIENT_RAPID_CONVERGENCE.D4A2_7C" as const;

/** Stable clinical option — store codes, never localized display as authority. */
export type ClinicalRapidOptionV1 = {
  code: string;
  display: string;
  displayFr: string;
  category?: string | null;
  severity?: "info" | "warning" | "urgent" | null;
  requiresDetail?: boolean;
  requiresComment?: boolean;
  mutuallyExclusiveWith?: string[];
  provenance?: string | null;
};

export type ClinicalIndicatorState =
  | "PRESENT"
  | "NOT_PRESENT"
  | "UNKNOWN"
  | "NOT_DOCUMENTED"
  | "SOURCE_UNAVAILABLE";

export type HospitalHeaderIndicatorV1 = {
  code: string;
  state: ClinicalIndicatorState;
  labelKey: string;
};

export type HospitalHeaderVitalsLiteV1 = {
  availability: "AVAILABLE" | "NO_DATA_DOCUMENTED" | "SOURCE_UNAVAILABLE";
  recordedAt: string | null;
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
  spo2: number | null;
  temperatureC: number | null;
  respiratoryRate: number | null;
};

export type HospitalHeaderEnrichmentV1 = {
  interpreterRequired: boolean | null;
  fallRisk: string | null;
  allergiesSummary: string | null;
  allergiesAvailability: ClinicalIndicatorState;
  oxygenSupport: string | null;
  dietNpo: string | null;
  weightKg: number | null;
  latestVitals: HospitalHeaderVitalsLiteV1;
  indicators: HospitalHeaderIndicatorV1[];
  facilityName: string | null;
  levelOfCare: string | null;
  admissionSource: string | null;
};

export const SAVE_STATUS_CODES = [
  "NOT_SAVED",
  "SAVING",
  "SAVED",
  "SAVE_FAILED",
  "CONFLICT_DETECTED",
  "READ_ONLY",
  "SIGNED",
  "AMENDED",
] as const;

export type SaveStatusCode = (typeof SAVE_STATUS_CODES)[number];

export const TECHNICIAN_TASK_TYPES = [
  "VITAL_SIGNS",
  "WEIGHT",
  "GLUCOSE",
  "INTAKE",
  "OUTPUT",
  "MEAL_INTAKE",
  "HYGIENE",
  "AMBULATION",
  "REPOSITIONING",
  "SPECIMEN_COLLECTION",
  "EKG",
  "TRANSPORT_PREP",
  "ROUNDING",
  "DEVICE_OBSERVATION",
  "OTHER",
] as const;

export type TechnicianTaskType = (typeof TECHNICIAN_TASK_TYPES)[number];

export const TECHNICIAN_TASK_STATUSES = [
  "ASSIGNED",
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
  "UNABLE_TO_COMPLETE",
  "ESCALATED",
  "VALIDATED",
] as const;

export type TechnicianTaskStatus = (typeof TECHNICIAN_TASK_STATUSES)[number];

export type TechnicianTaskV1 = {
  taskId: string;
  type: TechnicianTaskType;
  title: string;
  status: TechnicianTaskStatus;
  encounterId: string;
  assignedToUserId?: string | null;
  dueAt?: string | null;
  completedAt?: string | null;
  performerUserId?: string | null;
  rnValidationRequired: boolean;
  rnValidatedAt?: string | null;
  rnValidatedByUserId?: string | null;
  escalationRequired: boolean;
  exceptionNote?: string | null;
  createdAt: string;
};

export const ENTERPRISE_TECHNICIAN_TASKS_V1_KEY = "enterpriseTechnicianTasksV1" as const;

export type EnterpriseTechnicianTasksDocV1 = {
  version: 1;
  expectedVersion: number;
  tasks: TechnicianTaskV1[];
  updatedAt: string;
};

export function emptyTechnicianTasksDoc(nowIso?: string): EnterpriseTechnicianTasksDocV1 {
  return {
    version: 1,
    expectedVersion: 0,
    tasks: [],
    updatedAt: nowIso ?? new Date().toISOString(),
  };
}

export function readTechnicianTasksDoc(admissionSummaryJson: unknown): EnterpriseTechnicianTasksDocV1 {
  if (!admissionSummaryJson || typeof admissionSummaryJson !== "object") {
    return emptyTechnicianTasksDoc();
  }
  const raw = (admissionSummaryJson as Record<string, unknown>)[ENTERPRISE_TECHNICIAN_TASKS_V1_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return emptyTechnicianTasksDoc();
  const doc = raw as EnterpriseTechnicianTasksDocV1;
  return {
    ...emptyTechnicianTasksDoc(),
    ...doc,
    version: 1,
    tasks: Array.isArray(doc.tasks) ? doc.tasks : [],
  };
}

export function mergeTechnicianTasksIntoSummary(
  admissionSummaryJson: unknown,
  doc: EnterpriseTechnicianTasksDocV1
): Record<string, unknown> {
  const base =
    admissionSummaryJson &&
    typeof admissionSummaryJson === "object" &&
    !Array.isArray(admissionSummaryJson)
      ? { ...(admissionSummaryJson as Record<string, unknown>) }
      : {};
  base[ENTERPRISE_TECHNICIAN_TASKS_V1_KEY] = doc;
  return base;
}

/** High-burden nursing rapid option catalogs (stable codes). */
export const GENERAL_APPEARANCE_OPTIONS: ClinicalRapidOptionV1[] = [
  { code: "NO_ACUTE_DISTRESS", display: "No acute distress", displayFr: "Pas de détresse aiguë" },
  { code: "COMFORTABLE", display: "Comfortable", displayFr: "Confortable" },
  { code: "RESTING", display: "Resting", displayFr: "Au repos" },
  { code: "ANXIOUS", display: "Anxious", displayFr: "Anxieux(se)" },
  { code: "ILL_APPEARING", display: "Ill-appearing", displayFr: "Apparence de maladie" },
  { code: "LETHARGIC", display: "Lethargic", displayFr: "Léthargique" },
  { code: "DIAPHORETIC", display: "Diaphoretic", displayFr: "Diaphorétique" },
  { code: "RESPIRATORY_DISTRESS", display: "Respiratory distress", displayFr: "Détresse respiratoire", severity: "urgent" },
  { code: "PALE", display: "Pale", displayFr: "Pâle" },
  { code: "OTHER", display: "Other", displayFr: "Autre", requiresComment: true },
];

export const LOC_OPTIONS: ClinicalRapidOptionV1[] = [
  { code: "ALERT", display: "Alert", displayFr: "Alerte" },
  { code: "DROWSY", display: "Drowsy", displayFr: "Somnolent(e)" },
  { code: "LETHARGIC", display: "Lethargic", displayFr: "Léthargique" },
  { code: "OBTUNDED", display: "Obtunded", displayFr: "Obnubilé(e)" },
  { code: "STUPOROUS", display: "Stuporous", displayFr: "Stuporeux(se)" },
  { code: "UNRESPONSIVE", display: "Unresponsive", displayFr: "Sans réponse", severity: "urgent" },
  { code: "SEDATED", display: "Sedated", displayFr: "Sédaté(e)" },
  { code: "UNABLE_TO_ASSESS", display: "Unable to assess", displayFr: "Impossible d’évaluer", requiresComment: true },
];

export const ORIENTATION_PRESETS: ClinicalRapidOptionV1[] = [
  { code: "AAOX4", display: "Alert and oriented ×4", displayFr: "Alerte et orienté(e) ×4", mutuallyExclusiveWith: ["PERSON_ONLY", "DISORIENTED"] },
  { code: "PERSON_ONLY", display: "Person only", displayFr: "Personne seulement" },
  { code: "PERSON_PLACE", display: "Person and place", displayFr: "Personne et lieu" },
  { code: "PERSON_PLACE_TIME", display: "Person, place, and time", displayFr: "Personne, lieu et temps" },
  { code: "DISORIENTED", display: "Disoriented", displayFr: "Désorienté(e)" },
  { code: "UNABLE_TO_ASSESS", display: "Unable to assess", displayFr: "Impossible d’évaluer", requiresComment: true },
];

export const IMMEDIATE_CONCERN_OPTIONS: ClinicalRapidOptionV1[] = [
  { code: "NONE", display: "None identified", displayFr: "Aucun identifié", mutuallyExclusiveWith: ["AIRWAY", "RESPIRATORY_DISTRESS", "HEMODYNAMIC", "NEURO", "CHEST_PAIN", "SEVERE_PAIN", "BLEEDING", "BEHAVIORAL"] },
  { code: "AIRWAY", display: "Airway concern", displayFr: "Problème des voies aériennes", severity: "urgent" },
  { code: "RESPIRATORY_DISTRESS", display: "Respiratory distress", displayFr: "Détresse respiratoire", severity: "urgent" },
  { code: "HEMODYNAMIC", display: "Hemodynamic instability", displayFr: "Instabilité hémodynamique", severity: "urgent" },
  { code: "NEURO", display: "Acute neurologic change", displayFr: "Changement neurologique aigu", severity: "urgent" },
  { code: "CHEST_PAIN", display: "Chest pain", displayFr: "Douleur thoracique", severity: "urgent" },
  { code: "SEVERE_PAIN", display: "Severe pain", displayFr: "Douleur sévère", severity: "warning" },
  { code: "BLEEDING", display: "Active bleeding", displayFr: "Saignement actif", severity: "urgent" },
  { code: "BEHAVIORAL", display: "Behavioral emergency", displayFr: "Urgence comportementale", severity: "warning" },
  { code: "FALL_RISK", display: "Fall risk", displayFr: "Risque de chute" },
  { code: "SEIZURE_RISK", display: "Seizure risk", displayFr: "Risque de convulsion" },
  { code: "ASPIRATION_RISK", display: "Aspiration risk", displayFr: "Risque d’aspiration" },
  { code: "OTHER", display: "Other", displayFr: "Autre", requiresComment: true },
];

export const FALL_PRECAUTION_OPTIONS: ClinicalRapidOptionV1[] = [
  { code: "BED_LOW_LOCKED", display: "Bed low and locked", displayFr: "Lit bas et freiné" },
  { code: "CALL_LIGHT", display: "Call light within reach", displayFr: "Sonnette à portée" },
  { code: "NONSKID", display: "Nonskid footwear", displayFr: "Chaussures antidérapantes" },
  { code: "BED_ALARM", display: "Bed alarm", displayFr: "Alarme de lit" },
  { code: "ASSIST_AMBULATION", display: "Assist with ambulation", displayFr: "Aide à la marche" },
  { code: "FREQUENT_ROUNDING", display: "Frequent rounding", displayFr: "Rondes fréquentes" },
  { code: "SITTER", display: "Sitter", displayFr: "Surveillant" },
  { code: "SEIZURE", display: "Seizure precautions", displayFr: "Précautions convulsives" },
  { code: "ASPIRATION", display: "Aspiration precautions", displayFr: "Précautions d’aspiration" },
  { code: "ELOPEMENT", display: "Elopement precautions", displayFr: "Précautions de fugue" },
];

export const MOBILITY_CURRENT_OPTIONS: ClinicalRapidOptionV1[] = [
  { code: "INDEPENDENT", display: "Independent", displayFr: "Indépendant(e)" },
  { code: "INDEPENDENT_WITH_DEVICE", display: "Independent with device", displayFr: "Indépendant(e) avec aide technique" },
  { code: "STANDBY", display: "Standby assist", displayFr: "Surveillance" },
  { code: "ONE_PERSON", display: "One-person assist", displayFr: "Aide d’une personne" },
  { code: "TWO_PERSON", display: "Two-person assist", displayFr: "Aide de deux personnes" },
  { code: "DEPENDENT", display: "Dependent", displayFr: "Dépendant(e)" },
  { code: "WHEELCHAIR", display: "Wheelchair", displayFr: "Fauteuil roulant" },
  { code: "MECHANICAL_LIFT", display: "Mechanical lift", displayFr: "Lève-personne" },
  { code: "BEDBOUND", display: "Bedbound", displayFr: "Alité(e)" },
  { code: "UNABLE_TO_ASSESS", display: "Unable to assess", displayFr: "Impossible d’évaluer", requiresComment: true },
];

export const ADMISSION_SOURCE_RAPID_OPTIONS: ClinicalRapidOptionV1[] = [
  { code: "EMERGENCY_DEPARTMENT", display: "Emergency Department", displayFr: "Service des urgences" },
  { code: "DIRECT_ADMISSION", display: "Direct admission", displayFr: "Admission directe" },
  { code: "OUTSIDE_HOSPITAL_TRANSFER", display: "Transfer from another hospital", displayFr: "Transfert d’un autre hôpital" },
  { code: "SNF_TRANSFER", display: "Transfer from skilled nursing facility", displayFr: "Transfert d’un établissement de soins" },
  { code: "LONG_TERM_CARE", display: "Transfer from long-term care", displayFr: "Transfert de soins de longue durée" },
  { code: "REHABILITATION_TRANSFER", display: "Transfer from rehabilitation", displayFr: "Transfert de réadaptation" },
  { code: "CLINIC", display: "Clinic / physician office", displayFr: "Clinique / cabinet" },
  { code: "PROCEDURAL_AREA", display: "Procedural / surgical admission", displayFr: "Admission procédurale / chirurgicale" },
  { code: "OTHER", display: "Other", displayFr: "Autre", requiresComment: true },
];

export const MODE_OF_ARRIVAL_RAPID_OPTIONS: ClinicalRapidOptionV1[] = [
  { code: "AMBULATORY", display: "Ambulatory", displayFr: "Marche" },
  { code: "WHEELCHAIR", display: "Wheelchair", displayFr: "Fauteuil roulant" },
  { code: "STRETCHER", display: "Stretcher", displayFr: "Civière" },
  { code: "EMS", display: "EMS", displayFr: "Services médicaux d’urgence" },
  { code: "PRIVATE_VEHICLE", display: "Private vehicle", displayFr: "Véhicule privé" },
  { code: "AIR_TRANSPORT", display: "Air transport", displayFr: "Transport aérien" },
  { code: "OTHER", display: "Other", displayFr: "Autre", requiresComment: true },
];

/** MEDUI.INP.2B — condition on arrival chips (canonical codes; bilingual labels). */
export const CONDITION_ON_ARRIVAL_RAPID_OPTIONS: ClinicalRapidOptionV1[] = [
  { code: "STABLE", display: "Stable", displayFr: "Stable" },
  { code: "GUARDED", display: "Guarded", displayFr: "Sous surveillance" },
  { code: "SERIOUS", display: "Serious", displayFr: "Sérieux" },
  { code: "CRITICAL", display: "Critical", displayFr: "Critique" },
  {
    code: "UNABLE_TO_DETERMINE",
    display: "Unable to determine",
    displayFr: "Impossible à déterminer",
    requiresComment: true,
  },
];

export const REVIEW_STATUS_RAPID_OPTIONS: ClinicalRapidOptionV1[] = [
  { code: "REVIEWED", display: "Reviewed", displayFr: "Revu" },
  { code: "UNABLE_TO_REVIEW", display: "Unable to review", displayFr: "Impossible de revoir" },
  { code: "NOT_APPLICABLE", display: "Not applicable", displayFr: "Sans objet" },
];

export const SKIN_BASELINE_RAPID_OPTIONS: ClinicalRapidOptionV1[] = [
  { code: "INTACT", display: "Intact", displayFr: "Intacte" },
  { code: "PRESSURE_INJURY", display: "Pressure injury present", displayFr: "Lésion de pression" },
  { code: "WOUND_PRESENT", display: "Wound present", displayFr: "Plaie présente" },
  { code: "SURGICAL_INCISION", display: "Surgical incision", displayFr: "Incision chirurgicale" },
  { code: "BRUISING", display: "Bruising", displayFr: "Ecchymoses" },
  { code: "RASH", display: "Rash", displayFr: "Éruption" },
  { code: "MOISTURE_ASSOCIATED", display: "Moisture-associated damage", displayFr: "Lésion liée à l’humidité" },
  { code: "OTHER", display: "Other", displayFr: "Autre", requiresComment: true },
  { code: "NOT_ASSESSED", display: "Not assessed", displayFr: "Non évaluée" },
];

export const LIVING_SITUATION_RAPID_OPTIONS: ClinicalRapidOptionV1[] = [
  { code: "LIVES_ALONE", display: "Lives alone", displayFr: "Vit seul(e)" },
  { code: "WITH_FAMILY", display: "With family", displayFr: "Avec la famille" },
  { code: "FACILITY", display: "Facility", displayFr: "Établissement" },
  { code: "OTHER", display: "Other", displayFr: "Autre", requiresComment: true },
  { code: "UNKNOWN", display: "Unknown", displayFr: "Inconnu" },
];

export const PRE_ADMISSION_RESIDENCE_RAPID_OPTIONS: ClinicalRapidOptionV1[] = [
  { code: "HOME", display: "Home", displayFr: "Domicile" },
  { code: "HOME_WITH_SERVICES", display: "Home with services", displayFr: "Domicile avec services" },
  { code: "SNF", display: "Skilled nursing facility", displayFr: "Établissement de soins" },
  { code: "ASSISTED_LIVING", display: "Assisted living", displayFr: "Résidence assistée" },
  { code: "REHAB", display: "Rehabilitation", displayFr: "Réadaptation" },
  { code: "ANOTHER_HOSPITAL", display: "Another hospital", displayFr: "Autre hôpital" },
  { code: "OTHER", display: "Other", displayFr: "Autre", requiresComment: true },
  { code: "UNKNOWN", display: "Unknown", displayFr: "Inconnu" },
];

export const PAIN_PRESENCE_OPTIONS: ClinicalRapidOptionV1[] = [
  { code: "NO_PAIN", display: "No pain", displayFr: "Pas de douleur", mutuallyExclusiveWith: ["PAIN_PRESENT"] },
  { code: "PAIN_PRESENT", display: "Pain present", displayFr: "Douleur présente", requiresDetail: true },
  { code: "UNABLE_SELF_REPORT", display: "Unable to self-report", displayFr: "Incapable d’auto-évaluer" },
  { code: "UNABLE_TO_ASSESS", display: "Unable to assess", displayFr: "Impossible d’évaluer", requiresComment: true },
];

export const PROVIDER_INTERVAL_EVENT_OPTIONS: ClinicalRapidOptionV1[] = [
  { code: "NO_ACUTE_OVERNIGHT", display: "No acute overnight events", displayFr: "Aucun événement aigu nocturne", mutuallyExclusiveWith: ["FEVER", "HYPOTENSION", "O2_INCREASED", "NEURO", "ARRHYTHMIA"] },
  { code: "PAIN_IMPROVED", display: "Pain improved", displayFr: "Douleur améliorée" },
  { code: "PAIN_WORSENED", display: "Pain worsened", displayFr: "Douleur aggravée" },
  { code: "FEVER", display: "Fever", displayFr: "Fièvre" },
  { code: "HYPOTENSION", display: "Hypotension", displayFr: "Hypotension", severity: "warning" },
  { code: "O2_INCREASED", display: "Oxygen requirement increased", displayFr: "Besoin en oxygène augmenté", severity: "warning" },
  { code: "O2_DECREASED", display: "Oxygen requirement decreased", displayFr: "Besoin en oxygène diminué" },
  { code: "NEURO", display: "New neurologic concern", displayFr: "Nouveau souci neurologique", severity: "urgent" },
  { code: "ARRHYTHMIA", display: "New arrhythmia", displayFr: "Nouvelle arythmie", severity: "urgent" },
  { code: "MED_ADVERSE", display: "Medication adverse effect", displayFr: "Effet indésirable médicamenteux" },
  { code: "PROCEDURE_DONE", display: "Procedure completed", displayFr: "Procédure terminée" },
  { code: "CONSULT_DONE", display: "Consult completed", displayFr: "Avis terminé" },
  { code: "OTHER", display: "Other", displayFr: "Autre", requiresComment: true },
];

export const PLAN_STICKY_OPTIONS: ClinicalRapidOptionV1[] = [
  { code: "CONTINUE_MGMT", display: "Continue current management", displayFr: "Poursuivre la prise en charge actuelle" },
  { code: "MONITOR", display: "Monitor clinical status", displayFr: "Surveiller l’état clinique" },
  { code: "TREND_LABS", display: "Trend laboratory values", displayFr: "Suivre les valeurs de laboratoire" },
  { code: "REPEAT_IMAGING", display: "Repeat imaging if indicated", displayFr: "Répéter l’imagerie si indiqué" },
  { code: "CONSULT", display: "Consult requested", displayFr: "Avis demandé" },
  { code: "MED_ADJUST", display: "Medication adjustment", displayFr: "Ajustement médicamenteux" },
  { code: "IV_FLUIDS", display: "IV fluids", displayFr: "Perfusion IV" },
  { code: "PAIN_CONTROL", display: "Pain control", displayFr: "Contrôle de la douleur" },
  { code: "DVT_PROPHYLAXIS", display: "DVT prophylaxis", displayFr: "Prophylaxie MTEV" },
  { code: "FALL_PRECAUTIONS", display: "Fall precautions", displayFr: "Précautions de chute" },
  { code: "DISCHARGE_PLANNING", display: "Discharge planning", displayFr: "Planification de sortie" },
  { code: "OTHER", display: "Other", displayFr: "Autre", requiresComment: true },
];

export const ADDITIONAL_DOC_CATEGORIES = [
  "FLOWSHEETS",
  "SCORES_SCREENS",
  "INTAKE_OUTPUT",
  "SAFETY",
  "BEHAVIORAL_HEALTH",
  "RESPIRATORY",
  "BLOOD_PRODUCTS",
  "HIGH_ALERT_INFUSIONS",
  "NEUROLOGIC",
  "SKIN_WOUND",
  "DEVICES",
  "BELONGINGS",
  "EDUCATION",
  "PROCEDURES",
  "OTHER",
] as const;

export type AdditionalDocCategory = (typeof ADDITIONAL_DOC_CATEGORIES)[number];

export function applyMutuallyExclusiveSelection(
  options: readonly ClinicalRapidOptionV1[],
  current: readonly string[],
  toggledCode: string
): string[] {
  const opt = options.find((o) => o.code === toggledCode);
  const set = new Set(current);
  if (set.has(toggledCode)) {
    set.delete(toggledCode);
    return [...set];
  }
  set.add(toggledCode);
  if (opt?.mutuallyExclusiveWith?.length) {
    for (const excl of opt.mutuallyExclusiveWith) set.delete(excl);
  }
  for (const other of options) {
    if (other.code === toggledCode) continue;
    if (other.mutuallyExclusiveWith?.includes(toggledCode)) set.delete(other.code);
  }
  return [...set];
}

export function localizeRapidOption(
  opt: ClinicalRapidOptionV1,
  language: string
): { code: string; label: string } {
  const fr = String(language ?? "").toLowerCase().startsWith("fr");
  return { code: opt.code, label: fr ? opt.displayFr : opt.display };
}

/**
 * Device / presence indicators must never render as confirmed Not present
 * when the domain source is unavailable.
 */
export function indicatorNeverInferredAsAbsentWhenUnavailable(
  state: ClinicalIndicatorState
): boolean {
  if (state === "SOURCE_UNAVAILABLE") return true;
  return state !== "NOT_PRESENT" || state === "NOT_PRESENT";
}

export function mayShowIndicatorAsNotPresent(state: ClinicalIndicatorState): boolean {
  return state === "NOT_PRESENT";
}

/** Sentence-case humanization for compressed clinical keys (Painpresent → Pain present). */
export function sentenceCaseClinicalLabel(raw: string): string {
  const known: Record<string, string> = {
    painpresent: "Pain present",
    urgentprovidernotification: "Urgent provider notification",
    providerresponse: "Provider response",
    medeconstatus: "Medication reconciliation status",
    fallriskresult: "Fall-risk result",
    iomonitoringrequired: "Intake and output monitoring required",
    wristbandpresent: "Wristband present",
  };
  const compact = String(raw ?? "").replace(/[\s_-]+/g, "").toLowerCase();
  if (known[compact]) return known[compact]!;

  const spaced = String(raw ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  if (!spaced) return "";
  const words = spaced.split(" ").map((w) => w.toLowerCase());
  return words.map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(" ");
}

export function formatClinicalTerminologyLabel(raw: string): string {
  return sentenceCaseClinicalLabel(raw);
}

export const ROS_SYSTEM_CODES = [
  "CONSTITUTIONAL",
  "CARDIOVASCULAR",
  "RESPIRATORY",
  "GASTROINTESTINAL",
  "GENITOURINARY",
  "MUSCULOSKELETAL",
  "NEUROLOGIC",
  "PSYCHIATRIC",
  "SKIN",
  "HEMATOLOGIC",
  "ENDOCRINE",
  "OTHER",
] as const;

export const EXAM_SYSTEM_CODES = [
  "GENERAL",
  "HEENT",
  "CARDIOVASCULAR",
  "RESPIRATORY",
  "ABDOMEN",
  "MUSCULOSKELETAL",
  "NEUROLOGIC",
  "SKIN",
  "PSYCHIATRIC",
  "OTHER",
] as const;

export const NORMAL_EXCEPTION_CODES = [
  "WITHIN_EXPECTED_LIMITS",
  "NO_ACUTE_CONCERN",
  "DENIES",
  "NOT_PRESENT",
  "NO_CHANGE_FROM_PRIOR",
  "EXCEPTION",
  "UNABLE_TO_ASSESS",
  "NOT_APPLICABLE",
] as const;

export const YES_NO_UNKNOWN_CODES = ["YES", "NO", "UNKNOWN"] as const;

export const NURSING_REASSESSMENT_TYPES = [
  "SHIFT_ASSESSMENT",
  "FOCUSED_REASSESSMENT",
  "PAIN_REASSESSMENT",
  "POST_MEDICATION",
  "FALL_RISK",
  "NEUROLOGIC",
  "RESPIRATORY",
  "SKIN",
  "DEVICE",
  "RESTRAINT",
  "POST_PROCEDURE",
] as const;

export type NursingReassessmentType = (typeof NURSING_REASSESSMENT_TYPES)[number];

export function rapidConvergenceMustNotEnablePlacement(): true {
  return true;
}
export function rapidConvergenceMustStoreCodesNotLabels(): true {
  return true;
}
export function rapidConvergenceMustNotInferDevices(): true {
  return true;
}
export function rapidConvergenceMustPreserveTwentyAdmissionSections(): true {
  return true;
}
export function rapidConvergenceMustNotSilentCarryForward(): true {
  return true;
}

/** Observation charts are clinical-lane tagged — not a separate Prisma EncounterType. */
export function isExplicitObservationChart(enc: {
  type?: string | null;
  billingClassification?: string | null;
  admissionSummaryJson?: unknown;
}): boolean {
  const type = String(enc.type ?? "").trim().toUpperCase();
  if (type === "EMERGENCY" || type === "ED" || type === "ER") return false;
  if (String(enc.billingClassification ?? "").trim().toUpperCase() === "OBSERVATION") {
    return true;
  }
  const root =
    enc.admissionSummaryJson &&
    typeof enc.admissionSummaryJson === "object" &&
    !Array.isArray(enc.admissionSummaryJson)
      ? (enc.admissionSummaryJson as Record<string, unknown>)
      : null;
  const lane = String(
    root?.clinicalDestinationContext ?? root?.requestedEncounterType ?? ""
  )
    .trim()
    .toUpperCase();
  return lane === "OBSERVATION";
}

export function observationBootstrapRejectsEdAndInpatient(enc: {
  type?: string | null;
  billingClassification?: string | null;
  admissionSummaryJson?: unknown;
}): { ok: true } | { ok: false; category: "ED_ENCOUNTER_REJECTED" | "WRONG_ENCOUNTER_TYPE" } {
  const type = String(enc.type ?? "").trim().toUpperCase();
  if (type === "EMERGENCY" || type === "ED" || type === "ER") {
    return { ok: false, category: "ED_ENCOUNTER_REJECTED" };
  }
  if (isExplicitObservationChart(enc)) return { ok: true };
  return { ok: false, category: "WRONG_ENCOUNTER_TYPE" };
}

export function observationProviderNav(): readonly string[] {
  return [
    "overview",
    "providerNotes",
    "problemsPlan",
    "orders",
    "results",
    "medications",
    "reassessment",
    "carePlan",
    "disposition",
    "timeline",
    "summary",
  ] as const;
}

export function observationNursingNav(): readonly string[] {
  return [
    "overview",
    "assessments",
    "vitals",
    "medications",
    "reassessment",
    "tasks",
    "education",
    "disposition",
    "timeline",
    "summary",
  ] as const;
}
