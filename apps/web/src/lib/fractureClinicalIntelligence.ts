/**
 * Fracture clinical intelligence — region/modifier resolution, discharge-family advisory
 * mapping, and disposition-recommendation inputs for the single `fracture_adult_complaint_v1`
 * provider documentation template. Advisory only — never auto-applies orders or disposition.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

export type FractureRegion =
  | "skull"
  | "facial"
  | "orbital"
  | "nasal"
  | "mandible"
  | "cervical_spine"
  | "thoracic_spine"
  | "lumbar_spine"
  | "spinal"
  | "rib"
  | "sternum"
  | "pelvis"
  | "hip"
  | "shoulder_girdle"
  | "upper_extremity"
  | "forearm"
  | "wrist"
  | "hand"
  | "finger"
  | "femur"
  | "lower_extremity"
  | "tibia_fibula"
  | "ankle"
  | "foot"
  | "toe";

export type FractureModifier = "open" | "closed" | "pathologic" | "stress" | "compression" | "pediatric";

export type FractureDispositionRecommendationId =
  | "discharge"
  | "observation"
  | "admission"
  | "transfer"
  | "trauma"
  | "orthopedics"
  | "hand_surgery"
  | "neurosurgery"
  | "maxillofacial";

export type FractureDispositionRecommendation = {
  id: FractureDispositionRecommendationId;
  /** Plain-English clinical rationale — advisory only, never auto-applied. */
  rationale: string;
};

export type FractureDiagnosisInput = {
  code?: string;
  displayName?: string;
};

export type FractureContext = {
  regions: FractureRegion[];
  modifiers: FractureModifier[];
  /** Advisory pointer into providerDischargeConditionFamiliesPhase1 fracture families; never auto-applied. */
  dischargeFamilyId: string | null;
  dispositionRecommendations: FractureDispositionRecommendation[];
};

function normalizeIcdCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s/g, "");
}

function normalizeText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * ICD-10-CM prefix → body-region map (fracture chapters only).
 * S02 skull/face/orbit/nasal/mandible, S12 cervical, S22 thoracic/ribs/sternum,
 * S32 lumbar/sacrum/pelvis, S42 shoulder girdle, S52 forearm, S62 hand/wrist/fingers,
 * S72 femur/hip, S82 tibia/fibula/ankle, S92 foot, M84 pathologic/stress.
 * Longest matching prefix wins (most specific sub-region beats the broader chapter).
 */
const FRACTURE_ICD_REGION_RULES: ReadonlyArray<{ prefix: string; regions: FractureRegion[] }> = [
  { prefix: "S02.0", regions: ["skull"] },
  { prefix: "S02.1", regions: ["skull"] },
  { prefix: "S02.2", regions: ["nasal", "facial"] },
  { prefix: "S02.3", regions: ["orbital", "facial"] },
  { prefix: "S02.4", regions: ["facial"] },
  { prefix: "S02.6", regions: ["mandible", "facial"] },
  { prefix: "S02", regions: ["facial"] },
  { prefix: "S12", regions: ["cervical_spine", "spinal"] },
  { prefix: "S22.0", regions: ["thoracic_spine", "spinal"] },
  { prefix: "S22.1", regions: ["thoracic_spine", "spinal"] },
  { prefix: "S22.2", regions: ["sternum"] },
  { prefix: "S22.3", regions: ["rib"] },
  { prefix: "S22.4", regions: ["rib"] },
  { prefix: "S22.5", regions: ["rib"] },
  { prefix: "S22", regions: ["rib"] },
  { prefix: "S32.0", regions: ["lumbar_spine", "spinal"] },
  { prefix: "S32", regions: ["pelvis"] },
  { prefix: "S42", regions: ["shoulder_girdle", "upper_extremity"] },
  { prefix: "S52", regions: ["forearm", "upper_extremity"] },
  { prefix: "S62.0", regions: ["wrist", "hand"] },
  { prefix: "S62.1", regions: ["wrist", "hand"] },
  { prefix: "S62.2", regions: ["wrist", "hand"] },
  { prefix: "S62.3", regions: ["hand"] },
  { prefix: "S62.4", regions: ["hand"] },
  { prefix: "S62.5", regions: ["hand"] },
  { prefix: "S62.6", regions: ["finger", "hand"] },
  { prefix: "S62.9", regions: ["hand"] },
  { prefix: "S62", regions: ["hand", "wrist", "finger"] },
  { prefix: "S72.0", regions: ["hip"] },
  { prefix: "S72.1", regions: ["hip"] },
  { prefix: "S72.2", regions: ["hip"] },
  { prefix: "S72", regions: ["femur", "lower_extremity"] },
  { prefix: "S82.5", regions: ["ankle", "lower_extremity"] },
  { prefix: "S82.6", regions: ["ankle", "lower_extremity"] },
  { prefix: "S82", regions: ["tibia_fibula", "lower_extremity"] },
  { prefix: "S92.4", regions: ["toe", "foot"] },
  { prefix: "S92.5", regions: ["toe", "foot"] },
  { prefix: "S92", regions: ["foot", "lower_extremity"] },
];

