import { z } from "zod";
import type { ClinicalDocumentationFieldOption } from "./clinicalDocumentationFieldOptions.js";
import { PAIN_SCORE_0_10_OPTIONS } from "./clinicalDocumentationFieldOptions.js";
import {
  clinicalDocSummaryKey,
  clinicalDocYesNo,
  pickLocalizedEnumLabel,
  type ClinicalDocumentationSummaryLocale,
} from "./clinicalDocumentationSummaryLocale.js";

/** EDOC.13 — pain assessment & reassessment card IDs. */
export const PAIN_INITIAL_ASSESSMENT_CARD_ID = "pain_initial_assessment" as const;
export const PAIN_REASSESSMENT_CARD_ID = "pain_reassessment" as const;
export const PAIN_POST_INTERVENTION_REASSESSMENT_CARD_ID = "pain_post_intervention_reassessment" as const;
export const CHRONIC_PAIN_ASSESSMENT_CARD_ID = "chronic_pain_assessment" as const;
export const ADULT_NONVERBAL_PAIN_ASSESSMENT_CARD_ID = "adult_nonverbal_pain_assessment" as const;
export const PEDIATRIC_PAIN_ASSESSMENT_CARD_ID = "pediatric_pain_assessment" as const;
export const PAIN_ESCALATION_EVENT_CARD_ID = "pain_escalation_event" as const;

export const EDOC13_PAIN_DOCUMENTATION_CARD_IDS = [
  PAIN_INITIAL_ASSESSMENT_CARD_ID,
  PAIN_REASSESSMENT_CARD_ID,
  PAIN_POST_INTERVENTION_REASSESSMENT_CARD_ID,
  CHRONIC_PAIN_ASSESSMENT_CARD_ID,
  ADULT_NONVERBAL_PAIN_ASSESSMENT_CARD_ID,
  PEDIATRIC_PAIN_ASSESSMENT_CARD_ID,
  PAIN_ESCALATION_EVENT_CARD_ID,
] as const;

export type Edoc13PainDocumentationCardId = (typeof EDOC13_PAIN_DOCUMENTATION_CARD_IDS)[number];

/**
 * Future Phase — EDOC.13A Pain Escalation Automation
 * Do not implement now: automated alerts or paging from pain documentation flags.
 */
export const EDOC_13A_FUTURE_PAIN_ESCALATION_AUTOMATION = "EDOC.13A" as const;

/** Severe numeric pain threshold for provider notification (initial assessment). */
export const PAIN_SEVERE_NUMERIC_THRESHOLD = 8;
/** Severe FLACC / adult non-verbal total score threshold for provider notification. */
export const PAIN_SEVERE_SCALE_TOTAL_THRESHOLD = 7;

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
const painScore0to10 = z.coerce.number().int().min(0).max(10);
const flaccItem = z.coerce.number().int().min(0).max(2);
const optionalPainScore = painScore0to10.optional();

export const PAIN_SCALE_VALUES = ["NUMERIC", "WONG_BAKER", "FLACC", "NON_VERBAL"] as const;

export const PAIN_LOCATION_VALUES = [
  "HEAD",
  "CHEST",
  "ABDOMEN",
  "BACK",
  "NECK",
  "ARM",
  "LEG",
  "GENERALIZED",
  "MULTIPLE",
  "OTHER",
] as const;

export const PAIN_QUALITY_VALUES = [
  "ACHING",
  "SHARP",
  "DULL",
  "THROBBING",
  "BURNING",
  "CRAMPING",
  "PRESSURE",
  "STABBING",
  "OTHER",
] as const;

export const PAIN_DURATION_VALUES = ["NEW", "ONGOING", "CHRONIC", "INTERMITTENT"] as const;

export const PAIN_RADIATION_VALUES = ["NONE", "PRESENT"] as const;

export const FUNCTIONAL_IMPACT_VALUES = ["NONE", "MILD", "MODERATE", "SEVERE"] as const;

