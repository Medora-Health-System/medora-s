import { z } from "zod";
import {
  clinicalDocSummaryKey,
  clinicalDocVerificationStatus,
  clinicalDocYesNo,
  pickLocalizedEnumLabel,
  pickBilingualDisplayMap,
  type ClinicalDocumentationSummaryLocale,
} from "./clinicalDocumentationSummaryLocale.js";

export const BLOOD_PRODUCT_VERIFICATION_CARD_ID = "blood_product_verification" as const;
export const BLOOD_PRODUCT_INITIATION_CARD_ID = "blood_product_initiation" as const;
export const BLOOD_PRODUCT_PRE_ASSESSMENT_CARD_ID = "blood_product_pre_assessment" as const;
export const BLOOD_PRODUCT_REASSESSMENT_CARD_ID = "blood_product_reassessment" as const;
export const BLOOD_PRODUCT_REACTION_CARD_ID = "blood_product_reaction" as const;
export const BLOOD_PRODUCT_COMPLETION_CARD_ID = "blood_product_completion" as const;
export const MASSIVE_TRANSFUSION_PROTOCOL_EVENT_CARD_ID =
  "massive_transfusion_protocol_event" as const;

export const EDOC7_BLOOD_PRODUCT_DOCUMENTATION_CARD_IDS = [
  BLOOD_PRODUCT_VERIFICATION_CARD_ID,
  BLOOD_PRODUCT_INITIATION_CARD_ID,
  BLOOD_PRODUCT_PRE_ASSESSMENT_CARD_ID,
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
  "NO_REACTION",
  "SUSPECTED",
  "CONFIRMED",
  "ACUTE_HEMOLYTIC",
  "FEBRILE_NON_HEMOLYTIC",
  "ALLERGIC",
  "ANAPHYLACTIC",
  "TRALI",
  "TACO",
  "OTHER",
] as const;

/** Shared witness workflow status for verification and initiation (EDOC.7A). */
export const BLOOD_PRODUCT_WITNESS_WORKFLOW_STATUS_VALUES = [
  "DRAFT",
  "PENDING_WITNESS",
  "VERIFIED",
] as const;

/** @deprecated Use BLOOD_PRODUCT_WITNESS_WORKFLOW_STATUS_VALUES */
export const BLOOD_PRODUCT_VERIFICATION_STATUS_VALUES = BLOOD_PRODUCT_WITNESS_WORKFLOW_STATUS_VALUES;

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
/** Canonical unit volume (mL) — numeric only; presets defined in EDOC.7B. */
export const BLOOD_PRODUCT_UNIT_VOLUME_PRESET_ML = [250, 300, 350, 500] as const;
export const bloodProductUnitVolumeMlFieldSchema = z.number().positive().max(100_000);
const unitVolumeMl = bloodProductUnitVolumeMlFieldSchema;
const witnessWorkflowStatus = z.enum(BLOOD_PRODUCT_WITNESS_WORKFLOW_STATUS_VALUES).optional();

/** Completion-only payload keys — must not appear on pre-assessment (EDOC.7B). */
export const BLOOD_PRODUCT_COMPLETION_ONLY_FIELD_NAMES = [
  "completionTime",
  "endTime",
  "volumeInfusedMl",
  "postTemperature",
  "postHeartRate",
  "postRespRate",
  "postBloodPressure",
  "postSpo2",
  "reactionObserved",
  "transfusionCompleted",
  "providerNotified",
  "billingReadinessMetadata",
] as const;

export const EDOC_7C_BLOOD_MONITORING_TIMERS_BACKLOG_ID = "EDOC.7C" as const;

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
  unitVolumeMl,
  patientIdentityVerified: z.boolean(),
  bloodTypeVerified: z.boolean(),
  crossmatchVerified: z.boolean(),
  expirationVerified: z.boolean(),
  consentVerified: z.boolean(),
  specialRequirements,
  verificationNotes: optionalNotes,
  verificationStatus: witnessWorkflowStatus,
});

