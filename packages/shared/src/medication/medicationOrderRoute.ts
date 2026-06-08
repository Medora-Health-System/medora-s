/**
 * M1.8B.3 — Canonical medication order routes (L1 order layer).
 * Catalog/MAR may use free-text routes; orders persist structured values from this set.
 */

export const MEDICATION_ORDER_ROUTES = ["PO", "IM", "IVP", "IVPB", "SQ"] as const;

export type MedicationOrderRoute = (typeof MEDICATION_ORDER_ROUTES)[number];

/** M1.8B.7B — structured order route IVPB (canonical L1 enum value only). */
export function isStructuredMedicationOrderRouteIvpb(
  route: string | null | undefined
): route is "IVPB" {
  return route?.trim().toUpperCase() === "IVPB";
}

function stripRouteDiacritics(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/\u0300-\u036f/g, "")
    .replace(/œ/g, "oe")
    .replace(/Œ/g, "OE");
}

function normalizeRouteMatchText(raw: string): string {
  return stripRouteDiacritics(raw.trim())
    .toUpperCase()
    .replace(/[._-]/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeRouteDisplayText(raw: string): string {
  return stripRouteDiacritics(raw.trim()).toLowerCase().replace(/[._]/g, "-");
}

export type NormalizeMedicationRouteInput = {
  route?: string | null;
  administrationType?: string | null;
};

/**
 * Maps catalog / free-text route hints to structured order route values.
 * SC and subcutaneous synonyms normalize to SQ.
 * Generic `injectable` rows resolve to SQ when `administrationType` is SQ (e.g. heparin prophylaxis).
 */
export function normalizeMedicationRoute(
  raw: string | NormalizeMedicationRouteInput | null | undefined
): MedicationOrderRoute | undefined {
  if (raw == null) return undefined;

  const route =
    typeof raw === "string" ? raw : raw.route;
  const administrationType =
    typeof raw === "object" ? raw.administrationType : undefined;

  if (route == null || !String(route).trim()) {
    const adminOnly = administrationType?.trim().toUpperCase();
    return adminOnly === "SQ" ? "SQ" : undefined;
  }

  const normalized = normalizeRouteMatchText(String(route));
  if (!normalized) return undefined;

  if (
    normalized === "PO" ||
    normalized === "ORAL" ||
    normalized === "ORALE" ||
    normalized === "BY MOUTH"
  ) {
    return "PO";
  }
  if (normalized === "IM" || normalized === "INTRAMUSCULAR" || normalized === "INTRAMUSCULAIRE") {
    return "IM";
  }
  if (normalized === "IVP" || normalized === "IV PUSH") return "IVP";
  if (normalized === "IVPB" || normalized === "IV PIGGYBACK" || normalized === "IV PIGGY BACK") {
    return "IVPB";
  }
  if (
    normalized === "SQ" ||
    normalized === "SC" ||
    normalized === "SUBCUTANEOUS" ||
    normalized === "SUB CUTANEOUS" ||
    normalized === "SOUS CUTANEE" ||
    normalized.includes("SOUS CUTAN") ||
    normalized.includes("SUBCUTAN")
  ) {
    return "SQ";
  }

  if (normalized === "INJECTABLE") {
    const admin = administrationType?.trim().toUpperCase();
    if (admin === "SQ") return "SQ";
    if (admin === "IM") return "IM";
    if (admin === "PUSH") return "IVP";
    if (admin === "INFUSION") return "IVPB";
  }

  return undefined;
}

export type CompactMedicationRouteInput = {
  route?: string | null;
  /** Catalog `administrationType` — disambiguates generic `injectable` rows (e.g. heparin SQ). */
  administrationType?: string | null;
};

/**
 * Compact route label for catalog search / autocomplete display.
 * SQ medications display SQ; generic injectable + SQ admin type does not display as IV.
 */
export function compactMedicationRoute(input: CompactMedicationRouteInput | string | undefined): string {
  const route = typeof input === "string" || input == null ? input : input.route;
  const administrationType =
    typeof input === "object" && input != null ? input.administrationType : undefined;

  const trimmed = route?.trim() ?? "";
  const normalized = normalizeRouteDisplayText(trimmed);
  if (!normalized) return "";

  if (
    normalized === "sq" ||
    normalized === "sc" ||
    normalized === "subcutaneous" ||
    normalized.includes("sous-cutan") ||
    normalized.includes("subcutan")
  ) {
    return "SQ";
  }

  if (normalized === "intraveineuse" || normalized === "intravenous" || normalized === "iv") {
    return "IV";
  }

  if (normalized === "injectable") {
    const admin = administrationType?.trim().toUpperCase();
    if (admin === "SQ") return "SQ";
    if (admin === "IM") return "IM";
    if (admin === "PUSH" || admin === "INFUSION") return "IV";
    return "INJ";
  }

  if (normalized === "intramusculaire" || normalized === "intramuscular" || normalized === "im") {
    return "IM";
  }
  if (normalized === "orale" || normalized === "oral" || normalized === "po") return "PO";
  return trimmed;
}
