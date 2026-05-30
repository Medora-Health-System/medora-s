import { z } from "zod";
import type { ClinicalDocumentationFieldOption } from "./clinicalDocumentationFieldOptions.js";
import {
  pickLocalizedEnumLabel,
  type ClinicalDocumentationSummaryLocale,
} from "./clinicalDocumentationSummaryLocale.js";

/** EDOC.23 — preserve legacy registry card IDs. */
export const PROCEDURE_TIMEOUT_CARD_ID = "proc_timeout" as const;
export const LUMBAR_PUNCTURE_MONITORING_CARD_ID = "proc_lumbar_puncture" as const;
export const TNK_ADMINISTRATION_CARD_ID = "stroke_tnk" as const;
export const TPA_ADMINISTRATION_CARD_ID = "stroke_tpa" as const;

export const EDOC23_PROCEDURAL_SAFETY_THROMBOLYTIC_CARD_IDS = [
  PROCEDURE_TIMEOUT_CARD_ID,
  LUMBAR_PUNCTURE_MONITORING_CARD_ID,
  TNK_ADMINISTRATION_CARD_ID,
  TPA_ADMINISTRATION_CARD_ID,
] as const;

export type Edoc23ProceduralSafetyThrombolyticCardId =
  (typeof EDOC23_PROCEDURAL_SAFETY_THROMBOLYTIC_CARD_IDS)[number];

/** Future Phase — EDOC.23A Thrombolytic Dual Verification & Stroke Pharmacist Governance */
export const EDOC_23A_FUTURE_THROMBOLYTIC_DUAL_VERIFICATION = "EDOC.23A" as const;

export const PROC_YES_NO_VALUES = ["YES", "NO"] as const;
export const PROC_YES_NO_NA_VALUES = ["YES", "NO", "NOT_APPLICABLE"] as const;
export const PROC_YES_NO_UNKNOWN_NA_VALUES = ["YES", "NO", "UNKNOWN", "NOT_APPLICABLE"] as const;

export const PROC_TIMEOUT_PROCEDURE_TYPE_VALUES = [
  "LUMBAR_PUNCTURE",
  "CENTRAL_LINE",
  "CHEST_TUBE",
  "INTUBATION",
  "SEDATION_PROCEDURE",
  "CARDIOVERSION",
  "WOUND_REPAIR",
  "OTHER",
] as const;

export const LP_POST_PROCEDURE_POSITION_VALUES = [
  "SUPINE",
  "SITTING",
  "AMBULATING",
  "OTHER",
] as const;

export const LP_NEURO_STATUS_VALUES = ["BASELINE", "CHANGED", "UNABLE_TO_ASSESS"] as const;

export const THROMBOLYTIC_HOLD_REASON_VALUES = [
  "CLINICAL_CONTRAINDICATION",
  "BP_OUT_OF_RANGE",
  "PATIENT_DECLINED",
  "PROVIDER_HELD",
  "OTHER",
] as const;

export const THROMBOLYTIC_INTERRUPTION_REASON_VALUES = [
  "ADVERSE_REACTION",
  "BLEEDING",
  "BP_ELEVATION",
  "PROVIDER_ORDER",
  "OTHER",
] as const;

const optionalNotes = z.string().trim().max(2000).optional();
const isoDateTimeString = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date/time" });

const procYesNo = z.enum(PROC_YES_NO_VALUES);
const procYesNoNa = z.enum(PROC_YES_NO_NA_VALUES);
const procYesNoUnknownNa = z.enum(PROC_YES_NO_UNKNOWN_NA_VALUES);
const positiveWeight = z.coerce.number().positive().max(500);
const positiveDose = z.coerce.number().positive().max(1000);
const nonNegativeDose = z.coerce.number().min(0).max(1000);
const nihssScore = z.coerce.number().int().min(0).max(42);

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

