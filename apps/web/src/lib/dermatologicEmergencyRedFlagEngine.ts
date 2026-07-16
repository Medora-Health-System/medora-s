/**
 * Phase 14 — dermatologic emergency red-flag screening (documentation advisory only).
 * Mirrors `softTissueWoundInfectionRedFlagEngine.ts` (Phase 13). This module never
 * establishes a diagnosis, never autonomously orders medications, never performs a biopsy,
 * never admits, never transfers, and never requests a consult — it only screens documented
 * text for patterns that warrant clinician attention and returns advisory prompts.
 *
 * SCORTEN and other severity scores, if mentioned in documentation, are treated as
 * documentation/calculation only. They are never used here as an autonomous rule-out of a
 * dermatologic emergency.
 */

export type DermatologicEmergencyRedFlagCategory =
  | "sjs_ten"
  | "dress"
  | "agep"
  | "meningococcal_type_rash"
  | "purpura_fulminans"
  | "petechiae_purpura_systemic"
  | "disseminated_infection"
  | "severe_erythroderma"
  | "necrotizing_overlap"
  | "eczema_herpeticum"
  | "disseminated_hsv_zoster"
  | "severe_mucosal_ocular"
  | "airway_angioedema_overlap"
  | "neonatal_herpes_concern"
  | "generalized_pustular_psoriasis";

export type DermatologicEmergencyRedFlagInput = {
  code?: string;
  displayName?: string;
  documentedFlags?: readonly string[];
};

export type DermatologicEmergencyRedFlagResolution = {
  categories: DermatologicEmergencyRedFlagCategory[];
  prompts: string[];
};

const normalize = (value = "") =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const NO_AUTONOMOUS_ACTION_SUFFIX =
  "This module does not autonomously diagnose, order medications, perform a biopsy, admit, transfer, or request a consult — those remain the treating clinician's decisions.";

