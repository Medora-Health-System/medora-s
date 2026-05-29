/**
 * EDOC.UI.1 — Shared clinical documentation field option definitions.
 * Canonical persisted values remain numbers/enums; labels are display-only.
 */

export type ClinicalDocumentationFieldOption<
  T extends string | number | boolean = string | number | boolean,
> = {
  value: T;
  labelEn: string;
  labelFr: string;
  descriptionEn?: string;
  descriptionFr?: string;
  scoreValue?: number;
};

function scoreOptions(
  items: Array<{ value: number; labelEn: string; labelFr: string }>
): ClinicalDocumentationFieldOption<number>[] {
  return items.map((item) => ({ ...item, scoreValue: item.value }));
}

export const NIHSS_LEVEL_OF_CONSCIOUSNESS_OPTIONS = scoreOptions([
  { value: 0, labelEn: "Alert; keenly responsive", labelFr: "Alerte; réponse vive" },
  {
    value: 1,
    labelEn: "Not alert; arousable by minor stimulation",
    labelFr: "Non alerte; éveillable par stimulation mineure",
  },
  {
    value: 2,
    labelEn: "Not alert; requires repeated stimulation",
    labelFr: "Non alerte; stimulation répétée nécessaire",
  },
  {
    value: 3,
    labelEn: "Unresponsive or reflex response only",
    labelFr: "Non réactif ou réflexes seulement",
  },
]);

export const NIHSS_LOC_QUESTIONS_OPTIONS = scoreOptions([
  { value: 0, labelEn: "Answers both questions correctly", labelFr: "Répond correctement aux deux questions" },
  { value: 1, labelEn: "Answers one question correctly", labelFr: "Répond correctement à une question" },
  { value: 2, labelEn: "Answers neither question correctly", labelFr: "Ne répond correctement à aucune question" },
]);

export const NIHSS_LOC_COMMANDS_OPTIONS = scoreOptions([
  { value: 0, labelEn: "Performs both tasks correctly", labelFr: "Exécute correctement les deux tâches" },
  { value: 1, labelEn: "Performs one task correctly", labelFr: "Exécute correctement une tâche" },
  { value: 2, labelEn: "Performs neither task correctly", labelFr: "N'exécute correctement aucune tâche" },
]);

export const NIHSS_BEST_GAZE_OPTIONS = scoreOptions([
  { value: 0, labelEn: "Normal", labelFr: "Normal" },
  { value: 1, labelEn: "Partial gaze palsy", labelFr: "Paralysie oculaire partielle" },
  { value: 2, labelEn: "Forced deviation", labelFr: "Déviation forcée" },
]);

export const NIHSS_VISUAL_FIELDS_OPTIONS = scoreOptions([
  { value: 0, labelEn: "No visual loss", labelFr: "Pas de perte visuelle" },
  { value: 1, labelEn: "Partial hemianopia", labelFr: "Hémianopsie partielle" },
  { value: 2, labelEn: "Complete hemianopia", labelFr: "Hémianopsie complète" },
  { value: 3, labelEn: "Bilateral hemianopia", labelFr: "Hémianopsie bilatérale" },
]);

export const NIHSS_FACIAL_PALSY_OPTIONS = scoreOptions([
  { value: 0, labelEn: "Normal symmetric movements", labelFr: "Mouvements symétriques normaux" },
  { value: 1, labelEn: "Minor paralysis", labelFr: "Paralysie mineure" },
  { value: 2, labelEn: "Partial paralysis", labelFr: "Paralysie partielle" },
  {
    value: 3,
    labelEn: "Complete paralysis of one or both sides",
    labelFr: "Paralysie complète d'un ou des deux côtés",
  },
]);

