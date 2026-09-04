import { z } from "zod";
import type { ClinicalDocumentationFieldOption } from "./clinicalDocumentationFieldOptions.js";
import {
  pickLocalizedEnumLabel,
  type ClinicalDocumentationSummaryLocale,
  clinicalDocSummaryKey,
} from "./clinicalDocumentationSummaryLocale.js";

/** EDOC.20 — skin integrity, wound care & pressure injury card IDs. */
export const SKIN_INTEGRITY_ASSESSMENT_CARD_ID = "skin_integrity_assessment" as const;
export const BRADEN_RISK_ASSESSMENT_CARD_ID = "braden_risk_assessment" as const;
export const PRESSURE_INJURY_ASSESSMENT_CARD_ID = "pressure_injury_assessment" as const;
export const PRESSURE_INJURY_REASSESSMENT_CARD_ID = "pressure_injury_reassessment" as const;
export const SURGICAL_WOUND_ASSESSMENT_CARD_ID = "surgical_wound_assessment" as const;
export const TRAUMATIC_WOUND_ASSESSMENT_CARD_ID = "traumatic_wound_assessment" as const;
export const SKIN_TEAR_ASSESSMENT_CARD_ID = "skin_tear_assessment" as const;
export const MASD_ASSESSMENT_CARD_ID = "masd_assessment" as const;
export const OSTOMY_ASSESSMENT_CARD_ID = "ostomy_assessment" as const;
export const WOUND_TREATMENT_DOCUMENTATION_CARD_ID = "wound_treatment_documentation" as const;
export const WOUND_PHOTO_REFERENCE_CARD_ID = "wound_photo_reference" as const;
export const WOUND_REASSESSMENT_CARD_ID = "wound_reassessment" as const;

export const EDOC20_SKIN_WOUND_PRESSURE_INJURY_DOCUMENTATION_CARD_IDS = [
  SKIN_INTEGRITY_ASSESSMENT_CARD_ID,
  BRADEN_RISK_ASSESSMENT_CARD_ID,
  PRESSURE_INJURY_ASSESSMENT_CARD_ID,
  PRESSURE_INJURY_REASSESSMENT_CARD_ID,
  SURGICAL_WOUND_ASSESSMENT_CARD_ID,
  TRAUMATIC_WOUND_ASSESSMENT_CARD_ID,
  SKIN_TEAR_ASSESSMENT_CARD_ID,
  MASD_ASSESSMENT_CARD_ID,
  OSTOMY_ASSESSMENT_CARD_ID,
  WOUND_TREATMENT_DOCUMENTATION_CARD_ID,
  WOUND_PHOTO_REFERENCE_CARD_ID,
  WOUND_REASSESSMENT_CARD_ID,
] as const;

export type Edoc20SkinWoundPressureInjuryDocumentationCardId =
  (typeof EDOC20_SKIN_WOUND_PRESSURE_INJURY_DOCUMENTATION_CARD_IDS)[number];

/** Future Phase — EDOC.20A Wound Team & Specialty Consult Integration */
export const EDOC_20A_FUTURE_WOUND_TEAM_SPECIALTY_CONSULT = "EDOC.20A" as const;

export const SKIN_WOUND_YES_NO_VALUES = ["YES", "NO"] as const;

export const SKIN_WOUND_SKIN_STATUS_VALUES = [
  "INTACT",
  "DRY",
  "FRAGILE",
  "REDNESS",
  "BREAKDOWN_PRESENT",
  "MULTIPLE_FINDINGS",
] as const;

export const SKIN_WOUND_BRADEN_RISK_LEVEL_VALUES = [
  "VERY_HIGH",
  "HIGH",
  "MODERATE",
  "MILD",
  "MINIMAL",
] as const;

export const SKIN_WOUND_PRESSURE_INJURY_LOCATION_VALUES = [
  "SACRUM",
  "HEEL_LEFT",
  "HEEL_RIGHT",
  "COCCYX",
  "ELBOW",
  "OCCIPUT",
  "HIP",
  "OTHER",
] as const;

export const SKIN_WOUND_PRESSURE_INJURY_STAGE_VALUES = [
  "STAGE_1",
  "STAGE_2",
  "STAGE_3",
  "STAGE_4",
  "UNSTAGEABLE",
  "DEEP_TISSUE_INJURY",
] as const;

