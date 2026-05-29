import { z } from "zod";
import {
  clinicalDocYesNo,
  pickLocalizedEnumLabel,
  type ClinicalDocumentationSummaryLocale,
} from "./clinicalDocumentationSummaryLocale.js";
import type { ClinicalDocumentationFieldOption } from "./clinicalDocumentationFieldOptions.js";

export const SEDATION_PRE_ASSESSMENT_CARD_ID = "sedation_pre_assessment" as const;
export const SEDATION_TIMEOUT_CARD_ID = "sedation_timeout" as const;
export const SEDATION_INITIATION_CARD_ID = "sedation_initiation" as const;
export const SEDATION_MONITORING_CARD_ID = "sedation_monitoring" as const;
export const SEDATION_REASSESSMENT_CARD_ID = "sedation_reassessment" as const;
export const SEDATION_RECOVERY_SCORE_CARD_ID = "sedation_recovery_score" as const;
export const SEDATION_RECOVERY_MONITORING_CARD_ID = "sedation_recovery_monitoring" as const;
export const SEDATION_DISCHARGE_READINESS_CARD_ID = "sedation_discharge_readiness" as const;

export const EDOC10_PROCEDURAL_SEDATION_DOCUMENTATION_CARD_IDS = [
  SEDATION_PRE_ASSESSMENT_CARD_ID,
  SEDATION_TIMEOUT_CARD_ID,
  SEDATION_INITIATION_CARD_ID,
  SEDATION_MONITORING_CARD_ID,
  SEDATION_REASSESSMENT_CARD_ID,
  SEDATION_RECOVERY_SCORE_CARD_ID,
  SEDATION_RECOVERY_MONITORING_CARD_ID,
  SEDATION_DISCHARGE_READINESS_CARD_ID,
] as const;

export type Edoc10ProceduralSedationDocumentationCardId =
  (typeof EDOC10_PROCEDURAL_SEDATION_DOCUMENTATION_CARD_IDS)[number];

/** EDOC.10 — facility may enable immediate witness via additionalCardIds (default off). */
export const EDOC10_FACILITY_IMMEDIATE_WITNESS_CANDIDATE_CARD_IDS = [
  SEDATION_INITIATION_CARD_ID,
  SEDATION_RECOVERY_SCORE_CARD_ID,
  SEDATION_DISCHARGE_READINESS_CARD_ID,
] as const;

export const DEFAULT_SEDATION_RECOVERY_SCORE_THRESHOLD = 8;

const isoDateTimeString = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date/time" });

const optionalNotes = z.string().trim().max(2000).optional();
const shortText = z.string().trim().min(1).max(200);
const providerName = z.string().trim().min(1).max(120);
const hr = z.coerce.number().int().min(0).max(300);
const rr = z.coerce.number().int().min(0).max(80);
const bp = z.string().trim().min(1).max(20);
const spo2 = z.coerce.number().int().min(0).max(100);
const etco2 = z.coerce.number().min(0).max(99).optional();
const tempOptional = z.string().trim().max(20).optional();
const painScoreOptional = z.coerce.number().int().min(0).max(10).optional();

export const SEDATION_NPO_STATUS_VALUES = [
  "NPO_CONFIRMED",
  "NOT_NPO",
  "EMERGENT_EXCEPTION",
  "UNKNOWN",
] as const;

export const SEDATION_ASA_CLASS_VALUES = [
  "ASA_I",
  "ASA_II",
  "ASA_III",
  "ASA_IV",
  "ASA_V",
] as const;

export const SEDATION_MALLAMPATI_VALUES = [
  "CLASS_I",
  "CLASS_II",
  "CLASS_III",
  "CLASS_IV",
  "UNABLE_TO_ASSESS",
] as const;

export const SEDATION_AIRWAY_ASSESSMENT_VALUES = [
  "NORMAL",
  "DIFFICULT_AIRWAY_RISK",
  "LIMITED_NECK_MOBILITY",
  "FACIAL_TRAUMA",
  "OTHER",
] as const;

export const SEDATION_LEVEL_VALUES = [
  "MINIMAL",
  "MODERATE",
  "DEEP",
  "DISSOCIATIVE",
] as const;

export const SEDATION_OXYGEN_DELIVERY_VALUES = [
  "ROOM_AIR",
  "NASAL_CANNULA",
  "NON_REBREATHER",
  "BAG_VALVE_MASK",
  "VENTILATOR",
  "OTHER",
] as const;

export const SEDATION_MONITORING_LEVEL_VALUES = [
  "AWAKE_ALERT",
  "DROWSY_RESPONDS_TO_VOICE",
  "RESPONDS_TO_TOUCH",
  "RESPONDS_TO_PAIN",
  "UNRESPONSIVE",
] as const;

export const SEDATION_AIRWAY_STATUS_VALUES = [
  "PATENT",
  "SNORING",
  "OBSTRUCTED",
  "ASSISTED_AIRWAY",
  "ADVANCED_AIRWAY",
] as const;

export const SEDATION_REASSESSMENT_CONDITION_VALUES = [
  "STABLE",
  "IMPROVED",
  "WORSENED",
  "COMPLICATION",
] as const;

export const SEDATION_RECOVERY_ACTIVITY_VALUES = [
  "MOVES_4_EXTREMITIES",
  "MOVES_2_EXTREMITIES",
  "UNABLE_TO_MOVE",
] as const;