export const PAIN_INTERVENTION_TYPE_VALUES = [
  "MEDICATION",
  "POSITIONING",
  "ICE",
  "HEAT",
  "IMMOBILIZATION",
  "DISTRACTION",
  "RELAXATION",
  "OTHER",
] as const;

export const POST_INTERVENTION_RESPONSE_VALUES = ["IMPROVED", "UNCHANGED", "WORSE"] as const;

export const PAIN_ESCALATION_REASON_VALUES = [
  "SEVERE_PAIN",
  "UNCONTROLLED_PAIN",
  "WORSENING_PAIN",
  "POST_INTERVENTION_FAILURE",
  "NEW_PAIN",
  "CHEST_PAIN",
  "OTHER",
] as const;

export const PAIN_SEVERITY_BAND_VALUES = ["NO_PAIN", "MILD", "MODERATE", "SEVERE"] as const;

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

function scoreOptions0to2(
  labels: Record<number, { en: string; fr: string }>
): ClinicalDocumentationFieldOption<number>[] {
  return ([0, 1, 2] as const).map((value) => ({
    value,
    labelEn: `${value} — ${labels[value]!.en}`,
    labelFr: `${value} — ${labels[value]!.fr}`,
    scoreValue: value,
  }));
}

export const PAIN_SCALE_OPTIONS = enumOptions(PAIN_SCALE_VALUES, {
  NUMERIC: { en: "Numeric (0–10)", fr: "Numérique (0–10)" },
  WONG_BAKER: { en: "Wong-Baker FACES", fr: "Échelle FACES Wong-Baker" },
  FLACC: { en: "FLACC", fr: "FLACC" },
  NON_VERBAL: { en: "Non-verbal scale", fr: "Échelle non verbale" },
});

