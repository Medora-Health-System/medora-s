import { z } from "zod";
import { pickProductUiCopy } from "../i18n/productUiLocale.js";
import type { ClinicalDocumentationFieldOption } from "./clinicalDocumentationFieldOptions.js";
import {
  clinicalDocSummaryKey,
  clinicalDocYesNo,
  pickLocalizedEnumLabel,
  type ClinicalDocumentationSummaryLocale,
} from "./clinicalDocumentationSummaryLocale.js";

/** EDOC.14 — fall risk & safety monitoring card IDs. */
export const MORSE_FALL_RISK_ASSESSMENT_CARD_ID = "morse_fall_risk_assessment" as const;
export const FALL_RISK_REASSESSMENT_CARD_ID = "fall_risk_reassessment" as const;
export const SAFETY_PRECAUTIONS_DOCUMENTATION_CARD_ID = "safety_precautions_documentation" as const;
export const MOBILITY_AMBULATION_ASSESSMENT_CARD_ID = "mobility_ambulation_assessment" as const;
export const NEAR_FALL_EVENT_CARD_ID = "near_fall_event" as const;
export const FALL_EVENT_DOCUMENTATION_CARD_ID = "fall_event_documentation" as const;
export const POST_FALL_ASSESSMENT_CARD_ID = "post_fall_assessment" as const;
export const FALL_ESCALATION_EVENT_CARD_ID = "fall_escalation_event" as const;

export const EDOC14_FALL_RISK_SAFETY_DOCUMENTATION_CARD_IDS = [
  MORSE_FALL_RISK_ASSESSMENT_CARD_ID,
  FALL_RISK_REASSESSMENT_CARD_ID,
  SAFETY_PRECAUTIONS_DOCUMENTATION_CARD_ID,
  MOBILITY_AMBULATION_ASSESSMENT_CARD_ID,
  NEAR_FALL_EVENT_CARD_ID,
  FALL_EVENT_DOCUMENTATION_CARD_ID,
  POST_FALL_ASSESSMENT_CARD_ID,
  FALL_ESCALATION_EVENT_CARD_ID,
] as const;

export type Edoc14FallRiskSafetyDocumentationCardId =
  (typeof EDOC14_FALL_RISK_SAFETY_DOCUMENTATION_CARD_IDS)[number];

/**
 * Future Phase — EDOC.14A Fall Risk Escalation Automation
 * Do not implement now: automated alerts or paging from fall risk flags.
 */
export const EDOC_14A_FUTURE_FALL_RISK_ESCALATION_AUTOMATION = "EDOC.14A" as const;

export const YES_NO_VALUES = ["YES", "NO"] as const;

export const MORSE_AMBULATORY_AID_VALUES = ["NONE", "CRUTCH_CANE_WALKER", "FURNITURE"] as const;

export const MORSE_GAIT_VALUES = ["NORMAL", "WEAK", "IMPAIRED"] as const;

export const MORSE_MENTAL_STATUS_VALUES = ["ORIENTED", "FORGETS_LIMITATIONS"] as const;

export const MORSE_RISK_LEVEL_VALUES = ["LOW", "MODERATE", "HIGH"] as const;

export const MOBILITY_LEVEL_VALUES = [
  "INDEPENDENT",
  "STANDBY_ASSIST",
  "ONE_PERSON_ASSIST",
  "TWO_PERSON_ASSIST",
  "TOTAL_ASSIST",
] as const;

export const DISTANCE_UNIT_VALUES = ["FEET", "METERS"] as const;

export const ASSISTIVE_DEVICE_VALUES = ["NONE", "CANE", "WALKER", "WHEELCHAIR", "OTHER"] as const;

export const GAIT_STABILITY_VALUES = ["STABLE", "UNSTEADY", "SEVERELY_IMPAIRED"] as const;

export const NEUROLOGIC_STATUS_VALUES = ["BASELINE", "CHANGED"] as const;