export const bloodProductInitiationPayloadSchema = z.object({
  startTime: isoDateTimeString,
  productType,
  unitIdentifier,
  unitVolumeMl,
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
  initiationStatus: witnessWorkflowStatus,
});

/**
 * EDOC.7C — Blood Monitoring Timers (backlog only; not implemented).
 * Future: 15-minute reassessment due time after initiation, due/overdue status,
 * nursing dashboard reminders, transfusion audit / Joint Commission readiness.
 */
export const bloodProductPreAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    productType,
    unitIdentifier,
    unitVolumeMl,
    baselineTemperature: z.string().trim().min(1).max(40),
    baselineHeartRate: z.number().int().min(0).max(300),
    baselineRespRate: z.number().int().min(0).max(120),
    baselineBloodPressure: z.string().trim().min(1).max(40),
    baselineSpo2: z.number().int().min(0).max(100),
    patientIdentityVerified: z.boolean(),
    consentVerified: z.boolean(),
    symptomsPresent: z.boolean(),
    symptomChecklist: z.array(z.enum(BLOOD_REASSESSMENT_SYMPTOM_VALUES)),
    notes: optionalNotes,
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.symptomsPresent && data.symptomChecklist.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Symptom checklist required when symptoms present",
        path: ["symptomChecklist"],
      });
    }
  });

/** EDOC.7C backlog — 15-minute reassessment monitoring (timers deferred). */
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

export const bloodProductReactionPayloadSchema = z
  .object({
    reactionTime: isoDateTimeString,
    reactionType: z.enum(BLOOD_REACTION_TYPE_VALUES),
    symptoms: z.array(z.enum(BLOOD_REACTION_SYMPTOM_VALUES)),
    providerNotified: z.boolean(),
    interventionRequired: z.boolean(),
    transfusionStopped: z.boolean(),
    bloodBankNotified: z.boolean(),
    reactionWorkupStarted: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.reactionType === "NO_REACTION") return;
    if (data.symptoms.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Symptoms required when reaction is documented",
        path: ["symptoms"],
      });
    }
    if (!data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required when reaction is documented",
        path: ["providerNotified"],
      });
    }
    if (!data.interventionRequired) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Intervention required when reaction is documented",
        path: ["interventionRequired"],
      });
    }
  });

export const bloodProductCompletionPayloadSchema = z.object({
  completionTime: isoDateTimeString,
  endTime: isoDateTimeString,
  productType,
  unitIdentifier,
  volumeInfusedMl: unitVolumeMl,
  postTemperature: z.string().trim().min(1).max(40),
  postHeartRate: z.number().int().min(0).max(300),
  postRespRate: z.number().int().min(0).max(120),
  postBloodPressure: z.string().trim().min(1).max(40),
  postSpo2: z.number().int().min(0).max(100),
  reactionObserved: z.boolean(),
  transfusionCompleted: z.boolean(),
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
  [BLOOD_PRODUCT_PRE_ASSESSMENT_CARD_ID]: bloodProductPreAssessmentPayloadSchema,
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
  if (cardId === BLOOD_PRODUCT_INITIATION_CARD_ID) {
    return {
      ...payload,
      initiationStatus: "PENDING_WITNESS",
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
        reactionCapturable: p.data.reactionObserved,
      },
    };
  }
  return payload;
}

/** After EDOC witness API finalization — mark verification/initiation legally complete in payload. */
export function finalizeBloodProductPayloadAfterWitness(
  cardId: string,
  payload: Record<string, unknown>
): Record<string, unknown> {
  if (cardId === BLOOD_PRODUCT_VERIFICATION_CARD_ID) {
    return { ...payload, verificationStatus: "VERIFIED" };
  }
  if (cardId === BLOOD_PRODUCT_INITIATION_CARD_ID) {
    return { ...payload, initiationStatus: "VERIFIED" };
  }
  return payload;
}

export function isBloodProductWitnessGatedCardId(cardId: string): boolean {
  return (
    cardId === BLOOD_PRODUCT_VERIFICATION_CARD_ID || cardId === BLOOD_PRODUCT_INITIATION_CARD_ID
  );
}

