import { z } from "zod";
import type { ClinicalDocumentationFieldOption } from "./clinicalDocumentationFieldOptions.js";
import {
  NIHSS_SCORED_FIELD_KEYS,
  type NihssScoredFieldKey,
} from "./clinicalDocumentationFieldOptions.js";
import {
  calculateNihssTotal,
} from "./strokeDocumentationPayloads.js";
import {
  clinicalDocYesNo,
  pickLocalizedEnumLabel,
  type ClinicalDocumentationSummaryLocale,
} from "./clinicalDocumentationSummaryLocale.js";
import { PROC_YES_NO_VALUES } from "./proceduralSafetyThrombolyticPayloads.js";

/** EDOC.11 — stroke / neuro reassessment card IDs (distinct from EDOC.4 baseline cards). */
export const NIHSS_REASSESSMENT_CARD_ID = "nihss_reassessment" as const;
export const NEURO_CHECKS_CARD_ID = "neuro_checks" as const;
export const GLASGOW_COMA_SCALE_CARD_ID = "glasgow_coma_scale" as const;
export const PUPILLARY_ASSESSMENT_CARD_ID = "pupillary_assessment" as const;
export const MOTOR_STRENGTH_ASSESSMENT_CARD_ID = "motor_strength_assessment" as const;
export const NEURO_ESCALATION_EVENT_CARD_ID = "neuro_escalation_event" as const;
export const POST_THROMBOLYTIC_MONITORING_CARD_ID = "post_thrombolytic_monitoring" as const;
export const FREQUENT_NEURO_REASSESSMENT_CARD_ID = "frequent_neuro_reassessment" as const;

export const EDOC11_STROKE_NEURO_REASSESSMENT_CARD_IDS = [
  NIHSS_REASSESSMENT_CARD_ID,
  NEURO_CHECKS_CARD_ID,
  GLASGOW_COMA_SCALE_CARD_ID,
  PUPILLARY_ASSESSMENT_CARD_ID,
  MOTOR_STRENGTH_ASSESSMENT_CARD_ID,
  NEURO_ESCALATION_EVENT_CARD_ID,
  POST_THROMBOLYTIC_MONITORING_CARD_ID,
  FREQUENT_NEURO_REASSESSMENT_CARD_ID,
] as const;

export type Edoc11StrokeNeuroReassessmentCardId =
  (typeof EDOC11_STROKE_NEURO_REASSESSMENT_CARD_IDS)[number];

/**
 * Future Phase — EDOC.11A Neuro Escalation Automation
 * Do not implement now: automated alerts, paging, or stroke-team dispatch from documentation flags.
 */
export const EDOC_11A_FUTURE_NEURO_ESCALATION_AUTOMATION = "EDOC.11A" as const;

const optionalNotes = z.string().trim().max(2000).optional();
const isoDateTimeString = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date/time" });
const optionalIsoDateTime = z
  .string()
  .trim()
  .max(40)
  .refine((s) => s === "" || !Number.isNaN(Date.parse(s)), { message: "Invalid date/time" })
  .optional()
  .transform((s) => (s?.trim() ? s.trim() : undefined));
const nihssItem = (min: number, max: number) => z.coerce.number().int().min(min).max(max);
const hr = z.coerce.number().int().min(0).max(300);
const bp = z.string().trim().min(1).max(20);
const pupilMm = z.coerce.number().int().min(1).max(8);
const motorGrade = z.coerce.number().int().min(0).max(5);

const nihssCoreItemsSchema = z.object({
  levelOfConsciousness: nihssItem(0, 3),
  locQuestions: nihssItem(0, 2),
  locCommands: nihssItem(0, 2),
  bestGaze: nihssItem(0, 2),
  visualFields: nihssItem(0, 3),
  facialPalsy: nihssItem(0, 3),
  motorArmLeft: nihssItem(0, 4),
  motorArmRight: nihssItem(0, 4),
  motorLegLeft: nihssItem(0, 4),
  motorLegRight: nihssItem(0, 4),
  limbAtaxia: nihssItem(0, 2),
  sensory: nihssItem(0, 2),
  bestLanguage: nihssItem(0, 3),
  dysarthria: nihssItem(0, 2),
  extinctionInattention: nihssItem(0, 2),
});