export const NIHSS_MOTOR_LIMB_OPTIONS = scoreOptions([
  { value: 0, labelEn: "No drift", labelFr: "Pas de dérive" },
  { value: 1, labelEn: "Drift", labelFr: "Dérive" },
  { value: 2, labelEn: "Some effort against gravity", labelFr: "Effort partiel contre la gravité" },
  {
    value: 3,
    labelEn: "No effort against gravity; limb falls",
    labelFr: "Aucun effort contre la gravité; membre tombe",
  },
  { value: 4, labelEn: "No movement", labelFr: "Aucun mouvement" },
]);

export const NIHSS_LIMB_ATAXIA_OPTIONS = scoreOptions([
  { value: 0, labelEn: "Absent", labelFr: "Absente" },
  { value: 1, labelEn: "Present in one limb", labelFr: "Présente sur un membre" },
  { value: 2, labelEn: "Present in two limbs", labelFr: "Présente sur deux membres" },
]);

export const NIHSS_SENSORY_OPTIONS = scoreOptions([
  { value: 0, labelEn: "Normal; no sensory loss", labelFr: "Normal; pas de perte sensorielle" },
  { value: 1, labelEn: "Mild-to-moderate sensory loss", labelFr: "Perte sensorielle légère à modérée" },
  { value: 2, labelEn: "Severe to total sensory loss", labelFr: "Perte sensorielle sévère à totale" },
]);

export const NIHSS_BEST_LANGUAGE_OPTIONS = scoreOptions([
  { value: 0, labelEn: "No aphasia; normal", labelFr: "Pas d'aphasie; normal" },
  { value: 1, labelEn: "Mild to moderate aphasia", labelFr: "Aphasie légère à modérée" },
  { value: 2, labelEn: "Severe aphasia", labelFr: "Aphasie sévère" },
  { value: 3, labelEn: "Mute; global aphasia", labelFr: "Mutisme; aphasie globale" },
]);

export const NIHSS_DYSARTHRIA_OPTIONS = scoreOptions([
  { value: 0, labelEn: "Normal", labelFr: "Normal" },
  { value: 1, labelEn: "Mild to moderate dysarthria", labelFr: "Dysarthrie légère à modérée" },
  { value: 2, labelEn: "Severe dysarthria", labelFr: "Dysarthrie sévère" },
]);

export const NIHSS_EXTINCTION_INATTENTION_OPTIONS = scoreOptions([
  { value: 0, labelEn: "No abnormality", labelFr: "Pas d'anomalie" },
  {
    value: 1,
    labelEn: "Visual, tactile, auditory, spatial, or personal inattention",
    labelFr: "Inattention visuelle, tactile, auditive, spatiale ou personnelle",
  },
  {
    value: 2,
    labelEn: "Profound hemi-inattention or extinction",
    labelFr: "Hémi-inattention profonde ou extinction",
  },
]);

export const NIHSS_FIELD_OPTIONS = {
  levelOfConsciousness: NIHSS_LEVEL_OF_CONSCIOUSNESS_OPTIONS,
  locQuestions: NIHSS_LOC_QUESTIONS_OPTIONS,
  locCommands: NIHSS_LOC_COMMANDS_OPTIONS,
  bestGaze: NIHSS_BEST_GAZE_OPTIONS,
  visualFields: NIHSS_VISUAL_FIELDS_OPTIONS,
  facialPalsy: NIHSS_FACIAL_PALSY_OPTIONS,
  motorArmLeft: NIHSS_MOTOR_LIMB_OPTIONS,
  motorArmRight: NIHSS_MOTOR_LIMB_OPTIONS,
  motorLegLeft: NIHSS_MOTOR_LIMB_OPTIONS,
  motorLegRight: NIHSS_MOTOR_LIMB_OPTIONS,
  limbAtaxia: NIHSS_LIMB_ATAXIA_OPTIONS,
  sensory: NIHSS_SENSORY_OPTIONS,
  bestLanguage: NIHSS_BEST_LANGUAGE_OPTIONS,
  dysarthria: NIHSS_DYSARTHRIA_OPTIONS,
  extinctionInattention: NIHSS_EXTINCTION_INATTENTION_OPTIONS,
} as const;

