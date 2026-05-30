import { z } from "zod";
import type { ClinicalDocumentationFieldOption } from "./clinicalDocumentationFieldOptions.js";
import {
  NIHSS_FIELD_OPTIONS,
  NIHSS_SCORED_FIELD_KEYS,
  type NihssScoredFieldKey,
} from "./clinicalDocumentationFieldOptions.js";
import {
  calculateGcsScore,
  deriveGcsSeverity,
  GCS_EYE_OPTIONS,
  GCS_MOTOR_OPTIONS,
  GCS_VERBAL_OPTIONS,
  PUPIL_REACTION_OPTIONS,
  PUPIL_REACTION_VALUES,
} from "./strokeNeuroReassessmentDocumentationPayloads.js";
import { calculateNihssTotal } from "./strokeDocumentationPayloads.js";
import {
  clinicalDocYesNo,
  type ClinicalDocumentationSummaryLocale,
} from "./clinicalDocumentationSummaryLocale.js";

/** EDOC.14 — neurological assessment & stroke documentation card IDs. */
export const NEUROLOGICAL_INITIAL_ASSESSMENT_CARD_ID = "neurological_initial_assessment" as const;
export const NEUROLOGICAL_REASSESSMENT_CARD_ID = "neurological_reassessment" as const;
export const GLASGOW_COMA_SCALE_ASSESSMENT_CARD_ID = "glasgow_coma_scale_assessment" as const;
export const STROKE_ALERT_EVENT_CARD_ID = "stroke_alert_event" as const;
export const NIHSS_ASSESSMENT_CARD_ID = "nihss_assessment" as const;
export const SEIZURE_EVENT_DOCUMENTATION_CARD_ID = "seizure_event_documentation" as const;
/** Distinct from EDOC.11 STROKE `post_thrombolytic_monitoring` (different schema/category). */
export const NEUROLOGICAL_POST_THROMBOLYTIC_MONITORING_CARD_ID =
  "neurological_post_thrombolytic_monitoring" as const;
export const NEUROLOGICAL_ESCALATION_EVENT_CARD_ID = "neurological_escalation_event" as const;

export const EDOC14_NEUROLOGICAL_DOCUMENTATION_CARD_IDS = [
  NEUROLOGICAL_INITIAL_ASSESSMENT_CARD_ID,
  NEUROLOGICAL_REASSESSMENT_CARD_ID,
  GLASGOW_COMA_SCALE_ASSESSMENT_CARD_ID,
  STROKE_ALERT_EVENT_CARD_ID,
  NIHSS_ASSESSMENT_CARD_ID,
  SEIZURE_EVENT_DOCUMENTATION_CARD_ID,
  NEUROLOGICAL_POST_THROMBOLYTIC_MONITORING_CARD_ID,
  NEUROLOGICAL_ESCALATION_EVENT_CARD_ID,
] as const;

export type Edoc14NeurologicalDocumentationCardId =
  (typeof EDOC14_NEUROLOGICAL_DOCUMENTATION_CARD_IDS)[number];

/**
 * Future Phase — EDOC.14A Stroke / Neuro Automation
 * Do not implement: stroke alert paging, neurology auto-notify, NIHSS trend alerts.
 */
export const EDOC_14A_FUTURE_STROKE_AUTOMATION = "EDOC.14A" as const;

/**
 * Future Phase — EDOC.14B Neuro ICU Monitoring
 * Do not implement: ICP, EVD, brain death, continuous EEG, neuro ICU hourly flowsheets.
 */
export const EDOC_14B_FUTURE_NEURO_ICU_MONITORING = "EDOC.14B" as const;

const optionalNotes = z.string().trim().max(2000).optional();
const optionalText = z.string().trim().max(500).optional();
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
const pupilSizeMm = z.coerce.number().int().min(1).max(10);
const bpSys = z.coerce.number().int().min(0).max(300);
const bpDia = z.coerce.number().int().min(0).max(200);
const durationMinutes = z.coerce.number().int().min(0).max(1440);

export const SPEECH_STATUS_VALUES = [
  "CLEAR",
  "SLURRED",
  "APHASIC",
  "NONVERBAL",
  "OTHER",
] as const;

export const FACIAL_SYMMETRY_VALUES = [
  "SYMMETRIC",
  "DROOP_LEFT",
  "DROOP_RIGHT",
  "UNABLE_TO_ASSESS",
] as const;

