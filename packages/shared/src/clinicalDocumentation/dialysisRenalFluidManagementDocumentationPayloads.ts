import { z } from "zod";
import type { ClinicalDocumentationFieldOption } from "./clinicalDocumentationFieldOptions.js";
import {
  pickLocalizedEnumLabel,
  type ClinicalDocumentationSummaryLocale,
} from "./clinicalDocumentationSummaryLocale.js";

/** EDOC.21 — dialysis, renal monitoring & fluid management card IDs. */
export const DIALYSIS_ACCESS_ASSESSMENT_CARD_ID = "dialysis_access_assessment" as const;
export const HEMODIALYSIS_MONITORING_REFERENCE_CARD_ID = "hemodialysis_monitoring_reference" as const;
export const PERITONEAL_DIALYSIS_MONITORING_REFERENCE_CARD_ID =
  "peritoneal_dialysis_monitoring_reference" as const;
export const CRRT_MONITORING_REFERENCE_CARD_ID = "crrt_monitoring_reference" as const;
export const RENAL_INTAKE_OUTPUT_REVIEW_CARD_ID = "renal_intake_output_review" as const;
export const FLUID_RESTRICTION_MONITORING_CARD_ID = "fluid_restriction_monitoring" as const;
export const DAILY_WEIGHT_EDEMA_MONITORING_CARD_ID = "daily_weight_edema_monitoring" as const;
export const URINE_OUTPUT_CONCERN_CARD_ID = "urine_output_concern" as const;
export const RENAL_MEDICATION_SAFETY_REVIEW_CARD_ID = "renal_medication_safety_review" as const;
export const RENAL_ESCALATION_EVENT_CARD_ID = "renal_escalation_event" as const;

export const EDOC21_DIALYSIS_RENAL_FLUID_MANAGEMENT_DOCUMENTATION_CARD_IDS = [
  DIALYSIS_ACCESS_ASSESSMENT_CARD_ID,
  HEMODIALYSIS_MONITORING_REFERENCE_CARD_ID,
  PERITONEAL_DIALYSIS_MONITORING_REFERENCE_CARD_ID,
  CRRT_MONITORING_REFERENCE_CARD_ID,
  RENAL_INTAKE_OUTPUT_REVIEW_CARD_ID,
  FLUID_RESTRICTION_MONITORING_CARD_ID,
  DAILY_WEIGHT_EDEMA_MONITORING_CARD_ID,
  URINE_OUTPUT_CONCERN_CARD_ID,
  RENAL_MEDICATION_SAFETY_REVIEW_CARD_ID,
  RENAL_ESCALATION_EVENT_CARD_ID,
] as const;

export type Edoc21DialysisRenalFluidManagementDocumentationCardId =
  (typeof EDOC21_DIALYSIS_RENAL_FLUID_MANAGEMENT_DOCUMENTATION_CARD_IDS)[number];

/** Future Phase — EDOC.21A Renal Escalation Automation & Nephrology Workflow Integration */
export const EDOC_21A_FUTURE_RENAL_ESCALATION_AUTOMATION = "EDOC.21A" as const;

/** Decimal tolerance for net balance and weight change validation. */
export const RENAL_DECIMAL_TOLERANCE = 0.01;

export const RENAL_YES_NO_VALUES = ["YES", "NO"] as const;
export const RENAL_YES_NO_UNKNOWN_VALUES = ["YES", "NO", "UNKNOWN"] as const;
export const RENAL_YES_NO_NA_VALUES = ["YES", "NO", "NOT_APPLICABLE"] as const;
export const RENAL_YES_NO_UNKNOWN_NA_VALUES = ["YES", "NO", "UNKNOWN", "NOT_APPLICABLE"] as const;

export const RENAL_ACCESS_TYPE_VALUES = [
  "AV_FISTULA",
  "AV_GRAFT",
  "TUNNELED_CATHETER",
  "TEMPORARY_DIALYSIS_CATHETER",
  "PERITONEAL_DIALYSIS_CATHETER",
  "UNKNOWN",
  "OTHER",
] as const;

export const RENAL_ACCESS_LOCATION_VALUES = [
  "LEFT_ARM",
  "RIGHT_ARM",
  "LEFT_CHEST",
  "RIGHT_CHEST",
  "ABDOMEN",
  "GROIN",
  "OTHER",
  "UNKNOWN",
] as const;

export const RENAL_SITE_STATUS_VALUES = [
  "NORMAL",
  "REDNESS",
  "DRAINAGE",
  "SWELLING",
  "BLEEDING",
  "PAIN",
  "OTHER",
] as const;

export const RENAL_DRESSING_STATUS_VALUES = [
  "CLEAN_DRY_INTACT",
  "LOOSE",
  "SOILED",
  "MISSING",
  "NOT_APPLICABLE",
] as const;

export const RENAL_HEMODIALYSIS_STATUS_VALUES = [
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "HELD",
  "MISSED",
  "TRANSFERRED_FOR_DIALYSIS",
  "UNKNOWN",
] as const;

export const RENAL_PD_STATUS_VALUES = [
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "HELD",
  "MISSED",
  "UNKNOWN",
] as const;

export const RENAL_EFFLUENT_APPEARANCE_VALUES = [
  "CLEAR",
  "CLOUDY",
  "BLOODY",
  "FIBRIN_PRESENT",
  "UNKNOWN",
  "NOT_APPLICABLE",
] as const;

