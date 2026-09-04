import { z } from "zod";
import type { ClinicalDocumentationFieldOption } from "./clinicalDocumentationFieldOptions.js";
import {
  pickLocalizedEnumLabel,
  type ClinicalDocumentationSummaryLocale,
  clinicalDocSummaryKey,
  clinicalDocScoreValue,
  clinicalDocYesNo,
} from "./clinicalDocumentationSummaryLocale.js";
import {
  THROMBOLYTIC_HOLD_REASON_OPTIONS,
  THROMBOLYTIC_HOLD_REASON_VALUES,
} from "./proceduralSafetyThrombolyticPayloads.js";

/** EDOC.23B — foundation catalog completion (flowsheets + scores/screens). */
export const FLOW_CPR_RECORD_CARD_ID = "flow_cpr_record" as const;
export const FLOW_THROMBOLYTIC_MI_CARD_ID = "flow_thrombolytic_mi" as const;
export const FLOW_OBSERVATION_MONITORING_CARD_ID = "flow_observation_monitoring" as const;

export const SCORE_CIWA_AR_CARD_ID = "score_ciwa_ar" as const;
export const SCORE_COWS_CARD_ID = "score_cows" as const;
export const SCORE_CSSRS_CARD_ID = "score_cssrs" as const;
export const SCORE_PHQ9_CARD_ID = "score_phq9" as const;
export const SCORE_GAD7_CARD_ID = "score_gad7" as const;
export const SCORE_RTS_CARD_ID = "score_rts" as const;
export const SCORE_HEART_CARD_ID = "score_heart" as const;
export const SCORE_WELLS_PE_CARD_ID = "score_wells_pe" as const;
export const SCORE_PERC_CARD_ID = "score_perc" as const;
export const SCORE_GENEVA_CARD_ID = "score_geneva" as const;
export const SCORE_ABUSE_CARD_ID = "score_abuse" as const;
export const SCORE_HUMAN_TRAFFICKING_CARD_ID = "score_human_trafficking" as const;
export const SCORE_SDOH_CARD_ID = "score_sdoh" as const;

export const EDOC23B_FLOWSHEET_COMPLETION_CARD_IDS = [
  FLOW_CPR_RECORD_CARD_ID,
  FLOW_THROMBOLYTIC_MI_CARD_ID,
  FLOW_OBSERVATION_MONITORING_CARD_ID,
] as const;

export const EDOC23B_SCORE_SCREEN_COMPLETION_CARD_IDS = [
  SCORE_CIWA_AR_CARD_ID,
  SCORE_COWS_CARD_ID,
  SCORE_CSSRS_CARD_ID,
  SCORE_PHQ9_CARD_ID,
  SCORE_GAD7_CARD_ID,
  SCORE_RTS_CARD_ID,
  SCORE_HEART_CARD_ID,
  SCORE_WELLS_PE_CARD_ID,
  SCORE_PERC_CARD_ID,
  SCORE_GENEVA_CARD_ID,
  SCORE_ABUSE_CARD_ID,
  SCORE_HUMAN_TRAFFICKING_CARD_ID,
  SCORE_SDOH_CARD_ID,
] as const;

export const EDOC23B_FOUNDATION_CATALOG_COMPLETION_CARD_IDS = [
  ...EDOC23B_FLOWSHEET_COMPLETION_CARD_IDS,
  ...EDOC23B_SCORE_SCREEN_COMPLETION_CARD_IDS,
] as const;

export type Edoc23bFoundationCatalogCompletionCardId =
  (typeof EDOC23B_FOUNDATION_CATALOG_COMPLETION_CARD_IDS)[number];

export const FOUNDATION_YES_NO_VALUES = ["YES", "NO"] as const;
export const FOUNDATION_YES_NO_UNKNOWN_VALUES = ["YES", "NO", "UNKNOWN"] as const;
export const FOUNDATION_YES_NO_NA_VALUES = ["YES", "NO", "NOT_APPLICABLE"] as const;

export const CPR_EVENT_TYPE_VALUES = [
  "CPR",
  "CODE_BLUE",
  "RESPIRATORY_ARREST",
  "CARDIAC_ARREST",
  "OTHER",
] as const;

export const CPR_INITIAL_RHYTHM_VALUES = [
  "ASYSTOLE",
  "PEA",
  "VFIB",
  "VTACH",
  "BRADY",
  "UNKNOWN",
  "NOT_APPLICABLE",
] as const;

export const CPR_PATIENT_DISPOSITION_VALUES = [
  "REMAINED_IN_ED",
  "TRANSFERRED_ICU",
  "TRANSFERRED_OR",
  "TRANSFERRED_OUT",
  "EXPIRED",
  "OTHER",
] as const;

export const MI_THROMBOLYTIC_INDICATION_VALUES = ["STEMI", "HIGH_RISK_MI", "OTHER"] as const;
export const MI_THROMBOLYTIC_AGENT_VALUES = ["ALTEPLASE", "TENECTEPLASE", "OTHER"] as const;

export const OBSERVATION_REASON_VALUES = [
  "ED_OBSERVATION",
  "BOARDING",
  "DISCHARGE_PENDING",
  "TRANSFER_PENDING",
  "PROCEDURE_RECOVERY",
  "OTHER",
] as const;

export const OBSERVATION_PATIENT_STATUS_VALUES = [
  "STABLE",
  "IMPROVED",
  "UNCHANGED",
  "WORSENED",
] as const;

export const CIWA_SEVERITY_VALUES = ["MINIMAL", "MILD", "MODERATE", "SEVERE"] as const;
export const COWS_SEVERITY_VALUES = [
  "MILD",
  "MODERATE",
  "MODERATELY_SEVERE",
  "SEVERE",
] as const;
export const CSSRS_RISK_LEVEL_VALUES = ["LOW", "MODERATE", "HIGH"] as const;
export const PHQ9_SEVERITY_VALUES = [
  "NONE_MINIMAL",
  "MILD",
  "MODERATE",
  "MODERATELY_SEVERE",
  "SEVERE",
] as const;
export const GAD7_SEVERITY_VALUES = ["MINIMAL", "MILD", "MODERATE", "SEVERE"] as const;
export const RTS_RISK_FLAG_VALUES = ["LOW", "MODERATE", "HIGH"] as const;
export const HEART_RISK_LEVEL_VALUES = ["LOW", "MODERATE", "HIGH"] as const;
export const WELLS_PE_RISK_LEVEL_VALUES = ["PE_UNLIKELY", "PE_LIKELY"] as const;
export const GENEVA_RISK_LEVEL_VALUES = ["LOW", "INTERMEDIATE", "HIGH"] as const;

export const RTS_SYSTOLIC_BP_CATEGORY_VALUES = [
  "GT_89",
  "76_89",
  "50_75",
  "1_49",
  "ZERO",
] as const;

export const RTS_RESPIRATORY_RATE_CATEGORY_VALUES = [
  "10_29",
  "GT_29",
  "6_9",
  "1_5",
  "ZERO",
] as const;

export const GENEVA_HEART_RATE_CATEGORY_VALUES = ["LESS_75", "75_94", "95_OR_MORE"] as const;

function intScoreOptions(max: number): ClinicalDocumentationFieldOption<number>[] {
  return Array.from({ length: max + 1 }, (_, i) => ({
    value: i,
    labelEn: String(i),
    labelFr: String(i),
  }));
}