export const PROC_YES_NO_OPTIONS = enumOptions(PROC_YES_NO_VALUES, {
  YES: { en: "Yes", fr: "Oui" },
  NO: { en: "No", fr: "Non" },
});

export const PROC_YES_NO_NA_OPTIONS = enumOptions(PROC_YES_NO_NA_VALUES, {
  YES: { en: "Yes", fr: "Oui" },
  NO: { en: "No", fr: "Non" },
  NOT_APPLICABLE: { en: "Not applicable", fr: "Non applicable" },
});

export const PROC_YES_NO_UNKNOWN_NA_OPTIONS = enumOptions(PROC_YES_NO_UNKNOWN_NA_VALUES, {
  YES: { en: "Yes", fr: "Oui" },
  NO: { en: "No", fr: "Non" },
  UNKNOWN: { en: "Unknown", fr: "Inconnu" },
  NOT_APPLICABLE: { en: "Not applicable", fr: "Non applicable" },
});

export const PROC_TIMEOUT_PROCEDURE_TYPE_OPTIONS = enumOptions(PROC_TIMEOUT_PROCEDURE_TYPE_VALUES, {
  LUMBAR_PUNCTURE: { en: "Lumbar puncture", fr: "Ponction lombaire" },
  CENTRAL_LINE: { en: "Central line", fr: "Voie centrale" },
  CHEST_TUBE: { en: "Chest tube", fr: "Drain thoracique" },
  INTUBATION: { en: "Intubation", fr: "Intubation" },
  SEDATION_PROCEDURE: { en: "Sedation procedure", fr: "Procédure sous sédation" },
  CARDIOVERSION: { en: "Cardioversion", fr: "Cardioversion" },
  WOUND_REPAIR: { en: "Wound repair", fr: "Réparation de plaie" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const LP_POST_PROCEDURE_POSITION_OPTIONS = enumOptions(LP_POST_PROCEDURE_POSITION_VALUES, {
  SUPINE: { en: "Supine", fr: "Décubitus" },
  SITTING: { en: "Sitting", fr: "Assis" },
  AMBULATING: { en: "Ambulating", fr: "Ambulation" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const LP_NEURO_STATUS_OPTIONS = enumOptions(LP_NEURO_STATUS_VALUES, {
  BASELINE: { en: "Baseline", fr: "Référence" },
  CHANGED: { en: "Changed", fr: "Modifié" },
  UNABLE_TO_ASSESS: { en: "Unable to assess", fr: "Non évaluable" },
});

export const THROMBOLYTIC_HOLD_REASON_OPTIONS = enumOptions(THROMBOLYTIC_HOLD_REASON_VALUES, {
  CLINICAL_CONTRAINDICATION: { en: "Clinical contraindication", fr: "Contre-indication clinique" },
  BP_OUT_OF_RANGE: { en: "BP out of range", fr: "TA hors limites" },
  PATIENT_DECLINED: { en: "Patient declined", fr: "Refus du patient" },
  PROVIDER_HELD: { en: "Provider held", fr: "Retenu par le médecin" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const THROMBOLYTIC_INTERRUPTION_REASON_OPTIONS = enumOptions(
  THROMBOLYTIC_INTERRUPTION_REASON_VALUES,
  {
    ADVERSE_REACTION: { en: "Adverse reaction", fr: "Réaction indésirable" },
    BLEEDING: { en: "Bleeding", fr: "Saignement" },
    BP_ELEVATION: { en: "BP elevation", fr: "Élévation TA" },
    PROVIDER_ORDER: { en: "Provider order", fr: "Ordre médecin" },
    OTHER: { en: "Other", fr: "Autre" },
  }
);

function procYesNoLabel(
  value: (typeof PROC_YES_NO_VALUES)[number],
  locale: ClinicalDocumentationSummaryLocale
): string {
  return value === "YES" ? (locale === "en" ? "Yes" : "Oui") : locale === "en" ? "No" : "Non";
}

function requireProviderNotifiedYes(
  data: { providerNotified: (typeof PROC_YES_NO_VALUES)[number] },
  ctx: z.RefinementCtx
) {
  if (data.providerNotified !== "YES") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provider notification required",
      path: ["providerNotified"],
    });
  }
}

function requireNotesWhenOther(topic: string, notes: string | undefined, ctx: z.RefinementCtx) {
  if (topic === "OTHER" && !notes?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "notes required when OTHER selected",
      path: ["notes"],
    });
  }
}

const TIMEOUT_SAFETY_FIELDS = [
  "patientIdentityConfirmed",
  "procedureConfirmed",
  "allergiesReviewed",
  "equipmentAvailable",
  "participantsPresent",
  "providerPresent",
  "nursePresent",
] as const;

export const procedureTimeoutPayloadSchema = z
  .object({
    timeoutTime: isoDateTimeString,
    procedureType: z.enum(PROC_TIMEOUT_PROCEDURE_TYPE_VALUES),
    patientIdentityConfirmed: procYesNo,
    procedureConfirmed: procYesNo,
    siteConfirmed: procYesNoUnknownNa,
    consentVerified: procYesNoUnknownNa,
    allergiesReviewed: procYesNo,
    anticoagulationReviewed: procYesNoUnknownNa,
    imagingReviewed: procYesNoUnknownNa,
    labsReviewed: procYesNoUnknownNa,
    equipmentAvailable: procYesNo,
    bloodProductsAvailable: procYesNoUnknownNa,
    participantsPresent: procYesNo,
    providerPresent: procYesNo,
    nursePresent: procYesNo,
    timeoutCompleted: procYesNo,
    procedureHeld: procYesNo,
    providerNotified: procYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    requireNotesWhenOther(data.procedureType, data.notes, ctx);
    if (data.participantsPresent === "NO" && data.timeoutCompleted === "YES") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "timeoutCompleted cannot be YES when participants absent",
        path: ["timeoutCompleted"],
      });
    }
    if (data.timeoutCompleted !== "YES" && data.procedureHeld !== "YES") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "timeoutCompleted must be YES unless procedure held",
        path: ["timeoutCompleted"],
      });
    }
    if (data.procedureHeld === "YES") {
      requireProviderNotifiedYes(data, ctx);
    }
    let safetyFailure = false;
    for (const field of TIMEOUT_SAFETY_FIELDS) {
      if (data[field] === "NO") {
        safetyFailure = true;
        break;
      }
    }
    if (data.siteConfirmed === "NO" || data.consentVerified === "NO") {
      safetyFailure = true;
    }
    if (safetyFailure && data.procedureHeld !== "YES" && !data.notes?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "notes required when safety item is NO and procedure not held",
        path: ["notes"],
      });
    }
  });

export const lumbarPunctureMonitoringPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    postProcedurePosition: z.enum(LP_POST_PROCEDURE_POSITION_VALUES),
    neuroStatus: z.enum(LP_NEURO_STATUS_VALUES),
    headachePresent: procYesNo,
    backPainPresent: procYesNo,
    bleedingPresent: procYesNo,
    csfLeakConcern: procYesNo,
    nauseaVomitingPresent: procYesNo,
    vitalSignsStable: procYesNo,
    providerNotified: procYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    requireNotesWhenOther(data.postProcedurePosition, data.notes, ctx);
    if (data.neuroStatus === "CHANGED") requireProviderNotifiedYes(data, ctx);
    if (data.bleedingPresent === "YES") requireProviderNotifiedYes(data, ctx);
    if (data.csfLeakConcern === "YES") requireProviderNotifiedYes(data, ctx);
    if (data.vitalSignsStable === "NO") requireProviderNotifiedYes(data, ctx);
  });

export const tnkAdministrationPayloadSchema = z
  .object({
    administrationTime: isoDateTimeString,
    lastKnownWellTime: isoDateTimeString,
    nihssScore: nihssScore,
    patientWeightKg: positiveWeight,
    doseMg: positiveDose,
    doseVerified: procYesNo,
    ctHeadReviewed: procYesNo,
    contraindicationChecklistReviewed: procYesNo,
    providerOrderVerified: procYesNo,
    neurologyConsulted: procYesNoUnknownNa,
    bloodPressureWithinParameters: procYesNo,
    anticoagulantUseReviewed: procYesNo,
    bleedingRiskReviewed: procYesNo,
    patientFamilyEducationProvided: procYesNoUnknownNa,
    medicationAdministered: procYesNo,
    administrationHeld: procYesNo,
    holdReason: z.enum(THROMBOLYTIC_HOLD_REASON_VALUES).optional(),
    providerNotified: procYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.bloodPressureWithinParameters === "NO") {
      if (data.medicationAdministered === "YES") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "medicationAdministered cannot be YES when BP outside parameters",
          path: ["medicationAdministered"],
        });
      }
      requireProviderNotifiedYes(data, ctx);
    }
    if (data.medicationAdministered === "YES") {
      for (const field of [
        "doseVerified",
        "ctHeadReviewed",
        "contraindicationChecklistReviewed",
        "providerOrderVerified",
        "bloodPressureWithinParameters",
        "anticoagulantUseReviewed",
        "bleedingRiskReviewed",
      ] as const) {
        if (data[field] !== "YES") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${field} must be YES when medication administered`,
            path: [field],
          });
        }
      }
    } else {
      if (data.administrationHeld !== "YES") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "administrationHeld must be YES when medication not administered",
          path: ["administrationHeld"],
        });
      }
      if (!data.holdReason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "holdReason required when medication not administered",
          path: ["holdReason"],
        });
      }
      requireProviderNotifiedYes(data, ctx);
    }
  });

export const tpaAdministrationPayloadSchema = z
  .object({
    administrationTime: isoDateTimeString,
    lastKnownWellTime: isoDateTimeString,
    nihssScore: nihssScore,
    patientWeightKg: positiveWeight,
    totalDoseMg: positiveDose,
    bolusDoseMg: nonNegativeDose,
    infusionDoseMg: nonNegativeDose,
    bolusTime: isoDateTimeString.optional(),
    infusionStartTime: isoDateTimeString.optional(),
    infusionCompletionTime: isoDateTimeString.optional(),
    doseVerified: procYesNo,
    ctHeadReviewed: procYesNo,
    contraindicationChecklistReviewed: procYesNo,
    providerOrderVerified: procYesNo,
    neurologyConsulted: procYesNoUnknownNa,
    bloodPressureWithinParameters: procYesNo,
    anticoagulantUseReviewed: procYesNo,
    bleedingRiskReviewed: procYesNo,
    medicationAdministered: procYesNo,
    infusionInterrupted: procYesNo,
    interruptionReason: z.enum(THROMBOLYTIC_INTERRUPTION_REASON_VALUES).optional(),
    administrationHeld: procYesNo,
    holdReason: z.enum(THROMBOLYTIC_HOLD_REASON_VALUES).optional(),
    providerNotified: procYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (!isTpaTotalDoseConsistent(data.totalDoseMg, data.bolusDoseMg, data.infusionDoseMg)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "totalDoseMg must equal bolusDoseMg + infusionDoseMg",
        path: ["totalDoseMg"],
      });
    }
    if (data.bloodPressureWithinParameters === "NO") {
      if (data.medicationAdministered === "YES") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "medicationAdministered cannot be YES when BP outside parameters",
          path: ["medicationAdministered"],
        });
      }
      requireProviderNotifiedYes(data, ctx);
    }
    if (data.infusionInterrupted === "YES") {
      if (!data.interruptionReason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "interruptionReason required",
          path: ["interruptionReason"],
        });
      }
      requireProviderNotifiedYes(data, ctx);
    }
    if (data.medicationAdministered === "YES") {
      for (const field of [
        "doseVerified",
        "ctHeadReviewed",
        "contraindicationChecklistReviewed",
        "providerOrderVerified",
        "bloodPressureWithinParameters",
        "anticoagulantUseReviewed",
        "bleedingRiskReviewed",
      ] as const) {
        if (data[field] !== "YES") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${field} must be YES when medication administered`,
            path: [field],
          });
        }
      }
      if (!data.bolusTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "bolusTime required",
          path: ["bolusTime"],
        });
      }
      if (!data.infusionStartTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "infusionStartTime required",
          path: ["infusionStartTime"],
        });
      }
    } else {
      if (data.administrationHeld !== "YES") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "administrationHeld must be YES when medication not administered",
          path: ["administrationHeld"],
        });
      }
      if (!data.holdReason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "holdReason required",
          path: ["holdReason"],
        });
      }
      requireProviderNotifiedYes(data, ctx);
    }
  });