export const SKIN_WOUND_CHANGE_STATUS_VALUES = ["IMPROVED", "UNCHANGED", "WORSENED"] as const;

export const SKIN_WOUND_INCISION_TYPE_VALUES = [
  "OPEN",
  "CLOSED",
  "STAPLES",
  "SUTURES",
  "OTHER",
] as const;

export const SKIN_WOUND_APPROXIMATION_VALUES = [
  "WELL_APPROXIMATED",
  "PARTIALLY_OPEN",
  "DEHISCED",
] as const;

export const SKIN_WOUND_DRAINAGE_VALUES = [
  "NONE",
  "SEROUS",
  "SEROSANGUINOUS",
  "PURULENT",
  "BLOODY",
] as const;

export const SKIN_WOUND_TRAUMATIC_TYPE_VALUES = [
  "LACERATION",
  "ABRASION",
  "PUNCTURE",
  "AVULSION",
  "BITE",
  "OTHER",
] as const;

export const SKIN_WOUND_TEAR_CATEGORY_VALUES = [
  "CATEGORY_1",
  "CATEGORY_2",
  "CATEGORY_3",
] as const;

export const SKIN_WOUND_MASD_SOURCE_VALUES = [
  "INCONTINENCE",
  "DRAINAGE",
  "PERISTOMAL",
  "PERIWOUND",
  "OTHER",
] as const;

export const SKIN_WOUND_MASD_SEVERITY_VALUES = ["MILD", "MODERATE", "SEVERE"] as const;

export const SKIN_WOUND_OSTOMY_TYPE_VALUES = [
  "COLOSTOMY",
  "ILEOSTOMY",
  "UROSTOMY",
  "OTHER",
] as const;

export const SKIN_WOUND_STOMA_APPEARANCE_VALUES = [
  "PINK",
  "RED",
  "PALE",
  "DUSKY",
  "BLACK",
] as const;

export const SKIN_WOUND_TREATMENT_TYPE_VALUES = [
  "DRESSING_CHANGE",
  "CLEANSING",
  "PACKING",
  "NEGATIVE_PRESSURE",
  "OSTOMY_CARE",
  "OTHER",
] as const;

const optionalNotes = z.string().trim().max(2000).optional();
const optionalShortText = z.string().trim().max(200).optional();
const requiredShortText = z.string().trim().min(1).max(200);
const photoReferenceId = z.string().trim().min(1).max(120);
const isoDateTimeString = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date/time" });
const braden1to4 = z.coerce.number().int().min(1).max(4);
const bradenFrictionShear = z.coerce.number().int().min(1).max(3);
const bradenTotal = z.coerce.number().int().min(6).max(23);
const woundMeasurementCm = z.coerce.number().min(0).max(100);

const skinWoundYesNo = z.enum(SKIN_WOUND_YES_NO_VALUES);

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

export function skinWoundDocYesNoLabel(
  value: (typeof SKIN_WOUND_YES_NO_VALUES)[number],
  locale: ClinicalDocumentationSummaryLocale
): string {
  return value === "YES" ? (clinicalDocSummaryKey(locale, "Yes", "Oui")) : clinicalDocSummaryKey(locale, "No", "Non");
}

export const SKIN_WOUND_YES_NO_OPTIONS = enumOptions(SKIN_WOUND_YES_NO_VALUES, {
  YES: { en: "Yes", fr: "Oui" },
  NO: { en: "No", fr: "Non" },
});

export const SKIN_WOUND_SKIN_STATUS_OPTIONS = enumOptions(SKIN_WOUND_SKIN_STATUS_VALUES, {
  INTACT: { en: "Intact", fr: "Intègre" },
  DRY: { en: "Dry", fr: "Sèche" },
  FRAGILE: { en: "Fragile", fr: "Fragile" },
  REDNESS: { en: "Redness", fr: "Rougeur" },
  BREAKDOWN_PRESENT: { en: "Breakdown present", fr: "Lésion présente" },
  MULTIPLE_FINDINGS: { en: "Multiple findings", fr: "Trouvailles multiples" },
});

