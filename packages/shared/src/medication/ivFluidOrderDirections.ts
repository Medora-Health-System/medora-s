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

export const IV_FLUID_NS_QUICK_PICKS = [
  "NS 0.9% at 100 mL/hr",
  "NS 0.9% at 125 mL/hr",
  "NS 0.9% at 150 mL/hr",
  "NS 0.9% at 200 mL/hr",
  "NS 0.9% at 250 mL/hr",
  "NS 0.9% at 500 mL/hr",
  "NS 0.9% bolus",
  "KVO",
] as const;

export const IV_FLUID_LR_QUICK_PICKS = [
  "LR at 100 mL/hr",
  "LR at 125 mL/hr",
  "LR at 150 mL/hr",
  "LR at 250 mL/hr",
  "LR bolus",
  "KVO",
] as const;

export const IV_FLUID_D5W_QUICK_PICKS = [
  "D5W at 100 mL/hr",
  "D5W at 125 mL/hr",
  "D5W at 150 mL/hr",
  "KVO",
] as const;

export const IV_FLUID_GENERIC_QUICK_PICKS = [
  "100 mL/hr",
  "125 mL/hr",
  "150 mL/hr",
  "200 mL/hr",
  "250 mL/hr",
  "500 mL/hr",
  "bolus",
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
    return ["D10W as ordered", "100 mL/hr", "125 mL/hr", "KVO"];
  }
  if (/\bd50w\b/.test(text)) {
    return ["D50W as ordered", "bolus"];
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