const PAYLOAD_SCHEMA_BY_CARD_ID: Record<Edoc23ProceduralSafetyThrombolyticCardId, z.ZodTypeAny> = {
  [PROCEDURE_TIMEOUT_CARD_ID]: procedureTimeoutPayloadSchema,
  [LUMBAR_PUNCTURE_MONITORING_CARD_ID]: lumbarPunctureMonitoringPayloadSchema,
  [TNK_ADMINISTRATION_CARD_ID]: tnkAdministrationPayloadSchema,
  [TPA_ADMINISTRATION_CARD_ID]: tpaAdministrationPayloadSchema,
};

export function isEdoc23ProceduralSafetyThrombolyticCardId(
  cardId: string
): cardId is Edoc23ProceduralSafetyThrombolyticCardId {
  return (EDOC23_PROCEDURAL_SAFETY_THROMBOLYTIC_CARD_IDS as readonly string[]).includes(cardId);
}

export function validateProceduralSafetyThrombolyticPayloadForCard(
  cardId: string,
  payload: Record<string, unknown>
): { ok: true; data: Record<string, unknown> } | { ok: false; message: string } {
  if (!isEdoc23ProceduralSafetyThrombolyticCardId(cardId)) {
    return { ok: false, message: "Card is not available for structured save" };
  }
  const parsed = PAYLOAD_SCHEMA_BY_CARD_ID[cardId].safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: "Invalid clinical documentation payload" };
  }
  return { ok: true, data: parsed.data as Record<string, unknown> };
}