export const RENAL_CRRT_STATUS_VALUES = [
  "IN_PROGRESS",
  "PAUSED",
  "STOPPED",
  "CLOTTED",
  "TRANSFERRED",
  "UNKNOWN",
] as const;

export const RENAL_CRRT_ACCESS_STATUS_VALUES = [
  "PATENT",
  "POOR_FLOW",
  "CLOTTED",
  "DISLODGEMENT_CONCERN",
  "UNKNOWN",
] as const;

export const RENAL_REVIEW_PERIOD_VALUES = ["SHIFT", "TWENTY_FOUR_HOUR", "CUSTOM"] as const;

export const RENAL_EDEMA_LOCATION_VALUES = [
  "NONE",
  "LOWER_EXTREMITIES",
  "UPPER_EXTREMITIES",
  "GENERALIZED",
  "PULMONARY_EDEMA_CONCERN",
  "OTHER",
] as const;

export const RENAL_EDEMA_SEVERITY_VALUES = [
  "NONE",
  "TRACE",
  "ONE_PLUS",
  "TWO_PLUS",
  "THREE_PLUS",
  "FOUR_PLUS",
] as const;

export const RENAL_URINE_CONCERN_TYPE_VALUES = [
  "OLIGURIA",
  "ANURIA",
  "POLYURIA",
  "HEMATURIA",
  "RETENTION",
  "OTHER",
] as const;

export const RENAL_ESCALATION_REASON_VALUES = [
  "ACCESS_ABNORMALITY",
  "DIALYSIS_MISSED_HELD",
  "POTASSIUM_CONCERN",
  "FLUID_OVERLOAD",
  "LOW_URINE_OUTPUT",
  "HEMODYNAMIC_INSTABILITY",
  "MEDICATION_SAFETY_CONCERN",
  "OTHER",
] as const;

const optionalNotes = z.string().trim().max(2000).optional();
const isoDateTimeString = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date/time" });
const optionalIsoDateTime = isoDateTimeString.optional();
const nonNegativeMl = z.coerce.number().min(0).max(100000);
const optionalNonNegativeMl = nonNegativeMl.optional();
const optionalWeightKg = z.coerce.number().min(0).max(500).optional();
const optionalMlPerHr = z.coerce.number().min(0).max(10000).optional();
const optionalHours = z.coerce.number().min(0).max(168).optional();
const optionalRestrictionMl = z.coerce.number().min(0).max(20000).optional();

const renalYesNo = z.enum(RENAL_YES_NO_VALUES);
const renalYesNoUnknown = z.enum(RENAL_YES_NO_UNKNOWN_VALUES);
const renalYesNoNa = z.enum(RENAL_YES_NO_NA_VALUES);

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

export function renalDocYesNoLabel(
  value: (typeof RENAL_YES_NO_VALUES)[number],
  locale: ClinicalDocumentationSummaryLocale
): string {
  return value === "YES" ? (locale === "en" ? "Yes" : "Oui") : locale === "en" ? "No" : "Non";
}

export const RENAL_YES_NO_OPTIONS = enumOptions(RENAL_YES_NO_VALUES, {
  YES: { en: "Yes", fr: "Oui" },
  NO: { en: "No", fr: "Non" },
});

export const RENAL_YES_NO_UNKNOWN_OPTIONS = enumOptions(RENAL_YES_NO_UNKNOWN_VALUES, {
  YES: { en: "Yes", fr: "Oui" },
  NO: { en: "No", fr: "Non" },
  UNKNOWN: { en: "Unknown", fr: "Inconnu" },
});

export const RENAL_YES_NO_NA_OPTIONS = enumOptions(RENAL_YES_NO_NA_VALUES, {
  YES: { en: "Yes", fr: "Oui" },
  NO: { en: "No", fr: "Non" },
  NOT_APPLICABLE: { en: "Not applicable", fr: "Non applicable" },
});

export const RENAL_YES_NO_UNKNOWN_NA_OPTIONS = enumOptions(RENAL_YES_NO_UNKNOWN_NA_VALUES, {
  YES: { en: "Yes", fr: "Oui" },
  NO: { en: "No", fr: "Non" },
  UNKNOWN: { en: "Unknown", fr: "Inconnu" },
  NOT_APPLICABLE: { en: "Not applicable", fr: "Non applicable" },
});

