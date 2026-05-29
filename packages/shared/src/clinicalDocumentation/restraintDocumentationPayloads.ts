import { z } from "zod";
import {
  clinicalDocYesNo,
  pickLocalizedEnumLabel,
  type ClinicalDocumentationSummaryLocale,
} from "./clinicalDocumentationSummaryLocale.js";

/** Preserve persisted registry IDs for initiation/reassessment. */
export const RESTRAINT_INITIATION_CARD_ID = "safety_restraint_initial" as const;
export const RESTRAINT_REASSESSMENT_CARD_ID = "safety_restraint_reassessment" as const;
export const RESTRAINT_FACE_TO_FACE_CARD_ID = "restraint_face_to_face" as const;
export const RESTRAINT_RENEWAL_CARD_ID = "restraint_renewal" as const;
export const RESTRAINT_DISCONTINUATION_CARD_ID = "restraint_discontinuation" as const;

export const EDOC6_RESTRAINT_DOCUMENTATION_CARD_IDS = [
  RESTRAINT_INITIATION_CARD_ID,
  RESTRAINT_REASSESSMENT_CARD_ID,
  RESTRAINT_FACE_TO_FACE_CARD_ID,
  RESTRAINT_RENEWAL_CARD_ID,
  RESTRAINT_DISCONTINUATION_CARD_ID,
] as const;

export type Edoc6RestraintDocumentationCardId =
  (typeof EDOC6_RESTRAINT_DOCUMENTATION_CARD_IDS)[number];

const optionalNotes = z.string().trim().max(2000).optional();
const providerId = z.string().trim().min(1).max(120);
const freeTextClinical = z.string().trim().min(1).max(2000);

const isoDateTimeString = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date/time" });

const normalAbnormal = z.enum(["NORMAL", "ABNORMAL"]);

export const RESTRAINT_TYPE_VALUES = ["PHYSICAL", "BEHAVIORAL", "MEDICAL", "SECLUSION"] as const;
export const REASON_FOR_RESTRAINT_VALUES = [
  "VIOLENT_BEHAVIOR",
  "SELF_DESTRUCTIVE",
  "PULLING_LINES",
  "PULLING_TUBES",
  "FALL_RISK",
  "INTERFERENCE_WITH_CARE",
  "ALTERED_MENTAL_STATUS",
  "OTHER",
] as const;
export const ALTERNATIVES_ATTEMPTED_VALUES = [
  "VERBAL_DEESCALATION",
  "REORIENTATION",
  "FAMILY_PRESENCE",
  "SITTER",
  "REDIRECTION",
  "ENVIRONMENTAL_MODIFICATION",
  "MEDICATION",
  "OTHER",
] as const;
export const DISCONTINUATION_CRITERIA_VALUES = [
  "CALM",
  "FOLLOWS_COMMANDS",
  "NO_LONGER_DANGER",
  "MEDICAL_DEVICE_SECURE",
  "OTHER",
] as const;

export const restraintBillingReadinessMetadataSchema = z.object({
  capturePhase: z.literal("EDOC.6"),
  claimsGenerationDeferred: z.literal(true),
  restraintEventCapturable: z.boolean(),
});

export const restraintInitiationPayloadSchema = z.object({
  assessmentTime: isoDateTimeString,
  restraintType: z.enum(RESTRAINT_TYPE_VALUES),
  reasonForRestraint: z.enum(REASON_FOR_RESTRAINT_VALUES),
  alternativesAttempted: z.array(z.enum(ALTERNATIVES_ATTEMPTED_VALUES)).min(1),
  continuedNeed: z.boolean(),
  injuryPresent: z.boolean(),
  circulationAssessment: normalAbnormal,
  mentalStatusAssessment: freeTextClinical,
  physicianOrderVerified: z.boolean(),
  orderingProviderId: providerId,
  billingReadinessMetadata: restraintBillingReadinessMetadataSchema.optional(),
  notes: optionalNotes,
});

