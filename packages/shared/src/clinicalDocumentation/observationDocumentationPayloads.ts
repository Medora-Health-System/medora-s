import { z } from "zod";
import {
  EDOC4_STROKE_DOCUMENTATION_CARD_IDS,
  validateStrokePayloadForCard,
} from "./strokeDocumentationPayloads.js";
import {
  EDOC5_INTAKE_OUTPUT_CARD_IDS,
  validateIntakeOutputPayloadForCard,
} from "./intakeOutputDocumentationPayloads.js";
import {
  EDOC6_RESTRAINT_DOCUMENTATION_CARD_IDS,
  validateRestraintPayloadForCard,
} from "./restraintDocumentationPayloads.js";
import {
  EDOC7_BLOOD_PRODUCT_DOCUMENTATION_CARD_IDS,
  validateBloodProductPayloadForCard,
} from "./bloodProductDocumentationPayloads.js";
import {
  clinicalDocYesNo,
  pickLocalizedEnumLabel,
  type ClinicalDocumentationSummaryLocale,
} from "./clinicalDocumentationSummaryLocale.js";

/** EDOC.2 — minimal foundation card (generic key/value only for this card). */
export const EDOC_BASIC_STRUCTURED_CARD_ID = "edoc_basic_structured_v1" as const;

const basicItemSchema = z.object({
  key: z.string().trim().min(1).max(120),
  value: z.string().trim().min(1).max(500),
});

export const edocBasicStructuredPayloadSchema = z.object({
  items: z.array(basicItemSchema).min(1).max(20),
});

/** EDOC.3 — registry card IDs (EDOC.1 naming: obs_*). */
export const OBS_PO_CHALLENGE_CARD_ID = "obs_po_challenge" as const;
export const OBS_AMBULATION_TRIAL_CARD_ID = "obs_ambulation_trial" as const;
export const OBS_REASSESSMENT_CARD_ID = "obs_reassessment" as const;
export const OBS_BOARDING_CARD_ID = "obs_boarding" as const;
export const OBS_DISCHARGE_READINESS_CARD_ID = "obs_discharge_readiness" as const;

export const EDOC3_OBSERVATION_DOCUMENTATION_CARD_IDS = [
  OBS_PO_CHALLENGE_CARD_ID,
  OBS_AMBULATION_TRIAL_CARD_ID,
  OBS_REASSESSMENT_CARD_ID,
  OBS_BOARDING_CARD_ID,
  OBS_DISCHARGE_READINESS_CARD_ID,
] as const;

export type Edoc3ObservationDocumentationCardId =
  (typeof EDOC3_OBSERVATION_DOCUMENTATION_CARD_IDS)[number];

const optionalNotes = z.string().trim().max(2000).optional();

const isoDateTimeString = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date/time" });

const poTolerated = z.enum(["YES", "NO", "PARTIAL"]);
const trialResult = z.enum(["PASSED", "FAILED", "PARTIAL", "STOPPED"]);

export const poChallengePayloadSchema = z.object({
  startTime: isoDateTimeString,
  substance: z.string().trim().min(1).max(200),
  amount: z.string().trim().min(1).max(120),
  tolerated: poTolerated,
  nausea: z.boolean(),
  vomiting: z.boolean(),
  abdominalPain: z.boolean(),
  result: trialResult,
  notes: optionalNotes,
});

export const ambulationTrialPayloadSchema = z.object({
  assistanceLevel: z.enum(["NONE", "STANDBY", "ONE_PERSON", "TWO_PERSON", "DEVICE"]),
  distance: z.coerce.number().min(0).max(99999),
  distanceUnit: z.enum(["FEET", "METERS", "STEPS"]),
  gaitSteady: z.boolean(),
  dizziness: z.boolean(),
  shortnessOfBreath: z.boolean(),
  pain: z.boolean(),
  oxygenDesaturation: z.boolean(),
  result: trialResult,
  notes: optionalNotes,
});

export const observationReassessmentPayloadSchema = z.object({
  reassessmentTime: isoDateTimeString,
  patientCondition: z.enum(["IMPROVED", "UNCHANGED", "WORSENED"]),
  painScore: z.coerce.number().int().min(0).max(10).optional(),
  vitalsReviewed: z.boolean(),
  pendingResults: z.boolean(),
  providerNotified: z.boolean(),
  notes: optionalNotes,
});

