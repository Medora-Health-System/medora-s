import { z } from "zod";
import {
  clinicalDocYesNo,
  pickLocalizedEnumLabel,
  type ClinicalDocumentationSummaryLocale,
} from "./clinicalDocumentationSummaryLocale.js";

export const BLOOD_PRODUCT_VERIFICATION_CARD_ID = "blood_product_verification" as const;
export const BLOOD_PRODUCT_INITIATION_CARD_ID = "blood_product_initiation" as const;
export const BLOOD_PRODUCT_REASSESSMENT_CARD_ID = "blood_product_reassessment" as const;
export const BLOOD_PRODUCT_REACTION_CARD_ID = "blood_product_reaction" as const;
export const BLOOD_PRODUCT_COMPLETION_CARD_ID = "blood_product_completion" as const;
export const MASSIVE_TRANSFUSION_PROTOCOL_EVENT_CARD_ID =
  "massive_transfusion_protocol_event" as const;

export const EDOC7_BLOOD_PRODUCT_DOCUMENTATION_CARD_IDS = [
  BLOOD_PRODUCT_VERIFICATION_CARD_ID,
  BLOOD_PRODUCT_INITIATION_CARD_ID,
  BLOOD_PRODUCT_REASSESSMENT_CARD_ID,
  BLOOD_PRODUCT_REACTION_CARD_ID,
  BLOOD_PRODUCT_COMPLETION_CARD_ID,
  MASSIVE_TRANSFUSION_PROTOCOL_EVENT_CARD_ID,
] as const;

export type Edoc7BloodProductDocumentationCardId =
  (typeof EDOC7_BLOOD_PRODUCT_DOCUMENTATION_CARD_IDS)[number];

export const BLOOD_PRODUCT_TYPE_VALUES = [
  "PRBC",
  "FFP",
  "PLATELETS",
  "CRYOPRECIPITATE",
  "WHOLE_BLOOD",
  "OTHER",
] as const;

export const BLOOD_PRODUCT_SPECIAL_REQUIREMENT_VALUES = [
  "NONE",
  "IRRADIATED",
  "CMV_NEGATIVE",
  "LEUKOREDUCED",
  "WASHED",
  "OTHER",
] as const;

export const BLOOD_PRODUCT_VERIFICATION_STATUS_VALUES = [
  "DRAFT",
  "PENDING_WITNESS",
  "VERIFIED",
] as const;

export const BLOOD_REASSESSMENT_SYMPTOM_VALUES = [
  "FEVER",
  "CHILLS",
  "DYSPNEA",
  "PRURITUS",
  "RASH",
  "HYPOTENSION",
  "CHEST_PAIN",
  "BACK_PAIN",
  "NAUSEA",
  "HEMOGLOBINURIA",
  "OTHER",
] as const;

export const BLOOD_REACTION_TYPE_VALUES = [
  "FEBRILE",
  "ALLERGIC",
  "ANAPHYLACTIC",
  "TRALI",
  "TACO",
  "HEMOLYTIC",
  "SUSPECTED",
  "OTHER",
] as const;

export const BLOOD_REACTION_SYMPTOM_VALUES = [
  "FEVER",
  "CHILLS",
  "RASH",
  "URTICARIA",
  "DYSPNEA",
  "WHEEZING",
  "HYPOTENSION",
  "CHEST_PAIN",
  "BACK_PAIN",
  "HEMOGLOBINURIA",
  "OTHER",
] as const;

export const MTP_EVENT_TYPE_VALUES = [
  "ACTIVATED",
  "CONTINUED",
  "ESCALATED",
  "DEACTIVATED",
] as const;

const optionalNotes = z.string().trim().max(2000).optional();
const providerId = z.string().trim().min(1).max(120);
const unitIdentifier = z.string().trim().min(1).max(120);
const isoDateTimeString = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date/time" });

const productType = z.enum(BLOOD_PRODUCT_TYPE_VALUES);
const specialRequirements = z.enum(BLOOD_PRODUCT_SPECIAL_REQUIREMENT_VALUES);

export const bloodProductBillingReadinessMetadataSchema = z.object({
  capturePhase: z.literal("EDOC.7"),
  claimsGenerationDeferred: z.literal(true),
  productTypeCapturable: z.boolean(),
  completionCapturable: z.boolean().optional(),
  reactionCapturable: z.boolean().optional(),
});

