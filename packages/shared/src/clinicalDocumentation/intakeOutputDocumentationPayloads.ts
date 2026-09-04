import { z } from "zod";
import {
  clinicalDocSummaryKey,
  clinicalDocYesNo,
  pickLocalizedEnumLabel,
  type ClinicalDocumentationSummaryLocale,
} from "./clinicalDocumentationSummaryLocale.js";

export const IO_INTAKE_OUTPUT_SUMMARY_CARD_ID = "io_intake_output" as const;
export const IO_FLUID_INTAKE_CARD_ID = "io_fluid_intake" as const;
export const IO_PO_INTAKE_CARD_ID = "io_po_intake" as const;
export const IO_IV_INTAKE_CARD_ID = "io_iv_intake" as const;
export const IO_BLOOD_PRODUCT_INTAKE_CARD_ID = "io_blood_product_intake" as const;
export const IO_URINE_OUTPUT_CARD_ID = "io_urine_output" as const;
export const IO_STOOL_OUTPUT_CARD_ID = "io_stool_output" as const;
export const IO_EMESIS_OUTPUT_CARD_ID = "io_emesis_output" as const;
export const IO_NG_OUTPUT_CARD_ID = "io_ng_output" as const;
export const IO_DRAIN_OUTPUT_CARD_ID = "io_drain_output" as const;

export const EDOC5_INTAKE_OUTPUT_CARD_IDS = [
  IO_INTAKE_OUTPUT_SUMMARY_CARD_ID,
  IO_FLUID_INTAKE_CARD_ID,
  IO_PO_INTAKE_CARD_ID,
  IO_IV_INTAKE_CARD_ID,
  IO_BLOOD_PRODUCT_INTAKE_CARD_ID,
  IO_URINE_OUTPUT_CARD_ID,
  IO_STOOL_OUTPUT_CARD_ID,
  IO_EMESIS_OUTPUT_CARD_ID,
  IO_NG_OUTPUT_CARD_ID,
  IO_DRAIN_OUTPUT_CARD_ID,
] as const;

export type Edoc5IntakeOutputCardId = (typeof EDOC5_INTAKE_OUTPUT_CARD_IDS)[number];

const optionalNotes = z.string().trim().max(2000).optional();
const ioUnit = z.enum(["ML", "L", "OZ", "CC"]);
const positiveAmount = z.coerce.number().positive();

const isoDateTimeString = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date/time" });

export const OZ_TO_ML = 29.5735;
export const L_TO_ML = 1000;

export function convertAmountToMl(amount: number, unit: string): number {
  switch (unit) {
    case "ML":
    case "CC":
      return amount;
    case "L":
      return amount * L_TO_ML;
    case "OZ":
      return amount * OZ_TO_ML;
    default:
      return amount;
  }
}

export const intakeOutputSummaryPayloadSchema = z
  .object({
    summaryStartTime: isoDateTimeString,
    summaryEndTime: isoDateTimeString,
    totalIntakeMl: z.coerce.number().min(0),
    totalOutputMl: z.coerce.number().min(0),
    netBalanceMl: z.coerce.number(),
    includesEstimatedValues: z.boolean(),
    reviewedByNurse: z.boolean(),
    providerNotified: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (Date.parse(data.summaryEndTime) <= Date.parse(data.summaryStartTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "summaryEndTime must be after summaryStartTime",
        path: ["summaryEndTime"],
      });
    }
    if (!data.includesEstimatedValues) {
      const expected = data.totalIntakeMl - data.totalOutputMl;
      if (data.netBalanceMl !== expected) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "netBalanceMl must equal totalIntakeMl - totalOutputMl",
          path: ["netBalanceMl"],
        });
      }
    }
  });

export const fluidIntakePayloadSchema = z.object({
  recordedAt: isoDateTimeString,
  amount: positiveAmount,
  unit: ioUnit,
  route: z.enum(["ORAL", "IV", "ENTERAL", "OTHER"]),
  fluidType: z.string().trim().min(1).max(200),
  notes: optionalNotes,
});