export const RENAL_ACCESS_TYPE_OPTIONS = enumOptions(RENAL_ACCESS_TYPE_VALUES, {
  AV_FISTULA: { en: "AV fistula", fr: "Fistule artério-veineuse" },
  AV_GRAFT: { en: "AV graft", fr: "Greffe artério-veineuse" },
  TUNNELED_CATHETER: { en: "Tunneled catheter", fr: "Cathéter tunnelisé" },
  TEMPORARY_DIALYSIS_CATHETER: { en: "Temporary dialysis catheter", fr: "Cathéter de dialyse temporaire" },
  PERITONEAL_DIALYSIS_CATHETER: { en: "Peritoneal dialysis catheter", fr: "Cathéter de dialyse péritonéale" },
  UNKNOWN: { en: "Unknown", fr: "Inconnu" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const RENAL_ACCESS_LOCATION_OPTIONS = enumOptions(RENAL_ACCESS_LOCATION_VALUES, {
  LEFT_ARM: { en: "Left arm", fr: "Bras gauche" },
  RIGHT_ARM: { en: "Right arm", fr: "Bras droit" },
  LEFT_CHEST: { en: "Left chest", fr: "Thorax gauche" },
  RIGHT_CHEST: { en: "Right chest", fr: "Thorax droit" },
  ABDOMEN: { en: "Abdomen", fr: "Abdomen" },
  GROIN: { en: "Groin", fr: "Aine" },
  OTHER: { en: "Other", fr: "Autre" },
  UNKNOWN: { en: "Unknown", fr: "Inconnu" },
});

export const RENAL_SITE_STATUS_OPTIONS = enumOptions(RENAL_SITE_STATUS_VALUES, {
  NORMAL: { en: "Normal", fr: "Normal" },
  REDNESS: { en: "Redness", fr: "Rougeur" },
  DRAINAGE: { en: "Drainage", fr: "Drainage" },
  SWELLING: { en: "Swelling", fr: "Gonflement" },
  BLEEDING: { en: "Bleeding", fr: "Saignement" },
  PAIN: { en: "Pain", fr: "Douleur" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const RENAL_DRESSING_STATUS_OPTIONS = enumOptions(RENAL_DRESSING_STATUS_VALUES, {
  CLEAN_DRY_INTACT: { en: "Clean, dry, intact", fr: "Propre, sec, intact" },
  LOOSE: { en: "Loose", fr: "Lâche" },
  SOILED: { en: "Soiled", fr: "Souillé" },
  MISSING: { en: "Missing", fr: "Absent" },
  NOT_APPLICABLE: { en: "Not applicable", fr: "Non applicable" },
});

export const RENAL_HEMODIALYSIS_STATUS_OPTIONS = enumOptions(RENAL_HEMODIALYSIS_STATUS_VALUES, {
  SCHEDULED: { en: "Scheduled", fr: "Planifiée" },
  IN_PROGRESS: { en: "In progress", fr: "En cours" },
  COMPLETED: { en: "Completed", fr: "Terminée" },
  HELD: { en: "Held", fr: "Suspendue" },
  MISSED: { en: "Missed", fr: "Manquée" },
  TRANSFERRED_FOR_DIALYSIS: { en: "Transferred for dialysis", fr: "Transféré pour dialyse" },
  UNKNOWN: { en: "Unknown", fr: "Inconnu" },
});

export const RENAL_PD_STATUS_OPTIONS = enumOptions(RENAL_PD_STATUS_VALUES, {
  SCHEDULED: { en: "Scheduled", fr: "Planifiée" },
  IN_PROGRESS: { en: "In progress", fr: "En cours" },
  COMPLETED: { en: "Completed", fr: "Terminée" },
  HELD: { en: "Held", fr: "Suspendue" },
  MISSED: { en: "Missed", fr: "Manquée" },
  UNKNOWN: { en: "Unknown", fr: "Inconnu" },
});

export const RENAL_EFFLUENT_APPEARANCE_OPTIONS = enumOptions(RENAL_EFFLUENT_APPEARANCE_VALUES, {
  CLEAR: { en: "Clear", fr: "Clair" },
  CLOUDY: { en: "Cloudy", fr: "Trouble" },
  BLOODY: { en: "Bloody", fr: "Sanguinolent" },
  FIBRIN_PRESENT: { en: "Fibrin present", fr: "Fibrine présente" },
  UNKNOWN: { en: "Unknown", fr: "Inconnu" },
  NOT_APPLICABLE: { en: "Not applicable", fr: "Non applicable" },
});

export const RENAL_CRRT_STATUS_OPTIONS = enumOptions(RENAL_CRRT_STATUS_VALUES, {
  IN_PROGRESS: { en: "In progress", fr: "En cours" },
  PAUSED: { en: "Paused", fr: "En pause" },
  STOPPED: { en: "Stopped", fr: "Arrêtée" },
  CLOTTED: { en: "Clotted", fr: "Obstruée" },
  TRANSFERRED: { en: "Transferred", fr: "Transférée" },
  UNKNOWN: { en: "Unknown", fr: "Inconnu" },
});

export const RENAL_CRRT_ACCESS_STATUS_OPTIONS = enumOptions(RENAL_CRRT_ACCESS_STATUS_VALUES, {
  PATENT: { en: "Patent", fr: "Perméable" },
  POOR_FLOW: { en: "Poor flow", fr: "Débit faible" },
  CLOTTED: { en: "Clotted", fr: "Obstrué" },
  DISLODGEMENT_CONCERN: { en: "Dislodgement concern", fr: "Risque de délogement" },
  UNKNOWN: { en: "Unknown", fr: "Inconnu" },
});

export const RENAL_REVIEW_PERIOD_OPTIONS = enumOptions(RENAL_REVIEW_PERIOD_VALUES, {
  SHIFT: { en: "Shift", fr: "Quart" },
  TWENTY_FOUR_HOUR: { en: "24 hour", fr: "24 heures" },
  CUSTOM: { en: "Custom", fr: "Personnalisé" },
});

export const RENAL_EDEMA_LOCATION_OPTIONS = enumOptions(RENAL_EDEMA_LOCATION_VALUES, {
  NONE: { en: "None", fr: "Aucun" },
  LOWER_EXTREMITIES: { en: "Lower extremities", fr: "Membres inférieurs" },
  UPPER_EXTREMITIES: { en: "Upper extremities", fr: "Membres supérieurs" },
  GENERALIZED: { en: "Generalized", fr: "Généralisé" },
  PULMONARY_EDEMA_CONCERN: { en: "Pulmonary edema concern", fr: "Préoccupation d'œdème pulmonaire" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const RENAL_EDEMA_SEVERITY_OPTIONS = enumOptions(RENAL_EDEMA_SEVERITY_VALUES, {
  NONE: { en: "None", fr: "Aucun" },
  TRACE: { en: "Trace", fr: "Trace" },
  ONE_PLUS: { en: "1+", fr: "1+" },
  TWO_PLUS: { en: "2+", fr: "2+" },
  THREE_PLUS: { en: "3+", fr: "3+" },
  FOUR_PLUS: { en: "4+", fr: "4+" },
});

export const RENAL_URINE_CONCERN_TYPE_OPTIONS = enumOptions(RENAL_URINE_CONCERN_TYPE_VALUES, {
  OLIGURIA: { en: "Oliguria", fr: "Oligurie" },
  ANURIA: { en: "Anuria", fr: "Anurie" },
  POLYURIA: { en: "Polyuria", fr: "Polyurie" },
  HEMATURIA: { en: "Hematuria", fr: "Hématurie" },
  RETENTION: { en: "Retention", fr: "Rétention" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const RENAL_ESCALATION_REASON_OPTIONS = enumOptions(RENAL_ESCALATION_REASON_VALUES, {
  ACCESS_ABNORMALITY: { en: "Access abnormality", fr: "Anomalie d'accès" },
  DIALYSIS_MISSED_HELD: { en: "Dialysis missed/held", fr: "Dialyse manquée/suspendue" },
  POTASSIUM_CONCERN: { en: "Potassium concern", fr: "Préoccupation potassium" },
  FLUID_OVERLOAD: { en: "Fluid overload", fr: "Surcharge liquidienne" },
  LOW_URINE_OUTPUT: { en: "Low urine output", fr: "Diurèse faible" },
  HEMODYNAMIC_INSTABILITY: { en: "Hemodynamic instability", fr: "Instabilité hémodynamique" },
  MEDICATION_SAFETY_CONCERN: { en: "Medication safety concern", fr: "Préoccupation sécurité médicamenteuse" },
  OTHER: { en: "Other", fr: "Autre" },
});

const ACCESS_TYPE_MAP = labelMap(RENAL_ACCESS_TYPE_OPTIONS);
const ACCESS_LOCATION_MAP = labelMap(RENAL_ACCESS_LOCATION_OPTIONS);
const HD_STATUS_MAP = labelMap(RENAL_HEMODIALYSIS_STATUS_OPTIONS);
const PD_STATUS_MAP = labelMap(RENAL_PD_STATUS_OPTIONS);
const EFFLUENT_MAP = labelMap(RENAL_EFFLUENT_APPEARANCE_OPTIONS);
const CRRT_STATUS_MAP = labelMap(RENAL_CRRT_STATUS_OPTIONS);
const CRRT_ACCESS_MAP = labelMap(RENAL_CRRT_ACCESS_STATUS_OPTIONS);
const EDEMA_LOCATION_MAP = labelMap(RENAL_EDEMA_LOCATION_OPTIONS);
const URINE_CONCERN_MAP = labelMap(RENAL_URINE_CONCERN_TYPE_OPTIONS);
const ESCALATION_REASON_MAP = labelMap(RENAL_ESCALATION_REASON_OPTIONS);

export function calculateRenalNetBalance(totalIntakeMl: number, totalOutputMl: number): number {
  return totalIntakeMl - totalOutputMl;
}

export function calculateRenalWeightChange(weightKg: number, previousWeightKg: number): number {
  return weightKg - previousWeightKg;
}

export function isRenalValueWithinTolerance(
  actual: number,
  expected: number,
  tolerance = RENAL_DECIMAL_TOLERANCE
): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

function isAvFistulaOrGraft(
  accessType: (typeof RENAL_ACCESS_TYPE_VALUES)[number]
): boolean {
  return accessType === "AV_FISTULA" || accessType === "AV_GRAFT";
}

function requireProviderNotified(
  data: { providerNotified: (typeof RENAL_YES_NO_VALUES)[number] },
  ctx: z.RefinementCtx,
  message: string
) {
  if (data.providerNotified !== "YES") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ["providerNotified"] });
  }
}

function requirePharmacyNotifiedOrNaWithNotes(
  data: {
    pharmacyNotified: (typeof RENAL_YES_NO_NA_VALUES)[number];
    notes?: string;
  },
  ctx: z.RefinementCtx,
  message: string
) {
  if (data.pharmacyNotified === "YES") return;
  if (data.pharmacyNotified === "NOT_APPLICABLE" && data.notes?.trim()) return;
  ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ["pharmacyNotified"] });
}

export const dialysisAccessAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    accessType: z.enum(RENAL_ACCESS_TYPE_VALUES),
    accessLocation: z.enum(RENAL_ACCESS_LOCATION_VALUES),
    thrillPresent: renalYesNoNa,
    bruitPresent: renalYesNoNa,
    siteStatus: z.enum(RENAL_SITE_STATUS_VALUES),
    dressingStatus: z.enum(RENAL_DRESSING_STATUS_VALUES),
    infectionConcern: renalYesNo,
    bleedingConcern: renalYesNo,
    providerNotified: renalYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (isAvFistulaOrGraft(data.accessType)) {
      if (data.thrillPresent === "NOT_APPLICABLE") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "thrillPresent required for AV fistula/graft",
          path: ["thrillPresent"],
        });
      }
      if (data.bruitPresent === "NOT_APPLICABLE") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "bruitPresent required for AV fistula/graft",
          path: ["bruitPresent"],
        });
      }
      if (data.thrillPresent === "NO") {
        requireProviderNotified(data, ctx, "Provider notification required for absent thrill");
      }
      if (data.bruitPresent === "NO") {
        requireProviderNotified(data, ctx, "Provider notification required for absent bruit");
      }
    }
    if (data.infectionConcern === "YES") {
      requireProviderNotified(data, ctx, "Provider notification required for infection concern");
    }
    if (data.bleedingConcern === "YES") {
      requireProviderNotified(data, ctx, "Provider notification required for bleeding concern");
    }
  });

