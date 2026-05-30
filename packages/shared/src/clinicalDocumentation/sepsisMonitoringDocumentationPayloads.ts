import { z } from "zod";
import type { ClinicalDocumentationFieldOption } from "./clinicalDocumentationFieldOptions.js";
import {
  pickLocalizedEnumLabel,
  type ClinicalDocumentationSummaryLocale,
} from "./clinicalDocumentationSummaryLocale.js";

/** EDOC.18 — sepsis monitoring & bundle documentation card IDs. */
export const SEPSIS_SCREENING_CARD_ID = "sepsis_screening" as const;
export const SIRS_ASSESSMENT_CARD_ID = "sirs_assessment" as const;
export const QSOFA_ASSESSMENT_CARD_ID = "qsofa_assessment" as const;
export const SUSPECTED_INFECTION_ASSESSMENT_CARD_ID = "suspected_infection_assessment" as const;
export const SEPSIS_BUNDLE_TRACKING_CARD_ID = "sepsis_bundle_tracking" as const;
export const LACTATE_MONITORING_CARD_ID = "lactate_monitoring" as const;
export const BLOOD_CULTURE_DOCUMENTATION_CARD_ID = "blood_culture_documentation" as const;
export const ANTIBIOTIC_TIMING_REFERENCE_CARD_ID = "antibiotic_timing_reference" as const;
export const FLUID_RESUSCITATION_MONITORING_CARD_ID = "fluid_resuscitation_monitoring" as const;
export const SEPTIC_SHOCK_REASSESSMENT_CARD_ID = "septic_shock_reassessment" as const;
export const SEPSIS_ESCALATION_EVENT_CARD_ID = "sepsis_escalation_event" as const;

export const EDOC18_SEPSIS_MONITORING_DOCUMENTATION_CARD_IDS = [
  SEPSIS_SCREENING_CARD_ID,
  SIRS_ASSESSMENT_CARD_ID,
  QSOFA_ASSESSMENT_CARD_ID,
  SUSPECTED_INFECTION_ASSESSMENT_CARD_ID,
  SEPSIS_BUNDLE_TRACKING_CARD_ID,
  LACTATE_MONITORING_CARD_ID,
  BLOOD_CULTURE_DOCUMENTATION_CARD_ID,
  ANTIBIOTIC_TIMING_REFERENCE_CARD_ID,
  FLUID_RESUSCITATION_MONITORING_CARD_ID,
  SEPTIC_SHOCK_REASSESSMENT_CARD_ID,
  SEPSIS_ESCALATION_EVENT_CARD_ID,
] as const;

export type Edoc18SepsisMonitoringDocumentationCardId =
  (typeof EDOC18_SEPSIS_MONITORING_DOCUMENTATION_CARD_IDS)[number];

/**
 * Future Phase — EDOC.18A Sepsis Alert & Bundle Automation
 * Do not implement automatic alerts now.
 */
export const EDOC_18A_FUTURE_SEPSIS_ALERT_BUNDLE_AUTOMATION = "EDOC.18A" as const;

/** Lactate threshold (mmol/L) requiring provider notification — documentation support only. */
export const SEPSIS_LACTATE_PROVIDER_NOTIFICATION_THRESHOLD_MMOL_L = 2;

/** Lactate threshold (mmol/L) elevating repeat-lactate concern — documentation support only. */
export const SEPSIS_LACTATE_REPEAT_CONCERN_THRESHOLD_MMOL_L = 4;

export const SEPSIS_YES_NO_VALUES = ["YES", "NO"] as const;

export const SEPSIS_YES_NO_UNKNOWN_VALUES = ["YES", "NO", "UNKNOWN"] as const;

export const SEPSIS_YES_NO_NOT_APPLICABLE_VALUES = ["YES", "NO", "NOT_APPLICABLE"] as const;

export const SEPSIS_SUSPECTED_SOURCE_VALUES = [
  "RESPIRATORY",
  "URINARY",
  "ABDOMINAL",
  "SKIN_SOFT_TISSUE",
  "CNS",
  "BLOODSTREAM",
  "UNKNOWN",
  "OTHER",
] as const;

export const SEPSIS_BUNDLE_TYPE_VALUES = [
  "ONE_HOUR",
  "THREE_HOUR",
  "SIX_HOUR",
  "FACILITY_POLICY",
] as const;

