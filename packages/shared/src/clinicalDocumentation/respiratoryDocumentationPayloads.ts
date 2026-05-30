import { z } from "zod";
import type { ClinicalDocumentationFieldOption } from "./clinicalDocumentationFieldOptions.js";
import {
  clinicalDocYesNo,
  pickLocalizedEnumLabel,
  type ClinicalDocumentationSummaryLocale,
} from "./clinicalDocumentationSummaryLocale.js";

/** EDOC.12 — respiratory assessment & oxygen therapy card IDs. */
export const RESP_ASSESSMENT_CARD_ID = "resp_assessment" as const;
export const OXYGEN_THERAPY_INITIATION_CARD_ID = "oxygen_therapy_initiation" as const;
export const OXYGEN_TITRATION_CARD_ID = "oxygen_titration" as const;
export const NEBULIZER_REASSESSMENT_CARD_ID = "nebulizer_reassessment" as const;
export const CPAP_BIPAP_MONITORING_CARD_ID = "resp_cpap_bipap" as const;
export const RESPIRATORY_DISTRESS_REASSESSMENT_CARD_ID = "respiratory_distress_reassessment" as const;
export const VENTILATOR_OBSERVATION_CARD_ID = "resp_ventilator" as const;
export const PEAK_FLOW_DOCUMENTATION_CARD_ID = "resp_peak_flow" as const;

export const EDOC12_RESPIRATORY_DOCUMENTATION_CARD_IDS = [
  RESP_ASSESSMENT_CARD_ID,
  OXYGEN_THERAPY_INITIATION_CARD_ID,
  OXYGEN_TITRATION_CARD_ID,
  NEBULIZER_REASSESSMENT_CARD_ID,
  CPAP_BIPAP_MONITORING_CARD_ID,
  RESPIRATORY_DISTRESS_REASSESSMENT_CARD_ID,
  VENTILATOR_OBSERVATION_CARD_ID,
  PEAK_FLOW_DOCUMENTATION_CARD_ID,
] as const;

export type Edoc12RespiratoryDocumentationCardId =
  (typeof EDOC12_RESPIRATORY_DOCUMENTATION_CARD_IDS)[number];

/**
 * Future Phase — EDOC.12A Respiratory Escalation Automation
 * Do not implement now: automated alerts, paging, or RT dispatch from documentation flags.
 */
export const EDOC_12A_FUTURE_RESPIRATORY_ESCALATION_AUTOMATION = "EDOC.12A" as const;

const optionalNotes = z.string().trim().max(2000).optional();
const isoDateTimeString = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date/time" });
const respiratoryRate = z.coerce.number().int().min(1).max(80);
const spo2 = z.coerce.number().int().min(0).max(100);
const flowRate = z.coerce.number().min(0).max(100);
const peakFlowValue = z.coerce.number().int().positive().max(800);
const optionalPeakFlow = z.coerce.number().int().positive().max(800).optional();
const fio2Percent = z.coerce.number().int().min(21).max(100).optional();
const peep = z.coerce.number().min(0).max(30).optional();
const tidalVolume = z.coerce.number().int().min(0).max(2000).optional();
const rrSet = z.coerce.number().int().min(0).max(60).optional();
const etco2 = z.coerce.number().int().min(0).max(100).optional();

export const OXYGEN_DEVICE_VALUES = [
  "ROOM_AIR",
  "NASAL_CANNULA",
  "SIMPLE_MASK",
  "NON_REBREATHER",
  "VENTURI_MASK",
  "HIGH_FLOW_NASAL_CANNULA",
  "BAG_VALVE_MASK",
  "TRACH_COLLAR",
  "OTHER",
] as const;

export const FLOW_UNIT_VALUES = ["LPM", "FIO2_PERCENT"] as const;

export const OXYGEN_INITIATION_REASON_VALUES = [
  "HYPOXIA",
  "DYSPNEA",
  "PROCEDURAL_SUPPORT",
  "RESPIRATORY_DISTRESS",
  "PROVIDER_ORDER",
  "OTHER",
] as const;

export const OXYGEN_TITRATION_REASON_VALUES = [
  "SPO2_LOW",
  "SPO2_STABLE_WEANING",
  "RESPIRATORY_DISTRESS",
  "PATIENT_COMFORT",
  "PROVIDER_ORDER",
  "OTHER",
] as const;

export const WORK_OF_BREATHING_VALUES = [
  "NORMAL",
  "MILD_INCREASED",
  "MODERATE_INCREASED",
  "SEVERE_DISTRESS",
] as const;

export const BREATH_SOUNDS_VALUES = [
  "CLEAR",
  "DIMINISHED",
  "WHEEZING",
  "CRACKLES",
  "RHONCHI",
  "STRIDOR",
  "ABSENT",
  "MIXED",
] as const;