export const MOBILITY_STATUS_VALUES = ["BASELINE", "CHANGED"] as const;

export const FALL_ESCALATION_REASON_VALUES = [
  "HIGH_RISK_SCORE",
  "RECURRENT_NEAR_FALLS",
  "RECURRENT_FALLS",
  "NEW_INJURY",
  "NEUROLOGIC_CHANGE",
  "OTHER",
] as const;

const optionalNotes = z.string().trim().max(2000).optional();
const optionalText = z.string().trim().max(500).optional();
const locationText = z.string().trim().min(1).max(200);
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

export const YES_NO_OPTIONS = enumOptions(YES_NO_VALUES, {
  YES: { en: "Yes", fr: "Oui" },
  NO: { en: "No", fr: "Non" },
});

export const MORSE_HISTORY_OF_FALLING_OPTIONS = YES_NO_OPTIONS;
export const MORSE_SECONDARY_DIAGNOSIS_OPTIONS = YES_NO_OPTIONS;
export const MORSE_IV_THERAPY_OPTIONS = YES_NO_OPTIONS;

export const MORSE_AMBULATORY_AID_OPTIONS = enumOptions(MORSE_AMBULATORY_AID_VALUES, {
  NONE: { en: "None / bed rest / nurse assist", fr: "Aucune / alité / aide infirmière" },
  CRUTCH_CANE_WALKER: { en: "Crutches / cane / walker", fr: "Béquilles / canne / déambulateur" },
  FURNITURE: { en: "Furniture for support", fr: "Meuble pour appui" },
});

export const MORSE_GAIT_OPTIONS = enumOptions(MORSE_GAIT_VALUES, {
  NORMAL: { en: "Normal / bed rest / wheelchair", fr: "Normal / alité / fauteuil" },
  WEAK: { en: "Weak", fr: "Faible" },
  IMPAIRED: { en: "Impaired", fr: "Altéré" },
});

export const MORSE_MENTAL_STATUS_OPTIONS = enumOptions(MORSE_MENTAL_STATUS_VALUES, {
  ORIENTED: { en: "Oriented to own ability", fr: "Conscient de ses capacités" },
  FORGETS_LIMITATIONS: { en: "Forgets limitations", fr: "Oublie ses limitations" },
});

export const MORSE_RISK_LEVEL_OPTIONS = enumOptions(MORSE_RISK_LEVEL_VALUES, {
  LOW: { en: "Low (0–24)", fr: "Faible (0–24)" },
  MODERATE: { en: "Moderate (25–44)", fr: "Modéré (25–44)" },
  HIGH: { en: "High (45+)", fr: "Élevé (45+)" },
});

export const MOBILITY_LEVEL_OPTIONS = enumOptions(MOBILITY_LEVEL_VALUES, {
  INDEPENDENT: { en: "Independent", fr: "Autonome" },
  STANDBY_ASSIST: { en: "Standby assist", fr: "Assistance de proximité" },
  ONE_PERSON_ASSIST: { en: "One-person assist", fr: "Aide d'une personne" },
  TWO_PERSON_ASSIST: { en: "Two-person assist", fr: "Aide de deux personnes" },
  TOTAL_ASSIST: { en: "Total assist", fr: "Assistance totale" },
});

export const NEUROLOGIC_STATUS_OPTIONS = enumOptions(NEUROLOGIC_STATUS_VALUES, {
  BASELINE: { en: "Baseline", fr: "Référence" },
  CHANGED: { en: "Changed", fr: "Modifié" },
});

export const MOBILITY_STATUS_OPTIONS = enumOptions(MOBILITY_STATUS_VALUES, {
  BASELINE: { en: "Baseline", fr: "Référence" },
  CHANGED: { en: "Changed", fr: "Modifié" },
});

export const MOBILITY_DISTANCE_UNIT_OPTIONS = enumOptions(DISTANCE_UNIT_VALUES, {
  FEET: { en: "Feet", fr: "Pieds" },
  METERS: { en: "Meters", fr: "Mètres" },
});

