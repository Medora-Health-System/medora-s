/**
 * M1.8B.4A — MAR route normalization for high-alert double-check policy.
 * Priority: order route → MAR route → legacy route → catalog route (+ administrationType).
 */

import { normalizeMedicationRoute } from "./medicationOrderRoute.js";

export type MarMedicationRouteCategory = "SQ" | "IVP" | "IVPB" | "OTHER";

export type ResolveMarMedicationRouteInput = {
  orderRoute?: string | null;
  marRoute?: string | null;
  catalogRoute?: string | null;
  administrationType?: string | null;
  /** Legacy single-route fallback (callers passing only `route`). */
  route?: string | null;
  isContinuousInfusion?: boolean;
};

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

function classifyMarRouteText(
  raw: string,
  administrationType?: string | null
): MarMedicationRouteCategory | null {
  const structured = normalizeMedicationRoute({ route: raw, administrationType });
  if (structured === "SQ" || structured === "IVP" || structured === "IVPB") {
    return structured;
  }

  const normalized = normalizeRouteMatchText(raw);
  if (!normalized) return null;

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

  if (
    normalized === "IVP" ||
    normalized === "IV PUSH" ||
    normalized === "PUSH" ||
    normalized === "BOLUS" ||
    normalized.includes(" IV PUSH") ||
    normalized.startsWith("IV PUSH")
  ) {
    return "IVP";
  }

  if (
    normalized === "IVPB" ||
    normalized === "IV PIGGYBACK" ||
    normalized === "IV PIGGY BACK" ||
    normalized === "INFUSION" ||
    normalized === "PERFUSION" ||
    normalized === "DRIP" ||
    normalized.includes("PIGGYBACK") ||
    normalized.includes("INFUSION") ||
    normalized.includes("PERFUSION") ||
    normalized.includes("DRIP")
  ) {
    return "IVPB";
  }

  return null;
}

/**
 * Resolves MAR administration route to SQ / IVP / IVPB for witness-matrix policy.
 */
export function resolveMarMedicationRouteCategory(
  input: ResolveMarMedicationRouteInput
): MarMedicationRouteCategory {
  if (input.isContinuousInfusion === true) {
    return "IVPB";
  }

  const routeCandidates = [
    input.orderRoute,
    input.marRoute,
    input.route,
    input.catalogRoute,
  ];

  for (const candidate of routeCandidates) {
    if (!candidate?.trim()) continue;
    const category = classifyMarRouteText(candidate, input.administrationType);
    if (category) return category;
  }

  const admin = input.administrationType?.trim().toUpperCase();
  if (admin === "SQ") return "SQ";
  if (admin === "PUSH") return "IVP";
  if (admin === "INFUSION") return "IVPB";

  return "OTHER";
}