export const NEURO_CHECK_LOC_VALUES = [
  "ALERT",
  "DROWSY",
  "LETHARGIC",
  "OBTUNDED",
  "COMATOSE",
] as const;

export const NEURO_CHECK_ORIENTATION_VALUES = [
  "X4",
  "X3",
  "X2",
  "X1",
  "NOT_ASSESSABLE",
] as const;

export const NEURO_CHECK_SPEECH_VALUES = [
  "NORMAL",
  "SLURRED",
  "APHASIC",
  "DYSARTHRIC",
  "UNABLE",
] as const;

export const NEURO_CHECK_SENSATION_VALUES = ["INTACT", "DECREASED", "ABSENT"] as const;

export const NEURO_CHECK_FACIAL_DROOP_VALUES = [
  "NONE",
  "LEFT",
  "RIGHT",
  "BILATERAL",
] as const;

export const GCS_EYE_VALUES = [4, 3, 2, 1] as const;
export const GCS_VERBAL_VALUES = [5, 4, 3, 2, 1] as const;
export const GCS_MOTOR_VALUES = [6, 5, 4, 3, 2, 1] as const;

export const GCS_SEVERITY_BAND_VALUES = ["MILD", "MODERATE", "SEVERE"] as const;

export const PUPIL_REACTION_VALUES = ["BRISK", "SLUGGISH", "FIXED"] as const;

export const PRONATOR_DRIFT_VALUES = ["NONE", "LEFT", "RIGHT", "BILATERAL"] as const;

export const NEURO_ESCALATION_REASON_VALUES = [
  "NIHSS_WORSENING",
  "GCS_DECLINE",
  "NEW_DEFICIT",
  "SEIZURE",
  "AMS",
  "PUPIL_CHANGE",
  "OTHER",
] as const;

export const POST_THROMBOLYTIC_THERAPY_VALUES = ["TNK", "TPA"] as const;

export const FREQUENT_NEURO_FREQUENCY_VALUES = [
  "Q15",
  "Q30",
  "Q1H",
  "Q2H",
  "CUSTOM",
] as const;

export const FREQUENT_NEURO_STATUS_VALUES = ["IMPROVED", "UNCHANGED", "WORSENED"] as const;

function makeNumericScoreOptions(
  values: readonly number[],
  labelEnFr: Record<number, { en: string; fr: string }>
): ClinicalDocumentationFieldOption<number>[] {
  return values.map((value) => ({
    value,
    labelEn: `${value} — ${labelEnFr[value]!.en}`,
    labelFr: `${value} — ${labelEnFr[value]!.fr}`,
  }));
}

const GCS_EYE_LABELS: Record<number, { en: string; fr: string }> = {
  4: { en: "Opens eyes spontaneously", fr: "Ouvre les yeux spontanément" },
  3: { en: "Opens to speech", fr: "Ouvre à la parole" },
  2: { en: "Opens to pain", fr: "Ouvre à la douleur" },
  1: { en: "No response", fr: "Aucune réponse" },
};

const GCS_VERBAL_LABELS: Record<number, { en: string; fr: string }> = {
  5: { en: "Oriented", fr: "Orienté" },
  4: { en: "Confused conversation", fr: "Conversation confuse" },
  3: { en: "Inappropriate words", fr: "Mots inappropriés" },
  2: { en: "Incomprehensible sounds", fr: "Sons incompréhensibles" },
  1: { en: "No response", fr: "Aucune réponse" },
};

const GCS_MOTOR_LABELS: Record<number, { en: string; fr: string }> = {
  6: { en: "Obeys commands", fr: "Obéit aux commandes" },
  5: { en: "Localizes pain", fr: "Localise la douleur" },
  4: { en: "Withdraws from pain", fr: "Retrait à la douleur" },
  3: { en: "Abnormal flexion", fr: "Flexion anormale" },
  2: { en: "Extension", fr: "Extension" },
  1: { en: "No response", fr: "Aucune réponse" },
};

