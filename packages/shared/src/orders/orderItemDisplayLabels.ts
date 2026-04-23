/**
 * Single source of truth for order-line display strings (FR vs EN catalog preference).
 * Used by API enrichment and chart; web mirrors logic in {@link orderItemDisplayFr.ts} for client-side rows.
 */

export type OrderItemLabelInput = {
  catalogItemType: string;
  manualLabel?: string | null;
  manualSecondaryText?: string | null;
  strength?: string | null;
};

export type CatalogLabLabel = { displayNameFr?: string | null; name?: string | null };

export type CatalogImagingLabel = {
  displayNameFr?: string | null;
  name?: string | null;
  modality?: string | null;
};

export type CatalogMedicationLabel = {
  displayNameFr?: string | null;
  name?: string | null;
  strength?: string | null;
};

const FALLBACK_FR: Record<string, string> = {
  LAB_TEST: "Analyse (libellé indisponible)",
  IMAGING_STUDY: "Imagerie (libellé indisponible)",
  MEDICATION: "Médicament (libellé indisponible)",
};

const FALLBACK_EN: Record<string, string> = {
  LAB_TEST: "Lab test (label unavailable)",
  IMAGING_STUDY: "Imaging (label unavailable)",
  MEDICATION: "Medication (label unavailable)",
};

function manualLine(it: OrderItemLabelInput): string {
  const manual = it.manualLabel?.trim();
  const manualSec = it.manualSecondaryText?.trim();
  return manual ? (manualSec ? `${manual} — ${manualSec}` : manual) : "";
}

function typeFallback(catalogItemType: string, lang: "fr" | "en"): string {
  const map = lang === "fr" ? FALLBACK_FR : FALLBACK_EN;
  return map[catalogItemType] ?? (lang === "fr" ? "Article prescrit" : "Prescribed item");
}

/**
 * French-first catalog label (legacy product default).
 */
export function buildOrderItemDisplayLabelFr(
  it: OrderItemLabelInput,
  catalogLab: CatalogLabLabel | null | undefined,
  catalogImg: CatalogImagingLabel | null | undefined,
  catalogMed: CatalogMedicationLabel | null | undefined
): string {
  const manualLineStr = manualLine(it);
  if (it.catalogItemType === "LAB_TEST") {
    const fr = catalogLab?.displayNameFr?.trim();
    const n = catalogLab?.name?.trim();
    if (fr) return fr;
    if (n) return n;
    if (manualLineStr) return manualLineStr;
    return typeFallback(it.catalogItemType, "fr");
  }
  if (it.catalogItemType === "IMAGING_STUDY") {
    const fr = catalogImg?.displayNameFr?.trim();
    const n = catalogImg?.name?.trim();
    const base = fr || n;
    if (base) {
      const mod = catalogImg?.modality?.trim();
      return mod ? `${base} (${mod})` : base;
    }
    if (manualLineStr) return manualLineStr;
    return typeFallback(it.catalogItemType, "fr");
  }
  if (it.catalogItemType === "MEDICATION") {
    const base = catalogMed?.displayNameFr?.trim() || catalogMed?.name?.trim() || null;
    if (base) {
      const str = (it.strength ?? catalogMed?.strength)?.trim();
      return str ? `${base} ${str}` : base;
    }
    if (manualLineStr) return manualLineStr;
    return typeFallback(it.catalogItemType, "fr");
  }
  if (manualLineStr) return manualLineStr;
  return typeFallback(it.catalogItemType, "fr");
}

/**
 * English-first catalog label (US / English UI); `name` before `displayNameFr`.
 */
export function buildOrderItemDisplayLabelEn(
  it: OrderItemLabelInput,
  catalogLab: CatalogLabLabel | null | undefined,
  catalogImg: CatalogImagingLabel | null | undefined,
  catalogMed: CatalogMedicationLabel | null | undefined
): string {
  const manualLineStr = manualLine(it);
  if (it.catalogItemType === "LAB_TEST") {
    const n = catalogLab?.name?.trim();
    const fr = catalogLab?.displayNameFr?.trim();
    if (n) return n;
    if (fr) return fr;
    if (manualLineStr) return manualLineStr;
    return typeFallback(it.catalogItemType, "en");
  }
  if (it.catalogItemType === "IMAGING_STUDY") {
    const n = catalogImg?.name?.trim();
    const fr = catalogImg?.displayNameFr?.trim();
    const base = n || fr;
    if (base) {
      const mod = catalogImg?.modality?.trim();
      return mod ? `${base} (${mod})` : base;
    }
    if (manualLineStr) return manualLineStr;
    return typeFallback(it.catalogItemType, "en");
  }
  if (it.catalogItemType === "MEDICATION") {
    const base = catalogMed?.name?.trim() || catalogMed?.displayNameFr?.trim() || null;
    if (base) {
      const str = (it.strength ?? catalogMed?.strength)?.trim();
      return str ? `${base} ${str}` : base;
    }
    if (manualLineStr) return manualLineStr;
    return typeFallback(it.catalogItemType, "en");
  }
  if (manualLineStr) return manualLineStr;
  return typeFallback(it.catalogItemType, "en");
}
