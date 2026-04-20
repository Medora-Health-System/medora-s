/**
 * Phase 4.9.1 — Optional therapeutic/admin CPT on the same MAR line as an HCPCS drug code.
 * Only when route text is explicitly stored on CatalogMedication (never inferred from drug name).
 */

export type MedicationAdministrationCptResult = {
  cpt: string;
  description: string;
};

/**
 * Returns a single CPT only when `route` explicitly documents IM, SQ/SC, or IV push/bolus.
 * Returns null if route is absent or ambiguous (e.g. IV without push → could be infusion).
 */
export function inferMedicationAdministrationCpt(input: { route?: string | null }): MedicationAdministrationCptResult | null {
  const raw = input.route?.trim();
  if (!raw) return null;

  const n = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/\u0300-\u036f/g, "")
    .replace(/œ/g, "oe");

  const hasIv = /\b(iv|intravenous|intraveineuse|intraveineux)\b/i.test(n);
  const hasPush =
    /\b(push|bolus|poussee|poussée|injection\s+iv\s+directe)\b/i.test(n) ||
    (hasIv && /\b(direct|lente|slow)\b/i.test(n));

  if (hasIv && hasPush) {
    return { cpt: "96374", description: "Therapeutic injection, IV push, single drug" };
  }

  if (/\b(im|intramuscular|intramusculaire)\b/i.test(n)) {
    return { cpt: "96372", description: "Therapeutic injection, SC or IM" };
  }

  if (/\b(sq|sc|subcutaneous|subcutane|sous[-\s]?cutanee|sous[-\s]?cutanée)\b/i.test(n)) {
    return { cpt: "96372", description: "Therapeutic injection, SC or IM" };
  }

  return null;
}