export const poIntakePayloadSchema = z.object({
  recordedAt: isoDateTimeString,
  amount: positiveAmount,
  unit: ioUnit,
  substance: z.string().trim().min(1).max(200),
  tolerated: z.enum(["YES", "NO", "PARTIAL"]),
  nausea: z.boolean(),
  vomiting: z.boolean(),
  notes: optionalNotes,
});

export const ivIntakePayloadSchema = z.object({
  recordedAt: isoDateTimeString,
  amount: positiveAmount,
  unit: ioUnit,
  fluidType: z.string().trim().min(1).max(200),
  accessSite: z.string().trim().max(120).optional(),
  infusionRelated: z.boolean(),
  notes: optionalNotes,
});

export const bloodProductIntakePayloadSchema = z.object({
  recordedAt: isoDateTimeString,
  amount: positiveAmount,
  unit: ioUnit,
  productType: z.enum(["PRBC", "FFP", "PLATELETS", "CRYO", "WHOLE_BLOOD", "OTHER"]),
  unitIdentifier: z.string().trim().max(120).optional(),
  transfusionRecordLinked: z.boolean(),
  reactionSuspected: z.boolean(),
  notes: optionalNotes,
});

export const urineOutputPayloadSchema = z.object({
  recordedAt: isoDateTimeString,
  amount: positiveAmount,
  unit: ioUnit,
  method: z.enum(["VOIDED", "FOLEY", "STRAIGHT_CATH", "URINAL", "BEDPAN", "OTHER"]),
  color: z.string().trim().max(80).optional(),
  notes: optionalNotes,
});

export const stoolOutputPayloadSchema = z.object({
  recordedAt: isoDateTimeString,
  occurrenceCount: z.coerce.number().int().min(1),
  estimatedAmount: positiveAmount.optional(),
  unit: ioUnit.optional(),
  consistency: z.enum(["FORMED", "LOOSE", "WATERY", "BLOODY", "BLACK_TARRY", "OTHER"]),
  notes: optionalNotes,
});

export const emesisOutputPayloadSchema = z
  .object({
    recordedAt: isoDateTimeString,
    amount: positiveAmount.optional(),
    unit: ioUnit.optional(),
    occurrenceCount: z.coerce.number().int().min(1),
    appearance: z.enum(["CLEAR", "FOOD_CONTENT", "BILIOUS", "BLOODY", "COFFEE_GROUND", "OTHER"]),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.amount != null && !data.unit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "unit required when amount is provided",
        path: ["unit"],
      });
    }
  });

export const ngOutputPayloadSchema = z.object({
  recordedAt: isoDateTimeString,
  amount: positiveAmount,
  unit: ioUnit,
  appearance: z.enum(["CLEAR", "BILIOUS", "BLOODY", "COFFEE_GROUND", "FOOD_CONTENT", "OTHER"]),
  suctionType: z.enum([
    "LOW_INTERMITTENT",
    "LOW_CONTINUOUS",
    "GRAVITY",
    "CLAMPED",
    "OTHER",
  ]),
  notes: optionalNotes,
});

export const drainOutputPayloadSchema = z.object({
  recordedAt: isoDateTimeString,
  amount: positiveAmount,
  unit: ioUnit,
  drainType: z.string().trim().min(1).max(120),
  drainLocation: z.string().trim().max(120).optional(),
  appearance: z.enum(["SEROUS", "SEROSANGUINOUS", "SANGUINEOUS", "PURULENT", "BILIOUS", "OTHER"]),
  notes: optionalNotes,
});