export const SEPSIS_LACTATE_UNIT_VALUES = ["MMOL_L", "UNKNOWN"] as const;

export const SEPSIS_FLUID_TYPE_VALUES = [
  "NORMAL_SALINE",
  "LACTATED_RINGERS",
  "OTHER",
  "UNKNOWN",
] as const;

export const SEPSIS_BLOOD_PRESSURE_RESPONSE_VALUES = [
  "IMPROVED",
  "UNCHANGED",
  "WORSENED",
  "UNKNOWN",
] as const;

export const SEPSIS_ESCALATION_REASON_VALUES = [
  "SCREEN_POSITIVE",
  "SIRS_POSITIVE",
  "QSOFA_POSITIVE",
  "LACTATE_ELEVATED",
  "HYPOTENSION",
  "ANTIBIOTIC_DELAY",
  "BUNDLE_VARIANCE",
  "SEPTIC_SHOCK_CONCERN",
  "OTHER",
] as const;

const optionalNotes = z.string().trim().max(2000).optional();
const optionalText = z.string().trim().max(200).optional();
const isoDateTimeString = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date/time" });
const optionalIsoDateTime = z
  .string()
  .trim()
  .max(40)
  .refine((s) => s === "" || !Number.isNaN(Date.parse(s)), { message: "Invalid date/time" })
  .optional()
  .transform((s) => (s?.trim() ? s.trim() : undefined));

const sepsisYesNo = z.enum(SEPSIS_YES_NO_VALUES);
const sepsisYesNoUnknown = z.enum(SEPSIS_YES_NO_UNKNOWN_VALUES);
const sepsisYesNoNotApplicable = z.enum(SEPSIS_YES_NO_NOT_APPLICABLE_VALUES);
const criteriaCount0to4 = z.coerce.number().int().min(0).max(4);
const qsofaScore0to3 = z.coerce.number().int().min(0).max(3);
const lactateValueMmol = z.coerce.number().min(0).max(30);
const cultureSets = z.coerce.number().int().min(1).max(10);
const volumeMl = z.coerce.number().min(0).max(50000);
const weightKg = z.coerce.number().min(0).max(500);
const targetVolumeMl = z.coerce.number().min(0).max(50000);

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

function labelMap<T extends string>(options: ClinicalDocumentationFieldOption<T>[]) {
  return {
    en: Object.fromEntries(options.map((o) => [o.value, o.labelEn])),
    fr: Object.fromEntries(options.map((o) => [o.value, o.labelFr])),
  };
}

export function sepsisDocYesNoLabel(
  value: (typeof SEPSIS_YES_NO_VALUES)[number],
  locale: ClinicalDocumentationSummaryLocale
): string {
  return value === "YES"
    ? locale === "en"
      ? "Yes"
      : "Oui"
    : locale === "en"
      ? "No"
      : "Non";
}

export const SEPSIS_YES_NO_OPTIONS = enumOptions(SEPSIS_YES_NO_VALUES, {
  YES: { en: "Yes", fr: "Oui" },
  NO: { en: "No", fr: "Non" },
});

export const SEPSIS_YES_NO_UNKNOWN_OPTIONS = enumOptions(SEPSIS_YES_NO_UNKNOWN_VALUES, {
  YES: { en: "Yes", fr: "Oui" },
  NO: { en: "No", fr: "Non" },
  UNKNOWN: { en: "Unknown", fr: "Inconnu" },
});

export const SEPSIS_YES_NO_NOT_APPLICABLE_OPTIONS = enumOptions(SEPSIS_YES_NO_NOT_APPLICABLE_VALUES, {
  YES: { en: "Yes", fr: "Oui" },
  NO: { en: "No", fr: "Non" },
  NOT_APPLICABLE: { en: "Not applicable", fr: "Non applicable" },
});