export type NihssScoredFieldKey = keyof typeof NIHSS_FIELD_OPTIONS;

export const NIHSS_SCORED_FIELD_KEYS = Object.keys(NIHSS_FIELD_OPTIONS) as NihssScoredFieldKey[];

export type NihssSeverityBand =
  | "NO_STROKE_SYMPTOMS"
  | "MINOR"
  | "MODERATE"
  | "MODERATE_TO_SEVERE"
  | "SEVERE";

export function deriveNihssSeverityBand(totalScore: number): NihssSeverityBand {
  if (totalScore <= 0) return "NO_STROKE_SYMPTOMS";
  if (totalScore <= 4) return "MINOR";
  if (totalScore <= 15) return "MODERATE";
  if (totalScore <= 20) return "MODERATE_TO_SEVERE";
  return "SEVERE";
}

export const NIHSS_SEVERITY_BAND_LABEL_FR: Record<NihssSeverityBand, string> = {
  NO_STROKE_SYMPTOMS: "Aucun symptôme AVC selon NIHSS",
  MINOR: "Mineur",
  MODERATE: "Modéré",
  MODERATE_TO_SEVERE: "Modéré à sévère",
  SEVERE: "Sévère",
};

export const NIHSS_SEVERITY_BAND_LABEL_EN: Record<NihssSeverityBand, string> = {
  NO_STROKE_SYMPTOMS: "No stroke symptoms by NIHSS",
  MINOR: "Minor",
  MODERATE: "Moderate",
  MODERATE_TO_SEVERE: "Moderate to severe",
  SEVERE: "Severe",
};

export const NIHSS_FIELD_LABEL_FR: Record<NihssScoredFieldKey, string> = {
  levelOfConsciousness: "NIHSS LOC",
  locQuestions: "NIHSS questions LOC",
  locCommands: "NIHSS commandes LOC",
  bestGaze: "NIHSS regard",
  visualFields: "NIHSS champs visuels",
  facialPalsy: "NIHSS paralysie faciale",
  motorArmLeft: "NIHSS bras G",
  motorArmRight: "NIHSS bras D",
  motorLegLeft: "NIHSS jambe G",
  motorLegRight: "NIHSS jambe D",
  limbAtaxia: "NIHSS ataxie",
  sensory: "NIHSS sensoriel",
  bestLanguage: "NIHSS langage",
  dysarthria: "NIHSS dysarthrie",
  extinctionInattention: "NIHSS extinction/inattention",
};

export function formatClinicalDocumentationOptionLabel(
  option: ClinicalDocumentationFieldOption<number | string | boolean>,
  locale: "en" | "fr"
): string {
  const label = locale === "fr" ? option.labelFr : option.labelEn;
  const score =
    option.scoreValue ?? (typeof option.value === "number" ? option.value : undefined);
  if (score !== undefined) return `${score} — ${label}`;
  return label;
}

export function findClinicalDocumentationOption<T extends string | number | boolean>(
  options: ReadonlyArray<ClinicalDocumentationFieldOption<T>>,
  value: T
): ClinicalDocumentationFieldOption<T> | undefined {
  return options.find((o) => o.value === value);
}

export function formatNihssItemSummary(
  fieldKey: NihssScoredFieldKey,
  score: number,
  locale: "en" | "fr" = "fr"
): string | null {
  const options = NIHSS_FIELD_OPTIONS[fieldKey];
  const option = findClinicalDocumentationOption(options, score);
  if (!option) return null;
  return formatClinicalDocumentationOptionLabel(option, locale);
}

export const BOOLEAN_YES_NO_OPTIONS: ClinicalDocumentationFieldOption<boolean>[] = [
  { value: true, labelEn: "Yes", labelFr: "Oui" },
  { value: false, labelEn: "No", labelFr: "Non" },
];