export const GCS_EYE_OPTIONS = makeNumericScoreOptions(GCS_EYE_VALUES, GCS_EYE_LABELS);
export const GCS_VERBAL_OPTIONS = makeNumericScoreOptions(GCS_VERBAL_VALUES, GCS_VERBAL_LABELS);
export const GCS_MOTOR_OPTIONS = makeNumericScoreOptions(GCS_MOTOR_VALUES, GCS_MOTOR_LABELS);

export const MOTOR_LIMB_GRADE_VALUES = [0, 1, 2, 3, 4, 5] as const;
export const MOTOR_LIMB_GRADE_OPTIONS: ClinicalDocumentationFieldOption<number>[] =
  MOTOR_LIMB_GRADE_VALUES.map((value) => ({
    value,
    labelEn: `${value}/5`,
    labelFr: `${value}/5`,
  }));

export const PUPIL_SIZE_MM_VALUES = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export const PUPIL_SIZE_MM_OPTIONS: ClinicalDocumentationFieldOption<number>[] =
  PUPIL_SIZE_MM_VALUES.map((value) => ({
    value,
    labelEn: `${value} mm`,
    labelFr: `${value} mm`,
  }));

export const NEURO_CHECK_LOC_OPTIONS: ClinicalDocumentationFieldOption<
  (typeof NEURO_CHECK_LOC_VALUES)[number]
>[] = [
  { value: "ALERT", labelEn: "Alert", labelFr: "Alerte" },
  { value: "DROWSY", labelEn: "Drowsy", labelFr: "Somnolent" },
  { value: "LETHARGIC", labelEn: "Lethargic", labelFr: "Léthargique" },
  { value: "OBTUNDED", labelEn: "Obtunded", labelFr: "Obnubilé" },
  { value: "COMATOSE", labelEn: "Comatose", labelFr: "Comateux" },
];

export const NEURO_CHECK_ORIENTATION_OPTIONS: ClinicalDocumentationFieldOption<
  (typeof NEURO_CHECK_ORIENTATION_VALUES)[number]
>[] = [
  { value: "X4", labelEn: "Oriented ×4", labelFr: "Orienté ×4" },
  { value: "X3", labelEn: "Oriented ×3", labelFr: "Orienté ×3" },
  { value: "X2", labelEn: "Oriented ×2", labelFr: "Orienté ×2" },
  { value: "X1", labelEn: "Oriented ×1", labelFr: "Orienté ×1" },
  { value: "NOT_ASSESSABLE", labelEn: "Not assessable", labelFr: "Non évaluable" },
];

export const NEURO_CHECK_SPEECH_OPTIONS: ClinicalDocumentationFieldOption<
  (typeof NEURO_CHECK_SPEECH_VALUES)[number]
>[] = [
  { value: "NORMAL", labelEn: "Normal", labelFr: "Normal" },
  { value: "SLURRED", labelEn: "Slurred", labelFr: "Ébauché" },
  { value: "APHASIC", labelEn: "Aphasic", labelFr: "Aphasique" },
  { value: "DYSARTHRIC", labelEn: "Dysarthric", labelFr: "Dysarthrique" },
  { value: "UNABLE", labelEn: "Unable to assess", labelFr: "Non évaluable" },
];

export const NEURO_CHECK_SENSATION_OPTIONS: ClinicalDocumentationFieldOption<
  (typeof NEURO_CHECK_SENSATION_VALUES)[number]
>[] = [
  { value: "INTACT", labelEn: "Intact", labelFr: "Intacte" },
  { value: "DECREASED", labelEn: "Decreased", labelFr: "Diminuée" },
  { value: "ABSENT", labelEn: "Absent", labelFr: "Absente" },
];

export const NEURO_CHECK_FACIAL_DROOP_OPTIONS: ClinicalDocumentationFieldOption<
  (typeof NEURO_CHECK_FACIAL_DROOP_VALUES)[number]