export const SENSATION_STATUS_VALUES = [
  "INTACT",
  "DECREASED",
  "ABSENT",
  "UNABLE_TO_ASSESS",
] as const;

export const NEURO_MENTAL_STATUS_VALUES = [
  "ALERT",
  "CONFUSED",
  "LETHARGIC",
  "OBTUNDED",
  "COMATOSE",
  "UNRESPONSIVE",
] as const;

export const GCS_SEVERITY_VALUES = ["MILD", "MODERATE", "SEVERE"] as const;

export const NIHSS_SEVERITY_VALUES = [
  "NO_STROKE",
  "MINOR",
  "MODERATE",
  "MODERATE_SEVERE",
  "SEVERE",
] as const;

export const SEIZURE_TYPE_VALUES = [
  "FOCAL",
  "GENERALIZED",
  "ABSENCE",
  "STATUS_EPILEPTICUS",
  "UNKNOWN",
  "OTHER",
] as const;

export const POSTICTAL_STATE_VALUES = [
  "NONE",
  "MILD",
  "MODERATE",
  "SEVERE",
  "UNABLE_TO_ASSESS",
] as const;

export const NEURO_STATUS_VALUES = [
  "STABLE",
  "IMPROVED",
  "UNCHANGED",
  "WORSENED",
] as const;

export const MOTOR_STRENGTH_GRADE_VALUES = [
  "0/5",
  "1/5",
  "2/5",
  "3/5",
  "4/5",
  "5/5",
  "UTA",
] as const;

export const MONITORING_INTERVAL_VALUES = ["15_MIN", "30_MIN", "60_MIN"] as const;

/** EDOC.14 pupil size range: clinically reasonable 1–10 mm. */
export const NEURO_PUPIL_SIZE_MM_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export { PUPIL_REACTION_VALUES };

const DETERIORATED_MENTAL_STATUSES = new Set<
  (typeof NEURO_MENTAL_STATUS_VALUES)[number]
>(["LETHARGIC", "OBTUNDED", "COMATOSE", "UNRESPONSIVE"]);

const ACUTE_SPEECH_DETERIORATION_TARGETS = new Set<
  (typeof SPEECH_STATUS_VALUES)[number]
>(["SLURRED", "APHASIC"]);

/** True when either documented pupil reaction is FIXED. */
export function hasFixedPupilDocumented(input: {
  leftPupilReaction: (typeof PUPIL_REACTION_VALUES)[number];
  rightPupilReaction: (typeof PUPIL_REACTION_VALUES)[number];
}): boolean {
  return input.leftPupilReaction === "FIXED" || input.rightPupilReaction === "FIXED";
}

/** True when prior speech was CLEAR and current speech is SLURRED or APHASIC. */
export function hasAcuteSpeechDeterioration(input: {
  priorSpeechStatus?: (typeof SPEECH_STATUS_VALUES)[number];
  speechStatus: (typeof SPEECH_STATUS_VALUES)[number];
}): boolean {
  return (
    input.priorSpeechStatus === "CLEAR" &&
    ACUTE_SPEECH_DETERIORATION_TARGETS.has(input.speechStatus)
  );
}

/** EDOC.14 reassessment — provider notification governance triggers. */
export function requiresNeurologicalReassessmentProviderNotification(input: {
  newDeficit: boolean;
  newUnilateralWeakness: boolean;
  mentalStatus: (typeof NEURO_MENTAL_STATUS_VALUES)[number];
  leftPupilReaction: (typeof PUPIL_REACTION_VALUES)[number];
  rightPupilReaction: (typeof PUPIL_REACTION_VALUES)[number];
  priorSpeechStatus?: (typeof SPEECH_STATUS_VALUES)[number];
  speechStatus: (typeof SPEECH_STATUS_VALUES)[number];
}): boolean {
  return (
    input.newDeficit ||
    input.newUnilateralWeakness ||
    DETERIORATED_MENTAL_STATUSES.has(input.mentalStatus) ||
    hasFixedPupilDocumented(input) ||
    hasAcuteSpeechDeterioration(input)
  );
}

function enumOptions<T extends string>(
  values: readonly T[],
  labels: Record<T, { en: string; fr: string }>
): ClinicalDocumentationFieldOption<T>[] {
  return values.map((value) => ({
    value,
    labelEn: labels[value].en,
    labelFr: labels[value].fr,
  }));
}