export const SEPSIS_SUSPECTED_SOURCE_OPTIONS = enumOptions(SEPSIS_SUSPECTED_SOURCE_VALUES, {
  RESPIRATORY: { en: "Respiratory", fr: "Respiratoire" },
  URINARY: { en: "Urinary", fr: "Urinaire" },
  ABDOMINAL: { en: "Abdominal", fr: "Abdominal" },
  SKIN_SOFT_TISSUE: { en: "Skin / soft tissue", fr: "Peau / tissus mous" },
  CNS: { en: "CNS", fr: "SNC" },
  BLOODSTREAM: { en: "Bloodstream", fr: "Sanguin" },
  UNKNOWN: { en: "Unknown", fr: "Inconnu" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const SEPSIS_BUNDLE_TYPE_OPTIONS = enumOptions(SEPSIS_BUNDLE_TYPE_VALUES, {
  ONE_HOUR: { en: "1-hour bundle", fr: "Bundle 1 h" },
  THREE_HOUR: { en: "3-hour bundle", fr: "Bundle 3 h" },
  SIX_HOUR: { en: "6-hour bundle", fr: "Bundle 6 h" },
  FACILITY_POLICY: { en: "Facility policy", fr: "Politique établissement" },
});

export const SEPSIS_LACTATE_UNIT_OPTIONS = enumOptions(SEPSIS_LACTATE_UNIT_VALUES, {
  MMOL_L: { en: "mmol/L", fr: "mmol/L" },
  UNKNOWN: { en: "Unknown", fr: "Inconnu" },
});

export const SEPSIS_FLUID_TYPE_OPTIONS = enumOptions(SEPSIS_FLUID_TYPE_VALUES, {
  NORMAL_SALINE: { en: "Normal saline", fr: "NaCl 0,9 %" },
  LACTATED_RINGERS: { en: "Lactated Ringer's", fr: "Ringer lactate" },
  OTHER: { en: "Other", fr: "Autre" },
  UNKNOWN: { en: "Unknown", fr: "Inconnu" },
});

export const SEPSIS_BLOOD_PRESSURE_RESPONSE_OPTIONS = enumOptions(SEPSIS_BLOOD_PRESSURE_RESPONSE_VALUES, {
  IMPROVED: { en: "Improved", fr: "Améliorée" },
  UNCHANGED: { en: "Unchanged", fr: "Inchangée" },
  WORSENED: { en: "Worsened", fr: "Détériorée" },
  UNKNOWN: { en: "Unknown", fr: "Inconnu" },
});

export const SEPSIS_ESCALATION_REASON_OPTIONS = enumOptions(SEPSIS_ESCALATION_REASON_VALUES, {
  SCREEN_POSITIVE: { en: "Screen positive", fr: "Dépistage positif" },
  SIRS_POSITIVE: { en: "SIRS criteria met", fr: "Critères SIRS remplis" },
  QSOFA_POSITIVE: { en: "qSOFA positive", fr: "qSOFA positif" },
  LACTATE_ELEVATED: { en: "Elevated lactate", fr: "Lactate élevé" },
  HYPOTENSION: { en: "Hypotension", fr: "Hypotension" },
  ANTIBIOTIC_DELAY: { en: "Antibiotic delay", fr: "Retard antibiotique" },
  BUNDLE_VARIANCE: { en: "Bundle variance", fr: "Écart bundle" },
  SEPTIC_SHOCK_CONCERN: { en: "Septic shock concern", fr: "Préoccupation choc septique" },
  OTHER: { en: "Other", fr: "Autre" },
});

const SEPSIS_SOURCE_MAP = labelMap(SEPSIS_SUSPECTED_SOURCE_OPTIONS);
const SEPSIS_BUNDLE_TYPE_MAP = labelMap(SEPSIS_BUNDLE_TYPE_OPTIONS);
const SEPSIS_BP_RESPONSE_MAP = labelMap(SEPSIS_BLOOD_PRESSURE_RESPONSE_OPTIONS);
const SEPSIS_ESCALATION_REASON_MAP = labelMap(SEPSIS_ESCALATION_REASON_OPTIONS);

function requireProviderNotified(
  data: { providerNotified: (typeof SEPSIS_YES_NO_VALUES)[number] },
  ctx: z.RefinementCtx,
  message: string
) {
  if (data.providerNotified !== "YES") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message,
      path: ["providerNotified"],
    });
  }
}

function countYesCriteria(
  ...values: Array<(typeof SEPSIS_YES_NO_VALUES)[number] | (typeof SEPSIS_YES_NO_UNKNOWN_VALUES)[number]>
): number {
  return values.filter((v) => v === "YES").length;
}

