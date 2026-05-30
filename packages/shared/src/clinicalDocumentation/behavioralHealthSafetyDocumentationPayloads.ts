import { z } from "zod";
import type { ClinicalDocumentationFieldOption } from "./clinicalDocumentationFieldOptions.js";
import {
  clinicalDocYesNo,
  pickLocalizedEnumLabel,
  type ClinicalDocumentationSummaryLocale,
} from "./clinicalDocumentationSummaryLocale.js";

/** EDOC.16 — behavioral health & safety documentation card IDs. */
export const SUICIDE_PRECAUTIONS_DOCUMENTATION_CARD_ID = "suicide_precautions_documentation" as const;
export const SUICIDE_RISK_MONITORING_CARD_ID = "suicide_risk_monitoring" as const;
export const ELOPEMENT_RISK_ASSESSMENT_CARD_ID = "elopement_risk_assessment" as const;
export const ELOPEMENT_MONITORING_CARD_ID = "elopement_monitoring" as const;
export const BEHAVIORAL_OBSERVATION_CARD_ID = "behavioral_observation" as const;
export const AGITATION_VIOLENCE_RISK_ASSESSMENT_CARD_ID = "agitation_violence_risk_assessment" as const;
export const ONE_TO_ONE_OBSERVATION_CHECK_CARD_ID = "one_to_one_observation_check" as const;
export const ENVIRONMENTAL_SAFETY_CHECK_CARD_ID = "environmental_safety_check" as const;
export const BEHAVIORAL_ESCALATION_EVENT_CARD_ID = "behavioral_escalation_event" as const;

export const EDOC16_BEHAVIORAL_HEALTH_SAFETY_DOCUMENTATION_CARD_IDS = [
  SUICIDE_PRECAUTIONS_DOCUMENTATION_CARD_ID,
  SUICIDE_RISK_MONITORING_CARD_ID,
  ELOPEMENT_RISK_ASSESSMENT_CARD_ID,
  ELOPEMENT_MONITORING_CARD_ID,
  BEHAVIORAL_OBSERVATION_CARD_ID,
  AGITATION_VIOLENCE_RISK_ASSESSMENT_CARD_ID,
  ONE_TO_ONE_OBSERVATION_CHECK_CARD_ID,
  ENVIRONMENTAL_SAFETY_CHECK_CARD_ID,
  BEHAVIORAL_ESCALATION_EVENT_CARD_ID,
] as const;

export type Edoc16BehavioralHealthSafetyDocumentationCardId =
  (typeof EDOC16_BEHAVIORAL_HEALTH_SAFETY_DOCUMENTATION_CARD_IDS)[number];

/**
 * Future Phase — EDOC.16A Behavioral Safety Witness / Security Co-Sign Governance
 * Do not implement now.
 */
export const EDOC_16A_FUTURE_BEHAVIORAL_SAFETY_WITNESS_GOVERNANCE = "EDOC.16A" as const;

export const PRECAUTION_LEVEL_VALUES = [
  "STANDARD",
  "CLOSE_OBSERVATION",
  "ONE_TO_ONE",
  "CONSTANT_VISUAL_OBSERVATION",
] as const;

export const SUICIDE_RISK_LEVEL_VALUES = ["LOW", "MODERATE", "HIGH", "IMMINENT"] as const;

export const SUICIDAL_IDEATION_VALUES = ["DENIES", "PASSIVE", "ACTIVE", "UNABLE_TO_ASSESS"] as const;

export const YES_NO_UNABLE_VALUES = ["YES", "NO", "UNABLE_TO_ASSESS"] as const;

export const YES_NO_UNKNOWN_VALUES = ["YES", "NO", "UNKNOWN"] as const;

export const ELOPEMENT_RISK_LEVEL_VALUES = ["LOW", "MODERATE", "HIGH"] as const;

export const BEHAVIOR_TYPE_VALUES = [
  "CALM",
  "ANXIOUS",
  "AGITATED",
  "COMBATIVE",
  "WITHDRAWN",
  "CONFUSED",
  "SLEEPING",
  "OTHER",
] as const;

export const AGITATION_LEVEL_VALUES = ["NONE", "MILD", "MODERATE", "SEVERE"] as const;

export const VIOLENCE_RISK_VALUES = ["LOW", "MODERATE", "HIGH"] as const;