const INTAKE_OUTPUT_PAYLOAD_SCHEMA_BY_CARD_ID: Record<string, z.ZodType<Record<string, unknown>>> = {
  [IO_INTAKE_OUTPUT_SUMMARY_CARD_ID]: intakeOutputSummaryPayloadSchema,
  [IO_FLUID_INTAKE_CARD_ID]: fluidIntakePayloadSchema,
  [IO_PO_INTAKE_CARD_ID]: poIntakePayloadSchema,
  [IO_IV_INTAKE_CARD_ID]: ivIntakePayloadSchema,
  [IO_BLOOD_PRODUCT_INTAKE_CARD_ID]: bloodProductIntakePayloadSchema,
  [IO_URINE_OUTPUT_CARD_ID]: urineOutputPayloadSchema,
  [IO_STOOL_OUTPUT_CARD_ID]: stoolOutputPayloadSchema,
  [IO_EMESIS_OUTPUT_CARD_ID]: emesisOutputPayloadSchema,
  [IO_NG_OUTPUT_CARD_ID]: ngOutputPayloadSchema,
  [IO_DRAIN_OUTPUT_CARD_ID]: drainOutputPayloadSchema,
};

const INTAKE_CARD_IDS = new Set<string>([
  IO_FLUID_INTAKE_CARD_ID,
  IO_PO_INTAKE_CARD_ID,
  IO_IV_INTAKE_CARD_ID,
  IO_BLOOD_PRODUCT_INTAKE_CARD_ID,
]);

const OUTPUT_CARD_IDS = new Set<string>([
  IO_URINE_OUTPUT_CARD_ID,
  IO_STOOL_OUTPUT_CARD_ID,
  IO_EMESIS_OUTPUT_CARD_ID,
  IO_NG_OUTPUT_CARD_ID,
  IO_DRAIN_OUTPUT_CARD_ID,
]);

export function isEdoc5IntakeOutputCardId(cardId: string): cardId is Edoc5IntakeOutputCardId {
  return (EDOC5_INTAKE_OUTPUT_CARD_IDS as readonly string[]).includes(cardId);
}

export function validateIntakeOutputPayloadForCard(
  cardId: string,
  payload: Record<string, unknown>
): { ok: true; data: Record<string, unknown> } | { ok: false; message: string } {
  const schema = INTAKE_OUTPUT_PAYLOAD_SCHEMA_BY_CARD_ID[cardId];
  if (!schema) {
    return { ok: false, message: "Card is not available for structured save" };
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: "Invalid clinical documentation payload" };
  }
  return { ok: true, data: parsed.data as Record<string, unknown> };
}

export type IntakeOutputDirection = "INTAKE" | "OUTPUT" | "SUMMARY" | "UNKNOWN";

export function classifyIntakeOutputDirection(
  cardId: string,
  _payload?: Record<string, unknown>
): IntakeOutputDirection {
  if (cardId === IO_INTAKE_OUTPUT_SUMMARY_CARD_ID) return "SUMMARY";
  if (INTAKE_CARD_IDS.has(cardId)) return "INTAKE";
  if (OUTPUT_CARD_IDS.has(cardId)) return "OUTPUT";
  return "UNKNOWN";
}

export function normalizeIntakeOutputAmountToMl(
  cardId: string,
  payload: Record<string, unknown>
): number {
  if (cardId === IO_INTAKE_OUTPUT_SUMMARY_CARD_ID) return 0;

  if (cardId === IO_STOOL_OUTPUT_CARD_ID) {
    const estimated = payload.estimatedAmount;
    if (typeof estimated !== "number" || estimated <= 0) return 0;
    const unit = typeof payload.unit === "string" ? payload.unit : "ML";
    return convertAmountToMl(estimated, unit);
  }

  if (cardId === IO_EMESIS_OUTPUT_CARD_ID) {
    const amount = payload.amount;
    if (typeof amount !== "number" || amount <= 0) return 0;
    const unit = typeof payload.unit === "string" ? payload.unit : "ML";
    return convertAmountToMl(amount, unit);
  }

  const amount = payload.amount;
  const unit = payload.unit;
  if (typeof amount !== "number" || amount <= 0) return 0;
  if (typeof unit !== "string") return 0;
  return convertAmountToMl(amount, unit);
}