export const SEDATION_RECOVERY_RESPIRATION_VALUES = [
  "DEEP_BREATH_COUGH",
  "DYSPNEA_LIMITED",
  "APNEIC",
] as const;

export const SEDATION_RECOVERY_CIRCULATION_VALUES = [
  "BP_WITHIN_20_PERCENT",
  "BP_20_TO_49_PERCENT",
  "BP_50_PERCENT_OR_MORE",
] as const;

export const SEDATION_RECOVERY_CONSCIOUSNESS_VALUES = [
  "FULLY_AWAKE",
  "AROUSABLE",
  "NOT_RESPONDING",
] as const;

export const SEDATION_RECOVERY_OXYGEN_SATURATION_VALUES = [
  "MAINTAINS_GREATER_92_ROOM_AIR",
  "NEEDS_OXYGEN_GREATER_90",
  "LESS_90_WITH_OXYGEN",
] as const;

export const SEDATION_RECOVERY_LOC_VALUES = [
  "AWAKE",
  "DROWSY",
  "AROUSABLE",
  "UNRESPONSIVE",
] as const;

const RECOVERY_ACTIVITY_POINTS: Record<(typeof SEDATION_RECOVERY_ACTIVITY_VALUES)[number], number> = {
  MOVES_4_EXTREMITIES: 2,
  MOVES_2_EXTREMITIES: 1,
  UNABLE_TO_MOVE: 0,
};

const RECOVERY_RESPIRATION_POINTS: Record<
  (typeof SEDATION_RECOVERY_RESPIRATION_VALUES)[number],
  number
> = {
  DEEP_BREATH_COUGH: 2,
  DYSPNEA_LIMITED: 1,
  APNEIC: 0,
};

const RECOVERY_CIRCULATION_POINTS: Record<
  (typeof SEDATION_RECOVERY_CIRCULATION_VALUES)[number],
  number
> = {
  BP_WITHIN_20_PERCENT: 2,
  BP_20_TO_49_PERCENT: 1,
  BP_50_PERCENT_OR_MORE: 0,
};

const RECOVERY_CONSCIOUSNESS_POINTS: Record<
  (typeof SEDATION_RECOVERY_CONSCIOUSNESS_VALUES)[number],
  number
> = {
  FULLY_AWAKE: 2,
  AROUSABLE: 1,
  NOT_RESPONDING: 0,
};

const RECOVERY_OXYGEN_POINTS: Record<
  (typeof SEDATION_RECOVERY_OXYGEN_SATURATION_VALUES)[number],
  number
> = {
  MAINTAINS_GREATER_92_ROOM_AIR: 2,
  NEEDS_OXYGEN_GREATER_90: 1,
  LESS_90_WITH_OXYGEN: 0,
};

export type SedationRecoveryScoreInput = {
  activity: (typeof SEDATION_RECOVERY_ACTIVITY_VALUES)[number];
  respiration: (typeof SEDATION_RECOVERY_RESPIRATION_VALUES)[number];
  circulation: (typeof SEDATION_RECOVERY_CIRCULATION_VALUES)[number];
  consciousness: (typeof SEDATION_RECOVERY_CONSCIOUSNESS_VALUES)[number];
  oxygenSaturation: (typeof SEDATION_RECOVERY_OXYGEN_SATURATION_VALUES)[number];
};

export function calculateSedationRecoveryScore(input: SedationRecoveryScoreInput): number {
  return (
    RECOVERY_ACTIVITY_POINTS[input.activity] +
    RECOVERY_RESPIRATION_POINTS[input.respiration] +
    RECOVERY_CIRCULATION_POINTS[input.circulation] +
    RECOVERY_CONSCIOUSNESS_POINTS[input.consciousness] +
    RECOVERY_OXYGEN_POINTS[input.oxygenSaturation]
  );
}

export function deriveSedationRecoveryBand(
  score: number,
  threshold = DEFAULT_SEDATION_RECOVERY_SCORE_THRESHOLD
): "MET" | "NOT_MET" {
  return score >= threshold ? "MET" : "NOT_MET";
}

export function isSedationRecoveryCriteriaMet(
  score: number,
  threshold = DEFAULT_SEDATION_RECOVERY_SCORE_THRESHOLD
): boolean {
  return deriveSedationRecoveryBand(score, threshold) === "MET";
}

function makeScoreOptions<T extends string>(
  values: readonly T[],
  points: Record<T, number>,
  labelFn: (v: T, locale: ClinicalDocumentationSummaryLocale) => string
): ClinicalDocumentationFieldOption<T>[] {
  return values.map((value) => ({
    value,
    labelEn: `${labelFn(value, "en")} (${points[value]})`,
    labelFr: `${labelFn(value, "fr")} (${points[value]})`,
  }));
}

export const SEDATION_RECOVERY_ACTIVITY_OPTIONS = makeScoreOptions(
  SEDATION_RECOVERY_ACTIVITY_VALUES,
  RECOVERY_ACTIVITY_POINTS,
  (v, locale) => {
    const en: Record<string, string> = {
      MOVES_4_EXTREMITIES: "Moves 4 extremities",
      MOVES_2_EXTREMITIES: "Moves 2 extremities",
      UNABLE_TO_MOVE: "Unable to move",
    };
    const fr: Record<string, string> = {
      MOVES_4_EXTREMITIES: "4 extrémités",
      MOVES_2_EXTREMITIES: "2 extrémités",
      UNABLE_TO_MOVE: "Incapable de bouger",
    };
    return locale === "fr" ? fr[v]! : en[v]!;
  }
);