export const OBSERVER_ROLE_VALUES = ["RN", "TECH", "SITTER", "SECURITY", "OTHER"] as const;

export const BEHAVIORAL_ESCALATION_REASON_VALUES = [
  "SUICIDE_RISK_INCREASED",
  "ELOPEMENT_ATTEMPT",
  "AGITATION_ESCALATED",
  "VIOLENCE_THREAT",
  "SELF_HARM_ATTEMPT",
  "SECURITY_EVENT",
  "OTHER",
] as const;

export const BEHAVIORAL_INTERVENTION_VALUES = [
  "DE_ESCALATION",
  "SECURITY_ASSISTANCE",
  "PROVIDER_ASSESSMENT",
  "ROOM_SAFETY",
  "OBSERVATION_LEVEL_INCREASED",
  "RESTRAINT_REFERENCE",
  "OTHER",
] as const;

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

export const PRECAUTION_LEVEL_OPTIONS = enumOptions(PRECAUTION_LEVEL_VALUES, {
  STANDARD: { en: "Standard", fr: "Standard" },
  CLOSE_OBSERVATION: { en: "Close observation", fr: "Observation rapprochée" },
  ONE_TO_ONE: { en: "1:1 observation", fr: "Observation 1:1" },
  CONSTANT_VISUAL_OBSERVATION: { en: "Constant visual observation", fr: "Observation visuelle constante" },
});

export const SUICIDE_RISK_LEVEL_OPTIONS = enumOptions(SUICIDE_RISK_LEVEL_VALUES, {
  LOW: { en: "Low", fr: "Faible" },
  MODERATE: { en: "Moderate", fr: "Modéré" },
  HIGH: { en: "High", fr: "Élevé" },
  IMMINENT: { en: "Imminent", fr: "Imminent" },
});

export const SUICIDAL_IDEATION_OPTIONS = enumOptions(SUICIDAL_IDEATION_VALUES, {
  DENIES: { en: "Denies", fr: "Nie" },
  PASSIVE: { en: "Passive ideation", fr: "Idéation passive" },
  ACTIVE: { en: "Active ideation", fr: "Idéation active" },
  UNABLE_TO_ASSESS: { en: "Unable to assess", fr: "Non évaluable" },
});

export const YES_NO_UNABLE_OPTIONS = enumOptions(YES_NO_UNABLE_VALUES, {
  YES: { en: "Yes", fr: "Oui" },
  NO: { en: "No", fr: "Non" },
  UNABLE_TO_ASSESS: { en: "Unable to assess", fr: "Non évaluable" },
});

export const YES_NO_UNKNOWN_OPTIONS = enumOptions(YES_NO_UNKNOWN_VALUES, {
  YES: { en: "Yes", fr: "Oui" },
  NO: { en: "No", fr: "Non" },
  UNKNOWN: { en: "Unknown", fr: "Inconnu" },
});

export const ELOPEMENT_RISK_LEVEL_OPTIONS = enumOptions(ELOPEMENT_RISK_LEVEL_VALUES, {
  LOW: { en: "Low", fr: "Faible" },
  MODERATE: { en: "Moderate", fr: "Modéré" },
  HIGH: { en: "High", fr: "Élevé" },
});

