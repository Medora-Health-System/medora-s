import { z } from "zod";
import type { ClinicalDocumentationFieldOption } from "./clinicalDocumentationFieldOptions.js";
import {
  pickLocalizedEnumLabel,
  type ClinicalDocumentationSummaryLocale,
} from "./clinicalDocumentationSummaryLocale.js";

/** EDOC.22 — patient education & discharge teaching card IDs. */
export const PATIENT_EDUCATION_SESSION_CARD_ID = "patient_education_session" as const;
export const CAREGIVER_EDUCATION_SESSION_CARD_ID = "caregiver_education_session" as const;
export const MEDICATION_EDUCATION_REVIEW_CARD_ID = "medication_education_review" as const;
export const DISCHARGE_INSTRUCTION_REVIEW_CARD_ID = "discharge_instruction_review" as const;
export const TEACH_BACK_VERIFICATION_CARD_ID = "teach_back_verification" as const;
export const FOLLOW_UP_REVIEW_CARD_ID = "follow_up_review" as const;
export const EQUIPMENT_EDUCATION_CARD_ID = "equipment_education" as const;
export const DISEASE_SPECIFIC_EDUCATION_CARD_ID = "disease_specific_education" as const;
export const LEARNING_BARRIER_ASSESSMENT_CARD_ID = "learning_barrier_assessment" as const;
export const EDUCATION_REFUSAL_OR_INABILITY_CARD_ID = "education_refusal_or_inability" as const;

export const EDOC22_PATIENT_EDUCATION_DISCHARGE_TEACHING_DOCUMENTATION_CARD_IDS = [
  PATIENT_EDUCATION_SESSION_CARD_ID,
  CAREGIVER_EDUCATION_SESSION_CARD_ID,
  MEDICATION_EDUCATION_REVIEW_CARD_ID,
  DISCHARGE_INSTRUCTION_REVIEW_CARD_ID,
  TEACH_BACK_VERIFICATION_CARD_ID,
  FOLLOW_UP_REVIEW_CARD_ID,
  EQUIPMENT_EDUCATION_CARD_ID,
  DISEASE_SPECIFIC_EDUCATION_CARD_ID,
  LEARNING_BARRIER_ASSESSMENT_CARD_ID,
  EDUCATION_REFUSAL_OR_INABILITY_CARD_ID,
] as const;

export type Edoc22PatientEducationDischargeTeachingDocumentationCardId =
  (typeof EDOC22_PATIENT_EDUCATION_DISCHARGE_TEACHING_DOCUMENTATION_CARD_IDS)[number];

/** Future Phase — EDOC.22A Patient Education Automation & Handout Integration */
export const EDOC_22A_FUTURE_PATIENT_EDUCATION_AUTOMATION = "EDOC.22A" as const;

export const EDU_YES_NO_VALUES = ["YES", "NO"] as const;
export const EDU_YES_NO_UNKNOWN_VALUES = ["YES", "NO", "UNKNOWN"] as const;
export const EDU_UNDERSTANDING_VALUES = ["YES", "NO", "PARTIAL"] as const;
export const EDU_TEACH_BACK_STATUS_VALUES = ["YES", "NO", "PARTIAL"] as const;

export const EDU_PATIENT_TOPIC_VALUES = [
  "MEDICATIONS",
  "DISEASE_PROCESS",
  "SAFETY",
  "WOUND_CARE",
  "RESPIRATORY_CARE",
  "DIABETES",
  "CARDIAC",
  "RENAL",
  "DIET",
  "MOBILITY",
  "OTHER",
] as const;

export const EDU_AUDIENCE_VALUES = ["PATIENT", "PATIENT_AND_FAMILY"] as const;

export const EDU_CAREGIVER_RELATIONSHIP_VALUES = [
  "SPOUSE",
  "PARENT",
  "CHILD",
  "SIBLING",
  "FRIEND",
  "LEGAL_GUARDIAN",
  "OTHER",
] as const;

export const EDU_CAREGIVER_TOPIC_VALUES = [
  "MEDICATIONS",
  "SAFETY",
  "WOUND_CARE",
  "FOLLOW_UP",
  "MOBILITY",
  "EQUIPMENT",
  "OTHER",
] as const;