export const SEDATION_RECOVERY_RESPIRATION_OPTIONS = makeScoreOptions(
  SEDATION_RECOVERY_RESPIRATION_VALUES,
  RECOVERY_RESPIRATION_POINTS,
  (v, locale) => {
    const en: Record<string, string> = {
      DEEP_BREATH_COUGH: "Deep breath / cough",
      DYSPNEA_LIMITED: "Dyspnea / limited",
      APNEIC: "Apneic",
    };
    const fr: Record<string, string> = {
      DEEP_BREATH_COUGH: "Respiration profonde / toux",
      DYSPNEA_LIMITED: "Dyspnée / limitée",
      APNEIC: "Apnée",
    };
    return locale === "fr" ? fr[v]! : en[v]!;
  }
);

export const SEDATION_RECOVERY_CIRCULATION_OPTIONS = makeScoreOptions(
  SEDATION_RECOVERY_CIRCULATION_VALUES,
  RECOVERY_CIRCULATION_POINTS,
  (v, locale) => {
    const en: Record<string, string> = {
      BP_WITHIN_20_PERCENT: "BP within 20% baseline",
      BP_20_TO_49_PERCENT: "BP 20–49% from baseline",
      BP_50_PERCENT_OR_MORE: "BP ≥50% from baseline",
    };
    const fr: Record<string, string> = {
      BP_WITHIN_20_PERCENT: "TA ±20 % baseline",
      BP_20_TO_49_PERCENT: "TA 20–49 % baseline",
      BP_50_PERCENT_OR_MORE: "TA ≥50 % baseline",
    };
    return locale === "fr" ? fr[v]! : en[v]!;
  }
);

export const SEDATION_RECOVERY_CONSCIOUSNESS_OPTIONS = makeScoreOptions(
  SEDATION_RECOVERY_CONSCIOUSNESS_VALUES,
  RECOVERY_CONSCIOUSNESS_POINTS,
  (v, locale) => {
    const en: Record<string, string> = {
      FULLY_AWAKE: "Fully awake",
      AROUSABLE: "Arousable",
      NOT_RESPONDING: "Not responding",
    };
    const fr: Record<string, string> = {
      FULLY_AWAKE: "Éveillé",
      AROUSABLE: "Réveillable",
      NOT_RESPONDING: "Ne répond pas",
    };
    return locale === "fr" ? fr[v]! : en[v]!;
  }
);

export const SEDATION_RECOVERY_OXYGEN_OPTIONS = makeScoreOptions(
  SEDATION_RECOVERY_OXYGEN_SATURATION_VALUES,
  RECOVERY_OXYGEN_POINTS,
  (v, locale) => {
    const en: Record<string, string> = {
      MAINTAINS_GREATER_92_ROOM_AIR: "SpO₂ >92% room air",
      NEEDS_OXYGEN_GREATER_90: "Needs O₂ for SpO₂ >90%",
      LESS_90_WITH_OXYGEN: "SpO₂ <90% with O₂",
    };
    const fr: Record<string, string> = {
      MAINTAINS_GREATER_92_ROOM_AIR: "SpO₂ >92 % air ambiant",
      NEEDS_OXYGEN_GREATER_90: "O₂ requis pour SpO₂ >90 %",
      LESS_90_WITH_OXYGEN: "SpO₂ <90 % avec O₂",
    };
    return locale === "fr" ? fr[v]! : en[v]!;
  }
);

export const SEDATION_NPO_STATUS_OPTIONS: ClinicalDocumentationFieldOption<
  (typeof SEDATION_NPO_STATUS_VALUES)[number]
>[] = [
  { value: "NPO_CONFIRMED", labelEn: "NPO confirmed", labelFr: "À jeun confirmé" },
  { value: "NOT_NPO", labelEn: "Not NPO", labelFr: "Non à jeun" },
  { value: "EMERGENT_EXCEPTION", labelEn: "Emergent exception", labelFr: "Exception urgente" },
  { value: "UNKNOWN", labelEn: "Unknown", labelFr: "Inconnu" },
];

export const SEDATION_ASA_CLASS_OPTIONS: ClinicalDocumentationFieldOption<
  (typeof SEDATION_ASA_CLASS_VALUES)[number]
>[] = [
  { value: "ASA_I", labelEn: "ASA I", labelFr: "ASA I" },
  { value: "ASA_II", labelEn: "ASA II", labelFr: "ASA II" },
  { value: "ASA_III", labelEn: "ASA III", labelFr: "ASA III" },
  { value: "ASA_IV", labelEn: "ASA IV", labelFr: "ASA IV" },
  { value: "ASA_V", labelEn: "ASA V", labelFr: "ASA V" },
];

export const SEDATION_MALLAMPATI_OPTIONS: ClinicalDocumentationFieldOption<
  (typeof SEDATION_MALLAMPATI_VALUES)[number]
>[] = [
  { value: "CLASS_I", labelEn: "Class I", labelFr: "Classe I" },
  { value: "CLASS_II", labelEn: "Class II", labelFr: "Classe II" },
  { value: "CLASS_III", labelEn: "Class III", labelFr: "Classe III" },
  { value: "CLASS_IV", labelEn: "Class IV", labelFr: "Classe IV" },
  { value: "UNABLE_TO_ASSESS", labelEn: "Unable to assess", labelFr: "Non évaluable" },
];