export const PAIN_LOCATION_OPTIONS = enumOptions(PAIN_LOCATION_VALUES, {
  HEAD: { en: "Head", fr: "Tête" },
  CHEST: { en: "Chest", fr: "Thorax" },
  ABDOMEN: { en: "Abdomen", fr: "Abdomen" },
  BACK: { en: "Back", fr: "Dos" },
  NECK: { en: "Neck", fr: "Cou" },
  ARM: { en: "Arm", fr: "Bras" },
  LEG: { en: "Leg", fr: "Jambe" },
  GENERALIZED: { en: "Generalized", fr: "Généralisée" },
  MULTIPLE: { en: "Multiple sites", fr: "Sites multiples" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const PAIN_QUALITY_OPTIONS = enumOptions(PAIN_QUALITY_VALUES, {
  ACHING: { en: "Aching", fr: "Douloureuse" },
  SHARP: { en: "Sharp", fr: "Vive" },
  DULL: { en: "Dull", fr: "Sourde" },
  THROBBING: { en: "Throbbing", fr: "Pulsatile" },
  BURNING: { en: "Burning", fr: "Brûlante" },
  CRAMPING: { en: "Cramping", fr: "Crampe" },
  PRESSURE: { en: "Pressure", fr: "Pression" },
  STABBING: { en: "Stabbing", fr: "Lancinante" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const PAIN_DURATION_OPTIONS = enumOptions(PAIN_DURATION_VALUES, {
  NEW: { en: "New onset", fr: "Récente" },
  ONGOING: { en: "Ongoing", fr: "En cours" },
  CHRONIC: { en: "Chronic", fr: "Chronique" },
  INTERMITTENT: { en: "Intermittent", fr: "Intermittente" },
});

export const FUNCTIONAL_IMPACT_OPTIONS = enumOptions(FUNCTIONAL_IMPACT_VALUES, {
  NONE: { en: "None", fr: "Aucun" },
  MILD: { en: "Mild", fr: "Léger" },
  MODERATE: { en: "Moderate", fr: "Modéré" },
  SEVERE: { en: "Severe", fr: "Sévère" },
});

export const PAIN_INTERVENTION_TYPE_OPTIONS = enumOptions(PAIN_INTERVENTION_TYPE_VALUES, {
  MEDICATION: { en: "Medication", fr: "Médicament" },
  POSITIONING: { en: "Positioning", fr: "Positionnement" },
  ICE: { en: "Ice", fr: "Glace" },
  HEAT: { en: "Heat", fr: "Chaleur" },
  IMMOBILIZATION: { en: "Immobilization", fr: "Immobilisation" },
  DISTRACTION: { en: "Distraction", fr: "Distraction" },
  RELAXATION: { en: "Relaxation", fr: "Relaxation" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const POST_INTERVENTION_RESPONSE_OPTIONS = enumOptions(POST_INTERVENTION_RESPONSE_VALUES, {
  IMPROVED: { en: "Improved", fr: "Amélioré" },
  UNCHANGED: { en: "Unchanged", fr: "Inchangé" },
  WORSE: { en: "Worse", fr: "Aggravé" },
});

export const PAIN_ESCALATION_REASON_OPTIONS = enumOptions(PAIN_ESCALATION_REASON_VALUES, {
  SEVERE_PAIN: { en: "Severe pain", fr: "Douleur sévère" },
  UNCONTROLLED_PAIN: { en: "Uncontrolled pain", fr: "Douleur non contrôlée" },
  WORSENING_PAIN: { en: "Worsening pain", fr: "Douleur aggravée" },
  POST_INTERVENTION_FAILURE: { en: "Post-intervention failure", fr: "Échec post-intervention" },
  NEW_PAIN: { en: "New pain", fr: "Nouvelle douleur" },
  CHEST_PAIN: { en: "Chest pain", fr: "Douleur thoracique" },
  OTHER: { en: "Other", fr: "Autre" },
});

const FLACC_FACE_LABELS: Record<number, { en: string; fr: string }> = {
  0: { en: "No particular expression", fr: "Aucune expression particulière" },
  1: { en: "Occasional grimace", fr: "Grimace occasionnelle" },
  2: { en: "Frequent grimace", fr: "Grimace fréquente" },
};

const FLACC_LEGS_LABELS: Record<number, { en: string; fr: string }> = {
  0: { en: "Normal / relaxed", fr: "Normales / détendues" },
  1: { en: "Uneasy / restless", fr: "Agitées / inquiètes" },
  2: { en: "Kicking / drawn up", fr: "Battements / repliées" },
};

const FLACC_ACTIVITY_LABELS: Record<number, { en: string; fr: string }> = {
  0: { en: "Lying quietly", fr: "Allongé calmement" },
  1: { en: "Squirming / shifting", fr: "Agitation / mouvements" },
  2: { en: "Arched / rigid / jerking", fr: "Cambré / rigide / sursauts" },
};

const FLACC_CRY_LABELS: Record<number, { en: string; fr: string }> = {
  0: { en: "No cry", fr: "Pas de pleurs" },
  1: { en: "Moans / whimpers", fr: "Gémissements" },
  2: { en: "Crying steadily / screaming", fr: "Pleurs continus / cris" },
};

const FLACC_CONSOLABILITY_LABELS: Record<number, { en: string; fr: string }> = {
  0: { en: "Content / relaxed", fr: "Calme / détendu" },
  1: { en: "Reassured by touch", fr: "Rassuré au toucher" },
  2: { en: "Difficult to console", fr: "Difficile à consoler" },
};

export const FLACC_FACE_OPTIONS = scoreOptions0to2(FLACC_FACE_LABELS);
export const FLACC_LEGS_OPTIONS = scoreOptions0to2(FLACC_LEGS_LABELS);
export const FLACC_ACTIVITY_OPTIONS = scoreOptions0to2(FLACC_ACTIVITY_LABELS);
export const FLACC_CRY_OPTIONS = scoreOptions0to2(FLACC_CRY_LABELS);
export const FLACC_CONSOLABILITY_OPTIONS = scoreOptions0to2(FLACC_CONSOLABILITY_LABELS);

const NONVERBAL_FACE_LABELS: Record<number, { en: string; fr: string }> = {
  0: { en: "Smiling / inexpressive", fr: "Souriant / inexpressif" },
  1: { en: "Sad / frightened / frown", fr: "Triste / effrayé / froncement" },
  2: { en: "Facial grimacing", fr: "Grimace faciale" },
};

const NONVERBAL_ACTIVITY_LABELS: Record<number, { en: string; fr: string }> = {
  0: { en: "Normal / at rest", fr: "Normal / au repos" },
  1: { en: "Restless / tense", fr: "Agité / tendu" },
  2: { en: "Rigid / clenched fists", fr: "Rigide / poings serrés" },
};

const NONVERBAL_GUARDING_LABELS: Record<number, { en: string; fr: string }> = {
  0: { en: "No guarding", fr: "Pas de protection" },
  1: { en: "Mild guarding", fr: "Protection légère" },
  2: { en: "Marked guarding", fr: "Protection marquée" },
};

const NONVERBAL_PHYSIOLOGY_LABELS: Record<number, { en: string; fr: string }> = {
  0: { en: "Stable vitals", fr: "Signes vitaux stables" },
  1: { en: "Mild changes", fr: "Changements légers" },
  2: { en: "Marked changes", fr: "Changements marqués" },
};

const NONVERBAL_RESPIRATORY_LABELS: Record<number, { en: string; fr: string }> = {
  0: { en: "Normal breathing", fr: "Respiration normale" },
  1: { en: "Occasional labored", fr: "Difficulté occasionnelle" },
  2: { en: "Labored / noisy", fr: "Difficile / bruyante" },
};

export const NONVERBAL_FACE_OPTIONS = scoreOptions0to2(NONVERBAL_FACE_LABELS);
export const NONVERBAL_ACTIVITY_OPTIONS = scoreOptions0to2(NONVERBAL_ACTIVITY_LABELS);
export const NONVERBAL_GUARDING_OPTIONS = scoreOptions0to2(NONVERBAL_GUARDING_LABELS);
export const NONVERBAL_PHYSIOLOGY_OPTIONS = scoreOptions0to2(NONVERBAL_PHYSIOLOGY_LABELS);
export const NONVERBAL_RESPIRATORY_OPTIONS = scoreOptions0to2(NONVERBAL_RESPIRATORY_LABELS);

export { PAIN_SCORE_0_10_OPTIONS };

export function calculateFlaccScore(input: {
  face: number;
  legs: number;
  activity: number;
  cry: number;
  consolability: number;
}): number {
  return input.face + input.legs + input.activity + input.cry + input.consolability;
}

export function calculateAdultNonVerbalPainScore(input: {
  facialExpression: number;
  activity: number;
  guarding: number;
  physiology: number;
  respiratory: number;
}): number {
  return (
    input.facialExpression +
    input.activity +
    input.guarding +
    input.physiology +
    input.respiratory
  );
}

export function derivePainSeverityBand(
  score: number
): (typeof PAIN_SEVERITY_BAND_VALUES)[number] {
  if (score <= 0) return "NO_PAIN";
  if (score <= 3) return "MILD";
  if (score <= 6) return "MODERATE";
  return "SEVERE";
}

function expectedPostInterventionResponse(
  before: number,
  after: number
): (typeof POST_INTERVENTION_RESPONSE_VALUES)[number] {
  if (after < before) return "IMPROVED";
  if (after > before) return "WORSE";
  return "UNCHANGED";
}

const labelMap = <T extends string>(options: ClinicalDocumentationFieldOption<T>[]) => ({
  en: Object.fromEntries(options.map((o) => [o.value, o.labelEn])),
  fr: Object.fromEntries(options.map((o) => [o.value, o.labelFr])),
});

const PAIN_SCALE_MAP = labelMap(PAIN_SCALE_OPTIONS);
const PAIN_LOCATION_MAP = labelMap(PAIN_LOCATION_OPTIONS);
const PAIN_QUALITY_MAP = labelMap(PAIN_QUALITY_OPTIONS);
const FUNCTIONAL_IMPACT_MAP = labelMap(FUNCTIONAL_IMPACT_OPTIONS);
const INTERVENTION_TYPE_MAP = labelMap(PAIN_INTERVENTION_TYPE_OPTIONS);
const RESPONSE_MAP = labelMap(POST_INTERVENTION_RESPONSE_OPTIONS);
const ESCALATION_REASON_MAP = labelMap(PAIN_ESCALATION_REASON_OPTIONS);

const SEVERITY_EN: Record<string, string> = {
  NO_PAIN: "No pain (0)",
  MILD: "Mild (1–3)",
  MODERATE: "Moderate (4–6)",
  SEVERE: "Severe (7–10)",
};
const SEVERITY_FR: Record<string, string> = {
  NO_PAIN: "Aucune (0)",
  MILD: "Légère (1–3)",
  MODERATE: "Modérée (4–6)",
  SEVERE: "Sévère (7–10)",
};

export const painInitialAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    painScale: z.enum(PAIN_SCALE_VALUES),
    painScore: painScore0to10,
    painLocation: z.enum(PAIN_LOCATION_VALUES),
    painQuality: z.enum(PAIN_QUALITY_VALUES),
    painDuration: z.enum(PAIN_DURATION_VALUES),
    painRadiation: z.enum(PAIN_RADIATION_VALUES),
    painRadiationDescription: optionalText,
    aggravatingFactors: optionalText,
    relievingFactors: optionalText,
    functionalImpact: z.enum(FUNCTIONAL_IMPACT_VALUES),
    providerNotified: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.painRadiation === "PRESENT" && !data.painRadiationDescription?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Radiation description required when radiation present",
        path: ["painRadiationDescription"],
      });
    }
    if (data.painScore >= PAIN_SEVERE_NUMERIC_THRESHOLD && !data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required for severe pain (≥8)",
        path: ["providerNotified"],
      });
    }
  });

export const painReassessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    painScale: z.enum(PAIN_SCALE_VALUES),
    painScore: painScore0to10,
    previousPainScore: optionalPainScore,
    painImproved: z.boolean(),
    functionalImpact: z.enum(FUNCTIONAL_IMPACT_VALUES),
    providerNotified: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (
      data.previousPainScore != null &&
      data.painScore >= data.previousPainScore &&
      data.painImproved
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "painImproved must be false when score did not decrease",
        path: ["painImproved"],
      });
    }
    if (data.painScore >= PAIN_SEVERE_SCALE_TOTAL_THRESHOLD && !data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required when severe pain persists",
        path: ["providerNotified"],
      });
    }
  });

