import { z } from "zod";

const emptyStrToUndefined = (v: unknown) => (v === "" ? undefined : v);

/** Canonical site values stored in `payloadJson.site` (S14B). */
export const LACERATION_SITE_VALUES = [
  "SCALP",
  "FACE",
  "LIP",
  "EAR",
  "NECK",
  "CHEST",
  "ABDOMEN",
  "BACK",
  "UPPER_EXTREMITY",
  "HAND_FINGER",
  "LOWER_EXTREMITY",
  "FOOT_TOE",
  "RIGHT_ARM",
  "LEFT_ARM",
  "RIGHT_HAND",
  "LEFT_HAND",
  "RIGHT_LEG",
  "LEFT_LEG",
  "RIGHT_FOOT",
  "LEFT_FOOT",
  "OTHER",
] as const;

export type LacerationSite = (typeof LACERATION_SITE_VALUES)[number];

export function isKnownLacerationSite(v: string): v is LacerationSite {
  return (LACERATION_SITE_VALUES as readonly string[]).includes(v);
}

export type LacerationWoundLength = (typeof LACERATION_WOUND_LENGTH_VALUES)[number];
export type LacerationAnesthesia = (typeof LACERATION_ANESTHESIA_VALUES)[number];
export type LacerationIrrigation = (typeof LACERATION_IRRIGATION_VALUES)[number];
export type LacerationClosure = (typeof LACERATION_CLOSURE_VALUES)[number];
export type LacerationSutures = (typeof LACERATION_SUTURES_VALUES)[number];

export function isKnownLacerationWoundLength(v: string): v is LacerationWoundLength {
  return (LACERATION_WOUND_LENGTH_VALUES as readonly string[]).includes(v);
}
export function isKnownLacerationAnesthesia(v: string): v is LacerationAnesthesia {
  return (LACERATION_ANESTHESIA_VALUES as readonly string[]).includes(v);
}
export function isKnownLacerationIrrigation(v: string): v is LacerationIrrigation {
  return (LACERATION_IRRIGATION_VALUES as readonly string[]).includes(v);
}
export function isKnownLacerationClosure(v: string): v is LacerationClosure {
  return (LACERATION_CLOSURE_VALUES as readonly string[]).includes(v);
}
export function isKnownLacerationSutures(v: string): v is LacerationSutures {
  return (LACERATION_SUTURES_VALUES as readonly string[]).includes(v);
}

export const LACERATION_WOUND_LENGTH_VALUES = [
  "LT_1CM",
  "CM_1_TO_2",
  "CM_2_TO_5",
  "GT_5CM",
  /** @deprecated legacy granular values — display-only for older entries */
  "CM_1",
  "CM_2",
  "CM_3",
  "CM_4",
  "CM_5",
  "OTHER",
] as const;

export const LACERATION_ANESTHESIA_VALUES = [
  "NONE",
  "LOCAL_INFILTRATION",
  "LET_TOPICAL",
  "DIGITAL_BLOCK",
  /** @deprecated legacy — display-only */
  "LIDOCAINE_1",
  "LIDOCAINE_2",
  "LIDOCAINE_EPI",
  "LET_GEL",
  "OTHER",
] as const;

export const LACERATION_IRRIGATION_VALUES = [
  "NORMAL_SALINE",
  "STERILE_WATER",
  "BETADINE_PREP",
  "CHLORHEXIDINE_PREP",
  "COPIOUS_IRRIGATION",
  "OTHER",
] as const;

export const LACERATION_CLOSURE_VALUES = [
  "SUTURES",
  "STAPLES",
  "TISSUE_ADHESIVE",
  "STERI_STRIPS",
  "SECONDARY_INTENTION",
  /** @deprecated use SECONDARY_INTENTION */
  "LEFT_OPEN",
  "OTHER",
] as const;

export const LACERATION_SUTURES_VALUES = [
  "NONE",
  "COUNT_1_3",
  "COUNT_4_6",
  "COUNT_7_10",
  "COUNT_GT_10",
  /** @deprecated legacy suture types — display-only */
  "NYLON_3_0",
  "NYLON_4_0",
  "NYLON_5_0",
  "ABSORBABLE",
  "STAPLES",
  "OTHER",
] as const;

/** Values shown in ED laceration documentation UI (excludes legacy-only codes). */
export const LACERATION_WOUND_LENGTH_UI_VALUES = [
  "LT_1CM",
  "CM_1_TO_2",
  "CM_2_TO_5",
  "GT_5CM",
  "OTHER",
] as const;

