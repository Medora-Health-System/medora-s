/**
 * IV fluid order directions — rate parsing and quick-picks (M1.8B.7K.10B.4).
 */

export type IvInfusionRateUnit = "mL/hr";

export type IvInfusionRateParseResult =
  | { kind: "rate"; rateValue: number; rateUnit: IvInfusionRateUnit }
  | { kind: "bolus" }
  | { kind: "kvo" }
  | { kind: "wide_open" };

function normalizeDirectionsText(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Detect IV fluid / solution medications (NS, LR, D5W, etc.). */
export function isIvFluidMedicationLabel(
  label: string | null | undefined,
  therapeuticClass?: string | null
): boolean {
  const text = normalizeDirectionsText(`${label ?? ""} ${therapeuticClass ?? ""}`);
  if (!text) return false;
  if (text.includes("solute") || text.includes("solution") || text.includes("fluid")) return true;
  if (text.includes("normal saline") || text.includes("chlorure de sodium") || text.includes("nacl"))
    return true;
  if (text.includes("lactated ringer") || text.includes("ringer lactate") || /\blr\b/.test(text))
    return true;
  if (/\bd5w\b/.test(text) || /\bd10w\b/.test(text) || /\bd50w\b/.test(text)) return true;
  if (text.includes("dextrose") || text.includes("glucose")) return true;
  if (/\bns\s*0\.9/.test(text) || text.includes("0.9%")) return true;
  return false;
}

const RATE_PATTERN =
  /\b(\d+(?:\.\d+)?)\s*(?:ml|mL)\s*(?:\/|\s*x\s*|\s+per\s+)\s*(?:hr|hour|h)\b/i;

/** Parse infusion rate / bolus / KVO from directions sig. */
export function parseIvInfusionRateFromDirections(
  directionsSig: string | null | undefined
): IvInfusionRateParseResult | null {
  const raw = directionsSig?.trim();
  if (!raw) return null;
  const text = normalizeDirectionsText(raw);

  if (/\bkvo\b/.test(text) || text.includes("keep vein open")) {
    return { kind: "kvo" };
  }
  if (/\bwide\s*open\b/.test(text) || /\bwo\b/.test(text)) {
    return { kind: "wide_open" };
  }
  if (/\bbolus\b/.test(text)) {
    return { kind: "bolus" };
  }

  const rateMatch = raw.match(RATE_PATTERN) ?? text.match(RATE_PATTERN);
  if (rateMatch) {
    const rateValue = Number(rateMatch[1]);
    if (Number.isFinite(rateValue) && rateValue > 0) {
      return { kind: "rate", rateValue, rateUnit: "mL/hr" };
    }
  }

  return null;
}

export function formatIvInfusionRateDisplay(result: IvInfusionRateParseResult): string {
  if (result.kind === "rate") {
    return `${result.rateValue} ${result.rateUnit}`;
  }
  if (result.kind === "bolus") return "BOLUS";
  if (result.kind === "kvo") return "KVO";
  return "WIDE OPEN";
}

const IV_FLUID_RATE_PICKS = [
  "50 mL/hr",
  "75 mL/hr",
  "100 mL/hr",
  "125 mL/hr",
  "150 mL/hr",
  "200 mL/hr",
  "250 mL/hr",
  "500 mL/hr",
] as const;

export const IV_FLUID_NS_QUICK_PICKS = [
  ...IV_FLUID_RATE_PICKS.map((rate) => `NS 0.9% at ${rate}`),
  "NS 0.9% bolus 500 mL",
  "NS 0.9% bolus 1 L",
  "NS 0.9% bolus",
  "NS 0.9% wide open",
  "NS 0.9% KVO",
] as const;

export const IV_FLUID_LR_QUICK_PICKS = [
  ...IV_FLUID_RATE_PICKS.map((rate) => `LR at ${rate}`),
  "LR bolus 500 mL",
  "LR bolus 1 L",
  "LR bolus",
  "LR wide open",
  "LR KVO",
] as const;

export const IV_FLUID_D5W_QUICK_PICKS = [
  ...IV_FLUID_RATE_PICKS.map((rate) => `D5W at ${rate}`),
  "D5W bolus 500 mL",
  "D5W bolus 1 L",
  "D5W wide open",
  "D5W KVO",
] as const;

export const IV_FLUID_GENERIC_QUICK_PICKS = [
  ...IV_FLUID_RATE_PICKS,
  "bolus",
  "wide open",
  "KVO",
] as const;

function resolveIvFluidQuickPickFamily(label: string | null | undefined): readonly string[] {
  const text = normalizeDirectionsText(label ?? "");
  if (
    text.includes("normal saline") ||
    text.includes("chlorure de sodium") ||
    text.includes("nacl") ||
    /\bns\b/.test(text)
  ) {
    return IV_FLUID_NS_QUICK_PICKS;
  }
  if (text.includes("lactated ringer") || text.includes("ringer lactate") || /\blr\b/.test(text)) {
    return IV_FLUID_LR_QUICK_PICKS;
  }
  if (/\bd5w\b/.test(text) || (text.includes("dextrose") && text.includes("5"))) {
    return IV_FLUID_D5W_QUICK_PICKS;
  }
  if (/\bd10w\b/.test(text)) {
    return [
      "D10W as ordered",
      ...IV_FLUID_RATE_PICKS.map((rate) => `D10W at ${rate}`),
      "D10W bolus",
      "D10W wide open",
      "D10W KVO",
    ];
  }
  if (/\bd50w\b/.test(text) || /\bd50\b/.test(text)) {
    return ["D50W as ordered", "D50W bolus", "D50W wide open"];
  }
  if (/\bd5ns\b/.test(text)) {
    return [
      ...IV_FLUID_RATE_PICKS.map((rate) => `D5NS at ${rate}`),
      "D5NS bolus",
      "D5NS wide open",
      "D5NS KVO",
    ];
  }
  return IV_FLUID_GENERIC_QUICK_PICKS;
}

export function isIvInfusionCapableRoute(route: string | null | undefined): boolean {
  const token = route?.trim().toUpperCase() ?? "";
  if (!token) return false;
  return token === "IV" || token === "IVPB" || token.includes("INTRAVENOUS");
}

/** Fluid-aware direction quick-picks when route + label indicate IV solution. */
export function medicationDirectionQuickPicksForIvFluid(
  route: string | null | undefined,
  label: string | null | undefined,
  therapeuticClass?: string | null
): readonly string[] | null {
  if (!isIvInfusionCapableRoute(route)) return null;
  if (!isIvFluidMedicationLabel(label, therapeuticClass)) return null;
  return [...resolveIvFluidQuickPickFamily(label)];
}