export const SEDATION_AIRWAY_ASSESSMENT_OPTIONS: ClinicalDocumentationFieldOption<
  (typeof SEDATION_AIRWAY_ASSESSMENT_VALUES)[number]
>[] = [
  { value: "NORMAL", labelEn: "Normal", labelFr: "Normal" },
  { value: "DIFFICULT_AIRWAY_RISK", labelEn: "Difficult airway risk", labelFr: "Risque voie aérienne difficile" },
  { value: "LIMITED_NECK_MOBILITY", labelEn: "Limited neck mobility", labelFr: "Mobilité cervicale limitée" },
  { value: "FACIAL_TRAUMA", labelEn: "Facial trauma", labelFr: "Traumatisme facial" },
  { value: "OTHER", labelEn: "Other", labelFr: "Autre" },
];

export const SEDATION_LEVEL_OPTIONS: ClinicalDocumentationFieldOption<
  (typeof SEDATION_LEVEL_VALUES)[number]
>[] = [
  { value: "MINIMAL", labelEn: "Minimal", labelFr: "Minimale" },
  { value: "MODERATE", labelEn: "Moderate", labelFr: "Modérée" },
  { value: "DEEP", labelEn: "Deep", labelFr: "Profonde" },
  { value: "DISSOCIATIVE", labelEn: "Dissociative", labelFr: "Dissociative" },
];

export const SEDATION_OXYGEN_DELIVERY_OPTIONS: ClinicalDocumentationFieldOption<
  (typeof SEDATION_OXYGEN_DELIVERY_VALUES)[number]
>[] = [
  { value: "ROOM_AIR", labelEn: "Room air", labelFr: "Air ambiant" },
  { value: "NASAL_CANNULA", labelEn: "Nasal cannula", labelFr: "Canule nasale" },
  { value: "NON_REBREATHER", labelEn: "Non-rebreather", labelFr: "Masque haute concentration" },
  { value: "BAG_VALVE_MASK", labelEn: "Bag-valve-mask", labelFr: "Ballon-masque" },
  { value: "VENTILATOR", labelEn: "Ventilator", labelFr: "Ventilateur" },
  { value: "OTHER", labelEn: "Other", labelFr: "Autre" },
];

export const SEDATION_MONITORING_LEVEL_OPTIONS: ClinicalDocumentationFieldOption<
  (typeof SEDATION_MONITORING_LEVEL_VALUES)[number]
>[] = [
  { value: "AWAKE_ALERT", labelEn: "Awake / alert", labelFr: "Éveillé / alerte" },
  { value: "DROWSY_RESPONDS_TO_VOICE", labelEn: "Drowsy, responds to voice", labelFr: "Somnolent, répond à la voix" },
  { value: "RESPONDS_TO_TOUCH", labelEn: "Responds to touch", labelFr: "Répond au toucher" },
  { value: "RESPONDS_TO_PAIN", labelEn: "Responds to pain", labelFr: "Répond à la douleur" },
  { value: "UNRESPONSIVE", labelEn: "Unresponsive", labelFr: "Non réactif" },
];

export const SEDATION_AIRWAY_STATUS_OPTIONS: ClinicalDocumentationFieldOption<
  (typeof SEDATION_AIRWAY_STATUS_VALUES)[number]
>[] = [
  { value: "PATENT", labelEn: "Patent", labelFr: "Perméable" },
  { value: "SNORING", labelEn: "Snoring", labelFr: "Ronflement" },
  { value: "OBSTRUCTED", labelEn: "Obstructed", labelFr: "Obstruée" },
  { value: "ASSISTED_AIRWAY", labelEn: "Assisted airway", labelFr: "Voie aérienne assistée" },
  { value: "ADVANCED_AIRWAY", labelEn: "Advanced airway", labelFr: "Voie aérienne avancée" },
];

export const SEDATION_REASSESSMENT_CONDITION_OPTIONS: ClinicalDocumentationFieldOption<
  (typeof SEDATION_REASSESSMENT_CONDITION_VALUES)[number]
>[] = [
  { value: "STABLE", labelEn: "Stable", labelFr: "Stable" },
  { value: "IMPROVED", labelEn: "Improved", labelFr: "Amélioré" },
  { value: "WORSENED", labelEn: "Worsened", labelFr: "Aggravé" },
  { value: "COMPLICATION", labelEn: "Complication", labelFr: "Complication" },
];

export const SEDATION_RECOVERY_LOC_OPTIONS: ClinicalDocumentationFieldOption<
  (typeof SEDATION_RECOVERY_LOC_VALUES)[number]
>[] = [
  { value: "AWAKE", labelEn: "Awake", labelFr: "Éveillé" },
  { value: "DROWSY", labelEn: "Drowsy", labelFr: "Somnolent" },
  { value: "AROUSABLE", labelEn: "Arousable", labelFr: "Réveillable" },
  { value: "UNRESPONSIVE", labelEn: "Unresponsive", labelFr: "Non réactif" },
];