export const SKIN_WOUND_BRADEN_RISK_LEVEL_OPTIONS = enumOptions(SKIN_WOUND_BRADEN_RISK_LEVEL_VALUES, {
  VERY_HIGH: { en: "Very high risk", fr: "Risque très élevé" },
  HIGH: { en: "High risk", fr: "Risque élevé" },
  MODERATE: { en: "Moderate risk", fr: "Risque modéré" },
  MILD: { en: "Mild risk", fr: "Risque léger" },
  MINIMAL: { en: "Minimal risk", fr: "Risque minimal" },
});

export const SKIN_WOUND_PRESSURE_INJURY_LOCATION_OPTIONS = enumOptions(
  SKIN_WOUND_PRESSURE_INJURY_LOCATION_VALUES,
  {
    SACRUM: { en: "Sacrum", fr: "Sacrum" },
    HEEL_LEFT: { en: "Left heel", fr: "Talon gauche" },
    HEEL_RIGHT: { en: "Right heel", fr: "Talon droit" },
    COCCYX: { en: "Coccyx", fr: "Coccyx" },
    ELBOW: { en: "Elbow", fr: "Coude" },
    OCCIPUT: { en: "Occiput", fr: "Occiput" },
    HIP: { en: "Hip", fr: "Hanche" },
    OTHER: { en: "Other", fr: "Autre" },
  }
);

export const SKIN_WOUND_PRESSURE_INJURY_STAGE_OPTIONS = enumOptions(
  SKIN_WOUND_PRESSURE_INJURY_STAGE_VALUES,
  {
    STAGE_1: { en: "Stage 1", fr: "Stade 1" },
    STAGE_2: { en: "Stage 2", fr: "Stade 2" },
    STAGE_3: { en: "Stage 3", fr: "Stade 3" },
    STAGE_4: { en: "Stage 4", fr: "Stade 4" },
    UNSTAGEABLE: { en: "Unstageable", fr: "Non classifiable" },
    DEEP_TISSUE_INJURY: { en: "Deep tissue injury", fr: "Lésion tissulaire profonde" },
  }
);

export const SKIN_WOUND_CHANGE_STATUS_OPTIONS = enumOptions(SKIN_WOUND_CHANGE_STATUS_VALUES, {
  IMPROVED: { en: "Improved", fr: "Amélioré" },
  UNCHANGED: { en: "Unchanged", fr: "Inchangé" },
  WORSENED: { en: "Worsened", fr: "Détérioré" },
});

