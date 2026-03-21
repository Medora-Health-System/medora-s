/**
 * Libellé affichable pour une ligne d’ordre (priorité alignée sur l’API enrichOrderItemsForDisplay).
 * Ne jamais exposer catalogItemId dans l’UI.
 */
export function getOrderItemDisplayLabelFr(item: {
  displayLabelFr?: string | null;
  manualLabel?: string | null;
  manualSecondaryText?: string | null;
  catalogItemType?: string | null;
  catalogLabTest?: { displayNameFr?: string | null; name?: string | null } | null;
  catalogImagingStudy?: { displayNameFr?: string | null; name?: string | null; modality?: string | null } | null;
  catalogMedication?: {
    displayNameFr?: string | null;
    name?: string | null;
    strength?: string | null;
    dosageForm?: string | null;
    route?: string | null;
  } | null;
  strength?: string | null;
  notes?: string | null;
}): string {
  if (item.displayLabelFr?.trim()) return item.displayLabelFr.trim();
  const man = item.manualLabel?.trim();
  if (man) {
    const sec = item.manualSecondaryText?.trim();
    return sec ? `${man} — ${sec}` : man;
  }
  const t = item.catalogItemType;
  if (t === "LAB_TEST") {
    const c = item.catalogLabTest;
    /** Libellé catalogue FR en priorité (évite un displayLabelFr dérivé du nom anglais). */
    if (c?.displayNameFr?.trim()) return c.displayNameFr.trim();
    if (c?.name?.trim()) return c.name.trim();
    return "Analyse (libellé indisponible)";
  }
  if (t === "IMAGING_STUDY") {
    const c = item.catalogImagingStudy;
    const base = c?.displayNameFr?.trim() || c?.name?.trim();
    if (base) {
      const mod = c?.modality ? ` (${c.modality})` : "";
      return `${base}${mod}`;
    }
    return "Imagerie (libellé indisponible)";
  }
  if (t === "MEDICATION") {
    const c = item.catalogMedication;
    const n = c?.displayNameFr?.trim() || c?.name?.trim();
    const parts = [
      n,
      item.strength?.trim() || c?.strength?.trim(),
      c?.dosageForm,
      c?.route,
    ].filter(Boolean);
    if (parts.length) return parts.join(" · ");
    return "Médicament (libellé indisponible)";
  }
  return "—";
}