/** Reference-only helper — does not auto-dose thrombolytics. */
export function isTpaTotalDoseConsistent(
  totalDoseMg: number,
  bolusDoseMg: number,
  infusionDoseMg: number,
  tolerance = 0.01
): boolean {
  return Math.abs(totalDoseMg - (bolusDoseMg + infusionDoseMg)) <= tolerance;
}

const PROCEDURE_TYPE_MAP = {
  en: Object.fromEntries(PROC_TIMEOUT_PROCEDURE_TYPE_OPTIONS.map((o) => [o.value, o.labelEn])),
  fr: Object.fromEntries(PROC_TIMEOUT_PROCEDURE_TYPE_OPTIONS.map((o) => [o.value, o.labelFr])),
};
const LP_POSITION_MAP = {
  en: Object.fromEntries(LP_POST_PROCEDURE_POSITION_OPTIONS.map((o) => [o.value, o.labelEn])),
  fr: Object.fromEntries(LP_POST_PROCEDURE_POSITION_OPTIONS.map((o) => [o.value, o.labelFr])),
};
const LP_NEURO_MAP = {
  en: Object.fromEntries(LP_NEURO_STATUS_OPTIONS.map((o) => [o.value, o.labelEn])),
  fr: Object.fromEntries(LP_NEURO_STATUS_OPTIONS.map((o) => [o.value, o.labelFr])),
};