export const LACERATION_ANESTHESIA_UI_VALUES = [
  "NONE",
  "LOCAL_INFILTRATION",
  "LET_TOPICAL",
  "DIGITAL_BLOCK",
  "OTHER",
] as const;

export const LACERATION_SUTURES_UI_VALUES = [
  "NONE",
  "COUNT_1_3",
  "COUNT_4_6",
  "COUNT_7_10",
  "COUNT_GT_10",
  "OTHER",
] as const;

/** Values shown in ED laceration site dropdown (excludes legacy bilateral codes). */
export const LACERATION_SITE_UI_VALUES = [
  "SCALP",
  "FACE",
  "LIP",
  "EAR",
  "NECK",
  "CHEST",
  "ABDOMEN",
  "BACK",
  "UPPER_EXTREMITY",
  "HAND_FINGER",
  "LOWER_EXTREMITY",
  "FOOT_TOE",
  "OTHER",
] as const;

export const LACERATION_CLOSURE_UI_VALUES = [
  "SUTURES",
  "STAPLES",
  "TISSUE_ADHESIVE",
  "STERI_STRIPS",
  "SECONDARY_INTENTION",
  "OTHER",
] as const;

export const LACERATION_IRRIGATION_UI_VALUES = [
  "NORMAL_SALINE",
  "STERILE_WATER",
  "COPIOUS_IRRIGATION",
  "OTHER",
] as const;

const siteEnum = z.enum(LACERATION_SITE_VALUES);
const woundEnum = z.enum(LACERATION_WOUND_LENGTH_VALUES);
const anesthesiaEnum = z.enum(LACERATION_ANESTHESIA_VALUES);
const irrigationEnum = z.enum(LACERATION_IRRIGATION_VALUES);
const closureEnum = z.enum(LACERATION_CLOSURE_VALUES);
const suturesEnum = z.enum(LACERATION_SUTURES_VALUES);

/** POST /encounters/:id/procedures/document — LACERATION_REPAIR only (S14B). */
export const lacerationProcedureDocumentDtoSchema = z
  .object({
    procedureType: z.literal("LACERATION_REPAIR"),
    performedAt: z.preprocess(emptyStrToUndefined, z.string().trim().max(48).optional()),
    site: siteEnum,
    siteOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
    woundLength: woundEnum,
    woundLengthOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(80).optional()),
    anesthesia: anesthesiaEnum,
    anesthesiaOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
    irrigation: irrigationEnum,
    irrigationOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
    closureMethod: closureEnum,
    closureMethodOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
    suturesOrStaples: suturesEnum,
    suturesOrStaplesOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
    asepticTechnique: z.boolean(),
    dressingApplied: z.boolean(),
    toleratedWell: z.boolean(),
    complications: z.preprocess(emptyStrToUndefined, z.string().trim().max(2000).optional()),
    notes: z.preprocess(emptyStrToUndefined, z.string().trim().max(4000).optional()),
  })
  .superRefine((val, ctx) => {
    if (val.site === "OTHER" && !val.siteOther?.trim()) {
      ctx.addIssue({ code: "custom", path: ["siteOther"], message: "siteOther required when site is OTHER" });
    }
    if (val.woundLength === "OTHER" && !val.woundLengthOther?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["woundLengthOther"],
        message: "woundLengthOther required when woundLength is OTHER",
      });
    }
    if (val.anesthesia === "OTHER" && !val.anesthesiaOther?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["anesthesiaOther"],
        message: "anesthesiaOther required when anesthesia is OTHER",
      });
    }
    if (val.irrigation === "OTHER" && !val.irrigationOther?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["irrigationOther"],
        message: "irrigationOther required when irrigation is OTHER",
      });
    }
    if (val.closureMethod === "OTHER" && !val.closureMethodOther?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["closureMethodOther"],
        message: "closureMethodOther required when closureMethod is OTHER",
      });
    }
    if (val.suturesOrStaples === "OTHER" && !val.suturesOrStaplesOther?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["suturesOrStaplesOther"],
        message: "suturesOrStaplesOther required when suturesOrStaples is OTHER",
      });
    }
  });

export type LacerationProcedureDocumentDto = z.infer<typeof lacerationProcedureDocumentDtoSchema>;