export const EDU_TEACH_BACK_TOPIC_VALUES = [
  "MEDICATIONS",
  "DISCHARGE",
  "SAFETY",
  "WOUND_CARE",
  "DISEASE_PROCESS",
  "FOLLOW_UP",
  "OTHER",
] as const;

export const EDU_EQUIPMENT_TYPE_VALUES = [
  "OXYGEN",
  "WALKER",
  "WHEELCHAIR",
  "CPAP_BIPAP",
  "WOUND_DEVICE",
  "OSTOMY_SUPPLIES",
  "OTHER",
] as const;

export const EDU_DISEASE_CONDITION_VALUES = [
  "DIABETES",
  "CHF",
  "COPD",
  "ASTHMA",
  "STROKE",
  "SEPSIS",
  "RENAL_DISEASE",
  "WOUND_CARE",
  "OTHER",
] as const;

export const EDU_BARRIER_TYPE_VALUES = [
  "LANGUAGE",
  "HEARING",
  "VISION",
  "COGNITIVE",
  "LITERACY",
  "EMOTIONAL",
  "CULTURAL",
  "OTHER",
  "NONE",
] as const;

export const EDU_REFUSAL_REASON_VALUES = [
  "PATIENT_REFUSED",
  "COGNITIVE_LIMITATION",
  "LANGUAGE_BARRIER",
  "MEDICAL_CONDITION",
  "NO_CAREGIVER_AVAILABLE",
  "OTHER",
] as const;

const optionalNotes = z.string().trim().max(2000).optional();
const isoDateTimeString = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date/time" });

const eduYesNo = z.enum(EDU_YES_NO_VALUES);
const eduYesNoUnknown = z.enum(EDU_YES_NO_UNKNOWN_VALUES);
const eduUnderstanding = z.enum(EDU_UNDERSTANDING_VALUES);
const eduTeachBackStatus = z.enum(EDU_TEACH_BACK_STATUS_VALUES);

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

function labelMap<T extends string>(options: ClinicalDocumentationFieldOption<T>[]) {
  return {
    en: Object.fromEntries(options.map((o) => [o.value, o.labelEn])),
    fr: Object.fromEntries(options.map((o) => [o.value, o.labelFr])),
  };
}

export function eduDocYesNoLabel(
  value: (typeof EDU_YES_NO_VALUES)[number],
  locale: ClinicalDocumentationSummaryLocale
): string {
  return value === "YES" ? (locale === "en" ? "Yes" : "Oui") : locale === "en" ? "No" : "Non";
}

export function eduDocUnderstandingLabel(
  value: (typeof EDU_UNDERSTANDING_VALUES)[number],
  locale: ClinicalDocumentationSummaryLocale
): string {
  if (value === "YES") return locale === "en" ? "Yes" : "Oui";
  if (value === "NO") return locale === "en" ? "No" : "Non";
  return locale === "en" ? "Partial" : "Partiel";
}

export const EDU_YES_NO_OPTIONS = enumOptions(EDU_YES_NO_VALUES, {
  YES: { en: "Yes", fr: "Oui" },
  NO: { en: "No", fr: "Non" },
});

export const EDU_YES_NO_UNKNOWN_OPTIONS = enumOptions(EDU_YES_NO_UNKNOWN_VALUES, {
  YES: { en: "Yes", fr: "Oui" },
  NO: { en: "No", fr: "Non" },
  UNKNOWN: { en: "Unknown", fr: "Inconnu" },
});

export const EDU_UNDERSTANDING_OPTIONS = enumOptions(EDU_UNDERSTANDING_VALUES, {
  YES: { en: "Yes", fr: "Oui" },
  NO: { en: "No", fr: "Non" },
  PARTIAL: { en: "Partial", fr: "Partiel" },
});

export const EDU_TEACH_BACK_STATUS_OPTIONS = enumOptions(EDU_TEACH_BACK_STATUS_VALUES, {
  YES: { en: "Yes", fr: "Oui" },
  NO: { en: "No", fr: "Non" },
  PARTIAL: { en: "Partial", fr: "Partiel" },
});