/** Free-text keyword → body-region hints (additive; used with or without an ICD code). */
const FRACTURE_KEYWORD_REGION_RULES: ReadonlyArray<{ keywords: string[]; regions: FractureRegion[] }> = [
  { keywords: ["clavicle", "collarbone", "collar bone"], regions: ["shoulder_girdle", "upper_extremity"] },
  { keywords: ["scapula", "shoulder blade"], regions: ["shoulder_girdle", "upper_extremity"] },
  { keywords: ["shoulder"], regions: ["shoulder_girdle", "upper_extremity"] },
  { keywords: ["humerus", "upper arm"], regions: ["upper_extremity"] },
  { keywords: ["elbow"], regions: ["upper_extremity"] },
  { keywords: ["distal radius"], regions: ["forearm", "wrist", "upper_extremity"] },
  { keywords: ["forearm", "radius", "ulna"], regions: ["forearm", "upper_extremity"] },
  { keywords: ["broken arm", "arm fracture"], regions: ["upper_extremity"] },
  { keywords: ["wrist", "scaphoid", "carpal"], regions: ["wrist", "hand"] },
  { keywords: ["broken wrist"], regions: ["wrist", "hand"] },
  { keywords: ["hand", "metacarpal"], regions: ["hand"] },
  { keywords: ["finger", "phalanx", "phalange"], regions: ["finger", "hand"] },
  { keywords: ["broken finger"], regions: ["finger", "hand"] },
  { keywords: ["hip", "femoral neck", "broken hip"], regions: ["hip"] },
  { keywords: ["femur", "thigh"], regions: ["femur", "lower_extremity"] },
  { keywords: ["pelvis", "pelvic"], regions: ["pelvis"] },
  { keywords: ["knee", "patella"], regions: ["lower_extremity"] },
  { keywords: ["tibia", "fibula", "lower leg", "shin", "broken leg", "leg fracture"], regions: ["tibia_fibula", "lower_extremity"] },
  { keywords: ["ankle", "broken ankle"], regions: ["ankle", "lower_extremity"] },
  { keywords: ["foot", "metatarsal"], regions: ["foot", "lower_extremity"] },
  { keywords: ["toe", "broken toe"], regions: ["toe", "foot", "lower_extremity"] },
  { keywords: ["rib", "ribs"], regions: ["rib"] },
  { keywords: ["sternum", "breastbone"], regions: ["sternum"] },
  { keywords: ["skull", "cranial"], regions: ["skull"] },
  { keywords: ["orbital", "orbit", "eye socket"], regions: ["orbital", "facial"] },
  { keywords: ["nasal", "nose", "broken nose"], regions: ["nasal", "facial"] },
  { keywords: ["mandible", "jaw", "broken jaw"], regions: ["mandible", "facial"] },
  { keywords: ["maxilla", "zygoma", "cheekbone"], regions: ["facial"] },
  { keywords: ["cervical spine", "cervical vertebra", "neck fracture"], regions: ["cervical_spine", "spinal"] },
  { keywords: ["thoracic spine", "thoracic vertebra"], regions: ["thoracic_spine", "spinal"] },
  { keywords: ["lumbar spine", "lumbar vertebra", "lumbar compression"], regions: ["lumbar_spine", "spinal"] },
  { keywords: ["spine", "spinal", "vertebra", "vertebral"], regions: ["spinal"] },
];