export const SPEECH_STATUS_OPTIONS = enumOptions(SPEECH_STATUS_VALUES, {
  CLEAR: { en: "Clear", fr: "Claire" },
  SLURRED: { en: "Slurred", fr: "Ébauchée" },
  APHASIC: { en: "Aphasic", fr: "Aphasique" },
  NONVERBAL: { en: "Non-verbal", fr: "Non verbal" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const FACIAL_SYMMETRY_OPTIONS = enumOptions(FACIAL_SYMMETRY_VALUES, {
  SYMMETRIC: { en: "Symmetric", fr: "Symétrique" },
  DROOP_LEFT: { en: "Droop left", fr: "Affaissement gauche" },
  DROOP_RIGHT: { en: "Droop right", fr: "Affaissement droit" },
  UNABLE_TO_ASSESS: { en: "Unable to assess", fr: "Non évaluable" },
});

export const SENSATION_STATUS_OPTIONS = enumOptions(SENSATION_STATUS_VALUES, {
  INTACT: { en: "Intact", fr: "Intacte" },
  DECREASED: { en: "Decreased", fr: "Diminuée" },
  ABSENT: { en: "Absent", fr: "Absente" },
  UNABLE_TO_ASSESS: { en: "Unable to assess", fr: "Non évaluable" },
});

export const NEURO_MENTAL_STATUS_OPTIONS = enumOptions(NEURO_MENTAL_STATUS_VALUES, {
  ALERT: { en: "Alert", fr: "Alerte" },
  CONFUSED: { en: "Confused", fr: "Confus" },
  LETHARGIC: { en: "Lethargic", fr: "Léthargique" },
  OBTUNDED: { en: "Obtunded", fr: "Obnubilé" },
  COMATOSE: { en: "Comatose", fr: "Comateux" },
  UNRESPONSIVE: { en: "Unresponsive", fr: "Non réactif" },
});

export const SEIZURE_TYPE_OPTIONS = enumOptions(SEIZURE_TYPE_VALUES, {
  FOCAL: { en: "Focal", fr: "Focale" },
  GENERALIZED: { en: "Generalized", fr: "Généralisée" },
  ABSENCE: { en: "Absence", fr: "Absence" },
  STATUS_EPILEPTICUS: { en: "Status epilepticus", fr: "État de mal épileptique" },
  UNKNOWN: { en: "Unknown", fr: "Inconnu" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const POSTICTAL_STATE_OPTIONS = enumOptions(POSTICTAL_STATE_VALUES, {
  NONE: { en: "None", fr: "Aucun" },
  MILD: { en: "Mild", fr: "Léger" },
  MODERATE: { en: "Moderate", fr: "Modéré" },
  SEVERE: { en: "Severe", fr: "Sévère" },
  UNABLE_TO_ASSESS: { en: "Unable to assess", fr: "Non évaluable" },
});

export const NEURO_STATUS_OPTIONS = enumOptions(NEURO_STATUS_VALUES, {
  STABLE: { en: "Stable", fr: "Stable" },
  IMPROVED: { en: "Improved", fr: "Amélioré" },
  UNCHANGED: { en: "Unchanged", fr: "Inchangé" },
  WORSENED: { en: "Worsened", fr: "Aggravé" },
});

export const MOTOR_STRENGTH_GRADE_OPTIONS = enumOptions(MOTOR_STRENGTH_GRADE_VALUES, {
  "0/5": { en: "0/5", fr: "0/5" },
  "1/5": { en: "1/5", fr: "1/5" },
  "2/5": { en: "2/5", fr: "2/5" },
  "3/5": { en: "3/5", fr: "3/5" },
  "4/5": { en: "4/5", fr: "4/5" },
  "5/5": { en: "5/5", fr: "5/5" },
  UTA: { en: "Unable to assess", fr: "Non évaluable" },
});

export const MONITORING_INTERVAL_OPTIONS = enumOptions(MONITORING_INTERVAL_VALUES, {
  "15_MIN": { en: "Every 15 min", fr: "Toutes les 15 min" },
  "30_MIN": { en: "Every 30 min", fr: "Toutes les 30 min" },
  "60_MIN": { en: "Every 60 min", fr: "Toutes les 60 min" },
});

export const NEURO_PUPIL_SIZE_MM_OPTIONS: ClinicalDocumentationFieldOption<number>[] =
  NEURO_PUPIL_SIZE_MM_VALUES.map((value) => ({
    value,
    labelEn: `${value} mm`,
    labelFr: `${value} mm`,
  }));

export { GCS_EYE_OPTIONS, GCS_VERBAL_OPTIONS, GCS_MOTOR_OPTIONS, NIHSS_FIELD_OPTIONS };
export { PUPIL_REACTION_OPTIONS };

export function calculateGcsTotal(input: {
  eyeOpening: 1 | 2 | 3 | 4;
  verbalResponse: 1 | 2 | 3 | 4 | 5;
  motorResponse: 1 | 2 | 3 | 4 | 5 | 6;
}): number {
  return calculateGcsScore({
    eye: input.eyeOpening,
    verbal: input.verbalResponse,
    motor: input.motorResponse,
  });
}

export { deriveGcsSeverity as deriveGcsSeverityBand };

export function deriveNihssSeverity(
  totalScore: number
): (typeof NIHSS_SEVERITY_VALUES)[number] {
  if (totalScore <= 0) return "NO_STROKE";
  if (totalScore <= 4) return "MINOR";
  if (totalScore <= 15) return "MODERATE";
  if (totalScore <= 20) return "MODERATE_SEVERE";
  return "SEVERE";
}

export { calculateNihssTotal };

export function hasClinicallySignificantGcsDecline(
  priorGcsTotal: number | undefined,
  calculatedTotal: number
): boolean {
  return priorGcsTotal != null && priorGcsTotal - calculatedTotal >= 2;
}

const structuredPupilFieldsSchema = {
  leftPupilSizeMm: pupilSizeMm,
  rightPupilSizeMm: pupilSizeMm,
  leftPupilReaction: z.enum(PUPIL_REACTION_VALUES),
  rightPupilReaction: z.enum(PUPIL_REACTION_VALUES),
};

function requireProviderTimeWhenNotified(
  data: { providerNotified: boolean; providerNotificationTime?: string },
  ctx: z.RefinementCtx
): void {
  if (data.providerNotified && !data.providerNotificationTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provider notification time required when provider notified",
      path: ["providerNotificationTime"],
    });
  }
}

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

export const neurologicalInitialAssessmentPayloadSchema = z.object({
  assessmentTime: isoDateTimeString,
  orientationPerson: z.boolean(),
  orientationPlace: z.boolean(),
  orientationTime: z.boolean(),
  orientationSituation: z.boolean(),
  speechStatus: z.enum(SPEECH_STATUS_VALUES),
  facialSymmetry: z.enum(FACIAL_SYMMETRY_VALUES),
  leftArmStrength: z.enum(MOTOR_STRENGTH_GRADE_VALUES),
  rightArmStrength: z.enum(MOTOR_STRENGTH_GRADE_VALUES),
  leftLegStrength: z.enum(MOTOR_STRENGTH_GRADE_VALUES),
  rightLegStrength: z.enum(MOTOR_STRENGTH_GRADE_VALUES),
  sensationStatus: z.enum(SENSATION_STATUS_VALUES),
  ...structuredPupilFieldsSchema,
  notes: optionalNotes,
});

export const neurologicalReassessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    mentalStatus: z.enum(NEURO_MENTAL_STATUS_VALUES),
    orientationChanged: z.boolean(),
    motorChanged: z.boolean(),
    sensoryChanged: z.boolean(),
    speechChanged: z.boolean(),
    priorSpeechStatus: z.enum(SPEECH_STATUS_VALUES).optional(),
    speechStatus: z.enum(SPEECH_STATUS_VALUES),
    pupilChanged: z.boolean(),
    ...structuredPupilFieldsSchema,
    newDeficit: z.boolean(),
    newUnilateralWeakness: z.boolean(),
    providerNotified: z.boolean(),
    providerNotificationTime: optionalIsoDateTime,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    const requiresNotification = requiresNeurologicalReassessmentProviderNotification(data);
    if (requiresNotification) {
      if (!data.providerNotified) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Provider notification required for fixed pupil, unilateral weakness, speech deterioration, new deficit, or mental status deterioration",
          path: ["providerNotified"],
        });
      }
      if (!data.providerNotificationTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Provider notification time required when reassessment triggers provider notification",
          path: ["providerNotificationTime"],
        });
      }
    } else {
      requireProviderTimeWhenNotified(data, ctx);
    }
  });

