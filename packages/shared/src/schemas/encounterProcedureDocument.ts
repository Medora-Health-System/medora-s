import { z } from "zod";
import {
  LACERATION_ANESTHESIA_VALUES,
  LACERATION_SITE_VALUES,
  lacerationProcedureDocumentDtoSchema,
} from "./encounterProcedureLaceration.js";
import {
  ADVANCED_DOCUMENTED_PROCEDURE_TYPES,
  centralLineProcedureDocumentDtoSchema,
  chestTubeProcedureDocumentDtoSchema,
  intubationProcedureDocumentDtoSchema,
  lumbarPunctureProcedureDocumentDtoSchema,
  pelvicExamProcedureDocumentDtoSchema,
  proceduralSedationProcedureDocumentDtoSchema,
  reductionProcedureDocumentDtoSchema,
  thoracentesisParacentesisProcedureDocumentDtoSchema,
} from "./encounterProcedureAdvanced.js";
import { nursingProcedureAssistDocumentDtoSchema } from "./encounterProcedureNursing.js";

export * from "./encounterProcedureAdvanced.js";
export * from "./encounterProcedureNursing.js";

const emptyStrToUndefined = (v: unknown) => (v === "" ? undefined : v);

const siteEnum = z.enum(LACERATION_SITE_VALUES);
const anesthesiaEnum = z.enum(LACERATION_ANESTHESIA_VALUES);

const performedAtOpt = z.preprocess(emptyStrToUndefined, z.string().trim().max(48).optional());
const complicationsOpt = z.preprocess(emptyStrToUndefined, z.string().trim().max(2000).optional());
const notesOpt = z.preprocess(emptyStrToUndefined, z.string().trim().max(4000).optional());

/** --- Wound care --- */
export const WOUND_TYPE_VALUES = [
  "ABRASION",
  "LACERATION",
  "ULCER",
  "SKIN_TEAR",
  "BURN_SUPERFICIAL",
  "PUNCTURE",
  "OTHER",
] as const;
export const CLEANING_SOLUTION_VALUES = [
  "NORMAL_SALINE",
  "CHLORHEXIDINE",
  "BETADINE",
  "STERILE_WATER",
  "SOAP_WATER",
  "OTHER",
] as const;
export const DRESSING_TYPE_VALUES = [
  "GAUZE",
  "TRANSPARENT_FILM",
  "HYDROCOLLOID",
  "ABD_PAD",
  "COMPRESSION",
  "OTHER",
] as const;

const woundCareProcedureDocumentDtoSchema = z
  .object({
    procedureType: z.literal("WOUND_CARE"),
    performedAt: performedAtOpt,
    site: siteEnum,
    siteOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
    woundType: z.enum(WOUND_TYPE_VALUES),
    woundTypeOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
    cleaningSolution: z.enum(CLEANING_SOLUTION_VALUES),
    cleaningSolutionOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
    dressingType: z.enum(DRESSING_TYPE_VALUES),
    dressingTypeOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
    toleratedWell: z.boolean(),
    complications: complicationsOpt,
    notes: notesOpt,
  })
  .superRefine((val, ctx) => {
    if (val.site === "OTHER" && !val.siteOther?.trim()) {
      ctx.addIssue({ code: "custom", path: ["siteOther"], message: "required" });
    }
    if (val.woundType === "OTHER" && !val.woundTypeOther?.trim()) {
      ctx.addIssue({ code: "custom", path: ["woundTypeOther"], message: "required" });
    }
    if (val.cleaningSolution === "OTHER" && !val.cleaningSolutionOther?.trim()) {
      ctx.addIssue({ code: "custom", path: ["cleaningSolutionOther"], message: "required" });
    }
    if (val.dressingType === "OTHER" && !val.dressingTypeOther?.trim()) {
      ctx.addIssue({ code: "custom", path: ["dressingTypeOther"], message: "required" });
    }
  });

/** --- Incision & drainage --- */
export const ABSCESS_SIZE_VALUES = ["SMALL", "MEDIUM", "LARGE", "OTHER"] as const;
export const DRAINAGE_AMOUNT_VALUES = ["NONE", "MINIMAL", "MODERATE", "LARGE", "OTHER"] as const;

