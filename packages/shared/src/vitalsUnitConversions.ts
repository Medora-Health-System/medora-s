/**
 * Vitals unit conversions — canonical EMR storage remains °C, kg, cm.
 * US entry (°F, lb, ft/in) converts at save time; display may show both.
 */

export function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9;
}

export function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

export function poundsToKg(lb: number): number {
  return lb * 0.45359237;
}

export function kgToPounds(kg: number): number {
  return kg / 0.45359237;
}

/** Total inches (ft * 12 + in) → centimeters. */
export function feetInchesToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * 2.54;
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  if (!Number.isFinite(cm) || cm <= 0) return { feet: 0, inches: 0 };
  const totalInches = cm / 2.54;
  let feet = Math.floor(totalInches / 12);
  let inches = Math.round(totalInches - feet * 12);
  if (inches === 12) {
    feet += 1;
    inches = 0;
  }
  if (inches < 0) inches = 0;
  return { feet, inches };
}

function roundTempC(c: number): number {
  return Math.round(c * 100) / 100;
}

function roundKg(kg: number): number {
  return Math.round(kg * 100) / 100;
}

function roundCm(cm: number): number {
  return Math.round(cm * 10) / 10;
}

/** Presentation-only BMI (kg/m²) from canonical height/weight. Not a stored authority. */
export function computeBmiFromHeightCmWeightKg(
  heightCm: number | null | undefined,
  weightKg: number | null | undefined
): number | null {
  if (heightCm == null || weightKg == null) return null;
  if (!Number.isFinite(heightCm) || !Number.isFinite(weightKg) || heightCm <= 0 || weightKg <= 0) {
    return null;
  }
  const meters = heightCm / 100;
  return Math.round((weightKg / (meters * meters)) * 10) / 10;
}

/** Parse user-entered temperature into canonical °C for storage. */
export function canonicalTemperatureCelsius(
  valueStr: string,
  inputUnit: "C" | "F" | undefined
): number | null {
  const s = valueStr.trim();
  if (!s) return null;
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  const u = inputUnit ?? "C";
  if (u === "F") return roundTempC(fahrenheitToCelsius(n));
  return roundTempC(n);
}

/** Parse user-entered weight into canonical kg. */
export function canonicalWeightKg(valueStr: string, inputUnit: "kg" | "lb" | undefined): number | null {
  const s = valueStr.trim();
  if (!s) return null;
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  const u = inputUnit ?? "kg";
  if (u === "lb") return roundKg(poundsToKg(n));
  return roundKg(n);
}

/** Parse height into canonical cm (either cm string or ft + in). */
export function canonicalHeightCm(args: {
  heightCmStr: string;
  heightInputMode: "cm" | "ftin" | undefined;
  heightFeetStr?: string;
  heightInchesStr?: string;
}): number | null {
  const mode = args.heightInputMode ?? "cm";
  if (mode === "ftin") {
    const ftRaw = (args.heightFeetStr ?? "").trim();
    const inRaw = (args.heightInchesStr ?? "").trim();
    if (!ftRaw && !inRaw) return null;
    const feet = ftRaw === "" ? 0 : Number(ftRaw);
    const inches = inRaw === "" ? 0 : Number(inRaw);
    if (!Number.isFinite(feet) || feet < 0) return null;
    if (!Number.isFinite(inches) || inches < 0 || inches >= 12) return null;
    return roundCm(feetInchesToCm(feet, inches));
  }
  const s = args.heightCmStr.trim();
  if (!s) return null;
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return roundCm(n);
}

/** Format stored °C for the active entry unit (one decimal). */
export function displayTemperatureFromStoredC(tempC: number, displayUnit: "C" | "F"): string {
  if (displayUnit === "F") {
    return (Math.round(celsiusToFahrenheit(tempC) * 10) / 10).toFixed(1);
  }
  return (Math.round(tempC * 10) / 10).toFixed(1);
}

/** Format stored kg for the active entry unit. */
export function displayWeightKgFromStored(kg: number, displayUnit: "kg" | "lb"): string {
  if (displayUnit === "lb") {
    return (Math.round(kgToPounds(kg) * 10) / 10).toFixed(1);
  }
  const v = Math.round(kg * 100) / 100;
  return String(v);
}

export function heightFeetInchStringsFromStoredCm(cm: number): { feet: string; inches: string } {
  const { feet, inches } = cmToFeetInches(cm);
  return { feet: String(feet), inches: String(inches) };
}

export function displayHeightCmStringFromStored(cm: number): string {
  return (Math.round(cm * 10) / 10).toFixed(1);
}

/**
 * Single canonical parse + derived °F for hint lines (avoid duplicating parse/round in UI).
 * Returns null if the entry string does not form a valid temperature.
 */
export function temperatureHintPairCelsiusFahrenheit(
  valueStr: string,
  inputUnit: "C" | "F" | undefined
): { celsius: number; fahrenheit: number } | null {
  const c = canonicalTemperatureCelsius(valueStr, inputUnit);
  if (c == null) return null;
  return { celsius: c, fahrenheit: celsiusToFahrenheit(c) };
}

/** Canonical kg + derived lb for hint lines. */
export function weightHintPairKgPounds(
  valueStr: string,
  inputUnit: "kg" | "lb" | undefined
): { kg: number; pounds: number } | null {
  const kg = canonicalWeightKg(valueStr, inputUnit);
  if (kg == null) return null;
  return { kg, pounds: kgToPounds(kg) };
}