export const boardingDocumentationPayloadSchema = z.object({
  boardingReason: z.string().trim().min(1).max(500),
  location: z.string().trim().min(1).max(200),
  safetyCheckCompleted: z.boolean(),
  comfortMeasuresOffered: z.boolean(),
  nutritionOffered: z.boolean(),
  toiletingOffered: z.boolean(),
  providerUpdated: z.boolean(),
  notes: optionalNotes,
});

export const dischargeReadinessPayloadSchema = z.object({
  instructionsReviewed: z.boolean(),
  medicationsReviewed: z.boolean(),
  followUpReviewed: z.boolean(),
  returnPrecautionsReviewed: z.boolean(),
  transportationConfirmed: z.boolean(),
  patientVerbalizedUnderstanding: z.boolean(),
  barriersIdentified: z.boolean(),
  notes: optionalNotes,
});

export type PoChallengePayload = z.infer<typeof poChallengePayloadSchema>;
export type AmbulationTrialPayload = z.infer<typeof ambulationTrialPayloadSchema>;
export type ObservationReassessmentPayload = z.infer<typeof observationReassessmentPayloadSchema>;
export type BoardingDocumentationPayload = z.infer<typeof boardingDocumentationPayloadSchema>;
export type DischargeReadinessPayload = z.infer<typeof dischargeReadinessPayloadSchema>;

const PAYLOAD_SCHEMA_BY_CARD_ID: Record<
  string,
  z.ZodType<Record<string, unknown>>
> = {
  [EDOC_BASIC_STRUCTURED_CARD_ID]: edocBasicStructuredPayloadSchema,
  [OBS_PO_CHALLENGE_CARD_ID]: poChallengePayloadSchema,
  [OBS_AMBULATION_TRIAL_CARD_ID]: ambulationTrialPayloadSchema,
  [OBS_REASSESSMENT_CARD_ID]: observationReassessmentPayloadSchema,
  [OBS_BOARDING_CARD_ID]: boardingDocumentationPayloadSchema,
  [OBS_DISCHARGE_READINESS_CARD_ID]: dischargeReadinessPayloadSchema,
};

/** Cards with registered Zod validators (EDOC.2 basic + EDOC.3 observation + EDOC.4 stroke + EDOC.5 I&O). */
export const CLINICAL_DOCUMENTATION_CARDS_WITH_PAYLOAD_VALIDATORS = [
  ...Object.keys(PAYLOAD_SCHEMA_BY_CARD_ID),
  ...EDOC4_STROKE_DOCUMENTATION_CARD_IDS,
  ...EDOC5_INTAKE_OUTPUT_CARD_IDS,
  ...EDOC6_RESTRAINT_DOCUMENTATION_CARD_IDS,
  ...EDOC7_BLOOD_PRODUCT_DOCUMENTATION_CARD_IDS,
] as string[];

export function validatePayloadForCard(
  cardId: string,
  payload: Record<string, unknown>
): { ok: true; data: Record<string, unknown> } | { ok: false; message: string } {
  const schema = PAYLOAD_SCHEMA_BY_CARD_ID[cardId];
  if (schema) {
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, message: "Invalid clinical documentation payload" };
    }
    return { ok: true, data: parsed.data as Record<string, unknown> };
  }
  const strokeResult = validateStrokePayloadForCard(cardId, payload);
  if (
    strokeResult.ok ||
    (EDOC4_STROKE_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId)
  ) {
    return strokeResult;
  }
  const ioResult = validateIntakeOutputPayloadForCard(cardId, payload);
  if (
    ioResult.ok ||
    (EDOC5_INTAKE_OUTPUT_CARD_IDS as readonly string[]).includes(cardId)
  ) {
    return ioResult;
  }
  const bloodResult = validateBloodProductPayloadForCard(cardId, payload);
  if (
    bloodResult.ok ||
    (EDOC7_BLOOD_PRODUCT_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId)
  ) {
    return bloodResult;
  }
  return validateRestraintPayloadForCard(cardId, payload);
}

const PO_TOLERATED_EN: Record<string, string> = {
  YES: "Yes",
  NO: "No",
  PARTIAL: "Partial",
};

const PO_TOLERATED_FR: Record<string, string> = {
  YES: "Oui",
  NO: "Non",
  PARTIAL: "Partiel",
};

