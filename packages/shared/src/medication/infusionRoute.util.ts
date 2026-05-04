/**
 * IVPB / infusion vs IV push — shared API + ER orders UI.
 * IVP and explicit push/bolus routes must remain non-infusion so one-step MAR push flow is unchanged.
 */

import { parseMedicationAdministrationType } from "./medicationCatalogClassification.js";

export type MedicationInfusionCandidateInput = {
  route?: string | null;
  /** Free text: manual label, catalog names, etc. */
  medicationLabel?: string | null;
  code?: string | null;
  genericName?: string | null;
  /** Optional future payload (e.g. order extension JSON) — not persisted on OrderItem today. */
  metadata?: unknown;
  /** Optional `CatalogMedication.administrationType` (validated in classifier). */
  catalogAdministrationType?: string | null;
};

function normalizeClinicalText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\u0300-\u036f/g, "")
    .replace(/œ/g, "oe");
}

function padHaystack(s: string): string {
  const n = normalizeClinicalText(s);
  return n.length ? ` ${n} ` : "";
}

function parseAdministrationTypeUpper(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const m = metadata as Record<string, unknown>;
  const v = m.administrationType ?? m.administration_type;
  if (typeof v !== "string") return null;
  const t = v.trim().toUpperCase();
  return t.length ? t : null;
}

/** Route text explicitly documents infusion / IVPB (for PUSH catalog override). */
function routeExplicitlyInfusionWording(route: string): boolean {
  const raw = route?.trim();
  if (!raw) return false;
  return isIvpbInfusionRoute(raw);
}

function isRouteExcludedPoImSqSc(route: string): boolean {
  const n = normalizeClinicalText(route.trim());
  if (!n) return false;
  if (n === "po" || n === "im" || n === "sq" || n === "sc") return true;
  if (n.includes("oral") || n.includes("per os")) return true;
  if (n.includes("intramuscular") || n.includes("subcutaneous")) return true;
  return false;
}

/** True when route text clearly indicates IV push / bolus / IVP one-step (exclude from infusion lifecycle). */
export function isRouteClearlyIvPushOrBolus(route: string | null | undefined): boolean {
  const raw = route?.trim();
  if (!raw) return false;
  const n = normalizeClinicalText(raw);
  if (n.includes("iv push") || n.includes("bolus")) return true;
  if (n === "ivp") return true;
  if (/\bivp\b/.test(n) && !n.includes("ivpb")) return true;
  return false;
}

/** IV piggyback / explicit infusion wording on route alone. */
export function isIvpbInfusionRoute(route: string | null | undefined): boolean {
  const raw = route?.trim();
  if (!raw) return false;

  const n = normalizeClinicalText(raw);

  if (n.includes("iv push") || n.includes("bolus")) return false;

  if (n.includes("ivpb")) return true;
  if (n.includes("infusion")) return true;
  if (n.includes("piggyback")) return true;

  if (n === "ivp") return false;
  if (/\bivp\b/.test(n) && !n.includes("ivpb")) return false;

  return false;
}

/** IV bag / IV line capable (not PO); "IV" alone counts for fluid+antibiotic heuristics. */
function isIvCapableRoute(route: string): boolean {
  const n = normalizeClinicalText(route.trim());
  if (!n) return false;
  if (isRouteClearlyIvPushOrBolus(route)) return false;
  if (isIvpbInfusionRoute(route)) return true;
  if (n === "iv") return true;
  if (/\biv\b/.test(n)) return true;
  if (n.includes("intravenous")) return true;
  return false;
}

const FLUID_SUBSTRINGS = [
  "normal saline",
  "0.9% nacl",
  "0.9 % nacl",
  "sodium chloride",
  "0.45% nacl",
  "half normal",
  "lactated ringer",
  "lactated ringers",
  "hartmann",
  "ringer lactate",
  "ringers lactate",
  "dextrose",
  "d5w",
  "d10w",
  "d5 ",
  "d10 ",
  "d 5%",
  "d 10%",
  "crystalloid",
  "iv fluid",
  "plasmalyte",
  "normosol",
  "isolyte",
  "saline",
  "fluid bolus", // care: "fluid bolus" might be rapid infusion — still bag context; exclude if combined with push? rare
] as const;

const IV_ANTIBIOTIC_SUBSTRINGS = [
  "ceftriaxone",
  "cefazolin",
  "cefepime",
  "vancomycin",
  "piperacillin",
  "tazobactam",
  "zosyn",
  "meropenem",
  "ampicillin",
  "sulbactam",
  "unasyn",
  "metronidazole",
  "levofloxacin",
  "ciprofloxacin",
  "azithromycin",
  "clindamycin",
  "gentamicin",
  "tobramycin",
  "doxycycline",
  "linezolid",
  "daptomycin",
  "ertapenem",
] as const;