export const ASSISTIVE_DEVICE_OPTIONS = enumOptions(ASSISTIVE_DEVICE_VALUES, {
  NONE: { en: "None", fr: "Aucun" },
  CANE: { en: "Cane", fr: "Canne" },
  WALKER: { en: "Walker", fr: "Déambulateur" },
  WHEELCHAIR: { en: "Wheelchair", fr: "Fauteuil roulant" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const GAIT_STABILITY_OPTIONS = enumOptions(GAIT_STABILITY_VALUES, {
  STABLE: { en: "Stable", fr: "Stable" },
  UNSTEADY: { en: "Unsteady", fr: "Instable" },
  SEVERELY_IMPAIRED: { en: "Severely impaired", fr: "Sévèrement altéré" },
});

export const FALL_ESCALATION_REASON_OPTIONS = enumOptions(FALL_ESCALATION_REASON_VALUES, {
  HIGH_RISK_SCORE: { en: "High risk score", fr: "Score de risque élevé" },
  RECURRENT_NEAR_FALLS: { en: "Recurrent near-falls", fr: "Presque-chutes récurrentes" },
  RECURRENT_FALLS: { en: "Recurrent falls", fr: "Chutes récurrentes" },
  NEW_INJURY: { en: "New injury", fr: "Nouvelle lésion" },
  NEUROLOGIC_CHANGE: { en: "Neurologic change", fr: "Changement neurologique" },
  OTHER: { en: "Other", fr: "Autre" },
});

export function calculateMorseFallScore(input: {
  historyOfFalling: (typeof YES_NO_VALUES)[number];
  secondaryDiagnosis: (typeof YES_NO_VALUES)[number];
  ambulatoryAid: (typeof MORSE_AMBULATORY_AID_VALUES)[number];
  ivTherapy: (typeof YES_NO_VALUES)[number];
  gait: (typeof MORSE_GAIT_VALUES)[number];
  mentalStatus: (typeof MORSE_MENTAL_STATUS_VALUES)[number];
}): number {
  let score = 0;
  if (input.historyOfFalling === "YES") score += 25;
  if (input.secondaryDiagnosis === "YES") score += 15;
  if (input.ambulatoryAid === "CRUTCH_CANE_WALKER") score += 15;
  if (input.ambulatoryAid === "FURNITURE") score += 30;
  if (input.ivTherapy === "YES") score += 20;
  if (input.gait === "WEAK") score += 10;
  if (input.gait === "IMPAIRED") score += 20;
  if (input.mentalStatus === "FORGETS_LIMITATIONS") score += 15;
  return score;
}

export function deriveMorseRiskLevel(
  score: number
): (typeof MORSE_RISK_LEVEL_VALUES)[number] {
  if (score >= 45) return "HIGH";
  if (score >= 25) return "MODERATE";
  return "LOW";
}

function labelMap<T extends string>(options: ClinicalDocumentationFieldOption<T>[]) {
  return {
    en: Object.fromEntries(options.map((o) => [o.value, o.labelEn])),
    fr: Object.fromEntries(options.map((o) => [o.value, o.labelFr])),
  };
}

const MORSE_RISK_LEVEL_MAP = labelMap(MORSE_RISK_LEVEL_OPTIONS);
const MOBILITY_LEVEL_MAP = labelMap(MOBILITY_LEVEL_OPTIONS);
const GAIT_STABILITY_MAP = labelMap(GAIT_STABILITY_OPTIONS);
const ESCALATION_REASON_MAP = labelMap(FALL_ESCALATION_REASON_OPTIONS);

export const morseFallRiskAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    historyOfFalling: z.enum(YES_NO_VALUES),
    secondaryDiagnosis: z.enum(YES_NO_VALUES),
    ambulatoryAid: z.enum(MORSE_AMBULATORY_AID_VALUES),
    ivTherapy: z.enum(YES_NO_VALUES),
    gait: z.enum(MORSE_GAIT_VALUES),
    mentalStatus: z.enum(MORSE_MENTAL_STATUS_VALUES),
    calculatedScore: z.coerce.number().int().min(0).max(125),
    riskLevel: z.enum(MORSE_RISK_LEVEL_VALUES),
    providerNotified: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    const calculated = calculateMorseFallScore(data);
    if (data.calculatedScore !== calculated) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "calculatedScore must equal Morse fall score calculation",
        path: ["calculatedScore"],
      });
    }
    const expectedLevel = deriveMorseRiskLevel(calculated);
    if (data.riskLevel !== expectedLevel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "riskLevel must match derived Morse risk level",
        path: ["riskLevel"],
      });
    }
    if (data.riskLevel === "HIGH" && !data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required for high Morse fall risk",
        path: ["providerNotified"],
      });
    }
  });