export const BEHAVIOR_TYPE_OPTIONS = enumOptions(BEHAVIOR_TYPE_VALUES, {
  CALM: { en: "Calm", fr: "Calme" },
  ANXIOUS: { en: "Anxious", fr: "Anxieux" },
  AGITATED: { en: "Agitated", fr: "Agité" },
  COMBATIVE: { en: "Combative", fr: "Combattif" },
  WITHDRAWN: { en: "Withdrawn", fr: "Retiré" },
  CONFUSED: { en: "Confused", fr: "Confus" },
  SLEEPING: { en: "Sleeping", fr: "Endormi" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const AGITATION_LEVEL_OPTIONS = enumOptions(AGITATION_LEVEL_VALUES, {
  NONE: { en: "None", fr: "Aucune" },
  MILD: { en: "Mild", fr: "Légère" },
  MODERATE: { en: "Moderate", fr: "Modérée" },
  SEVERE: { en: "Severe", fr: "Sévère" },
});

export const VIOLENCE_RISK_OPTIONS = enumOptions(VIOLENCE_RISK_VALUES, {
  LOW: { en: "Low", fr: "Faible" },
  MODERATE: { en: "Moderate", fr: "Modéré" },
  HIGH: { en: "High", fr: "Élevé" },
});

export const OBSERVER_ROLE_OPTIONS = enumOptions(OBSERVER_ROLE_VALUES, {
  RN: { en: "RN", fr: "Infirmière" },
  TECH: { en: "Tech", fr: "Technicien" },
  SITTER: { en: "Sitter", fr: "Accompagnant" },
  SECURITY: { en: "Security", fr: "Sécurité" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const BEHAVIORAL_ESCALATION_REASON_OPTIONS = enumOptions(BEHAVIORAL_ESCALATION_REASON_VALUES, {
  SUICIDE_RISK_INCREASED: { en: "Suicide risk increased", fr: "Risque suicidaire augmenté" },
  ELOPEMENT_ATTEMPT: { en: "Elopement attempt", fr: "Tentative de fugue" },
  AGITATION_ESCALATED: { en: "Agitation escalated", fr: "Agitation escaladée" },
  VIOLENCE_THREAT: { en: "Violence threat", fr: "Menace de violence" },
  SELF_HARM_ATTEMPT: { en: "Self-harm attempt", fr: "Tentative d'automutilation" },
  SECURITY_EVENT: { en: "Security event", fr: "Événement sécurité" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const BEHAVIORAL_INTERVENTION_OPTIONS = enumOptions(BEHAVIORAL_INTERVENTION_VALUES, {
  DE_ESCALATION: { en: "De-escalation", fr: "Désescalade" },
  SECURITY_ASSISTANCE: { en: "Security assistance", fr: "Assistance sécurité" },
  PROVIDER_ASSESSMENT: { en: "Provider assessment", fr: "Évaluation médecin" },
  ROOM_SAFETY: { en: "Room safety", fr: "Sécurisation chambre" },
  OBSERVATION_LEVEL_INCREASED: { en: "Observation level increased", fr: "Niveau observation augmenté" },
  RESTRAINT_REFERENCE: { en: "Restraint reference", fr: "Référence contention" },
  OTHER: { en: "Other", fr: "Autre" },
});

const PRECAUTION_LEVEL_MAP = labelMap(PRECAUTION_LEVEL_OPTIONS);
const SUICIDE_RISK_MAP = labelMap(SUICIDE_RISK_LEVEL_OPTIONS);
const IDEATION_MAP = labelMap(SUICIDAL_IDEATION_OPTIONS);
const ELOPEMENT_RISK_MAP = labelMap(ELOPEMENT_RISK_LEVEL_OPTIONS);
const BEHAVIOR_MAP = labelMap(BEHAVIOR_TYPE_OPTIONS);
const ESCALATION_REASON_MAP = labelMap(BEHAVIORAL_ESCALATION_REASON_OPTIONS);
const INTERVENTION_MAP = labelMap(BEHAVIORAL_INTERVENTION_OPTIONS);

export const suicidePrecautionsDocumentationPayloadSchema = z
  .object({
    documentationTime: isoDateTimeString,
    precautionLevel: z.enum(PRECAUTION_LEVEL_VALUES),
    patientChangedIntoSafeAttire: z.boolean(),
    belongingsRemovedOrSecured: z.boolean(),
    roomSafetyCompleted: z.boolean(),
    ligatureRiskReduced: z.boolean(),
    sharpsRemoved: z.boolean(),
    providerNotified: z.boolean(),
    familyNotified: z.boolean(),
    providerNotificationTime: optionalIsoDateTime,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (
      (data.precautionLevel === "ONE_TO_ONE" ||
        data.precautionLevel === "CONSTANT_VISUAL_OBSERVATION") &&
      !data.roomSafetyCompleted
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Room safety must be completed for 1:1 or constant visual observation",
        path: ["roomSafetyCompleted"],
      });
    }
  });

export const suicideRiskMonitoringPayloadSchema = z
  .object({
    monitoringTime: isoDateTimeString,
    riskLevel: z.enum(SUICIDE_RISK_LEVEL_VALUES),
    currentSuicidalIdeation: z.enum(SUICIDAL_IDEATION_VALUES),
    planReported: z.enum(YES_NO_UNABLE_VALUES),
    intentReported: z.enum(YES_NO_UNABLE_VALUES),
    meansAccessConcern: z.enum(YES_NO_UNKNOWN_VALUES),
    observationLevel: z.enum(PRECAUTION_LEVEL_VALUES),
    cssrsScreenCompleted: z.boolean().optional(),
    cssrsRiskLevel: z.enum(SUICIDE_RISK_LEVEL_VALUES).optional(),
    phq9Reviewed: z.boolean().optional(),
    gad7Reviewed: z.boolean().optional(),
    providerNotified: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (
      (data.riskLevel === "HIGH" || data.riskLevel === "IMMINENT") &&
      !data.providerNotified
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required for high or imminent suicide risk",
        path: ["providerNotified"],
      });
    }
    if (data.currentSuicidalIdeation === "ACTIVE" && !data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required for active suicidal ideation",
        path: ["providerNotified"],
      });
    }
  });

export const elopementRiskAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    riskLevel: z.enum(ELOPEMENT_RISK_LEVEL_VALUES),
    confusedOrDisoriented: z.boolean(),
    attemptedToLeave: z.boolean(),
    verbalizedIntentToLeave: z.boolean(),
    requiresSecureArea: z.boolean(),
    providerNotified: z.boolean(),
    familyNotified: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.riskLevel === "HIGH" && !data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required for high elopement risk",
        path: ["providerNotified"],
      });
    }
  });