export const BREATH_SOUNDS_LOCATION_VALUES = [
  "BILATERAL",
  "LEFT",
  "RIGHT",
  "UPPER",
  "LOWER",
  "DIFFUSE",
] as const;

export const COUGH_VALUES = ["NONE", "DRY", "PRODUCTIVE", "WEAK", "STRONG"] as const;

export const PATIENT_POSITION_VALUES = [
  "SUPINE",
  "SEMI_FOWLER",
  "HIGH_FOWLER",
  "TRIPOD",
  "OTHER",
] as const;

export const NEBULIZER_MEDICATION_VALUES = [
  "ALBUTEROL",
  "IPRATROPIUM",
  "DUONEB",
  "RACEMIC_EPINEPHRINE",
  "OTHER",
] as const;

export const CPAP_BIPAP_MODE_VALUES = ["CPAP", "BIPAP"] as const;

export const MASK_FIT_VALUES = ["GOOD", "LEAK_PRESENT", "POOR_TOLERANCE"] as const;

export const SKIN_INTEGRITY_VALUES = ["INTACT", "REDNESS", "BREAKDOWN"] as const;

export const CPAP_PATIENT_TOLERANCE_VALUES = [
  "TOLERATING",
  "ANXIOUS",
  "REMOVED_MASK",
  "DECLINED",
] as const;

export const RESPIRATORY_MENTAL_STATUS_VALUES = [
  "ALERT",
  "ANXIOUS",
  "CONFUSED",
  "LETHARGIC",
  "UNRESPONSIVE",
] as const;

export const INTERVENTION_PERFORMED_VALUES = [
  "OXYGEN_INCREASED",
  "POSITIONING",
  "NEBULIZER",
  "CPAP_BIPAP",
  "SUCTION",
  "PROVIDER_AT_BEDSIDE",
  "RAPID_RESPONSE",
  "OTHER",
] as const;

export const VENTILATOR_MODE_VALUES = [
  "AC",
  "SIMV",
  "PRESSURE_SUPPORT",
  "CPAP",
  "BIPAP",
  "OTHER",
] as const;

export const PEAK_FLOW_EFFORT_QUALITY_VALUES = ["GOOD", "FAIR", "POOR", "UNABLE"] as const;

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

const OXYGEN_DEVICE_LABELS: Record<
  (typeof OXYGEN_DEVICE_VALUES)[number],
  { en: string; fr: string }
> = {
  ROOM_AIR: { en: "Room air", fr: "Air ambiant" },
  NASAL_CANNULA: { en: "Nasal cannula", fr: "Canule nasale" },
  SIMPLE_MASK: { en: "Simple mask", fr: "Masque simple" },
  NON_REBREATHER: { en: "Non-rebreather", fr: "Masque à haute concentration" },
  VENTURI_MASK: { en: "Venturi mask", fr: "Masque Venturi" },
  HIGH_FLOW_NASAL_CANNULA: { en: "High-flow nasal cannula", fr: "Canule nasale haut débit" },
  BAG_VALVE_MASK: { en: "Bag-valve mask", fr: "Ballon-masque" },
  TRACH_COLLAR: { en: "Trach collar", fr: "Collier trachéo" },
  OTHER: { en: "Other", fr: "Autre" },
};

export const OXYGEN_DEVICE_OPTIONS = enumOptions(OXYGEN_DEVICE_VALUES, OXYGEN_DEVICE_LABELS);

export const FLOW_UNIT_OPTIONS: ClinicalDocumentationFieldOption<
  (typeof FLOW_UNIT_VALUES)[number]
>[] = [
  { value: "LPM", labelEn: "L/min", labelFr: "L/min" },
  { value: "FIO2_PERCENT", labelEn: "FiO₂ %", labelFr: "FiO₂ %" },
];