>[] = [
  { value: "NONE", labelEn: "None", labelFr: "Aucun" },
  { value: "LEFT", labelEn: "Left", labelFr: "Gauche" },
  { value: "RIGHT", labelEn: "Right", labelFr: "Droit" },
  { value: "BILATERAL", labelEn: "Bilateral", labelFr: "Bilatéral" },
];

export const PUPIL_REACTION_OPTIONS: ClinicalDocumentationFieldOption<
  (typeof PUPIL_REACTION_VALUES)[number]
>[] = [
  { value: "BRISK", labelEn: "Brisk", labelFr: "Vive" },
  { value: "SLUGGISH", labelEn: "Sluggish", labelFr: "Lente" },
  { value: "FIXED", labelEn: "Fixed", labelFr: "Fixe" },
];

export const PRONATOR_DRIFT_OPTIONS: ClinicalDocumentationFieldOption<
  (typeof PRONATOR_DRIFT_VALUES)[number]
>[] = [
  { value: "NONE", labelEn: "None", labelFr: "Aucun" },
  { value: "LEFT", labelEn: "Left", labelFr: "Gauche" },
  { value: "RIGHT", labelEn: "Right", labelFr: "Droit" },
  { value: "BILATERAL", labelEn: "Bilateral", labelFr: "Bilatéral" },
];

export const NEURO_ESCALATION_REASON_OPTIONS: ClinicalDocumentationFieldOption<
  (typeof NEURO_ESCALATION_REASON_VALUES)[number]
>[] = [
  { value: "NIHSS_WORSENING", labelEn: "NIHSS worsening", labelFr: "Aggravation NIHSS" },
  { value: "GCS_DECLINE", labelEn: "GCS decline", labelFr: "Baisse GCS" },
  { value: "NEW_DEFICIT", labelEn: "New deficit", labelFr: "Nouveau déficit" },
  { value: "SEIZURE", labelEn: "Seizure", labelFr: "Crise convulsive" },
  { value: "AMS", labelEn: "Altered mental status", labelFr: "Altération état mental" },
  { value: "PUPIL_CHANGE", labelEn: "Pupil change", labelFr: "Changement pupillaire" },
  { value: "OTHER", labelEn: "Other", labelFr: "Autre" },
];

export const POST_THROMBOLYTIC_THERAPY_OPTIONS: ClinicalDocumentationFieldOption<
  (typeof POST_THROMBOLYTIC_THERAPY_VALUES)[number]
>[] = [
  { value: "TNK", labelEn: "TNK", labelFr: "TNK" },
  { value: "TPA", labelEn: "tPA", labelFr: "tPA" },
];

export const FREQUENT_NEURO_FREQUENCY_OPTIONS: ClinicalDocumentationFieldOption<
  (typeof FREQUENT_NEURO_FREQUENCY_VALUES)[number]
>[] = [
  { value: "Q15", labelEn: "Every 15 min", labelFr: "Toutes les 15 min" },
  { value: "Q30", labelEn: "Every 30 min", labelFr: "Toutes les 30 min" },
  { value: "Q1H", labelEn: "Every 1 hour", labelFr: "Toutes les heures" },
  { value: "Q2H", labelEn: "Every 2 hours", labelFr: "Toutes les 2 h" },
  { value: "CUSTOM", labelEn: "Custom", labelFr: "Personnalisé" },
];

export const FREQUENT_NEURO_STATUS_OPTIONS: ClinicalDocumentationFieldOption<
  (typeof FREQUENT_NEURO_STATUS_VALUES)[number]
>[] = [
  { value: "IMPROVED", labelEn: "Improved", labelFr: "Amélioré" },
  { value: "UNCHANGED", labelEn: "Unchanged", labelFr: "Inchangé" },
  { value: "WORSENED", labelEn: "Worsened", labelFr: "Aggravé" },
];

export function calculateGcsScore(input: {
  eye: (typeof GCS_EYE_VALUES)[number];
  verbal: (typeof GCS_VERBAL_VALUES)[number];
  motor: (typeof GCS_MOTOR_VALUES)[number];
}): number {
  return input.eye + input.verbal + input.motor;
}