/** Count SIRS criteria marked YES (WBC UNKNOWN does not count). */
export function calculateSirsCriteriaCount(input: {
  temperatureCriteriaMet: (typeof SEPSIS_YES_NO_VALUES)[number];
  heartRateCriteriaMet: (typeof SEPSIS_YES_NO_VALUES)[number];
  respiratoryCriteriaMet: (typeof SEPSIS_YES_NO_VALUES)[number];
  wbcCriteriaMet: (typeof SEPSIS_YES_NO_UNKNOWN_VALUES)[number];
}): number {
  return countYesCriteria(
    input.temperatureCriteriaMet,
    input.heartRateCriteriaMet,
    input.respiratoryCriteriaMet,
    input.wbcCriteriaMet
  );
}

/** Returns YES when criteria count meets SIRS threshold (>= 2) — not a sepsis diagnosis. */
export function deriveSirsPositive(criteriaCount: number): (typeof SEPSIS_YES_NO_VALUES)[number] {
  return criteriaCount >= 2 ? "YES" : "NO";
}

/** Count qSOFA criteria marked YES. */
export function calculateQsofaScore(input: {
  respiratoryRateHigh: (typeof SEPSIS_YES_NO_VALUES)[number];
  alteredMentation: (typeof SEPSIS_YES_NO_VALUES)[number];
  systolicBpLow: (typeof SEPSIS_YES_NO_VALUES)[number];
}): number {
  return countYesCriteria(
    input.respiratoryRateHigh,
    input.alteredMentation,
    input.systolicBpLow
  );
}

/** Returns YES when qSOFA score >= 2 — screening support only, not a diagnosis. */
export function deriveQsofaPositive(score: number): (typeof SEPSIS_YES_NO_VALUES)[number] {
  return score >= 2 ? "YES" : "NO";
}

/**
 * Screening support indicator: suspected infection plus >= 2 abnormal findings.
 * Does not diagnose sepsis — for documentation/UI support only.
 */
export function deriveSepsisScreenPositive(input: {
  suspectedInfection: (typeof SEPSIS_YES_NO_UNKNOWN_VALUES)[number];
  temperatureAbnormal: (typeof SEPSIS_YES_NO_VALUES)[number];
  heartRateAbnormal: (typeof SEPSIS_YES_NO_VALUES)[number];
  respiratoryRateAbnormal: (typeof SEPSIS_YES_NO_VALUES)[number];
  wbcAbnormalOrUnknown: (typeof SEPSIS_YES_NO_UNKNOWN_VALUES)[number];
  alteredMentalStatus: (typeof SEPSIS_YES_NO_VALUES)[number];
  hypotensionPresent: (typeof SEPSIS_YES_NO_VALUES)[number];
  lactateConcern: (typeof SEPSIS_YES_NO_UNKNOWN_VALUES)[number];
}): (typeof SEPSIS_YES_NO_VALUES)[number] {
  if (input.suspectedInfection !== "YES") return "NO";
  const abnormalCount = countYesCriteria(
    input.temperatureAbnormal,
    input.heartRateAbnormal,
    input.respiratoryRateAbnormal,
    input.alteredMentalStatus,
    input.hypotensionPresent
  );
  const wbcConcern = input.wbcAbnormalOrUnknown === "YES" ? 1 : 0;
  const lactateConcern = input.lactateConcern === "YES" ? 1 : 0;
  return abnormalCount + wbcConcern + lactateConcern >= 2 ? "YES" : "NO";
}

export const sepsisScreeningPayloadSchema = z
  .object({
    screeningTime: isoDateTimeString,
    suspectedInfection: sepsisYesNoUnknown,
    temperatureAbnormal: sepsisYesNo,
    heartRateAbnormal: sepsisYesNo,
    respiratoryRateAbnormal: sepsisYesNo,
    wbcAbnormalOrUnknown: sepsisYesNoUnknown,
    alteredMentalStatus: sepsisYesNo,
    hypotensionPresent: sepsisYesNo,
    lactateConcern: sepsisYesNoUnknown,
    screenPositive: sepsisYesNo,
    providerNotified: sepsisYesNo,
    providerNotificationTime: optionalIsoDateTime,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.screenPositive === "YES") {
      requireProviderNotified(data, ctx, "Provider notification required for positive screen");
      if (!data.providerNotificationTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Provider notification time required for positive screen",
          path: ["providerNotificationTime"],
        });
      }
    }
  });

