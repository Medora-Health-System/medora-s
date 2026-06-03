/**
 * Single source of truth for order-line display strings (FR vs EN catalog preference).
 * Used by API enrichment and chart; web mirrors logic in {@link orderItemDisplayFr.ts} for client-side rows.
 *
 * Phase C EN: for lab / imaging / medication catalog lines, never `displayNameFr` and never legacy `name`
 * (may be French data). Order: `displayNameEn` → acceptable manual → `code` → typed EN fallback.
 *
 * Phase E legacy fields: catalog `name` is internal/compat; `displayNameEn` is English display; `displayNameFr`
 * is French display. English UI must not treat `name` as the English label.
 *
 * MEDPROC.2: CARE lines with enterpriseProcedureId resolve display from shared enterprise catalog;
 * manualLabel is fallback for legacy/custom tasks.
 */

import {
  enterpriseProcedureById,
  resolveEnterpriseProcedureDisplayName,
} from "../procedures/enterpriseProcedureCatalog.js";

export type OrderItemLabelInput = {
  catalogItemType: string;
  manualLabel?: string | null;
  manualSecondaryText?: string | null;
  strength?: string | null;
  /** MEDPROC.2: canonical enterprise procedure id for CARE lines (display resolved from shared catalog). */
  enterpriseProcedureId?: string | null;
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
  genericName?: string | null;
  strength?: string | null;
};

/**
 * Derive INN-style primary name from catalog code prefix (e.g. HYDROMORPHONE_2MG_ML_INJECTABLE → Hydromorphone).
 * Full ALL_CAPS_SNAKE codes are not shown in UI — only the first segment when no display/generic name exists.
 */
export function medicationInnFromCatalogCode(code: string | null | undefined): string | null {
  const trimmed = (code ?? "").trim();
  if (!trimmed) return null;
  const segment = trimmed.split("_")[0]?.trim() ?? "";
  if (segment.length < 3 || !/^[A-Za-z][A-Za-z0-9]*$/.test(segment)) return null;
  if (isInvalidTechnicalOrderDisplayLabel(segment, "MEDICATION")) return null;
  return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
}

/**
 * Medication primary title (no strength suffix) for order/MAR display.
 */
export function resolveMedicationCatalogPrimaryLabel(
  lang: "fr" | "en",
  catalogMed: CatalogMedicationLabel | null | undefined,
  manualLineStr?: string | null
): string | null {
  const manual = (manualLineStr ?? "").trim();
  if (lang === "fr") {
    return firstAcceptableLineLabel(
      "MEDICATION",
      catalogMed?.displayNameFr,
      catalogMed?.displayNameEn,
      catalogMed?.genericName,
      catalogMed?.name,
      manual || null,
      catalogMed?.code
    );
  }
  return firstAcceptableLineLabel(
    "MEDICATION",
    catalogMed?.displayNameEn,
    catalogMed?.genericName,
    manual || null,
    medicationInnFromCatalogCode(catalogMed?.code)
  );
}

/**
 * MAR / audit medication label snapshot (English-neutral clinical display).
 */
export function buildMedicationOrderLabelSnapshot(
  it: OrderItemLabelInput & { notes?: string | null },
  catalogMed: CatalogMedicationLabel | null | undefined
): string {
  const manualLine = acceptableManualOrderLine(it);
  const primary = resolveMedicationCatalogPrimaryLabel("en", catalogMed, manualLine);
  if (primary) {
    const str = (it.strength ?? catalogMed?.strength)?.trim();
    return str ? `${primary} ${str}` : primary;
  }
  const fromRow = [it.strength, it.notes]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .find((s) => s.length > 0);
  if (fromRow) return fromRow;
  return FALLBACK_EN.MEDICATION;
}

const FALLBACK_FR: Record<string, string> = {
  LAB_TEST: "Analyse (libellé indisponible)",
  IMAGING_STUDY: "Imagerie (libellé indisponible)",
  MEDICATION: "Médicament (libellé indisponible)",
  CARE: "Soin (libellé indisponible)",
  SUPPLY: "Article / fourniture (libellé indisponible)",
};

const FALLBACK_EN: Record<string, string> = {
  LAB_TEST: "Lab test",
  IMAGING_STUDY: "Imaging study",
  MEDICATION: "Medication (label unavailable)",
  CARE: "Care (label unavailable)",
  SUPPLY: "Supply (label unavailable)",
};

/** EN/FR typed fallbacks from {@link buildOrderItemDisplayLabelEn} / `Fr` — not valid cached display labels. */
const UNAVAILABLE_ORDER_DISPLAY_LABELS = new Set([
  FALLBACK_EN.MEDICATION,
  FALLBACK_FR.MEDICATION,
  FALLBACK_EN.CARE,
  FALLBACK_FR.CARE,
  FALLBACK_EN.SUPPLY,
  FALLBACK_FR.SUPPLY,
  FALLBACK_EN.LAB_TEST,
  FALLBACK_FR.LAB_TEST,
  FALLBACK_EN.IMAGING_STUDY,
  FALLBACK_FR.IMAGING_STUDY,
]);