export const SKIN_WOUND_INCISION_TYPE_OPTIONS = enumOptions(SKIN_WOUND_INCISION_TYPE_VALUES, {
  OPEN: { en: "Open", fr: "Ouverte" },
  CLOSED: { en: "Closed", fr: "Fermée" },
  STAPLES: { en: "Staples", fr: "Agraphes" },
  SUTURES: { en: "Sutures", fr: "Sutures" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const SKIN_WOUND_APPROXIMATION_OPTIONS = enumOptions(SKIN_WOUND_APPROXIMATION_VALUES, {
  WELL_APPROXIMATED: { en: "Well approximated", fr: "Bien approximée" },
  PARTIALLY_OPEN: { en: "Partially open", fr: "Partiellement ouverte" },
  DEHISCED: { en: "Dehisced", fr: "Déhiscence" },
});

export const SKIN_WOUND_DRAINAGE_OPTIONS = enumOptions(SKIN_WOUND_DRAINAGE_VALUES, {
  NONE: { en: "None", fr: "Aucune" },
  SEROUS: { en: "Serous", fr: "Séreuse" },
  SEROSANGUINOUS: { en: "Serosanguinous", fr: "Sérosanguineuse" },
  PURULENT: { en: "Purulent", fr: "Purulente" },
  BLOODY: { en: "Bloody", fr: "Sanguinolente" },
});

export const SKIN_WOUND_TRAUMATIC_TYPE_OPTIONS = enumOptions(SKIN_WOUND_TRAUMATIC_TYPE_VALUES, {
  LACERATION: { en: "Laceration", fr: "Lacération" },
  ABRASION: { en: "Abrasion", fr: "Abrasion" },
  PUNCTURE: { en: "Puncture", fr: "Puncture" },
  AVULSION: { en: "Avulsion", fr: "Avulsion" },
  BITE: { en: "Bite", fr: "Morsure" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const SKIN_WOUND_TEAR_CATEGORY_OPTIONS = enumOptions(SKIN_WOUND_TEAR_CATEGORY_VALUES, {
  CATEGORY_1: { en: "Category 1", fr: "Catégorie 1" },
  CATEGORY_2: { en: "Category 2", fr: "Catégorie 2" },
  CATEGORY_3: { en: "Category 3", fr: "Catégorie 3" },
});

export const SKIN_WOUND_MASD_SOURCE_OPTIONS = enumOptions(SKIN_WOUND_MASD_SOURCE_VALUES, {
  INCONTINENCE: { en: "Incontinence", fr: "Incontinence" },
  DRAINAGE: { en: "Drainage", fr: "Drainage" },
  PERISTOMAL: { en: "Peristomal", fr: "Péristomiale" },
  PERIWOUND: { en: "Periwound", fr: "Péri-plaie" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const SKIN_WOUND_MASD_SEVERITY_OPTIONS = enumOptions(SKIN_WOUND_MASD_SEVERITY_VALUES, {
  MILD: { en: "Mild", fr: "Légère" },
  MODERATE: { en: "Moderate", fr: "Modérée" },
  SEVERE: { en: "Severe", fr: "Sévère" },
});

export const SKIN_WOUND_OSTOMY_TYPE_OPTIONS = enumOptions(SKIN_WOUND_OSTOMY_TYPE_VALUES, {
  COLOSTOMY: { en: "Colostomy", fr: "Colostomie" },
  ILEOSTOMY: { en: "Ileostomy", fr: "Iléostomie" },
  UROSTOMY: { en: "Urostomy", fr: "Urostomie" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const SKIN_WOUND_STOMA_APPEARANCE_OPTIONS = enumOptions(SKIN_WOUND_STOMA_APPEARANCE_VALUES, {
  PINK: { en: "Pink", fr: "Rose" },
  RED: { en: "Red", fr: "Rouge" },
  PALE: { en: "Pale", fr: "Pâle" },
  DUSKY: { en: "Dusky", fr: "Cyanosé" },
  BLACK: { en: "Black", fr: "Noir" },
});

export const SKIN_WOUND_TREATMENT_TYPE_OPTIONS = enumOptions(SKIN_WOUND_TREATMENT_TYPE_VALUES, {
  DRESSING_CHANGE: { en: "Dressing change", fr: "Changement pansement" },
  CLEANSING: { en: "Cleansing", fr: "Nettoyage" },
  PACKING: { en: "Packing", fr: "Packing" },
  NEGATIVE_PRESSURE: { en: "Negative pressure", fr: "Pression négative" },
  OSTOMY_CARE: { en: "Ostomy care", fr: "Soins stomie" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const SKIN_WOUND_BRADEN_1_4_OPTIONS: ClinicalDocumentationFieldOption<number>[] = [
  1, 2, 3, 4,
].map((n) => ({ value: n, labelEn: String(n), labelFr: String(n) }));

export const SKIN_WOUND_BRADEN_FRICTION_SHEAR_OPTIONS: ClinicalDocumentationFieldOption<number>[] =
  [1, 2, 3].map((n) => ({ value: n, labelEn: String(n), labelFr: String(n) }));

const SKIN_STATUS_MAP = labelMap(SKIN_WOUND_SKIN_STATUS_OPTIONS);
const BRADEN_RISK_MAP = labelMap(SKIN_WOUND_BRADEN_RISK_LEVEL_OPTIONS);
const PI_LOCATION_MAP = labelMap(SKIN_WOUND_PRESSURE_INJURY_LOCATION_OPTIONS);
const PI_STAGE_MAP = labelMap(SKIN_WOUND_PRESSURE_INJURY_STAGE_OPTIONS);
const CHANGE_STATUS_MAP = labelMap(SKIN_WOUND_CHANGE_STATUS_OPTIONS);
const APPROXIMATION_MAP = labelMap(SKIN_WOUND_APPROXIMATION_OPTIONS);
const DRAINAGE_MAP = labelMap(SKIN_WOUND_DRAINAGE_OPTIONS);
const OSTOMY_TYPE_MAP = labelMap(SKIN_WOUND_OSTOMY_TYPE_OPTIONS);
const STOMA_APPEARANCE_MAP = labelMap(SKIN_WOUND_STOMA_APPEARANCE_OPTIONS);

export function calculateBradenScore(input: {
  sensoryPerception: number;
  moisture: number;
  activity: number;
  mobility: number;
  nutrition: number;
  frictionShear: number;
}): number {
  return (
    input.sensoryPerception +
    input.moisture +
    input.activity +
    input.mobility +
    input.nutrition +
    input.frictionShear
  );
}

export function deriveBradenRiskLevel(
  totalScore: number
): (typeof SKIN_WOUND_BRADEN_RISK_LEVEL_VALUES)[number] {
  if (totalScore <= 9) return "VERY_HIGH";
  if (totalScore <= 12) return "HIGH";
  if (totalScore <= 14) return "MODERATE";
  if (totalScore <= 18) return "MILD";
  return "MINIMAL";
}

export function isPressureInjuryStageRequiringProviderNotification(
  stage: (typeof SKIN_WOUND_PRESSURE_INJURY_STAGE_VALUES)[number]
): boolean {
  return (
    stage === "STAGE_3" ||
    stage === "STAGE_4" ||
    stage === "UNSTAGEABLE" ||
    stage === "DEEP_TISSUE_INJURY"
  );
}

function requireProviderNotified(
  data: { providerNotified: (typeof SKIN_WOUND_YES_NO_VALUES)[number] },
  ctx: z.RefinementCtx,
  message: string
) {
  if (data.providerNotified !== "YES") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ["providerNotified"] });
  }
}

export const skinIntegrityAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    skinStatus: z.enum(SKIN_WOUND_SKIN_STATUS_VALUES),
    pressureInjuryPresent: skinWoundYesNo,
    woundPresent: skinWoundYesNo,
    skinTearPresent: skinWoundYesNo,
    masdPresent: skinWoundYesNo,
    providerNotified: skinWoundYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.pressureInjuryPresent === "YES") {
      requireProviderNotified(data, ctx, "Provider notification required for pressure injury");
    }
    if (data.skinStatus === "BREAKDOWN_PRESENT") {
      requireProviderNotified(data, ctx, "Provider notification required for skin breakdown");
    }
  });

export const bradenRiskAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    sensoryPerception: braden1to4,
    moisture: braden1to4,
    activity: braden1to4,
    mobility: braden1to4,
    nutrition: braden1to4,
    frictionShear: bradenFrictionShear,
    totalScore: bradenTotal,
    riskLevel: z.enum(SKIN_WOUND_BRADEN_RISK_LEVEL_VALUES),
    preventionPlanReviewed: skinWoundYesNo,
    providerNotified: skinWoundYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    const calculated = calculateBradenScore(data);
    if (data.totalScore !== calculated) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "totalScore must equal Braden score calculation",
        path: ["totalScore"],
      });
    }
    const expected = deriveBradenRiskLevel(calculated);
    if (data.riskLevel !== expected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "riskLevel must match derived Braden risk band",
        path: ["riskLevel"],
      });
    }
  });

export const pressureInjuryAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    location: z.enum(SKIN_WOUND_PRESSURE_INJURY_LOCATION_VALUES),
    stage: z.enum(SKIN_WOUND_PRESSURE_INJURY_STAGE_VALUES),
    lengthCm: woundMeasurementCm.optional(),
    widthCm: woundMeasurementCm.optional(),
    depthCm: woundMeasurementCm.optional(),
    drainagePresent: skinWoundYesNo,
    infectionConcern: skinWoundYesNo,
    providerNotified: skinWoundYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (isPressureInjuryStageRequiringProviderNotification(data.stage)) {
      requireProviderNotified(data, ctx, "Provider notification required for Stage 3+ pressure injury");
    }
    if (data.infectionConcern === "YES") {
      requireProviderNotified(data, ctx, "Provider notification required for infection concern");
    }
  });