export const CIWA_ITEM_SCORE_OPTIONS = intScoreOptions(7);
export const CIWA_ORIENTATION_SCORE_OPTIONS = intScoreOptions(4);
export const PHQ_GAD_ITEM_SCORE_OPTIONS = intScoreOptions(3);
export const HEART_COMPONENT_SCORE_OPTIONS = intScoreOptions(2);
export const COWS_ITEM_0_4_SCORE_OPTIONS = intScoreOptions(4);
export const COWS_ITEM_0_5_SCORE_OPTIONS = intScoreOptions(5);
export const GCS_SCORE_OPTIONS: ClinicalDocumentationFieldOption<number>[] = Array.from(
  { length: 13 },
  (_, i) => {
    const value = i + 3;
    return { value, labelEn: String(value), labelFr: String(value) };
  }
);

export const RTS_SYSTOLIC_BP_CATEGORY_OPTIONS = enumOptions(RTS_SYSTOLIC_BP_CATEGORY_VALUES, {
  GT_89: { en: "> 89 mmHg", fr: "> 89 mmHg" },
  "76_89": { en: "76–89 mmHg", fr: "76–89 mmHg" },
  "50_75": { en: "50–75 mmHg", fr: "50–75 mmHg" },
  "1_49": { en: "1–49 mmHg", fr: "1–49 mmHg" },
  ZERO: { en: "0 mmHg", fr: "0 mmHg" },
});

export const RTS_RESPIRATORY_RATE_CATEGORY_OPTIONS = enumOptions(
  RTS_RESPIRATORY_RATE_CATEGORY_VALUES,
  {
    "10_29": { en: "10–29 /min", fr: "10–29 /min" },
    GT_29: { en: "> 29 /min", fr: "> 29 /min" },
    "6_9": { en: "6–9 /min", fr: "6–9 /min" },
    "1_5": { en: "1–5 /min", fr: "1–5 /min" },
    ZERO: { en: "0 /min", fr: "0 /min" },
  }
);

export const GENEVA_HEART_RATE_CATEGORY_OPTIONS = enumOptions(GENEVA_HEART_RATE_CATEGORY_VALUES, {
  LESS_75: { en: "< 75 /min", fr: "< 75 /min" },
  "75_94": { en: "75–94 /min", fr: "75–94 /min" },
  "95_OR_MORE": { en: "≥ 95 /min", fr: "≥ 95 /min" },
});

const optionalNotes = z.string().trim().max(2000).optional();
const isoDateTimeString = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date/time" });

const foundationYesNo = z.enum(FOUNDATION_YES_NO_VALUES);
const foundationYesNoUnknown = z.enum(FOUNDATION_YES_NO_UNKNOWN_VALUES);
const foundationYesNoNa = z.enum(FOUNDATION_YES_NO_NA_VALUES);
const ciwaItemScore = z.coerce.number().int().min(0).max(7);
const ciwaOrientationScore = z.coerce.number().int().min(0).max(4);
const phqGadItemScore = z.coerce.number().int().min(0).max(3);
const heartComponentScore = z.coerce.number().int().min(0).max(2);
const gcsScore = z.coerce.number().int().min(3).max(15);

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

export function foundationDocYesNoLabel(
  value: (typeof FOUNDATION_YES_NO_VALUES)[number],
  locale: ClinicalDocumentationSummaryLocale
): string {
  return clinicalDocYesNo(value === "YES", locale);
}

export const FOUNDATION_YES_NO_OPTIONS = enumOptions(FOUNDATION_YES_NO_VALUES, {
  YES: { en: "Yes", fr: "Oui" },
  NO: { en: "No", fr: "Non" },
});

export const FOUNDATION_YES_NO_UNKNOWN_OPTIONS = enumOptions(FOUNDATION_YES_NO_UNKNOWN_VALUES, {
  YES: { en: "Yes", fr: "Oui" },
  NO: { en: "No", fr: "Non" },
  UNKNOWN: { en: "Unknown", fr: "Inconnu" },
});

export const FOUNDATION_YES_NO_NA_OPTIONS = enumOptions(FOUNDATION_YES_NO_NA_VALUES, {
  YES: { en: "Yes", fr: "Oui" },
  NO: { en: "No", fr: "Non" },
  NOT_APPLICABLE: { en: "Not applicable", fr: "Non applicable" },
});