export const fallRiskReassessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    previousRiskLevel: z.enum(MORSE_RISK_LEVEL_VALUES).optional(),
    currentRiskLevel: z.enum(MORSE_RISK_LEVEL_VALUES),
    changeDetected: z.boolean(),
    providerNotified: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    const increasedToHigh =
      data.currentRiskLevel === "HIGH" &&
      data.previousRiskLevel != null &&
      data.previousRiskLevel !== "HIGH";
    if (increasedToHigh && !data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required when fall risk increased to high",
        path: ["providerNotified"],
      });
    }
  });

export const safetyPrecautionsDocumentationPayloadSchema = z.object({
  documentationTime: isoDateTimeString,
  bedAlarmActive: z.boolean(),
  chairAlarmActive: z.boolean(),
  nonSlipFootwearApplied: z.boolean(),
  callLightWithinReach: z.boolean(),
  bedInLowestPosition: z.boolean(),
  sideRailsAppropriate: z.boolean(),
  assistiveDeviceAvailable: z.boolean(),
  fallRiskBandApplied: z.boolean(),
  familyEducated: z.boolean(),
  patientEducated: z.boolean(),
  notes: optionalNotes,
});

export const mobilityAmbulationAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    mobilityLevel: z.enum(MOBILITY_LEVEL_VALUES),
    ambulationDistance: z.coerce.number().min(0).max(10000),
    distanceUnit: z.enum(DISTANCE_UNIT_VALUES),
    assistiveDevice: z.enum(ASSISTIVE_DEVICE_VALUES),
    gaitStability: z.enum(GAIT_STABILITY_VALUES),
    toleratedActivity: z.boolean(),
    providerNotified: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.gaitStability === "SEVERELY_IMPAIRED" && !data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required for severely impaired gait",
        path: ["providerNotified"],
      });
    }
  });

export const nearFallEventPayloadSchema = z
  .object({
    eventTime: isoDateTimeString,
    location: locationText,
    assistedToSafety: z.boolean(),
    injuryObserved: z.boolean(),
    providerNotified: z.boolean(),
    familyNotified: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (!data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required for near-fall event",
        path: ["providerNotified"],
      });
    }
  });

export const fallEventDocumentationPayloadSchema = z
  .object({
    eventTime: isoDateTimeString,
    witnessed: z.enum(YES_NO_VALUES),
    location: locationText,
    foundBy: optionalText,
    headStrikeSuspected: z.boolean(),
    lossOfConsciousness: z.boolean(),
    injuryObserved: z.boolean(),
    providerNotified: z.boolean(),
    providerNotificationTime: isoDateTimeString,
    familyNotified: z.boolean(),
    rapidResponseActivated: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (!data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required for fall event",
        path: ["providerNotified"],
      });
    }
  });

