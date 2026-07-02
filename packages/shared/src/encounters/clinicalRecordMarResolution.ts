/**
 * MAR display resolution for EncounterClinicalRecord — pure, no API coupling.
 */

function asTrimmed(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

const PLACEHOLDER_NAMES = new Set(["—", "-", "n/a", "na"]);

export function isClinicalRecordMedicationNameMissing(name: string | null | undefined): boolean {
  if (!name) return true;
  const normalized = name.trim().toLowerCase();
  return PLACEHOLDER_NAMES.has(normalized);
}

export function resolveClinicalRecordMedicationName(input: {
  medicationName?: string | null;
  medicationLabelSnapshot?: string | null;
  medicationDisplayName?: string | null;
  displayLabel?: string | null;
  manualLabel?: string | null;
  orderItemLabel?: string | null;
}): string | null {
  for (const candidate of [
    input.medicationLabelSnapshot,
    input.medicationName,
    input.medicationDisplayName,
    input.displayLabel,
    input.manualLabel,
    input.orderItemLabel,
  ]) {
    const trimmed = asTrimmed(candidate);
    if (trimmed && !isClinicalRecordMedicationNameMissing(trimmed)) {
      return trimmed;
    }
  }
  return null;
}

export function resolveClinicalRecordMarDose(input: {
  dose?: string | null;
  doseValue?: string | null;
  doseUnit?: string | null;
  administeredQuantity?: string | null;
}): string | null {
  const explicit = asTrimmed(input.dose);
  if (explicit && !isClinicalRecordMedicationNameMissing(explicit)) return explicit;
  const parts = [asTrimmed(input.doseValue), asTrimmed(input.doseUnit)].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return asTrimmed(input.administeredQuantity);
}

export function formatClinicalRecordMarDisplayLine(input: {
  medicationName: string | null;
  dose: string | null;
  route: string | null;
}): string {
  const parts: string[] = [];
  if (input.medicationName) parts.push(input.medicationName);
  if (input.dose) parts.push(input.dose);
  const base = parts.join(" ").trim();
  if (input.route) {
    return base ? `${base} ${input.route}` : input.route;
  }
  return base;
}