export function deriveGcsSeverity(
  totalScore: number
): (typeof GCS_SEVERITY_BAND_VALUES)[number] {
  if (totalScore <= 8) return "SEVERE";
  if (totalScore <= 12) return "MODERATE";
  return "MILD";
}

export function calculateNihssChange(
  currentScore: number,
  previousScore?: number | null
): number | undefined {
  if (previousScore == null) return undefined;
  return currentScore - previousScore;
}

export function detectNihssWorsening(
  currentScore: number,
  previousScore?: number | null
): boolean {
  if (previousScore == null) return false;
  return currentScore > previousScore;
}

export const nihssReassessmentPayloadSchema = nihssCoreItemsSchema
  .extend({
    assessedAt: isoDateTimeString,
    totalScore: nihssItem(0, 42),
    previousScore: nihssItem(0, 42).optional(),
    scoreChange: z.coerce.number().int().min(-42).max(42).optional(),
    worseningDetected: z.boolean(),
    providerNotified: z.boolean(),
    providerNotificationTime: optionalIsoDateTime,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    const calculated = calculateNihssTotal(data);
    if (data.totalScore !== calculated) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "totalScore must equal sum of NIHSS item scores",
        path: ["totalScore"],
      });
    }
    const expectedChange = calculateNihssChange(data.totalScore, data.previousScore);
    if (expectedChange !== undefined) {
      if (data.scoreChange !== expectedChange) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "scoreChange must equal current minus previous NIHSS score",
          path: ["scoreChange"],
        });
      }
    } else if (data.scoreChange !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "scoreChange requires previousScore",
        path: ["scoreChange"],
      });
    }
    const expectedWorsening = detectNihssWorsening(data.totalScore, data.previousScore);
    if (data.worseningDetected !== expectedWorsening) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "worseningDetected must match NIHSS score trend",
        path: ["worseningDetected"],
      });
    }
    if (data.worseningDetected && !data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required when NIHSS worsening detected",
        path: ["providerNotified"],
      });
    }
    if (data.providerNotified && !data.providerNotificationTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification time required when provider notified",
        path: ["providerNotificationTime"],
      });
    }
  });

export const edoc11NeuroChecksPayloadSchema = z.object({
  assessmentTime: isoDateTimeString,
  levelOfConsciousness: z.enum(NEURO_CHECK_LOC_VALUES),
  orientation: z.enum(NEURO_CHECK_ORIENTATION_VALUES),
  speech: z.enum(NEURO_CHECK_SPEECH_VALUES),
  sensation: z.enum(NEURO_CHECK_SENSATION_VALUES),
  facialDroop: z.enum(NEURO_CHECK_FACIAL_DROOP_VALUES),
  seizureActivityObserved: z.boolean(),
  providerNotified: z.boolean(),
  notes: optionalNotes,
});

export const glasgowComaScalePayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    eye: z.union([
      z.literal(4),
      z.literal(3),
      z.literal(2),
      z.literal(1),
    ]),
    verbal: z.union([
      z.literal(5),
      z.literal(4),
      z.literal(3),
      z.literal(2),
      z.literal(1),
    ]),
    motor: z.union([
      z.literal(6),
      z.literal(5),
      z.literal(4),
      z.literal(3),
      z.literal(2),
      z.literal(1),
    ]),
    totalScore: z.coerce.number().int().min(3).max(15),
    severityBand: z.enum(GCS_SEVERITY_BAND_VALUES),
    providerNotified: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    const calculated = calculateGcsScore(data);
    if (data.totalScore !== calculated) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "totalScore must equal sum of GCS components",
        path: ["totalScore"],
      });
    }
    const expectedBand = deriveGcsSeverity(calculated);
    if (data.severityBand !== expectedBand) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "severityBand must match calculated GCS severity",
        path: ["severityBand"],
      });
    }
    if (expectedBand === "SEVERE" && !data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required for severe GCS",
        path: ["providerNotified"],
      });
    }
  });

export const pupillaryAssessmentPayloadSchema = z.object({
  assessmentTime: isoDateTimeString,
  leftPupilSize: pupilMm,
  rightPupilSize: pupilMm,
  leftReaction: z.enum(PUPIL_REACTION_VALUES),
  rightReaction: z.enum(PUPIL_REACTION_VALUES),
  anisocoriaPresent: z.boolean(),
  providerNotified: z.boolean(),
  notes: optionalNotes,
});