export const CINCINNATI_ELEMENT_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "NORMAL", labelEn: "Normal", labelFr: "Normal" },
  { value: "ABNORMAL", labelEn: "Abnormal", labelFr: "Anormal" },
  { value: "UNABLE_TO_ASSESS", labelEn: "Unable to assess", labelFr: "Non évaluable" },
];

export const SWALLOW_RESULT_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "PASSED", labelEn: "Passed", labelFr: "Réussi" },
  { value: "FAILED", labelEn: "Failed", labelFr: "Échoué" },
  { value: "DEFERRED", labelEn: "Deferred", labelFr: "Reporté" },
];

export const ABCD2_CLINICAL_FEATURE_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "UNILATERAL_WEAKNESS", labelEn: "Unilateral weakness", labelFr: "Faiblesse unilatérale" },
  {
    value: "SPEECH_WITHOUT_WEAKNESS",
    labelEn: "Speech without weakness",
    labelFr: "Trouble de la parole sans faiblesse",
  },
  { value: "OTHER", labelEn: "Other", labelFr: "Autre" },
];

export const ABCD2_DURATION_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "GREATER_EQUAL_60_MIN", labelEn: "≥ 60 min", labelFr: "≥ 60 min" },
  { value: "TEN_TO_59_MIN", labelEn: "10–59 min", labelFr: "10–59 min" },
  { value: "LESS_THAN_10_MIN", labelEn: "< 10 min", labelFr: "< 10 min" },
];

export const NEURO_CHANGES_FROM_PRIOR_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "YES", labelEn: "Yes", labelFr: "Oui" },
  { value: "NO", labelEn: "No", labelFr: "Non" },
  { value: "UNKNOWN", labelEn: "Unknown", labelFr: "Inconnu" },
];

export const NEURO_LOC_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "ALERT", labelEn: "Alert", labelFr: "Alerte" },
  { value: "DROWSY", labelEn: "Drowsy", labelFr: "Somnolent" },
  { value: "STUPOROUS", labelEn: "Stuporous", labelFr: "Stuporeux" },
  { value: "UNRESPONSIVE", labelEn: "Unresponsive", labelFr: "Non réactif" },
];

export const NEURO_ORIENTATION_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "ORIENTED_X4", labelEn: "Oriented ×4", labelFr: "Orienté ×4" },
  { value: "ORIENTED_X3", labelEn: "Oriented ×3", labelFr: "Orienté ×3" },
  { value: "ORIENTED_X2", labelEn: "Oriented ×2", labelFr: "Orienté ×2" },
  { value: "ORIENTED_X1", labelEn: "Oriented ×1", labelFr: "Orienté ×1" },
  { value: "DISORIENTED", labelEn: "Disoriented", labelFr: "Désorienté" },
];

export const NEURO_PUPILS_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "EQUAL_REACTIVE", labelEn: "Equal and reactive", labelFr: "Égales et réactives" },
  { value: "UNEQUAL", labelEn: "Unequal", labelFr: "Inégales" },
  { value: "NON_REACTIVE", labelEn: "Non-reactive", labelFr: "Non réactives" },
  { value: "OTHER", labelEn: "Other", labelFr: "Autre" },
];

export const NEURO_GRIP_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "NORMAL", labelEn: "Normal", labelFr: "Normal" },
  { value: "WEAK", labelEn: "Weak", labelFr: "Faible" },
  { value: "ABSENT", labelEn: "Absent", labelFr: "Absent" },
  { value: "UNABLE_TO_ASSESS", labelEn: "Unable to assess", labelFr: "Non évaluable" },
];

export const NEURO_MOTOR_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "NORMAL", labelEn: "Normal strength", labelFr: "Force normale" },
  { value: "WEAK", labelEn: "Weakness", labelFr: "Faiblesse" },
  { value: "PARALYSIS", labelEn: "Paralysis", labelFr: "Paralysie" },
  { value: "UNABLE_TO_ASSESS", labelEn: "Unable to assess", labelFr: "Non évaluable" },
];