const TIMEOUT_CRITICAL_CHECK_KEYS = [
  "correctPatientConfirmed",
  "correctProcedureConfirmed",
  "correctSiteConfirmed",
  "providerPresent",
  "rnPresent",
  "monitoringEquipmentAvailable",
  "suctionAvailable",
  "oxygenAvailable",
  "airwayEquipmentAvailable",
  "reversalAgentsAvailable",
  "emergencyEquipmentAvailable",
  "consentVerified",
] as const;

export const sedationPreAssessmentPayloadSchema = z
  .object({
    assessedAt: isoDateTimeString,
    procedurePlanned: shortText,
    providerResponsible: providerName,
    consentVerified: z.boolean(),
    allergiesReviewed: z.boolean(),
    npoStatus: z.enum(SEDATION_NPO_STATUS_VALUES),
    asaClass: z.enum(SEDATION_ASA_CLASS_VALUES),
    mallampatiScore: z.enum(SEDATION_MALLAMPATI_VALUES),
    airwayAssessment: z.enum(SEDATION_AIRWAY_ASSESSMENT_VALUES),
    baselineTemperature: tempOptional,
    baselineHeartRate: hr,
    baselineRespRate: rr,
    baselineBloodPressure: bp,
    baselineSpo2: spo2,
    baselineEtco2: etco2,
    pregnancyConsidered: z.boolean().optional(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.npoStatus !== "EMERGENT_EXCEPTION" && !data.consentVerified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Consent must be verified unless emergent exception",
        path: ["consentVerified"],
      });
    }
    if (
      (data.npoStatus === "NOT_NPO" || data.npoStatus === "UNKNOWN") &&
      !data.notes?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Notes required for NPO status",
        path: ["notes"],
      });
    }
    if (data.airwayAssessment === "OTHER" && !data.notes?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Notes required for airway assessment",
        path: ["notes"],
      });
    }
    if (data.npoStatus === "EMERGENT_EXCEPTION" && !data.notes?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Emergent exception must be documented in notes",
        path: ["notes"],
      });
    }
  });

export const sedationTimeoutPayloadSchema = z
  .object({
    timeoutTime: isoDateTimeString,
    correctPatientConfirmed: z.boolean(),
    correctProcedureConfirmed: z.boolean(),
    correctSiteConfirmed: z.boolean(),
    providerPresent: z.boolean(),
    rnPresent: z.boolean(),
    monitoringEquipmentAvailable: z.boolean(),
    suctionAvailable: z.boolean(),
    oxygenAvailable: z.boolean(),
    airwayEquipmentAvailable: z.boolean(),
    reversalAgentsAvailable: z.boolean(),
    emergencyEquipmentAvailable: z.boolean(),
    consentVerified: z.boolean(),
    plannedSedationLevel: z.enum(SEDATION_LEVEL_VALUES),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    const failed = TIMEOUT_CRITICAL_CHECK_KEYS.filter((k) => !data[k]);
    if (failed.length > 0 && !data.notes?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Notes required when critical timeout checks are not all confirmed",
        path: ["notes"],
      });
    }
  });

export const sedationInitiationPayloadSchema = z.object({
  startTime: isoDateTimeString,
  sedationLevelTarget: z.enum(SEDATION_LEVEL_VALUES),
  oxygenDeliveryMethod: z.enum(SEDATION_OXYGEN_DELIVERY_VALUES),
  monitoringStarted: z.boolean(),
  cardiacMonitorApplied: z.boolean(),
  pulseOximetryApplied: z.boolean(),
  etco2MonitoringApplied: z.boolean(),
  bloodPressureMonitoringApplied: z.boolean(),
  ivAccessConfirmed: z.boolean(),
  baselineHeartRate: hr,
  baselineRespRate: rr,
  baselineBloodPressure: bp,
  baselineSpo2: spo2,
  baselineEtco2: etco2,
  medicationAdministrationDocumentedInMar: z.boolean(),
  notes: optionalNotes,
});

export const sedationMonitoringPayloadSchema = z
  .object({
    monitoringTime: isoDateTimeString,
    heartRate: hr,
    respRate: rr,
    bloodPressure: bp,
    spo2: spo2,
    etco2: etco2,
    oxygenDeliveryMethod: z.enum(SEDATION_OXYGEN_DELIVERY_VALUES),
    sedationLevel: z.enum(SEDATION_MONITORING_LEVEL_VALUES),
    airwayStatus: z.enum(SEDATION_AIRWAY_STATUS_VALUES),
    interventionRequired: z.boolean(),
    interventionDescription: z.string().trim().max(500).optional(),
    adverseEventObserved: z.boolean(),
    providerNotified: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.interventionRequired && !data.interventionDescription?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Intervention description required",
        path: ["interventionDescription"],
      });
    }
    if (data.adverseEventObserved && !data.providerNotified && !data.notes?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification or notes required for adverse event",
        path: ["providerNotified"],
      });
    }
  });

export const sedationReassessmentPayloadSchema = z.object({
  reassessmentTime: isoDateTimeString,
  patientCondition: z.enum(SEDATION_REASSESSMENT_CONDITION_VALUES),
  airwayStable: z.boolean(),
  hemodynamicallyStable: z.boolean(),
  painControlled: z.boolean(),
  nauseaVomitingPresent: z.boolean(),
  providerNotified: z.boolean(),
  continuedMonitoringRequired: z.boolean(),
  notes: optionalNotes,
});