export function summarizeProceduralSafetyThrombolyticPayload(
  cardId: string,
  payload: Record<string, unknown>,
  locale: ClinicalDocumentationSummaryLocale
): Array<{ key: string; value: string }> {
  switch (cardId) {
    case PROCEDURE_TIMEOUT_CARD_ID: {
      const p = procedureTimeoutPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Procedure type" : "Type de procédure",
          value: pickLocalizedEnumLabel(
            PROCEDURE_TYPE_MAP.en,
            PROCEDURE_TYPE_MAP.fr,
            d.procedureType,
            locale
          ),
        },
        {
          key: locale === "en" ? "Timeout completed" : "Time-out complété",
          value: procYesNoLabel(d.timeoutCompleted, locale),
        },
        {
          key: locale === "en" ? "Consent verified" : "Consentement vérifié",
          value: d.consentVerified,
        },
        {
          key: locale === "en" ? "Site confirmed" : "Site confirmé",
          value: d.siteConfirmed,
        },
        {
          key: locale === "en" ? "Procedure held" : "Procédure suspendue",
          value: procYesNoLabel(d.procedureHeld, locale),
        },
      ];
    }
    case LUMBAR_PUNCTURE_MONITORING_CARD_ID: {
      const p = lumbarPunctureMonitoringPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Position" : "Position",
          value: pickLocalizedEnumLabel(
            LP_POSITION_MAP.en,
            LP_POSITION_MAP.fr,
            d.postProcedurePosition,
            locale
          ),
        },
        {
          key: locale === "en" ? "Neuro status" : "Statut neuro",
          value: pickLocalizedEnumLabel(LP_NEURO_MAP.en, LP_NEURO_MAP.fr, d.neuroStatus, locale),
        },
        {
          key: locale === "en" ? "Headache" : "Céphalée",
          value: procYesNoLabel(d.headachePresent, locale),
        },
        {
          key: locale === "en" ? "CSF leak concern" : "Préoccupation fuite LCR",
          value: procYesNoLabel(d.csfLeakConcern, locale),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: procYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case TNK_ADMINISTRATION_CARD_ID: {
      const p = tnkAdministrationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "TNK administered" : "TNK administré",
          value: procYesNoLabel(d.medicationAdministered, locale),
        },
        {
          key: locale === "en" ? "Dose (mg)" : "Dose (mg)",
          value: String(d.doseMg),
        },
        {
          key: locale === "en" ? "Weight (kg)" : "Poids (kg)",
          value: String(d.patientWeightKg),
        },
        {
          key: locale === "en" ? "NIHSS" : "NIHSS",
          value: String(d.nihssScore),
        },
        {
          key: locale === "en" ? "CT reviewed" : "Scanner revu",
          value: procYesNoLabel(d.ctHeadReviewed, locale),
        },
        {
          key: locale === "en" ? "BP within parameters" : "TA dans les paramètres",
          value: procYesNoLabel(d.bloodPressureWithinParameters, locale),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: procYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case TPA_ADMINISTRATION_CARD_ID: {
      const p = tpaAdministrationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "tPA administered" : "tPA administré",
          value: procYesNoLabel(d.medicationAdministered, locale),
        },
        {
          key: locale === "en" ? "Total dose (mg)" : "Dose totale (mg)",
          value: String(d.totalDoseMg),
        },
        {
          key: locale === "en" ? "Bolus dose (mg)" : "Dose bolus (mg)",
          value: String(d.bolusDoseMg),
        },
        {
          key: locale === "en" ? "Infusion dose (mg)" : "Dose perfusion (mg)",
          value: String(d.infusionDoseMg),
        },
        {
          key: locale === "en" ? "Infusion interrupted" : "Perfusion interrompue",
          value: procYesNoLabel(d.infusionInterrupted, locale),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: procYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    default:
      return [];
  }
}
