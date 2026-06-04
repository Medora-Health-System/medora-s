import type { MarClinicalAction } from "./marClinicalAction.js";

export const MAR_ADMINISTERED_QUANTITY_REQUIRED_CODE = "ADMINISTERED_QUANTITY_REQUIRED";

export const MAR_ADMINISTERED_QUANTITY_REQUIRED_MESSAGE_FR =
  "La quantité administrée est requise pour enregistrer une administration.";

export const MAR_ADMINISTERED_QUANTITY_REQUIRED_MESSAGE_EN =
  "Administered quantity is required.";

function finiteNonNegative(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** Resolve clinical administered quantity for MAR create (explicit input wins, then ordered qty). */
export function resolveMarAdministeredQuantityForCreate(input: {
  marAction: MarClinicalAction;
  explicitQuantity?: number | null;
  orderedQuantity?: number | null;
}): number | null {
  if (input.marAction !== "administered") return finiteNonNegative(input.explicitQuantity);
  const explicit = finiteNonNegative(input.explicitQuantity);
  if (explicit != null) return explicit;
  return finiteNonNegative(input.orderedQuantity);
}

export function validateMarAdministeredQuantityRequired(input: {
  marAction: MarClinicalAction;
  administeredQuantity?: number | null;
}): { ok: true } | { ok: false; code: string; message: string } {
  if (input.marAction !== "administered") return { ok: true };
  const qty = finiteNonNegative(input.administeredQuantity);
  if (qty == null) {
    return {
      ok: false,
      code: MAR_ADMINISTERED_QUANTITY_REQUIRED_CODE,
      message: MAR_ADMINISTERED_QUANTITY_REQUIRED_MESSAGE_FR,
    };
  }
  return { ok: true };
}

/** Default string for MAR modal administered-quantity input from ordered line quantity. */
export function formatMarModalDefaultAdministeredQuantity(
  orderedQuantity: number | null | undefined
): string {
  const qty = finiteNonNegative(orderedQuantity);
  return qty != null ? String(qty) : "";
}