export const CPR_EVENT_TYPE_OPTIONS = enumOptions(CPR_EVENT_TYPE_VALUES, {
  CPR: { en: "CPR", fr: "RCP" },
  CODE_BLUE: { en: "Code blue", fr: "Code bleu" },
  RESPIRATORY_ARREST: { en: "Respiratory arrest", fr: "Arrêt respiratoire" },
  CARDIAC_ARREST: { en: "Cardiac arrest", fr: "Arrêt cardiaque" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const CPR_INITIAL_RHYTHM_OPTIONS = enumOptions(CPR_INITIAL_RHYTHM_VALUES, {
  ASYSTOLE: { en: "Asystole", fr: "Asystole" },
  PEA: { en: "PEA", fr: "AEA" },
  VFIB: { en: "Ventricular fibrillation", fr: "Fibrillation ventriculaire" },
  VTACH: { en: "Ventricular tachycardia", fr: "Tachycardie ventriculaire" },
  BRADY: { en: "Bradycardia", fr: "Bradycardie" },
  UNKNOWN: { en: "Unknown", fr: "Inconnu" },
  NOT_APPLICABLE: { en: "Not applicable", fr: "Non applicable" },
});

export const CPR_PATIENT_DISPOSITION_OPTIONS = enumOptions(CPR_PATIENT_DISPOSITION_VALUES, {
  REMAINED_IN_ED: { en: "Remained in ED", fr: "Resté aux urgences" },
  TRANSFERRED_ICU: { en: "Transferred to ICU", fr: "Transféré en USI" },
  TRANSFERRED_OR: { en: "Transferred to OR", fr: "Transféré au bloc" },
  TRANSFERRED_OUT: { en: "Transferred out", fr: "Transféré à l'extérieur" },
  EXPIRED: { en: "Expired", fr: "Décédé" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const MI_THROMBOLYTIC_INDICATION_OPTIONS = enumOptions(MI_THROMBOLYTIC_INDICATION_VALUES, {
  STEMI: { en: "STEMI", fr: "STEMI" },
  HIGH_RISK_MI: { en: "High-risk MI", fr: "IDM à haut risque" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const MI_THROMBOLYTIC_AGENT_OPTIONS = enumOptions(MI_THROMBOLYTIC_AGENT_VALUES, {
  ALTEPLASE: { en: "Alteplase", fr: "Altéplase" },
  TENECTEPLASE: { en: "Tenecteplase", fr: "Ténectéplase" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const OBSERVATION_REASON_OPTIONS = enumOptions(OBSERVATION_REASON_VALUES, {
  ED_OBSERVATION: { en: "ED observation", fr: "Observation aux urgences" },
  BOARDING: { en: "Boarding", fr: "Attente" },
  DISCHARGE_PENDING: { en: "Discharge pending", fr: "Sortie en attente" },
  TRANSFER_PENDING: { en: "Transfer pending", fr: "Transfert en attente" },
  PROCEDURE_RECOVERY: { en: "Procedure recovery", fr: "Récupération post-procédure" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const OBSERVATION_PATIENT_STATUS_OPTIONS = enumOptions(OBSERVATION_PATIENT_STATUS_VALUES, {
  STABLE: { en: "Stable", fr: "Stable" },
  IMPROVED: { en: "Improved", fr: "Amélioré" },
  UNCHANGED: { en: "Unchanged", fr: "Inchangé" },
  WORSENED: { en: "Worsened", fr: "Aggravé" },
});

function requireProviderNotifiedYes(
  data: { providerNotified: (typeof FOUNDATION_YES_NO_VALUES)[number] },
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

function requireProviderPresentOrNotified(
  data: {
    providerPresent: (typeof FOUNDATION_YES_NO_VALUES)[number];
    providerNotified: (typeof FOUNDATION_YES_NO_VALUES)[number];
  },
  ctx: z.RefinementCtx
) {
  if (data.providerPresent !== "YES" && data.providerNotified !== "YES") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provider present or provider notified required",
      path: ["providerNotified"],
    });
  }
}

function validateComputedTotal(
  provided: number,
  calculated: number,
  ctx: z.RefinementCtx,
  path = "totalScore"
) {
  if (provided !== calculated) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "totalScore does not match calculated value",
      path: [path],
    });
  }
}

function validateComputedEnum<T extends string>(
  provided: T,
  calculated: T,
  ctx: z.RefinementCtx,
  path: string
) {
  if (provided !== calculated) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${path} does not match calculated value`,
      path: [path],
    });
  }
}

export const cprRecordPayloadSchema = z
  .object({
    eventStartTime: isoDateTimeString,
    eventEndTime: isoDateTimeString.optional(),
    eventType: z.enum(CPR_EVENT_TYPE_VALUES),
    initialRhythm: z.enum(CPR_INITIAL_RHYTHM_VALUES),
    compressionsStarted: foundationYesNo,
    airwaySupported: foundationYesNo,
    defibrillationPerformed: foundationYesNo,
    medicationReferenceDocumented: foundationYesNoNa,
    roscAchieved: foundationYesNoUnknown,
    patientDisposition: z.enum(CPR_PATIENT_DISPOSITION_VALUES),
    providerPresent: foundationYesNo,
    providerNotified: foundationYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.eventEndTime && Date.parse(data.eventEndTime) < Date.parse(data.eventStartTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "eventEndTime must be on or after eventStartTime",
        path: ["eventEndTime"],
      });
    }
    if (data.defibrillationPerformed === "YES" && data.initialRhythm === "NOT_APPLICABLE") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "initialRhythm cannot be NOT_APPLICABLE when defibrillation performed",
        path: ["initialRhythm"],
      });
    }
    if (
      data.roscAchieved === "NO" &&
      data.patientDisposition === "REMAINED_IN_ED" &&
      !data.notes?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "notes required when ROSC not achieved and patient remained in ED",
        path: ["notes"],
      });
    }
    requireProviderPresentOrNotified(data, ctx);
  });

export const miThrombolyticPayloadSchema = z
  .object({
    administrationTime: isoDateTimeString,
    indication: z.enum(MI_THROMBOLYTIC_INDICATION_VALUES),
    agent: z.enum(MI_THROMBOLYTIC_AGENT_VALUES),
    doseVerified: foundationYesNo,
    contraindicationChecklistReviewed: foundationYesNo,
    providerOrderVerified: foundationYesNo,
    cardiologyNotified: foundationYesNo,
    ecgReviewed: foundationYesNo,
    bloodPressureWithinParameters: foundationYesNo,
    medicationAdministered: foundationYesNo,
    administrationHeld: foundationYesNo,
    holdReason: z.enum(THROMBOLYTIC_HOLD_REASON_VALUES).optional(),
    providerNotified: foundationYesNo,
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
        "contraindicationChecklistReviewed",
        "providerOrderVerified",
        "cardiologyNotified",
        "ecgReviewed",
        "bloodPressureWithinParameters",
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
    }
  });

export const observationMonitoringPayloadSchema = z
  .object({
    monitoringTime: isoDateTimeString,
    observationReason: z.enum(OBSERVATION_REASON_VALUES),
    patientStatus: z.enum(OBSERVATION_PATIENT_STATUS_VALUES),
    vitalSignsReviewed: foundationYesNo,
    painReviewed: foundationYesNo,
    safetyReviewed: foundationYesNo,
    providerNotified: foundationYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.patientStatus === "WORSENED") {
      requireProviderNotifiedYes(data, ctx);
    }
    if (data.observationReason === "OTHER" && !data.notes?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "notes required when observation reason is OTHER",
        path: ["notes"],
      });
    }
  });

export type CiwaArScoreInput = {
  nauseaVomiting: number;
  tremor: number;
  paroxysmalSweats: number;
  anxiety: number;
  agitation: number;
  tactileDisturbances: number;
  auditoryDisturbances: number;
  visualDisturbances: number;
  headache: number;
  orientationClouding: number;
};

export function calculateCiwaArTotal(input: CiwaArScoreInput): number {
  return (
    input.nauseaVomiting +
    input.tremor +
    input.paroxysmalSweats +
    input.anxiety +
    input.agitation +
    input.tactileDisturbances +
    input.auditoryDisturbances +
    input.visualDisturbances +
    input.headache +
    input.orientationClouding
  );
}

export function deriveCiwaArSeverity(totalScore: number): (typeof CIWA_SEVERITY_VALUES)[number] {
  if (totalScore >= 16) return "SEVERE";
  if (totalScore >= 8) return "MODERATE";
  if (totalScore >= 4) return "MILD";
  return "MINIMAL";
}

export const ciwaArPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    nauseaVomiting: ciwaItemScore,
    tremor: ciwaItemScore,
    paroxysmalSweats: ciwaItemScore,
    anxiety: ciwaItemScore,
    agitation: ciwaItemScore,
    tactileDisturbances: ciwaItemScore,
    auditoryDisturbances: ciwaItemScore,
    visualDisturbances: ciwaItemScore,
    headache: ciwaItemScore,
    orientationClouding: ciwaOrientationScore,
    totalScore: z.coerce.number().int().min(0).max(67),
    severity: z.enum(CIWA_SEVERITY_VALUES),
    providerNotified: foundationYesNo,
  })
  .superRefine((data, ctx) => {
    const calculated = calculateCiwaArTotal(data);
    validateComputedTotal(data.totalScore, calculated, ctx);
    validateComputedEnum(data.severity, deriveCiwaArSeverity(calculated), ctx, "severity");
    if (calculated >= 16) requireProviderNotifiedYes(data, ctx);
  });

export type CowsScoreInput = {
  restingPulse: number;
  sweating: number;
  restlessness: number;
  pupilSize: number;
  boneJointAches: number;
  runnyNoseTearing: number;
  giUpset: number;
  tremor: number;
  yawning: number;
  anxietyIrritability: number;
  goosefleshSkin: number;
};

export function calculateCowsTotal(input: CowsScoreInput): number {
  return (
    input.restingPulse +
    input.sweating +
    input.restlessness +
    input.pupilSize +
    input.boneJointAches +
    input.runnyNoseTearing +
    input.giUpset +
    input.tremor +
    input.yawning +
    input.anxietyIrritability +
    input.goosefleshSkin
  );
}

export function deriveCowsSeverity(totalScore: number): (typeof COWS_SEVERITY_VALUES)[number] {
  if (totalScore > 36) return "SEVERE";
  if (totalScore >= 25) return "MODERATELY_SEVERE";
  if (totalScore >= 13) return "MODERATE";
  return "MILD";
}

const cowsItem0_4 = z.coerce.number().int().min(0).max(4);
const cowsItem0_5 = z.coerce.number().int().min(0).max(5);

export const cowsPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    restingPulse: cowsItem0_4,
    sweating: cowsItem0_4,
    restlessness: cowsItem0_5,
    pupilSize: cowsItem0_5,
    boneJointAches: cowsItem0_4,
    runnyNoseTearing: cowsItem0_4,
    giUpset: cowsItem0_5,
    tremor: cowsItem0_4,
    yawning: cowsItem0_4,
    anxietyIrritability: cowsItem0_4,
    goosefleshSkin: cowsItem0_5,
    totalScore: z.coerce.number().int().min(0).max(48),
    severity: z.enum(COWS_SEVERITY_VALUES),
    providerNotified: foundationYesNo,
  })
  .superRefine((data, ctx) => {
    const calculated = calculateCowsTotal(data);
    validateComputedTotal(data.totalScore, calculated, ctx);
    validateComputedEnum(data.severity, deriveCowsSeverity(calculated), ctx, "severity");
    if (deriveCowsSeverity(calculated) === "SEVERE") requireProviderNotifiedYes(data, ctx);
  });

export const cssrsPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    wishToBeDead: foundationYesNo,
    suicidalThoughts: foundationYesNo,
    methodThoughts: foundationYesNo,
    intentWithoutPlan: foundationYesNo,
    intentWithPlan: foundationYesNo,
    suicidalBehavior: foundationYesNo,
    riskLevel: z.enum(CSSRS_RISK_LEVEL_VALUES),
    providerNotified: foundationYesNo,
    safetyPrecautionsInitiated: foundationYesNo,
  })
  .superRefine((data, ctx) => {
    if (data.intentWithPlan === "YES" || data.suicidalBehavior === "YES") {
      if (data.riskLevel !== "HIGH") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "riskLevel must be HIGH when intent with plan or suicidal behavior",
          path: ["riskLevel"],
        });
      }
      requireProviderNotifiedYes(data, ctx);
    }
    if (data.riskLevel === "HIGH" && data.safetyPrecautionsInitiated !== "YES") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "safetyPrecautionsInitiated required when risk level is HIGH",
        path: ["safetyPrecautionsInitiated"],
      });
    }
  });

export type Phq9ScoreInput = {
  littleInterest: number;
  feelingDown: number;
  sleepTrouble: number;
  fatigue: number;
  appetite: number;
  feelingBad: number;
  concentration: number;
  psychomotor: number;
  suicidalIdeation: number;
};

export function calculatePhq9Total(input: Phq9ScoreInput): number {
  return (
    input.littleInterest +
    input.feelingDown +
    input.sleepTrouble +
    input.fatigue +
    input.appetite +
    input.feelingBad +
    input.concentration +
    input.psychomotor +
    input.suicidalIdeation
  );
}

export function derivePhq9Severity(totalScore: number): (typeof PHQ9_SEVERITY_VALUES)[number] {
  if (totalScore >= 20) return "SEVERE";
  if (totalScore >= 15) return "MODERATELY_SEVERE";
  if (totalScore >= 10) return "MODERATE";
  if (totalScore >= 5) return "MILD";
  return "NONE_MINIMAL";
}

export function derivePhq9SuicidalIdeationPositive(
  suicidalIdeation: number
): (typeof FOUNDATION_YES_NO_VALUES)[number] {
  return suicidalIdeation > 0 ? "YES" : "NO";
}

export const phq9PayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    littleInterest: phqGadItemScore,
    feelingDown: phqGadItemScore,
    sleepTrouble: phqGadItemScore,
    fatigue: phqGadItemScore,
    appetite: phqGadItemScore,
    feelingBad: phqGadItemScore,
    concentration: phqGadItemScore,
    psychomotor: phqGadItemScore,
    suicidalIdeation: phqGadItemScore,
    totalScore: z.coerce.number().int().min(0).max(27),
    severity: z.enum(PHQ9_SEVERITY_VALUES),
    suicidalIdeationItemPositive: foundationYesNo,
    providerNotified: foundationYesNo,
  })
  .superRefine((data, ctx) => {
    const calculated = calculatePhq9Total(data);
    validateComputedTotal(data.totalScore, calculated, ctx);
    validateComputedEnum(data.severity, derivePhq9Severity(calculated), ctx, "severity");
    const ideationPositive = derivePhq9SuicidalIdeationPositive(data.suicidalIdeation);
    if (data.suicidalIdeationItemPositive !== ideationPositive) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "suicidalIdeationItemPositive does not match suicidal ideation item",
        path: ["suicidalIdeationItemPositive"],
      });
    }
    if (ideationPositive === "YES" || calculated >= 20) requireProviderNotifiedYes(data, ctx);
  });

export type Gad7ScoreInput = {
  feelingNervous: number;
  cantStopWorrying: number;
  worryingTooMuch: number;
  troubleRelaxing: number;
  restlessness: number;
  irritability: number;
  afraidSomethingAwful: number;
};

export function calculateGad7Total(input: Gad7ScoreInput): number {
  return (
    input.feelingNervous +
    input.cantStopWorrying +
    input.worryingTooMuch +
    input.troubleRelaxing +
    input.restlessness +
    input.irritability +
    input.afraidSomethingAwful
  );
}

export function deriveGad7Severity(totalScore: number): (typeof GAD7_SEVERITY_VALUES)[number] {
  if (totalScore >= 15) return "SEVERE";
  if (totalScore >= 10) return "MODERATE";
  if (totalScore >= 5) return "MILD";
  return "MINIMAL";
}

export const gad7PayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    feelingNervous: phqGadItemScore,
    cantStopWorrying: phqGadItemScore,
    worryingTooMuch: phqGadItemScore,
    troubleRelaxing: phqGadItemScore,
    restlessness: phqGadItemScore,
    irritability: phqGadItemScore,
    afraidSomethingAwful: phqGadItemScore,
    totalScore: z.coerce.number().int().min(0).max(21),
    severity: z.enum(GAD7_SEVERITY_VALUES),
    providerNotified: foundationYesNo,
  })
  .superRefine((data, ctx) => {
    const calculated = calculateGad7Total(data);
    validateComputedTotal(data.totalScore, calculated, ctx);
    validateComputedEnum(data.severity, deriveGad7Severity(calculated), ctx, "severity");
    if (deriveGad7Severity(calculated) === "SEVERE") requireProviderNotifiedYes(data, ctx);
  });

export type RtsScoreInput = {
  gcsScore: number;
  systolicBpCategory: (typeof RTS_SYSTOLIC_BP_CATEGORY_VALUES)[number];
  respiratoryRateCategory: (typeof RTS_RESPIRATORY_RATE_CATEGORY_VALUES)[number];
};

function rtsGcsCode(gcs: number): number {
  if (gcs >= 13) return 4;
  if (gcs >= 9) return 3;
  if (gcs >= 6) return 2;
  if (gcs >= 4) return 1;
  return 0;
}

function rtsSbpCode(category: (typeof RTS_SYSTOLIC_BP_CATEGORY_VALUES)[number]): number {
  const map: Record<(typeof RTS_SYSTOLIC_BP_CATEGORY_VALUES)[number], number> = {
    GT_89: 4,
    "76_89": 3,
    "50_75": 2,
    "1_49": 1,
    ZERO: 0,
  };
  return map[category];
}

function rtsRrCode(category: (typeof RTS_RESPIRATORY_RATE_CATEGORY_VALUES)[number]): number {
  const map: Record<(typeof RTS_RESPIRATORY_RATE_CATEGORY_VALUES)[number], number> = {
    "10_29": 4,
    GT_29: 3,
    "6_9": 2,
    "1_5": 1,
    ZERO: 0,
  };
  return map[category];
}

export function calculateRtsTotal(input: RtsScoreInput): number {
  const gcs = rtsGcsCode(input.gcsScore);
  const sbp = rtsSbpCode(input.systolicBpCategory);
  const rr = rtsRrCode(input.respiratoryRateCategory);
  return Number((0.9368 * gcs + 0.7376 * sbp + 0.2908 * rr).toFixed(2));
}

export function deriveRtsRiskFlag(totalScore: number): (typeof RTS_RISK_FLAG_VALUES)[number] {
  if (totalScore < 4) return "HIGH";
  if (totalScore < 6) return "MODERATE";
  return "LOW";
}

export const rtsPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    gcsScore,
    systolicBpCategory: z.enum(RTS_SYSTOLIC_BP_CATEGORY_VALUES),
    respiratoryRateCategory: z.enum(RTS_RESPIRATORY_RATE_CATEGORY_VALUES),
    totalScore: z.coerce.number().min(0).max(8),
    riskFlag: z.enum(RTS_RISK_FLAG_VALUES),
    providerNotified: foundationYesNo,
  })
  .superRefine((data, ctx) => {
    const calculated = calculateRtsTotal(data);
    if (Math.abs(data.totalScore - calculated) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "totalScore does not match calculated value",
        path: ["totalScore"],
      });
    }
    validateComputedEnum(data.riskFlag, deriveRtsRiskFlag(calculated), ctx, "riskFlag");
    if (deriveRtsRiskFlag(calculated) === "HIGH") requireProviderNotifiedYes(data, ctx);
  });

export type HeartScoreInput = {
  history: number;
  ecg: number;
  age: number;
  riskFactors: number;
  troponin: number;
};

export function calculateHeartTotal(input: HeartScoreInput): number {
  return input.history + input.ecg + input.age + input.riskFactors + input.troponin;
}

export function deriveHeartRiskLevel(totalScore: number): (typeof HEART_RISK_LEVEL_VALUES)[number] {
  if (totalScore >= 7) return "HIGH";
  if (totalScore >= 4) return "MODERATE";
  return "LOW";
}

export const heartScorePayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    history: heartComponentScore,
    ecg: heartComponentScore,
    age: heartComponentScore,
    riskFactors: heartComponentScore,
    troponin: heartComponentScore,
    totalScore: z.coerce.number().int().min(0).max(10),
    riskLevel: z.enum(HEART_RISK_LEVEL_VALUES),
    providerNotified: foundationYesNo,
  })
  .superRefine((data, ctx) => {
    const calculated = calculateHeartTotal(data);
    validateComputedTotal(data.totalScore, calculated, ctx);
    validateComputedEnum(data.riskLevel, deriveHeartRiskLevel(calculated), ctx, "riskLevel");
    if (deriveHeartRiskLevel(calculated) === "HIGH") requireProviderNotifiedYes(data, ctx);
  });

export type WellsPeScoreInput = {
  clinicalSignsDvt: (typeof FOUNDATION_YES_NO_VALUES)[number];
  peMostLikely: (typeof FOUNDATION_YES_NO_VALUES)[number];
  heartRateOver100: (typeof FOUNDATION_YES_NO_VALUES)[number];
  immobilizationOrSurgery: (typeof FOUNDATION_YES_NO_VALUES)[number];
  previousDvtPe: (typeof FOUNDATION_YES_NO_VALUES)[number];
  hemoptysis: (typeof FOUNDATION_YES_NO_VALUES)[number];
  malignancy: (typeof FOUNDATION_YES_NO_VALUES)[number];
};

export function calculateWellsPeTotal(input: WellsPeScoreInput): number {
  let total = 0;
  if (input.clinicalSignsDvt === "YES") total += 3;
  if (input.peMostLikely === "YES") total += 3;
  if (input.heartRateOver100 === "YES") total += 1.5;
  if (input.immobilizationOrSurgery === "YES") total += 1.5;
  if (input.previousDvtPe === "YES") total += 1.5;
  if (input.hemoptysis === "YES") total += 1;
  if (input.malignancy === "YES") total += 1;
  return total;
}

export function deriveWellsPeRiskLevel(
  totalScore: number
): (typeof WELLS_PE_RISK_LEVEL_VALUES)[number] {
  return totalScore > 4 ? "PE_LIKELY" : "PE_UNLIKELY";
}

export const wellsPePayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    clinicalSignsDvt: foundationYesNo,
    peMostLikely: foundationYesNo,
    heartRateOver100: foundationYesNo,
    immobilizationOrSurgery: foundationYesNo,
    previousDvtPe: foundationYesNo,
    hemoptysis: foundationYesNo,
    malignancy: foundationYesNo,
    totalScore: z.coerce.number().min(0).max(12.5),
    riskLevel: z.enum(WELLS_PE_RISK_LEVEL_VALUES),
    providerNotified: foundationYesNo,
  })
  .superRefine((data, ctx) => {
    const calculated = calculateWellsPeTotal(data);
    if (Math.abs(data.totalScore - calculated) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "totalScore does not match calculated value",
        path: ["totalScore"],
      });
    }
    validateComputedEnum(data.riskLevel, deriveWellsPeRiskLevel(calculated), ctx, "riskLevel");
    if (deriveWellsPeRiskLevel(calculated) === "PE_LIKELY") requireProviderNotifiedYes(data, ctx);
  });

export type PercScoreInput = {
  ageUnder50: (typeof FOUNDATION_YES_NO_VALUES)[number];
  heartRateUnder100: (typeof FOUNDATION_YES_NO_VALUES)[number];
  oxygenSaturationAtLeast95: (typeof FOUNDATION_YES_NO_VALUES)[number];
  noHemoptysis: (typeof FOUNDATION_YES_NO_VALUES)[number];
  noEstrogenUse: (typeof FOUNDATION_YES_NO_VALUES)[number];
  noPriorDvtPe: (typeof FOUNDATION_YES_NO_VALUES)[number];
  noUnilateralLegSwelling: (typeof FOUNDATION_YES_NO_VALUES)[number];
  noRecentSurgeryTrauma: (typeof FOUNDATION_YES_NO_VALUES)[number];
};

export function calculatePercNegative(input: PercScoreInput): (typeof FOUNDATION_YES_NO_VALUES)[number] {
  const criteria = [
    input.ageUnder50,
    input.heartRateUnder100,
    input.oxygenSaturationAtLeast95,
    input.noHemoptysis,
    input.noEstrogenUse,
    input.noPriorDvtPe,
    input.noUnilateralLegSwelling,
    input.noRecentSurgeryTrauma,
  ];
  return criteria.every((c) => c === "YES") ? "YES" : "NO";
}

export const percPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    ageUnder50: foundationYesNo,
    heartRateUnder100: foundationYesNo,
    oxygenSaturationAtLeast95: foundationYesNo,
    noHemoptysis: foundationYesNo,
    noEstrogenUse: foundationYesNo,
    noPriorDvtPe: foundationYesNo,
    noUnilateralLegSwelling: foundationYesNo,
    noRecentSurgeryTrauma: foundationYesNo,
    percNegative: foundationYesNo,
    providerNotified: foundationYesNo,
  })
  .superRefine((data, ctx) => {
    validateComputedEnum(data.percNegative, calculatePercNegative(data), ctx, "percNegative");
  });

export type GenevaScoreInput = {
  ageOver65: (typeof FOUNDATION_YES_NO_VALUES)[number];
  previousDvtPe: (typeof FOUNDATION_YES_NO_VALUES)[number];
  surgeryOrFractureRecent: (typeof FOUNDATION_YES_NO_VALUES)[number];
  activeMalignancy: (typeof FOUNDATION_YES_NO_VALUES)[number];
  unilateralLowerLimbPain: (typeof FOUNDATION_YES_NO_VALUES)[number];
  hemoptysis: (typeof FOUNDATION_YES_NO_VALUES)[number];
  heartRateCategory: (typeof GENEVA_HEART_RATE_CATEGORY_VALUES)[number];
  painOnPalpationAndEdema: (typeof FOUNDATION_YES_NO_VALUES)[number];
};

export function calculateGenevaTotal(input: GenevaScoreInput): number {
  let total = 0;
  if (input.ageOver65 === "YES") total += 1;
  if (input.previousDvtPe === "YES") total += 3;
  if (input.surgeryOrFractureRecent === "YES") total += 2;
  if (input.activeMalignancy === "YES") total += 2;
  if (input.unilateralLowerLimbPain === "YES") total += 3;
  if (input.hemoptysis === "YES") total += 2;
  if (input.heartRateCategory === "75_94") total += 3;
  if (input.heartRateCategory === "95_OR_MORE") total += 5;
  if (input.painOnPalpationAndEdema === "YES") total += 4;
  return total;
}

export function deriveGenevaRiskLevel(
  totalScore: number
): (typeof GENEVA_RISK_LEVEL_VALUES)[number] {
  if (totalScore >= 11) return "HIGH";
  if (totalScore >= 4) return "INTERMEDIATE";
  return "LOW";
}

export const genevaPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    ageOver65: foundationYesNo,
    previousDvtPe: foundationYesNo,
    surgeryOrFractureRecent: foundationYesNo,
    activeMalignancy: foundationYesNo,
    unilateralLowerLimbPain: foundationYesNo,
    hemoptysis: foundationYesNo,
    heartRateCategory: z.enum(GENEVA_HEART_RATE_CATEGORY_VALUES),
    painOnPalpationAndEdema: foundationYesNo,
    totalScore: z.coerce.number().int().min(0).max(22),
    riskLevel: z.enum(GENEVA_RISK_LEVEL_VALUES),
    providerNotified: foundationYesNo,
  })
  .superRefine((data, ctx) => {
    const calculated = calculateGenevaTotal(data);
    validateComputedTotal(data.totalScore, calculated, ctx);
    validateComputedEnum(data.riskLevel, deriveGenevaRiskLevel(calculated), ctx, "riskLevel");
    if (deriveGenevaRiskLevel(calculated) === "HIGH") requireProviderNotifiedYes(data, ctx);
  });

const ABUSE_CONCERN_FIELDS = [
  "physicalAbuseConcern",
  "emotionalAbuseConcern",
  "sexualAbuseConcern",
  "neglectConcern",
] as const;

export const abuseScreenPayloadSchema = z
  .object({
    screenTime: isoDateTimeString,
    screenPerformed: foundationYesNo,
    patientFeelsUnsafe: foundationYesNo,
    physicalAbuseConcern: foundationYesNo,
    emotionalAbuseConcern: foundationYesNo,
    sexualAbuseConcern: foundationYesNo,
    neglectConcern: foundationYesNo,
    resourcesOffered: foundationYesNo,
    mandatoryReportConsidered: foundationYesNo,
    providerNotified: foundationYesNo,
  })
  .superRefine((data, ctx) => {
    const concernPresent =
      data.patientFeelsUnsafe === "YES" ||
      ABUSE_CONCERN_FIELDS.some((field) => data[field] === "YES");
    if (concernPresent) {
      requireProviderNotifiedYes(data, ctx);
      if (data.resourcesOffered !== "YES") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "resourcesOffered required when abuse concern present",
          path: ["resourcesOffered"],
        });
      }
    }
  });

const TRAFFICKING_CONCERN_FIELDS = [
  "unableToSpeakFreely",
  "identificationControlledByOther",
  "fearfulOrCoerced",
  "workLivingControlConcern",
  "physicalSafetyConcern",
] as const;

export const humanTraffickingScreenPayloadSchema = z
  .object({
    screenTime: isoDateTimeString,
    screenPerformed: foundationYesNo,
    unableToSpeakFreely: foundationYesNo,
    identificationControlledByOther: foundationYesNo,
    fearfulOrCoerced: foundationYesNo,
    workLivingControlConcern: foundationYesNo,
    physicalSafetyConcern: foundationYesNo,
    resourcesOffered: foundationYesNo,
    mandatoryReportConsidered: foundationYesNo,
    providerNotified: foundationYesNo,
  })
  .superRefine((data, ctx) => {
    const concernPresent = TRAFFICKING_CONCERN_FIELDS.some((field) => data[field] === "YES");
    if (concernPresent) {
      requireProviderNotifiedYes(data, ctx);
      if (data.resourcesOffered !== "YES") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "resourcesOffered required when trafficking concern present",
          path: ["resourcesOffered"],
        });
      }
    }
  });

const SDOH_NEED_FIELDS = [
  "foodInsecurity",
  "housingInstability",
  "transportationNeed",
  "utilityNeed",
  "medicationAffordabilityConcern",
] as const;

export const sdohScreenPayloadSchema = z
  .object({
    screenTime: isoDateTimeString,
    foodInsecurity: foundationYesNo,
    housingInstability: foundationYesNo,
    transportationNeed: foundationYesNo,
    utilityNeed: foundationYesNo,
    medicationAffordabilityConcern: foundationYesNo,
    interpersonalSafetyConcern: foundationYesNo,
    resourcesOffered: foundationYesNo,
    caseManagementReferral: foundationYesNo,
    providerNotified: foundationYesNo,
  })
  .superRefine((data, ctx) => {
    const needPresent =
      SDOH_NEED_FIELDS.some((field) => data[field] === "YES") ||
      data.interpersonalSafetyConcern === "YES";
    if (SDOH_NEED_FIELDS.some((field) => data[field] === "YES") && data.resourcesOffered !== "YES") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "resourcesOffered required when SDOH need present",
        path: ["resourcesOffered"],
      });
    }
    if (data.interpersonalSafetyConcern === "YES") {
      requireProviderNotifiedYes(data, ctx);
    }
    if (needPresent && data.interpersonalSafetyConcern !== "YES" && data.resourcesOffered !== "YES") {
      // covered by SDOH need rule above
    }
  });

const PAYLOAD_SCHEMA_BY_CARD_ID: Record<Edoc23bFoundationCatalogCompletionCardId, z.ZodTypeAny> = {
  [FLOW_CPR_RECORD_CARD_ID]: cprRecordPayloadSchema,
  [FLOW_THROMBOLYTIC_MI_CARD_ID]: miThrombolyticPayloadSchema,
  [FLOW_OBSERVATION_MONITORING_CARD_ID]: observationMonitoringPayloadSchema,
  [SCORE_CIWA_AR_CARD_ID]: ciwaArPayloadSchema,
  [SCORE_COWS_CARD_ID]: cowsPayloadSchema,
  [SCORE_CSSRS_CARD_ID]: cssrsPayloadSchema,
  [SCORE_PHQ9_CARD_ID]: phq9PayloadSchema,
  [SCORE_GAD7_CARD_ID]: gad7PayloadSchema,
  [SCORE_RTS_CARD_ID]: rtsPayloadSchema,
  [SCORE_HEART_CARD_ID]: heartScorePayloadSchema,
  [SCORE_WELLS_PE_CARD_ID]: wellsPePayloadSchema,
  [SCORE_PERC_CARD_ID]: percPayloadSchema,
  [SCORE_GENEVA_CARD_ID]: genevaPayloadSchema,
  [SCORE_ABUSE_CARD_ID]: abuseScreenPayloadSchema,
  [SCORE_HUMAN_TRAFFICKING_CARD_ID]: humanTraffickingScreenPayloadSchema,
  [SCORE_SDOH_CARD_ID]: sdohScreenPayloadSchema,
};

export function isEdoc23bFoundationCatalogCompletionCardId(
  cardId: string
): cardId is Edoc23bFoundationCatalogCompletionCardId {
  return (EDOC23B_FOUNDATION_CATALOG_COMPLETION_CARD_IDS as readonly string[]).includes(cardId);
}

export function isEdoc23bFlowsheetCompletionFormCard(cardId: string): boolean {
  return (EDOC23B_FLOWSHEET_COMPLETION_CARD_IDS as readonly string[]).includes(cardId);
}

export function isEdoc23bScoreScreenCompletionFormCard(cardId: string): boolean {
  return (EDOC23B_SCORE_SCREEN_COMPLETION_CARD_IDS as readonly string[]).includes(cardId);
}

export type CssrsRiskInput = {
  wishToBeDead: (typeof FOUNDATION_YES_NO_VALUES)[number];
  suicidalThoughts: (typeof FOUNDATION_YES_NO_VALUES)[number];
  methodThoughts: (typeof FOUNDATION_YES_NO_VALUES)[number];
  intentWithoutPlan: (typeof FOUNDATION_YES_NO_VALUES)[number];
  intentWithPlan: (typeof FOUNDATION_YES_NO_VALUES)[number];
  suicidalBehavior: (typeof FOUNDATION_YES_NO_VALUES)[number];
};

export function deriveCssrsRiskLevel(
  input: CssrsRiskInput
): (typeof CSSRS_RISK_LEVEL_VALUES)[number] {
  if (input.intentWithPlan === "YES" || input.suicidalBehavior === "YES") return "HIGH";
  if (input.intentWithoutPlan === "YES") return "MODERATE";
  if (input.methodThoughts === "YES" || input.suicidalThoughts === "YES") return "MODERATE";
  return "LOW";
}

export function validateFoundationCatalogCompletionPayloadForCard(
  cardId: string,
  payload: Record<string, unknown>
): { ok: true; data: Record<string, unknown> } | { ok: false; message: string } {
  if (!isEdoc23bFoundationCatalogCompletionCardId(cardId)) {
    return { ok: false, message: "Card is not available for structured save" };
  }
  const parsed = PAYLOAD_SCHEMA_BY_CARD_ID[cardId].safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: "Invalid clinical documentation payload" };
  }
  return { ok: true, data: parsed.data as Record<string, unknown> };
}

function hasAnyYes(
  data: Record<string, unknown>,
  fields: readonly string[]
): boolean {
  return fields.some((field) => data[field] === "YES");
}

const CIWA_SEVERITY_MAP = {
  en: Object.fromEntries(
    CIWA_SEVERITY_VALUES.map((v) => [
      v,
      v === "MINIMAL"
        ? "Minimal"
        : v === "MILD"
          ? "Mild"
          : v === "MODERATE"
            ? "Moderate"
            : "Severe",
    ])
  ),
  fr: Object.fromEntries(
    CIWA_SEVERITY_VALUES.map((v) => [
      v,
      v === "MINIMAL"
        ? "Minimal"
        : v === "MILD"
          ? "Léger"
          : v === "MODERATE"
            ? "Modéré"
            : "Sévère",
    ])
  ),
};

const COWS_SEVERITY_MAP = {
  en: {
    MILD: "Mild",
    MODERATE: "Moderate",
    MODERATELY_SEVERE: "Moderately severe",
    SEVERE: "Severe",
  },
  fr: {
    MILD: "Léger",
    MODERATE: "Modéré",
    MODERATELY_SEVERE: "Modérément sévère",
    SEVERE: "Sévère",
  },
};

const PHQ9_SEVERITY_MAP = {
  en: {
    NONE_MINIMAL: "None/minimal",
    MILD: "Mild",
    MODERATE: "Moderate",
    MODERATELY_SEVERE: "Moderately severe",
    SEVERE: "Severe",
  },
  fr: {
    NONE_MINIMAL: "Aucun/minimal",
    MILD: "Léger",
    MODERATE: "Modéré",
    MODERATELY_SEVERE: "Modérément sévère",
    SEVERE: "Sévère",
  },
};

const GAD7_SEVERITY_MAP = {
  en: { MINIMAL: "Minimal", MILD: "Mild", MODERATE: "Moderate", SEVERE: "Severe" },
  fr: { MINIMAL: "Minimal", MILD: "Léger", MODERATE: "Modéré", SEVERE: "Sévère" },
};

const RTS_RISK_MAP = {
  en: { LOW: "Low", MODERATE: "Moderate", HIGH: "High" },
  fr: { LOW: "Faible", MODERATE: "Modéré", HIGH: "Élevé" },
};

const HEART_RISK_MAP = {
  en: { LOW: "Low", MODERATE: "Moderate", HIGH: "High" },
  fr: { LOW: "Faible", MODERATE: "Modéré", HIGH: "Élevé" },
};

const WELLS_RISK_MAP = {
  en: { PE_UNLIKELY: "PE unlikely", PE_LIKELY: "PE likely" },
  fr: { PE_UNLIKELY: "EP peu probable", PE_LIKELY: "EP probable" },
};

const GENEVA_RISK_MAP = {
  en: { LOW: "Low", INTERMEDIATE: "Intermediate", HIGH: "High" },
  fr: { LOW: "Faible", INTERMEDIATE: "Intermédiaire", HIGH: "Élevé" },
};

const CSSRS_RISK_MAP = {
  en: { LOW: "Low", MODERATE: "Moderate", HIGH: "High" },
  fr: { LOW: "Faible", MODERATE: "Modéré", HIGH: "Élevé" },
};

export function summarizeFoundationCatalogCompletionPayload(
  cardId: string,
  payload: Record<string, unknown>,
  locale: ClinicalDocumentationSummaryLocale
): Array<{ key: string; value: string }> {
  switch (cardId) {
    case FLOW_CPR_RECORD_CARD_ID: {
      const p = cprRecordPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Event type", "Type d'événement"),
          value: pickLocalizedEnumLabel(
            Object.fromEntries(CPR_EVENT_TYPE_OPTIONS.map((o) => [o.value, o.labelEn])),
            Object.fromEntries(CPR_EVENT_TYPE_OPTIONS.map((o) => [o.value, o.labelFr])),
            d.eventType,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "ROSC achieved", "ROSC obtenu"),
          value: pickLocalizedEnumLabel(
            { YES: "Yes", NO: "No", UNKNOWN: "Unknown" },
            { YES: "Oui", NO: "Non", UNKNOWN: "Inconnu" },
            d.roscAchieved,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Patient disposition", "Destination patient"),
          value: pickLocalizedEnumLabel(
            Object.fromEntries(CPR_PATIENT_DISPOSITION_OPTIONS.map((o) => [o.value, o.labelEn])),
            Object.fromEntries(CPR_PATIENT_DISPOSITION_OPTIONS.map((o) => [o.value, o.labelFr])),
            d.patientDisposition,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: foundationDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case FLOW_THROMBOLYTIC_MI_CARD_ID: {
      const p = miThrombolyticPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Medication administered", "Médicament administré"),
          value: foundationDocYesNoLabel(d.medicationAdministered, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Agent", "Agent"),
          value: pickLocalizedEnumLabel(
            Object.fromEntries(MI_THROMBOLYTIC_AGENT_OPTIONS.map((o) => [o.value, o.labelEn])),
            Object.fromEntries(MI_THROMBOLYTIC_AGENT_OPTIONS.map((o) => [o.value, o.labelFr])),
            d.agent,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: foundationDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case FLOW_OBSERVATION_MONITORING_CARD_ID: {
      const p = observationMonitoringPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Patient status", "État du patient"),
          value: pickLocalizedEnumLabel(
            Object.fromEntries(OBSERVATION_PATIENT_STATUS_OPTIONS.map((o) => [o.value, o.labelEn])),
            Object.fromEntries(OBSERVATION_PATIENT_STATUS_OPTIONS.map((o) => [o.value, o.labelFr])),
            d.patientStatus,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: foundationDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case SCORE_CIWA_AR_CARD_ID: {
      const p = ciwaArPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: "CIWA-Ar",
          value: clinicalDocScoreValue(locale, d.totalScore),
        },
        {
          key: clinicalDocSummaryKey(locale, "Severity", "Sévérité"),
          value: pickLocalizedEnumLabel(CIWA_SEVERITY_MAP.en, CIWA_SEVERITY_MAP.fr, d.severity, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: foundationDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case SCORE_COWS_CARD_ID: {
      const p = cowsPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: "COWS",
          value: clinicalDocScoreValue(locale, d.totalScore),
        },
        {
          key: clinicalDocSummaryKey(locale, "Severity", "Sévérité"),
          value: pickLocalizedEnumLabel(COWS_SEVERITY_MAP.en, COWS_SEVERITY_MAP.fr, d.severity, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: foundationDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case SCORE_CSSRS_CARD_ID: {
      const p = cssrsPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Risk level", "Niveau de risque"),
          value: pickLocalizedEnumLabel(CSSRS_RISK_MAP.en, CSSRS_RISK_MAP.fr, d.riskLevel, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Safety precautions initiated", "Mesures de sécurité initiées"),
          value: foundationDocYesNoLabel(d.safetyPrecautionsInitiated, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: foundationDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case SCORE_PHQ9_CARD_ID: {
      const p = phq9PayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: "PHQ-9",
          value: clinicalDocScoreValue(locale, d.totalScore),
        },
        {
          key: clinicalDocSummaryKey(locale, "Severity", "Sévérité"),
          value: pickLocalizedEnumLabel(PHQ9_SEVERITY_MAP.en, PHQ9_SEVERITY_MAP.fr, d.severity, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Suicidal ideation item positive", "Item idéation suicidaire positif"),
          value: foundationDocYesNoLabel(d.suicidalIdeationItemPositive, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: foundationDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case SCORE_GAD7_CARD_ID: {
      const p = gad7PayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: "GAD-7",
          value: clinicalDocScoreValue(locale, d.totalScore),
        },
        {
          key: clinicalDocSummaryKey(locale, "Severity", "Sévérité"),
          value: pickLocalizedEnumLabel(GAD7_SEVERITY_MAP.en, GAD7_SEVERITY_MAP.fr, d.severity, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: foundationDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case SCORE_RTS_CARD_ID: {
      const p = rtsPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: "RTS",
          value: String(d.totalScore),
        },
        {
          key: clinicalDocSummaryKey(locale, "Risk", "Risque"),
          value: pickLocalizedEnumLabel(RTS_RISK_MAP.en, RTS_RISK_MAP.fr, d.riskFlag, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: foundationDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case SCORE_HEART_CARD_ID: {
      const p = heartScorePayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "HEART score", "Score HEART"),
          value: String(d.totalScore),
        },
        {
          key: clinicalDocSummaryKey(locale, "Risk level", "Niveau de risque"),
          value: pickLocalizedEnumLabel(HEART_RISK_MAP.en, HEART_RISK_MAP.fr, d.riskLevel, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: foundationDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case SCORE_WELLS_PE_CARD_ID: {
      const p = wellsPePayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Wells PE score", "Score Wells EP"),
          value: String(d.totalScore),
        },
        {
          key: clinicalDocSummaryKey(locale, "Risk level", "Niveau de risque"),
          value: pickLocalizedEnumLabel(WELLS_RISK_MAP.en, WELLS_RISK_MAP.fr, d.riskLevel, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: foundationDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case SCORE_PERC_CARD_ID: {
      const p = percPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "PERC negative", "PERC négatif"),
          value: foundationDocYesNoLabel(d.percNegative, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: foundationDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case SCORE_GENEVA_CARD_ID: {
      const p = genevaPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Geneva score", "Score de Genève"),
          value: String(d.totalScore),
        },
        {
          key: clinicalDocSummaryKey(locale, "Risk level", "Niveau de risque"),
          value: pickLocalizedEnumLabel(GENEVA_RISK_MAP.en, GENEVA_RISK_MAP.fr, d.riskLevel, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: foundationDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case SCORE_ABUSE_CARD_ID: {
      const p = abuseScreenPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      const concernPresent =
        d.patientFeelsUnsafe === "YES" || hasAnyYes(d, ABUSE_CONCERN_FIELDS);
      return [
        {
          key: clinicalDocSummaryKey(locale, "Screen performed", "Dépistage effectué"),
          value: foundationDocYesNoLabel(d.screenPerformed, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Safety concern present", "Préoccupation sécurité"),
          value: foundationDocYesNoLabel(concernPresent ? "YES" : "NO", locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Resources offered", "Ressources offertes"),
          value: foundationDocYesNoLabel(d.resourcesOffered, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: foundationDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case SCORE_HUMAN_TRAFFICKING_CARD_ID: {
      const p = humanTraffickingScreenPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      const concernPresent = hasAnyYes(d, TRAFFICKING_CONCERN_FIELDS);
      return [
        {
          key: clinicalDocSummaryKey(locale, "Screen performed", "Dépistage effectué"),
          value: foundationDocYesNoLabel(d.screenPerformed, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Safety concern present", "Préoccupation sécurité"),
          value: foundationDocYesNoLabel(concernPresent ? "YES" : "NO", locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Resources offered", "Ressources offertes"),
          value: foundationDocYesNoLabel(d.resourcesOffered, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: foundationDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case SCORE_SDOH_CARD_ID: {
      const p = sdohScreenPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      const needPresent =
        hasAnyYes(d, SDOH_NEED_FIELDS) || d.interpersonalSafetyConcern === "YES";
      return [
        {
          key: clinicalDocSummaryKey(locale, "Need identified", "Besoin identifié"),
          value: foundationDocYesNoLabel(needPresent ? "YES" : "NO", locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Resources offered", "Ressources offertes"),
          value: foundationDocYesNoLabel(d.resourcesOffered, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: foundationDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    default:
      return [];
  }
}

export { THROMBOLYTIC_HOLD_REASON_OPTIONS };