/**
 * True when a label is the shared "label unavailable" sentinel (M1.7A.5).
 * UI and chart code must ignore these and re-resolve from catalog / product linkage.
 */
export function isOrderDisplayLabelUnavailable(label: string | null | undefined): boolean {
  const t = (label ?? "").trim();
  if (!t) return false;
  if (UNAVAILABLE_ORDER_DISPLAY_LABELS.has(t)) return true;
  const lower = t.toLowerCase();
  return (
    lower.includes("label unavailable") ||
    lower.includes("libellé indisponible") ||
    lower.includes("label not available")
  );
}

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

function enterpriseProcedureOrderDisplayLabel(
  enterpriseProcedureId: string | null | undefined,
  lang: "fr" | "en"
): string | null {
  const id = enterpriseProcedureId?.trim();
  if (!id) return null;
  const definition = enterpriseProcedureById(id);
  if (!definition) return null;
  return resolveEnterpriseProcedureDisplayName(definition, lang);
}

function careOrderDisplayLabel(it: OrderItemLabelInput, lang: "fr" | "en"): string {
  const fromEnterprise = enterpriseProcedureOrderDisplayLabel(it.enterpriseProcedureId, lang);
  if (fromEnterprise) return fromEnterprise;
  const man = firstAcceptableLineLabel(it.catalogItemType, acceptableManualOrderLine(it));
  if (man) return man;
  return typeFallback(it.catalogItemType, lang);
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
    const base = resolveMedicationCatalogPrimaryLabel("fr", catalogMed, manualLineStr);
    if (base) {
      const str = (it.strength ?? catalogMed?.strength)?.trim();
      return str ? `${base} ${str}` : base;
    }
    return typeFallback(it.catalogItemType, "fr");
  }
  if (it.catalogItemType === "CARE") {
    return careOrderDisplayLabel(it, "fr");
  }
  const man = firstAcceptableLineLabel(it.catalogItemType, manualLineStr);
  if (man) return man;
  return typeFallback(it.catalogItemType, "fr");
}

/**
 * English UI (Phase C strict): for lab / imaging / medication — `displayNameEn` → acceptable manual → `code`
 * → typed EN fallback. Never `displayNameFr` or catalog `name` for those types.
 * Lab / imaging: catalog `code` may be ALL_CAPS_SNAKE; `firstAcceptableLineLabel` rejects that pattern, so those
 * types use raw `code` after EN + manual when a catalog row is present.
 */
export function buildOrderItemDisplayLabelEn(
  it: OrderItemLabelInput,
  catalogLab: CatalogLabLabel | null | undefined,
  catalogImg: CatalogImagingLabel | null | undefined,
  catalogMed: CatalogMedicationLabel | null | undefined
): string {
  const manualLineStr = acceptableManualOrderLine(it);
  if (it.catalogItemType === "LAB_TEST") {
    if (catalogLab) {
      const fromEnOrManual = firstAcceptableLineLabel(
        it.catalogItemType,
        catalogLab.displayNameEn,
        manualLineStr
      );
      if (fromEnOrManual) return fromEnOrManual;
      const codeRaw = (catalogLab.code ?? "").trim();
      if (codeRaw) return codeRaw;
      return "Lab test";
    }
    const base = firstAcceptableLineLabel(it.catalogItemType, manualLineStr);
    if (base) return base;
    return "Lab test";
  }
  if (it.catalogItemType === "IMAGING_STUDY") {
    if (catalogImg) {
      // Catalog imaging `code` is often ALL_CAPS_SNAKE; `firstAcceptableLineLabel` rejects that pattern
      // so EN would wrongly fall through to "Imaging study". Prefer EN + manual via guards, then raw code.
      const fromEnOrManual = firstAcceptableLineLabel(
        it.catalogItemType,
        catalogImg.displayNameEn,
        manualLineStr
      );
      if (fromEnOrManual) return fromEnOrManual;
      const codeRaw = (catalogImg.code ?? "").trim();
      if (codeRaw) return codeRaw;
      return "Imaging study";
    }
    const base = firstAcceptableLineLabel(it.catalogItemType, manualLineStr);
    if (base) return base;
    return typeFallback(it.catalogItemType, "en");
  }
  if (it.catalogItemType === "MEDICATION") {
    const base = resolveMedicationCatalogPrimaryLabel("en", catalogMed, manualLineStr);
    if (base) {
      const str = (it.strength ?? catalogMed?.strength)?.trim();
      return str ? `${base} ${str}` : base;
    }
    return typeFallback(it.catalogItemType, "en");
  }
  if (it.catalogItemType === "CARE") {
    return careOrderDisplayLabel(it, "en");
  }
  const man = firstAcceptableLineLabel(it.catalogItemType, manualLineStr);
  if (man) return man;
  return typeFallback(it.catalogItemType, "en");
}