export const motorStrengthAssessmentPayloadSchema = z.object({
  assessmentTime: isoDateTimeString,
  lue: motorGrade,
  rue: motorGrade,
  lle: motorGrade,
  rle: motorGrade,
  pronatorDrift: z.enum(PRONATOR_DRIFT_VALUES),
  providerNotified: z.boolean(),
  notes: optionalNotes,
});

export const neuroEscalationEventPayloadSchema = z
  .object({
    eventTime: isoDateTimeString,
    reason: z.enum(NEURO_ESCALATION_REASON_VALUES),
    providerNotified: z.boolean(),
    providerNotificationTime: isoDateTimeString,
    responseReceived: z.boolean(),
    responseTime: optionalIsoDateTime,
    rapidResponseActivated: z.boolean(),
    strokeAlertActivated: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (!data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required for neuro escalation",
        path: ["providerNotified"],
      });
    }
  });

export const postThrombolyticMonitoringPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    therapy: z.enum(POST_THROMBOLYTIC_THERAPY_VALUES),
    bloodPressure: bp,
    heartRate: hr,
    neuroStatusStable: z.boolean(),
    bleedingObserved: z.boolean(),
    headachePresent: z.boolean(),
    bpWithinParameters: z.enum(PROC_YES_NO_VALUES),
    neuroChangePresent: z.enum(PROC_YES_NO_VALUES),
    bleedingConcern: z.enum(PROC_YES_NO_VALUES),
    providerNotified: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.bleedingObserved && !data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required when bleeding observed",
        path: ["providerNotified"],
      });
    }
    if (data.bleedingConcern === "YES" && !data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required when bleeding concern",
        path: ["providerNotified"],
      });
    }
    if (data.neuroChangePresent === "YES" && !data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required when neuro change present",
        path: ["providerNotified"],
      });
    }
    if (data.bpWithinParameters === "NO" && !data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required when BP outside parameters",
        path: ["providerNotified"],
      });
    }
  });

export const frequentNeuroReassessmentPayloadSchema = z.object({
  assessmentTime: isoDateTimeString,
  frequency: z.enum(FREQUENT_NEURO_FREQUENCY_VALUES),
  neuroStatus: z.enum(FREQUENT_NEURO_STATUS_VALUES),
  providerNotified: z.boolean(),
  notes: optionalNotes,
});

const PAYLOAD_SCHEMA_BY_CARD_ID: Record<string, z.ZodType<Record<string, unknown>>> = {
  [NIHSS_REASSESSMENT_CARD_ID]: nihssReassessmentPayloadSchema,
  [NEURO_CHECKS_CARD_ID]: edoc11NeuroChecksPayloadSchema,
  [GLASGOW_COMA_SCALE_CARD_ID]: glasgowComaScalePayloadSchema,
  [PUPILLARY_ASSESSMENT_CARD_ID]: pupillaryAssessmentPayloadSchema,
  [MOTOR_STRENGTH_ASSESSMENT_CARD_ID]: motorStrengthAssessmentPayloadSchema,
  [NEURO_ESCALATION_EVENT_CARD_ID]: neuroEscalationEventPayloadSchema,
  [POST_THROMBOLYTIC_MONITORING_CARD_ID]: postThrombolyticMonitoringPayloadSchema,
  [FREQUENT_NEURO_REASSESSMENT_CARD_ID]: frequentNeuroReassessmentPayloadSchema,
};

export function isEdoc11StrokeNeuroReassessmentCardId(
  cardId: string
): cardId is Edoc11StrokeNeuroReassessmentCardId {
  return (EDOC11_STROKE_NEURO_REASSESSMENT_CARD_IDS as readonly string[]).includes(cardId);
}