export const glasgowComaScaleAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    eyeOpening: z.union([z.literal(4), z.literal(3), z.literal(2), z.literal(1)]),
    verbalResponse: z.union([
      z.literal(5),
      z.literal(4),
      z.literal(3),
      z.literal(2),
      z.literal(1),
    ]),
    motorResponse: z.union([
      z.literal(6),
      z.literal(5),
      z.literal(4),
      z.literal(3),
      z.literal(2),
      z.literal(1),
    ]),
    calculatedTotal: z.coerce.number().int().min(3).max(15),
    severity: z.enum(GCS_SEVERITY_VALUES),
    priorGcsTotal: z.coerce.number().int().min(3).max(15).optional(),
    providerNotified: z.boolean(),
    providerNotificationTime: optionalIsoDateTime,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    const calculated = calculateGcsTotal({
      eyeOpening: data.eyeOpening,
      verbalResponse: data.verbalResponse,
      motorResponse: data.motorResponse,
    });
    if (data.calculatedTotal !== calculated) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "calculatedTotal must equal sum of GCS components",
        path: ["calculatedTotal"],
      });
    }
    const expectedSeverity = deriveGcsSeverity(calculated);
    if (data.severity !== expectedSeverity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "severity must match calculated GCS severity",
        path: ["severity"],
      });
    }
    if (
      hasClinicallySignificantGcsDecline(data.priorGcsTotal, data.calculatedTotal) &&
      !data.providerNotified
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required when GCS drops by 2 or more",
        path: ["providerNotified"],
      });
    }
    requireProviderTimeWhenNotified(data, ctx);
  });