export const EDU_PATIENT_TOPIC_OPTIONS = enumOptions(EDU_PATIENT_TOPIC_VALUES, {
  MEDICATIONS: { en: "Medications", fr: "Médicaments" },
  DISEASE_PROCESS: { en: "Disease process", fr: "Processus pathologique" },
  SAFETY: { en: "Safety", fr: "Sécurité" },
  WOUND_CARE: { en: "Wound care", fr: "Soins de plaie" },
  RESPIRATORY_CARE: { en: "Respiratory care", fr: "Soins respiratoires" },
  DIABETES: { en: "Diabetes", fr: "Diabète" },
  CARDIAC: { en: "Cardiac", fr: "Cardiaque" },
  RENAL: { en: "Renal", fr: "Rénal" },
  DIET: { en: "Diet", fr: "Régime alimentaire" },
  MOBILITY: { en: "Mobility", fr: "Mobilité" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const EDU_AUDIENCE_OPTIONS = enumOptions(EDU_AUDIENCE_VALUES, {
  PATIENT: { en: "Patient", fr: "Patient" },
  PATIENT_AND_FAMILY: { en: "Patient and family", fr: "Patient et famille" },
});

export const EDU_CAREGIVER_RELATIONSHIP_OPTIONS = enumOptions(EDU_CAREGIVER_RELATIONSHIP_VALUES, {
  SPOUSE: { en: "Spouse", fr: "Conjoint(e)" },
  PARENT: { en: "Parent", fr: "Parent" },
  CHILD: { en: "Child", fr: "Enfant" },
  SIBLING: { en: "Sibling", fr: "Frère/sœur" },
  FRIEND: { en: "Friend", fr: "Ami(e)" },
  LEGAL_GUARDIAN: { en: "Legal guardian", fr: "Tuteur légal" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const EDU_CAREGIVER_TOPIC_OPTIONS = enumOptions(EDU_CAREGIVER_TOPIC_VALUES, {
  MEDICATIONS: { en: "Medications", fr: "Médicaments" },
  SAFETY: { en: "Safety", fr: "Sécurité" },
  WOUND_CARE: { en: "Wound care", fr: "Soins de plaie" },
  FOLLOW_UP: { en: "Follow-up", fr: "Suivi" },
  MOBILITY: { en: "Mobility", fr: "Mobilité" },
  EQUIPMENT: { en: "Equipment", fr: "Équipement" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const EDU_TEACH_BACK_TOPIC_OPTIONS = enumOptions(EDU_TEACH_BACK_TOPIC_VALUES, {
  MEDICATIONS: { en: "Medications", fr: "Médicaments" },
  DISCHARGE: { en: "Discharge", fr: "Congé" },
  SAFETY: { en: "Safety", fr: "Sécurité" },
  WOUND_CARE: { en: "Wound care", fr: "Soins de plaie" },
  DISEASE_PROCESS: { en: "Disease process", fr: "Processus pathologique" },
  FOLLOW_UP: { en: "Follow-up", fr: "Suivi" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const EDU_EQUIPMENT_TYPE_OPTIONS = enumOptions(EDU_EQUIPMENT_TYPE_VALUES, {
  OXYGEN: { en: "Oxygen", fr: "Oxygène" },
  WALKER: { en: "Walker", fr: "Déambulateur" },
  WHEELCHAIR: { en: "Wheelchair", fr: "Fauteuil roulant" },
  CPAP_BIPAP: { en: "CPAP/BiPAP", fr: "CPAP/BiPAP" },
  WOUND_DEVICE: { en: "Wound device", fr: "Dispositif de plaie" },
  OSTOMY_SUPPLIES: { en: "Ostomy supplies", fr: "Fournitures stomie" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const EDU_DISEASE_CONDITION_OPTIONS = enumOptions(EDU_DISEASE_CONDITION_VALUES, {
  DIABETES: { en: "Diabetes", fr: "Diabète" },
  CHF: { en: "CHF", fr: "Insuffisance cardiaque" },
  COPD: { en: "COPD", fr: "BPCO" },
  ASTHMA: { en: "Asthma", fr: "Asthme" },
  STROKE: { en: "Stroke", fr: "AVC" },
  SEPSIS: { en: "Sepsis", fr: "Sepsis" },
  RENAL_DISEASE: { en: "Renal disease", fr: "Maladie rénale" },
  WOUND_CARE: { en: "Wound care", fr: "Soins de plaie" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const EDU_BARRIER_TYPE_OPTIONS = enumOptions(EDU_BARRIER_TYPE_VALUES, {
  LANGUAGE: { en: "Language", fr: "Langue" },
  HEARING: { en: "Hearing", fr: "Audition" },
  VISION: { en: "Vision", fr: "Vision" },
  COGNITIVE: { en: "Cognitive", fr: "Cognitif" },
  LITERACY: { en: "Literacy", fr: "Littératie" },
  EMOTIONAL: { en: "Emotional", fr: "Émotionnel" },
  CULTURAL: { en: "Cultural", fr: "Culturel" },
  OTHER: { en: "Other", fr: "Autre" },
  NONE: { en: "None", fr: "Aucun" },
});

export const EDU_REFUSAL_REASON_OPTIONS = enumOptions(EDU_REFUSAL_REASON_VALUES, {
  PATIENT_REFUSED: { en: "Patient refused", fr: "Refus du patient" },
  COGNITIVE_LIMITATION: { en: "Cognitive limitation", fr: "Limitation cognitive" },
  LANGUAGE_BARRIER: { en: "Language barrier", fr: "Barrière linguistique" },
  MEDICAL_CONDITION: { en: "Medical condition", fr: "Condition médicale" },
  NO_CAREGIVER_AVAILABLE: { en: "No caregiver available", fr: "Aucun aidant disponible" },
  OTHER: { en: "Other", fr: "Autre" },
});

const PATIENT_TOPIC_MAP = labelMap(EDU_PATIENT_TOPIC_OPTIONS);
const AUDIENCE_MAP = labelMap(EDU_AUDIENCE_OPTIONS);
const TEACH_BACK_TOPIC_MAP = labelMap(EDU_TEACH_BACK_TOPIC_OPTIONS);
const EQUIPMENT_TYPE_MAP = labelMap(EDU_EQUIPMENT_TYPE_OPTIONS);
const DISEASE_CONDITION_MAP = labelMap(EDU_DISEASE_CONDITION_OPTIONS);
const BARRIER_TYPE_MAP = labelMap(EDU_BARRIER_TYPE_OPTIONS);
const REFUSAL_REASON_MAP = labelMap(EDU_REFUSAL_REASON_OPTIONS);

function requireProviderNotified(
  data: { providerNotified: (typeof EDU_YES_NO_VALUES)[number] },
  ctx: z.RefinementCtx,
  message: string
) {
  if (data.providerNotified !== "YES") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ["providerNotified"] });
  }
}

function requireNotesWhenOther(
  topic: string,
  notes: string | undefined,
  ctx: z.RefinementCtx,
  path: string
) {
  if (topic === "OTHER" && !notes?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "notes required when OTHER selected", path: ["notes"] });
  }
}

export const patientEducationSessionPayloadSchema = z
  .object({
    educationTime: isoDateTimeString,
    topic: z.enum(EDU_PATIENT_TOPIC_VALUES),
    audience: z.enum(EDU_AUDIENCE_VALUES),
    interpreterUsed: eduYesNo,
    educationProvided: eduYesNo,
    understandingDemonstrated: eduUnderstanding,
    providerNotified: eduYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.educationProvided !== "YES") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "educationProvided must be YES",
        path: ["educationProvided"],
      });
    }
    requireNotesWhenOther(data.topic, data.notes, ctx, "notes");
  });

export const caregiverEducationSessionPayloadSchema = z
  .object({
    educationTime: isoDateTimeString,
    caregiverPresent: eduYesNo,
    caregiverRelationship: z.enum(EDU_CAREGIVER_RELATIONSHIP_VALUES),
    educationTopic: z.enum(EDU_CAREGIVER_TOPIC_VALUES),
    teachBackCompleted: eduYesNo,
    understandingDemonstrated: eduUnderstanding,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.caregiverPresent !== "YES") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "caregiverPresent must be YES",
        path: ["caregiverPresent"],
      });
    }
    if (data.caregiverRelationship === "OTHER") {
      requireNotesWhenOther("OTHER", data.notes, ctx, "notes");
    }
  });

export const medicationEducationReviewPayloadSchema = z
  .object({
    reviewTime: isoDateTimeString,
    medicationsReviewed: eduYesNo,
    highRiskMedicationIncluded: eduYesNo,
    sideEffectsReviewed: eduYesNo,
    adherenceDiscussed: eduYesNo,
    teachBackCompleted: eduYesNo,
    understandingDemonstrated: eduUnderstanding,
    providerNotified: eduYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.medicationsReviewed !== "YES") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "medicationsReviewed must be YES",
        path: ["medicationsReviewed"],
      });
    }
  });

export const dischargeInstructionReviewPayloadSchema = z
  .object({
    reviewTime: isoDateTimeString,
    instructionsReviewed: eduYesNo,
    warningSignsReviewed: eduYesNo,
    activityRestrictionsReviewed: eduYesNo,
    dietInstructionsReviewed: eduYesNo,
    followUpReviewed: eduYesNo,
    teachBackCompleted: eduYesNo,
    understandingDemonstrated: eduUnderstanding,
    providerNotified: eduYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.instructionsReviewed !== "YES") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "instructionsReviewed must be YES",
        path: ["instructionsReviewed"],
      });
    }
    if (data.understandingDemonstrated === "NO" || data.understandingDemonstrated === "PARTIAL") {
      requireProviderNotified(data, ctx, "Provider notification required for understanding concern");
    }
  });