export function isBloodProductEntryLegallyComplete(input: {
  cardId: string;
  requiresWitnessSignature: boolean;
  witnessedAt: Date | string | null;
}): boolean {
  if (!isBloodProductWitnessGatedCardId(input.cardId)) return true;
  if (!input.requiresWitnessSignature) return true;
  return input.witnessedAt != null;
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
  NO_REACTION: "No reaction",
  SUSPECTED: "Suspected",
  CONFIRMED: "Confirmed",
  ACUTE_HEMOLYTIC: "Acute hemolytic",
  FEBRILE_NON_HEMOLYTIC: "Febrile non-hemolytic",
  ALLERGIC: "Allergic",
  ANAPHYLACTIC: "Anaphylactic",
  TRALI: "TRALI",
  TACO: "TACO",
  OTHER: "Other",
};

const REACTION_TYPE_FR: Record<string, string> = {
  NO_REACTION: "Aucune réaction",
  SUSPECTED: "Suspectée",
  CONFIRMED: "Confirmée",
  ACUTE_HEMOLYTIC: "Hémolytique aiguë",
  FEBRILE_NON_HEMOLYTIC: "Febrile non hémolytique",
  ALLERGIC: "Allergique",
  ANAPHYLACTIC: "Anaphylactique",
  TRALI: "TRALI",
  TACO: "TACO",
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
  const map = pickBilingualDisplayMap(locale, en, fr);
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
  if (stored === "VERIFIED") return "VERIFIED";
  return "PENDING_WITNESS";
}

export function resolveBloodProductInitiationDisplayStatus(
  payload: Record<string, unknown>,
  witnessStatus: string | undefined
): "DRAFT" | "PENDING_WITNESS" | "VERIFIED" {
  if (witnessStatus === "WITNESSED") return "VERIFIED";
  const parsed = bloodProductInitiationPayloadSchema.safeParse(payload);
  const stored = parsed.success ? parsed.data.initiationStatus : undefined;
  if (stored === "DRAFT") return "DRAFT";
  if (stored === "VERIFIED") return "VERIFIED";
  return "PENDING_WITNESS";
}

export type BloodProductPatientSummaryContext = {
  witnessDisplayName?: string | null;
  witnessStatus?: string;
};

export function appendBloodProductPatientSummaryLines(
  cardId: string,
  payload: Record<string, unknown>,
  locale: ClinicalDocumentationSummaryLocale,
  context?: BloodProductPatientSummaryContext
): Array<{ key: string; value: string }> {
  const lines = summarizeBloodProductDocumentationPayload(cardId, payload, locale);
  const productTypeRaw =
    typeof payload.productType === "string" ? payload.productType : undefined;
  if (productTypeRaw) {
    const productLine = {
      key: clinicalDocSummaryKey(locale, "Blood product type", "Type produit sanguin"),
      value: pickLocalizedEnumLabel(
        PRODUCT_TYPE_EN,
        PRODUCT_TYPE_FR,
        productTypeRaw as (typeof BLOOD_PRODUCT_TYPE_VALUES)[number],
        locale
      ),
    };
    if (!lines.some((l) => l.key === productLine.key)) {
      lines.unshift(productLine);
    }
  }
  const volumeMl =
    typeof payload.volumeInfusedMl === "number"
      ? payload.volumeInfusedMl
      : typeof payload.unitVolumeMl === "number"
        ? payload.unitVolumeMl
        : undefined;
  if (volumeMl != null) {
    lines.push({
      key: clinicalDocSummaryKey(locale, "Volume (mL)", "Volume (mL)"),
      value: String(volumeMl),
    });
  }
  if (context?.witnessDisplayName && context.witnessStatus === "WITNESSED") {
    lines.push({
      key: clinicalDocSummaryKey(locale, "Witness", "Témoin"),
      value: context.witnessDisplayName,
    });
  } else if (context?.witnessStatus === "PENDING_WITNESS") {
    lines.push({
      key: clinicalDocSummaryKey(locale, "Witness", "Témoin"),
      value: clinicalDocSummaryKey(locale, "Pending", "En attente"),
    });
  }
  const reactionParsed = bloodProductReactionPayloadSchema.safeParse(payload);
  if (reactionParsed.success) {
    lines.push({
      key: clinicalDocSummaryKey(locale, "Reaction outcome", "Issue réaction"),
      value: pickLocalizedEnumLabel(
        REACTION_TYPE_EN,
        REACTION_TYPE_FR,
        reactionParsed.data.reactionType,
        locale
      ),
    });
  } else if (cardId === BLOOD_PRODUCT_COMPLETION_CARD_ID) {
    const completionParsed = bloodProductCompletionPayloadSchema.safeParse(payload);
    if (completionParsed.success) {
      lines.push({
        key: clinicalDocSummaryKey(locale, "Reaction outcome", "Issue réaction"),
        value: clinicalDocYesNo(completionParsed.data.reactionObserved, locale),
      });
    }
  }
  return lines;
}

