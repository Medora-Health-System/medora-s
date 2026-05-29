import { z } from "zod";
import {
  clinicalDocYesNo,
  pickLocalizedEnumLabel,
  type ClinicalDocumentationSummaryLocale,
} from "./clinicalDocumentationSummaryLocale.js";
import {
  type FacilityClinicalDocumentationWitnessPolicy,
  resolveRequiresWitnessSignature,
} from "./clinicalDocumentationWitnessPolicy.js";

export const HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID =
  "high_alert_infusion_verification" as const;
export const HIGH_ALERT_INFUSION_INITIATION_CARD_ID = "high_alert_infusion_initiation" as const;
export const HIGH_ALERT_INFUSION_TITRATION_CARD_ID = "high_alert_infusion_titration" as const;
export const HIGH_ALERT_INFUSION_REASSESSMENT_CARD_ID = "high_alert_infusion_reassessment" as const;
export const HIGH_ALERT_INFUSION_HOLD_CARD_ID = "high_alert_infusion_hold" as const;
export const HIGH_ALERT_INFUSION_COMPLETION_CARD_ID = "high_alert_infusion_completion" as const;

export const EDOC8_HIGH_ALERT_INFUSION_DOCUMENTATION_CARD_IDS = [
  HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID,
  HIGH_ALERT_INFUSION_INITIATION_CARD_ID,
  HIGH_ALERT_INFUSION_TITRATION_CARD_ID,
  HIGH_ALERT_INFUSION_REASSESSMENT_CARD_ID,
  HIGH_ALERT_INFUSION_HOLD_CARD_ID,
  HIGH_ALERT_INFUSION_COMPLETION_CARD_ID,
] as const;

export type Edoc8HighAlertInfusionDocumentationCardId =
  (typeof EDOC8_HIGH_ALERT_INFUSION_DOCUMENTATION_CARD_IDS)[number];

export const HIGH_ALERT_MEDICATION_TYPE_VALUES = [
  "HEPARIN",
  "INSULIN",
  "VASOPRESSOR",
  "SEDATIVE",
  "PCA",
  "CHEMOTHERAPY",
  "MAGNESIUM_HIGH_DOSE",
  "POTASSIUM_HIGH_DOSE",
  "ANTIARRHYTHMIC",
  "OTHER_HIGH_ALERT",
] as const;

export const HIGH_ALERT_INFUSION_VERIFICATION_STATUS_VALUES = [
  "DRAFT",
  "PENDING_WITNESS",
  "VERIFIED",
] as const;

export const TITRATION_REASON_FOR_CHANGE_VALUES = [
  "PROTOCOL",
  "PROVIDER_ORDER",
  "CLINICAL_RESPONSE",
  "OTHER",
] as const;

export const INFUSION_HOLD_REASON_VALUES = [
  "PROVIDER_ORDER",
  "ADVERSE_EVENT",
  "HYPOTENSION",
  "BRADYCARDIA",
  "HYPOGLYCEMIA",
  "LINE_ISSUE",
  "OTHER",
] as const;

export const INFUSION_ROUTE_VALUES = [
  "IV",
  "CENTRAL_LINE",
  "PCA",
  "SUBCUTANEOUS",
  "OTHER",
] as const;

/** Medication types that facilities may require dual-signature titration for (policy opt-in). */
export const DEFAULT_FACILITY_TITRATION_WITNESS_MEDICATION_TYPES = [
  "HEPARIN",
  "INSULIN",
  "VASOPRESSOR",
  "SEDATIVE",
] as const;

/**
 * EDOC.8A — Smart Infusion Governance (backlog only; not implemented).
 *
 * Many hospitals require auditability around smart infusion pump programming, drug library
 * verification, and guardrail overrides. Medora reserves the following for a future governance
 * expansion with explicit Zod schemas, UI, API wiring, and legal export tests.
 *
 * EDOC.8 (shipped) intentionally does NOT persist smart-pump governance fields below.
 * Initiation may include optional free-text `pumpIdentifier` only — not library/guardrail audit.
 *
 * When implementing EDOC.8A: add fields with schema validation; do not make required until
 * facility policy and legal review; extend bilingual summaries and chart export tests.
 */