export const teachBackVerificationPayloadSchema = z
  .object({
    verificationTime: isoDateTimeString,
    topicReviewed: z.enum(EDU_TEACH_BACK_TOPIC_VALUES),
    teachBackSuccessful: eduTeachBackStatus,
    additionalEducationRequired: eduYesNo,
    providerNotified: eduYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.teachBackSuccessful !== "YES" && data.additionalEducationRequired !== "YES") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "additionalEducationRequired must be YES when teach-back not successful",
        path: ["additionalEducationRequired"],
      });
    }
    if (data.teachBackSuccessful !== "YES") {
      requireProviderNotified(data, ctx, "Provider notification required for unsuccessful teach-back");
    }
    requireNotesWhenOther(data.topicReviewed, data.notes, ctx, "notes");
  });

export const followUpReviewPayloadSchema = z
  .object({
    reviewTime: isoDateTimeString,
    followUpDiscussed: eduYesNo,
    appointmentNeeded: eduYesNo,
    appointmentScheduled: eduYesNoUnknown,
    specialistFollowUpNeeded: eduYesNo,
    transportationConcern: eduYesNo,
    providerNotified: eduYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.appointmentNeeded === "YES" && data.appointmentScheduled === "NO") {
      requireProviderNotified(data, ctx, "Provider notification required when appointment not scheduled");
    }
  });