const incisionDrainageProcedureDocumentDtoSchema = z
  .object({
    procedureType: z.literal("INCISION_AND_DRAINAGE"),
    performedAt: performedAtOpt,
    site: siteEnum,
    siteOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
    abscessSize: z.enum(ABSCESS_SIZE_VALUES),
    abscessSizeOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
    anesthesia: anesthesiaEnum,
    anesthesiaOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
    incisionPerformed: z.boolean(),
    drainageAmount: z.enum(DRAINAGE_AMOUNT_VALUES),
    drainageAmountOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
    packingPlaced: z.boolean(),
    dressingApplied: z.boolean(),
    toleratedWell: z.boolean(),
    complications: complicationsOpt,
    notes: notesOpt,
  })
  .superRefine((val, ctx) => {
    if (val.site === "OTHER" && !val.siteOther?.trim()) ctx.addIssue({ code: "custom", path: ["siteOther"], message: "required" });
    if (val.abscessSize === "OTHER" && !val.abscessSizeOther?.trim()) {
      ctx.addIssue({ code: "custom", path: ["abscessSizeOther"], message: "required" });
    }
    if (val.anesthesia === "OTHER" && !val.anesthesiaOther?.trim()) {
      ctx.addIssue({ code: "custom", path: ["anesthesiaOther"], message: "required" });
    }
    if (val.drainageAmount === "OTHER" && !val.drainageAmountOther?.trim()) {
      ctx.addIssue({ code: "custom", path: ["drainageAmountOther"], message: "required" });
    }
  });

/** --- Splint --- */
export const EXTREMITY_SITE_VALUES = [
  "RIGHT_WRIST",
  "LEFT_WRIST",
  "RIGHT_ANKLE",
  "LEFT_ANKLE",
  "RIGHT_FOREARM",
  "LEFT_FOREARM",
  "RIGHT_LOWER_LEG",
  "LEFT_LOWER_LEG",
  "RIGHT_ELBOW",
  "LEFT_ELBOW",
  "RIGHT_HAND",
  "LEFT_HAND",
  "OTHER",
] as const;
export const SPLINT_TYPE_VALUES = [
  "VOLAR_SPLINT",
  "POSTERIOR_SPLINT",
  "ALUMINUM_FOAM",
  "CAM_BOOT",
  "SLING",
  "THUMB_SPICA",
  "OTHER",
] as const;
export const NEUROVASCULAR_STATUS_VALUES = ["INTACT", "ALTERED", "NOT_ASSESSED", "OTHER"] as const;

const splintProcedureDocumentDtoSchema = z
  .object({
    procedureType: z.literal("SPLINT_APPLICATION"),
    performedAt: performedAtOpt,
    extremitySite: z.enum(EXTREMITY_SITE_VALUES),
    extremitySiteOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
    splintType: z.enum(SPLINT_TYPE_VALUES),
    splintTypeOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
    neurovascularBefore: z.enum(NEUROVASCULAR_STATUS_VALUES),
    neurovascularBeforeOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
    neurovascularAfter: z.enum(NEUROVASCULAR_STATUS_VALUES),
    neurovascularAfterOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
    patientToleratedWell: z.boolean(),
    instructionsGiven: z.boolean(),
    complications: complicationsOpt,
    notes: notesOpt,
  })
  .superRefine((val, ctx) => {
    if (val.extremitySite === "OTHER" && !val.extremitySiteOther?.trim()) {
      ctx.addIssue({ code: "custom", path: ["extremitySiteOther"], message: "required" });
    }
    if (val.splintType === "OTHER" && !val.splintTypeOther?.trim()) {
      ctx.addIssue({ code: "custom", path: ["splintTypeOther"], message: "required" });
    }
    if (val.neurovascularBefore === "OTHER" && !val.neurovascularBeforeOther?.trim()) {
      ctx.addIssue({ code: "custom", path: ["neurovascularBeforeOther"], message: "required" });
    }
    if (val.neurovascularAfter === "OTHER" && !val.neurovascularAfterOther?.trim()) {
      ctx.addIssue({ code: "custom", path: ["neurovascularAfterOther"], message: "required" });
    }
  });

/** --- Foley --- */
export const CATHETER_SIZE_VALUES = ["FR_12", "FR_14", "FR_16", "FR_18", "FR_20", "OTHER"] as const;
export const FOLEY_INDICATION_VALUES = [
  "URINARY_RETENTION",
  "STRICT_IO",
  "PERI_PROCEDURAL",
  "IMMOBILIZATION_CRITICAL",
  "COMFORT_CARE",
  /** @deprecated legacy — display-only */
  "SURGERY_PREP",
  "OUTPUT_MONITORING",
  "OTHER",
] as const;
export const URINE_APPEARANCE_VALUES = [
  "CLEAR",
  "YELLOW",
  "AMBER",
  "CLOUDY",
  "BLOODY",
  "DARK",
  "SEDIMENT",
  "OTHER",
] as const;
export const BALLOON_VOLUME_VALUES = ["ML_5", "ML_10", "ML_30", "ML_15", "OTHER"] as const;

export const FOLEY_INDICATION_UI_VALUES = [
  "URINARY_RETENTION",
  "STRICT_IO",
  "PERI_PROCEDURAL",
  "IMMOBILIZATION_CRITICAL",
  "COMFORT_CARE",
  "OTHER",
] as const;