export const sirsAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    temperatureCriteriaMet: sepsisYesNo,
    heartRateCriteriaMet: sepsisYesNo,
    respiratoryCriteriaMet: sepsisYesNo,
    wbcCriteriaMet: sepsisYesNoUnknown,
    criteriaCount: criteriaCount0to4,
    sirsPositive: sepsisYesNo,
    providerNotified: sepsisYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    const calculated = calculateSirsCriteriaCount(data);
    if (data.criteriaCount !== calculated) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Criteria count must match number of YES criteria",
        path: ["criteriaCount"],
      });
    }
    const derived = deriveSirsPositive(data.criteriaCount);
    if (data.sirsPositive !== derived) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SIRS positive must match criteria count (>= 2)",
        path: ["sirsPositive"],
      });
    }
    if (data.sirsPositive === "YES") {
      requireProviderNotified(data, ctx, "Provider notification required when SIRS criteria met");
    }
  });

export const qsofaAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    respiratoryRateHigh: sepsisYesNo,
    alteredMentation: sepsisYesNo,
    systolicBpLow: sepsisYesNo,
    score: qsofaScore0to3,
    qsofaPositive: sepsisYesNo,
    providerNotified: sepsisYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    const calculated = calculateQsofaScore(data);
    if (data.score !== calculated) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Score must equal number of YES qSOFA criteria",
        path: ["score"],
      });
    }
    const derived = deriveQsofaPositive(data.score);
    if (data.qsofaPositive !== derived) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "qSOFA positive must match score (>= 2)",
        path: ["qsofaPositive"],
      });
    }
    if (data.qsofaPositive === "YES") {
      requireProviderNotified(data, ctx, "Provider notification required for positive qSOFA");
    }
  });

export const suspectedInfectionAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    suspectedSource: z.enum(SEPSIS_SUSPECTED_SOURCE_VALUES),
    infectionSignsPresent: sepsisYesNo,
    culturesConsidered: sepsisYesNo,
    providerNotified: sepsisYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.infectionSignsPresent === "YES" && data.suspectedSource !== "UNKNOWN") {
      requireProviderNotified(
        data,
        ctx,
        "Provider notification required when infection signs present with identified source"
      );
    }
  });

export const sepsisBundleTrackingPayloadSchema = z
  .object({
    bundleStartTime: isoDateTimeString,
    bundleType: z.enum(SEPSIS_BUNDLE_TYPE_VALUES),
    lactateOrderedOrResulted: sepsisYesNo,
    bloodCulturesBeforeAntibiotics: sepsisYesNoUnknown,
    antibioticsDocumentedInMar: sepsisYesNo,
    fluidsOrderedOrStarted: sepsisYesNo,
    vasopressorsOrderedOrStarted: sepsisYesNoNotApplicable,
    providerNotified: sepsisYesNo,
    bundleVariancePresent: sepsisYesNo,
    varianceReason: optionalText,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.bundleVariancePresent === "YES" && !data.varianceReason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Variance reason required when bundle variance present",
        path: ["varianceReason"],
      });
    }
  });

export const lactateMonitoringPayloadSchema = z
  .object({
    documentedAt: isoDateTimeString,
    lactateValue: lactateValueMmol.optional(),
    lactateUnit: z.enum(SEPSIS_LACTATE_UNIT_VALUES),
    lactateResultAvailable: sepsisYesNo,
    repeatLactateNeeded: sepsisYesNoUnknown,
    providerNotified: sepsisYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.lactateResultAvailable === "YES" && data.lactateValue === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Lactate value required when result available",
        path: ["lactateValue"],
      });
    }
    if (
      data.lactateValue !== undefined &&
      data.lactateValue >= SEPSIS_LACTATE_PROVIDER_NOTIFICATION_THRESHOLD_MMOL_L
    ) {
      requireProviderNotified(data, ctx, "Provider notification required for elevated lactate");
    }
    if (
      data.lactateValue !== undefined &&
      data.lactateValue >= SEPSIS_LACTATE_REPEAT_CONCERN_THRESHOLD_MMOL_L &&
      data.repeatLactateNeeded !== "YES" &&
      !data.notes?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Repeat lactate or notes required when lactate >= 4 mmol/L",
        path: ["repeatLactateNeeded"],
      });
    }
  });