export const postFallAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    painPresent: z.boolean(),
    injuryIdentified: z.boolean(),
    neurologicStatus: z.enum(NEUROLOGIC_STATUS_VALUES),
    mobilityStatus: z.enum(MOBILITY_STATUS_VALUES),
    vitalSignsObtained: z.boolean(),
    providerEvaluated: z.boolean(),
    imagingOrdered: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.neurologicStatus === "CHANGED" && !data.providerEvaluated) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider evaluation required when neurologic status changed post-fall",
        path: ["providerEvaluated"],
      });
    }
  });

export const fallEscalationEventPayloadSchema = z
  .object({
    eventTime: isoDateTimeString,
    reason: z.enum(FALL_ESCALATION_REASON_VALUES),
    providerNotified: z.boolean(),
    providerNotificationTime: isoDateTimeString,
    responseReceived: z.boolean(),
    responseTime: optionalIsoDateTime,
    additionalInterventionsOrdered: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (!data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required for fall escalation",
        path: ["providerNotified"],
      });
    }
  });

const PAYLOAD_SCHEMA_BY_CARD_ID: Record<string, z.ZodType<Record<string, unknown>>> = {
  [MORSE_FALL_RISK_ASSESSMENT_CARD_ID]: morseFallRiskAssessmentPayloadSchema,
  [FALL_RISK_REASSESSMENT_CARD_ID]: fallRiskReassessmentPayloadSchema,
  [SAFETY_PRECAUTIONS_DOCUMENTATION_CARD_ID]: safetyPrecautionsDocumentationPayloadSchema,
  [MOBILITY_AMBULATION_ASSESSMENT_CARD_ID]: mobilityAmbulationAssessmentPayloadSchema,
  [NEAR_FALL_EVENT_CARD_ID]: nearFallEventPayloadSchema,
  [FALL_EVENT_DOCUMENTATION_CARD_ID]: fallEventDocumentationPayloadSchema,
  [POST_FALL_ASSESSMENT_CARD_ID]: postFallAssessmentPayloadSchema,
  [FALL_ESCALATION_EVENT_CARD_ID]: fallEscalationEventPayloadSchema,
};

export function isEdoc14FallRiskSafetyDocumentationCardId(
  cardId: string
): cardId is Edoc14FallRiskSafetyDocumentationCardId {
  return (EDOC14_FALL_RISK_SAFETY_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId);
}

/** EDOC.14 — immediate witness when witnessed fall documented by non-witness recorder. */
export function requiresImmediateWitnessCaptureForFallRiskPayload(
  cardId: string,
  payload: Record<string, unknown>
): boolean {
  if (cardId !== FALL_EVENT_DOCUMENTATION_CARD_ID) return false;
  const parsed = fallEventDocumentationPayloadSchema.safeParse(payload);
  return parsed.success && parsed.data.witnessed === "YES";
}