export const EDOC_8A_SMART_INFUSION_GOVERNANCE_BACKLOG_ID = "EDOC.8A" as const;

/** Future payload keys — documented only; not in EDOC.8 Zod schemas. */
export const EDOC_8A_SMART_INFUSION_GOVERNANCE_FUTURE_FIELD_NAMES = [
  "smartPumpLibraryVerified",
  "drugLibraryVersion",
  "guardrailOverrideUsed",
  "overrideReason",
] as const;

const optionalNotes = z.string().trim().max(2000).optional();
const optionalText = z.string().trim().max(500).optional();
const isoDateTimeString = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date/time" });

const medicationType = z.enum(HIGH_ALERT_MEDICATION_TYPE_VALUES);
const rateString = z.string().trim().min(1).max(80);
const doseString = z.string().trim().min(1).max(80);
const medName = z.string().trim().min(1).max(200);

export const highAlertInfusionBillingReadinessMetadataSchema = z.object({
  capturePhase: z.literal("EDOC.8"),
  claimsGenerationDeferred: z.literal(true),
  medicationTypeCapturable: z.boolean(),
  completionCapturable: z.boolean().optional(),
  adverseEventCapturable: z.boolean().optional(),
});

/** EDOC.8 verification — dual-check clinical fields only (see EDOC.8A backlog for smart-pump governance). */
export const highAlertInfusionVerificationPayloadSchema = z.object({
  verificationTime: isoDateTimeString,
  medicationType,
  medicationName: medName,
  concentration: z.string().trim().min(1).max(120),
  orderedRate: rateString,
  orderedDose: doseString,
  weightKg: z.number().min(0).max(500).optional(),
  weightBasedCalculationVerified: z.boolean(),
  pumpProgrammingVerified: z.boolean(),
  lineTracingVerified: z.boolean(),
  patientVerified: z.boolean(),
  providerOrderVerified: z.boolean(),
  independentDoubleCheckPerformed: z.boolean(),
  verificationNotes: optionalNotes,
  verificationStatus: z.enum(HIGH_ALERT_INFUSION_VERIFICATION_STATUS_VALUES).optional(),
});

/**
 * EDOC.8 initiation — `pumpIdentifier` is optional free text (not required).
 * Smart library / guardrail fields remain EDOC.8A backlog (not persisted in EDOC.8).
 */
export const highAlertInfusionInitiationPayloadSchema = z.object({
  startTime: isoDateTimeString,
  medicationType,
  medicationName: medName,
  orderedRate: rateString,
  programmedRate: rateString,
  route: z.enum(INFUSION_ROUTE_VALUES),
  pumpIdentifier: z.string().trim().min(1).max(120).optional(),
  baselineHeartRate: z.number().int().min(0).max(300),
  baselineBloodPressure: z.string().trim().min(1).max(40),
  baselineRespRate: z.number().int().min(0).max(120),
  baselineSpo2: z.number().int().min(0).max(100),
  baselineMentalStatus: optionalText,
  providerOrderVerified: z.boolean(),
  administrationStarted: z.boolean(),
  notes: optionalNotes,
});

export const highAlertInfusionTitrationPayloadSchema = z.object({
  titrationTime: isoDateTimeString,
  medicationType,
  previousRate: rateString,
  newRate: rateString,
  reasonForChange: z.enum(TITRATION_REASON_FOR_CHANGE_VALUES),
  providerAware: z.boolean(),
  secondCheckerRequired: z.boolean(),
  titrationNotes: optionalNotes,
});

export const highAlertInfusionReassessmentPayloadSchema = z.object({
  assessmentTime: isoDateTimeString,
  heartRate: z.number().int().min(0).max(300),
  bloodPressure: z.string().trim().min(1).max(40),
  respRate: z.number().int().min(0).max(120),
  spo2: z.number().int().min(0).max(100),
  painScore: z.number().int().min(0).max(10).optional(),
  sedationScore: z.number().int().min(0).max(10).optional(),
  neurologicStatus: optionalText,
  adverseEffectsPresent: z.boolean(),
  providerNotified: z.boolean(),
  continuedInfusion: z.boolean(),
  notes: optionalNotes,
});