export const hemodialysisMonitoringReferencePayloadSchema = z
  .object({
    documentationTime: isoDateTimeString,
    dialysisStatus: z.enum(RENAL_HEMODIALYSIS_STATUS_VALUES),
    preDialysisWeightKg: optionalWeightKg,
    postDialysisWeightKg: optionalWeightKg,
    estimatedFluidRemovedMl: optionalNonNegativeMl,
    bloodPressureConcern: renalYesNo,
    crampingReported: renalYesNo,
    accessIssueObserved: renalYesNo,
    dialysisNurseNotified: renalYesNoNa,
    providerNotified: renalYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.dialysisStatus === "HELD" || data.dialysisStatus === "MISSED") {
      requireProviderNotified(data, ctx, "Provider notification required for held/missed dialysis");
    }
    if (data.bloodPressureConcern === "YES") {
      requireProviderNotified(data, ctx, "Provider notification required for blood pressure concern");
    }
    if (data.accessIssueObserved === "YES") {
      requireProviderNotified(data, ctx, "Provider notification required for access issue");
    }
    if (
      data.dialysisStatus === "COMPLETED" &&
      data.estimatedFluidRemovedMl !== undefined &&
      data.estimatedFluidRemovedMl < 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "estimatedFluidRemovedMl must be >= 0",
        path: ["estimatedFluidRemovedMl"],
      });
    }
  });