export function validateFallRiskSafetyDocumentationPayloadForCard(
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

function riskLevelLabel(
  level: (typeof MORSE_RISK_LEVEL_VALUES)[number],
  locale: ClinicalDocumentationSummaryLocale
): string {
  return pickLocalizedEnumLabel(MORSE_RISK_LEVEL_MAP.en, MORSE_RISK_LEVEL_MAP.fr, level, locale);
}

export function summarizeFallRiskSafetyDocumentationPayload(
  cardId: string,
  payload: Record<string, unknown>,
  locale: ClinicalDocumentationSummaryLocale
): Array<{ key: string; value: string }> {
  switch (cardId) {
    case MORSE_FALL_RISK_ASSESSMENT_CARD_ID: {
      const p = morseFallRiskAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Morse score", "Score Morse"),
          value: String(d.calculatedScore),
        },
        {
          key: clinicalDocSummaryKey(locale, "Risk level", "Niveau de risque"),
          value: riskLevelLabel(d.riskLevel, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: clinicalDocYesNo(d.providerNotified, locale),
        },
      ];
    }
    case FALL_RISK_REASSESSMENT_CARD_ID: {
      const p = fallRiskReassessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      const lines: Array<{ key: string; value: string }> = [
        {
          key: clinicalDocSummaryKey(locale, "Current level", "Niveau actuel"),
          value: riskLevelLabel(d.currentRiskLevel, locale),
        },
      ];
      if (d.previousRiskLevel != null) {
        lines.unshift({
          key: clinicalDocSummaryKey(locale, "Previous level", "Niveau précédent"),
          value: riskLevelLabel(d.previousRiskLevel, locale),
        });
      }
      return lines;
    }
    case SAFETY_PRECAUTIONS_DOCUMENTATION_CARD_ID: {
      const p = safetyPrecautionsDocumentationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Bed alarm", "Alarme lit"),
          value: clinicalDocYesNo(d.bedAlarmActive, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Patient educated", "Patient informé"),
          value: clinicalDocYesNo(d.patientEducated, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Family educated", "Famille informée"),
          value: clinicalDocYesNo(d.familyEducated, locale),
        },
      ];
    }
    case MOBILITY_AMBULATION_ASSESSMENT_CARD_ID: {
      const p = mobilityAmbulationAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      const unitLabel = pickProductUiCopy(
        locale,
        { en: d.distanceUnit === "FEET" ? "ft" : "m", fr: d.distanceUnit === "FEET" ? "pi" : "m", es: d.distanceUnit === "FEET" ? "pies" : "m" },
        d.distanceUnit === "FEET" ? "pies" : "m"
      );
      return [
        {
          key: clinicalDocSummaryKey(locale, "Mobility level", "Niveau de mobilité"),
          value: pickLocalizedEnumLabel(
            MOBILITY_LEVEL_MAP.en,
            MOBILITY_LEVEL_MAP.fr,
            d.mobilityLevel,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Distance", "Distance"),
          value: `${d.ambulationDistance} ${unitLabel}`,
        },
        {
          key: clinicalDocSummaryKey(locale, "Gait stability", "Stabilité de la marche"),
          value: pickLocalizedEnumLabel(
            GAIT_STABILITY_MAP.en,
            GAIT_STABILITY_MAP.fr,
            d.gaitStability,
            locale
          ),
        },
      ];
    }
    case NEAR_FALL_EVENT_CARD_ID: {
      const p = nearFallEventPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Location", "Lieu"),
          value: d.location,
        },
        {
          key: clinicalDocSummaryKey(locale, "Injury observed", "Lésion observée"),
          value: clinicalDocYesNo(d.injuryObserved, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: clinicalDocYesNo(d.providerNotified, locale),
        },
      ];
    }
    case FALL_EVENT_DOCUMENTATION_CARD_ID: {
      const p = fallEventDocumentationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Witnessed", "Témoin"),
          value:
            clinicalDocYesNo(d.witnessed === "YES", locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Injury observed", "Lésion observée"),
          value: clinicalDocYesNo(d.injuryObserved, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: clinicalDocYesNo(d.providerNotified, locale),
        },
      ];
    }
    case POST_FALL_ASSESSMENT_CARD_ID: {
      const p = postFallAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Neurologic status", "Statut neurologique"),
          value: clinicalDocSummaryKey(
            locale,
            d.neurologicStatus === "BASELINE" ? "Baseline" : "Changed",
            d.neurologicStatus === "BASELINE" ? "Référence" : "Modifié"
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Injury identified", "Lésion identifiée"),
          value: clinicalDocYesNo(d.injuryIdentified, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider evaluated", "Évaluation médecin"),
          value: clinicalDocYesNo(d.providerEvaluated, locale),
        },
      ];
    }
    case FALL_ESCALATION_EVENT_CARD_ID: {
      const p = fallEscalationEventPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Reason", "Motif"),
          value: pickLocalizedEnumLabel(
            ESCALATION_REASON_MAP.en,
            ESCALATION_REASON_MAP.fr,
            d.reason,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: clinicalDocYesNo(d.providerNotified, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Response received", "Réponse reçue"),
          value: clinicalDocYesNo(d.responseReceived, locale),
        },
      ];
    }
    default:
      return [];
  }
}