export const OXYGEN_INITIATION_REASON_OPTIONS = enumOptions(OXYGEN_INITIATION_REASON_VALUES, {
  HYPOXIA: { en: "Hypoxia", fr: "Hypoxie" },
  DYSPNEA: { en: "Dyspnea", fr: "Dyspnée" },
  PROCEDURAL_SUPPORT: { en: "Procedural support", fr: "Support procédural" },
  RESPIRATORY_DISTRESS: { en: "Respiratory distress", fr: "Détresse respiratoire" },
  PROVIDER_ORDER: { en: "Provider order", fr: "Prescription médecin" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const OXYGEN_TITRATION_REASON_OPTIONS = enumOptions(OXYGEN_TITRATION_REASON_VALUES, {
  SPO2_LOW: { en: "SpO₂ low", fr: "SpO₂ basse" },
  SPO2_STABLE_WEANING: { en: "SpO₂ stable — weaning", fr: "SpO₂ stable — sevrage" },
  RESPIRATORY_DISTRESS: { en: "Respiratory distress", fr: "Détresse respiratoire" },
  PATIENT_COMFORT: { en: "Patient comfort", fr: "Confort patient" },
  PROVIDER_ORDER: { en: "Provider order", fr: "Prescription médecin" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const WORK_OF_BREATHING_OPTIONS = enumOptions(WORK_OF_BREATHING_VALUES, {
  NORMAL: { en: "Normal", fr: "Normal" },
  MILD_INCREASED: { en: "Mildly increased", fr: "Légèrement augmenté" },
  MODERATE_INCREASED: { en: "Moderately increased", fr: "Modérément augmenté" },
  SEVERE_DISTRESS: { en: "Severe distress", fr: "Détresse sévère" },
});

export const BREATH_SOUNDS_OPTIONS = enumOptions(BREATH_SOUNDS_VALUES, {
  CLEAR: { en: "Clear", fr: "Clairs" },
  DIMINISHED: { en: "Diminished", fr: "Diminués" },
  WHEEZING: { en: "Wheezing", fr: "Sibilants" },
  CRACKLES: { en: "Crackles", fr: "Crépitants" },
  RHONCHI: { en: "Rhonchi", fr: "Ronchi" },
  STRIDOR: { en: "Stridor", fr: "Stridor" },
  ABSENT: { en: "Absent", fr: "Absents" },
  MIXED: { en: "Mixed", fr: "Mixtes" },
});

export const BREATH_SOUNDS_LOCATION_OPTIONS = enumOptions(BREATH_SOUNDS_LOCATION_VALUES, {
  BILATERAL: { en: "Bilateral", fr: "Bilatéral" },
  LEFT: { en: "Left", fr: "Gauche" },
  RIGHT: { en: "Right", fr: "Droit" },
  UPPER: { en: "Upper", fr: "Supérieur" },
  LOWER: { en: "Lower", fr: "Inférieur" },
  DIFFUSE: { en: "Diffuse", fr: "Diffus" },
});

export const COUGH_OPTIONS = enumOptions(COUGH_VALUES, {
  NONE: { en: "None", fr: "Aucune" },
  DRY: { en: "Dry", fr: "Sèche" },
  PRODUCTIVE: { en: "Productive", fr: "Productive" },
  WEAK: { en: "Weak", fr: "Faible" },
  STRONG: { en: "Strong", fr: "Forte" },
});

export const PATIENT_POSITION_OPTIONS = enumOptions(PATIENT_POSITION_VALUES, {
  SUPINE: { en: "Supine", fr: "Décubitus dorsal" },
  SEMI_FOWLER: { en: "Semi-Fowler", fr: "Semi-Fowler" },
  HIGH_FOWLER: { en: "High Fowler", fr: "Fowler élevé" },
  TRIPOD: { en: "Tripod", fr: "Tripode" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const NEBULIZER_MEDICATION_OPTIONS = enumOptions(NEBULIZER_MEDICATION_VALUES, {
  ALBUTEROL: { en: "Albuterol", fr: "Salbutamol" },
  IPRATROPIUM: { en: "Ipratropium", fr: "Ipratropium" },
  DUONEB: { en: "DuoNeb", fr: "DuoNeb" },
  RACEMIC_EPINEPHRINE: { en: "Racemic epinephrine", fr: "Épinéphrine racémique" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const CPAP_BIPAP_MODE_OPTIONS: ClinicalDocumentationFieldOption<
  (typeof CPAP_BIPAP_MODE_VALUES)[number]
>[] = [
  { value: "CPAP", labelEn: "CPAP", labelFr: "CPAP" },
  { value: "BIPAP", labelEn: "BiPAP", labelFr: "BiPAP" },
];

export const MASK_FIT_OPTIONS = enumOptions(MASK_FIT_VALUES, {
  GOOD: { en: "Good", fr: "Bonne" },
  LEAK_PRESENT: { en: "Leak present", fr: "Fuite présente" },
  POOR_TOLERANCE: { en: "Poor tolerance", fr: "Mauvaise tolérance" },
});

export const SKIN_INTEGRITY_OPTIONS = enumOptions(SKIN_INTEGRITY_VALUES, {
  INTACT: { en: "Intact", fr: "Intacte" },
  REDNESS: { en: "Redness", fr: "Rougeur" },
  BREAKDOWN: { en: "Breakdown", fr: "Lésion cutanée" },
});

export const CPAP_PATIENT_TOLERANCE_OPTIONS = enumOptions(CPAP_PATIENT_TOLERANCE_VALUES, {
  TOLERATING: { en: "Tolerating", fr: "Tolère" },
  ANXIOUS: { en: "Anxious", fr: "Anxieux" },
  REMOVED_MASK: { en: "Removed mask", fr: "Masque retiré" },
  DECLINED: { en: "Declined", fr: "Refusé" },
});

export const RESPIRATORY_MENTAL_STATUS_OPTIONS = enumOptions(RESPIRATORY_MENTAL_STATUS_VALUES, {
  ALERT: { en: "Alert", fr: "Alerte" },
  ANXIOUS: { en: "Anxious", fr: "Anxieux" },
  CONFUSED: { en: "Confused", fr: "Confus" },
  LETHARGIC: { en: "Lethargic", fr: "Léthargique" },
  UNRESPONSIVE: { en: "Unresponsive", fr: "Non réactif" },
});

export const INTERVENTION_PERFORMED_OPTIONS = enumOptions(INTERVENTION_PERFORMED_VALUES, {
  OXYGEN_INCREASED: { en: "Oxygen increased", fr: "Oxygène augmenté" },
  POSITIONING: { en: "Positioning", fr: "Positionnement" },
  NEBULIZER: { en: "Nebulizer", fr: "Nébulisation" },
  CPAP_BIPAP: { en: "CPAP / BiPAP", fr: "CPAP / BiPAP" },
  SUCTION: { en: "Suction", fr: "Aspiration" },
  PROVIDER_AT_BEDSIDE: { en: "Provider at bedside", fr: "Médecin au chevet" },
  RAPID_RESPONSE: { en: "Rapid response", fr: "Intervention rapide" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const VENTILATOR_MODE_OPTIONS = enumOptions(VENTILATOR_MODE_VALUES, {
  AC: { en: "Assist-control (AC)", fr: "Assistée-contrôlée (AC)" },
  SIMV: { en: "SIMV", fr: "SIMV" },
  PRESSURE_SUPPORT: { en: "Pressure support", fr: "Aide inspiratoire" },
  CPAP: { en: "CPAP", fr: "CPAP" },
  BIPAP: { en: "BiPAP", fr: "BiPAP" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const PEAK_FLOW_EFFORT_QUALITY_OPTIONS = enumOptions(PEAK_FLOW_EFFORT_QUALITY_VALUES, {
  GOOD: { en: "Good effort", fr: "Bon effort" },
  FAIR: { en: "Fair effort", fr: "Effort moyen" },
  POOR: { en: "Poor effort", fr: "Faible effort" },
  UNABLE: { en: "Unable", fr: "Incapable" },
});

function labelMap<T extends string>(
  options: ClinicalDocumentationFieldOption<T>[]
): { en: Record<string, string>; fr: Record<string, string> } {
  return {
    en: Object.fromEntries(options.map((o) => [o.value, o.labelEn])),
    fr: Object.fromEntries(options.map((o) => [o.value, o.labelFr])),
  };
}

const OXYGEN_DEVICE_MAP = labelMap(OXYGEN_DEVICE_OPTIONS);
const WORK_OF_BREATHING_MAP = labelMap(WORK_OF_BREATHING_OPTIONS);
const BREATH_SOUNDS_MAP = labelMap(BREATH_SOUNDS_OPTIONS);
const BREATH_SOUNDS_LOCATION_MAP = labelMap(BREATH_SOUNDS_LOCATION_OPTIONS);
const COUGH_MAP = labelMap(COUGH_OPTIONS);
const PATIENT_POSITION_MAP = labelMap(PATIENT_POSITION_OPTIONS);
const OXYGEN_INITIATION_REASON_MAP = labelMap(OXYGEN_INITIATION_REASON_OPTIONS);
const OXYGEN_TITRATION_REASON_MAP = labelMap(OXYGEN_TITRATION_REASON_OPTIONS);
const NEBULIZER_MEDICATION_MAP = labelMap(NEBULIZER_MEDICATION_OPTIONS);
const CPAP_BIPAP_MODE_MAP = labelMap(CPAP_BIPAP_MODE_OPTIONS);
const MASK_FIT_MAP = labelMap(MASK_FIT_OPTIONS);
const SKIN_INTEGRITY_MAP = labelMap(SKIN_INTEGRITY_OPTIONS);
const CPAP_TOLERANCE_MAP = labelMap(CPAP_PATIENT_TOLERANCE_OPTIONS);
const MENTAL_STATUS_MAP = labelMap(RESPIRATORY_MENTAL_STATUS_OPTIONS);
const INTERVENTION_MAP = labelMap(INTERVENTION_PERFORMED_OPTIONS);
const VENTILATOR_MODE_MAP = labelMap(VENTILATOR_MODE_OPTIONS);
const EFFORT_QUALITY_MAP = labelMap(PEAK_FLOW_EFFORT_QUALITY_OPTIONS);

export const respiratoryAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    respiratoryRate,
    spo2,
    oxygenDevice: z.enum(OXYGEN_DEVICE_VALUES),
    oxygenFlowRate: flowRate.optional(),
    workOfBreathing: z.enum(WORK_OF_BREATHING_VALUES),
    breathSounds: z.enum(BREATH_SOUNDS_VALUES),
    breathSoundsLocation: z.enum(BREATH_SOUNDS_LOCATION_VALUES),
    cough: z.enum(COUGH_VALUES),
    sputumPresent: z.boolean(),
    sputumDescription: z.string().trim().max(500).optional(),
    accessoryMuscleUse: z.boolean(),
    retractions: z.boolean(),
    cyanosis: z.boolean(),
    patientPosition: z.enum(PATIENT_POSITION_VALUES),
    providerNotified: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.sputumPresent && !data.sputumDescription?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Sputum description required when sputum present",
        path: ["sputumDescription"],
      });
    }
    if (data.workOfBreathing === "SEVERE_DISTRESS" && !data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required for severe respiratory distress",
        path: ["providerNotified"],
      });
    }
  });

export const oxygenTherapyInitiationPayloadSchema = z
  .object({
    startedAt: isoDateTimeString,
    oxygenDevice: z.enum(OXYGEN_DEVICE_VALUES),
    flowRate: flowRate,
    flowUnit: z.enum(FLOW_UNIT_VALUES),
    spo2Before: spo2,
    spo2After: spo2.optional(),
    reason: z.enum(OXYGEN_INITIATION_REASON_VALUES),
    providerOrderVerified: z.boolean(),
    patientTolerated: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.oxygenDevice !== "ROOM_AIR" && data.flowRate <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Flow rate must be greater than zero unless room air",
        path: ["flowRate"],
      });
    }
  });

export const oxygenTitrationPayloadSchema = z
  .object({
    titrationTime: isoDateTimeString,
    previousDevice: z.enum(OXYGEN_DEVICE_VALUES),
    newDevice: z.enum(OXYGEN_DEVICE_VALUES),
    previousFlowRate: flowRate.optional(),
    newFlowRate: flowRate,
    flowUnit: z.enum(FLOW_UNIT_VALUES),
    spo2Before: spo2,
    spo2After: spo2,
    reason: z.enum(OXYGEN_TITRATION_REASON_VALUES),
    providerNotified: z.boolean(),
    patientTolerated: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.newDevice !== "ROOM_AIR" && data.newFlowRate <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "New flow rate must be greater than zero unless room air",
        path: ["newFlowRate"],
      });
    }
    if (data.reason === "RESPIRATORY_DISTRESS" && !data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required for respiratory distress titration",
        path: ["providerNotified"],
      });
    }
  });

export const nebulizerReassessmentPayloadSchema = z
  .object({
    reassessmentTime: isoDateTimeString,
    treatmentMedicationReferenced: z.enum(NEBULIZER_MEDICATION_VALUES),
    treatmentDocumentedInMar: z.boolean(),
    respiratoryRate,
    spo2,
    breathSoundsAfter: z.enum(BREATH_SOUNDS_VALUES),
    workOfBreathingAfter: z.enum(WORK_OF_BREATHING_VALUES),
    patientReportsImprovement: z.boolean(),
    adverseEffectObserved: z.boolean(),
    providerNotified: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.adverseEffectObserved && !data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required when adverse effect observed",
        path: ["providerNotified"],
      });
    }
  });