export const bloodCultureDocumentationPayloadSchema = z
  .object({
    documentedAt: isoDateTimeString,
    culturesCollected: sepsisYesNo,
    collectionTime: optionalIsoDateTime,
    numberOfSets: cultureSets.optional(),
    collectedBeforeAntibiotics: sepsisYesNoUnknown,
    collectionSite: optionalText,
    providerNotified: sepsisYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.culturesCollected === "YES") {
      if (!data.collectionTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Collection time required when cultures collected",
          path: ["collectionTime"],
        });
      }
      if (data.numberOfSets === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Number of sets required when cultures collected",
          path: ["numberOfSets"],
        });
      }
    }
  });

export const antibioticTimingReferencePayloadSchema = z
  .object({
    documentedAt: isoDateTimeString,
    antibioticsDocumentedInMar: sepsisYesNo,
    firstAntibioticTime: optionalIsoDateTime,
    antibioticNameReferenced: optionalText,
    providerNotified: sepsisYesNo,
    delayOrVariancePresent: sepsisYesNo,
    varianceReason: optionalText,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.antibioticsDocumentedInMar === "YES" && !data.firstAntibioticTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "First antibiotic time required when documented in MAR",
        path: ["firstAntibioticTime"],
      });
    }
    if (data.delayOrVariancePresent === "YES" && !data.varianceReason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Variance reason required when delay or variance present",
        path: ["varianceReason"],
      });
    }
  });

export const fluidResuscitationMonitoringPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    fluidBolusOrderedOrStarted: sepsisYesNo,
    fluidType: z.enum(SEPSIS_FLUID_TYPE_VALUES),
    volumeMl: volumeMl.optional(),
    weightKg: weightKg.optional(),
    targetVolumeMl: targetVolumeMl.optional(),
    thirtyMlPerKgTargetConsidered: sepsisYesNoNotApplicable,
    bloodPressureResponse: z.enum(SEPSIS_BLOOD_PRESSURE_RESPONSE_VALUES),
    providerNotified: sepsisYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.fluidBolusOrderedOrStarted === "YES" && data.volumeMl === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Volume required when fluid bolus ordered or started",
        path: ["volumeMl"],
      });
    }
  });

export const septicShockReassessmentPayloadSchema = z
  .object({
    reassessmentTime: isoDateTimeString,
    hypotensionPersistent: sepsisYesNo,
    lactateFourOrGreater: sepsisYesNoUnknown,
    vasopressorsStartedOrOrdered: sepsisYesNoNotApplicable,
    mentalStatusChanged: sepsisYesNo,
    urineOutputConcern: sepsisYesNoUnknown,
    providerAtBedside: sepsisYesNo,
    providerNotified: sepsisYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.hypotensionPersistent === "YES" || data.mentalStatusChanged === "YES") {
      requireProviderNotified(
        data,
        ctx,
        "Provider notification required for persistent hypotension or mental status change"
      );
    }
  });

export const sepsisEscalationEventPayloadSchema = z
  .object({
    eventTime: isoDateTimeString,
    reason: z.enum(SEPSIS_ESCALATION_REASON_VALUES),
    providerNotified: sepsisYesNo,
    providerNotificationTime: isoDateTimeString,
    responseReceived: sepsisYesNo,
    responseTime: optionalIsoDateTime,
    rapidResponseActivated: sepsisYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    requireProviderNotified(data, ctx, "Provider notification required for sepsis escalation");
    if (!data.providerNotificationTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification time required",
        path: ["providerNotificationTime"],
      });
    }
  });