export const peritonealDialysisMonitoringReferencePayloadSchema = z
  .object({
    documentationTime: isoDateTimeString,
    pdStatus: z.enum(RENAL_PD_STATUS_VALUES),
    effluentAppearance: z.enum(RENAL_EFFLUENT_APPEARANCE_VALUES),
    abdominalPain: renalYesNo,
    exitSiteConcern: renalYesNo,
    exchangeCompleted: renalYesNoNa,
    providerNotified: renalYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.effluentAppearance === "CLOUDY" || data.effluentAppearance === "BLOODY") {
      requireProviderNotified(data, ctx, "Provider notification required for abnormal effluent");
    }
    if (data.abdominalPain === "YES") {
      requireProviderNotified(data, ctx, "Provider notification required for abdominal pain");
    }
    if (data.exitSiteConcern === "YES") {
      requireProviderNotified(data, ctx, "Provider notification required for exit site concern");
    }
    if (data.pdStatus === "HELD" || data.pdStatus === "MISSED") {
      requireProviderNotified(data, ctx, "Provider notification required for held/missed PD");
    }
  });

export const crrtMonitoringReferencePayloadSchema = z
  .object({
    documentationTime: isoDateTimeString,
    crrtStatus: z.enum(RENAL_CRRT_STATUS_VALUES),
    accessStatus: z.enum(RENAL_CRRT_ACCESS_STATUS_VALUES),
    fluidRemovalGoalMlPerHr: optionalMlPerHr,
    actualFluidRemovalMlPerHr: optionalMlPerHr,
    filterConcern: renalYesNo,
    hemodynamicInstability: renalYesNo,
    providerNotified: renalYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (
      data.crrtStatus === "PAUSED" ||
      data.crrtStatus === "STOPPED" ||
      data.crrtStatus === "CLOTTED"
    ) {
      requireProviderNotified(data, ctx, "Provider notification required for CRRT status change");
    }
    if (
      data.accessStatus === "POOR_FLOW" ||
      data.accessStatus === "CLOTTED" ||
      data.accessStatus === "DISLODGEMENT_CONCERN"
    ) {
      requireProviderNotified(data, ctx, "Provider notification required for CRRT access concern");
    }
    if (data.filterConcern === "YES") {
      requireProviderNotified(data, ctx, "Provider notification required for filter concern");
    }
    if (data.hemodynamicInstability === "YES") {
      requireProviderNotified(data, ctx, "Provider notification required for hemodynamic instability");
    }
  });

