export type MarMedicationDoseDisplayInput = {
  doseValue?: string | null;
  doseUnit?: string | null;
  quantity?: string | number | null;
  quantityUnit?: string | null;
  route?: string | null;
  frequencyCode?: string | null;
  directionsSig?: string | null;
  /** Order-line strength / formulation when structured snapshot dose fields are incomplete. */
  fallbackDoseLabel?: string | null;
  /** Administered count — never used as clinical dose; may surface as quantityLabel. */
  administeredQuantity?: string | number | null;
};

export type MarMedicationDoseDisplayFields = {
  doseLabel: string | null;
  quantityLabel: string | null;
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

function formatClinicalDoseLabel(input: {
  doseValue: string | null;
  doseUnit: string | null;
  fallbackDoseLabel: string | null;
}): string | null {
  if (input.doseValue && input.doseUnit) {
    return `${input.doseValue} ${input.doseUnit}`;
  }
  if (input.doseValue) return input.doseValue;
  if (input.doseUnit) return input.doseUnit;
  return input.fallbackDoseLabel;
}

function formatQuantityLabel(input: {
  quantity: string | null;
  quantityUnit: string | null;
  administeredQuantity: string | null;
}): string | null {
  if (input.quantity) {
    return input.quantityUnit ? `${input.quantity} ${input.quantityUnit}` : input.quantity;
  }
  return input.administeredQuantity;
}

function normalizeComparableText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function shouldShowDirectionsLabel(directionsSig: string, doseLabel: string | null): boolean {
  if (!directionsSig.trim()) return false;
  if (!doseLabel) return true;
  return normalizeComparableText(directionsSig) !== normalizeComparableText(doseLabel);
}

function shouldShowQuantityLabel(input: {
  quantityLabel: string | null;
  quantity: string | null;
  quantityUnit: string | null;
  doseLabel: string | null;
  directionsLabel: string | null;
}): boolean {
  const { quantityLabel, quantity, quantityUnit, doseLabel, directionsLabel } = input;
  if (!quantityLabel) return false;
  if (doseLabel && normalizeComparableText(quantityLabel) === normalizeComparableText(doseLabel)) {
    return false;
  }
  if (
    directionsLabel &&
    normalizeComparableText(directionsLabel).includes(normalizeComparableText(quantityLabel))
  ) {
    return false;
  }
  if (doseLabel && quantity === "1" && !quantityUnit) {
    return false;
  }
  return true;
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

/** Builds MAR-safe clinical dose, quantity, route, frequency, and directions display fields. */
export function buildMarMedicationDoseDisplayFields(
  input: MarMedicationDoseDisplayInput
): MarMedicationDoseDisplayFields {
  const doseValue = normalizeTrimmed(input.doseValue);
  const doseUnit = normalizeTrimmed(input.doseUnit);
  const quantity = normalizeQuantity(input.quantity);
  const quantityUnit = normalizeTrimmed(input.quantityUnit);
  const administeredQuantity = normalizeQuantity(input.administeredQuantity);
  const routeLabel = normalizeTrimmed(input.route)?.toUpperCase() ?? null;
  const frequencyRaw = normalizeTrimmed(input.frequencyCode)?.toUpperCase() ?? null;
  const frequencyLabel =
    frequencyRaw && frequencyRaw !== "PRN" && frequencyRaw !== "STAT" ? frequencyRaw : null;
  const directionsSig = normalizeTrimmed(input.directionsSig);
  const fallbackDoseLabel = normalizeTrimmed(input.fallbackDoseLabel);

  const doseLabel = formatClinicalDoseLabel({
    doseValue,
    doseUnit,
    fallbackDoseLabel,
  });

  const rawQuantityLabel = formatQuantityLabel({
    quantity,
    quantityUnit,
    administeredQuantity,
  });
  const totalDoseLabel = formatTotalDoseLabel({ quantity, doseValue, doseUnit });
  const directionsLabel =
    directionsSig && shouldShowDirectionsLabel(directionsSig, doseLabel) ? directionsSig : null;
  const quantityLabel = shouldShowQuantityLabel({
    quantityLabel: rawQuantityLabel,
    quantity,
    quantityUnit,
    doseLabel,
    directionsLabel,
  })
    ? rawQuantityLabel
    : null;

  return {
    doseLabel,
    quantityLabel,
    totalDoseLabel,
    directionsLabel,
    routeLabel,
    frequencyLabel,
  };
}