export const cpapBipapMonitoringPayloadSchema = z
  .object({
    monitoringTime: isoDateTimeString,
    mode: z.enum(CPAP_BIPAP_MODE_VALUES),
    deviceSettingSummary: z.string().trim().min(1).max(200),
    fio2Percent: fio2Percent,
    respiratoryRate,
    spo2,
    maskFit: z.enum(MASK_FIT_VALUES),
    skinIntegrity: z.enum(SKIN_INTEGRITY_VALUES),
    patientTolerance: z.enum(CPAP_PATIENT_TOLERANCE_VALUES),
    providerNotified: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    const requiresNotification =
      data.maskFit === "POOR_TOLERANCE" ||
      data.skinIntegrity === "BREAKDOWN" ||
      data.patientTolerance === "REMOVED_MASK" ||
      data.patientTolerance === "DECLINED";
    if (requiresNotification && !data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required for poor tolerance or skin breakdown",
        path: ["providerNotified"],
      });
    }
  });

export const respiratoryDistressReassessmentPayloadSchema = z
  .object({
    reassessmentTime: isoDateTimeString,
    respiratoryRate,
    spo2,
    workOfBreathing: z.enum(WORK_OF_BREATHING_VALUES),
    oxygenDevice: z.enum(OXYGEN_DEVICE_VALUES),
    oxygenFlowRate: flowRate.optional(),
    accessoryMuscleUse: z.boolean(),
    retractions: z.boolean(),
    mentalStatus: z.enum(RESPIRATORY_MENTAL_STATUS_VALUES),
    interventionPerformed: z.enum(INTERVENTION_PERFORMED_VALUES),
    providerNotified: z.boolean(),
    rapidResponseActivated: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (!data.providerNotified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required for respiratory distress reassessment",
        path: ["providerNotified"],
      });
    }
  });