export const restraintFaceToFacePayloadSchema = z.object({
  evaluationTime: isoDateTimeString,
  behaviorAssessment: freeTextClinical,
  dangerToSelf: z.boolean(),
  dangerToOthers: z.boolean(),
  continuedNeedForRestraint: z.boolean(),
  medicalConditionAssessment: freeTextClinical,
  behavioralConditionAssessment: freeTextClinical,
  providerEvaluatorId: providerId,
  notes: optionalNotes,
});

export const restraintReassessmentPayloadSchema = z.object({
  assessmentTime: isoDateTimeString,
  airway: normalAbnormal,
  circulation: normalAbnormal,
  skinIntegrity: normalAbnormal,
  nutritionNeedsMet: z.boolean(),
  hydrationNeedsMet: z.boolean(),
  eliminationNeedsMet: z.boolean(),
  rangeOfMotionPerformed: z.boolean(),
  continuedNeed: z.boolean(),
  patientResponse: freeTextClinical,
  notes: optionalNotes,
});

export const restraintRenewalPayloadSchema = z.object({
  renewalTime: isoDateTimeString,
  orderingProviderId: providerId,
  continuedNeed: z.boolean(),
  renewalReason: freeTextClinical,
  notes: optionalNotes,
});

export const restraintDiscontinuationPayloadSchema = z.object({
  discontinuedTime: isoDateTimeString,
  criteriaMet: z.array(z.enum(DISCONTINUATION_CRITERIA_VALUES)).min(1),
  conditionAtDiscontinuation: freeTextClinical,
  notes: optionalNotes,
});

const RESTRAINT_PAYLOAD_SCHEMA_BY_CARD_ID: Record<string, z.ZodType<Record<string, unknown>>> = {
  [RESTRAINT_INITIATION_CARD_ID]: restraintInitiationPayloadSchema,
  [RESTRAINT_REASSESSMENT_CARD_ID]: restraintReassessmentPayloadSchema,
  [RESTRAINT_FACE_TO_FACE_CARD_ID]: restraintFaceToFacePayloadSchema,
  [RESTRAINT_RENEWAL_CARD_ID]: restraintRenewalPayloadSchema,
  [RESTRAINT_DISCONTINUATION_CARD_ID]: restraintDiscontinuationPayloadSchema,
};

export function isEdoc6RestraintDocumentationCardId(
  cardId: string
): cardId is Edoc6RestraintDocumentationCardId {
  return (EDOC6_RESTRAINT_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId);
}

export function enrichRestraintPayloadForPersistence(
  cardId: string,
  payload: Record<string, unknown>
): Record<string, unknown> {
  if (cardId === RESTRAINT_INITIATION_CARD_ID) {
    return {
      ...payload,
      billingReadinessMetadata: {
        capturePhase: "EDOC.6",
        claimsGenerationDeferred: true,
        restraintEventCapturable: true,
      },
    };
  }
  return payload;
}

export function validateRestraintPayloadForCard(
  cardId: string,
  payload: Record<string, unknown>
): { ok: true; data: Record<string, unknown> } | { ok: false; message: string } {
  const schema = RESTRAINT_PAYLOAD_SCHEMA_BY_CARD_ID[cardId];
  if (!schema) {
    return { ok: false, message: "Card is not available for structured save" };
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: "Invalid clinical documentation payload" };
  }
  const data = enrichRestraintPayloadForPersistence(
    cardId,
    parsed.data as Record<string, unknown>
  );
  return { ok: true, data };
}

const RESTRAINT_TYPE_EN: Record<string, string> = {
  PHYSICAL: "Physical",
  BEHAVIORAL: "Behavioral",
  MEDICAL: "Medical",
  SECLUSION: "Seclusion",
};

const RESTRAINT_TYPE_FR: Record<string, string> = {
  PHYSICAL: "Physique",
  BEHAVIORAL: "Comportementale",
  MEDICAL: "Médicale",
  SECLUSION: "Isolement",
};