export const strokeAlertEventPayloadSchema = z
  .object({
    lastKnownWell: isoDateTimeString,
    symptomOnsetTime: isoDateTimeString,
    strokeAlertActivated: z.boolean(),
    activationTime: optionalIsoDateTime,
    provider: z.string().trim().min(1).max(120),
    neurologyNotified: z.boolean(),
    ctOrdered: z.boolean(),
    thrombolyticCandidate: z.boolean(),
    contraindications: optionalText,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (!data.provider.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider required for stroke alert event",
        path: ["provider"],
      });
    }
    if (data.strokeAlertActivated) {
      if (!data.activationTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Activation time required when stroke alert is activated",
          path: ["activationTime"],
        });
      }
      if (!data.lastKnownWell) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Last known well required when stroke alert is activated",
          path: ["lastKnownWell"],
        });
      }
      if (!data.neurologyNotified) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Neurology notification required when stroke alert is activated",
          path: ["neurologyNotified"],
        });
      }
    }
  });

export const nihssAssessmentPayloadSchema = nihssCoreItemsSchema
  .extend({
    assessmentTime: isoDateTimeString,
    calculatedTotal: nihssItem(0, 42),
    severity: z.enum(NIHSS_SEVERITY_VALUES),
    priorNihssTotal: nihssItem(0, 42).optional(),
    providerNotified: z.boolean(),
    providerNotificationTime: optionalIsoDateTime,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    const calculated = calculateNihssTotal(data);
    if (data.calculatedTotal !== calculated) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "calculatedTotal must equal sum of NIHSS item scores",
        path: ["calculatedTotal"],
      });
    }
    const expectedSeverity = deriveNihssSeverity(calculated);
    if (data.severity !== expectedSeverity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "severity must match calculated NIHSS severity",
        path: ["severity"],
      });
    }
    if (
      data.priorNihssTotal != null &&
      data.calculatedTotal - data.priorNihssTotal >= 4 &&
      !data.providerNotified
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required when NIHSS increases by 4 or more",
        path: ["providerNotified"],
      });
    }
    requireProviderTimeWhenNotified(data, ctx);
  });

export const seizureEventDocumentationPayloadSchema = z
  .object({
    witnessed: z.boolean(),
    startTime: isoDateTimeString,
    endTime: isoDateTimeString,
    durationMinutes,
    seizureType: z.enum(SEIZURE_TYPE_VALUES),
    auraPresent: z.boolean(),
    incontinence: z.boolean(),
    injury: z.boolean(),
    postictalState: z.enum(POSTICTAL_STATE_VALUES),
    benzodiazepineAdministered: z.boolean(),
    rescueMedicationGiven: z.boolean(),
    providerNotified: z.boolean(),
    providerNotificationTime: isoDateTimeString,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (!data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required for seizure event",
        path: ["providerNotified"],
      });
    }
  });