export const bloodProductVerificationPayloadSchema = z.object({
  verificationTime: isoDateTimeString,
  productType,
  unitIdentifier,
  patientIdentityVerified: z.boolean(),
  bloodTypeVerified: z.boolean(),
  crossmatchVerified: z.boolean(),
  expirationVerified: z.boolean(),
  consentVerified: z.boolean(),
  specialRequirements,
  verificationNotes: optionalNotes,
  verificationStatus: z.enum(BLOOD_PRODUCT_VERIFICATION_STATUS_VALUES).optional(),
});

export const bloodProductInitiationPayloadSchema = z.object({
  startTime: isoDateTimeString,
  productType,
  unitIdentifier,
  baselineTemperature: z.string().trim().min(1).max(40),
  baselineHeartRate: z.number().int().min(0).max(300),
  baselineRespRate: z.number().int().min(0).max(120),
  baselineBloodPressure: z.string().trim().min(1).max(40),
  baselineSpo2: z.number().int().min(0).max(100),
  preMedicationAdministered: z.boolean(),
  preMedicationNotes: optionalNotes,
  providerOrderVerified: z.boolean(),
  consentVerified: z.boolean(),
  administrationStarted: z.boolean(),
  notes: optionalNotes,
});

export const bloodProductReassessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    temperature: z.string().trim().min(1).max(40),
    heartRate: z.number().int().min(0).max(300),
    respRate: z.number().int().min(0).max(120),
    bloodPressure: z.string().trim().min(1).max(40),
    spo2: z.number().int().min(0).max(100),
    symptomsPresent: z.boolean(),
    symptomChecklist: z.array(z.enum(BLOOD_REASSESSMENT_SYMPTOM_VALUES)),
    providerNotified: z.boolean(),
    continuedAdministration: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.symptomsPresent && data.symptomChecklist.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Symptom checklist required when symptoms present",
        path: ["symptomChecklist"],
      });
    }
  });

export const bloodProductReactionPayloadSchema = z.object({
  reactionTime: isoDateTimeString,
  reactionType: z.enum(BLOOD_REACTION_TYPE_VALUES),
  symptoms: z.array(z.enum(BLOOD_REACTION_SYMPTOM_VALUES)).min(1),
  transfusionStopped: z.boolean(),
  providerNotified: z.boolean(),
  bloodBankNotified: z.boolean(),
  reactionWorkupStarted: z.boolean(),
  notes: optionalNotes,
});

export const bloodProductCompletionPayloadSchema = z.object({
  completionTime: isoDateTimeString,
  productType,
  unitIdentifier,
  volumeInfusedMl: z.number().min(0).max(100_000),
  transfusionCompleted: z.boolean(),
  reactionOccurred: z.boolean(),
  postVitalsReviewed: z.boolean(),
  providerNotified: z.boolean(),
  notes: optionalNotes,
  billingReadinessMetadata: bloodProductBillingReadinessMetadataSchema.optional(),
});

export const massiveTransfusionProtocolEventPayloadSchema = z.object({
  eventTime: isoDateTimeString,
  eventType: z.enum(MTP_EVENT_TYPE_VALUES),
  initiatedBy: providerId,
  reason: z.string().trim().min(1).max(2000),
  notes: optionalNotes,
});

const BLOOD_PRODUCT_PAYLOAD_SCHEMA_BY_CARD_ID: Record<string, z.ZodType<Record<string, unknown>>> = {
  [BLOOD_PRODUCT_VERIFICATION_CARD_ID]: bloodProductVerificationPayloadSchema,
  [BLOOD_PRODUCT_INITIATION_CARD_ID]: bloodProductInitiationPayloadSchema,
  [BLOOD_PRODUCT_REASSESSMENT_CARD_ID]: bloodProductReassessmentPayloadSchema,
  [BLOOD_PRODUCT_REACTION_CARD_ID]: bloodProductReactionPayloadSchema,
  [BLOOD_PRODUCT_COMPLETION_CARD_ID]: bloodProductCompletionPayloadSchema,
  [MASSIVE_TRANSFUSION_PROTOCOL_EVENT_CARD_ID]: massiveTransfusionProtocolEventPayloadSchema,
};

export function isEdoc7BloodProductDocumentationCardId(
  cardId: string
): cardId is Edoc7BloodProductDocumentationCardId {
  return (EDOC7_BLOOD_PRODUCT_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId);
}