export const pressureInjuryReassessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    existingPressureInjuryLocation: requiredShortText,
    status: z.enum(SKIN_WOUND_CHANGE_STATUS_VALUES),
    providerNotified: skinWoundYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.status === "WORSENED") {
      requireProviderNotified(data, ctx, "Provider notification required when pressure injury worsened");
    }
  });

export const surgicalWoundAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    incisionType: z.enum(SKIN_WOUND_INCISION_TYPE_VALUES),
    approximation: z.enum(SKIN_WOUND_APPROXIMATION_VALUES),
    drainage: z.enum(SKIN_WOUND_DRAINAGE_VALUES),
    infectionConcern: skinWoundYesNo,
    providerNotified: skinWoundYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.approximation === "DEHISCED") {
      requireProviderNotified(data, ctx, "Provider notification required for wound dehiscence");
    }
    if (data.infectionConcern === "YES") {
      requireProviderNotified(data, ctx, "Provider notification required for infection concern");
    }
  });

export const traumaticWoundAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    woundType: z.enum(SKIN_WOUND_TRAUMATIC_TYPE_VALUES),
    drainage: z.enum(SKIN_WOUND_DRAINAGE_VALUES),
    infectionConcern: skinWoundYesNo,
    providerNotified: skinWoundYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.infectionConcern === "YES") {
      requireProviderNotified(data, ctx, "Provider notification required for infection concern");
    }
  });