export const sedationRecoveryScorePayloadSchema = z
  .object({
    scoredAt: isoDateTimeString,
    activity: z.enum(SEDATION_RECOVERY_ACTIVITY_VALUES),
    respiration: z.enum(SEDATION_RECOVERY_RESPIRATION_VALUES),
    circulation: z.enum(SEDATION_RECOVERY_CIRCULATION_VALUES),
    consciousness: z.enum(SEDATION_RECOVERY_CONSCIOUSNESS_VALUES),
    oxygenSaturation: z.enum(SEDATION_RECOVERY_OXYGEN_SATURATION_VALUES),
    totalScore: z.coerce.number().int().min(0).max(10),
    meetsRecoveryCriteria: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    const calculated = calculateSedationRecoveryScore(data);
    if (data.totalScore !== calculated) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Total score must match calculated Aldrete score",
        path: ["totalScore"],
      });
    }
    const criteriaMet = isSedationRecoveryCriteriaMet(calculated);
    if (data.meetsRecoveryCriteria !== criteriaMet) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Recovery criteria flag must match score threshold",
        path: ["meetsRecoveryCriteria"],
      });
    }
  });

export const sedationRecoveryMonitoringPayloadSchema = z.object({
  monitoringTime: isoDateTimeString,
  heartRate: hr,
  respRate: rr,
  bloodPressure: bp,
  spo2: spo2,
  etco2: etco2,
  airwayStatus: z.enum(SEDATION_AIRWAY_STATUS_VALUES),
  levelOfConsciousness: z.enum(SEDATION_RECOVERY_LOC_VALUES),
  painScore: painScoreOptional,
  nauseaVomitingPresent: z.boolean(),
  toleratingOralIntake: z.boolean().optional(),
  ambulationSafe: z.boolean().optional(),
  notes: optionalNotes,
});

export const sedationDischargeReadinessPayloadSchema = z
  .object({
    assessedAt: isoDateTimeString,
    recoveryScoreReviewed: z.boolean(),
    vitalSignsStable: z.boolean(),
    airwayStable: z.boolean(),
    mentalStatusAtBaseline: z.boolean(),
    painControlled: z.boolean(),
    nauseaControlled: z.boolean(),
    responsibleAdultPresent: z.boolean(),
    dischargeInstructionsReviewed: z.boolean(),
    providerApprovedDischarge: z.boolean(),
    patientOrRepresentativeUnderstandsInstructions: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (!data.providerApprovedDischarge) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider approved discharge required",
        path: ["providerApprovedDischarge"],
      });
    }
    if (!data.responsibleAdultPresent && !data.notes?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Notes required when responsible adult not present",
        path: ["notes"],
      });
    }
  });

const SEDATION_PAYLOAD_SCHEMA_BY_CARD_ID: Record<string, z.ZodType<Record<string, unknown>>> = {
  [SEDATION_PRE_ASSESSMENT_CARD_ID]: sedationPreAssessmentPayloadSchema,
  [SEDATION_TIMEOUT_CARD_ID]: sedationTimeoutPayloadSchema,
  [SEDATION_INITIATION_CARD_ID]: sedationInitiationPayloadSchema,
  [SEDATION_MONITORING_CARD_ID]: sedationMonitoringPayloadSchema,
  [SEDATION_REASSESSMENT_CARD_ID]: sedationReassessmentPayloadSchema,
  [SEDATION_RECOVERY_SCORE_CARD_ID]: sedationRecoveryScorePayloadSchema,
  [SEDATION_RECOVERY_MONITORING_CARD_ID]: sedationRecoveryMonitoringPayloadSchema,
  [SEDATION_DISCHARGE_READINESS_CARD_ID]: sedationDischargeReadinessPayloadSchema,
};

export function isEdoc10ProceduralSedationDocumentationCardId(
  cardId: string
): cardId is Edoc10ProceduralSedationDocumentationCardId {
  return (EDOC10_PROCEDURAL_SEDATION_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId);
}

/** EDOC.10 — immediate witness (timeout default; facility additionalCardIds for candidates). */
export function requiresImmediateWitnessCaptureForSedationPayload(
  cardId: string,
  _payload: Record<string, unknown>,
  facilityAdditionalImmediateWitnessCardIds?: readonly string[] | null
): boolean {
  if (cardId === SEDATION_TIMEOUT_CARD_ID) return true;
  if (facilityAdditionalImmediateWitnessCardIds?.includes(cardId)) return true;
  return false;
}

export function validateProceduralSedationPayloadForCard(
  cardId: string,
  payload: Record<string, unknown>
): { ok: true; data: Record<string, unknown> } | { ok: false; message: string } {
  const schema = SEDATION_PAYLOAD_SCHEMA_BY_CARD_ID[cardId];
  if (!schema) {
    return { ok: false, message: "Card is not available for structured save" };
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: "Invalid clinical documentation payload" };
  }
  return { ok: true, data: parsed.data as Record<string, unknown> };
}

// Summary helpers — abbreviated enum maps for legal chart
const NPO_EN: Record<string, string> = {
  NPO_CONFIRMED: "NPO confirmed",
  NOT_NPO: "Not NPO",
  EMERGENT_EXCEPTION: "Emergent exception",
  UNKNOWN: "Unknown",
};
const NPO_FR: Record<string, string> = {
  NPO_CONFIRMED: "À jeun confirmé",
  NOT_NPO: "Non à jeun",
  EMERGENT_EXCEPTION: "Exception urgente",
  UNKNOWN: "Inconnu",
};

