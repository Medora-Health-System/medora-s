/**
 * Read-only catalog classification audit flags (Phase 6B). No PHI; label/route checks use shared clinical normalization where applicable.
 */

import { isIvpbInfusionRoute, isRouteClearlyIvPushOrBolus } from "./infusionRoute.util.js";

export type CatalogClassificationAuditFlag =
  | "ROUTE_PUSH_BUT_INFUSION"
  | "INFUSION_BUT_NOT_IV_ROUTE"
  | "HYDRATION_MISMATCH"
  | "THERAPEUTIC_MISMATCH"
  | "UNKNOWN_HIGH_USAGE"
  | "MISSING_ADMIN_TYPE"
  | "MISSING_BILLING_CLASS";

const CONFLICT_FLAGS: ReadonlySet<CatalogClassificationAuditFlag> = new Set([
  "ROUTE_PUSH_BUT_INFUSION",
  "INFUSION_BUT_NOT_IV_ROUTE",
  "HYDRATION_MISMATCH",
  "THERAPEUTIC_MISMATCH",
  "UNKNOWN_HIGH_USAGE",
]);

const ANTIBIOTIC_HINTS: readonly string[] = [
  "ceftriaxone",
  "cefazolin",
  "cefepime",
  "vancomycin",
  "piperacillin",
  "tazobactam",
  "zosyn",
  "meropenem",
  "metronidazole",
  "gentamicin",
  "ampicillin",
  "azithromycin",
  "ciprofloxacin",
  "levofloxacin",
  "clindamycin",
  "antibiotic",
  "antibiotique",
];

const FLUID_HINTS: readonly string[] = [
  "normal saline",
  "sodium chloride",
  "0.9%",
  "nacl",
  "lactated",
  "ringer",
  "hartmann",
  "d5w",
  "d10w",
  "dextrose",
  "crystalloid",
  "soluté",
  "solute",
  "perfusion",
];

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

/** Route text suggests an IV-capable line for INFUSION rows (conservative vs false INFUSION_BUT_NOT_IV). */
export function routeQualifiesAsIvForInfusionAudit(route: string | null | undefined): boolean {
  const raw = route?.trim();
  if (!raw) return false;
  if (isRouteClearlyIvPushOrBolus(raw)) return true;
  if (isIvpbInfusionRoute(raw)) return true;
  const n = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/\u0300-\u036f/g, "");
  if (n.includes("intravenous") || n.includes("intraveineuse")) return true;
  if (n === "iv" || /\biv\b/.test(n)) return true;
  if (n.includes("perfusion")) return true;
  if (n.includes("injectable")) return true;
  return false;
}

function labelMatchesAny(labelLower: string, needles: readonly string[]): boolean {
  for (const n of needles) {
    if (labelLower.includes(n)) return true;
  }
  return false;
}

/** Heuristic for UX warnings (Phase 6C); lowercase / trimmed label haystack. */
export function catalogAuditLabelHasAntibioticHint(labelLower: string): boolean {
  return labelMatchesAny(labelLower.toLowerCase(), ANTIBIOTIC_HINTS);
}

/** Heuristic for UX warnings (Phase 6C); lowercase / trimmed label haystack. */
export function catalogAuditLabelHasFluidHint(labelLower: string): boolean {
  return labelMatchesAny(labelLower.toLowerCase(), FLUID_HINTS);
}

export type CatalogClassificationAuditFlagInput = {
  route: string | null | undefined;
  administrationType: string | null | undefined;
  billingClass: string | null | undefined;
  /** Lowercased composite label (catalog display + generic + code, etc.). */
  labelLower: string;
  usageCount: number;
  /** Inclusive minimum usage for UNKNOWN_HIGH_USAGE (e.g. 80th percentile among unknown-billing meds with usage > 0). Use 0 to disable. */
  unknownHighUsageThreshold: number;
};

export function computeCatalogClassificationAuditFlags(input: CatalogClassificationAuditFlagInput): CatalogClassificationAuditFlag[] {
  const flags: CatalogClassificationAuditFlag[] = [];
  const routeRaw = input.route?.trim() ?? "";
  const adminU = norm(input.administrationType).toUpperCase();
  const billU = norm(input.billingClass).toUpperCase();
  const labelL = input.labelLower;

  if (!input.administrationType?.trim()) flags.push("MISSING_ADMIN_TYPE");
  if (!input.billingClass?.trim()) flags.push("MISSING_BILLING_CLASS");

  if (adminU === "INFUSION") {
    if (routeRaw && isRouteClearlyIvPushOrBolus(routeRaw)) flags.push("ROUTE_PUSH_BUT_INFUSION");
    if (!routeRaw || !routeQualifiesAsIvForInfusionAudit(input.route)) flags.push("INFUSION_BUT_NOT_IV_ROUTE");
  }

  if (billU === "HYDRATION" && labelMatchesAny(labelL, ANTIBIOTIC_HINTS)) {
    flags.push("HYDRATION_MISMATCH");
  }
  if (billU === "THERAPEUTIC" && labelMatchesAny(labelL, FLUID_HINTS)) {
    flags.push("THERAPEUTIC_MISMATCH");
  }

  const billingUnknown = !input.billingClass?.trim() || billU === "UNKNOWN";
  if (
    billingUnknown &&
    input.unknownHighUsageThreshold > 0 &&
    input.usageCount >= input.unknownHighUsageThreshold
  ) {
    flags.push("UNKNOWN_HIGH_USAGE");
  }

  return [...new Set(flags)];
}

export function catalogAuditConflictFlagCount(flags: readonly CatalogClassificationAuditFlag[]): number {
  let n = 0;
  for (const f of flags) {
    if (CONFLICT_FLAGS.has(f)) n++;
  }
  return n;
}