export const elopementMonitoringPayloadSchema = z
  .object({
    monitoringTime: isoDateTimeString,
    patientLocationConfirmed: z.boolean(),
    patientInAssignedArea: z.boolean(),
    doorExitRiskObserved: z.boolean(),
    redirectionRequired: z.boolean(),
    securityNotified: z.boolean(),
    providerNotified: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (!data.patientLocationConfirmed) {
      if (!data.securityNotified) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Security notification required when patient location not confirmed",
          path: ["securityNotified"],
        });
      }
      if (!data.providerNotified) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Provider notification required when patient location not confirmed",
          path: ["providerNotified"],
        });
      }
    }
  });

export const behavioralObservationPayloadSchema = z
  .object({
    observationTime: isoDateTimeString,
    behavior: z.enum(BEHAVIOR_TYPE_VALUES),
    cooperative: z.boolean(),
    threatToSelf: z.boolean(),
    threatToOthers: z.boolean(),
    redirectionEffective: z.boolean(),
    deEscalationUsed: z.boolean(),
    providerNotified: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if ((data.threatToSelf || data.threatToOthers) && !data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required when threat to self or others documented",
        path: ["providerNotified"],
      });
    }
  });

export const agitationViolenceRiskAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    agitationLevel: z.enum(AGITATION_LEVEL_VALUES),
    violenceRisk: z.enum(VIOLENCE_RISK_VALUES),
    verbalThreats: z.boolean(),
    physicalAggression: z.boolean(),
    propertyDestruction: z.boolean(),
    weaponConcern: z.boolean(),
    securityNotified: z.boolean(),
    providerNotified: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (
      (data.violenceRisk === "HIGH" || data.agitationLevel === "SEVERE") &&
      !data.providerNotified
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required for severe agitation or high violence risk",
        path: ["providerNotified"],
      });
    }
    if (data.weaponConcern && !data.securityNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Security notification required when weapon concern documented",
        path: ["securityNotified"],
      });
    }
  });

export const oneToOneObservationCheckPayloadSchema = z
  .object({
    checkTime: isoDateTimeString,
    observerRole: z.enum(OBSERVER_ROLE_VALUES),
    patientVisible: z.boolean(),
    patientSafe: z.boolean(),
    behaviorObserved: z.enum(BEHAVIOR_TYPE_VALUES),
    needsAddressed: z.boolean(),
    handoffCompleted: z.boolean(),
    providerNotified: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if ((!data.patientVisible || !data.patientSafe) && !data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required when patient not visible or not safe",
        path: ["providerNotified"],
      });
    }
  });

export const environmentalSafetyCheckPayloadSchema = z
  .object({
    checkTime: isoDateTimeString,
    roomClearedOfHazards: z.boolean(),
    ligatureRiskChecked: z.boolean(),
    sharpsRemoved: z.boolean(),
    cordsSecured: z.boolean(),
    belongingsSecured: z.boolean(),
    bathroomChecked: z.boolean(),
    staffAwareOfPrecautions: z.boolean(),
    issuesFound: z.boolean(),
    issuesDescription: optionalText,
    providerNotified: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.issuesFound && !data.issuesDescription?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Issues description required when issues found",
        path: ["issuesDescription"],
      });
    }
  });