export const painPostInterventionReassessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    interventionType: z.enum(PAIN_INTERVENTION_TYPE_VALUES),
    painScoreBefore: painScore0to10,
    painScoreAfter: painScore0to10,
    response: z.enum(POST_INTERVENTION_RESPONSE_VALUES),
    providerNotified: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    const expected = expectedPostInterventionResponse(data.painScoreBefore, data.painScoreAfter);
    if (data.response !== expected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "response must match pain score trend",
        path: ["response"],
      });
    }
    if (data.response === "WORSE" && !data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required when pain worsened post-intervention",
        path: ["providerNotified"],
      });
    }
  });

export const chronicPainAssessmentPayloadSchema = z.object({
  assessmentTime: isoDateTimeString,
  baselinePainScore: painScore0to10,
  currentPainScore: painScore0to10,
  painManagementPlanPresent: z.boolean(),
  opioidTherapyReported: z.boolean(),
  painInterferesWithSleep: z.boolean(),
  painInterferesWithMobility: z.boolean(),
  painInterferesWithADLs: z.boolean(),
  providerManagingPainKnown: z.boolean(),
  notes: optionalNotes,
});

export const adultNonverbalPainAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    facialExpression: flaccItem,
    activity: flaccItem,
    guarding: flaccItem,
    physiology: flaccItem,
    respiratory: flaccItem,
    totalScore: z.coerce.number().int().min(0).max(10),
    providerNotified: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    const calculated = calculateAdultNonVerbalPainScore(data);
    if (data.totalScore !== calculated) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "totalScore must equal sum of non-verbal pain items",
        path: ["totalScore"],
      });
    }
    if (calculated >= PAIN_SEVERE_SCALE_TOTAL_THRESHOLD && !data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required for severe non-verbal pain score",
        path: ["providerNotified"],
      });
    }
  });