export function enrichBloodProductPayloadForPersistence(
  cardId: string,
  payload: Record<string, unknown>
): Record<string, unknown> {
  if (cardId === BLOOD_PRODUCT_VERIFICATION_CARD_ID) {
    return {
      ...payload,
      verificationStatus: "PENDING_WITNESS",
    };
  }
  if (cardId === BLOOD_PRODUCT_COMPLETION_CARD_ID) {
    const p = bloodProductCompletionPayloadSchema.safeParse(payload);
    if (!p.success) return payload;
    return {
      ...p.data,
      billingReadinessMetadata: {
        capturePhase: "EDOC.7",
        claimsGenerationDeferred: true,
        productTypeCapturable: true,
        completionCapturable: true,
        reactionCapturable: p.data.reactionOccurred,
      },
    };
  }
  return payload;
}

export function validateBloodProductPayloadForCard(
  cardId: string,
  payload: Record<string, unknown>
): { ok: true; data: Record<string, unknown> } | { ok: false; message: string } {
  const schema = BLOOD_PRODUCT_PAYLOAD_SCHEMA_BY_CARD_ID[cardId];
  if (!schema) {
    return { ok: false, message: "Card is not available for structured save" };
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: "Invalid clinical documentation payload" };
  }
  const data = enrichBloodProductPayloadForPersistence(
    cardId,
    parsed.data as Record<string, unknown>
  );
  return { ok: true, data };
}

const PRODUCT_TYPE_EN: Record<string, string> = {
  PRBC: "PRBC",
  FFP: "FFP",
  PLATELETS: "Platelets",
  CRYOPRECIPITATE: "Cryoprecipitate",
  WHOLE_BLOOD: "Whole blood",
  OTHER: "Other",
};

const PRODUCT_TYPE_FR: Record<string, string> = {
  PRBC: "CGR",
  FFP: "PFC",
  PLATELETS: "Plaquettes",
  CRYOPRECIPITATE: "Cryoprécipité",
  WHOLE_BLOOD: "Sang total",
  OTHER: "Autre",
};

const SPECIAL_REQ_EN: Record<string, string> = {
  NONE: "None",
  IRRADIATED: "Irradiated",
  CMV_NEGATIVE: "CMV negative",
  LEUKOREDUCED: "Leukoreduced",
  WASHED: "Washed",
  OTHER: "Other",
};

const SPECIAL_REQ_FR: Record<string, string> = {
  NONE: "Aucune",
  IRRADIATED: "Irradié",
  CMV_NEGATIVE: "CMV négatif",
  LEUKOREDUCED: "Leucoréduit",
  WASHED: "Lavé",
  OTHER: "Autre",
};

const REACTION_TYPE_EN: Record<string, string> = {
  FEBRILE: "Febrile",
  ALLERGIC: "Allergic",
  ANAPHYLACTIC: "Anaphylactic",
  TRALI: "TRALI",
  TACO: "TACO",
  HEMOLYTIC: "Hemolytic",
  SUSPECTED: "Suspected",
  OTHER: "Other",
};

const REACTION_TYPE_FR: Record<string, string> = {
  FEBRILE: "Febrile",
  ALLERGIC: "Allergique",
  ANAPHYLACTIC: "Anaphylactique",
  TRALI: "TRALI",
  TACO: "TACO",
  HEMOLYTIC: "Hémolytique",
  SUSPECTED: "Suspectée",
  OTHER: "Autre",
};

const MTP_EVENT_EN: Record<string, string> = {
  ACTIVATED: "Activated",
  CONTINUED: "Continued",
  ESCALATED: "Escalated",
  DEACTIVATED: "Deactivated",
};

const MTP_EVENT_FR: Record<string, string> = {
  ACTIVATED: "Activé",
  CONTINUED: "Poursuivi",
  ESCALATED: "Escaladé",
  DEACTIVATED: "Désactivé",
};

const REASSESS_SYMPTOM_EN: Record<string, string> = {
  FEVER: "Fever",
  CHILLS: "Chills",
  DYSPNEA: "Dyspnea",
  PRURITUS: "Pruritus",
  RASH: "Rash",
  HYPOTENSION: "Hypotension",
  CHEST_PAIN: "Chest pain",
  BACK_PAIN: "Back pain",
  NAUSEA: "Nausea",
  HEMOGLOBINURIA: "Hemoglobinuria",
  OTHER: "Other",
};

const REASSESS_SYMPTOM_FR: Record<string, string> = {
  FEVER: "Fièvre",
  CHILLS: "Frissons",
  DYSPNEA: "Dyspnée",
  PRURITUS: "Prurit",
  RASH: "Éruption",
  HYPOTENSION: "Hypotension",
  CHEST_PAIN: "Douleur thoracique",
  BACK_PAIN: "Douleur dorsale",
  NAUSEA: "Nausée",
  HEMOGLOBINURIA: "Hémoglobinurie",
  OTHER: "Autre",
};