export const behavioralEscalationEventPayloadSchema = z
  .object({
    eventTime: isoDateTimeString,
    reason: z.enum(BEHAVIORAL_ESCALATION_REASON_VALUES),
    providerNotified: z.boolean(),
    providerNotificationTime: isoDateTimeString,
    securityNotified: z.boolean(),
    familyNotified: z.boolean(),
    intervention: z.enum(BEHAVIORAL_INTERVENTION_VALUES),
    restraintDocumentationReferenced: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (!data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required for behavioral escalation",
        path: ["providerNotified"],
      });
    }
    if (
      (data.reason === "SECURITY_EVENT" || data.reason === "VIOLENCE_THREAT") &&
      !data.securityNotified
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Security notification required for security event or violence threat",
        path: ["securityNotified"],
      });
    }
  });

const PAYLOAD_SCHEMA_BY_CARD_ID: Record<string, z.ZodType<Record<string, unknown>>> = {
  [SUICIDE_PRECAUTIONS_DOCUMENTATION_CARD_ID]: suicidePrecautionsDocumentationPayloadSchema,
  [SUICIDE_RISK_MONITORING_CARD_ID]: suicideRiskMonitoringPayloadSchema,
  [ELOPEMENT_RISK_ASSESSMENT_CARD_ID]: elopementRiskAssessmentPayloadSchema,
  [ELOPEMENT_MONITORING_CARD_ID]: elopementMonitoringPayloadSchema,
  [BEHAVIORAL_OBSERVATION_CARD_ID]: behavioralObservationPayloadSchema,
  [AGITATION_VIOLENCE_RISK_ASSESSMENT_CARD_ID]: agitationViolenceRiskAssessmentPayloadSchema,
  [ONE_TO_ONE_OBSERVATION_CHECK_CARD_ID]: oneToOneObservationCheckPayloadSchema,
  [ENVIRONMENTAL_SAFETY_CHECK_CARD_ID]: environmentalSafetyCheckPayloadSchema,
  [BEHAVIORAL_ESCALATION_EVENT_CARD_ID]: behavioralEscalationEventPayloadSchema,
};

export function isEdoc16BehavioralHealthSafetyDocumentationCardId(
  cardId: string
): cardId is Edoc16BehavioralHealthSafetyDocumentationCardId {
  return (EDOC16_BEHAVIORAL_HEALTH_SAFETY_DOCUMENTATION_CARD_IDS as readonly string[]).includes(
    cardId
  );
}