export const CATHETER_SIZE_UI_VALUES = ["FR_12", "FR_14", "FR_16", "FR_18", "FR_20", "OTHER"] as const;

export const BALLOON_VOLUME_UI_VALUES = ["ML_5", "ML_10", "ML_30", "OTHER"] as const;

export const URINE_APPEARANCE_FOLEY_UI_VALUES = [
  "CLEAR",
  "YELLOW",
  "AMBER",
  "CLOUDY",
  "BLOODY",
  "OTHER",
] as const;

const foleyProcedureDocumentDtoSchema = z
  .object({
    procedureType: z.literal("FOLEY_CATHETER"),
    performedAt: performedAtOpt,
    catheterSize: z.enum(CATHETER_SIZE_VALUES),
    catheterSizeOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(40).optional()),
    indication: z.enum(FOLEY_INDICATION_VALUES),
    indicationOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
    urineReturn: z.boolean(),
    urineAppearance: z.enum(URINE_APPEARANCE_VALUES),
    urineAppearanceOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
    balloonVolume: z.enum(BALLOON_VOLUME_VALUES),
    balloonVolumeOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(40).optional()),
    toleratedWell: z.boolean(),
    complications: complicationsOpt,
    notes: notesOpt,
  })
  .superRefine((val, ctx) => {
    if (val.catheterSize === "OTHER" && !val.catheterSizeOther?.trim()) {
      ctx.addIssue({ code: "custom", path: ["catheterSizeOther"], message: "required" });
    }
    if (val.indication === "OTHER" && !val.indicationOther?.trim()) {
      ctx.addIssue({ code: "custom", path: ["indicationOther"], message: "required" });
    }
    if (val.urineAppearance === "OTHER" && !val.urineAppearanceOther?.trim()) {
      ctx.addIssue({ code: "custom", path: ["urineAppearanceOther"], message: "required" });
    }
    if (val.balloonVolume === "OTHER" && !val.balloonVolumeOther?.trim()) {
      ctx.addIssue({ code: "custom", path: ["balloonVolumeOther"], message: "required" });
    }
  });

/** --- EKG --- */
export const EKG_INDICATION_VALUES = [
  "CHEST_PAIN",
  "PALPITATIONS",
  "SYNCOPE",
  "SCREENING",
  "ARRHYTHMIA",
  "OTHER",
] as const;
export const EKG_RHYTHM_VALUES = [
  "SINUS",
  "SINUS_TACHY",
  "SINUS_BRADY",
  "AFIB",
  "AFLUTTER",
  "PAC",
  "PVC",
  "VT",
  "ST_ELEVATION_CONCERN",
  "OTHER",
] as const;
export const RATE_RANGE_VALUES = ["LT_60", "RANGE_60_100", "RANGE_100_120", "GT_120", "NOT_DOCUMENTED"] as const;

const ekgProcedureDocumentDtoSchema = z
  .object({
    procedureType: z.literal("EKG"),
    performedAt: performedAtOpt,
    indication: z.enum(EKG_INDICATION_VALUES),
    indicationOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
    rhythm: z.enum(EKG_RHYTHM_VALUES),
    rhythmOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
    rateRange: z.enum(RATE_RANGE_VALUES),
    providerNotified: z.boolean(),
    copyPlacedInChart: z.boolean(),
    notes: notesOpt,
  })
  .superRefine((val, ctx) => {
    if (val.indication === "OTHER" && !val.indicationOther?.trim()) {
      ctx.addIssue({ code: "custom", path: ["indicationOther"], message: "required" });
    }
    if (val.rhythm === "OTHER" && !val.rhythmOther?.trim()) {
      ctx.addIssue({ code: "custom", path: ["rhythmOther"], message: "required" });
    }
  });

/** --- Glucose --- */
export const SPECIMEN_SOURCE_VALUES = ["FINGERSTICK", "IV_LINE", "OTHER"] as const;
export const GLUCOSE_ACTION_VALUES = [
  "NONE",
  "RECHECK_ORDERED",
  "INSULIN_ORDERED",
  "ORAL_GLUCOSE",
  "PROVIDER_NOTIFIED",
  "ESCALATED",
  "OTHER",
] as const;