export function validateStrokeNeuroReassessmentPayloadForCard(
  cardId: string,
  payload: Record<string, unknown>
): { ok: true; data: Record<string, unknown> } | { ok: false; message: string } {
  const schema = PAYLOAD_SCHEMA_BY_CARD_ID[cardId];
  if (!schema) {
    return { ok: false, message: "Card is not available for structured save" };
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: "Invalid clinical documentation payload" };
  }
  return { ok: true, data: parsed.data as Record<string, unknown> };
}

const GCS_SEVERITY_EN: Record<string, string> = {
  MILD: "Mild (13–15)",
  MODERATE: "Moderate (9–12)",
  SEVERE: "Severe (≤8)",
};
const GCS_SEVERITY_FR: Record<string, string> = {
  MILD: "Léger (13–15)",
  MODERATE: "Modéré (9–12)",
  SEVERE: "Sévère (≤8)",
};

const ESCALATION_REASON_EN = Object.fromEntries(
  NEURO_ESCALATION_REASON_OPTIONS.map((o) => [o.value, o.labelEn])
);
const ESCALATION_REASON_FR = Object.fromEntries(
  NEURO_ESCALATION_REASON_OPTIONS.map((o) => [o.value, o.labelFr])
);

export function summarizeStrokeNeuroReassessmentPayload(
  cardId: string,
  payload: Record<string, unknown>,
  locale: ClinicalDocumentationSummaryLocale
): Array<{ key: string; value: string }> {
  switch (cardId) {
    case NIHSS_REASSESSMENT_CARD_ID: {
      const p = nihssReassessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const lines: Array<{ key: string; value: string }> = [
        {
          key: locale === "en" ? "NIHSS total" : "NIHSS total",
          value: String(p.data.totalScore),
        },
      ];
      if (p.data.previousScore != null) {
        lines.push({
          key: locale === "en" ? "Previous score" : "Score précédent",
          value: String(p.data.previousScore),
        });
      }
      if (p.data.scoreChange != null) {
        lines.push({
          key: locale === "en" ? "Change" : "Variation",
          value: String(p.data.scoreChange),
        });
      }
      lines.push({
        key: locale === "en" ? "Provider notified" : "Médecin avisé",
        value: clinicalDocYesNo(p.data.providerNotified, locale),
      });
      return lines;
    }
    case NEURO_CHECKS_CARD_ID: {
      const p = edoc11NeuroChecksPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: locale === "en" ? "LOC" : "Conscience",
          value: pickLocalizedEnumLabel(
            Object.fromEntries(NEURO_CHECK_LOC_OPTIONS.map((o) => [o.value, o.labelEn])),
            Object.fromEntries(NEURO_CHECK_LOC_OPTIONS.map((o) => [o.value, o.labelFr])),
            p.data.levelOfConsciousness,
            locale
          ),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: clinicalDocYesNo(p.data.providerNotified, locale),
        },
      ];
    }
    case GLASGOW_COMA_SCALE_CARD_ID: {
      const p = glasgowComaScalePayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: locale === "en" ? "Total score" : "Score total",
          value: String(p.data.totalScore),
        },
        {
          key: locale === "en" ? "Severity" : "Sévérité",
          value: pickLocalizedEnumLabel(GCS_SEVERITY_EN, GCS_SEVERITY_FR, p.data.severityBand, locale),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: clinicalDocYesNo(p.data.providerNotified, locale),
        },
      ];
    }
    case PUPILLARY_ASSESSMENT_CARD_ID: {
      const p = pupillaryAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: locale === "en" ? "Left pupil" : "Pupille G",
          value: `${p.data.leftPupilSize} mm / ${pickLocalizedEnumLabel(
            Object.fromEntries(PUPIL_REACTION_OPTIONS.map((o) => [o.value, o.labelEn])),
            Object.fromEntries(PUPIL_REACTION_OPTIONS.map((o) => [o.value, o.labelFr])),
            p.data.leftReaction,
            locale
          )}`,
        },
        {
          key: locale === "en" ? "Right pupil" : "Pupille D",
          value: `${p.data.rightPupilSize} mm / ${pickLocalizedEnumLabel(
            Object.fromEntries(PUPIL_REACTION_OPTIONS.map((o) => [o.value, o.labelEn])),
            Object.fromEntries(PUPIL_REACTION_OPTIONS.map((o) => [o.value, o.labelFr])),
            p.data.rightReaction,
            locale
          )}`,
        },
      ];
    }
    case MOTOR_STRENGTH_ASSESSMENT_CARD_ID: {
      const p = motorStrengthAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        { key: "LUE", value: String(p.data.lue) },
        { key: "RUE", value: String(p.data.rue) },
        { key: "LLE", value: String(p.data.lle) },
        { key: "RLE", value: String(p.data.rle) },
      ];
    }
    case NEURO_ESCALATION_EVENT_CARD_ID: {
      const p = neuroEscalationEventPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: locale === "en" ? "Reason" : "Motif",
          value: pickLocalizedEnumLabel(
            ESCALATION_REASON_EN,
            ESCALATION_REASON_FR,
            p.data.reason,
            locale
          ),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: clinicalDocYesNo(p.data.providerNotified, locale),
        },
        {
          key: locale === "en" ? "Response received" : "Réponse reçue",
          value: clinicalDocYesNo(p.data.responseReceived, locale),
        },
      ];
    }
    case POST_THROMBOLYTIC_MONITORING_CARD_ID: {
      const p = postThrombolyticMonitoringPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: locale === "en" ? "Therapy" : "Thérapie",
          value: pickLocalizedEnumLabel(
            Object.fromEntries(POST_THROMBOLYTIC_THERAPY_OPTIONS.map((o) => [o.value, o.labelEn])),
            Object.fromEntries(POST_THROMBOLYTIC_THERAPY_OPTIONS.map((o) => [o.value, o.labelFr])),
            p.data.therapy,
            locale
          ),
        },
        {
          key: locale === "en" ? "Blood pressure" : "Tension artérielle",
          value: p.data.bloodPressure,
        },
        {
          key: locale === "en" ? "Neuro stable" : "Neuro stable",
          value: clinicalDocYesNo(p.data.neuroStatusStable, locale),
        },
        {
          key: locale === "en" ? "BP within parameters" : "TA dans les paramètres",
          value: p.data.bpWithinParameters === "YES"
            ? locale === "en" ? "Yes" : "Oui"
            : locale === "en" ? "No" : "Non",
        },
        {
          key: locale === "en" ? "Neuro change" : "Changement neuro",
          value: p.data.neuroChangePresent === "YES"
            ? locale === "en" ? "Yes" : "Oui"
            : locale === "en" ? "No" : "Non",
        },
        {
          key: locale === "en" ? "Bleeding concern" : "Préoccupation saignement",
          value: p.data.bleedingConcern === "YES"
            ? locale === "en" ? "Yes" : "Oui"
            : locale === "en" ? "No" : "Non",
        },
        {
          key: locale === "en" ? "Bleeding observed" : "Saignement observé",
          value: clinicalDocYesNo(p.data.bleedingObserved, locale),
        },
      ];
    }
    case FREQUENT_NEURO_REASSESSMENT_CARD_ID: {
      const p = frequentNeuroReassessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: locale === "en" ? "Frequency" : "Fréquence",
          value: pickLocalizedEnumLabel(
            Object.fromEntries(FREQUENT_NEURO_FREQUENCY_OPTIONS.map((o) => [o.value, o.labelEn])),
            Object.fromEntries(FREQUENT_NEURO_FREQUENCY_OPTIONS.map((o) => [o.value, o.labelFr])),
            p.data.frequency,
            locale
          ),
        },
        {
          key: locale === "en" ? "Neuro status" : "État neuro",
          value: pickLocalizedEnumLabel(
            Object.fromEntries(FREQUENT_NEURO_STATUS_OPTIONS.map((o) => [o.value, o.labelEn])),
            Object.fromEntries(FREQUENT_NEURO_STATUS_OPTIONS.map((o) => [o.value, o.labelFr])),
            p.data.neuroStatus,
            locale
          ),
        },
      ];
    }
    default:
      return [];
  }
}

/** Re-export NIHSS field keys for reassessment forms. */
export { NIHSS_SCORED_FIELD_KEYS, type NihssScoredFieldKey };
