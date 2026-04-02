/**
 * Libellé affichable pour une ligne d’ordre (priorité alignée sur l’API enrichOrderItemsForDisplay).
 * Ne jamais exposer catalogItemId dans l’UI.
 *
 * Priorité : displayLabelFr → catalogue (displayNameFr / name selon le type) → manualLabel (+ secondaire) → repli FR.
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

  const resolvedType = resolveCatalogItemType(item);
  const fromCatalog = catalogDisplayLabelFr(item, resolvedType);
  if (fromCatalog) return fromCatalog;

  const man = item.manualLabel?.trim();
  if (man) {
    const sec = item.manualSecondaryText?.trim();
    return sec ? `${man} — ${sec}` : man;
  }

  return typeFallbackFr(resolvedType);
}

function resolveCatalogItemType(item: {
  catalogItemType?: string | null;
  catalogLabTest?: unknown;
  catalogImagingStudy?: unknown;
  catalogMedication?: unknown;
}): string | null {
  const t = item.catalogItemType?.trim();
  if (t) return t;
  if (item.catalogLabTest) return "LAB_TEST";
  if (item.catalogImagingStudy) return "IMAGING_STUDY";
  if (item.catalogMedication) return "MEDICATION";
  return null;
}

function catalogDisplayLabelFr(
  item: {
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
  },
  t: string | null
): string | null {
  if (t === "LAB_TEST") {
    const c = item.catalogLabTest;
    if (c?.displayNameFr?.trim()) return c.displayNameFr.trim();
    if (c?.name?.trim()) return c.name.trim();
    return null;
  }
  if (t === "IMAGING_STUDY") {
    const c = item.catalogImagingStudy;
    const base = c?.displayNameFr?.trim() || c?.name?.trim();
    if (base) {
      const mod = c?.modality ? ` (${c.modality})` : "";
      return `${base}${mod}`;
    }
    return null;
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
    return null;
  }
  return null;
}

function typeFallbackFr(t: string | null): string {
  if (t === "LAB_TEST") return "Analyse (libellé indisponible)";
  if (t === "IMAGING_STUDY") return "Imagerie (libellé indisponible)";
  if (t === "MEDICATION") return "Médicament (libellé indisponible)";
  if (t === "CARE") return "Soin (libellé indisponible)";
  return "—";
}