export const renalIntakeOutputReviewPayloadSchema = z
  .object({
    reviewTime: isoDateTimeString,
    reviewPeriod: z.enum(RENAL_REVIEW_PERIOD_VALUES),
    totalIntakeMl: optionalNonNegativeMl,
    totalOutputMl: optionalNonNegativeMl,
    netBalanceMl: optionalNonNegativeMl,
    urineOutputMl: optionalNonNegativeMl,
    fluidBalanceConcern: renalYesNo,
    providerNotified: renalYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.totalIntakeMl !== undefined && data.totalOutputMl !== undefined) {
      const expected = calculateRenalNetBalance(data.totalIntakeMl, data.totalOutputMl);
      if (data.netBalanceMl === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "netBalanceMl required when intake and output are present",
          path: ["netBalanceMl"],
        });
      } else if (!isRenalValueWithinTolerance(data.netBalanceMl, expected)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "netBalanceMl must equal totalIntakeMl - totalOutputMl",
          path: ["netBalanceMl"],
        });
      }
    }
    if (data.fluidBalanceConcern === "YES") {
      requireProviderNotified(data, ctx, "Provider notification required for fluid balance concern");
    }
  });

export const fluidRestrictionMonitoringPayloadSchema = z
  .object({
    documentationTime: isoDateTimeString,
    fluidRestrictionOrdered: renalYesNoUnknown,
    restrictionAmountMlPerDay: optionalRestrictionMl,
    intakeThisShiftMl: optionalNonNegativeMl,
    patientEducationProvided: renalYesNo,
    complianceConcern: renalYesNo,
    providerNotified: renalYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.fluidRestrictionOrdered === "YES" && data.restrictionAmountMlPerDay === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "restrictionAmountMlPerDay required when fluid restriction ordered",
        path: ["restrictionAmountMlPerDay"],
      });
    }
    if (data.complianceConcern === "YES") {
      requireProviderNotified(data, ctx, "Provider notification required for compliance concern");
    }
  });

export const dailyWeightEdemaMonitoringPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    weightKg: optionalWeightKg,
    previousWeightKg: optionalWeightKg,
    weightChangeKg: optionalWeightKg,
    edemaPresent: renalYesNo,
    edemaLocation: z.enum(RENAL_EDEMA_LOCATION_VALUES),
    edemaSeverity: z.enum(RENAL_EDEMA_SEVERITY_VALUES),
    fluidOverloadConcern: renalYesNo,
    providerNotified: renalYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.weightKg !== undefined && data.previousWeightKg !== undefined) {
      const expected = calculateRenalWeightChange(data.weightKg, data.previousWeightKg);
      if (data.weightChangeKg === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "weightChangeKg required when weight and previous weight are present",
          path: ["weightChangeKg"],
        });
      } else if (!isRenalValueWithinTolerance(data.weightChangeKg, expected)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "weightChangeKg must equal weightKg - previousWeightKg",
          path: ["weightChangeKg"],
        });
      }
    }
    if (data.edemaLocation === "PULMONARY_EDEMA_CONCERN") {
      requireProviderNotified(data, ctx, "Provider notification required for pulmonary edema concern");
    }
    if (data.fluidOverloadConcern === "YES") {
      requireProviderNotified(data, ctx, "Provider notification required for fluid overload concern");
    }
  });

export const urineOutputConcernPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    concernType: z.enum(RENAL_URINE_CONCERN_TYPE_VALUES),
    urineOutputMl: optionalNonNegativeMl,
    timePeriodHours: optionalHours,
    foleyPresent: renalYesNoUnknown,
    bladderScanPerformed: renalYesNoNa,
    bladderScanVolumeMl: optionalNonNegativeMl,
    providerNotified: renalYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    requireProviderNotified(data, ctx, "Provider notification required for urine output concern");
    if (data.bladderScanPerformed === "YES" && data.bladderScanVolumeMl === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "bladderScanVolumeMl required when bladder scan performed",
        path: ["bladderScanVolumeMl"],
      });
    }
    if (data.concernType === "OTHER" && !data.notes?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "notes required when concern type is OTHER",
        path: ["notes"],
      });
    }
  });

export const renalMedicationSafetyReviewPayloadSchema = z
  .object({
    reviewTime: isoDateTimeString,
    renalFunctionConcern: renalYesNo,
    nephrotoxicMedicationConcern: renalYesNo,
    doseAdjustmentConcern: renalYesNo,
    contrastExposureConcern: renalYesNo,
    pharmacyNotified: renalYesNoNa,
    providerNotified: renalYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (
      data.renalFunctionConcern === "YES" ||
      data.nephrotoxicMedicationConcern === "YES" ||
      data.doseAdjustmentConcern === "YES" ||
      data.contrastExposureConcern === "YES"
    ) {
      requireProviderNotified(data, ctx, "Provider notification required for renal medication concern");
    }
    if (data.nephrotoxicMedicationConcern === "YES" || data.doseAdjustmentConcern === "YES") {
      requirePharmacyNotifiedOrNaWithNotes(
        data,
        ctx,
        "Pharmacy notification required for nephrotoxic or dose adjustment concern"
      );
    }
  });

export const renalEscalationEventPayloadSchema = z
  .object({
    eventTime: isoDateTimeString,
    reason: z.enum(RENAL_ESCALATION_REASON_VALUES),
    providerNotified: renalYesNo,
    providerNotificationTime: isoDateTimeString,
    nephrologyNotified: renalYesNoNa,
    responseReceived: renalYesNo,
    responseTime: optionalIsoDateTime,
    rapidResponseActivated: renalYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.providerNotified !== "YES") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "providerNotified must be YES for renal escalation",
        path: ["providerNotified"],
      });
    }
    if (data.reason === "OTHER" && !data.notes?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "notes required when escalation reason is OTHER",
        path: ["notes"],
      });
    }
  });