export const skinTearAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    tearCategory: z.enum(SKIN_WOUND_TEAR_CATEGORY_VALUES),
    bleedingPresent: skinWoundYesNo,
    providerNotified: skinWoundYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.tearCategory === "CATEGORY_3") {
      requireProviderNotified(data, ctx, "Provider notification required for Category 3 skin tear");
    }
  });

export const masdAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    source: z.enum(SKIN_WOUND_MASD_SOURCE_VALUES),
    severity: z.enum(SKIN_WOUND_MASD_SEVERITY_VALUES),
    providerNotified: skinWoundYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.severity === "SEVERE") {
      requireProviderNotified(data, ctx, "Provider notification required for severe MASD");
    }
  });

export const ostomyAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    ostomyType: z.enum(SKIN_WOUND_OSTOMY_TYPE_VALUES),
    stomaAppearance: z.enum(SKIN_WOUND_STOMA_APPEARANCE_VALUES),
    outputPresent: skinWoundYesNo,
    skinIntact: skinWoundYesNo,
    providerNotified: skinWoundYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.stomaAppearance === "DUSKY" || data.stomaAppearance === "BLACK") {
      requireProviderNotified(data, ctx, "Provider notification required for abnormal stoma appearance");
    }
    if (data.skinIntact === "NO") {
      requireProviderNotified(data, ctx, "Provider notification required for peristomal breakdown");
    }
  });

export const woundTreatmentDocumentationPayloadSchema = z.object({
  treatmentTime: isoDateTimeString,
  treatmentType: z.enum(SKIN_WOUND_TREATMENT_TYPE_VALUES),
  tolerated: skinWoundYesNo,
  providerNotified: skinWoundYesNo,
  notes: optionalNotes,
});

export const woundPhotoReferencePayloadSchema = z
  .object({
    documentedAt: isoDateTimeString,
    photoObtained: skinWoundYesNo,
    photoReferenceId: z.string().trim().max(120).optional(),
    patientConsentVerified: skinWoundYesNo.optional(),
    providerNotified: skinWoundYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.photoObtained === "YES") {
      if (!data.photoReferenceId?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "photoReferenceId required when photo obtained",
          path: ["photoReferenceId"],
        });
      }
      if (data.patientConsentVerified !== "YES" && data.patientConsentVerified !== "NO") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "patientConsentVerified required when photo obtained",
          path: ["patientConsentVerified"],
        });
      }
    }
  });

export const woundReassessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    status: z.enum(SKIN_WOUND_CHANGE_STATUS_VALUES),
    drainageChanged: skinWoundYesNo,
    infectionConcern: skinWoundYesNo,
    providerNotified: skinWoundYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.status === "WORSENED") {
      requireProviderNotified(data, ctx, "Provider notification required when wound worsened");
    }
    if (data.infectionConcern === "YES") {
      requireProviderNotified(data, ctx, "Provider notification required for infection concern");
    }
  });

const PAYLOAD_SCHEMA_BY_CARD_ID: Record<
  Edoc20SkinWoundPressureInjuryDocumentationCardId,
  z.ZodTypeAny