export const equipmentEducationPayloadSchema = z
  .object({
    educationTime: isoDateTimeString,
    equipmentType: z.enum(EDU_EQUIPMENT_TYPE_VALUES),
    demonstrationProvided: eduYesNo,
    returnDemonstrationCompleted: eduYesNo,
    understandingDemonstrated: eduUnderstanding,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    requireNotesWhenOther(data.equipmentType, data.notes, ctx, "notes");
  });

export const diseaseSpecificEducationPayloadSchema = z
  .object({
    educationTime: isoDateTimeString,
    condition: z.enum(EDU_DISEASE_CONDITION_VALUES),
    educationProvided: eduYesNo,
    teachBackCompleted: eduYesNo,
    understandingDemonstrated: eduUnderstanding,
    providerNotified: eduYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.educationProvided !== "YES") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "educationProvided must be YES",
        path: ["educationProvided"],
      });
    }
    requireNotesWhenOther(data.condition, data.notes, ctx, "notes");
  });

export const learningBarrierAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    barrierPresent: eduYesNo,
    barrierType: z.enum(EDU_BARRIER_TYPE_VALUES),
    interpreterNeeded: eduYesNo,
    caregiverInvolved: eduYesNo,
    providerNotified: eduYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.barrierPresent === "YES" && data.barrierType === "NONE") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "barrierType cannot be NONE when barrier present",
        path: ["barrierType"],
      });
    }
    if (data.barrierType === "OTHER") {
      requireNotesWhenOther("OTHER", data.notes, ctx, "notes");
    }
    if (data.barrierPresent === "YES") {
      requireProviderNotified(data, ctx, "Provider notification required for learning barrier");
    }
    if (data.interpreterNeeded === "YES") {
      requireProviderNotified(data, ctx, "Provider notification required for interpreter need");
    }
  });

export const educationRefusalOrInabilityPayloadSchema = z
  .object({
    documentationTime: isoDateTimeString,
    reason: z.enum(EDU_REFUSAL_REASON_VALUES),
    additionalAttemptsPlanned: eduYesNo,
    providerNotified: eduYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    requireProviderNotified(data, ctx, "Provider notification required for education refusal/inability");
    if (data.reason === "OTHER") {
      requireNotesWhenOther("OTHER", data.notes, ctx, "notes");
    }
  });