export const ventilatorObservationPayloadSchema = z
  .object({
    observationTime: isoDateTimeString,
    ventilatorMode: z.enum(VENTILATOR_MODE_VALUES),
    fio2Percent: fio2Percent,
    peep,
    tidalVolume,
    respiratoryRateSet: rrSet,
    respiratoryRateObserved: respiratoryRate,
    spo2,
    etco2,
    airwaySecured: z.boolean(),
    alarmObserved: z.boolean(),
    alarmDescription: z.string().trim().max(500).optional(),
    rtNotified: z.boolean(),
    providerNotified: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.alarmObserved) {
      if (!data.alarmDescription?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Alarm description required when alarm observed",
          path: ["alarmDescription"],
        });
      }
      if (!data.rtNotified) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "RT notification required when ventilator alarm observed",
          path: ["rtNotified"],
        });
      }
    }
  });

export const peakFlowDocumentationPayloadSchema = z
  .object({
    measuredAt: isoDateTimeString,
    preTreatmentPeakFlow: optionalPeakFlow,
    postTreatmentPeakFlow: optionalPeakFlow,
    personalBestKnown: z.boolean(),
    personalBestValue: peakFlowValue.optional(),
    effortQuality: z.enum(PEAK_FLOW_EFFORT_QUALITY_VALUES),
    providerNotified: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.personalBestKnown && data.personalBestValue == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Personal best value required when personal best is known",
        path: ["personalBestValue"],
      });
    }
  });