export const NEURO_SENSATION_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "INTACT", labelEn: "Intact", labelFr: "Intacte" },
  { value: "DECREASED", labelEn: "Decreased", labelFr: "Diminuée" },
  { value: "ABSENT", labelEn: "Absent", labelFr: "Absente" },
  { value: "UNABLE_TO_ASSESS", labelEn: "Unable to assess", labelFr: "Non évaluable" },
];

export const NEURO_SPEECH_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "NORMAL", labelEn: "Normal", labelFr: "Normal" },
  { value: "DYSARTHRIA", labelEn: "Dysarthria", labelFr: "Dysarthrie" },
  { value: "APHASIA", labelEn: "Aphasia", labelFr: "Aphasie" },
  { value: "UNABLE_TO_ASSESS", labelEn: "Unable to assess", labelFr: "Non évaluable" },
];

export const NEURO_FIELD_OPTIONS = {
  levelOfConsciousness: NEURO_LOC_OPTIONS,
  orientation: NEURO_ORIENTATION_OPTIONS,
  pupils: NEURO_PUPILS_OPTIONS,
  gripLeft: NEURO_GRIP_OPTIONS,
  gripRight: NEURO_GRIP_OPTIONS,
  motorLeft: NEURO_MOTOR_OPTIONS,
  motorRight: NEURO_MOTOR_OPTIONS,
  sensation: NEURO_SENSATION_OPTIONS,
  speech: NEURO_SPEECH_OPTIONS,
} as const;

export type NeuroSelectFieldKey = keyof typeof NEURO_FIELD_OPTIONS;

export function formatNeuroFieldValueSummary(
  fieldKey: NeuroSelectFieldKey,
  value: string,
  locale: "en" | "fr" = "fr"
): string | null {
  const options = NEURO_FIELD_OPTIONS[fieldKey];
  const option = findClinicalDocumentationOption(options, value);
  if (!option) return value.trim() || null;
  return formatClinicalDocumentationOptionLabel(option, locale);
}

export const PO_TOLERATED_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "YES", labelEn: "Yes", labelFr: "Oui" },
  { value: "NO", labelEn: "No", labelFr: "Non" },
  { value: "PARTIAL", labelEn: "Partial", labelFr: "Partiel" },
];

export const TRIAL_RESULT_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "PASSED", labelEn: "Passed", labelFr: "Réussi" },
  { value: "FAILED", labelEn: "Failed", labelFr: "Échoué" },
  { value: "PARTIAL", labelEn: "Partial", labelFr: "Partiel" },
  { value: "STOPPED", labelEn: "Stopped", labelFr: "Arrêté" },
];

export const ASSISTANCE_LEVEL_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "NONE", labelEn: "None", labelFr: "Aucune" },
  { value: "STANDBY", labelEn: "Standby", labelFr: "Surveillance" },
  { value: "ONE_PERSON", labelEn: "One person", labelFr: "Une personne" },
  { value: "TWO_PERSON", labelEn: "Two people", labelFr: "Deux personnes" },
  { value: "DEVICE", labelEn: "Assistive device", labelFr: "Aide technique" },
];

export const DISTANCE_UNIT_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "FEET", labelEn: "Feet", labelFr: "Pieds" },
  { value: "METERS", labelEn: "Meters", labelFr: "Mètres" },
  { value: "STEPS", labelEn: "Steps", labelFr: "Pas" },
];

export const PATIENT_CONDITION_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "IMPROVED", labelEn: "Improved", labelFr: "Amélioré" },
  { value: "UNCHANGED", labelEn: "Unchanged", labelFr: "Inchangé" },
  { value: "WORSENED", labelEn: "Worsened", labelFr: "Aggravé" },
];

export const IO_UNIT_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "ML", labelEn: "mL", labelFr: "mL" },
  { value: "L", labelEn: "L", labelFr: "L" },
  { value: "OZ", labelEn: "oz", labelFr: "oz" },
  { value: "CC", labelEn: "cc", labelFr: "cc" },
];