export function calculateIntakeOutputTotals(
  entries: ReadonlyArray<{ cardId: string; payload: Record<string, unknown> }>
): { totalIntakeMl: number; totalOutputMl: number; netBalanceMl: number } {
  let totalIntakeMl = 0;
  let totalOutputMl = 0;

  for (const entry of entries) {
    if (entry.cardId === IO_INTAKE_OUTPUT_SUMMARY_CARD_ID) continue;
    const ml = normalizeIntakeOutputAmountToMl(entry.cardId, entry.payload);
    if (ml <= 0) continue;
    const direction = classifyIntakeOutputDirection(entry.cardId, entry.payload);
    if (direction === "INTAKE") totalIntakeMl += ml;
    else if (direction === "OUTPUT") totalOutputMl += ml;
  }

  return {
    totalIntakeMl: Math.round(totalIntakeMl * 100) / 100,
    totalOutputMl: Math.round(totalOutputMl * 100) / 100,
    netBalanceMl: Math.round((totalIntakeMl - totalOutputMl) * 100) / 100,
  };
}

function formatMl(amountMl: number, unit: string, rawAmount: number): string {
  if (unit === "ML" || unit === "CC") return `${rawAmount} mL`;
  if (unit === "L") return `${rawAmount} L`;
  if (unit === "OZ") return `${rawAmount} oz`;
  return `${rawAmount} ${unit}`;
}

const TOLERATED_EN: Record<string, string> = {
  YES: "Yes",
  NO: "No",
  PARTIAL: "Partial",
};

const TOLERATED_FR: Record<string, string> = {
  YES: "Oui",
  NO: "Non",
  PARTIAL: "Partiel",
};

const URINE_METHOD_EN: Record<string, string> = {
  VOIDED: "Voided",
  FOLEY: "Foley",
  STRAIGHT_CATH: "Straight cath",
  URINAL: "Urinal",
  BEDPAN: "Bedpan",
  OTHER: "Other",
};

const URINE_METHOD_FR: Record<string, string> = {
  VOIDED: "Miction spontanée",
  FOLEY: "Sonde urinaire",
  STRAIGHT_CATH: "Sondage évacuateur",
  URINAL: "Urinal",
  BEDPAN: "Bassin",
  OTHER: "Autre",
};

const PRODUCT_TYPE_EN: Record<string, string> = {
  PRBC: "PRBC",
  FFP: "FFP",
  PLATELETS: "Platelets",
  CRYO: "Cryo",
  WHOLE_BLOOD: "Whole blood",
  OTHER: "Other",
};

const PRODUCT_TYPE_FR: Record<string, string> = {
  PRBC: "CGR",
  FFP: "PFC",
  PLATELETS: "Plaquettes",
  CRYO: "Cryoprécipité",
  WHOLE_BLOOD: "Sang total",
  OTHER: "Autre",
};

