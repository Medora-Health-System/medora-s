/**
 * Hospital continuous IV fluid order classification (K.10B.8).
 * Builds on ivFluidOrderDirections — does not replace IVPB antibiotic infusion lifecycle.
 */
import { isMedicationInfusionCandidate, type MedicationInfusionCandidateInput } from "./infusionRoute.util.js";
import {
  formatIvInfusionRateDisplay,
  isIvFluidMedicationLabel,
  parseIvInfusionRateFromDirections,
  type IvInfusionRateParseResult,
} from "./ivFluidOrderDirections.js";

export type FluidOrderType = "CONTINUOUS" | "BOLUS";

export type FluidRateResolution =
  | { kind: "rate"; rateMlPerHr: number }
  | { kind: "kvo" }
  | { kind: "wide_open" }
  | { kind: "bolus"; volumeMl?: number | null };

export const STANDARD_FLUID_RATES_ML_PER_HR = [
  50, 75, 100, 125, 150, 200, 250, 500,
] as const;

export const STANDARD_FLUID_BAG_SIZES_ML = [250, 500, 1000] as const;

const IV_ANTIBIOTIC_TOKENS = [
  "ceftriaxone",
  "cefazolin",
  "cefepime",
  "vancomycin",
  "piperacillin",
  "tazobactam",
  "zosyn",
  "meropenem",
  "ampicillin",
  "metronidazole",
  "levofloxacin",
  "ciprofloxacin",
  "azithromycin",
  "clindamycin",
  "gentamicin",
  "tobramycin",
] as const;