const FRACTURE_KEYWORD_MODIFIER_RULES: ReadonlyArray<{ keywords: string[]; modifier: FractureModifier }> = [
  { keywords: ["open fracture", "compound fracture", "fracture ouverte"], modifier: "open" },
  { keywords: ["closed fracture", "fracture fermee"], modifier: "closed" },
  { keywords: ["pathologic fracture", "pathological fracture"], modifier: "pathologic" },
  { keywords: ["stress fracture"], modifier: "stress" },
  { keywords: ["compression fracture"], modifier: "compression" },
  { keywords: ["greenstick", "buckle fracture", "torus fracture", "pediatric fracture"], modifier: "pediatric" },
];

/** Detects the ICD-10-CM 7th-character open (B/C)/closed (A) convention when present. */
function detectOpenClosedFromCode(code: string): FractureModifier | null {
  const compact = code.replace(/\./g, "");
  if (compact.length < 6) return null;
  const last = compact.slice(-1);
  if (last === "A") return "closed";
  if (last === "B" || last === "C") return "open";
  return null;
}

function bestIcdRegionMatch(code: string): FractureRegion[] {
  let best: { prefix: string; regions: FractureRegion[] } | null = null;
  for (const rule of FRACTURE_ICD_REGION_RULES) {
    if (code.startsWith(rule.prefix) && (!best || rule.prefix.length > best.prefix.length)) {
      best = rule;
    }
  }
  return best?.regions ?? [];
}

function keywordRegionMatches(text: string): FractureRegion[] {
  const regions = new Set<FractureRegion>();
  for (const rule of FRACTURE_KEYWORD_REGION_RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      rule.regions.forEach((r) => regions.add(r));
    }
  }
  return [...regions];
}

function keywordModifierMatches(text: string): FractureModifier[] {
  const modifiers = new Set<FractureModifier>();
  for (const rule of FRACTURE_KEYWORD_MODIFIER_RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      modifiers.add(rule.modifier);
    }
  }
  return [...modifiers];
}

function dischargeFamilyIdFor(regions: readonly FractureRegion[], modifiers: readonly FractureModifier[]): string | null {
  const has = (r: FractureRegion) => regions.includes(r);
  if (modifiers.includes("open")) return "trauma_fracture_open";
  if (has("hip")) return "trauma_fracture_hip";
  if (has("facial") || has("orbital") || has("nasal") || has("mandible") || has("skull")) return "trauma_fracture_facial";
  if (has("spinal") || has("cervical_spine") || has("thoracic_spine") || has("lumbar_spine")) return "trauma_fracture_spinal";
  if (has("rib") || has("sternum")) return "trauma_fracture_rib";
  if (has("hand") || has("finger") || has("wrist")) return "trauma_fracture_hand";
  if (has("upper_extremity") || has("forearm") || has("shoulder_girdle")) return "trauma_fracture_upper_extremity";
  if (has("lower_extremity") || has("femur") || has("tibia_fibula") || has("ankle") || has("foot") || has("toe") || has("pelvis")) {
    return "trauma_fracture_lower_extremity";
  }
  return null;
}

function dedupeRecommendations(
  recommendations: readonly FractureDispositionRecommendation[]
): FractureDispositionRecommendation[] {
  const seen = new Set<FractureDispositionRecommendationId>();
  const out: FractureDispositionRecommendation[] = [];
  for (const rec of recommendations) {
    if (seen.has(rec.id)) continue;
    seen.add(rec.id);
    out.push(rec);
  }
  return out;
}

/**
 * Advisory disposition recommendations only — never auto-applied to the chart or orders.
 * Mirrors clinical judgment prompts; the clinician always makes the final disposition call.
 */