const glucoseProcedureDocumentDtoSchema = z
  .object({
    procedureType: z.literal("GLUCOSE_CHECK"),
    performedAt: performedAtOpt,
    resultMgDl: z.string().trim().min(1).max(12),
    specimenSource: z.enum(SPECIMEN_SOURCE_VALUES),
    specimenSourceOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
    actionTaken: z.enum(GLUCOSE_ACTION_VALUES),
    actionTakenOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
    providerNotified: z.boolean(),
    notes: notesOpt,
  })
  .superRefine((val, ctx) => {
    if (val.specimenSource === "OTHER" && !val.specimenSourceOther?.trim()) {
      ctx.addIssue({ code: "custom", path: ["specimenSourceOther"], message: "required" });
    }
    if (val.actionTaken === "OTHER" && !val.actionTakenOther?.trim()) {
      ctx.addIssue({ code: "custom", path: ["actionTakenOther"], message: "required" });
    }
    if (!/^\d{1,4}$/.test(val.resultMgDl)) {
      ctx.addIssue({ code: "custom", path: ["resultMgDl"], message: "numeric" });
    }
  });

/** --- Urine collection --- */
export const URINE_METHOD_VALUES = ["CLEAN_CATCH", "CATHETER", "RANDOM", "OTHER"] as const;

const urineCollectionProcedureDocumentDtoSchema = z
  .object({
    procedureType: z.literal("URINE_COLLECTION"),
    performedAt: performedAtOpt,
    method: z.enum(URINE_METHOD_VALUES),
    methodOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
    specimenSentToLab: z.boolean(),
    urineAppearance: z.enum(URINE_APPEARANCE_VALUES),
    urineAppearanceOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
    notes: notesOpt,
  })
  .superRefine((val, ctx) => {
    if (val.method === "OTHER" && !val.methodOther?.trim()) {
      ctx.addIssue({ code: "custom", path: ["methodOther"], message: "required" });
    }
    if (val.urineAppearance === "OTHER" && !val.urineAppearanceOther?.trim()) {
      ctx.addIssue({ code: "custom", path: ["urineAppearanceOther"], message: "required" });
    }
  });

/** --- Pregnancy test --- */
export const PREGNANCY_SPECIMEN_VALUES = ["URINE", "OTHER"] as const;
export const PREGNANCY_RESULT_VALUES = ["POSITIVE", "NEGATIVE", "INVALID", "INDETERMINATE"] as const;

const pregnancyTestProcedureDocumentDtoSchema = z.object({
  procedureType: z.literal("PREGNANCY_TEST"),
  performedAt: performedAtOpt,
  specimen: z.enum(PREGNANCY_SPECIMEN_VALUES),
  specimenOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
  result: z.enum(PREGNANCY_RESULT_VALUES),
  providerNotified: z.boolean(),
  notes: notesOpt,
}).superRefine((val, ctx) => {
  if (val.specimen === "OTHER" && !val.specimenOther?.trim()) {
    ctx.addIssue({ code: "custom", path: ["specimenOther"], message: "required" });
  }
});

/** Full POST body validation (S14C). Union (not discriminatedUnion) so branches may use .superRefine(). */
export const encounterProcedureDocumentDtoSchema = z.union([
  lacerationProcedureDocumentDtoSchema,
  woundCareProcedureDocumentDtoSchema,
  incisionDrainageProcedureDocumentDtoSchema,
  splintProcedureDocumentDtoSchema,
  foleyProcedureDocumentDtoSchema,
  ekgProcedureDocumentDtoSchema,
  glucoseProcedureDocumentDtoSchema,
  urineCollectionProcedureDocumentDtoSchema,
  pregnancyTestProcedureDocumentDtoSchema,
  chestTubeProcedureDocumentDtoSchema,
  intubationProcedureDocumentDtoSchema,
  centralLineProcedureDocumentDtoSchema,
  proceduralSedationProcedureDocumentDtoSchema,
  reductionProcedureDocumentDtoSchema,
  thoracentesisParacentesisProcedureDocumentDtoSchema,
  pelvicExamProcedureDocumentDtoSchema,
  lumbarPunctureProcedureDocumentDtoSchema,
  nursingProcedureAssistDocumentDtoSchema,
]);

export type EncounterProcedureDocumentDto = z.infer<typeof encounterProcedureDocumentDtoSchema>;

export const DOCUMENTED_PROCEDURE_TYPES = [
  "LACERATION_REPAIR",
  "WOUND_CARE",
  "INCISION_AND_DRAINAGE",
  "SPLINT_APPLICATION",
  "FOLEY_CATHETER",
  "EKG",
  "GLUCOSE_CHECK",
  "URINE_COLLECTION",
  "PREGNANCY_TEST",
  ...ADVANCED_DOCUMENTED_PROCEDURE_TYPES,
] as const;

/** Clinical procedure types that may appear in nursing assist notes (includes laceration). */
export const ASSISTED_PROCEDURE_TYPES = [...DOCUMENTED_PROCEDURE_TYPES] as const;

export type DocumentedProcedureType = (typeof DOCUMENTED_PROCEDURE_TYPES)[number];