export function formatClinicalDocumentationSignerSummaryLines(
  input: {
    authorDisplayName: string;
    authorRoleTitle: string;
    witnessedAt?: string | null;
    witnessDisplayName?: string | null;
    witnessRoleTitle?: string | null;
  },
  locale: ClinicalDocumentationSummaryLocale
): Array<{ key: string; value: string }> {
  const lines: Array<{ key: string; value: string }> = [
    {
      key: clinicalDocSummaryKey(locale, "Primary signer", "Signataire principal"),
      value: `${input.authorDisplayName} (${input.authorRoleTitle})`,
    },
  ];
  if (input.witnessedAt && input.witnessDisplayName) {
    lines.push({
      key: clinicalDocSummaryKey(locale, "Witness signer", "Signataire témoin"),
      value: `${input.witnessDisplayName} (${input.witnessRoleTitle ?? "—"})`,
    });
  }
  return lines;
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
          key: clinicalDocSummaryKey(locale, "Product", "Produit"),
          value: pickLocalizedEnumLabel(
            PRODUCT_TYPE_EN,
            PRODUCT_TYPE_FR,
            p.data.productType,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Unit ID", "N° unité"),
          value: p.data.unitIdentifier,
        },
        {
          key: clinicalDocSummaryKey(locale, "Unit volume (mL)", "Volume unité (mL)"),
          value: String(p.data.unitVolumeMl),
        },
        {
          key: clinicalDocSummaryKey(locale, "Patient identity", "Identité patient"),
          value: clinicalDocYesNo(p.data.patientIdentityVerified, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Blood type", "Groupe sanguin"),
          value: clinicalDocYesNo(p.data.bloodTypeVerified, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Crossmatch", "Compatibilité"),
          value: clinicalDocYesNo(p.data.crossmatchVerified, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Expiration", "Expiration"),
          value: clinicalDocYesNo(p.data.expirationVerified, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Consent", "Consentement"),
          value: clinicalDocYesNo(p.data.consentVerified, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Special requirements", "Exigences spéciales"),
          value: pickLocalizedEnumLabel(
            SPECIAL_REQ_EN,
            SPECIAL_REQ_FR,
            p.data.specialRequirements,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Verification status", "Statut vérification"),
          value: clinicalDocVerificationStatus(locale, p.data.verificationStatus),
        },
      ];
    }
    case BLOOD_PRODUCT_INITIATION_CARD_ID: {
      const p = bloodProductInitiationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: clinicalDocSummaryKey(locale, "Product", "Produit"),
          value: pickLocalizedEnumLabel(
            PRODUCT_TYPE_EN,
            PRODUCT_TYPE_FR,
            p.data.productType,
            locale
          ),
        },
        { key: clinicalDocSummaryKey(locale, "Unit ID", "N° unité"), value: p.data.unitIdentifier },
        {
          key: clinicalDocSummaryKey(locale, "Unit volume (mL)", "Volume unité (mL)"),
          value: String(p.data.unitVolumeMl),
        },
        {
          key: clinicalDocSummaryKey(locale, "Start time", "Heure début"),
          value: p.data.startTime,
        },
        {
          key: clinicalDocSummaryKey(locale, "Initiation status", "Statut initiation"),
          value: clinicalDocVerificationStatus(locale, p.data.initiationStatus),
        },
        {
          key: clinicalDocSummaryKey(locale, "Administration started", "Administration démarrée"),
          value: clinicalDocYesNo(p.data.administrationStarted, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider order verified", "Ordre vérifié"),
          value: clinicalDocYesNo(p.data.providerOrderVerified, locale),
        },
      ];
    }
    case BLOOD_PRODUCT_PRE_ASSESSMENT_CARD_ID: {
      const p = bloodProductPreAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const lines: Array<{ key: string; value: string }> = [
        {
          key: clinicalDocSummaryKey(locale, "Assessment time", "Heure évaluation"),
          value: p.data.assessmentTime,
        },
        {
          key: clinicalDocSummaryKey(locale, "Product", "Produit"),
          value: pickLocalizedEnumLabel(
            PRODUCT_TYPE_EN,
            PRODUCT_TYPE_FR,
            p.data.productType,
            locale
          ),
        },
        { key: clinicalDocSummaryKey(locale, "Unit ID", "N° unité"), value: p.data.unitIdentifier },
        {
          key: clinicalDocSummaryKey(locale, "Unit volume (mL)", "Volume unité (mL)"),
          value: String(p.data.unitVolumeMl),
        },
        {
          key: clinicalDocSummaryKey(locale, "Baseline temperature", "Température initiale"),
          value: p.data.baselineTemperature,
        },
        {
          key: clinicalDocSummaryKey(locale, "Heart rate", "Fréquence cardiaque"),
          value: String(p.data.baselineHeartRate),
        },
        {
          key: clinicalDocSummaryKey(locale, "Respiratory rate", "Fréquence respiratoire"),
          value: String(p.data.baselineRespRate),
        },
        {
          key: clinicalDocSummaryKey(locale, "Blood pressure", "Tension artérielle"),
          value: p.data.baselineBloodPressure,
        },
        {
          key: clinicalDocSummaryKey(locale, "SpO₂", "SpO₂"),
          value: String(p.data.baselineSpo2),
        },
        {
          key: clinicalDocSummaryKey(locale, "Patient identity", "Identité patient"),
          value: clinicalDocYesNo(p.data.patientIdentityVerified, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Consent", "Consentement"),
          value: clinicalDocYesNo(p.data.consentVerified, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Symptoms present", "Symptômes"),
          value: clinicalDocYesNo(p.data.symptomsPresent, locale),
        },
      ];
      if (p.data.symptomChecklist.length > 0) {
        lines.push({
          key: clinicalDocSummaryKey(locale, "Symptoms", "Signes"),
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
    case BLOOD_PRODUCT_REASSESSMENT_CARD_ID: {
      const p = bloodProductReassessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const lines: Array<{ key: string; value: string }> = [
        {
          key: clinicalDocSummaryKey(locale, "Assessment time", "Heure évaluation"),
          value: p.data.assessmentTime,
        },
        {
          key: clinicalDocSummaryKey(locale, "Temperature", "Température"),
          value: p.data.temperature,
        },
        {
          key: clinicalDocSummaryKey(locale, "Heart rate", "Fréquence cardiaque"),
          value: String(p.data.heartRate),
        },
        {
          key: clinicalDocSummaryKey(locale, "Respiratory rate", "Fréquence respiratoire"),
          value: String(p.data.respRate),
        },
        {
          key: clinicalDocSummaryKey(locale, "Blood pressure", "Tension artérielle"),
          value: p.data.bloodPressure,
        },
        {
          key: clinicalDocSummaryKey(locale, "SpO₂", "SpO₂"),
          value: String(p.data.spo2),
        },
        {
          key: clinicalDocSummaryKey(locale, "Symptoms present", "Symptômes"),
          value: clinicalDocYesNo(p.data.symptomsPresent, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Continued administration", "Administration poursuivie"),
          value: clinicalDocYesNo(p.data.continuedAdministration, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: clinicalDocYesNo(p.data.providerNotified, locale),
        },
      ];
      if (p.data.symptomChecklist.length > 0) {
        lines.push({
          key: clinicalDocSummaryKey(locale, "Symptoms", "Signes"),
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
          key: clinicalDocSummaryKey(locale, "Reaction type", "Type réaction"),
          value: pickLocalizedEnumLabel(
            REACTION_TYPE_EN,
            REACTION_TYPE_FR,
            p.data.reactionType,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Reaction status", "Statut réaction"),
          value: clinicalDocSummaryKey(locale, "Documented", "Documentée"),
        },
        {
          key: clinicalDocSummaryKey(locale, "Symptoms", "Symptômes"),
          value: formatSymptomList(
            p.data.symptoms,
            REACTION_SYMPTOM_EN,
            REACTION_SYMPTOM_FR,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: clinicalDocYesNo(p.data.providerNotified, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Intervention required", "Intervention requise"),
          value: clinicalDocYesNo(p.data.interventionRequired, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Transfusion stopped", "Transfusion arrêtée"),
          value: clinicalDocYesNo(p.data.transfusionStopped, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Blood bank notified", "Banque du sang avisée"),
          value: clinicalDocYesNo(p.data.bloodBankNotified, locale),
        },
      ];
    }
    case BLOOD_PRODUCT_COMPLETION_CARD_ID: {
      const p = bloodProductCompletionPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: clinicalDocSummaryKey(locale, "Product", "Produit"),
          value: pickLocalizedEnumLabel(
            PRODUCT_TYPE_EN,
            PRODUCT_TYPE_FR,
            p.data.productType,
            locale
          ),
        },
        { key: clinicalDocSummaryKey(locale, "Unit ID", "N° unité"), value: p.data.unitIdentifier },
        {
          key: clinicalDocSummaryKey(locale, "Completion time", "Heure fin transfusion"),
          value: p.data.completionTime,
        },
        {
          key: clinicalDocSummaryKey(locale, "End time", "Heure fin"),
          value: p.data.endTime,
        },
        {
          key: clinicalDocSummaryKey(locale, "Volume infused (mL)", "Volume perfusé (mL)"),
          value: String(p.data.volumeInfusedMl),
        },
        {
          key: clinicalDocSummaryKey(locale, "Post temperature", "Température post"),
          value: p.data.postTemperature,
        },
        {
          key: clinicalDocSummaryKey(locale, "Post heart rate", "Fréquence cardiaque post"),
          value: String(p.data.postHeartRate),
        },
        {
          key: clinicalDocSummaryKey(locale, "Post blood pressure", "Tension post"),
          value: p.data.postBloodPressure,
        },
        {
          key: clinicalDocSummaryKey(locale, "Post SpO₂", "SpO₂ post"),
          value: String(p.data.postSpo2),
        },
        {
          key: clinicalDocSummaryKey(locale, "Reaction observed", "Réaction observée"),
          value: clinicalDocYesNo(p.data.reactionObserved, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Transfusion completed", "Transfusion terminée"),
          value: clinicalDocYesNo(p.data.transfusionCompleted, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: clinicalDocYesNo(p.data.providerNotified, locale),
        },
      ];
    }
    case MASSIVE_TRANSFUSION_PROTOCOL_EVENT_CARD_ID: {
      const p = massiveTransfusionProtocolEventPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: clinicalDocSummaryKey(locale, "MTP status", "Statut PTM"),
          value: pickLocalizedEnumLabel(MTP_EVENT_EN, MTP_EVENT_FR, p.data.eventType, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Event time", "Heure événement"),
          value: p.data.eventTime,
        },
        {
          key: clinicalDocSummaryKey(locale, "Initiated by", "Initié par"),
          value: p.data.initiatedBy,
        },
        {
          key: clinicalDocSummaryKey(locale, "Reason", "Motif"),
          value: p.data.reason,
        },
      ];
    }
    default:
      return [];
  }
}