> = {
  [SKIN_INTEGRITY_ASSESSMENT_CARD_ID]: skinIntegrityAssessmentPayloadSchema,
  [BRADEN_RISK_ASSESSMENT_CARD_ID]: bradenRiskAssessmentPayloadSchema,
  [PRESSURE_INJURY_ASSESSMENT_CARD_ID]: pressureInjuryAssessmentPayloadSchema,
  [PRESSURE_INJURY_REASSESSMENT_CARD_ID]: pressureInjuryReassessmentPayloadSchema,
  [SURGICAL_WOUND_ASSESSMENT_CARD_ID]: surgicalWoundAssessmentPayloadSchema,
  [TRAUMATIC_WOUND_ASSESSMENT_CARD_ID]: traumaticWoundAssessmentPayloadSchema,
  [SKIN_TEAR_ASSESSMENT_CARD_ID]: skinTearAssessmentPayloadSchema,
  [MASD_ASSESSMENT_CARD_ID]: masdAssessmentPayloadSchema,
  [OSTOMY_ASSESSMENT_CARD_ID]: ostomyAssessmentPayloadSchema,
  [WOUND_TREATMENT_DOCUMENTATION_CARD_ID]: woundTreatmentDocumentationPayloadSchema,
  [WOUND_PHOTO_REFERENCE_CARD_ID]: woundPhotoReferencePayloadSchema,
  [WOUND_REASSESSMENT_CARD_ID]: woundReassessmentPayloadSchema,
};

export function isEdoc20SkinWoundPressureInjuryDocumentationCardId(
  cardId: string
): cardId is Edoc20SkinWoundPressureInjuryDocumentationCardId {
  return (EDOC20_SKIN_WOUND_PRESSURE_INJURY_DOCUMENTATION_CARD_IDS as readonly string[]).includes(
    cardId
  );
}

export function validateSkinWoundPressureInjuryDocumentationPayloadForCard(
  cardId: string,
  payload: Record<string, unknown>
): { ok: true; data: Record<string, unknown> } | { ok: false; message: string } {
  if (!isEdoc20SkinWoundPressureInjuryDocumentationCardId(cardId)) {
    return { ok: false, message: "Card is not available for structured save" };
  }
  const schema = PAYLOAD_SCHEMA_BY_CARD_ID[cardId];
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: "Invalid clinical documentation payload" };
  }
  return { ok: true, data: parsed.data as Record<string, unknown> };
}