export const neurologicalPostThrombolyticMonitoringPayloadSchema = z
  .object({
    administrationTime: isoDateTimeString,
    monitoringInterval: z.enum(MONITORING_INTERVAL_VALUES),
    neuroStatus: z.enum(NEURO_STATUS_VALUES),
    systolicBp: bpSys,
    diastolicBp: bpDia,
    bleedingSigns: z.boolean(),
    neurologicalWorsening: z.boolean(),
    providerNotified: z.boolean(),
    providerNotificationTime: optionalIsoDateTime,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if ((data.bleedingSigns || data.neurologicalWorsening) && !data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required for bleeding or neuro worsening",
        path: ["providerNotified"],
      });
    }
    requireProviderTimeWhenNotified(data, ctx);
  });

export const neurologicalEscalationEventPayloadSchema = z
  .object({
    eventTime: isoDateTimeString,
    newDeficit: z.boolean(),
    mentalStatusDecline: z.boolean(),
    gcsDrop: z.boolean(),
    pupilChange: z.boolean(),
    leftPupilSizeMm: pupilSizeMm.optional(),
    rightPupilSizeMm: pupilSizeMm.optional(),
    leftPupilReaction: z.enum(PUPIL_REACTION_VALUES).optional(),
    rightPupilReaction: z.enum(PUPIL_REACTION_VALUES).optional(),
    strokeSymptoms: z.boolean(),
    providerNotified: z.boolean(),
    providerNotificationTime: isoDateTimeString,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (!data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required for neurological escalation",
        path: ["providerNotified"],
      });
    }
    if (data.pupilChange) {
      if (data.leftPupilSizeMm == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Left pupil size required when pupil change documented",
          path: ["leftPupilSizeMm"],
        });
      }
      if (data.rightPupilSizeMm == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Right pupil size required when pupil change documented",
          path: ["rightPupilSizeMm"],
        });
      }
      if (!data.leftPupilReaction) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Left pupil reaction required when pupil change documented",
          path: ["leftPupilReaction"],
        });
      }
      if (!data.rightPupilReaction) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Right pupil reaction required when pupil change documented",
          path: ["rightPupilReaction"],
        });
      }
    }
  });

const PAYLOAD_SCHEMA_BY_CARD_ID: Record<string, z.ZodType<Record<string, unknown>>> = {
  [NEUROLOGICAL_INITIAL_ASSESSMENT_CARD_ID]: neurologicalInitialAssessmentPayloadSchema,
  [NEUROLOGICAL_REASSESSMENT_CARD_ID]: neurologicalReassessmentPayloadSchema,
  [GLASGOW_COMA_SCALE_ASSESSMENT_CARD_ID]: glasgowComaScaleAssessmentPayloadSchema,
  [STROKE_ALERT_EVENT_CARD_ID]: strokeAlertEventPayloadSchema,
  [NIHSS_ASSESSMENT_CARD_ID]: nihssAssessmentPayloadSchema,
  [SEIZURE_EVENT_DOCUMENTATION_CARD_ID]: seizureEventDocumentationPayloadSchema,
  [NEUROLOGICAL_POST_THROMBOLYTIC_MONITORING_CARD_ID]:
    neurologicalPostThrombolyticMonitoringPayloadSchema,
  [NEUROLOGICAL_ESCALATION_EVENT_CARD_ID]: neurologicalEscalationEventPayloadSchema,
};

export function isEdoc14NeurologicalDocumentationCardId(
  cardId: string
): cardId is Edoc14NeurologicalDocumentationCardId {
  return (EDOC14_NEUROLOGICAL_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId);
}