const PAYLOAD_SCHEMA_BY_CARD_ID: Record<
  Edoc22PatientEducationDischargeTeachingDocumentationCardId,
  z.ZodTypeAny
> = {
  [PATIENT_EDUCATION_SESSION_CARD_ID]: patientEducationSessionPayloadSchema,
  [CAREGIVER_EDUCATION_SESSION_CARD_ID]: caregiverEducationSessionPayloadSchema,
  [MEDICATION_EDUCATION_REVIEW_CARD_ID]: medicationEducationReviewPayloadSchema,
  [DISCHARGE_INSTRUCTION_REVIEW_CARD_ID]: dischargeInstructionReviewPayloadSchema,
  [TEACH_BACK_VERIFICATION_CARD_ID]: teachBackVerificationPayloadSchema,
  [FOLLOW_UP_REVIEW_CARD_ID]: followUpReviewPayloadSchema,
  [EQUIPMENT_EDUCATION_CARD_ID]: equipmentEducationPayloadSchema,
  [DISEASE_SPECIFIC_EDUCATION_CARD_ID]: diseaseSpecificEducationPayloadSchema,
  [LEARNING_BARRIER_ASSESSMENT_CARD_ID]: learningBarrierAssessmentPayloadSchema,
  [EDUCATION_REFUSAL_OR_INABILITY_CARD_ID]: educationRefusalOrInabilityPayloadSchema,
};

export function isEdoc22PatientEducationDischargeTeachingDocumentationCardId(
  cardId: string
): cardId is Edoc22PatientEducationDischargeTeachingDocumentationCardId {
  return (
    EDOC22_PATIENT_EDUCATION_DISCHARGE_TEACHING_DOCUMENTATION_CARD_IDS as readonly string[]
  ).includes(cardId);
}

export function validatePatientEducationDischargeTeachingDocumentationPayloadForCard(
  cardId: string,
  payload: Record<string, unknown>
): { ok: true; data: Record<string, unknown> } | { ok: false; message: string } {
  if (!isEdoc22PatientEducationDischargeTeachingDocumentationCardId(cardId)) {
    return { ok: false, message: "Card is not available for structured save" };
  }
  const schema = PAYLOAD_SCHEMA_BY_CARD_ID[cardId];
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: "Invalid clinical documentation payload" };
  }
  return { ok: true, data: parsed.data as Record<string, unknown> };
}