export function computeFractureDispositionRecommendations(
  regions: readonly FractureRegion[],
  modifiers: readonly FractureModifier[]
): FractureDispositionRecommendation[] {
  const has = (r: FractureRegion) => regions.includes(r);
  const hasMod = (m: FractureModifier) => modifiers.includes(m);
  const recs: FractureDispositionRecommendation[] = [];

  const hasSpinal = has("spinal") || has("cervical_spine") || has("thoracic_spine") || has("lumbar_spine");
  const hasFacial = has("facial") || has("orbital") || has("nasal") || has("mandible") || has("skull");
  const hasHandRegion = has("hand") || has("finger") || has("wrist");
  const hasUpperExtremity = has("upper_extremity") || has("forearm") || has("shoulder_girdle");
  const hasLowerExtremity =
    has("lower_extremity") || has("femur") || has("tibia_fibula") || has("ankle") || has("foot") || has("toe");

  if (hasMod("open")) {
    recs.push({
      id: "admission",
      rationale:
        "Open fractures typically require urgent operative debridement and intravenous antibiotics; admission is usually indicated.",
    });
    recs.push({
      id: "orthopedics",
      rationale: "Orthopedic surgery evaluation is recommended for operative fixation and wound management.",
    });
    recs.push({
      id: "transfer",
      rationale: "Consider transfer to a facility with orthopedic or trauma surgery coverage if not available on site.",
    });
  }

  if (has("hip")) {
    recs.push({
      id: "admission",
      rationale: "Hip fractures typically require admission for surgical fixation and perioperative medical management.",
    });
    recs.push({
      id: "orthopedics",
      rationale: "Orthopedic surgery consultation is recommended for operative planning.",
    });
  }

  if (hasSpinal) {
    recs.push({
      id: "neurosurgery",
      rationale:
        "Spinal fracture with any concern for cord or nerve root involvement (weakness, numbness, bowel or bladder dysfunction) warrants neurosurgery or spine surgery evaluation.",
    });
    recs.push({
      id: "trauma",
      rationale: "Trauma team involvement is recommended to assess for associated injuries and spinal stability.",
    });
  }

  if (hasFacial) {
    recs.push({
      id: "maxillofacial",
      rationale:
        "Facial and orbital fractures benefit from maxillofacial or facial trauma surgery evaluation, particularly with malocclusion, diplopia, vision change, or entrapment concern.",
    });
  }

  if (hasHandRegion && !hasMod("open")) {
    recs.push({
      id: "hand_surgery",
      rationale:
        "Hand and wrist fractures with displacement, articular involvement, or tendon concern benefit from hand surgery follow-up.",
    });
  }

  if (hasMod("pathologic")) {
    recs.push({
      id: "admission",
      rationale:
        "Pathologic fracture raises concern for underlying bone disease or malignancy and often warrants admission for further work-up.",
    });
    recs.push({
      id: "orthopedics",
      rationale: "Orthopedic oncology or orthopedic surgery input is recommended for pathologic fracture management.",
    });
  }

  const isolatedSimpleClosed =
    !hasMod("open") &&
    !hasMod("pathologic") &&
    !has("hip") &&
    !hasSpinal &&
    !hasFacial &&
    (hasUpperExtremity || hasLowerExtremity || hasHandRegion);

  if (isolatedSimpleClosed) {
    recs.push({
      id: "discharge",
      rationale:
        "An isolated closed extremity fracture with an intact neurovascular exam and adequate pain control is often appropriate for discharge with splinting and orthopedic follow-up.",
    });
    recs.push({
      id: "orthopedics",
      rationale: "Outpatient orthopedic follow-up is recommended for definitive management and repeat imaging as needed.",
    });
  }

  if (recs.length === 0) {
    recs.push({
      id: "observation",
      rationale:
        "Disposition depends on clinical findings, imaging results, and neurovascular status; observation may be reasonable pending further evaluation.",
    });
  }

  return dedupeRecommendations(recs);
}

/**
 * Resolves fracture body region(s), clinical modifiers, an advisory discharge-family id, and
 * advisory disposition recommendations from an ICD-10-CM code and/or free-text diagnosis label.
 * Advisory only — never auto-applies orders, discharge templates, or disposition.
 */