function normalizeText(raw: string | null | undefined): string {
  return (raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function haystack(input: {
  medicationLabel?: string | null;
  genericName?: string | null;
  code?: string | null;
  therapeuticClass?: string | null;
  directionsSig?: string | null;
}): string {
  return normalizeText(
    `${input.medicationLabel ?? ""} ${input.genericName ?? ""} ${input.code ?? ""} ${input.therapeuticClass ?? ""} ${input.directionsSig ?? ""}`
  );
}

function isIvAntibioticFluidContext(text: string): boolean {
  for (const token of IV_ANTIBIOTIC_TOKENS) {
    if (text.includes(token)) return true;
  }
  return false;
}

/** Recognized crystalloid / IV fluid labels (NS, LR, D5W, etc.). */
export function isRecognizedHospitalFluidLabel(
  medicationLabel?: string | null,
  therapeuticClass?: string | null
): boolean {
  return isIvFluidMedicationLabel(medicationLabel, therapeuticClass);
}

/** Parse bag size (mL) from directions or explicit bag field. */
export function parseFluidBagSizeMl(
  directionsSig?: string | null,
  explicitBagMl?: number | null
): number | null {
  if (explicitBagMl != null && Number.isFinite(explicitBagMl) && explicitBagMl > 0) {
    return Math.round(explicitBagMl);
  }
  const text = normalizeText(directionsSig);
  if (!text) return null;
  const bagMatch = text.match(/\b(\d{2,4})\s*ml\s+bag\b/);
  if (bagMatch) return Number(bagMatch[1]);
  const bolusVol = text.match(/\bbolus\s+(\d{2,4})\s*ml\b/);
  if (bolusVol) return Number(bolusVol[1]);
  const literMatch = text.match(/\b(\d+(?:\.\d+)?)\s*l\b/);
  if (literMatch) return Math.round(Number(literMatch[1]) * 1000);
  for (const size of STANDARD_FLUID_BAG_SIZES_ML) {
    if (text.includes(`${size} ml`) || text.includes(`${size}ml`)) return size;
  }
  return null;
}

/** Resolve fluid rate / KVO / wide open / bolus from directions. */
export function resolveFluidRate(
  directionsSig?: string | null
): FluidRateResolution | null {
  const parsed = parseIvInfusionRateFromDirections(directionsSig);
  if (!parsed) {
    const text = normalizeText(directionsSig);
    const bolusVol = text.match(/\b(\d{2,4})\s*ml\s+bolus\b/);
    if (bolusVol) {
      return { kind: "bolus", volumeMl: Number(bolusVol[1]) };
    }
    return null;
  }
  return mapIvRateParseResult(parsed, directionsSig);
}

function mapIvRateParseResult(
  parsed: IvInfusionRateParseResult,
  directionsSig?: string | null
): FluidRateResolution {
  if (parsed.kind === "rate") {
    return { kind: "rate", rateMlPerHr: parsed.rateValue };
  }
  if (parsed.kind === "bolus") {
    return { kind: "bolus", volumeMl: parseFluidBagSizeMl(directionsSig) };
  }
  if (parsed.kind === "kvo") return { kind: "kvo" };
  return { kind: "wide_open" };
}

export function formatFluidRateDisplay(rate: FluidRateResolution | null): string | null {
  if (!rate) return null;
  if (rate.kind === "rate") return `${rate.rateMlPerHr} mL/hr`;
  if (rate.kind === "bolus") {
    return rate.volumeMl ? `${rate.volumeMl} mL BOLUS` : "BOLUS";
  }
  if (rate.kind === "kvo") return "KVO";
  return "WIDE OPEN";
}

export function isFluidBolusOrder(input: {
  medicationLabel?: string | null;
  therapeuticClass?: string | null;
  directionsSig?: string | null;
}): boolean {
  if (!isRecognizedHospitalFluidLabel(input.medicationLabel, input.therapeuticClass)) {
    return false;
  }
  const rate = resolveFluidRate(input.directionsSig);
  return rate?.kind === "bolus";
}

/**
 * Continuous hospital fluid (not IVPB antibiotic bag, not bolus).
 * Uses dedicated START/PAUSE/RESUME/STOP fluid lifecycle (K.10B.8).
 */
export function isContinuousFluidOrder(input: {
  medicationLabel?: string | null;
  genericName?: string | null;
  code?: string | null;
  therapeuticClass?: string | null;
  directionsSig?: string | null;
  route?: string | null;
}): boolean {
  if (!isRecognizedHospitalFluidLabel(input.medicationLabel, input.therapeuticClass)) {
    return false;
  }
  if (isFluidBolusOrder(input)) return false;

  const text = haystack(input);
  if (isIvAntibioticFluidContext(text)) return false;

  const infusionCandidate = isMedicationInfusionCandidate({
    medicationLabel: input.medicationLabel,
    genericName: input.genericName,
    code: input.code,
    route: input.route,
    therapeuticClass: input.therapeuticClass,
  } as MedicationInfusionCandidateInput);

  const rate = resolveFluidRate(input.directionsSig);
  if (!rate) return false;
  if (rate.kind === "bolus") return false;

  if (infusionCandidate && isIvAntibioticFluidContext(text)) return false;

  return rate.kind === "rate" || rate.kind === "kvo" || rate.kind === "wide_open";
}

export function resolveFluidOrderType(input: {
  medicationLabel?: string | null;
  genericName?: string | null;
  code?: string | null;
  therapeuticClass?: string | null;
  directionsSig?: string | null;
  route?: string | null;
}): FluidOrderType | null {
  if (!isRecognizedHospitalFluidLabel(input.medicationLabel, input.therapeuticClass)) {
    return null;
  }
  if (isFluidBolusOrder(input)) return "BOLUS";
  if (isContinuousFluidOrder(input)) return "CONTINUOUS";
  return null;
}

/** Numeric mL/hr for volume math; KVO uses conservative default; wide open excluded from auto-volume. */
export function resolveFluidRateMlPerHrForVolume(
  rate: FluidRateResolution | null
): number | null {
  if (!rate) return null;
  if (rate.kind === "rate") return rate.rateMlPerHr;
  if (rate.kind === "kvo") return 10;
  return null;
}

export function formatFluidBagDisplay(
  bagMl: number | null | undefined,
  rateLabel: string | null
): string | null {
  if (!bagMl && !rateLabel) return null;
  const parts: string[] = [];
  if (bagMl) parts.push(`${bagMl} mL bag`);
  if (rateLabel) parts.push(rateLabel);
  return parts.join(" · ") || null;
}

export function abbreviateFluidPrimaryLabel(medicationLabel: string | null | undefined): string {
  const text = normalizeText(medicationLabel);
  if (!text) return "IV Fluid";
  if (text.includes("normal saline") || /\bns\b/.test(text) || text.includes("0.9%")) {
    return "NS 0.9%";
  }
  if (text.includes("lactated ringer") || /\blr\b/.test(text)) return "LR";
  if (/\bd5w\b/.test(text)) return "D5W";
  if (/\bd5ns\b/.test(text)) return "D5NS";
  if (/\bd10w\b/.test(text)) return "D10W";
  if (/\bd50w\b/.test(text)) return "D50W";
  if (text.includes("0.45") || text.includes("half normal")) return "0.45% NS";
  const raw = medicationLabel?.trim();
  if (!raw) return "IV Fluid";
  return raw.length <= 24 ? raw : `${raw.slice(0, 22)}…`;
}

/** Re-export for display consistency. */
export { formatIvInfusionRateDisplay };
