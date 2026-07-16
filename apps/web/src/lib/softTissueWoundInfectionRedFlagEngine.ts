/**
 * Phase 13 — soft tissue and wound infection red-flag screening (documentation advisory
 * only). Mirrors `entEmergencyRedFlagEngine.ts` (Phase 12). This module never establishes a
 * diagnosis, never autonomously starts antibiotics, never performs incision and drainage,
 * never admits, never transfers, and never requests a consult — it only screens documented
 * text for patterns that warrant clinician attention and returns advisory prompts.
 *
 * LRINEC (Laboratory Risk Indicator for Necrotizing Fasciitis): if mentioned in
 * documentation, this module treats it as documentation/calculation only. It is never used
 * here as an autonomous rule-out of necrotizing infection — LRINEC has known false
 * negatives and a low or intermediate score never excludes necrotizing soft tissue
 * infection on its own.
 */

export type SoftTissueWoundInfectionRedFlagCategory =
  | "necrotizing_soft_tissue_infection"
  | "gas_gangrene"
  | "fournier_gangrene"
  | "flexor_tenosynovitis"
  | "deep_space_hand_infection"
  | "diabetic_foot_limb_threat"
  | "fascial_dehiscence_evisceration"
  | "septic_arthritis_concern"
  | "osteomyelitis_concern"
  | "systemic_toxicity_sepsis"
  | "herpetic_whitlow_no_drainage";

export type SoftTissueWoundInfectionRedFlagInput = {
  code?: string;
  displayName?: string;
  documentedFlags?: readonly string[];
};

export type SoftTissueWoundInfectionRedFlagResolution = {
  categories: SoftTissueWoundInfectionRedFlagCategory[];
  prompts: string[];
};

const normalize = (value = "") =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const NO_AUTONOMOUS_ACTION_SUFFIX =
  "This module does not autonomously order antibiotics, incision and drainage (I&D), admission, transfer, or a consult — those remain the treating clinician's decisions.";