const PAYLOAD_SCHEMA_BY_CARD_ID: Record<
  Edoc21DialysisRenalFluidManagementDocumentationCardId,
  z.ZodTypeAny
> = {
  [DIALYSIS_ACCESS_ASSESSMENT_CARD_ID]: dialysisAccessAssessmentPayloadSchema,
  [HEMODIALYSIS_MONITORING_REFERENCE_CARD_ID]: hemodialysisMonitoringReferencePayloadSchema,
  [PERITONEAL_DIALYSIS_MONITORING_REFERENCE_CARD_ID]:
    peritonealDialysisMonitoringReferencePayloadSchema,
  [CRRT_MONITORING_REFERENCE_CARD_ID]: crrtMonitoringReferencePayloadSchema,
  [RENAL_INTAKE_OUTPUT_REVIEW_CARD_ID]: renalIntakeOutputReviewPayloadSchema,
  [FLUID_RESTRICTION_MONITORING_CARD_ID]: fluidRestrictionMonitoringPayloadSchema,
  [DAILY_WEIGHT_EDEMA_MONITORING_CARD_ID]: dailyWeightEdemaMonitoringPayloadSchema,
  [URINE_OUTPUT_CONCERN_CARD_ID]: urineOutputConcernPayloadSchema,
  [RENAL_MEDICATION_SAFETY_REVIEW_CARD_ID]: renalMedicationSafetyReviewPayloadSchema,
  [RENAL_ESCALATION_EVENT_CARD_ID]: renalEscalationEventPayloadSchema,
};

export function isEdoc21DialysisRenalFluidManagementDocumentationCardId(
  cardId: string
): cardId is Edoc21DialysisRenalFluidManagementDocumentationCardId {
  return (EDOC21_DIALYSIS_RENAL_FLUID_MANAGEMENT_DOCUMENTATION_CARD_IDS as readonly string[]).includes(
    cardId
  );
}

export function validateDialysisRenalFluidManagementDocumentationPayloadForCard(
  cardId: string,
  payload: Record<string, unknown>
): { ok: true; data: Record<string, unknown> } | { ok: false; message: string } {
  if (!isEdoc21DialysisRenalFluidManagementDocumentationCardId(cardId)) {
    return { ok: false, message: "Card is not available for structured save" };
  }
  const schema = PAYLOAD_SCHEMA_BY_CARD_ID[cardId];
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: "Invalid clinical documentation payload" };
  }
  return { ok: true, data: parsed.data as Record<string, unknown> };
}