/** Typical IV push / analgesic / antiemetic push meds — never use bag infusion lifecycle. */
const IV_PUSH_MEDICATION_SUBSTRINGS = [
  "morphine",
  "hydromorphone",
  "ondansetron",
  "ketorolac",
  "fentanyl",
  "lorazepam",
] as const;

function haystackMatchesAny(hay: string, needles: readonly string[]): boolean {
  for (const k of needles) {
    if (hay.includes(k)) return true;
  }
  return false;
}

/** Token "ns" as a word (padded haystack). */
function hasStandaloneNsToken(padded: string): boolean {
  return padded.includes(" ns ") || padded.startsWith("ns ") || padded.endsWith(" ns");
}

function matchesFluidHeuristics(padded: string): boolean {
  if (haystackMatchesAny(padded, FLUID_SUBSTRINGS)) return true;
  if (hasStandaloneNsToken(padded)) return true;
  return false;
}

function matchesIvAntibioticHeuristics(padded: string): boolean {
  return haystackMatchesAny(padded, IV_ANTIBIOTIC_SUBSTRINGS);
}

function matchesIvPushMedicationHeuristics(padded: string): boolean {
  return haystackMatchesAny(padded, IV_PUSH_MEDICATION_SUBSTRINGS);
}

/**
 * Large-volume bag / crystalloid context — used to override misleading catalog routes such as "IVP"
 * on 500–1000 mL fluids (common data-entry quirk).
 */
function isLargeVolumeOrBagFluidContext(padded: string): boolean {
  if (padded.includes(" bag ")) return true;
  if (/\b\d+(?:[.,]\d+)?\s*l\b/.test(padded)) return true;
  if (/\b(?:250|500|750|1000|1500|2000|2500|3000|5000)\s*ml\b/.test(padded)) return true;
  if (/\b\d{4}\s*ml\b/.test(padded)) return true;
  if (padded.includes(" lactated ringer")) return true;
  if (padded.includes(" lactated ringers")) return true;
  if (padded.includes(" ringers lactate")) return true;
  if (padded.includes(" hartmann")) return true;
  if (padded.includes(" plasmalyte")) return true;
  if (padded.includes(" normosol")) return true;
  if (padded.includes(" isolyte")) return true;
  if (padded.includes(" crystalloid")) return true;
  return false;
}

function isInjectableParenteralRoute(route: string): boolean {
  const n = normalizeClinicalText(route.trim());
  if (!n) return false;
  if (n === "injectable") return true;
  return n.includes("injectable");
}

function buildClassificationHaystack(input: MedicationInfusionCandidateInput): string {
  const parts = [
    input.medicationLabel,
    input.code,
    input.genericName,
  ]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  return parts.join(" ");
}

/**
 * True when bedside medication should use infusion start/stop (vs one-step nurse complete / MAR push).
 * Priority: metadata.administrationType INFUSION → catalog administrationType → legacy route/label heuristics.
 */
export function isMedicationInfusionCandidate(input: MedicationInfusionCandidateInput): boolean {
  const routeRaw = typeof input.route === "string" ? input.route.trim() : "";
  const catalogAdmin = parseMedicationAdministrationType(input.catalogAdministrationType ?? undefined);
  const metaAdminRaw = parseAdministrationTypeUpper(input.metadata);
  const metaAdmin = parseMedicationAdministrationType(metaAdminRaw);

  if (routeRaw && isRouteExcludedPoImSqSc(routeRaw)) return false;

  if (metaAdmin === "INFUSION") return true;

  if (catalogAdmin === "ORAL" || catalogAdmin === "IM" || catalogAdmin === "SQ") return false;

  if (catalogAdmin === "PUSH") {
    if (routeRaw && routeExplicitlyInfusionWording(routeRaw)) return true;
    return false;
  }

  if (catalogAdmin === "INFUSION") return true;

  const hay = buildClassificationHaystack(input);
  const padded = padHaystack(hay);
  const hasPadded = Boolean(padded.trim());

  if (hasPadded && matchesIvPushMedicationHeuristics(padded)) return false;

  if (routeRaw && isIvpbInfusionRoute(routeRaw)) return true;

  if (!hasPadded) {
    return false;
  }

  const fluid = matchesFluidHeuristics(padded);
  const abx = matchesIvAntibioticHeuristics(padded);
  if (!fluid && !abx) return false;

  const routeLooksIvPush = Boolean(routeRaw && isRouteClearlyIvPushOrBolus(routeRaw));
  if (fluid && routeLooksIvPush && isLargeVolumeOrBagFluidContext(padded)) {
    return true;
  }

  if (routeRaw && isRouteClearlyIvPushOrBolus(routeRaw)) return false;

  if (!routeRaw) return true;
  if (isIvCapableRoute(routeRaw)) return true;
  if (abx && isInjectableParenteralRoute(routeRaw)) return true;
  return false;
}
