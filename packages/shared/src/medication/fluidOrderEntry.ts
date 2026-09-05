/**
 * Structured IV fluid order entry (K.10B.8A — provider bag/rate picker).
 */
import { pickProductUiCopy } from "../i18n/productUiLocale.js";
import { isIvFluidMedicationLabel } from "./ivFluidOrderDirections.js";
import {
  STANDARD_FLUID_BAG_SIZES_ML,
  STANDARD_FLUID_RATES_ML_PER_HR,
} from "./continuousFluidOrder.js";
import { parseIvInfusionRateFromDirections } from "./ivFluidOrderDirections.js";

export type FluidOrderEntryTypeCode =
  | "NS"
  | "LR"
  | "D5W"
  | "D5NS"
  | "D10W"
  | "D50W"
  | "HALF_NS";

export type FluidOrderBagSizeMl = (typeof STANDARD_FLUID_BAG_SIZES_ML)[number];

export type FluidOrderRateSelection =
  | { mode: "continuous"; rateMlPerHr: (typeof STANDARD_FLUID_RATES_ML_PER_HR)[number] }
  | { mode: "continuous"; special: "KVO" }
  | { mode: "continuous"; special: "WIDE_OPEN" }
  | { mode: "bolus" };

export type FluidOrderDraft = {
  fluidType: FluidOrderEntryTypeCode;
  bagSizeMl: FluidOrderBagSizeMl;
  rateSelection: FluidOrderRateSelection;
};

export const FLUID_ORDER_ENTRY_TYPE_OPTIONS: ReadonlyArray<{
  code: FluidOrderEntryTypeCode;
  labelFr: string;
  labelEn: string;
  labelEs: string;
}> = [
  {
    code: "NS",
    labelFr: "Chlorure de sodium 0,9 % (NS)",
    labelEn: "Normal Saline / NS",
    labelEs: "Cloruro de sodio 0,9 % (NS)",
  },
  {
    code: "LR",
    labelFr: "Ringer lactate (LR)",
    labelEn: "Lactated Ringer's / LR",
    labelEs: "Lactato de Ringer (LR)",
  },
  { code: "D5W", labelFr: "D5W", labelEn: "D5W", labelEs: "D5W" },
  { code: "D5NS", labelFr: "D5NS", labelEn: "D5NS", labelEs: "D5NS" },
  { code: "D10W", labelFr: "D10W", labelEn: "D10W", labelEs: "D10W" },
  { code: "D50W", labelFr: "D50W", labelEn: "D50W", labelEs: "D50W" },
  { code: "HALF_NS", labelFr: "NS 0,45 %", labelEn: "0.45% NS", labelEs: "NS 0,45 %" },
] as const;

export function resolveFluidOrderEntryTypeDisplay(
  opt: (typeof FLUID_ORDER_ENTRY_TYPE_OPTIONS)[number],
  locale: string | null | undefined
): string {
  return pickProductUiCopy(locale, { en: opt.labelEn, fr: opt.labelFr, es: opt.labelEs }, opt.labelEs);
}

export function fluidOrderEntryTypeLabel(code: FluidOrderEntryTypeCode): string {
  switch (code) {
    case "NS":
      return "NS 0.9%";
    case "LR":
      return "LR";
    case "D5W":
      return "D5W";
    case "D5NS":
      return "D5NS";
    case "D10W":
      return "D10W";
    case "D50W":
      return "D50W";
    case "HALF_NS":
      return "0.45% NS";
    default:
      return "IV Fluid";
  }
}

export function defaultFluidOrderDraft(): FluidOrderDraft {
  return {
    fluidType: "NS",
    bagSizeMl: 1000,
    rateSelection: { mode: "continuous", rateMlPerHr: 100 },
  };
}

/** Show structured fluid fields when catalog line is an IV fluid solution on an IV route. */
export function shouldShowFluidOrderEntryFields(input: {
  label?: string | null;
  therapeuticClass?: string | null;
  route?: string | null;
}): boolean {
  if (!isIvFluidMedicationLabel(input.label, input.therapeuticClass)) return false;
  const route = (input.route ?? "").trim().toUpperCase();
  return route === "IV" || route === "IVP" || route === "IVPB" || route === "";
}

export function buildFluidOrderDirections(draft: FluidOrderDraft): string {
  const typeLabel = fluidOrderEntryTypeLabel(draft.fluidType);
  const bagPart = `${draft.bagSizeMl} mL`;
  if (draft.rateSelection.mode === "bolus") {
    return `${typeLabel} ${bagPart} bolus`;
  }
  if ("special" in draft.rateSelection) {
    if (draft.rateSelection.special === "KVO") {
      return `${typeLabel} ${bagPart} at KVO`;
    }
    return `${typeLabel} ${bagPart} at Wide Open`;
  }
  return `${typeLabel} ${bagPart} at ${draft.rateSelection.rateMlPerHr} mL/hr`;
}

function normalizeDraftText(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Best-effort parse structured draft from free-text directions (sync picker when possible). */
export function parseFluidOrderDraftFromDirections(
  directionsSig?: string | null
): FluidOrderDraft | null {
  const raw = directionsSig?.trim();
  if (!raw) return null;
  const text = normalizeDraftText(raw);

  let fluidType: FluidOrderEntryTypeCode = "NS";
  if (/\blr\b/.test(text) || text.includes("lactated ringer")) fluidType = "LR";
  else if (/\bd5ns\b/.test(text)) fluidType = "D5NS";
  else if (/\bd5w\b/.test(text)) fluidType = "D5W";
  else if (/\bd10w\b/.test(text)) fluidType = "D10W";
  else if (/\bd50w\b/.test(text)) fluidType = "D50W";
  else if (text.includes("0.45") || text.includes("half normal")) fluidType = "HALF_NS";

  const bagMatch = text.match(/\b(250|500|1000)\s*ml\b/);
  const bagSizeMl = bagMatch
    ? (Number(bagMatch[1]) as FluidOrderBagSizeMl)
    : (1000 as FluidOrderBagSizeMl);

  if (/\bbolus\b/.test(text)) {
    return { fluidType, bagSizeMl, rateSelection: { mode: "bolus" } };
  }

  const parsed = parseIvInfusionRateFromDirections(raw);
  if (parsed?.kind === "kvo") {
    return { fluidType, bagSizeMl, rateSelection: { mode: "continuous", special: "KVO" } };
  }
  if (parsed?.kind === "wide_open") {
    return { fluidType, bagSizeMl, rateSelection: { mode: "continuous", special: "WIDE_OPEN" } };
  }
  if (parsed?.kind === "rate") {
    if ((STANDARD_FLUID_RATES_ML_PER_HR as readonly number[]).includes(parsed.rateValue)) {
      return {
        fluidType,
        bagSizeMl,
        rateSelection: {
          mode: "continuous",
          rateMlPerHr: parsed.rateValue as (typeof STANDARD_FLUID_RATES_ML_PER_HR)[number],
        },
      };
    }
  }

  return null;
}