const DEFINITIONS: Array<{
  category: DermatologicEmergencyRedFlagCategory;
  pattern: RegExp;
  prompt: string;
}> = [
  {
    category: "sjs_ten",
    pattern:
      /stevens.johnson|\bsjs\b|toxic epidermal necrolysis|\bten\b(?! percent)|skin sloughing|epidermal detachment|positive nikolsky|mucosal (sloughing|erosions) with (fever|rash)|target lesions? with blistering/,
    prompt:
      "Document the percentage of body surface area involved, mucosal (oral, ocular, genital) involvement, Nikolsky sign if tested, and any recent new medication exposure. Stevens-Johnson syndrome / toxic epidermal necrolysis is a life-threatening mucocutaneous emergency distinct from a simple drug rash. If a SCORTEN score is calculated, it is documentation/calculation only — never an autonomous rule-out. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "dress",
    pattern:
      /\bdress syndrome\b|drug reaction with eosinophilia|drug.induced hypersensitivity syndrome|\bdihs\b|facial edema with (rash|fever) and (lymphadenopathy|eosinophilia)/,
    prompt:
      "Document the medication exposure timeline (typically 2-8 weeks before onset), facial edema, lymphadenopathy, fever, and any organ involvement noted on labs if obtained. DRESS syndrome is a delayed, multi-organ drug hypersensitivity reaction distinct from an uncomplicated drug eruption. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "agep",
    pattern:
      /acute generalized exanthematous pustulosis|\bagep\b|widespread sterile pustules with fever|pustular drug eruption/,
    prompt:
      "Document the onset relative to a new medication, the distribution of sterile pustules on erythematous skin, and fever if present. Acute generalized exanthematous pustulosis is distinct from generalized pustular psoriasis and from a simple bacterial folliculitis. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "meningococcal_type_rash",
    pattern:
      /meningococc(al|emia)|nonblanching rash with fever|petechial rash with (fever|neck stiffness|altered mental status)|purpuric rash with fever and (headache|neck stiffness)/,
    prompt:
      "Document whether the rash blanches, its rate of progression, associated fever, neck stiffness, headache, and mental status. A nonblanching petechial or purpuric rash with fever raises concern for meningococcemia, distinct from a benign viral exanthem. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "purpura_fulminans",
    pattern:
      /purpura fulminans|rapidly progressive purpura with (shock|hypotension)|retiform purpura with (hemodynamic instability|shock)|dic with (skin necrosis|purpura)/,
    prompt:
      "Document the rate of progression of purpuric or necrotic skin lesions, hemodynamic status, and any known coagulopathy. Purpura fulminans is a life-threatening thrombotic/hemorrhagic skin emergency distinct from ordinary purpura. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "petechiae_purpura_systemic",
    pattern:
      /petechiae with (fever|systemic symptoms|thrombocytopenia)|purpura with (fever|systemic symptoms|thrombocytopenia)|widespread petechiae|palpable purpura with systemic symptoms/,
    prompt:
      "Document the distribution of petechiae or purpura, whether lesions are palpable, and any associated fever, joint pain, or systemic symptoms. Petechiae/purpura with systemic features is distinct from a localized, non-systemic petechial rash (e.g., after coughing or straining). " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "disseminated_infection",
    pattern:
      /disseminated (gonococcal|fungal|infection)|widespread skin lesions with (sepsis|systemic toxicity)|multiple skin abscesses with (fever|toxic appearance)|septic emboli.*skin|skin lesions consistent with disseminated infection/,
    prompt:
      "Document the distribution and appearance of skin lesions, systemic toxicity, and immune status. Disseminated cutaneous infection is distinct from a single, localized skin/soft tissue infection. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "severe_erythroderma",
    pattern:
      /erythroderma|generalized erythema (over|involving) (more than |over )?(80|85|90)\s?%|whole.?body (redness|erythema) with (scaling|exfoliation)/,
    prompt:
      "Document the percentage of body surface area involved, temperature regulation, fluid status, and any known trigger (drug, psoriasis flare, atopic dermatitis flare). Erythroderma is a generalized skin failure syndrome distinct from a localized inflammatory rash. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "necrotizing_overlap",
    pattern:
      /necrotizing (soft tissue|fasciitis) .*(skin|rash|lesion)|skin necrosis with (pain out of proportion|rapidly progressive)|purpuric skin lesions with (crepitus|severe pain)/,
    prompt:
      "Document the rate of progression, pain severity relative to exam findings, and any crepitus or bullae. Necrotizing soft tissue infection can overlap with a dermatologic presentation and is a surgical emergency distinct from an uncomplicated skin infection; the dedicated soft tissue/wound red-flag screening is not duplicated here. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "eczema_herpeticum",
    pattern:
      /eczema herpeticum|kaposi.?s? varicelliform eruption|punched.out (vesicles|erosions) (on|in|involving) (eczema|atopic dermatitis)|monomorphic vesicles on (eczematous|atopic) skin/,
    prompt:
      "Document the appearance of punched-out erosions or monomorphic vesicles on eczematous skin, fever, and rate of spread. Eczema herpeticum is a disseminated herpes simplex superinfection of atopic/eczematous skin distinct from an ordinary eczema flare. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "disseminated_hsv_zoster",
    pattern:
      /disseminated (herpes zoster|varicella.zoster|hsv)|zoster (crossing|involving) multiple dermatomes|disseminated shingles|generalized vesicular rash in immunocompromised/,
    prompt:
      "Document the number of dermatomes involved, whether lesions extend beyond a single dermatome, and immune status. Disseminated herpes zoster/HSV is distinct from a localized, single-dermatome zoster and raises concern in immunocompromised patients. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "severe_mucosal_ocular",
    pattern:
      /ocular involvement with (blistering|mucosal) (rash|disease)|conjunctival involvement with (rash|blistering)|corneal involvement with (rash|sjs|ten)|severe mucosal (sloughing|erosions|involvement)/,
    prompt:
      "Document ocular findings (conjunctival injection, corneal involvement, mucosal sloughing) as documentation only. Ocular involvement in a blistering mucocutaneous disease carries vision-threatening risk and its evaluation belongs to ophthalmology, distinct from routine skin findings — ocular exam ownership is not assumed by this module. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "airway_angioedema_overlap",
    pattern:
      /angioedema with (airway|throat|tongue) (swelling|compromise)|tongue swelling with (rash|hives)|throat tightness with (urticaria|angioedema)|stridor with (rash|hives|angioedema)/,
    prompt:
      "Document airway findings (voice change, stridor, tongue/lip/throat swelling) as documentation only. Angioedema with airway involvement is a distinct airway emergency overlapping with a dermatologic presentation; airway management ownership is not assumed by this module. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "neonatal_herpes_concern",
    pattern:
      /neonatal herpes|vesicular rash in a neonate|(newborn|neonate) with vesicular (lesions|rash)|(infant|neonate) .*(vesicles|vesicular rash).*(fever|lethargy)/,
    prompt:
      "Document the infant's age in days, vesicle distribution, feeding/activity level, and temperature. A vesicular rash in a neonate raises concern for neonatal herpes simplex virus infection, distinct from a benign neonatal rash, and warrants prompt evaluation. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "generalized_pustular_psoriasis",
    pattern:
      /generalized pustular psoriasis|von zumbusch|widespread sterile pustules on erythematous (base|skin) with fever/,
    prompt:
      "Document the distribution of sterile pustules on erythematous skin, fever, and known psoriasis history. Generalized pustular psoriasis is a severe, potentially systemic variant distinct from plaque psoriasis or a localized pustular flare. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
];

/** Documentation advisory only. Never establishes a diagnosis, orders medications, performs a biopsy, admits, transfers, or requests a consult. */
export function resolveDermatologicEmergencyRedFlags(
  input: DermatologicEmergencyRedFlagInput
): DermatologicEmergencyRedFlagResolution {
  const text = normalize(
    [input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" ")
  );
  const matched = DEFINITIONS.filter((definition) => definition.pattern.test(text));
  return {
    categories: matched.map((definition) => definition.category),
    prompts: matched.map((definition) => definition.prompt),
  };
}

export function dermatologicEmergencyRedFlagWarnings(input: DermatologicEmergencyRedFlagInput): string[] {
  return resolveDermatologicEmergencyRedFlags(input).prompts;
}

/** Safety gate: true whenever documented findings raise a life-threatening dermatologic emergency concern. */
export function isDermatologicLifeThreateningFlagged(input: DermatologicEmergencyRedFlagInput): boolean {
  const categories = resolveDermatologicEmergencyRedFlags(input).categories;
  return (
    categories.includes("sjs_ten") ||
    categories.includes("dress") ||
    categories.includes("agep") ||
    categories.includes("meningococcal_type_rash") ||
    categories.includes("purpura_fulminans") ||
    categories.includes("petechiae_purpura_systemic") ||
    categories.includes("disseminated_infection") ||
    categories.includes("severe_erythroderma") ||
    categories.includes("necrotizing_overlap") ||
    categories.includes("eczema_herpeticum") ||
    categories.includes("disseminated_hsv_zoster") ||
    categories.includes("severe_mucosal_ocular") ||
    categories.includes("airway_angioedema_overlap") ||
    categories.includes("neonatal_herpes_concern") ||
    categories.includes("generalized_pustular_psoriasis")
  );
}