export function validateBehavioralHealthSafetyDocumentationPayloadForCard(
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

export function summarizeBehavioralHealthSafetyDocumentationPayload(
  cardId: string,
  payload: Record<string, unknown>,
  locale: ClinicalDocumentationSummaryLocale
): Array<{ key: string; value: string }> {
  switch (cardId) {
    case SUICIDE_PRECAUTIONS_DOCUMENTATION_CARD_ID: {
      const p = suicidePrecautionsDocumentationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Precaution level" : "Niveau de précaution",
          value: pickLocalizedEnumLabel(
            PRECAUTION_LEVEL_MAP.en,
            PRECAUTION_LEVEL_MAP.fr,
            d.precautionLevel,
            locale
          ),
        },
        {
          key: locale === "en" ? "Room safety completed" : "Sécurité chambre complétée",
          value: clinicalDocYesNo(d.roomSafetyCompleted, locale),
        },
        {
          key: locale === "en" ? "Belongings secured" : "Effets sécurisés",
          value: clinicalDocYesNo(d.belongingsRemovedOrSecured, locale),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: clinicalDocYesNo(d.providerNotified, locale),
        },
      ];
    }
    case SUICIDE_RISK_MONITORING_CARD_ID: {
      const p = suicideRiskMonitoringPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Risk level" : "Niveau de risque",
          value: pickLocalizedEnumLabel(
            SUICIDE_RISK_MAP.en,
            SUICIDE_RISK_MAP.fr,
            d.riskLevel,
            locale
          ),
        },
        {
          key: locale === "en" ? "Ideation status" : "Statut idéation",
          value: pickLocalizedEnumLabel(
            IDEATION_MAP.en,
            IDEATION_MAP.fr,
            d.currentSuicidalIdeation,
            locale
          ),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: clinicalDocYesNo(d.providerNotified, locale),
        },
      ];
    }
    case ELOPEMENT_RISK_ASSESSMENT_CARD_ID: {
      const p = elopementRiskAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Risk level" : "Niveau de risque",
          value: pickLocalizedEnumLabel(
            ELOPEMENT_RISK_MAP.en,
            ELOPEMENT_RISK_MAP.fr,
            d.riskLevel,
            locale
          ),
        },
        {
          key: locale === "en" ? "Secure area required" : "Zone sécurisée requise",
          value: clinicalDocYesNo(d.requiresSecureArea, locale),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: clinicalDocYesNo(d.providerNotified, locale),
        },
      ];
    }
    case ELOPEMENT_MONITORING_CARD_ID: {
      const p = elopementMonitoringPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Location confirmed" : "Localisation confirmée",
          value: clinicalDocYesNo(d.patientLocationConfirmed, locale),
        },
        {
          key: locale === "en" ? "Security notified" : "Sécurité avisée",
          value: clinicalDocYesNo(d.securityNotified, locale),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: clinicalDocYesNo(d.providerNotified, locale),
        },
      ];
    }
    case BEHAVIORAL_OBSERVATION_CARD_ID: {
      const p = behavioralObservationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Behavior" : "Comportement",
          value: pickLocalizedEnumLabel(
            BEHAVIOR_MAP.en,
            BEHAVIOR_MAP.fr,
            d.behavior,
            locale
          ),
        },
        {
          key: locale === "en" ? "Threat to self" : "Menace pour soi",
          value: clinicalDocYesNo(d.threatToSelf, locale),
        },
        {
          key: locale === "en" ? "Threat to others" : "Menace pour autrui",
          value: clinicalDocYesNo(d.threatToOthers, locale),
        },
        {
          key: locale === "en" ? "De-escalation used" : "Désescalade utilisée",
          value: clinicalDocYesNo(d.deEscalationUsed, locale),
        },
      ];
    }
    case ONE_TO_ONE_OBSERVATION_CHECK_CARD_ID: {
      const p = oneToOneObservationCheckPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Patient visible" : "Patient visible",
          value: clinicalDocYesNo(d.patientVisible, locale),
        },
        {
          key: locale === "en" ? "Patient safe" : "Patient en sécurité",
          value: clinicalDocYesNo(d.patientSafe, locale),
        },
        {
          key: locale === "en" ? "Handoff completed" : "Relève complétée",
          value: clinicalDocYesNo(d.handoffCompleted, locale),
        },
      ];
    }
    case ENVIRONMENTAL_SAFETY_CHECK_CARD_ID: {
      const p = environmentalSafetyCheckPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Hazards cleared" : "Dangers retirés",
          value: clinicalDocYesNo(d.roomClearedOfHazards, locale),
        },
        {
          key: locale === "en" ? "Issues found" : "Problèmes identifiés",
          value: clinicalDocYesNo(d.issuesFound, locale),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: clinicalDocYesNo(d.providerNotified, locale),
        },
      ];
    }
    case BEHAVIORAL_ESCALATION_EVENT_CARD_ID: {
      const p = behavioralEscalationEventPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Reason" : "Motif",
          value: pickLocalizedEnumLabel(
            ESCALATION_REASON_MAP.en,
            ESCALATION_REASON_MAP.fr,
            d.reason,
            locale
          ),
        },
        {
          key: locale === "en" ? "Intervention" : "Intervention",
          value: pickLocalizedEnumLabel(
            INTERVENTION_MAP.en,
            INTERVENTION_MAP.fr,
            d.intervention,
            locale
          ),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: clinicalDocYesNo(d.providerNotified, locale),
        },
        {
          key: locale === "en" ? "Security notified" : "Sécurité avisée",
          value: clinicalDocYesNo(d.securityNotified, locale),
        },
      ];
    }
    case AGITATION_VIOLENCE_RISK_ASSESSMENT_CARD_ID: {
      const p = agitationViolenceRiskAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Violence risk" : "Risque de violence",
          value: pickLocalizedEnumLabel(
            labelMap(VIOLENCE_RISK_OPTIONS).en,
            labelMap(VIOLENCE_RISK_OPTIONS).fr,
            d.violenceRisk,
            locale
          ),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: clinicalDocYesNo(d.providerNotified, locale),
        },
      ];
    }
    default:
      return [];
  }
}