export function summarizeSkinWoundPressureInjuryPayload(
  cardId: string,
  payload: Record<string, unknown>,
  locale: ClinicalDocumentationSummaryLocale
): Array<{ key: string; value: string }> {
  switch (cardId) {
    case SKIN_INTEGRITY_ASSESSMENT_CARD_ID: {
      const p = skinIntegrityAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Skin status", "Statut cutané"),
          value: pickLocalizedEnumLabel(
            SKIN_STATUS_MAP.en,
            SKIN_STATUS_MAP.fr,
            d.skinStatus,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Pressure injury present", "Lésion de pression présente"),
          value: skinWoundDocYesNoLabel(d.pressureInjuryPresent, locale),
        },
      ];
    }
    case BRADEN_RISK_ASSESSMENT_CARD_ID: {
      const p = bradenRiskAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Score", "Score"),
          value: String(d.totalScore),
        },
        {
          key: clinicalDocSummaryKey(locale, "Risk level", "Niveau de risque"),
          value: pickLocalizedEnumLabel(
            BRADEN_RISK_MAP.en,
            BRADEN_RISK_MAP.fr,
            d.riskLevel,
            locale
          ),
        },
      ];
    }
    case PRESSURE_INJURY_ASSESSMENT_CARD_ID: {
      const p = pressureInjuryAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Location", "Emplacement"),
          value: pickLocalizedEnumLabel(
            PI_LOCATION_MAP.en,
            PI_LOCATION_MAP.fr,
            d.location,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Stage", "Stade"),
          value: pickLocalizedEnumLabel(PI_STAGE_MAP.en, PI_STAGE_MAP.fr, d.stage, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Infection concern", "Préoccupation infection"),
          value: skinWoundDocYesNoLabel(d.infectionConcern, locale),
        },
      ];
    }
    case PRESSURE_INJURY_REASSESSMENT_CARD_ID: {
      const p = pressureInjuryReassessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Location", "Emplacement"),
          value: d.existingPressureInjuryLocation,
        },
        {
          key: clinicalDocSummaryKey(locale, "Status", "Statut"),
          value: pickLocalizedEnumLabel(
            CHANGE_STATUS_MAP.en,
            CHANGE_STATUS_MAP.fr,
            d.status,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: skinWoundDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case SURGICAL_WOUND_ASSESSMENT_CARD_ID: {
      const p = surgicalWoundAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Approximation", "Approximation"),
          value: pickLocalizedEnumLabel(
            APPROXIMATION_MAP.en,
            APPROXIMATION_MAP.fr,
            d.approximation,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Drainage", "Drainage"),
          value: pickLocalizedEnumLabel(DRAINAGE_MAP.en, DRAINAGE_MAP.fr, d.drainage, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Infection concern", "Préoccupation infection"),
          value: skinWoundDocYesNoLabel(d.infectionConcern, locale),
        },
      ];
    }
    case TRAUMATIC_WOUND_ASSESSMENT_CARD_ID: {
      const p = traumaticWoundAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Infection concern", "Préoccupation infection"),
          value: skinWoundDocYesNoLabel(d.infectionConcern, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: skinWoundDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case SKIN_TEAR_ASSESSMENT_CARD_ID: {
      const p = skinTearAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Category", "Catégorie"),
          value: pickLocalizedEnumLabel(
            labelMap(SKIN_WOUND_TEAR_CATEGORY_OPTIONS).en,
            labelMap(SKIN_WOUND_TEAR_CATEGORY_OPTIONS).fr,
            d.tearCategory,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: skinWoundDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case MASD_ASSESSMENT_CARD_ID: {
      const p = masdAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Severity", "Sévérité"),
          value: pickLocalizedEnumLabel(
            labelMap(SKIN_WOUND_MASD_SEVERITY_OPTIONS).en,
            labelMap(SKIN_WOUND_MASD_SEVERITY_OPTIONS).fr,
            d.severity,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: skinWoundDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case OSTOMY_ASSESSMENT_CARD_ID: {
      const p = ostomyAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Type", "Type"),
          value: pickLocalizedEnumLabel(
            OSTOMY_TYPE_MAP.en,
            OSTOMY_TYPE_MAP.fr,
            d.ostomyType,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Stoma appearance", "Apparence stomie"),
          value: pickLocalizedEnumLabel(
            STOMA_APPEARANCE_MAP.en,
            STOMA_APPEARANCE_MAP.fr,
            d.stomaAppearance,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Skin intact", "Peau intacte"),
          value: skinWoundDocYesNoLabel(d.skinIntact, locale),
        },
      ];
    }
    case WOUND_TREATMENT_DOCUMENTATION_CARD_ID: {
      const p = woundTreatmentDocumentationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Treatment", "Traitement"),
          value: pickLocalizedEnumLabel(
            labelMap(SKIN_WOUND_TREATMENT_TYPE_OPTIONS).en,
            labelMap(SKIN_WOUND_TREATMENT_TYPE_OPTIONS).fr,
            d.treatmentType,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Tolerated", "Toléré"),
          value: skinWoundDocYesNoLabel(d.tolerated, locale),
        },
      ];
    }
    case WOUND_PHOTO_REFERENCE_CARD_ID: {
      const p = woundPhotoReferencePayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Photo obtained", "Photo obtenue"),
          value: skinWoundDocYesNoLabel(d.photoObtained, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Consent verified", "Consentement vérifié"),
          value:
            d.patientConsentVerified !== undefined
              ? skinWoundDocYesNoLabel(d.patientConsentVerified, locale)
              : "—",
        },
      ];
    }
    case WOUND_REASSESSMENT_CARD_ID: {
      const p = woundReassessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Status", "Statut"),
          value: pickLocalizedEnumLabel(
            CHANGE_STATUS_MAP.en,
            CHANGE_STATUS_MAP.fr,
            d.status,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Infection concern", "Préoccupation infection"),
          value: skinWoundDocYesNoLabel(d.infectionConcern, locale),
        },
      ];
    }
    default:
      return [];
  }
}