export function resolveFractureContextFromDiagnosis(input: FractureDiagnosisInput): FractureContext {
  const code = normalizeIcdCode(input.code ?? "");
  const text = normalizeText([input.displayName, input.code].filter(Boolean).join(" "));

  const regions = new Set<FractureRegion>();
  bestIcdRegionMatch(code).forEach((r) => regions.add(r));
  keywordRegionMatches(text).forEach((r) => regions.add(r));

  const modifiers = new Set<FractureModifier>();
  if (code.startsWith("M84.3")) {
    modifiers.add("stress");
  } else if (code.startsWith("M84")) {
    modifiers.add("pathologic");
  }
  const codeModifier = detectOpenClosedFromCode(code);
  if (codeModifier) modifiers.add(codeModifier);
  keywordModifierMatches(text).forEach((m) => modifiers.add(m));

  const regionList = [...regions];
  const modifierList = [...modifiers];

  return {
    regions: regionList,
    modifiers: modifierList,
    dischargeFamilyId: dischargeFamilyIdFor(regionList, modifierList),
    dispositionRecommendations: computeFractureDispositionRecommendations(regionList, modifierList),
  };
}

/** Lowercase substrings used to detect region-emphasis chips by i18n key name. */
const REGION_KEY_HINTS: Partial<Record<FractureRegion, string[]>> = {
  skull: ["skull"],
  facial: ["facial", "maxilla", "malar", "zygoma", "midface"],
  orbital: ["orbital", "orbit"],
  nasal: ["nasal", "nose"],
  mandible: ["mandible", "jaw"],
  cervical_spine: ["cervical"],
  thoracic_spine: ["thoracic"],
  lumbar_spine: ["lumbar"],
  spinal: ["spine", "spinal", "vertebra", "saddle", "bowelbladder", "cauda"],
  rib: ["rib"],
  sternum: ["sternum"],
  pelvis: ["pelvis", "pelvic"],
  hip: ["hip"],
  shoulder_girdle: ["shoulder", "clavicle", "scapula"],
  upper_extremity: ["upperextremity", "forearm", "humerus", "elbow", "upperarm"],
  forearm: ["forearm", "distalradius", "radius"],
  wrist: ["wrist", "distalradius", "median", "carpal", "scaphoid"],
  hand: ["hand", "metacarpal"],
  finger: ["finger", "phalanx"],
  femur: ["femur"],
  lower_extremity: ["lowerextremity", "tibia", "fibula", "ankle", "foot", "leg"],
  tibia_fibula: ["tibia", "fibula", "shin"],
  ankle: ["ankle"],
  foot: ["foot", "metatarsal"],
  toe: ["toe"],
};

function keyMatchesAnyHint(key: string, hints: readonly string[]): boolean {
  const normalized = key.toLowerCase();
  return hints.some((hint) => normalized.includes(hint));
}

function prioritizeByRegion(keys: string[] | undefined, hints: readonly string[]): string[] | undefined {
  if (!keys || keys.length === 0 || hints.length === 0) return keys;
  return keys
    .map((key, index) => ({ key, index, matches: keyMatchesAnyHint(key, hints) }))
    .sort((a, b) => {
      if (a.matches === b.matches) return a.index - b.index;
      return a.matches ? -1 : 1;
    })
    .map((entry) => entry.key);
}

/**
 * Reorders HPI, physical-exam, and plan chips so that region-matching entries render first.
 * Never removes or rewrites chip text — display ordering only.
 */
export function adaptFractureComplaintIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<FractureContext, "regions">
): ProviderDocumentationComplaintIntelligence {
  const hints = context.regions.flatMap((region) => REGION_KEY_HINTS[region] ?? []);
  if (hints.length === 0) return intel;

  const nextPhysicalExam = intel.physicalExam
    ? (Object.fromEntries(
        Object.entries(intel.physicalExam).map(([section, keys]) => [section, prioritizeByRegion(keys, hints) ?? []])
      ) as ProviderDocumentationComplaintIntelligence["physicalExam"])
    : intel.physicalExam;

  return {
    ...intel,
    hpi: prioritizeByRegion(intel.hpi, hints),
    physicalExam: nextPhysicalExam,
    mdmPlanSummary: prioritizeByRegion(intel.mdmPlanSummary, hints),
  };
}