export function summarizeDialysisRenalFluidPayload(
  cardId: string,
  payload: Record<string, unknown>,
  locale: ClinicalDocumentationSummaryLocale
): Array<{ key: string; value: string }> {
  switch (cardId) {
    case DIALYSIS_ACCESS_ASSESSMENT_CARD_ID: {
      const p = dialysisAccessAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Access type" : "Type d'accès",
          value: pickLocalizedEnumLabel(ACCESS_TYPE_MAP.en, ACCESS_TYPE_MAP.fr, d.accessType, locale),
        },
        {
          key: locale === "en" ? "Location" : "Emplacement",
          value: pickLocalizedEnumLabel(
            ACCESS_LOCATION_MAP.en,
            ACCESS_LOCATION_MAP.fr,
            d.accessLocation,
            locale
          ),
        },
        {
          key: locale === "en" ? "Thrill" : "Frémissement",
          value: d.thrillPresent,
        },
        {
          key: locale === "en" ? "Bruit" : "Souffle",
          value: d.bruitPresent,
        },
        {
          key: locale === "en" ? "Infection concern" : "Préoccupation infection",
          value: renalDocYesNoLabel(d.infectionConcern, locale),
        },
      ];
    }
    case HEMODIALYSIS_MONITORING_REFERENCE_CARD_ID: {
      const p = hemodialysisMonitoringReferencePayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Status" : "Statut",
          value: pickLocalizedEnumLabel(HD_STATUS_MAP.en, HD_STATUS_MAP.fr, d.dialysisStatus, locale),
        },
        {
          key: locale === "en" ? "Estimated fluid removed" : "Liquide retiré estimé",
          value:
            d.estimatedFluidRemovedMl !== undefined ? `${d.estimatedFluidRemovedMl} mL` : "—",
        },
        {
          key: locale === "en" ? "BP concern" : "Préoccupation TA",
          value: renalDocYesNoLabel(d.bloodPressureConcern, locale),
        },
        {
          key: locale === "en" ? "Access issue" : "Problème d'accès",
          value: renalDocYesNoLabel(d.accessIssueObserved, locale),
        },
      ];
    }
    case PERITONEAL_DIALYSIS_MONITORING_REFERENCE_CARD_ID: {
      const p = peritonealDialysisMonitoringReferencePayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Status" : "Statut",
          value: pickLocalizedEnumLabel(PD_STATUS_MAP.en, PD_STATUS_MAP.fr, d.pdStatus, locale),
        },
        {
          key: locale === "en" ? "Effluent appearance" : "Aspect de l'effluent",
          value: pickLocalizedEnumLabel(EFFLUENT_MAP.en, EFFLUENT_MAP.fr, d.effluentAppearance, locale),
        },
        {
          key: locale === "en" ? "Abdominal pain" : "Douleur abdominale",
          value: renalDocYesNoLabel(d.abdominalPain, locale),
        },
      ];
    }
    case CRRT_MONITORING_REFERENCE_CARD_ID: {
      const p = crrtMonitoringReferencePayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Status" : "Statut",
          value: pickLocalizedEnumLabel(
            CRRT_STATUS_MAP.en,
            CRRT_STATUS_MAP.fr,
            d.crrtStatus,
            locale
          ),
        },
        {
          key: locale === "en" ? "Access status" : "Statut d'accès",
          value: pickLocalizedEnumLabel(
            CRRT_ACCESS_MAP.en,
            CRRT_ACCESS_MAP.fr,
            d.accessStatus,
            locale
          ),
        },
        {
          key: locale === "en" ? "Fluid removal goal" : "Objectif de retrait liquidien",
          value:
            d.fluidRemovalGoalMlPerHr !== undefined ? `${d.fluidRemovalGoalMlPerHr} mL/hr` : "—",
        },
        {
          key: locale === "en" ? "Hemodynamic instability" : "Instabilité hémodynamique",
          value: renalDocYesNoLabel(d.hemodynamicInstability, locale),
        },
      ];
    }
    case RENAL_INTAKE_OUTPUT_REVIEW_CARD_ID: {
      const p = renalIntakeOutputReviewPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Intake" : "Entrées",
          value: d.totalIntakeMl !== undefined ? `${d.totalIntakeMl} mL` : "—",
        },
        {
          key: locale === "en" ? "Output" : "Sorties",
          value: d.totalOutputMl !== undefined ? `${d.totalOutputMl} mL` : "—",
        },
        {
          key: locale === "en" ? "Net balance" : "Bilan net",
          value: d.netBalanceMl !== undefined ? `${d.netBalanceMl} mL` : "—",
        },
      ];
    }
    case FLUID_RESTRICTION_MONITORING_CARD_ID: {
      const p = fluidRestrictionMonitoringPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Ordered" : "Prescrit",
          value: d.fluidRestrictionOrdered,
        },
        {
          key: locale === "en" ? "Restriction amount" : "Quantité de restriction",
          value:
            d.restrictionAmountMlPerDay !== undefined
              ? `${d.restrictionAmountMlPerDay} mL/day`
              : "—",
        },
        {
          key: locale === "en" ? "Intake this shift" : "Apport ce quart",
          value: d.intakeThisShiftMl !== undefined ? `${d.intakeThisShiftMl} mL` : "—",
        },
        {
          key: locale === "en" ? "Compliance concern" : "Préoccupation observance",
          value: renalDocYesNoLabel(d.complianceConcern, locale),
        },
      ];
    }
    case DAILY_WEIGHT_EDEMA_MONITORING_CARD_ID: {
      const p = dailyWeightEdemaMonitoringPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Weight" : "Poids",
          value: d.weightKg !== undefined ? `${d.weightKg} kg` : "—",
        },
        {
          key: locale === "en" ? "Change" : "Variation",
          value: d.weightChangeKg !== undefined ? `${d.weightChangeKg} kg` : "—",
        },
        {
          key: locale === "en" ? "Edema" : "Œdème",
          value: renalDocYesNoLabel(d.edemaPresent, locale),
        },
        {
          key: locale === "en" ? "Fluid overload concern" : "Préoccupation surcharge liquidienne",
          value: renalDocYesNoLabel(d.fluidOverloadConcern, locale),
        },
      ];
    }
    case URINE_OUTPUT_CONCERN_CARD_ID: {
      const p = urineOutputConcernPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Concern type" : "Type de préoccupation",
          value: pickLocalizedEnumLabel(
            URINE_CONCERN_MAP.en,
            URINE_CONCERN_MAP.fr,
            d.concernType,
            locale
          ),
        },
        {
          key: locale === "en" ? "Output" : "Diurèse",
          value: d.urineOutputMl !== undefined ? `${d.urineOutputMl} mL` : "—",
        },
        {
          key: locale === "en" ? "Bladder scan" : "Échographie vésicale",
          value: d.bladderScanPerformed,
        },
      ];
    }
    case RENAL_MEDICATION_SAFETY_REVIEW_CARD_ID: {
      const p = renalMedicationSafetyReviewPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Renal function concern" : "Préoccupation fonction rénale",
          value: renalDocYesNoLabel(d.renalFunctionConcern, locale),
        },
        {
          key: locale === "en" ? "Nephrotoxic medication concern" : "Préoccupation médicament néphrotoxique",
          value: renalDocYesNoLabel(d.nephrotoxicMedicationConcern, locale),
        },
        {
          key: locale === "en" ? "Pharmacy notified" : "Pharmacie avisée",
          value: d.pharmacyNotified,
        },
      ];
    }
    case RENAL_ESCALATION_EVENT_CARD_ID: {
      const p = renalEscalationEventPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Reason" : "Motif",
          value: pickLocalizedEnumLabel(
            ESCALATION_REASON_MAP.en,
            ESCALATION_REASON_MAP.fr,
            d.reason,
            locale
          ),
        },
        {
          key: locale === "en" ? "Provider notification" : "Avis au médecin",
          value: renalDocYesNoLabel(d.providerNotified, locale),
        },
        {
          key: locale === "en" ? "Nephrology notification" : "Avis néphrologie",
          value: d.nephrologyNotified,
        },
      ];
    }
    default:
      return [];
  }
}