const REACTION_SYMPTOM_EN: Record<string, string> = {
  FEVER: "Fever",
  CHILLS: "Chills",
  RASH: "Rash",
  URTICARIA: "Urticaria",
  DYSPNEA: "Dyspnea",
  WHEEZING: "Wheezing",
  HYPOTENSION: "Hypotension",
  CHEST_PAIN: "Chest pain",
  BACK_PAIN: "Back pain",
  HEMOGLOBINURIA: "Hemoglobinuria",
  OTHER: "Other",
};

const REACTION_SYMPTOM_FR: Record<string, string> = {
  FEVER: "Fièvre",
  CHILLS: "Frissons",
  RASH: "Éruption",
  URTICARIA: "Urticaire",
  DYSPNEA: "Dyspnée",
  WHEEZING: "Sifflements",
  HYPOTENSION: "Hypotension",
  CHEST_PAIN: "Douleur thoracique",
  BACK_PAIN: "Douleur dorsale",
  HEMOGLOBINURIA: "Hémoglobinurie",
  OTHER: "Autre",
};

function formatSymptomList(
  values: string[],
  en: Record<string, string>,
  fr: Record<string, string>,
  locale: ClinicalDocumentationSummaryLocale
): string {
  const map = locale === "en" ? en : fr;
  return values.map((v) => map[v] ?? v).join(", ");
}

export function resolveBloodProductVerificationDisplayStatus(
  payload: Record<string, unknown>,
  witnessStatus: string | undefined
): "DRAFT" | "PENDING_WITNESS" | "VERIFIED" {
  if (witnessStatus === "WITNESSED") return "VERIFIED";
  const parsed = bloodProductVerificationPayloadSchema.safeParse(payload);
  const stored = parsed.success ? parsed.data.verificationStatus : undefined;
  if (stored === "DRAFT") return "DRAFT";
  return "PENDING_WITNESS";
}