const PAYLOAD_SCHEMA_BY_CARD_ID: Record<Edoc18SepsisMonitoringDocumentationCardId, z.ZodTypeAny> = {
  [SEPSIS_SCREENING_CARD_ID]: sepsisScreeningPayloadSchema,
  [SIRS_ASSESSMENT_CARD_ID]: sirsAssessmentPayloadSchema,
  [QSOFA_ASSESSMENT_CARD_ID]: qsofaAssessmentPayloadSchema,
  [SUSPECTED_INFECTION_ASSESSMENT_CARD_ID]: suspectedInfectionAssessmentPayloadSchema,
  [SEPSIS_BUNDLE_TRACKING_CARD_ID]: sepsisBundleTrackingPayloadSchema,
  [LACTATE_MONITORING_CARD_ID]: lactateMonitoringPayloadSchema,
  [BLOOD_CULTURE_DOCUMENTATION_CARD_ID]: bloodCultureDocumentationPayloadSchema,
  [ANTIBIOTIC_TIMING_REFERENCE_CARD_ID]: antibioticTimingReferencePayloadSchema,
  [FLUID_RESUSCITATION_MONITORING_CARD_ID]: fluidResuscitationMonitoringPayloadSchema,
  [SEPTIC_SHOCK_REASSESSMENT_CARD_ID]: septicShockReassessmentPayloadSchema,
  [SEPSIS_ESCALATION_EVENT_CARD_ID]: sepsisEscalationEventPayloadSchema,
};

export function isEdoc18SepsisMonitoringDocumentationCardId(
  cardId: string
): cardId is Edoc18SepsisMonitoringDocumentationCardId {
  return (EDOC18_SEPSIS_MONITORING_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId);
}

export function validateSepsisMonitoringDocumentationPayloadForCard(
  cardId: string,
  payload: Record<string, unknown>
): { ok: true; data: Record<string, unknown> } | { ok: false; message: string } {
  if (!isEdoc18SepsisMonitoringDocumentationCardId(cardId)) {
    return { ok: false, message: "Card is not available for structured save" };
  }
  const schema = PAYLOAD_SCHEMA_BY_CARD_ID[cardId];
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: "Invalid clinical documentation payload" };
  }
  return { ok: true, data: parsed.data as Record<string, unknown> };
}

