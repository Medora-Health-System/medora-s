export type MarMedicationDoseDisplayInput = {
  doseValue?: string | null;
  doseUnit?: string | null;
  quantity?: string | number | null;
  quantityUnit?: string | null;
  route?: string | null;
  frequencyCode?: string | null;
  directionsSig?: string | null;
  /** Preformatted dose when structured snapshot fields are incomplete. */
  fallbackDoseLabel?: string | null;
};

export type MarMedicationDoseDisplayFields = {
  doseLabel: string | null;
  totalDoseLabel: string | null;
  directionsLabel: string | null;
  routeLabel: string | null;
  frequencyLabel: string | null;
};

function normalizeTrimmed(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

function normalizeQuantity(value: string | number | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : null;
  }
  return normalizeTrimmed(value);
}

function parsePositiveIntegerQuantity(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
}

function parseNumericDoseValue(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function formatStructuredDoseLabel(input: {
  doseValue: string | null;
  doseUnit: string | null;
  quantity: string | null;
  quantityUnit: string | null;
}): string | null {
  if (input.doseValue && input.doseUnit) {
    return `${input.doseValue} ${input.doseUnit}`;
  }
  if (input.doseValue) return input.doseValue;
  if (input.doseUnit) return input.doseUnit;
  if (input.quantity && input.quantityUnit) {
    return `${input.quantity} ${input.quantityUnit}`;
  }
  if (input.quantity) return input.quantity;
  return null;
}

function normalizeComparableText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function shouldShowDirectionsLabel(directionsSig: string, doseLabel: string | null): boolean {
  if (!directionsSig.trim()) return false;
  if (!doseLabel) return true;
  return normalizeComparableText(directionsSig) !== normalizeComparableText(doseLabel);
}

function formatTotalDoseLabel(input: {
  quantity: string | null;
  doseValue: string | null;
  doseUnit: string | null;
}): string | null {
  const quantity = parsePositiveIntegerQuantity(input.quantity);
  const doseValue = parseNumericDoseValue(input.doseValue);
  const doseUnit = input.doseUnit;
  if (quantity == null || quantity <= 1 || doseValue == null || !doseUnit) {
    return null;
  }
  const total = quantity * doseValue;
  const totalValue = Number.isInteger(total) ? String(total) : String(total);
  return `${totalValue} ${doseUnit}`;
}

/** Builds MAR-safe dose, route, frequency, and directions display fields from structured order data. */
export function buildMarMedicationDoseDisplayFields(
  input: MarMedicationDoseDisplayInput
): MarMedicationDoseDisplayFields {
  const doseValue = normalizeTrimmed(input.doseValue);
  const doseUnit = normalizeTrimmed(input.doseUnit);
  const quantity = normalizeQuantity(input.quantity);
  const quantityUnit = normalizeTrimmed(input.quantityUnit);
  const routeLabel = normalizeTrimmed(input.route)?.toUpperCase() ?? null;
  const frequencyRaw = normalizeTrimmed(input.frequencyCode)?.toUpperCase() ?? null;
  const frequencyLabel =
    frequencyRaw && frequencyRaw !== "PRN" && frequencyRaw !== "STAT" ? frequencyRaw : null;
  const directionsSig = normalizeTrimmed(input.directionsSig);

  const structuredDoseLabel = formatStructuredDoseLabel({
    doseValue,
    doseUnit,
    quantity,
    quantityUnit,
  });
  const doseLabel = structuredDoseLabel ?? normalizeTrimmed(input.fallbackDoseLabel);

  const totalDoseLabel = formatTotalDoseLabel({ quantity, doseValue, doseUnit });
  const directionsLabel =
    directionsSig && shouldShowDirectionsLabel(directionsSig, doseLabel) ? directionsSig : null;

  return {
    doseLabel,
    totalDoseLabel,
    directionsLabel,
    routeLabel,
    frequencyLabel,
  };
}
