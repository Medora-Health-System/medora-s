/**
 * Phase 4.9.1 — Optional therapeutic/admin CPT on the same MAR line as an HCPCS drug code.
 * Route must be explicit in clinical data (MAR and/or catalog); never inferred from drug name alone.
 *
 * Primary: `administrationRoute` (MedicationAdministration.route).
 * Fallback: `catalogRoute` (CatalogMedication.route) for legacy rows.
 *
 * CPT selection (substring match on normalized route text):
 * - "push" or "bolus" → 96374 (IV push; not all IV — infusion / ambiguous IV omitted)
 * - "IM", "SQ", or "SC" → 96372
 * - else → null (e.g. IV alone, infusion)
 */

export type MedicationAdministrationCptResult = {
  cpt: string;
  description: string;
};

export type MedicationAdministrationCptInput = {
  /** Primary: route recorded on the MAR row. */
  administrationRoute?: string | null;
  /** Fallback: route from catalog when MAR route is unset. */
  catalogRoute?: string | null;
};

/**
 * Returns a CPT only when route text matches explicit push/bolus vs IM/SQ/SC rules.
 * IV without push/bolus is ambiguous (could be infusion) → null.
 */
export function inferMedicationAdministrationCpt(input: MedicationAdministrationCptInput): MedicationAdministrationCptResult | null {
  const raw = input.administrationRoute?.trim() || input.catalogRoute?.trim() || "";
  if (!raw) return null;

  const n = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/\u0300-\u036f/g, "")
    .replace(/œ/g, "oe");

  if (n.includes("push") || n.includes("bolus")) {
    return { cpt: "96374", description: "Therapeutic injection, IV push, single drug" };
  }

  if (n.includes("im") || n.includes("sq") || n.includes("sc")) {
    return { cpt: "96372", description: "Therapeutic injection, SC or IM" };
  }

  return null;
}