export function summarizeSepsisMonitoringDocumentationPayload(
  cardId: string,
  payload: Record<string, unknown>,
  locale: ClinicalDocumentationSummaryLocale
): Array<{ key: string; value: string }> {
  switch (cardId) {
    case SEPSIS_SCREENING_CARD_ID: {
      const p = sepsisScreeningPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Screen positive" : "Dépistage positif",
          value: sepsisDocYesNoLabel(d.screenPositive, locale),
        },
        {
          key: locale === "en" ? "Suspected infection" : "Infection suspectée",
          value: pickLocalizedEnumLabel(
            { YES: "Yes", NO: "No", UNKNOWN: "Unknown" },
            { YES: "Oui", NO: "Non", UNKNOWN: "Inconnu" },
            d.suspectedInfection,
            locale
          ),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: sepsisDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case SIRS_ASSESSMENT_CARD_ID: {
      const p = sirsAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Criteria count" : "Nombre de critères",
          value: String(d.criteriaCount),
        },
        {
          key: locale === "en" ? "SIRS criteria met" : "Critères SIRS remplis",
          value: sepsisDocYesNoLabel(d.sirsPositive, locale),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: sepsisDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case QSOFA_ASSESSMENT_CARD_ID: {
      const p = qsofaAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Score" : "Score",
          value: String(d.score),
        },
        {
          key: locale === "en" ? "qSOFA positive" : "qSOFA positif",
          value: sepsisDocYesNoLabel(d.qsofaPositive, locale),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: sepsisDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case SUSPECTED_INFECTION_ASSESSMENT_CARD_ID: {
      const p = suspectedInfectionAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Suspected source" : "Source suspectée",
          value: pickLocalizedEnumLabel(
            SEPSIS_SOURCE_MAP.en,
            SEPSIS_SOURCE_MAP.fr,
            d.suspectedSource,
            locale
          ),
        },
        {
          key: locale === "en" ? "Infection signs" : "Signes d'infection",
          value: sepsisDocYesNoLabel(d.infectionSignsPresent, locale),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: sepsisDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case SEPSIS_BUNDLE_TRACKING_CARD_ID: {
      const p = sepsisBundleTrackingPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Bundle type" : "Type de bundle",
          value: pickLocalizedEnumLabel(
            SEPSIS_BUNDLE_TYPE_MAP.en,
            SEPSIS_BUNDLE_TYPE_MAP.fr,
            d.bundleType,
            locale
          ),
        },
        {
          key: locale === "en" ? "Lactate" : "Lactate",
          value: sepsisDocYesNoLabel(d.lactateOrderedOrResulted, locale),
        },
        {
          key: locale === "en" ? "Cultures before antibiotics" : "Hémocultures avant ATB",
          value: pickLocalizedEnumLabel(
            { YES: "Yes", NO: "No", UNKNOWN: "Unknown" },
            { YES: "Oui", NO: "Non", UNKNOWN: "Inconnu" },
            d.bloodCulturesBeforeAntibiotics,
            locale
          ),
        },
        {
          key: locale === "en" ? "Antibiotics in MAR" : "Antibiotiques au MAR",
          value: sepsisDocYesNoLabel(d.antibioticsDocumentedInMar, locale),
        },
        {
          key: locale === "en" ? "Variance" : "Écart",
          value: sepsisDocYesNoLabel(d.bundleVariancePresent, locale),
        },
      ];
    }
    case LACTATE_MONITORING_CARD_ID: {
      const p = lactateMonitoringPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Lactate value" : "Valeur lactate",
          value:
            d.lactateValue !== undefined ? `${d.lactateValue} mmol/L` : locale === "en" ? "N/A" : "N/D",
        },
        {
          key: locale === "en" ? "Repeat needed" : "Répétition nécessaire",
          value: pickLocalizedEnumLabel(
            { YES: "Yes", NO: "No", UNKNOWN: "Unknown" },
            { YES: "Oui", NO: "Non", UNKNOWN: "Inconnu" },
            d.repeatLactateNeeded,
            locale
          ),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: sepsisDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case BLOOD_CULTURE_DOCUMENTATION_CARD_ID: {
      const p = bloodCultureDocumentationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Cultures collected" : "Hémocultures prélevées",
          value: sepsisDocYesNoLabel(d.culturesCollected, locale),
        },
        {
          key: locale === "en" ? "Sets" : "Séries",
          value: d.numberOfSets !== undefined ? String(d.numberOfSets) : "—",
        },
        {
          key: locale === "en" ? "Before antibiotics" : "Avant antibiotiques",
          value: pickLocalizedEnumLabel(
            { YES: "Yes", NO: "No", UNKNOWN: "Unknown" },
            { YES: "Oui", NO: "Non", UNKNOWN: "Inconnu" },
            d.collectedBeforeAntibiotics,
            locale
          ),
        },
      ];
    }
    case ANTIBIOTIC_TIMING_REFERENCE_CARD_ID: {
      const p = antibioticTimingReferencePayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Documented in MAR" : "Documenté au MAR",
          value: sepsisDocYesNoLabel(d.antibioticsDocumentedInMar, locale),
        },
        {
          key: locale === "en" ? "Delay/variance" : "Retard/écart",
          value: sepsisDocYesNoLabel(d.delayOrVariancePresent, locale),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: sepsisDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case FLUID_RESUSCITATION_MONITORING_CARD_ID: {
      const p = fluidResuscitationMonitoringPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Volume" : "Volume",
          value: d.volumeMl !== undefined ? `${d.volumeMl} mL` : "—",
        },
        {
          key: locale === "en" ? "BP response" : "Réponse PA",
          value: pickLocalizedEnumLabel(
            SEPSIS_BP_RESPONSE_MAP.en,
            SEPSIS_BP_RESPONSE_MAP.fr,
            d.bloodPressureResponse,
            locale
          ),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: sepsisDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case SEPTIC_SHOCK_REASSESSMENT_CARD_ID: {
      const p = septicShockReassessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Persistent hypotension" : "Hypotension persistante",
          value: sepsisDocYesNoLabel(d.hypotensionPersistent, locale),
        },
        {
          key: locale === "en" ? "Mental status changed" : "État mental modifié",
          value: sepsisDocYesNoLabel(d.mentalStatusChanged, locale),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: sepsisDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case SEPSIS_ESCALATION_EVENT_CARD_ID: {
      const p = sepsisEscalationEventPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Reason" : "Motif",
          value: pickLocalizedEnumLabel(
            SEPSIS_ESCALATION_REASON_MAP.en,
            SEPSIS_ESCALATION_REASON_MAP.fr,
            d.reason,
            locale
          ),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: sepsisDocYesNoLabel(d.providerNotified, locale),
        },
        {
          key: locale === "en" ? "Response received" : "Réponse reçue",
          value: sepsisDocYesNoLabel(d.responseReceived, locale),
        },
      ];
    }
    default:
      return [];
  }
}