export const highAlertInfusionHoldPayloadSchema = z.object({
  holdTime: isoDateTimeString,
  reason: z.enum(INFUSION_HOLD_REASON_VALUES),
  providerNotified: z.boolean(),
  restartPlanned: z.boolean(),
  notes: optionalNotes,
});

export const highAlertInfusionCompletionPayloadSchema = z.object({
  completionTime: isoDateTimeString,
  medicationType,
  finalRate: rateString,
  completedAsOrdered: z.boolean(),
  adverseEventOccurred: z.boolean(),
  providerNotified: z.boolean(),
  notes: optionalNotes,
  billingReadinessMetadata: highAlertInfusionBillingReadinessMetadataSchema.optional(),
});

const HIGH_ALERT_INFUSION_PAYLOAD_SCHEMA_BY_CARD_ID: Record<
  string,
  z.ZodType<Record<string, unknown>>
> = {
  [HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID]: highAlertInfusionVerificationPayloadSchema,
  [HIGH_ALERT_INFUSION_INITIATION_CARD_ID]: highAlertInfusionInitiationPayloadSchema,
  [HIGH_ALERT_INFUSION_TITRATION_CARD_ID]: highAlertInfusionTitrationPayloadSchema,
  [HIGH_ALERT_INFUSION_REASSESSMENT_CARD_ID]: highAlertInfusionReassessmentPayloadSchema,
  [HIGH_ALERT_INFUSION_HOLD_CARD_ID]: highAlertInfusionHoldPayloadSchema,
  [HIGH_ALERT_INFUSION_COMPLETION_CARD_ID]: highAlertInfusionCompletionPayloadSchema,
};

export function isEdoc8HighAlertInfusionDocumentationCardId(
  cardId: string
): cardId is Edoc8HighAlertInfusionDocumentationCardId {
  return (EDOC8_HIGH_ALERT_INFUSION_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId);
}

export function enrichHighAlertInfusionPayloadForPersistence(
  cardId: string,
  payload: Record<string, unknown>
): Record<string, unknown> {
  if (cardId === HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID) {
    return {
      ...payload,
      verificationStatus: "PENDING_WITNESS",
    };
  }
  if (cardId === HIGH_ALERT_INFUSION_COMPLETION_CARD_ID) {
    const p = highAlertInfusionCompletionPayloadSchema.safeParse(payload);
    if (!p.success) return payload;
    return {
      ...p.data,
      billingReadinessMetadata: {
        capturePhase: "EDOC.8",
        claimsGenerationDeferred: true,
        medicationTypeCapturable: true,
        completionCapturable: true,
        adverseEventCapturable: p.data.adverseEventOccurred,
      },
    };
  }
  return payload;
}

export function validateHighAlertInfusionPayloadForCard(
  cardId: string,
  payload: Record<string, unknown>
): { ok: true; data: Record<string, unknown> } | { ok: false; message: string } {
  const schema = HIGH_ALERT_INFUSION_PAYLOAD_SCHEMA_BY_CARD_ID[cardId];
  if (!schema) {
    return { ok: false, message: "Card is not available for structured save" };
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: "Invalid clinical documentation payload" };
  }
  const data = enrichHighAlertInfusionPayloadForPersistence(
    cardId,
    parsed.data as Record<string, unknown>
  );
  return { ok: true, data };
}

export function resolveRequiresWitnessSignatureForClinicalDocumentationEntry(
  cardId: string,
  payload: Record<string, unknown>,
  facilityPolicy?: FacilityClinicalDocumentationWitnessPolicy | null
): boolean {
  if (resolveRequiresWitnessSignature(cardId, facilityPolicy)) {
    return true;
  }
  if (cardId !== HIGH_ALERT_INFUSION_TITRATION_CARD_ID) {
    return false;
  }
  const parsed = highAlertInfusionTitrationPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return false;
  }
  if (parsed.data.secondCheckerRequired) {
    return true;
  }
  const policyTypes = facilityPolicy?.witnessRequiredTitrationMedicationTypes;
  if (!policyTypes || policyTypes.length === 0) {
    return false;
  }
  return policyTypes.includes(parsed.data.medicationType);
}