const TRIAL_RESULT_EN: Record<string, string> = {
  PASSED: "Passed",
  FAILED: "Failed",
  PARTIAL: "Partial",
  STOPPED: "Stopped",
};

const TRIAL_RESULT_FR: Record<string, string> = {
  PASSED: "Réussi",
  FAILED: "Échoué",
  PARTIAL: "Partiel",
  STOPPED: "Arrêté",
};

const ASSISTANCE_EN: Record<string, string> = {
  NONE: "None",
  STANDBY: "Standby",
  ONE_PERSON: "1 person",
  TWO_PERSON: "2 people",
  DEVICE: "Assistive device",
};

const ASSISTANCE_FR: Record<string, string> = {
  NONE: "Aucune",
  STANDBY: "Présence",
  ONE_PERSON: "1 personne",
  TWO_PERSON: "2 personnes",
  DEVICE: "Aide technique",
};

const DISTANCE_UNIT_EN: Record<string, string> = {
  FEET: "feet",
  METERS: "meters",
  STEPS: "steps",
};

const DISTANCE_UNIT_FR: Record<string, string> = {
  FEET: "pieds",
  METERS: "mètres",
  STEPS: "pas",
};

const CONDITION_EN: Record<string, string> = {
  IMPROVED: "Improved",
  UNCHANGED: "Unchanged",
  WORSENED: "Worsened",
};

const CONDITION_FR: Record<string, string> = {
  IMPROVED: "Amélioré",
  UNCHANGED: "Stable",
  WORSENED: "Détérioré",
};