export function summarizeIntakeOutputDocumentationPayload(
  cardId: string,
  payload: Record<string, unknown>,
  locale: ClinicalDocumentationSummaryLocale
): Array<{ key: string; value: string }> {
  switch (cardId) {
    case IO_INTAKE_OUTPUT_SUMMARY_CARD_ID: {
      const p = intakeOutputSummaryPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: clinicalDocSummaryKey(locale, "Intake", "Apports"),
          value: `${p.data.totalIntakeMl} mL`,
        },
        {
          key: clinicalDocSummaryKey(locale, "Output", "Sorties"),
          value: `${p.data.totalOutputMl} mL`,
        },
        {
          key: clinicalDocSummaryKey(locale, "Net balance", "Bilan"),
          value: `${p.data.netBalanceMl >= 0 ? "+" : ""}${p.data.netBalanceMl} mL`,
        },
      ];
    }
    case IO_FLUID_INTAKE_CARD_ID: {
      const p = fluidIntakePayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: clinicalDocSummaryKey(locale, "Intake", "Apport"),
          value: `${formatMl(convertAmountToMl(p.data.amount, p.data.unit), p.data.unit, p.data.amount)} — ${p.data.fluidType}`,
        },
        { key: clinicalDocSummaryKey(locale, "Recorded", "Enregistré"), value: p.data.recordedAt },
      ];
    }
    case IO_PO_INTAKE_CARD_ID: {
      const p = poIntakePayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: "PO",
          value: `${formatMl(convertAmountToMl(p.data.amount, p.data.unit), p.data.unit, p.data.amount)} ${p.data.substance}`,
        },
        {
          key: clinicalDocSummaryKey(locale, "Tolerated", "Tolérance"),
          value: pickLocalizedEnumLabel(TOLERATED_EN, TOLERATED_FR, p.data.tolerated, locale),
        },
      ];
    }
    case IO_IV_INTAKE_CARD_ID: {
      const p = ivIntakePayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: clinicalDocSummaryKey(locale, "IV intake", "Apport IV"),
          value: `${formatMl(convertAmountToMl(p.data.amount, p.data.unit), p.data.unit, p.data.amount)} ${p.data.fluidType}`,
        },
      ];
    }
    case IO_BLOOD_PRODUCT_INTAKE_CARD_ID: {
      const p = bloodProductIntakePayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: clinicalDocSummaryKey(locale, "Blood product intake", "Apport produit sanguin"),
          value: `${formatMl(convertAmountToMl(p.data.amount, p.data.unit), p.data.unit, p.data.amount)} ${pickLocalizedEnumLabel(PRODUCT_TYPE_EN, PRODUCT_TYPE_FR, p.data.productType, locale)}`,
        },
        {
          key: clinicalDocSummaryKey(locale, "Transfusion link", "Lien transfusion"),
          value: clinicalDocYesNo(p.data.transfusionRecordLinked, locale),
        },
      ];
    }
    case IO_URINE_OUTPUT_CARD_ID: {
      const p = urineOutputPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: clinicalDocSummaryKey(locale, "Output", "Sortie"),
          value: `${formatMl(convertAmountToMl(p.data.amount, p.data.unit), p.data.unit, p.data.amount)}`,
        },
        {
          key: clinicalDocSummaryKey(locale, "Method", "Méthode"),
          value: pickLocalizedEnumLabel(URINE_METHOD_EN, URINE_METHOD_FR, p.data.method, locale),
        },
      ];
    }
    case IO_STOOL_OUTPUT_CARD_ID: {
      const p = stoolOutputPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const lines: Array<{ key: string; value: string }> = [
        { key: clinicalDocSummaryKey(locale, "Occurrences", "Occurrences"), value: String(p.data.occurrenceCount) },
      ];
      if (p.data.estimatedAmount != null) {
        lines.push({
          key: clinicalDocSummaryKey(locale, "Estimated volume", "Volume estimé"),
          value: formatMl(
            convertAmountToMl(p.data.estimatedAmount, p.data.unit ?? "ML"),
            p.data.unit ?? "ML",
            p.data.estimatedAmount
          ),
        });
      }
      return lines;
    }
    case IO_EMESIS_OUTPUT_CARD_ID: {
      const p = emesisOutputPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const lines: Array<{ key: string; value: string }> = [
        { key: clinicalDocSummaryKey(locale, "Occurrences", "Occurrences"), value: String(p.data.occurrenceCount) },
      ];
      if (p.data.amount != null && p.data.unit) {
        lines.unshift({
          key: clinicalDocSummaryKey(locale, "Output", "Sortie"),
          value: formatMl(convertAmountToMl(p.data.amount, p.data.unit), p.data.unit, p.data.amount),
        });
      }
      return lines;
    }
    case IO_NG_OUTPUT_CARD_ID: {
      const p = ngOutputPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: clinicalDocSummaryKey(locale, "NG output", "Sortie NG"),
          value: formatMl(convertAmountToMl(p.data.amount, p.data.unit), p.data.unit, p.data.amount),
        },
      ];
    }
    case IO_DRAIN_OUTPUT_CARD_ID: {
      const p = drainOutputPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: clinicalDocSummaryKey(locale, "Drain", "Drain"),
          value: `${formatMl(convertAmountToMl(p.data.amount, p.data.unit), p.data.unit, p.data.amount)} — ${p.data.drainType}`,
        },
      ];
    }
    default:
      return [];
  }
}