export function summarizeProceduralSedationDocumentationPayload(
  cardId: string,
  payload: Record<string, unknown>,
  locale: ClinicalDocumentationSummaryLocale
): Array<{ key: string; value: string }> {
  switch (cardId) {
    case SEDATION_PRE_ASSESSMENT_CARD_ID: {
      const p = sedationPreAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        { key: locale === "en" ? "Assessed" : "Évalué", value: p.data.assessedAt },
        {
          key: "ASA",
          value: pickLocalizedEnumLabel(
            Object.fromEntries(SEDATION_ASA_CLASS_OPTIONS.map((o) => [o.value, o.labelEn])),
            Object.fromEntries(SEDATION_ASA_CLASS_OPTIONS.map((o) => [o.value, o.labelFr])),
            p.data.asaClass,
            locale
          ),
        },
        {
          key: "Mallampati",
          value: pickLocalizedEnumLabel(
            Object.fromEntries(SEDATION_MALLAMPATI_OPTIONS.map((o) => [o.value, o.labelEn])),
            Object.fromEntries(SEDATION_MALLAMPATI_OPTIONS.map((o) => [o.value, o.labelFr])),
            p.data.mallampatiScore,
            locale
          ),
        },
        {
          key: locale === "en" ? "Airway" : "Voie aérienne",
          value: pickLocalizedEnumLabel(
            Object.fromEntries(SEDATION_AIRWAY_ASSESSMENT_OPTIONS.map((o) => [o.value, o.labelEn])),
            Object.fromEntries(SEDATION_AIRWAY_ASSESSMENT_OPTIONS.map((o) => [o.value, o.labelFr])),
            p.data.airwayAssessment,
            locale
          ),
        },
        {
          key: locale === "en" ? "NPO status" : "Statut à jeun",
          value: pickLocalizedEnumLabel(NPO_EN, NPO_FR, p.data.npoStatus, locale),
        },
        {
          key: locale === "en" ? "Consent verified" : "Consentement vérifié",
          value: clinicalDocYesNo(p.data.consentVerified, locale),
        },
        {
          key: locale === "en" ? "Heart rate" : "Fréquence cardiaque",
          value: String(p.data.baselineHeartRate),
        },
        {
          key: locale === "en" ? "SpO₂" : "SpO₂",
          value: String(p.data.baselineSpo2),
        },
      ];
    }
    case SEDATION_TIMEOUT_CARD_ID: {
      const p = sedationTimeoutPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        { key: locale === "en" ? "Timeout" : "Time-out", value: p.data.timeoutTime },
        {
          key: locale === "en" ? "Patient confirmed" : "Patient confirmé",
          value: clinicalDocYesNo(p.data.correctPatientConfirmed, locale),
        },
        {
          key: locale === "en" ? "Procedure confirmed" : "Procédure confirmée",
          value: clinicalDocYesNo(p.data.correctProcedureConfirmed, locale),
        },
        {
          key: locale === "en" ? "Site confirmed" : "Site confirmé",
          value: clinicalDocYesNo(p.data.correctSiteConfirmed, locale),
        },
        {
          key: locale === "en" ? "Equipment ready" : "Équipement prêt",
          value: clinicalDocYesNo(
            p.data.monitoringEquipmentAvailable &&
              p.data.suctionAvailable &&
              p.data.oxygenAvailable &&
              p.data.airwayEquipmentAvailable,
            locale
          ),
        },
        {
          key: locale === "en" ? "Planned level" : "Niveau prévu",
          value: pickLocalizedEnumLabel(
            Object.fromEntries(SEDATION_LEVEL_OPTIONS.map((o) => [o.value, o.labelEn])),
            Object.fromEntries(SEDATION_LEVEL_OPTIONS.map((o) => [o.value, o.labelFr])),
            p.data.plannedSedationLevel,
            locale
          ),
        },
      ];
    }
    case SEDATION_INITIATION_CARD_ID: {
      const p = sedationInitiationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        { key: locale === "en" ? "Start" : "Début", value: p.data.startTime },
        {
          key: locale === "en" ? "Target level" : "Niveau cible",
          value: pickLocalizedEnumLabel(
            Object.fromEntries(SEDATION_LEVEL_OPTIONS.map((o) => [o.value, o.labelEn])),
            Object.fromEntries(SEDATION_LEVEL_OPTIONS.map((o) => [o.value, o.labelFr])),
            p.data.sedationLevelTarget,
            locale
          ),
        },
        {
          key: locale === "en" ? "Oxygen delivery" : "Oxygénothérapie",
          value: pickLocalizedEnumLabel(
            Object.fromEntries(SEDATION_OXYGEN_DELIVERY_OPTIONS.map((o) => [o.value, o.labelEn])),
            Object.fromEntries(SEDATION_OXYGEN_DELIVERY_OPTIONS.map((o) => [o.value, o.labelFr])),
            p.data.oxygenDeliveryMethod,
            locale
          ),
        },
        {
          key: locale === "en" ? "Monitoring started" : "Surveillance démarrée",
          value: clinicalDocYesNo(p.data.monitoringStarted, locale),
        },
        {
          key: locale === "en" ? "MAR documented" : "Documenté au MAR",
          value: clinicalDocYesNo(p.data.medicationAdministrationDocumentedInMar, locale),
        },
        {
          key: locale === "en" ? "SpO₂" : "SpO₂",
          value: String(p.data.baselineSpo2),
        },
      ];
    }
    case SEDATION_MONITORING_CARD_ID: {
      const p = sedationMonitoringPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        { key: locale === "en" ? "Time" : "Heure", value: p.data.monitoringTime },
        {
          key: locale === "en" ? "Heart rate" : "FC",
          value: String(p.data.heartRate),
        },
        {
          key: locale === "en" ? "SpO₂" : "SpO₂",
          value: String(p.data.spo2),
        },
        {
          key: locale === "en" ? "Sedation level" : "Niveau sédation",
          value: pickLocalizedEnumLabel(
            Object.fromEntries(SEDATION_MONITORING_LEVEL_OPTIONS.map((o) => [o.value, o.labelEn])),
            Object.fromEntries(SEDATION_MONITORING_LEVEL_OPTIONS.map((o) => [o.value, o.labelFr])),
            p.data.sedationLevel,
            locale
          ),
        },
        {
          key: locale === "en" ? "Airway" : "Voie aérienne",
          value: pickLocalizedEnumLabel(
            Object.fromEntries(SEDATION_AIRWAY_STATUS_OPTIONS.map((o) => [o.value, o.labelEn])),
            Object.fromEntries(SEDATION_AIRWAY_STATUS_OPTIONS.map((o) => [o.value, o.labelFr])),
            p.data.airwayStatus,
            locale
          ),
        },
        {
          key: locale === "en" ? "Adverse event" : "Événement indésirable",
          value: clinicalDocYesNo(p.data.adverseEventObserved, locale),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: clinicalDocYesNo(p.data.providerNotified, locale),
        },
      ];
    }
    case SEDATION_REASSESSMENT_CARD_ID: {
      const p = sedationReassessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        { key: locale === "en" ? "Reassessment" : "Réévaluation", value: p.data.reassessmentTime },
        {
          key: locale === "en" ? "Condition" : "État",
          value: pickLocalizedEnumLabel(
            Object.fromEntries(SEDATION_REASSESSMENT_CONDITION_OPTIONS.map((o) => [o.value, o.labelEn])),
            Object.fromEntries(SEDATION_REASSESSMENT_CONDITION_OPTIONS.map((o) => [o.value, o.labelFr])),
            p.data.patientCondition,
            locale
          ),
        },
        {
          key: locale === "en" ? "Airway stable" : "Voie aérienne stable",
          value: clinicalDocYesNo(p.data.airwayStable, locale),
        },
      ];
    }
    case SEDATION_RECOVERY_SCORE_CARD_ID: {
      const p = sedationRecoveryScorePayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        { key: locale === "en" ? "Scored" : "Score", value: p.data.scoredAt },
        {
          key: locale === "en" ? "Total score" : "Score total",
          value: String(p.data.totalScore),
        },
        {
          key: locale === "en" ? "Recovery criteria met" : "Critères récupération",
          value: clinicalDocYesNo(p.data.meetsRecoveryCriteria, locale),
        },
      ];
    }
    case SEDATION_RECOVERY_MONITORING_CARD_ID: {
      const p = sedationRecoveryMonitoringPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        { key: locale === "en" ? "Time" : "Heure", value: p.data.monitoringTime },
        {
          key: locale === "en" ? "Heart rate" : "FC",
          value: String(p.data.heartRate),
        },
        {
          key: locale === "en" ? "SpO₂" : "SpO₂",
          value: String(p.data.spo2),
        },
        {
          key: locale === "en" ? "LOC" : "Conscience",
          value: pickLocalizedEnumLabel(
            Object.fromEntries(SEDATION_RECOVERY_LOC_OPTIONS.map((o) => [o.value, o.labelEn])),
            Object.fromEntries(SEDATION_RECOVERY_LOC_OPTIONS.map((o) => [o.value, o.labelFr])),
            p.data.levelOfConsciousness,
            locale
          ),
        },
        {
          key: locale === "en" ? "Nausea/vomiting" : "Nausées/vomissements",
          value: clinicalDocYesNo(p.data.nauseaVomitingPresent, locale),
        },
      ];
    }
    case SEDATION_DISCHARGE_READINESS_CARD_ID: {
      const p = sedationDischargeReadinessPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        { key: locale === "en" ? "Assessed" : "Évalué", value: p.data.assessedAt },
        {
          key: locale === "en" ? "Vitals stable" : "Constantes stables",
          value: clinicalDocYesNo(p.data.vitalSignsStable, locale),
        },
        {
          key: locale === "en" ? "Airway stable" : "Voie aérienne stable",
          value: clinicalDocYesNo(p.data.airwayStable, locale),
        },
        {
          key: locale === "en" ? "Mental status baseline" : "État mental baseline",
          value: clinicalDocYesNo(p.data.mentalStatusAtBaseline, locale),
        },
        {
          key: locale === "en" ? "Responsible adult" : "Adulte responsable",
          value: clinicalDocYesNo(p.data.responsibleAdultPresent, locale),
        },
        {
          key: locale === "en" ? "Provider approved" : "Sortie approuvée",
          value: clinicalDocYesNo(p.data.providerApprovedDischarge, locale),
        },
      ];
    }
    default:
      return [];
  }
}