export const pediatricPainAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    face: flaccItem,
    legs: flaccItem,
    activity: flaccItem,
    cry: flaccItem,
    consolability: flaccItem,
    totalScore: z.coerce.number().int().min(0).max(10),
    providerNotified: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    const calculated = calculateFlaccScore(data);
    if (data.totalScore !== calculated) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "totalScore must equal sum of FLACC items",
        path: ["totalScore"],
      });
    }
    if (calculated >= PAIN_SEVERE_SCALE_TOTAL_THRESHOLD && !data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required for severe FLACC score",
        path: ["providerNotified"],
      });
    }
  });

export const painEscalationEventPayloadSchema = z
  .object({
    eventTime: isoDateTimeString,
    reason: z.enum(PAIN_ESCALATION_REASON_VALUES),
    providerNotified: z.boolean(),
    providerNotificationTime: isoDateTimeString,
    responseReceived: z.boolean(),
    responseTime: optionalIsoDateTime,
    additionalInterventionOrdered: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (!data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required for pain escalation",
        path: ["providerNotified"],
      });
    }
  });

const PAYLOAD_SCHEMA_BY_CARD_ID: Record<string, z.ZodType<Record<string, unknown>>> = {
  [PAIN_INITIAL_ASSESSMENT_CARD_ID]: painInitialAssessmentPayloadSchema,
  [PAIN_REASSESSMENT_CARD_ID]: painReassessmentPayloadSchema,
  [PAIN_POST_INTERVENTION_REASSESSMENT_CARD_ID]: painPostInterventionReassessmentPayloadSchema,
  [CHRONIC_PAIN_ASSESSMENT_CARD_ID]: chronicPainAssessmentPayloadSchema,
  [ADULT_NONVERBAL_PAIN_ASSESSMENT_CARD_ID]: adultNonverbalPainAssessmentPayloadSchema,
  [PEDIATRIC_PAIN_ASSESSMENT_CARD_ID]: pediatricPainAssessmentPayloadSchema,
  [PAIN_ESCALATION_EVENT_CARD_ID]: painEscalationEventPayloadSchema,
};