const DEFINITIONS: Array<{
  category: SoftTissueWoundInfectionRedFlagCategory;
  pattern: RegExp;
  prompt: string;
}> = [
  {
    category: "necrotizing_soft_tissue_infection",
    pattern:
      /necrotizing (soft tissue|fasciitis)|\bnsti\b|flesh.eating|rapidly progressive (soft tissue |skin )?(infection|necrosis)|pain out of proportion to (the )?(exam|findings)|skin (necrosis|bullae) with (crepitus|severe pain)|woody induration with severe pain/,
    prompt:
      "Document the rate of progression, pain severity relative to exam findings, skin color changes, and any bullae or crepitus. Necrotizing soft tissue infection is a surgical emergency distinct from uncomplicated cellulitis or abscess. If an LRINEC score is calculated, it is documentation/calculation only — never an autonomous rule-out, since a low or intermediate score does not exclude necrotizing infection. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "gas_gangrene",
    pattern:
      /gas gangrene|clostridial myonecrosis|crepitus (on exam|palpable|present|noted)|subcutaneous gas|gas (in|within) (the )?soft tissue|gas.forming infection/,
    prompt:
      "Document palpable crepitus, subcutaneous gas on imaging if obtained, and the rate of clinical progression. Gas-forming soft tissue infection (including clostridial myonecrosis) is distinct from routine cellulitis and progresses rapidly. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "fournier_gangrene",
    pattern:
      /fournier'?s? gangrene|perineal necrotizing infection|scrotal necrosis|genital necrotizing infection/,
    prompt:
      "Document the extent of perineal/genital involvement, pain severity, and systemic signs. Fournier gangrene is a necrotizing infection of the perineum/genitalia distinct from a simple perianal or scrotal abscess. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "flexor_tenosynovitis",
    pattern:
      /flexor tenosynovitis|infectious tenosynovitis|kanavel sign|finger held in flexion|fusiform swelling of the finger|tenderness along (the )?flexor tendon sheath|pain with passive extension of the finger/,
    prompt:
      "Document Kanavel signs (fusiform swelling, finger held in flexion, tenderness along the flexor tendon sheath, and pain with passive extension) as documentation only — this is not an automated diagnosis. Infectious flexor tenosynovitis is a hand emergency distinct from a simple felon or paronychia. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "deep_space_hand_infection",
    pattern:
      /deep space hand infection|palmar space infection|web space infection|thenar space infection|midpalmar space infection|felon with (deep|bone) extension/,
    prompt:
      "Document the specific hand space involved, range of motion, and neurovascular status. Deep space hand infections can threaten function and require prompt evaluation distinct from a superficial felon or paronychia. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "diabetic_foot_limb_threat",
    pattern:
      /diabetic foot (infection|ulcer) with (limb.threat|ischemia|gangrene|necrosis)|limb.threatening diabetic foot|probe.to.bone positive|diabetic foot .*(gangrene|necrosis|osteomyelitis)/,
    prompt:
      "Document ulcer depth, probe-to-bone result if performed, pulses/perfusion, and extent of any necrosis. Limb-threatening diabetic foot infection is distinct from a superficial diabetic foot wound and warrants urgent evaluation. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "fascial_dehiscence_evisceration",
    pattern:
      /fascial dehiscence|wound dehiscence with (evisceration|bowel exposed)|evisceration|abdominal wound (open|separated) with (bowel|omentum) (visible|exposed)/,
    prompt:
      "Document the extent of wound separation and whether fascia, bowel, or omentum is visible. Cover an eviscerated wound with a moist sterile dressing while documenting — do not attempt to reduce exposed viscera. Fascial dehiscence with evisceration is a surgical emergency. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "septic_arthritis_concern",
    pattern:
      /septic arthritis|joint (effusion|swelling) with (fever|inability to bear weight)|purulent joint aspirate|monoarticular (swelling|pain) with fever/,
    prompt:
      "Document the joint involved, range of motion, ability to bear weight, and any effusion. Septic arthritis is distinct from reactive or inflammatory arthritis and threatens the joint if untreated. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "osteomyelitis_concern",
    pattern:
      /osteomyelitis|bone infection|chronic non.healing (wound|ulcer) with exposed bone|probe.to.bone positive/,
    prompt:
      "Document wound depth, exposed bone or hardware if present, and duration of the non-healing wound. Osteomyelitis is distinct from a superficial soft tissue infection and can require prolonged or surgical management. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "systemic_toxicity_sepsis",
    pattern:
      /systemic toxicity|sepsis (concern|criteria)|hypotension with (skin |soft tissue |wound )?infection|tachycardia with (skin |soft tissue |wound )?infection|altered mental status with (skin |soft tissue |wound )?infection|toxic appearing with (skin |wound |soft tissue )?infection/,
    prompt:
      "Document vital sign trends, mental status, and perfusion. Systemic toxicity in the setting of a skin or soft tissue infection raises concern distinct from a localized, non-toxic-appearing infection; sepsis-specific screening and scoring are addressed by dedicated sepsis workflows and are not duplicated here. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "herpetic_whitlow_no_drainage",
    pattern:
      /herpetic whitlow|herpes simplex (of|involving) the finger|vesicular lesions? (on|involving) the finger(tip)?/,
    prompt:
      "Document the vesicular (not fluctuant/purulent) appearance of the lesion. Herpetic whitlow is distinct from a bacterial felon or paronychia — incision and drainage is not indicated for a vesicular herpetic lesion and is never autonomously suggested by this module. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
];

/** Documentation advisory only. Never establishes a diagnosis, starts a treatment, performs I&D, admits, transfers, or requests a consult. */
export function resolveSoftTissueWoundInfectionRedFlags(
  input: SoftTissueWoundInfectionRedFlagInput
): SoftTissueWoundInfectionRedFlagResolution {
  const text = normalize(
    [input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" ")
  );
  const matched = DEFINITIONS.filter((definition) => definition.pattern.test(text));
  return {
    categories: matched.map((definition) => definition.category),
    prompts: matched.map((definition) => definition.prompt),
  };
}

export function softTissueWoundInfectionRedFlagWarnings(
  input: SoftTissueWoundInfectionRedFlagInput
): string[] {
  return resolveSoftTissueWoundInfectionRedFlags(input).prompts;
}

/** Safety gate: true whenever documented findings raise a limb- or life-threatening soft tissue/wound infection concern. */
export function isSoftTissueLimbOrLifeThreateningFlagged(
  input: SoftTissueWoundInfectionRedFlagInput
): boolean {
  const categories = resolveSoftTissueWoundInfectionRedFlags(input).categories;
  return (
    categories.includes("necrotizing_soft_tissue_infection") ||
    categories.includes("gas_gangrene") ||
    categories.includes("fournier_gangrene") ||
    categories.includes("fascial_dehiscence_evisceration") ||
    categories.includes("diabetic_foot_limb_threat") ||
    categories.includes("systemic_toxicity_sepsis") ||
    categories.includes("deep_space_hand_infection") ||
    categories.includes("flexor_tenosynovitis")
  );
}