export function validateNeurologicalDocumentationPayloadForCard(
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

const NIHSS_SEVERITY_EN: Record<string, string> = {
  NO_STROKE: "No stroke (0)",
  MINOR: "Minor (1–4)",
  MODERATE: "Moderate (5–15)",
  MODERATE_SEVERE: "Moderate–severe (16–20)",
  SEVERE: "Severe (21–42)",
};
const NIHSS_SEVERITY_FR: Record<string, string> = {
  NO_STROKE: "Aucun AVC (0)",
  MINOR: "Mineur (1–4)",
  MODERATE: "Modéré (5–15)",
  MODERATE_SEVERE: "Modéré–sévère (16–20)",
  SEVERE: "Sévère (21–42)",
};
const GCS_SEVERITY_EN: Record<string, string> = {
  MILD: "Mild (13–15)",
  MODERATE: "Moderate (9–12)",
  SEVERE: "Severe (3–8)",
};
const GCS_SEVERITY_FR: Record<string, string> = {
  MILD: "Léger (13–15)",
  MODERATE: "Modéré (9–12)",
  SEVERE: "Sévère (3–8)",
};

const PROVIDER_NOTIFICATION_KEY = {
  en: "Provider notification",
  fr: "Notification médecin",
} as const;

export function summarizeNeurologicalDocumentationPayload(
  cardId: string,
  payload: Record<string, unknown>,
  locale: ClinicalDocumentationSummaryLocale
): Array<{ key: string; value: string }> {
  switch (cardId) {
    case NEUROLOGICAL_INITIAL_ASSESSMENT_CARD_ID: {
      const p = neurologicalInitialAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      const oriented = [
        d.orientationPerson,
        d.orientationPlace,
        d.orientationTime,
        d.orientationSituation,
      ].filter(Boolean).length;
      return [
        {
          key: locale === "en" ? "Orientation" : "Orientation",
          value: `×${oriented}/4`,
        },
      ];
    }
    case NEUROLOGICAL_REASSESSMENT_CARD_ID: {
      const p = neurologicalReassessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "New deficit" : "Nouveau déficit",
          value: clinicalDocYesNo(d.newDeficit, locale),
        },
        {
          key: PROVIDER_NOTIFICATION_KEY[locale],
          value: clinicalDocYesNo(d.providerNotified, locale),
        },
      ];
    }
    case GLASGOW_COMA_SCALE_ASSESSMENT_CARD_ID: {
      const p = glasgowComaScaleAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "GCS total" : "Total GCS",
          value: String(d.calculatedTotal),
        },
        {
          key: locale === "en" ? "GCS severity" : "Sévérité GCS",
          value: locale === "en" ? GCS_SEVERITY_EN[d.severity]! : GCS_SEVERITY_FR[d.severity]!,
        },
        {
          key: PROVIDER_NOTIFICATION_KEY[locale],
          value: clinicalDocYesNo(d.providerNotified, locale),
        },
      ];
    }
    case STROKE_ALERT_EVENT_CARD_ID: {
      const p = strokeAlertEventPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Stroke alert activated" : "Alerte AVC activée",
          value: clinicalDocYesNo(d.strokeAlertActivated, locale),
        },
        {
          key: PROVIDER_NOTIFICATION_KEY[locale],
          value: clinicalDocYesNo(d.neurologyNotified, locale),
        },
      ];
    }
    case NIHSS_ASSESSMENT_CARD_ID: {
      const p = nihssAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "NIHSS total" : "Total NIHSS",
          value: String(d.calculatedTotal),
        },
        {
          key: locale === "en" ? "NIHSS severity" : "Sévérité NIHSS",
          value:
            locale === "en"
              ? NIHSS_SEVERITY_EN[d.severity]!
              : NIHSS_SEVERITY_FR[d.severity]!,
        },
        {
          key: PROVIDER_NOTIFICATION_KEY[locale],
          value: clinicalDocYesNo(d.providerNotified, locale),
        },
      ];
    }
    case SEIZURE_EVENT_DOCUMENTATION_CARD_ID: {
      const p = seizureEventDocumentationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Seizure duration" : "Durée crise",
          value: `${d.durationMinutes} min`,
        },
        {
          key: PROVIDER_NOTIFICATION_KEY[locale],
          value: clinicalDocYesNo(d.providerNotified, locale),
        },
      ];
    }
    case NEUROLOGICAL_POST_THROMBOLYTIC_MONITORING_CARD_ID: {
      const p = neurologicalPostThrombolyticMonitoringPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: PROVIDER_NOTIFICATION_KEY[locale],
          value: clinicalDocYesNo(d.providerNotified, locale),
        },
      ];
    }
    case NEUROLOGICAL_ESCALATION_EVENT_CARD_ID: {
      const p = neurologicalEscalationEventPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: PROVIDER_NOTIFICATION_KEY[locale],
          value: clinicalDocYesNo(d.providerNotified, locale),
        },
      ];
    }
    default:
      return [];
  }
}

export type { NihssScoredFieldKey };