const MED_TYPE_EN: Record<string, string> = {
  HEPARIN: "Heparin",
  INSULIN: "Insulin",
  VASOPRESSOR: "Vasopressor",
  SEDATIVE: "Sedative",
  PCA: "PCA",
  CHEMOTHERAPY: "Chemotherapy",
  MAGNESIUM_HIGH_DOSE: "High-dose magnesium",
  POTASSIUM_HIGH_DOSE: "High-dose potassium",
  ANTIARRHYTHMIC: "Antiarrhythmic",
  OTHER_HIGH_ALERT: "Other high-alert",
};

const MED_TYPE_FR: Record<string, string> = {
  HEPARIN: "Héparine",
  INSULIN: "Insuline",
  VASOPRESSOR: "Vasopresseur",
  SEDATIVE: "Sédatif",
  PCA: "PCA",
  CHEMOTHERAPY: "Chimiothérapie",
  MAGNESIUM_HIGH_DOSE: "Magnésium haute dose",
  POTASSIUM_HIGH_DOSE: "Potassium haute dose",
  ANTIARRHYTHMIC: "Antiarythmique",
  OTHER_HIGH_ALERT: "Autre haute alerte",
};

const TITRATION_REASON_EN: Record<string, string> = {
  PROTOCOL: "Protocol",
  PROVIDER_ORDER: "Provider order",
  CLINICAL_RESPONSE: "Clinical response",
  OTHER: "Other",
};

const TITRATION_REASON_FR: Record<string, string> = {
  PROTOCOL: "Protocole",
  PROVIDER_ORDER: "Ordre médical",
  CLINICAL_RESPONSE: "Réponse clinique",
  OTHER: "Autre",
};

const HOLD_REASON_EN: Record<string, string> = {
  PROVIDER_ORDER: "Provider order",
  ADVERSE_EVENT: "Adverse event",
  HYPOTENSION: "Hypotension",
  BRADYCARDIA: "Bradycardia",
  HYPOGLYCEMIA: "Hypoglycemia",
  LINE_ISSUE: "Line issue",
  OTHER: "Other",
};

const HOLD_REASON_FR: Record<string, string> = {
  PROVIDER_ORDER: "Ordre médical",
  ADVERSE_EVENT: "Événement indésirable",
  HYPOTENSION: "Hypotension",
  BRADYCARDIA: "Bradycardie",
  HYPOGLYCEMIA: "Hypoglycémie",
  LINE_ISSUE: "Problème de ligne",
  OTHER: "Autre",
};

const ROUTE_EN: Record<string, string> = {
  IV: "IV",
  CENTRAL_LINE: "Central line",
  PCA: "PCA",
  SUBCUTANEOUS: "Subcutaneous",
  OTHER: "Other",
};

const ROUTE_FR: Record<string, string> = {
  IV: "IV",
  CENTRAL_LINE: "Ligne centrale",
  PCA: "PCA",
  SUBCUTANEOUS: "Sous-cutané",
  OTHER: "Autre",
};