const REASON_EN: Record<string, string> = {
  VIOLENT_BEHAVIOR: "Violent behavior",
  SELF_DESTRUCTIVE: "Self-destructive",
  PULLING_LINES: "Pulling lines",
  PULLING_TUBES: "Pulling tubes",
  FALL_RISK: "Fall risk",
  INTERFERENCE_WITH_CARE: "Interference with care",
  ALTERED_MENTAL_STATUS: "Altered mental status",
  OTHER: "Other",
};

const REASON_FR: Record<string, string> = {
  VIOLENT_BEHAVIOR: "Comportement violent",
  SELF_DESTRUCTIVE: "Autodestruction",
  PULLING_LINES: "Arrachement de lignes",
  PULLING_TUBES: "Arrachement de tubes",
  FALL_RISK: "Risque de chute",
  INTERFERENCE_WITH_CARE: "Gêne aux soins",
  ALTERED_MENTAL_STATUS: "Altération de l'état mental",
  OTHER: "Autre",
};

const NORMAL_ABNORMAL_EN: Record<string, string> = {
  NORMAL: "Normal",
  ABNORMAL: "Abnormal",
};

const NORMAL_ABNORMAL_FR: Record<string, string> = {
  NORMAL: "Normal",
  ABNORMAL: "Anormal",
};

function formatAlternatives(
  values: string[],
  locale: ClinicalDocumentationSummaryLocale
): string {
  const mapEn: Record<string, string> = {
    VERBAL_DEESCALATION: "Verbal de-escalation",
    REORIENTATION: "Reorientation",
    FAMILY_PRESENCE: "Family presence",
    SITTER: "Sitter",
    REDIRECTION: "Redirection",
    ENVIRONMENTAL_MODIFICATION: "Environmental modification",
    MEDICATION: "Medication",
    OTHER: "Other",
  };
  const mapFr: Record<string, string> = {
    VERBAL_DEESCALATION: "Désescalade verbale",
    REORIENTATION: "Réorientation",
    FAMILY_PRESENCE: "Présence familiale",
    SITTER: "Surveillant",
    REDIRECTION: "Redirection",
    ENVIRONMENTAL_MODIFICATION: "Modification environnement",
    MEDICATION: "Médication",
    OTHER: "Autre",
  };
  const map = locale === "en" ? mapEn : mapFr;
  return values.map((v) => map[v] ?? v).join(", ");
}