export function summarizeBloodProductDocumentationPayload(
  cardId: string,
  payload: Record<string, unknown>,
  locale: ClinicalDocumentationSummaryLocale
): Array<{ key: string; value: string }> {
  switch (cardId) {
    case BLOOD_PRODUCT_VERIFICATION_CARD_ID: {
      const p = bloodProductVerificationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: locale === "en" ? "Product" : "Produit",
          value: pickLocalizedEnumLabel(
            PRODUCT_TYPE_EN,
            PRODUCT_TYPE_FR,
            p.data.productType,
            locale
          ),
        },
        {
          key: locale === "en" ? "Unit ID" : "N° unité",
          value: p.data.unitIdentifier,
        },
        {
          key: locale === "en" ? "Patient identity" : "Identité patient",
          value: clinicalDocYesNo(p.data.patientIdentityVerified, locale),
        },
        {
          key: locale === "en" ? "Blood type" : "Groupe sanguin",
          value: clinicalDocYesNo(p.data.bloodTypeVerified, locale),
        },
        {
          key: locale === "en" ? "Crossmatch" : "Compatibilité",
          value: clinicalDocYesNo(p.data.crossmatchVerified, locale),
        },
        {
          key: locale === "en" ? "Expiration" : "Expiration",
          value: clinicalDocYesNo(p.data.expirationVerified, locale),
        },
        {
          key: locale === "en" ? "Consent" : "Consentement",
          value: clinicalDocYesNo(p.data.consentVerified, locale),
        },
        {
          key: locale === "en" ? "Special requirements" : "Exigences spéciales",
          value: pickLocalizedEnumLabel(
            SPECIAL_REQ_EN,
            SPECIAL_REQ_FR,
            p.data.specialRequirements,
            locale
          ),
        },
        {
          key: locale === "en" ? "Verification status" : "Statut vérification",
          value:
            p.data.verificationStatus === "VERIFIED"
              ? locale === "en"
                ? "Verified"
                : "Vérifié"
              : p.data.verificationStatus === "DRAFT"
                ? locale === "en"
                  ? "Draft"
                  : "Brouillon"
                : locale === "en"
                  ? "Pending witness"
                  : "Témoin en attente",
        },
      ];
    }
    case BLOOD_PRODUCT_INITIATION_CARD_ID: {
      const p = bloodProductInitiationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: locale === "en" ? "Product" : "Produit",
          value: pickLocalizedEnumLabel(
            PRODUCT_TYPE_EN,
            PRODUCT_TYPE_FR,
            p.data.productType,
            locale
          ),
        },
        { key: locale === "en" ? "Unit ID" : "N° unité", value: p.data.unitIdentifier },
        {
          key: locale === "en" ? "Start time" : "Heure début",
          value: p.data.startTime,
        },
        {
          key: locale === "en" ? "Administration started" : "Administration démarrée",
          value: clinicalDocYesNo(p.data.administrationStarted, locale),
        },
        {
          key: locale === "en" ? "Provider order verified" : "Ordre vérifié",
          value: clinicalDocYesNo(p.data.providerOrderVerified, locale),
        },
      ];
    }
    case BLOOD_PRODUCT_REASSESSMENT_CARD_ID: {
      const p = bloodProductReassessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const lines: Array<{ key: string; value: string }> = [
        {
          key: locale === "en" ? "Assessment time" : "Heure évaluation",
          value: p.data.assessmentTime,
        },
        {
          key: locale === "en" ? "Symptoms present" : "Symptômes",
          value: clinicalDocYesNo(p.data.symptomsPresent, locale),
        },
        {
          key: locale === "en" ? "Continued administration" : "Administration poursuivie",
          value: clinicalDocYesNo(p.data.continuedAdministration, locale),
        },
      ];
      if (p.data.symptomChecklist.length > 0) {
        lines.push({
          key: locale === "en" ? "Symptoms" : "Signes",
          value: formatSymptomList(
            p.data.symptomChecklist,
            REASSESS_SYMPTOM_EN,
            REASSESS_SYMPTOM_FR,
            locale
          ),
        });
      }
      return lines;
    }
    case BLOOD_PRODUCT_REACTION_CARD_ID: {
      const p = bloodProductReactionPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: locale === "en" ? "Reaction type" : "Type réaction",
          value: pickLocalizedEnumLabel(
            REACTION_TYPE_EN,
            REACTION_TYPE_FR,
            p.data.reactionType,
            locale
          ),
        },
        {
          key: locale === "en" ? "Reaction status" : "Statut réaction",
          value: locale === "en" ? "Documented" : "Documentée",
        },
        {
          key: locale === "en" ? "Symptoms" : "Symptômes",
          value: formatSymptomList(
            p.data.symptoms,
            REACTION_SYMPTOM_EN,
            REACTION_SYMPTOM_FR,
            locale
          ),
        },
        {
          key: locale === "en" ? "Transfusion stopped" : "Transfusion arrêtée",
          value: clinicalDocYesNo(p.data.transfusionStopped, locale),
        },
        {
          key: locale === "en" ? "Blood bank notified" : "Banque du sang avisée",
          value: clinicalDocYesNo(p.data.bloodBankNotified, locale),
        },
      ];
    }
    case BLOOD_PRODUCT_COMPLETION_CARD_ID: {
      const p = bloodProductCompletionPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: locale === "en" ? "Product" : "Produit",
          value: pickLocalizedEnumLabel(
            PRODUCT_TYPE_EN,
            PRODUCT_TYPE_FR,
            p.data.productType,
            locale
          ),
        },
        { key: locale === "en" ? "Unit ID" : "N° unité", value: p.data.unitIdentifier },
        {
          key: locale === "en" ? "Completion time" : "Heure fin",
          value: p.data.completionTime,
        },
        {
          key: locale === "en" ? "Volume infused (mL)" : "Volume perfusé (mL)",
          value: String(p.data.volumeInfusedMl),
        },
        {
          key: locale === "en" ? "Reaction occurred" : "Réaction survenue",
          value: clinicalDocYesNo(p.data.reactionOccurred, locale),
        },
        {
          key: locale === "en" ? "Transfusion completed" : "Transfusion terminée",
          value: clinicalDocYesNo(p.data.transfusionCompleted, locale),
        },
      ];
    }
    case MASSIVE_TRANSFUSION_PROTOCOL_EVENT_CARD_ID: {
      const p = massiveTransfusionProtocolEventPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: locale === "en" ? "MTP status" : "Statut PTM",
          value: pickLocalizedEnumLabel(MTP_EVENT_EN, MTP_EVENT_FR, p.data.eventType, locale),
        },
        {
          key: locale === "en" ? "Event time" : "Heure événement",
          value: p.data.eventTime,
        },
        {
          key: locale === "en" ? "Initiated by" : "Initié par",
          value: p.data.initiatedBy,
        },
        {
          key: locale === "en" ? "Reason" : "Motif",
          value: p.data.reason,
        },
      ];
    }
    default:
      return [];
  }
}