export const IO_FLUID_ROUTE_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "ORAL", labelEn: "Oral", labelFr: "Oral" },
  { value: "IV", labelEn: "IV", labelFr: "IV" },
  { value: "ENTERAL", labelEn: "Enteral", labelFr: "Entéral" },
  { value: "OTHER", labelEn: "Other", labelFr: "Autre" },
];

export const IO_URINE_METHOD_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "VOIDED", labelEn: "Voided", labelFr: "Miction spontanée" },
  { value: "FOLEY", labelEn: "Foley", labelFr: "Sonde urinaire" },
  { value: "STRAIGHT_CATH", labelEn: "Straight cath", labelFr: "Sondage évacuateur" },
  { value: "URINAL", labelEn: "Urinal", labelFr: "Urinal" },
  { value: "BEDPAN", labelEn: "Bedpan", labelFr: "Bassin" },
  { value: "OTHER", labelEn: "Other", labelFr: "Autre" },
];

export const IO_STOOL_CONSISTENCY_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "FORMED", labelEn: "Formed", labelFr: "Formées" },
  { value: "LOOSE", labelEn: "Loose", labelFr: "Moles" },
  { value: "WATERY", labelEn: "Watery", labelFr: "Liquides" },
  { value: "BLOODY", labelEn: "Bloody", labelFr: "Sanglantes" },
  { value: "BLACK_TARRY", labelEn: "Black/tarry", labelFr: "Noires et goudronneuses" },
  { value: "OTHER", labelEn: "Other", labelFr: "Autre" },
];

export const IO_EMESIS_APPEARANCE_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "CLEAR", labelEn: "Clear", labelFr: "Clair" },
  { value: "FOOD_CONTENT", labelEn: "Food content", labelFr: "Contenu alimentaire" },
  { value: "BILIOUS", labelEn: "Bilious", labelFr: "Bilieux" },
  { value: "BLOODY", labelEn: "Bloody", labelFr: "Sanglant" },
  { value: "COFFEE_GROUND", labelEn: "Coffee ground", labelFr: "Marc de café" },
  { value: "OTHER", labelEn: "Other", labelFr: "Autre" },
];

export const IO_NG_APPEARANCE_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "CLEAR", labelEn: "Clear", labelFr: "Clair" },
  { value: "BILIOUS", labelEn: "Bilious", labelFr: "Bilieux" },
  { value: "BLOODY", labelEn: "Bloody", labelFr: "Sanglant" },
  { value: "COFFEE_GROUND", labelEn: "Coffee ground", labelFr: "Marc de café" },
  { value: "FOOD_CONTENT", labelEn: "Food content", labelFr: "Contenu alimentaire" },
  { value: "OTHER", labelEn: "Other", labelFr: "Autre" },
];

export const IO_NG_SUCTION_TYPE_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "LOW_INTERMITTENT", labelEn: "Low intermittent", labelFr: "Basse intermittente" },
  { value: "LOW_CONTINUOUS", labelEn: "Low continuous", labelFr: "Basse continue" },
  { value: "GRAVITY", labelEn: "Gravity", labelFr: "Gravité" },
  { value: "CLAMPED", labelEn: "Clamped", labelFr: "Clampé" },
  { value: "OTHER", labelEn: "Other", labelFr: "Autre" },
];

export const IO_DRAIN_APPEARANCE_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "SEROUS", labelEn: "Serous", labelFr: "Séreux" },
  { value: "SEROSANGUINOUS", labelEn: "Serosanguineous", labelFr: "Sérosanguin" },
  { value: "SANGUINEOUS", labelEn: "Sanguineous", labelFr: "Sanguin" },
  { value: "PURULENT", labelEn: "Purulent", labelFr: "Purulent" },
  { value: "BILIOUS", labelEn: "Bilious", labelFr: "Bilieux" },
  { value: "OTHER", labelEn: "Other", labelFr: "Autre" },
];