export function summarizeRestraintDocumentationPayload(
  cardId: string,
  payload: Record<string, unknown>,
  locale: ClinicalDocumentationSummaryLocale
): Array<{ key: string; value: string }> {
  switch (cardId) {
    case RESTRAINT_INITIATION_CARD_ID: {
      const p = restraintInitiationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: locale === "en" ? "Type" : "Type",
          value: pickLocalizedEnumLabel(RESTRAINT_TYPE_EN, RESTRAINT_TYPE_FR, p.data.restraintType, locale),
        },
        {
          key: locale === "en" ? "Reason" : "Motif",
          value: pickLocalizedEnumLabel(REASON_EN, REASON_FR, p.data.reasonForRestraint, locale),
        },
        {
          key: locale === "en" ? "Alternatives attempted" : "Alternatives tentées",
          value: formatAlternatives(p.data.alternativesAttempted, locale),
        },
        {
          key: locale === "en" ? "Continued need" : "Besoin continu",
          value: clinicalDocYesNo(p.data.continuedNeed, locale),
        },
        {
          key: locale === "en" ? "Circulation" : "Circulation",
          value: pickLocalizedEnumLabel(
            NORMAL_ABNORMAL_EN,
            NORMAL_ABNORMAL_FR,
            p.data.circulationAssessment,
            locale
          ),
        },
        {
          key: locale === "en" ? "Physician order verified" : "Ordre médecin vérifié",
          value: clinicalDocYesNo(p.data.physicianOrderVerified, locale),
        },
        {
          key: locale === "en" ? "Ordering provider" : "Médecin prescripteur",
          value: p.data.orderingProviderId,
        },
        { key: locale === "en" ? "Assessed at" : "Évalué le", value: p.data.assessmentTime },
      ];
    }
    case RESTRAINT_FACE_TO_FACE_CARD_ID: {
      const p = restraintFaceToFacePayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: locale === "en" ? "Face-to-face evaluation" : "Évaluation face-à-face",
          value: p.data.evaluationTime,
        },
        {
          key: locale === "en" ? "Danger to self" : "Danger pour soi",
          value: clinicalDocYesNo(p.data.dangerToSelf, locale),
        },
        {
          key: locale === "en" ? "Danger to others" : "Danger pour autrui",
          value: clinicalDocYesNo(p.data.dangerToOthers, locale),
        },
        {
          key: locale === "en" ? "Continued need" : "Besoin continu",
          value: clinicalDocYesNo(p.data.continuedNeedForRestraint, locale),
        },
        {
          key: locale === "en" ? "Evaluator" : "Évaluateur",
          value: p.data.providerEvaluatorId,
        },
      ];
    }
    case RESTRAINT_REASSESSMENT_CARD_ID: {
      const p = restraintReassessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        { key: locale === "en" ? "Reassessment" : "Réévaluation", value: p.data.assessmentTime },
        {
          key: locale === "en" ? "Airway" : "Voies aériennes",
          value: pickLocalizedEnumLabel(NORMAL_ABNORMAL_EN, NORMAL_ABNORMAL_FR, p.data.airway, locale),
        },
        {
          key: locale === "en" ? "Circulation" : "Circulation",
          value: pickLocalizedEnumLabel(
            NORMAL_ABNORMAL_EN,
            NORMAL_ABNORMAL_FR,
            p.data.circulation,
            locale
          ),
        },
        {
          key: locale === "en" ? "Skin integrity" : "Intégrité cutanée",
          value: pickLocalizedEnumLabel(
            NORMAL_ABNORMAL_EN,
            NORMAL_ABNORMAL_FR,
            p.data.skinIntegrity,
            locale
          ),
        },
        {
          key: locale === "en" ? "Continued need" : "Besoin continu",
          value: clinicalDocYesNo(p.data.continuedNeed, locale),
        },
      ];
    }
    case RESTRAINT_RENEWAL_CARD_ID: {
      const p = restraintRenewalPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        { key: locale === "en" ? "Renewal" : "Renouvellement", value: p.data.renewalTime },
        {
          key: locale === "en" ? "Ordering provider" : "Médecin prescripteur",
          value: p.data.orderingProviderId,
        },
        {
          key: locale === "en" ? "Continued need" : "Besoin continu",
          value: clinicalDocYesNo(p.data.continuedNeed, locale),
        },
      ];
    }
    case RESTRAINT_DISCONTINUATION_CARD_ID: {
      const p = restraintDiscontinuationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const criteriaEn: Record<string, string> = {
        CALM: "Calm",
        FOLLOWS_COMMANDS: "Follows commands",
        NO_LONGER_DANGER: "No longer a danger",
        MEDICAL_DEVICE_SECURE: "Medical devices secure",
        OTHER: "Other",
      };
      const criteriaFr: Record<string, string> = {
        CALM: "Calme",
        FOLLOWS_COMMANDS: "Suit les consignes",
        NO_LONGER_DANGER: "Plus de danger",
        MEDICAL_DEVICE_SECURE: "Dispositifs sécurisés",
        OTHER: "Autre",
      };
      const criteriaMap = locale === "en" ? criteriaEn : criteriaFr;
      return [
        { key: locale === "en" ? "Discontinued" : "Arrêt", value: p.data.discontinuedTime },
        {
          key: locale === "en" ? "Criteria met" : "Critères",
          value: p.data.criteriaMet.map((c) => criteriaMap[c] ?? c).join(", "),
        },
      ];
    }
    default:
      return [];
  }
}
