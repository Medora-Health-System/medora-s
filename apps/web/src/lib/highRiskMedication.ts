const HIGH_RISK_MEDICATION_TERMS = [
  "insulin",
  "heparin",
  "warfarin",
  "enoxaparin",
  "epinephrine",
  "adrenaline",
  "potassium",
  "kcl",
  "morphine",
  "fentanyl",
  "hydromorphone",
  "midazolam",
  "lorazepam",
  "propofol",
  "ketamine",
  "paralytic",
  "rocuronium",
  "succinylcholine",
] as const;

function normalizeMedicationText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function collectTextParts(input: unknown, parts: string[] = [], depth = 0): string[] {
  if (input == null || depth > 3) return parts;
  if (typeof input === "string" || typeof input === "number") {
    const value = String(input).trim();
    if (value) parts.push(value);
    return parts;
  }
  if (Array.isArray(input)) {
    for (const item of input) collectTextParts(item, parts, depth + 1);
    return parts;
  }
  if (typeof input === "object") {
    for (const value of Object.values(input as Record<string, unknown>)) {
      collectTextParts(value, parts, depth + 1);
    }
  }
  return parts;
}

export function isHighRiskMedication(input: unknown): boolean {
  const haystack = ` ${normalizeMedicationText(collectTextParts(input).join(" "))} `;
  if (!haystack.trim()) return false;
  return HIGH_RISK_MEDICATION_TERMS.some((term) => haystack.includes(` ${normalizeMedicationText(term)} `));
}

export function highRiskMedicationWarning(
  input: unknown,
  t: (key: string) => string
): string | null {
  return isHighRiskMedication(input) ? t("medicationSafety.highRiskWarning") : null;
}