export function summarizePatientEducationDischargePayload(
  cardId: string,
  payload: Record<string, unknown>,
  locale: ClinicalDocumentationSummaryLocale
): Array<{ key: string; value: string }> {
  switch (cardId) {
    case PATIENT_EDUCATION_SESSION_CARD_ID: {
      const p = patientEducationSessionPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Topic" : "Sujet",
          value: pickLocalizedEnumLabel(PATIENT_TOPIC_MAP.en, PATIENT_TOPIC_MAP.fr, d.topic, locale),
        },
        {
          key: locale === "en" ? "Audience" : "Public",
          value: pickLocalizedEnumLabel(AUDIENCE_MAP.en, AUDIENCE_MAP.fr, d.audience, locale),
        },
        {
          key: locale === "en" ? "Understanding demonstrated" : "Compréhension démontrée",
          value: eduDocUnderstandingLabel(d.understandingDemonstrated, locale),
        },
      ];
    }
    case MEDICATION_EDUCATION_REVIEW_CARD_ID: {
      const p = medicationEducationReviewPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Medications reviewed" : "Médicaments revus",
          value: eduDocYesNoLabel(d.medicationsReviewed, locale),
        },
        {
          key: locale === "en" ? "Teach-back completed" : "Teach-back complété",
          value: eduDocYesNoLabel(d.teachBackCompleted, locale),
        },
      ];
    }
    case DISCHARGE_INSTRUCTION_REVIEW_CARD_ID: {
      const p = dischargeInstructionReviewPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Instructions reviewed" : "Consignes revues",
          value: eduDocYesNoLabel(d.instructionsReviewed, locale),
        },
        {
          key: locale === "en" ? "Follow-up reviewed" : "Suivi revu",
          value: eduDocYesNoLabel(d.followUpReviewed, locale),
        },
        {
          key: locale === "en" ? "Understanding demonstrated" : "Compréhension démontrée",
          value: eduDocUnderstandingLabel(d.understandingDemonstrated, locale),
        },
      ];
    }
    case TEACH_BACK_VERIFICATION_CARD_ID: {
      const p = teachBackVerificationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Topic" : "Sujet",
          value: pickLocalizedEnumLabel(
            TEACH_BACK_TOPIC_MAP.en,
            TEACH_BACK_TOPIC_MAP.fr,
            d.topicReviewed,
            locale
          ),
        },
        {
          key: locale === "en" ? "Successful" : "Réussi",
          value: eduDocUnderstandingLabel(d.teachBackSuccessful, locale),
        },
        {
          key: locale === "en" ? "Additional education required" : "Éducation supplémentaire requise",
          value: eduDocYesNoLabel(d.additionalEducationRequired, locale),
        },
      ];
    }
    case FOLLOW_UP_REVIEW_CARD_ID: {
      const p = followUpReviewPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Appointment needed" : "Rendez-vous requis",
          value: eduDocYesNoLabel(d.appointmentNeeded, locale),
        },
        {
          key: locale === "en" ? "Appointment scheduled" : "Rendez-vous planifié",
          value: d.appointmentScheduled,
        },
        {
          key: locale === "en" ? "Transportation concern" : "Préoccupation transport",
          value: eduDocYesNoLabel(d.transportationConcern, locale),
        },
      ];
    }
    case LEARNING_BARRIER_ASSESSMENT_CARD_ID: {
      const p = learningBarrierAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Barrier type" : "Type de barrière",
          value: pickLocalizedEnumLabel(
            BARRIER_TYPE_MAP.en,
            BARRIER_TYPE_MAP.fr,
            d.barrierType,
            locale
          ),
        },
        {
          key: locale === "en" ? "Interpreter needed" : "Interprète requis",
          value: eduDocYesNoLabel(d.interpreterNeeded, locale),
        },
        {
          key: locale === "en" ? "Caregiver involved" : "Aidant impliqué",
          value: eduDocYesNoLabel(d.caregiverInvolved, locale),
        },
      ];
    }
    case EDUCATION_REFUSAL_OR_INABILITY_CARD_ID: {
      const p = educationRefusalOrInabilityPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Reason" : "Motif",
          value: pickLocalizedEnumLabel(
            REFUSAL_REASON_MAP.en,
            REFUSAL_REASON_MAP.fr,
            d.reason,
            locale
          ),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: eduDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case CAREGIVER_EDUCATION_SESSION_CARD_ID: {
      const p = caregiverEducationSessionPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Topic" : "Sujet",
          value: pickLocalizedEnumLabel(
            labelMap(EDU_CAREGIVER_TOPIC_OPTIONS).en,
            labelMap(EDU_CAREGIVER_TOPIC_OPTIONS).fr,
            d.educationTopic,
            locale
          ),
        },
        {
          key: locale === "en" ? "Teach-back completed" : "Teach-back complété",
          value: eduDocYesNoLabel(d.teachBackCompleted, locale),
        },
      ];
    }
    case EQUIPMENT_EDUCATION_CARD_ID: {
      const p = equipmentEducationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Equipment" : "Équipement",
          value: pickLocalizedEnumLabel(
            EQUIPMENT_TYPE_MAP.en,
            EQUIPMENT_TYPE_MAP.fr,
            d.equipmentType,
            locale
          ),
        },
        {
          key: locale === "en" ? "Understanding demonstrated" : "Compréhension démontrée",
          value: eduDocUnderstandingLabel(d.understandingDemonstrated, locale),
        },
      ];
    }
    case DISEASE_SPECIFIC_EDUCATION_CARD_ID: {
      const p = diseaseSpecificEducationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Condition" : "Condition",
          value: pickLocalizedEnumLabel(
            DISEASE_CONDITION_MAP.en,
            DISEASE_CONDITION_MAP.fr,
            d.condition,
            locale
          ),
        },
        {
          key: locale === "en" ? "Education provided" : "Éducation fournie",
          value: eduDocYesNoLabel(d.educationProvided, locale),
        },
      ];
    }
    default:
      return [];
  }
}
