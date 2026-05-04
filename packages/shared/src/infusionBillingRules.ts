/**
 * IVPB / infusion duration → billing **suggestions** only (Phase 5).
 * No payer-specific CPT/HCPCS assignment; billers must verify all lines.
 */

export type InfusionBillingClassSuggestion = "HYDRATION" | "THERAPEUTIC" | "UNKNOWN";

export type InfusionBillingSuggestionInput = {
  infusionDurationMinutes: number;
  medicationLabel?: string;
  route?: string;
  /** Optional catalog hint (e.g. `CatalogMedication.therapeuticClass` or future billing class). */
  catalogBillingClass?: string | null;
  catalogCode?: string | null;
};

export type InfusionBillingSuggestion = {
  billingClass: InfusionBillingClassSuggestion;
  manualReviewRequired: true;
  suggestedUnits: {
    initialHour?: number;
    additionalHoursOrIntervals?: number;
  };
  warnings: string[];
};

const PAYER_VERIFY_WARNING =
  "Suggestion uniquement ; vérifier les règles de l’assureur et de l’établissement.";

const THERAPEUTIC_SUBSTRINGS: readonly string[] = [
  "piperacillin/tazobactam",
  "piperacillin",
  "tazobactam",
  "zosyn",
  "vancomycin",
  "ceftriaxone",
  "cefazolin",
  "cefepime",
  "ceftazidime",
  "cefotaxime",
  "cefuroxime",
  "cefoxitin",
  "cefprozil",
  "meropenem",
  "ertapenem",
  "imipenem",
  "metronidazole",
  "azithromycin",
  "ciprofloxacin",
  "levofloxacin",
  "moxifloxacin",
  "clindamycin",
  "penicillin",
  "ampicillin",
  "amoxicillin",
  "gentamicin",
  "tobramycin",
  "linezolid",
  "daptomycin",
  "tigecycline",
  "doxycycline",
  "minocycline",
  "trimethoprim",
  "sulfamethoxazole",
  "bactrim",
  "rifampin",
  "isoniazid",
  "ethambutol",
  "pyrazinamide",
  "fluconazole",
  "acyclovir",
  "ganciclovir",
  "oseltamivir",
  "antibiotic",
  "antimicrobial",
  "antibacterial",
];

const HYDRATION_SUBSTRINGS: readonly string[] = [
  "normal saline",
  "half normal",
  "half-normal",
  "0.45% nacl",
  "0.9% nacl",
  "0.9% sodium chloride",
  "sodium chloride 0.9",
  "sodium chloride",
  "nacl 0.9",
  " lactated ringer",
  "lactated ringer",
  "lactated ringers",
  "ringer's lactate",
  "ringers lactate",
  "lactate ringer",
  "d5w",
  "d10w",
  "d5-ns",
  "d5 ns",
  "d10 ",
  "d5 ",
  "dextrose in water",
  "dextrose 5%",
  "dextrose 10%",
  "5% dextrose",
  "10% dextrose",
  "swfi",
  "sterile water",
];

function normalizeCompositeLabel(input: InfusionBillingSuggestionInput): string {
  const parts = [
    input.medicationLabel,
    input.catalogBillingClass,
    input.catalogCode,
    input.route,
  ]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
  return parts.join(" ").toLowerCase();
}

function containsTherapeuticDrug(haystack: string): boolean {
  for (const s of THERAPEUTIC_SUBSTRINGS) {
    if (haystack.includes(s)) return true;
  }
  return false;
}

function containsHydrationFluid(haystack: string): boolean {
  const compact = haystack.replace(/\s+/g, " ");
  if (/\blr\b/i.test(compact) && (haystack.includes("ring") || haystack.includes("lact"))) {
    return true;
  }
  if (/(^|\s)ns(\s|$|,)/i.test(compact) && (haystack.includes("saline") || haystack.includes("nacl") || haystack.includes("0.9"))) {
    return true;
  }
  for (const s of HYDRATION_SUBSTRINGS) {
    if (haystack.includes(s)) return true;
  }
  return false;
}

function classifyBillingClass(input: InfusionBillingSuggestionInput): InfusionBillingClassSuggestion {
  const hay = normalizeCompositeLabel(input);
  if (!hay.trim()) return "UNKNOWN";
  if (containsTherapeuticDrug(hay)) return "THERAPEUTIC";
  if (containsHydrationFluid(hay)) return "HYDRATION";
  return "UNKNOWN";
}

function durationValidMinutes(v: number): v is number {
  return Number.isFinite(v) && v > 0 && v <= 2880;
}

function suggestUnits(durationMinutes: number): InfusionBillingSuggestion["suggestedUnits"] {
  const out: InfusionBillingSuggestion["suggestedUnits"] = {};
  if (durationMinutes >= 31) out.initialHour = 1;
  if (durationMinutes >= 91) {
    out.additionalHoursOrIntervals = Math.floor((durationMinutes - 91) / 60) + 1;
  }
  return out;
}

/**
 * Pure suggestion helper — always `manualReviewRequired: true`; never emits claim-ready CPT/HCPCS.
 */
export function suggestInfusionBilling(input: InfusionBillingSuggestionInput): InfusionBillingSuggestion {
  const warnings: string[] = [PAYER_VERIFY_WARNING];
  const dm = input.infusionDurationMinutes;
  const durationOk = durationValidMinutes(dm);

  if (!durationOk) {
    warnings.push(
      "Durée de perfusion absente ou non utilisable pour une suggestion d’unités ; vérifier la documentation."
    );
    return {
      billingClass: "UNKNOWN",
      manualReviewRequired: true,
      suggestedUnits: {},
      warnings,
    };
  }

  let billingClass = classifyBillingClass(input);
  const hay = normalizeCompositeLabel(input);
  if (billingClass === "UNKNOWN" && !hay.trim()) {
    warnings.push(
      "Libellé du médicament ou contexte catalogue manquant ; impossible de distinguer hydratation et perfusion thérapeutique."
    );
  } else if (billingClass === "UNKNOWN") {
    warnings.push(
      "Classification hydratation / thérapeutique incertaine à partir du libellé ou du catalogue ; revue manuelle."
    );
  }

  const suggestedUnits = suggestUnits(dm);

  if (billingClass !== "UNKNOWN" && dm < 31) {
    warnings.push(
      "Durée inférieure à 31 minutes ; les seuils habituels de première heure de perfusion peuvent ne pas s’appliquer."
    );
  }

  if (billingClass === "THERAPEUTIC" && dm < 31) {
    warnings.push(
      "Perfusion thérapeutique documentée sous 31 minutes ; vérifier si une première heure de perfusion est facturable selon la politique."
    );
  }

  return {
    billingClass,
    manualReviewRequired: true,
    suggestedUnits,
    warnings,
  };
}
