/**
 * M1.7B.7 — Resolve MAR billing fields invisibly from order/catalog metadata (UI stays clean).
 */

import { normalizeNdc } from "../ndcNormalize.js";

export type MarOrderBillingSource = {
  catalogMedication?: {
    ndc11?: string | null;
    ndcDisplay?: string | null;
    billingUnitType?: string | null;
    strength?: string | null;
  } | null;
  medicationPackage?: {
    ndc11?: string | null;
    ndcDisplay?: string | null;
  } | null;
  strength?: string | number | null;
  quantity?: number | null;
};

export type MarHiddenBillingPayload = {
  ndc: string | null;
  doseValue: number | null;
  billingQuantity: number | null;
  doseUnit: string | null;
};

function validHiddenNdcString(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const normalized = normalizeNdc(trimmed);
  return normalized.ok ? normalized.ndcDisplay : null;
}

function pickNdc(source: MarOrderBillingSource): string | null {
  const cm = source.catalogMedication;
  const fromCatalog =
    validHiddenNdcString(cm?.ndcDisplay) ?? validHiddenNdcString(cm?.ndc11);
  if (fromCatalog) return fromCatalog;
  const pkg = source.medicationPackage;
  return validHiddenNdcString(pkg?.ndcDisplay) ?? validHiddenNdcString(pkg?.ndc11);
}

function resolveMergedNdc(explicit?: string | null, hidden?: string | null): string | undefined {
  const explicitTrimmed = explicit?.trim();
  if (explicitTrimmed) {
    const normalized = normalizeNdc(explicitTrimmed);
    if (normalized.ok) return normalized.ndcDisplay;
  }
  const hiddenTrimmed = hidden?.trim();
  if (hiddenTrimmed) {
    const normalized = normalizeNdc(hiddenTrimmed);
    if (normalized.ok) return normalized.ndcDisplay;
  }
  return undefined;
}

/** Parse a leading numeric dose from strength text (e.g. "4 mg/2 mL" → 4). */
export function parseMarDoseValueFromStrength(strength: string | null | undefined): number | null {
  const raw = strength?.trim();
  if (!raw) return null;
  const match = raw.match(/^(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function resolveMarHiddenBillingPayload(source: MarOrderBillingSource): MarHiddenBillingPayload {
  const strengthRaw =
    typeof source.strength === "string"
      ? source.strength
      : source.strength != null
        ? String(source.strength)
        : source.catalogMedication?.strength ?? null;

  const doseValue = parseMarDoseValueFromStrength(strengthRaw);
  const orderedQty =
    typeof source.quantity === "number" && Number.isFinite(source.quantity) && source.quantity >= 0
      ? source.quantity
      : null;

  return {
    ndc: pickNdc(source),
    doseValue,
    billingQuantity: orderedQty,
    doseUnit: source.catalogMedication?.billingUnitType?.trim() || null,
  };
}

export function mergeMarCreateBillingFields(input: {
  hidden: MarHiddenBillingPayload;
  ndc?: string | null;
  doseValue?: number | null;
  billingQuantity?: number | null;
  doseUnit?: string | null;
  administeredQuantity?: number | null;
}): {
  ndc?: string;
  doseValue?: number;
  billingQuantity?: number;
  doseUnit?: string;
} {
  const out: {
    ndc?: string;
    doseValue?: number;
    billingQuantity?: number;
    doseUnit?: string;
  } = {};

  const ndc = resolveMergedNdc(input.ndc, input.hidden.ndc);
  if (ndc) out.ndc = ndc;

  const doseValue =
    input.doseValue != null && Number.isFinite(input.doseValue)
      ? input.doseValue
      : input.hidden.doseValue;
  if (doseValue != null && Number.isFinite(doseValue)) out.doseValue = doseValue;

  const billingQuantity =
    input.billingQuantity != null && Number.isFinite(input.billingQuantity)
      ? input.billingQuantity
      : input.administeredQuantity != null && Number.isFinite(input.administeredQuantity)
        ? input.administeredQuantity
        : input.hidden.billingQuantity;
  if (billingQuantity != null && Number.isFinite(billingQuantity)) {
    out.billingQuantity = billingQuantity;
  }

  const doseUnit = input.doseUnit?.trim() || input.hidden.doseUnit?.trim();
  if (doseUnit) out.doseUnit = doseUnit;

  return out;
}