/** Localized key/value lines for observation cards. */
export function summarizeObservationDocumentationPayload(
  cardId: string,
  payload: Record<string, unknown>,
  locale: ClinicalDocumentationSummaryLocale
): Array<{ key: string; value: string }> {
  switch (cardId) {
    case OBS_PO_CHALLENGE_CARD_ID: {
      const p = poChallengePayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      const lines: Array<{ key: string; value: string }> = [
        {
          key: locale === "en" ? "Result" : "Résultat",
          value: pickLocalizedEnumLabel(TRIAL_RESULT_EN, TRIAL_RESULT_FR, d.result, locale),
        },
        {
          key: locale === "en" ? "Tolerated" : "Tolérance",
          value: pickLocalizedEnumLabel(PO_TOLERATED_EN, PO_TOLERATED_FR, d.tolerated, locale),
        },
        { key: locale === "en" ? "Substance" : "Substance", value: d.substance },
        { key: locale === "en" ? "Amount" : "Quantité", value: d.amount },
        { key: locale === "en" ? "Start" : "Début", value: d.startTime },
        { key: locale === "en" ? "Nausea" : "Nausées", value: clinicalDocYesNo(d.nausea, locale) },
        {
          key: locale === "en" ? "Vomiting" : "Vomissements",
          value: clinicalDocYesNo(d.vomiting, locale),
        },
        {
          key: locale === "en" ? "Abdominal pain" : "Douleur abdominale",
          value: clinicalDocYesNo(d.abdominalPain, locale),
        },
      ];
      if (d.notes?.trim()) lines.push({ key: "Notes", value: d.notes.trim() });
      return lines;
    }
    case OBS_AMBULATION_TRIAL_CARD_ID: {
      const p = ambulationTrialPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      const lines: Array<{ key: string; value: string }> = [
        {
          key: locale === "en" ? "Result" : "Résultat",
          value: pickLocalizedEnumLabel(TRIAL_RESULT_EN, TRIAL_RESULT_FR, d.result, locale),
        },
        {
          key: "Distance",
          value: `${d.distance} ${pickLocalizedEnumLabel(DISTANCE_UNIT_EN, DISTANCE_UNIT_FR, d.distanceUnit, locale)}`,
        },
        {
          key: locale === "en" ? "Assistance" : "Assistance",
          value: pickLocalizedEnumLabel(ASSISTANCE_EN, ASSISTANCE_FR, d.assistanceLevel, locale),
        },
        {
          key: locale === "en" ? "Steady gait" : "Démarche stable",
          value: clinicalDocYesNo(d.gaitSteady, locale),
        },
        { key: locale === "en" ? "Dizziness" : "Vertiges", value: clinicalDocYesNo(d.dizziness, locale) },
        {
          key: locale === "en" ? "Shortness of breath" : "Dyspnée",
          value: clinicalDocYesNo(d.shortnessOfBreath, locale),
        },
        { key: locale === "en" ? "Pain" : "Douleur", value: clinicalDocYesNo(d.pain, locale) },
        {
          key: locale === "en" ? "Oxygen desaturation" : "Désaturation O₂",
          value: clinicalDocYesNo(d.oxygenDesaturation, locale),
        },
      ];
      if (d.notes?.trim()) lines.push({ key: "Notes", value: d.notes.trim() });
      return lines;
    }
    case OBS_REASSESSMENT_CARD_ID: {
      const p = observationReassessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      const lines: Array<{ key: string; value: string }> = [
        {
          key: locale === "en" ? "Condition" : "État",
          value: pickLocalizedEnumLabel(CONDITION_EN, CONDITION_FR, d.patientCondition, locale),
        },
        { key: locale === "en" ? "Time" : "Heure", value: d.reassessmentTime },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: clinicalDocYesNo(d.providerNotified, locale),
        },
        {
          key: locale === "en" ? "Vitals reviewed" : "Signes vitaux revus",
          value: clinicalDocYesNo(d.vitalsReviewed, locale),
        },
        {
          key: locale === "en" ? "Pending results" : "Résultats en attente",
          value: clinicalDocYesNo(d.pendingResults, locale),
        },
      ];
      if (d.painScore != null) {
        lines.push({
          key: locale === "en" ? "Pain (0-10)" : "Douleur (0-10)",
          value: String(d.painScore),
        });
      }
      if (d.notes?.trim()) lines.push({ key: "Notes", value: d.notes.trim() });
      return lines;
    }
    case OBS_BOARDING_CARD_ID: {
      const p = boardingDocumentationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      const lines: Array<{ key: string; value: string }> = [
        { key: locale === "en" ? "Boarding reason" : "Motif attente", value: d.boardingReason },
        { key: locale === "en" ? "Location" : "Emplacement", value: d.location },
        {
          key: locale === "en" ? "Safety check" : "Contrôle sécurité",
          value: clinicalDocYesNo(d.safetyCheckCompleted, locale),
        },
        {
          key: locale === "en" ? "Comfort offered" : "Confort offert",
          value: clinicalDocYesNo(d.comfortMeasuresOffered, locale),
        },
        {
          key: locale === "en" ? "Nutrition offered" : "Nutrition offerte",
          value: clinicalDocYesNo(d.nutritionOffered, locale),
        },
        {
          key: locale === "en" ? "Toileting offered" : "Toilette offerte",
          value: clinicalDocYesNo(d.toiletingOffered, locale),
        },
        {
          key: locale === "en" ? "Provider updated" : "Médecin informé",
          value: clinicalDocYesNo(d.providerUpdated, locale),
        },
      ];
      if (d.notes?.trim()) lines.push({ key: "Notes", value: d.notes.trim() });
      return lines;
    }
    case OBS_DISCHARGE_READINESS_CARD_ID: {
      const p = dischargeReadinessPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      const checklist =
        locale === "en"
          ? ([
              ["Instructions", d.instructionsReviewed],
              ["Medications", d.medicationsReviewed],
              ["Follow-up", d.followUpReviewed],
              ["Return precautions", d.returnPrecautionsReviewed],
              ["Transportation", d.transportationConfirmed],
              ["Patient understanding", d.patientVerbalizedUnderstanding],
            ] as const)
          : ([
              ["Consignes", d.instructionsReviewed],
              ["Médicaments", d.medicationsReviewed],
              ["Suivi", d.followUpReviewed],
              ["Signes d'alerte", d.returnPrecautionsReviewed],
              ["Transport", d.transportationConfirmed],
              ["Compréhension patient", d.patientVerbalizedUnderstanding],
            ] as const);
      const done = checklist.filter(([, v]) => v).map(([k]) => k);
      const lines: Array<{ key: string; value: string }> = [
        {
          key: locale === "en" ? "Checklist" : "Liste de contrôle",
          value:
            done.length > 0
              ? done.join(", ")
              : locale === "en"
                ? "No items checked"
                : "Aucun élément coché",
        },
        {
          key: locale === "en" ? "Barriers identified" : "Obstacles identifiés",
          value: clinicalDocYesNo(d.barriersIdentified, locale),
        },
      ];
      if (d.notes?.trim()) lines.push({ key: "Notes", value: d.notes.trim() });
      return lines;
    }
    default:
      return [];
  }
}
