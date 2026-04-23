/**
 * Single source of truth for order-line display strings (FR vs EN catalog preference).
 * Used by API enrichment and chart; web mirrors logic in {@link orderItemDisplayFr.ts} for client-side rows.
 *
 * EN resolution: never uses `displayNameFr` or `displayLabelFr`; optional `displayNameEn` when present on catalog rows.
 */

export type OrderItemLabelInput = {
  catalogItemType: string;
  manualLabel?: string | null;
  manualSecondaryText?: string | null;
  strength?: string | null;
};

export type CatalogLabLabel = {
  code?: string | null;
  name?: string | null;
  displayNameEn?: string | null;
  displayNameFr?: string | null;
};

export type CatalogImagingLabel = {
  code?: string | null;
  name?: string | null;
  displayNameEn?: string | null;
  displayNameFr?: string | null;
  modality?: string | null;
};

export type CatalogMedicationLabel = {
  code?: string | null;
  name?: string | null;
  displayNameEn?: string | null;
  displayNameFr?: string | null;
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

/** Tokens that must never be shown as a human order line title in EN (or as FR primary). */
const TECHNICAL_DISPLAY_TOKENS = new Set([
  "LAB_TEST",
  "IMAGING_STUDY",
  "MEDICATION",
  "CARE",
  "SUPPLY",
  "IVP",
]);

/**
 * True when `raw` is empty, a known internal type token, matches `catalogItemType`, or looks like an ALL_CAPS_SNAKE enum (no digits).
 */
export function isInvalidTechnicalOrderDisplayLabel(raw: string, catalogItemType: string): boolean {
  const s = raw.trim();
  if (!s) return true;
  if (TECHNICAL_DISPLAY_TOKENS.has(s)) return true;
  if (s === String(catalogItemType ?? "").trim()) return true;
  if (/^[A-Z]+(_[A-Z]+)+$/.test(s)) return true;
  return false;
}

function manualLine(it: OrderItemLabelInput): string {
  const manual = it.manualLabel?.trim();
  if (manual && manual === String(it.catalogItemType ?? "").trim()) {
    return "";
  }
  const manualSec = it.manualSecondaryText?.trim();
  return manual ? (manualSec ? `${manual} — ${manualSec}` : manual) : "";
}

function typeFallback(catalogItemType: string, lang: "fr" | "en"): string {
  const map = lang === "fr" ? FALLBACK_FR : FALLBACK_EN;
  return map[catalogItemType] ?? (lang === "fr" ? "Article prescrit" : "Prescribed item");
}

function firstAcceptableLineLabel(
  catalogItemType: string,
  ...candidates: (string | null | undefined)[]
): string | null {
  for (const c of candidates) {
    const t = (c ?? "").trim();
    if (t && !isInvalidTechnicalOrderDisplayLabel(t, catalogItemType)) return t;
  }
  return null;
}

/**
 * French-first catalog label (legacy product default).
 * Order: displayNameFr → name → displayNameEn → manual → type fallback.
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
    const enOpt = catalogLab?.displayNameEn?.trim();
    const line = firstAcceptableLineLabel(it.catalogItemType, fr, n, enOpt, manualLineStr, catalogLab?.code);
    if (line) return line;
    return typeFallback(it.catalogItemType, "fr");
  }
  if (it.catalogItemType === "IMAGING_STUDY") {
    const fr = catalogImg?.displayNameFr?.trim();
    const n = catalogImg?.name?.trim();
    const enOpt = catalogImg?.displayNameEn?.trim();
    const base = firstAcceptableLineLabel(it.catalogItemType, fr, n, enOpt, manualLineStr, catalogImg?.code);
    if (base) {
      const mod = catalogImg?.modality?.trim();
      return mod ? `${base} (${mod})` : base;
    }
    return typeFallback(it.catalogItemType, "fr");
  }
  if (it.catalogItemType === "MEDICATION") {
    const base = firstAcceptableLineLabel(
      it.catalogItemType,
      catalogMed?.displayNameFr,
      catalogMed?.name,
      catalogMed?.displayNameEn,
      manualLineStr,
      catalogMed?.code
    );
    if (base) {
      const str = (it.strength ?? catalogMed?.strength)?.trim();
      return str ? `${base} ${str}` : base;
    }
    return typeFallback(it.catalogItemType, "fr");
  }
  const man = firstAcceptableLineLabel(it.catalogItemType, manualLineStr);
  if (man) return man;
  return typeFallback(it.catalogItemType, "fr");
}

/**
 * English UI: displayNameEn → name → manual → catalog code → typed EN fallback.
 * Never reads displayNameFr.
 */
export function buildOrderItemDisplayLabelEn(
  it: OrderItemLabelInput,
  catalogLab: CatalogLabLabel | null | undefined,
  catalogImg: CatalogImagingLabel | null | undefined,
  catalogMed: CatalogMedicationLabel | null | undefined
): string {
  const manualLineStr = manualLine(it);
  if (it.catalogItemType === "LAB_TEST") {
    const line = firstAcceptableLineLabel(
      it.catalogItemType,
      catalogLab?.displayNameEn,
      catalogLab?.name,
      manualLineStr,
      catalogLab?.code
    );
    if (line) return line;
    return typeFallback(it.catalogItemType, "en");
  }
  if (it.catalogItemType === "IMAGING_STUDY") {
    const base = firstAcceptableLineLabel(
      it.catalogItemType,
      catalogImg?.displayNameEn,
      catalogImg?.name,
      manualLineStr,
      catalogImg?.code
    );
    if (base) {
      const mod = catalogImg?.modality?.trim();
      return mod ? `${base} (${mod})` : base;
    }
    return typeFallback(it.catalogItemType, "en");
  }
  if (it.catalogItemType === "MEDICATION") {
    const base = firstAcceptableLineLabel(
      it.catalogItemType,
      catalogMed?.displayNameEn,
      catalogMed?.name,
      manualLineStr,
      catalogMed?.code
    );
    if (base) {
      const str = (it.strength ?? catalogMed?.strength)?.trim();
      return str ? `${base} ${str}` : base;
    }
    return typeFallback(it.catalogItemType, "en");
  }
  const man = firstAcceptableLineLabel(it.catalogItemType, manualLineStr);
  if (man) return man;
  return typeFallback(it.catalogItemType, "en");
}