const PAYLOAD_SCHEMA_BY_CARD_ID: Record<string, z.ZodType<Record<string, unknown>>> = {
  [RESP_ASSESSMENT_CARD_ID]: respiratoryAssessmentPayloadSchema,
  [OXYGEN_THERAPY_INITIATION_CARD_ID]: oxygenTherapyInitiationPayloadSchema,
  [OXYGEN_TITRATION_CARD_ID]: oxygenTitrationPayloadSchema,
  [NEBULIZER_REASSESSMENT_CARD_ID]: nebulizerReassessmentPayloadSchema,
  [CPAP_BIPAP_MONITORING_CARD_ID]: cpapBipapMonitoringPayloadSchema,
  [RESPIRATORY_DISTRESS_REASSESSMENT_CARD_ID]: respiratoryDistressReassessmentPayloadSchema,
  [VENTILATOR_OBSERVATION_CARD_ID]: ventilatorObservationPayloadSchema,
  [PEAK_FLOW_DOCUMENTATION_CARD_ID]: peakFlowDocumentationPayloadSchema,
};

export function isEdoc12RespiratoryDocumentationCardId(
  cardId: string
): cardId is Edoc12RespiratoryDocumentationCardId {
  return (EDOC12_RESPIRATORY_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId);
}

export function validateRespiratoryDocumentationPayloadForCard(
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

function flowSummary(
  device: (typeof OXYGEN_DEVICE_VALUES)[number],
  flowRate: number | undefined,
  locale: ClinicalDocumentationSummaryLocale
): string {
  const deviceLabel = pickLocalizedEnumLabel(
    OXYGEN_DEVICE_MAP.en,
    OXYGEN_DEVICE_MAP.fr,
    device,
    locale
  );
  if (flowRate != null && flowRate > 0) {
    return `${deviceLabel} — ${flowRate} L/min`;
  }
  return deviceLabel;
}

export function summarizeRespiratoryDocumentationPayload(
  cardId: string,
  payload: Record<string, unknown>,
  locale: ClinicalDocumentationSummaryLocale
): Array<{ key: string; value: string }> {
  switch (cardId) {
    case RESP_ASSESSMENT_CARD_ID: {
      const p = respiratoryAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      const lines: Array<{ key: string; value: string }> = [
        {
          key: locale === "en" ? "Respiratory rate" : "Fréquence respiratoire",
          value: String(d.respiratoryRate),
        },
        {
          key: "SpO₂",
          value: `${d.spo2}%`,
        },
        {
          key: locale === "en" ? "Oxygen" : "Oxygène",
          value: flowSummary(d.oxygenDevice, d.oxygenFlowRate, locale),
        },
        {
          key: locale === "en" ? "Work of breathing" : "Travail respiratoire",
          value: pickLocalizedEnumLabel(
            WORK_OF_BREATHING_MAP.en,
            WORK_OF_BREATHING_MAP.fr,
            d.workOfBreathing,
            locale
          ),
        },
        {
          key: locale === "en" ? "Breath sounds" : "Auscultation",
          value: pickLocalizedEnumLabel(
            BREATH_SOUNDS_MAP.en,
            BREATH_SOUNDS_MAP.fr,
            d.breathSounds,
            locale
          ),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: clinicalDocYesNo(d.providerNotified, locale),
        },
      ];
      return lines;
    }
    case OXYGEN_THERAPY_INITIATION_CARD_ID: {
      const p = oxygenTherapyInitiationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      const lines: Array<{ key: string; value: string }> = [
        {
          key: locale === "en" ? "Device / flow" : "Dispositif / débit",
          value: `${pickLocalizedEnumLabel(OXYGEN_DEVICE_MAP.en, OXYGEN_DEVICE_MAP.fr, d.oxygenDevice, locale)} — ${d.flowRate} ${d.flowUnit === "LPM" ? "L/min" : "FiO₂ %"}`,
        },
        {
          key: locale === "en" ? "SpO₂ before" : "SpO₂ avant",
          value: `${d.spo2Before}%`,
        },
      ];
      if (d.spo2After != null) {
        lines.push({
          key: locale === "en" ? "SpO₂ after" : "SpO₂ après",
          value: `${d.spo2After}%`,
        });
      }
      lines.push(
        {
          key: locale === "en" ? "Reason" : "Motif",
          value: pickLocalizedEnumLabel(
            OXYGEN_INITIATION_REASON_MAP.en,
            OXYGEN_INITIATION_REASON_MAP.fr,
            d.reason,
            locale
          ),
        },
        {
          key: locale === "en" ? "Patient tolerated" : "Toléré par le patient",
          value: clinicalDocYesNo(d.patientTolerated, locale),
        }
      );
      return lines;
    }
    case OXYGEN_TITRATION_CARD_ID: {
      const p = oxygenTitrationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Previous → new" : "Ancien → nouveau",
          value: `${pickLocalizedEnumLabel(OXYGEN_DEVICE_MAP.en, OXYGEN_DEVICE_MAP.fr, d.previousDevice, locale)} → ${pickLocalizedEnumLabel(OXYGEN_DEVICE_MAP.en, OXYGEN_DEVICE_MAP.fr, d.newDevice, locale)}`,
        },
        {
          key: locale === "en" ? "New flow" : "Nouveau débit",
          value: `${d.newFlowRate} ${d.flowUnit === "LPM" ? "L/min" : "FiO₂ %"}`,
        },
        {
          key: locale === "en" ? "SpO₂ before / after" : "SpO₂ avant / après",
          value: `${d.spo2Before}% → ${d.spo2After}%`,
        },
        {
          key: locale === "en" ? "Reason" : "Motif",
          value: pickLocalizedEnumLabel(
            OXYGEN_TITRATION_REASON_MAP.en,
            OXYGEN_TITRATION_REASON_MAP.fr,
            d.reason,
            locale
          ),
        },
      ];
    }
    case NEBULIZER_REASSESSMENT_CARD_ID: {
      const p = nebulizerReassessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Medication referenced" : "Médicament référencé",
          value: pickLocalizedEnumLabel(
            NEBULIZER_MEDICATION_MAP.en,
            NEBULIZER_MEDICATION_MAP.fr,
            d.treatmentMedicationReferenced,
            locale
          ),
        },
        {
          key: locale === "en" ? "MAR documented" : "Documenté au MAR",
          value: clinicalDocYesNo(d.treatmentDocumentedInMar, locale),
        },
        {
          key: locale === "en" ? "RR / SpO₂" : "FR / SpO₂",
          value: `${d.respiratoryRate} / ${d.spo2}%`,
        },
        {
          key: locale === "en" ? "Improvement reported" : "Amélioration rapportée",
          value: clinicalDocYesNo(d.patientReportsImprovement, locale),
        },
        {
          key: locale === "en" ? "Adverse effect" : "Effet indésirable",
          value: clinicalDocYesNo(d.adverseEffectObserved, locale),
        },
      ];
    }
    case CPAP_BIPAP_MONITORING_CARD_ID: {
      const p = cpapBipapMonitoringPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      const lines: Array<{ key: string; value: string }> = [
        {
          key: locale === "en" ? "Mode / settings" : "Mode / réglages",
          value: `${pickLocalizedEnumLabel(CPAP_BIPAP_MODE_MAP.en, CPAP_BIPAP_MODE_MAP.fr, d.mode, locale)} — ${d.deviceSettingSummary}`,
        },
      ];
      if (d.fio2Percent != null) {
        lines.push({
          key: "FiO₂",
          value: `${d.fio2Percent}%`,
        });
      }
      lines.push(
        {
          key: locale === "en" ? "Tolerance" : "Tolérance",
          value: pickLocalizedEnumLabel(
            CPAP_TOLERANCE_MAP.en,
            CPAP_TOLERANCE_MAP.fr,
            d.patientTolerance,
            locale
          ),
        },
        {
          key: locale === "en" ? "Skin integrity" : "Intégrité cutanée",
          value: pickLocalizedEnumLabel(
            SKIN_INTEGRITY_MAP.en,
            SKIN_INTEGRITY_MAP.fr,
            d.skinIntegrity,
            locale
          ),
        }
      );
      return lines;
    }
    case RESPIRATORY_DISTRESS_REASSESSMENT_CARD_ID: {
      const p = respiratoryDistressReassessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "RR / SpO₂" : "FR / SpO₂",
          value: `${d.respiratoryRate} / ${d.spo2}%`,
        },
        {
          key: locale === "en" ? "Work of breathing" : "Travail respiratoire",
          value: pickLocalizedEnumLabel(
            WORK_OF_BREATHING_MAP.en,
            WORK_OF_BREATHING_MAP.fr,
            d.workOfBreathing,
            locale
          ),
        },
        {
          key: locale === "en" ? "Intervention" : "Intervention",
          value: pickLocalizedEnumLabel(
            INTERVENTION_MAP.en,
            INTERVENTION_MAP.fr,
            d.interventionPerformed,
            locale
          ),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: clinicalDocYesNo(d.providerNotified, locale),
        },
        {
          key: locale === "en" ? "Rapid response" : "Intervention rapide",
          value: clinicalDocYesNo(d.rapidResponseActivated, locale),
        },
      ];
    }
    case VENTILATOR_OBSERVATION_CARD_ID: {
      const p = ventilatorObservationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      const lines: Array<{ key: string; value: string }> = [
        {
          key: locale === "en" ? "Mode" : "Mode",
          value: pickLocalizedEnumLabel(
            VENTILATOR_MODE_MAP.en,
            VENTILATOR_MODE_MAP.fr,
            d.ventilatorMode,
            locale
          ),
        },
      ];
      const settings: string[] = [];
      if (d.fio2Percent != null) settings.push(`FiO₂ ${d.fio2Percent}%`);
      if (d.peep != null) settings.push(`PEEP ${d.peep}`);
      if (d.respiratoryRateObserved != null) {
        settings.push(
          locale === "en"
            ? `RR obs ${d.respiratoryRateObserved}`
            : `FR obs ${d.respiratoryRateObserved}`
        );
      }
      settings.push(`SpO₂ ${d.spo2}%`);
      if (settings.length > 0) {
        lines.push({
          key: locale === "en" ? "Parameters" : "Paramètres",
          value: settings.join(" · "),
        });
      }
      lines.push({
        key: locale === "en" ? "Alarm" : "Alarme",
        value: d.alarmObserved
          ? d.alarmDescription ?? (locale === "en" ? "Yes" : "Oui")
          : locale === "en"
            ? "None"
            : "Aucune",
      });
      lines.push({
        key: locale === "en" ? "RT notified" : "RT avisé",
        value: clinicalDocYesNo(d.rtNotified, locale),
      });
      return lines;
    }
    case PEAK_FLOW_DOCUMENTATION_CARD_ID: {
      const p = peakFlowDocumentationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      const lines: Array<{ key: string; value: string }> = [];
      if (d.preTreatmentPeakFlow != null) {
        lines.push({
          key: locale === "en" ? "Pre-treatment" : "Avant traitement",
          value: `${d.preTreatmentPeakFlow} L/min`,
        });
      }
      if (d.postTreatmentPeakFlow != null) {
        lines.push({
          key: locale === "en" ? "Post-treatment" : "Après traitement",
          value: `${d.postTreatmentPeakFlow} L/min`,
        });
      }
      if (d.personalBestKnown && d.personalBestValue != null) {
        lines.push({
          key: locale === "en" ? "Personal best" : "Meilleur personnel",
          value: `${d.personalBestValue} L/min`,
        });
      }
      lines.push({
        key: locale === "en" ? "Effort quality" : "Qualité de l'effort",
        value: pickLocalizedEnumLabel(
          EFFORT_QUALITY_MAP.en,
          EFFORT_QUALITY_MAP.fr,
          d.effortQuality,
          locale
        ),
      });
      return lines;
    }
    default:
      return [];
  }
}