export function isEdoc13PainDocumentationCardId(
  cardId: string
): cardId is Edoc13PainDocumentationCardId {
  return (EDOC13_PAIN_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId);
}

export function validatePainDocumentationPayloadForCard(
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

function severityLabel(score: number, locale: ClinicalDocumentationSummaryLocale): string {
  const band = derivePainSeverityBand(score);
  return pickLocalizedEnumLabel(SEVERITY_EN, SEVERITY_FR, band, locale);
}

export function summarizePainDocumentationPayload(
  cardId: string,
  payload: Record<string, unknown>,
  locale: ClinicalDocumentationSummaryLocale
): Array<{ key: string; value: string }> {
  switch (cardId) {
    case PAIN_INITIAL_ASSESSMENT_CARD_ID: {
      const p = painInitialAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Pain score", "Score douleur"),
          value: String(d.painScore),
        },
        {
          key: clinicalDocSummaryKey(locale, "Severity", "Sévérité"),
          value: severityLabel(d.painScore, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Location", "Localisation"),
          value: pickLocalizedEnumLabel(
            PAIN_LOCATION_MAP.en,
            PAIN_LOCATION_MAP.fr,
            d.painLocation,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Quality", "Qualité"),
          value: pickLocalizedEnumLabel(
            PAIN_QUALITY_MAP.en,
            PAIN_QUALITY_MAP.fr,
            d.painQuality,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: clinicalDocYesNo(d.providerNotified, locale),
        },
      ];
    }
    case PAIN_REASSESSMENT_CARD_ID: {
      const p = painReassessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      const lines: Array<{ key: string; value: string }> = [
        {
          key: clinicalDocSummaryKey(locale, "Current score", "Score actuel"),
          value: String(d.painScore),
        },
      ];
      if (d.previousPainScore != null) {
        lines.push({
          key: clinicalDocSummaryKey(locale, "Previous score", "Score précédent"),
          value: String(d.previousPainScore),
        });
      }
      lines.push({
        key: clinicalDocSummaryKey(locale, "Improved", "Amélioré"),
        value: clinicalDocYesNo(d.painImproved, locale),
      });
      return lines;
    }
    case PAIN_POST_INTERVENTION_REASSESSMENT_CARD_ID: {
      const p = painPostInterventionReassessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Before", "Avant"),
          value: String(d.painScoreBefore),
        },
        {
          key: clinicalDocSummaryKey(locale, "After", "Après"),
          value: String(d.painScoreAfter),
        },
        {
          key: clinicalDocSummaryKey(locale, "Response", "Réponse"),
          value: pickLocalizedEnumLabel(
            RESPONSE_MAP.en,
            RESPONSE_MAP.fr,
            d.response,
            locale
          ),
        },
      ];
    }
    case CHRONIC_PAIN_ASSESSMENT_CARD_ID: {
      const p = chronicPainAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      const adlImpact: string[] = [];
      if (d.painInterferesWithSleep) adlImpact.push(clinicalDocSummaryKey(locale, "Sleep", "Sommeil"));
      if (d.painInterferesWithMobility) adlImpact.push(clinicalDocSummaryKey(locale, "Mobility", "Mobilité"));
      if (d.painInterferesWithADLs) adlImpact.push(clinicalDocSummaryKey(locale, "ADLs", "AVQ"));
      return [
        {
          key: clinicalDocSummaryKey(locale, "Baseline", "Référence"),
          value: String(d.baselinePainScore),
        },
        {
          key: clinicalDocSummaryKey(locale, "Current", "Actuel"),
          value: String(d.currentPainScore),
        },
        {
          key: clinicalDocSummaryKey(locale, "ADL impact", "Impact AVQ"),
          value: adlImpact.length > 0 ? adlImpact.join(", ") : clinicalDocSummaryKey(locale, "None reported", "Aucun signalé"),
        },
      ];
    }
    case ADULT_NONVERBAL_PAIN_ASSESSMENT_CARD_ID: {
      const p = adultNonverbalPainAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Total score", "Score total"),
          value: String(d.totalScore),
        },
        {
          key: clinicalDocSummaryKey(locale, "Severity", "Sévérité"),
          value: severityLabel(d.totalScore, locale),
        },
      ];
    }
    case PEDIATRIC_PAIN_ASSESSMENT_CARD_ID: {
      const p = pediatricPainAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "FLACC total", "Total FLACC"),
          value: String(d.totalScore),
        },
        {
          key: clinicalDocSummaryKey(locale, "Severity", "Sévérité"),
          value: severityLabel(d.totalScore, locale),
        },
      ];
    }
    case PAIN_ESCALATION_EVENT_CARD_ID: {
      const p = painEscalationEventPayloadSchema.safeParse(payload);
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