export const IO_BLOOD_PRODUCT_TYPE_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "PRBC", labelEn: "PRBC", labelFr: "CGR" },
  { value: "FFP", labelEn: "FFP", labelFr: "PFC" },
  { value: "PLATELETS", labelEn: "Platelets", labelFr: "Plaquettes" },
  { value: "CRYO", labelEn: "Cryo", labelFr: "Cryoprécipité" },
  { value: "WHOLE_BLOOD", labelEn: "Whole blood", labelFr: "Sang total" },
  { value: "OTHER", labelEn: "Other", labelFr: "Autre" },
];

export const RESTRAINT_TYPE_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "PHYSICAL", labelEn: "Physical", labelFr: "Physique" },
  { value: "BEHAVIORAL", labelEn: "Behavioral", labelFr: "Comportementale" },
  { value: "MEDICAL", labelEn: "Medical", labelFr: "Médicale" },
  { value: "SECLUSION", labelEn: "Seclusion", labelFr: "Isolement" },
];

export const REASON_FOR_RESTRAINT_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "VIOLENT_BEHAVIOR", labelEn: "Violent behavior", labelFr: "Comportement violent" },
  { value: "SELF_DESTRUCTIVE", labelEn: "Self-destructive", labelFr: "Autodestruction" },
  { value: "PULLING_LINES", labelEn: "Pulling lines", labelFr: "Arrachement de lignes" },
  { value: "PULLING_TUBES", labelEn: "Pulling tubes", labelFr: "Arrachement de tubes" },
  { value: "FALL_RISK", labelEn: "Fall risk", labelFr: "Risque de chute" },
  {
    value: "INTERFERENCE_WITH_CARE",
    labelEn: "Interference with care",
    labelFr: "Gêne aux soins",
  },
  {
    value: "ALTERED_MENTAL_STATUS",
    labelEn: "Altered mental status",
    labelFr: "Altération de l'état mental",
  },
  { value: "OTHER", labelEn: "Other", labelFr: "Autre" },
];

export const ALTERNATIVES_ATTEMPTED_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "VERBAL_DEESCALATION", labelEn: "Verbal de-escalation", labelFr: "Désescalade verbale" },
  { value: "REORIENTATION", labelEn: "Reorientation", labelFr: "Réorientation" },
  { value: "FAMILY_PRESENCE", labelEn: "Family presence", labelFr: "Présence familiale" },
  { value: "SITTER", labelEn: "Sitter", labelFr: "Surveillant" },
  { value: "REDIRECTION", labelEn: "Redirection", labelFr: "Redirection" },
  {
    value: "ENVIRONMENTAL_MODIFICATION",
    labelEn: "Environmental modification",
    labelFr: "Modification environnement",
  },
  { value: "MEDICATION", labelEn: "Medication", labelFr: "Médication" },
  { value: "OTHER", labelEn: "Other", labelFr: "Autre" },
];

export const NORMAL_ABNORMAL_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "NORMAL", labelEn: "Normal", labelFr: "Normal" },
  { value: "ABNORMAL", labelEn: "Abnormal", labelFr: "Anormal" },
];

export const DISCONTINUATION_CRITERIA_OPTIONS: ClinicalDocumentationFieldOption<string>[] = [
  { value: "CALM", labelEn: "Calm", labelFr: "Calme" },
  { value: "FOLLOWS_COMMANDS", labelEn: "Follows commands", labelFr: "Suit les consignes" },
  { value: "NO_LONGER_DANGER", labelEn: "No longer a danger", labelFr: "Plus de danger" },
  {
    value: "MEDICAL_DEVICE_SECURE",
    labelEn: "Medical devices secure",
    labelFr: "Dispositifs sécurisés",
  },
  { value: "OTHER", labelEn: "Other", labelFr: "Autre" },
];
