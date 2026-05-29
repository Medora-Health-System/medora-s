import { z } from "zod";

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

const RESTRAINT_TYPE_FR: Record<string, string> = {
  PHYSICAL: "Physique",
  BEHAVIORAL: "Comportementale",
  MEDICAL: "Médicale",
  SECLUSION: "Isolement",
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

const NORMAL_ABNORMAL_FR: Record<string, string> = {
  NORMAL: "Normal",
  ABNORMAL: "Anormal",
};

function yesNoFr(v: boolean): string {
  return v ? "Oui" : "Non";
}

function formatAlternativesFr(values: string[]): string {
  const map: Record<string, string> = {
    VERBAL_DEESCALATION: "Désescalade verbale",
    REORIENTATION: "Réorientation",
    FAMILY_PRESENCE: "Présence familiale",
    SITTER: "Surveillant",
    REDIRECTION: "Redirection",
    ENVIRONMENTAL_MODIFICATION: "Modification environnement",
    MEDICATION: "Médication",
    OTHER: "Autre",
  };
  return values.map((v) => map[v] ?? v).join(", ");
}

export function summarizeRestraintDocumentationPayload(
  cardId: string,
  payload: Record<string, unknown>
): Array<{ key: string; value: string }> {
  switch (cardId) {
    case RESTRAINT_INITIATION_CARD_ID: {
      const p = restraintInitiationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        { key: "Type", value: RESTRAINT_TYPE_FR[p.data.restraintType] ?? p.data.restraintType },
        { key: "Motif", value: REASON_FR[p.data.reasonForRestraint] ?? p.data.reasonForRestraint },
        {
          key: "Alternatives tentées",
          value: formatAlternativesFr(p.data.alternativesAttempted),
        },
        { key: "Besoin continu", value: yesNoFr(p.data.continuedNeed) },
        { key: "Circulation", value: NORMAL_ABNORMAL_FR[p.data.circulationAssessment] ?? p.data.circulationAssessment },
        { key: "Ordre médecin vérifié", value: yesNoFr(p.data.physicianOrderVerified) },
        { key: "Médecin prescripteur", value: p.data.orderingProviderId },
        { key: "Évalué le", value: p.data.assessmentTime },
      ];
    }
    case RESTRAINT_FACE_TO_FACE_CARD_ID: {
      const p = restraintFaceToFacePayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        { key: "Évaluation face-à-face", value: p.data.evaluationTime },
        { key: "Danger pour soi", value: yesNoFr(p.data.dangerToSelf) },
        { key: "Danger pour autrui", value: yesNoFr(p.data.dangerToOthers) },
        { key: "Besoin continu", value: yesNoFr(p.data.continuedNeedForRestraint) },
        { key: "Évaluateur", value: p.data.providerEvaluatorId },
      ];
    }
    case RESTRAINT_REASSESSMENT_CARD_ID: {
      const p = restraintReassessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        { key: "Réévaluation", value: p.data.assessmentTime },
        { key: "Voies aériennes", value: NORMAL_ABNORMAL_FR[p.data.airway] ?? p.data.airway },
        { key: "Circulation", value: NORMAL_ABNORMAL_FR[p.data.circulation] ?? p.data.circulation },
        { key: "Intégrité cutanée", value: NORMAL_ABNORMAL_FR[p.data.skinIntegrity] ?? p.data.skinIntegrity },
        { key: "Besoin continu", value: yesNoFr(p.data.continuedNeed) },
      ];
    }
    case RESTRAINT_RENEWAL_CARD_ID: {
      const p = restraintRenewalPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        { key: "Renouvellement", value: p.data.renewalTime },
        { key: "Médecin prescripteur", value: p.data.orderingProviderId },
        { key: "Besoin continu", value: yesNoFr(p.data.continuedNeed) },
      ];
    }
    case RESTRAINT_DISCONTINUATION_CARD_ID: {
      const p = restraintDiscontinuationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const criteriaMap: Record<string, string> = {
        CALM: "Calme",
        FOLLOWS_COMMANDS: "Suit les consignes",
        NO_LONGER_DANGER: "Plus de danger",
        MEDICAL_DEVICE_SECURE: "Dispositifs sécurisés",
        OTHER: "Autre",
      };
      return [
        { key: "Arrêt", value: p.data.discontinuedTime },
        {
          key: "Critères",
          value: p.data.criteriaMet.map((c) => criteriaMap[c] ?? c).join(", "),
        },
      ];
    }
    default:
      return [];
  }
}
