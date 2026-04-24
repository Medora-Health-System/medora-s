/**
 * Single source of truth for order-line display strings (FR vs EN catalog preference).
 * Used by API enrichment and chart; web mirrors logic in {@link orderItemDisplayFr.ts} for client-side rows.
 *
 * Phase C EN: for lab / imaging / medication catalog lines, never `displayNameFr` and never legacy `name`
 * (may be French data). Order: `displayNameEn` → acceptable manual → `code` → typed EN fallback.
 *
 * Phase E legacy fields: catalog `name` is internal/compat; `displayNameEn` is English display; `displayNameFr`
 * is French display. English UI must not treat `name` as the English label.
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
  CARE: "Soin (libellé indisponible)",
  SUPPLY: "Article / fourniture (libellé indisponible)",
};

const FALLBACK_EN: Record<string, string> = {
  LAB_TEST: "Lab test (label unavailable)",
  IMAGING_STUDY: "Imaging study",
  MEDICATION: "Medication (label unavailable)",
  CARE: "Care (label unavailable)",
  SUPPLY: "Supply (label unavailable)",
};

/** Tokens that must never be shown as a human order line title in EN (or as FR primary). */
const TECHNICAL_DISPLAY_TOKENS = new Set([
  "LAB_TEST",
  "IMAGING_STUDY",
  "MEDICATION",
  "CARE",
  "SUPPLY",
  "IVP",
  "PROCEDURE",
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

/** User-entered manual line only when it is not a type token or other technical placeholder. */
export function acceptableManualOrderLine(it: OrderItemLabelInput): string {
  const manual = it.manualLabel?.trim();
  if (!manual) return "";
  const cat = String(it.catalogItemType ?? "");
  if (manual === cat.trim()) return "";
  if (isInvalidTechnicalOrderDisplayLabel(manual, cat)) return "";
  const manualSec = it.manualSecondaryText?.trim();
  const line = manualSec ? `${manual} — ${manualSec}` : manual;
  if (isInvalidTechnicalOrderDisplayLabel(line, cat)) return "";
  return line;
}

/**
 * Phase C strict EN primary for catalog-backed rows: `displayNameEn`, then `code` — never `name` / `displayNameFr`.
 */
export function pickStrictEnCatalogPrimaryLabel(
  catalogItemType: string,
  displayNameEn?: string | null,
  code?: string | null
): string | null {
  return firstAcceptableLineLabel(catalogItemType, displayNameEn, code);
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
  const manualLineStr = acceptableManualOrderLine(it);
  if (it.catalogItemType === "LAB_TEST") {
    const fr = catalogLab?.displayNameFr?.trim();
    const enOpt = catalogLab?.displayNameEn?.trim();
    const n = catalogLab?.name?.trim();
    const line = firstAcceptableLineLabel(it.catalogItemType, fr, enOpt, n, manualLineStr, catalogLab?.code);
    if (line) return line;
    return typeFallback(it.catalogItemType, "fr");
  }
  if (it.catalogItemType === "IMAGING_STUDY") {
    const fr = catalogImg?.displayNameFr?.trim();
    const enOpt = catalogImg?.displayNameEn?.trim();
    const n = catalogImg?.name?.trim();
    const base = firstAcceptableLineLabel(it.catalogItemType, fr, enOpt, n, manualLineStr, catalogImg?.code);
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
      catalogMed?.displayNameEn,
      catalogMed?.name,
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
 * English UI (Phase C strict): for lab / imaging / medication — `displayNameEn` → acceptable manual → `code`
 * → typed EN fallback. Never `displayNameFr` or catalog `name` for those types.
 */
export function buildOrderItemDisplayLabelEn(
  it: OrderItemLabelInput,
  catalogLab: CatalogLabLabel | null | undefined,
  catalogImg: CatalogImagingLabel | null | undefined,
  catalogMed: CatalogMedicationLabel | null | undefined
): string {
  const manualLineStr = acceptableManualOrderLine(it);
  if (it.catalogItemType === "LAB_TEST") {
    const line = firstAcceptableLineLabel(
      it.catalogItemType,
      catalogLab?.displayNameEn,
      manualLineStr,
      catalogLab?.code
    );
    if (line) return line;
    return typeFallback(it.catalogItemType, "en");
  }
  if (it.catalogItemType === "IMAGING_STUDY") {
    if (catalogImg) {
      return (
        pickStrictEnCatalogPrimaryLabel(
          it.catalogItemType,
          catalogImg.displayNameEn,
          catalogImg.code
        ) || "Imaging study"
      );
    }
    const base = firstAcceptableLineLabel(it.catalogItemType, manualLineStr);
    if (base) return base;
    return typeFallback(it.catalogItemType, "en");
  }
  if (it.catalogItemType === "MEDICATION") {
    const base = firstAcceptableLineLabel(
      it.catalogItemType,
      catalogMed?.displayNameEn,
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