export function summarizeHighAlertInfusionDocumentationPayload(
  cardId: string,
  payload: Record<string, unknown>,
  locale: ClinicalDocumentationSummaryLocale
): Array<{ key: string; value: string }> {
  switch (cardId) {
    case HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID: {
      const p = highAlertInfusionVerificationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: locale === "en" ? "Medication" : "Médicament",
          value: p.data.medicationName,
        },
        {
          key: locale === "en" ? "Type" : "Type",
          value: pickLocalizedEnumLabel(
            MED_TYPE_EN,
            MED_TYPE_FR,
            p.data.medicationType,
            locale
          ),
        },
        {
          key: locale === "en" ? "Ordered rate" : "Débit prescrit",
          value: p.data.orderedRate,
        },
        {
          key: locale === "en" ? "Ordered dose" : "Dose prescrite",
          value: p.data.orderedDose,
        },
        {
          key: locale === "en" ? "Pump verified" : "Pompe vérifiée",
          value: clinicalDocYesNo(p.data.pumpProgrammingVerified, locale),
        },
        {
          key: locale === "en" ? "Double check" : "Double vérification",
          value: clinicalDocYesNo(p.data.independentDoubleCheckPerformed, locale),
        },
        {
          key: locale === "en" ? "Verification status" : "Statut vérification",
          value:
            p.data.verificationStatus === "VERIFIED"
              ? locale === "en"
                ? "Verified"
                : "Vérifié"
              : locale === "en"
                ? "Pending witness"
                : "Témoin en attente",
        },
      ];
    }
    case HIGH_ALERT_INFUSION_INITIATION_CARD_ID: {
      const p = highAlertInfusionInitiationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: locale === "en" ? "Medication" : "Médicament",
          value: p.data.medicationName,
        },
        {
          key: locale === "en" ? "Start time" : "Heure début",
          value: p.data.startTime,
        },
        {
          key: locale === "en" ? "Programmed rate" : "Débit programmé",
          value: p.data.programmedRate,
        },
        {
          key: locale === "en" ? "Route" : "Voie",
          value: pickLocalizedEnumLabel(ROUTE_EN, ROUTE_FR, p.data.route, locale),
        },
        {
          key: locale === "en" ? "Administration started" : "Administration démarrée",
          value: clinicalDocYesNo(p.data.administrationStarted, locale),
        },
      ];
    }
    case HIGH_ALERT_INFUSION_TITRATION_CARD_ID: {
      const p = highAlertInfusionTitrationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: locale === "en" ? "Titration" : "Titulation",
          value: `${p.data.previousRate} → ${p.data.newRate}`,
        },
        {
          key: locale === "en" ? "Reason" : "Motif",
          value: pickLocalizedEnumLabel(
            TITRATION_REASON_EN,
            TITRATION_REASON_FR,
            p.data.reasonForChange,
            locale
          ),
        },
        {
          key: locale === "en" ? "Second checker required" : "Second contrôle requis",
          value: clinicalDocYesNo(p.data.secondCheckerRequired, locale),
        },
      ];
    }
    case HIGH_ALERT_INFUSION_REASSESSMENT_CARD_ID: {
      const p = highAlertInfusionReassessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: locale === "en" ? "Assessment time" : "Heure évaluation",
          value: p.data.assessmentTime,
        },
        {
          key: locale === "en" ? "Adverse effects" : "Effets indésirables",
          value: clinicalDocYesNo(p.data.adverseEffectsPresent, locale),
        },
        {
          key: locale === "en" ? "Continued infusion" : "Perfusion poursuivie",
          value: clinicalDocYesNo(p.data.continuedInfusion, locale),
        },
      ];
    }
    case HIGH_ALERT_INFUSION_HOLD_CARD_ID: {
      const p = highAlertInfusionHoldPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: locale === "en" ? "Hold time" : "Heure pause",
          value: p.data.holdTime,
        },
        {
          key: locale === "en" ? "Reason" : "Motif",
          value: pickLocalizedEnumLabel(HOLD_REASON_EN, HOLD_REASON_FR, p.data.reason, locale),
        },
        {
          key: locale === "en" ? "Restart planned" : "Reprise prévue",
          value: clinicalDocYesNo(p.data.restartPlanned, locale),
        },
      ];
    }
    case HIGH_ALERT_INFUSION_COMPLETION_CARD_ID: {
      const p = highAlertInfusionCompletionPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: locale === "en" ? "Medication type" : "Type médicament",
          value: pickLocalizedEnumLabel(
            MED_TYPE_EN,
            MED_TYPE_FR,
            p.data.medicationType,
            locale
          ),
        },
        {
          key: locale === "en" ? "Completion time" : "Heure fin",
          value: p.data.completionTime,
        },
        {
          key: locale === "en" ? "Final rate" : "Débit final",
          value: p.data.finalRate,
        },
        {
          key: locale === "en" ? "Completion status" : "Statut fin",
          value: clinicalDocYesNo(p.data.completedAsOrdered, locale),
        },
        {
          key: locale === "en" ? "Adverse event" : "Événement indésirable",
          value: clinicalDocYesNo(p.data.adverseEventOccurred, locale),
        },
      ];
    }
    default:
      return [];
  }
}
