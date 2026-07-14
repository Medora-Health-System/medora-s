/**
 * Dislocation clinical intelligence — region/modifier resolution, discharge-family advisory
 * mapping, and disposition-recommendation inputs for the single `dislocation_adult_complaint_v1`
 * provider documentation template. Advisory only — never auto-applies orders or disposition.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

export type DislocationRegion =
  | "jaw_tmj"
  | "shoulder"
  | "acromioclavicular"
  | "sternoclavicular"
  | "elbow"
  | "radial_head"
  | "wrist"
  | "hand"
  | "finger"
  | "thumb"
  | "hip"
  | "patella"
  | "knee"
  | "ankle"
  | "foot"
  | "toe";

export type DislocationModifier =
  | "reduced"
  | "unreduced"
  | "recurrent"
  | "fracture_dislocation"
  | "prosthetic"
  | "pediatric_nursemaid";

export type DislocationDispositionRecommendationId =
  | "discharge"
  | "observation"
  | "admission"
  | "transfer"
  | "orthopedics"
  | "hand_surgery"
  | "maxillofacial";

export type DislocationDispositionRecommendation = {
  id: DislocationDispositionRecommendationId;
  /** Plain-English clinical rationale — advisory only, never auto-applied. */
  rationale: string;
};

export type DislocationDiagnosisInput = {
  code?: string;
  displayName?: string;
};

export type DislocationContext = {
  regions: DislocationRegion[];
  modifiers: DislocationModifier[];
  dischargeFamilyId: string | null;
  dispositionRecommendations: DislocationDispositionRecommendation[];
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
 * ICD-10-CM prefix → joint-region map (dislocation chapters).
 * Longest matching prefix wins.
 */
const DISLOCATION_ICD_REGION_RULES: ReadonlyArray<{ prefix: string; regions: DislocationRegion[] }> = [
  { prefix: "S03.0", regions: ["jaw_tmj"] },
  { prefix: "S43.0", regions: ["shoulder"] },
  { prefix: "S43.1", regions: ["acromioclavicular"] },
  { prefix: "S43.2", regions: ["sternoclavicular"] },
  { prefix: "S53.0", regions: ["radial_head", "elbow"] },
  { prefix: "S53.1", regions: ["elbow"] },
  { prefix: "S53", regions: ["elbow"] },
  { prefix: "S63.0", regions: ["wrist"] },
  { prefix: "S63.1", regions: ["finger", "hand"] },
  { prefix: "S63.2", regions: ["thumb", "hand"] },
  { prefix: "S63", regions: ["hand", "wrist", "finger"] },
  { prefix: "S73.0", regions: ["hip"] },
  { prefix: "S73", regions: ["hip"] },
  { prefix: "S83.0", regions: ["patella", "knee"] },
  { prefix: "S83.1", regions: ["knee"] },
  { prefix: "S83", regions: ["knee"] },
  { prefix: "S93.0", regions: ["ankle"] },
  { prefix: "S93.1", regions: ["toe", "foot"] },
  { prefix: "S93.3", regions: ["foot"] },
  { prefix: "S93", regions: ["ankle", "foot"] },
];

const DISLOCATION_KEYWORD_REGION_RULES: ReadonlyArray<{ keywords: string[]; regions: DislocationRegion[] }> = [
  { keywords: ["jaw dislocation", "tmj dislocation", "mandible dislocation", "dislocated jaw", "luxation de la machoire"], regions: ["jaw_tmj"] },
  { keywords: ["shoulder dislocation", "dislocated shoulder", "glenohumeral", "luxation de l'epaule", "luxation epaule"], regions: ["shoulder"] },
  { keywords: ["acromioclavicular", "ac separation", "ac joint", "separated shoulder"], regions: ["acromioclavicular"] },
  { keywords: ["sternoclavicular", "sc joint"], regions: ["sternoclavicular"] },
  { keywords: ["nursemaid", "pulled elbow", "radial head subluxation", "poignet de bonne"], regions: ["radial_head", "elbow"] },
  { keywords: ["elbow dislocation", "dislocated elbow", "luxation du coude"], regions: ["elbow"] },
  { keywords: ["wrist dislocation", "carpal dislocation", "lunate dislocation", "luxation du poignet"], regions: ["wrist"] },
  { keywords: ["finger dislocation", "dislocated finger", "phalanx dislocation", "luxation du doigt"], regions: ["finger", "hand"] },
  { keywords: ["thumb dislocation", "dislocated thumb", "gamekeeper"], regions: ["thumb", "hand"] },
  { keywords: ["hip dislocation", "dislocated hip", "luxation de la hanche"], regions: ["hip"] },
  { keywords: ["patella dislocation", "dislocated kneecap", "patellar dislocation", "luxation de la rotule"], regions: ["patella", "knee"] },
  { keywords: ["knee dislocation", "tibiofemoral dislocation", "luxation du genou"], regions: ["knee"] },
  { keywords: ["ankle dislocation", "dislocated ankle", "luxation de la cheville"], regions: ["ankle"] },
  { keywords: ["toe dislocation", "dislocated toe", "luxation de l'orteil"], regions: ["toe", "foot"] },
  { keywords: ["foot dislocation", "midfoot dislocation", "lisfranc"], regions: ["foot"] },
];

const DISLOCATION_KEYWORD_MODIFIER_RULES: ReadonlyArray<{ keywords: string[]; modifier: DislocationModifier }> = [
  { keywords: ["reduced", "successfully reduced", "reduction performed", "reduction reussie"], modifier: "reduced" },
  { keywords: ["unreduced", "irreducible", "unable to reduce", "not reduced", "non reduite"], modifier: "unreduced" },
  { keywords: ["recurrent dislocation", "recurrent", "habitual dislocation", "luxation recidivante"], modifier: "recurrent" },
  { keywords: ["fracture-dislocation", "fracture dislocation", "fracture-luxation", "fracture luxation"], modifier: "fracture_dislocation" },
  { keywords: ["prosthetic", "prosthesis dislocation", "periprosthetic dislocation", "dislocated prosthesis"], modifier: "prosthetic" },
  { keywords: ["nursemaid", "pulled elbow", "radial head subluxation", "poignet de bonne"], modifier: "pediatric_nursemaid" },
];

function bestIcdRegionMatch(code: string): DislocationRegion[] {
  let best: { prefix: string; regions: DislocationRegion[] } | null = null;
  for (const rule of DISLOCATION_ICD_REGION_RULES) {
    if (code.startsWith(rule.prefix) && (!best || rule.prefix.length > best.prefix.length)) {
      best = rule;
    }
  }
  return best?.regions ?? [];
}

function keywordRegionMatches(text: string): DislocationRegion[] {
  const regions = new Set<DislocationRegion>();
  for (const rule of DISLOCATION_KEYWORD_REGION_RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      rule.regions.forEach((r) => regions.add(r));
    }
  }
  return [...regions];
}

function keywordModifierMatches(text: string): DislocationModifier[] {
  const modifiers = new Set<DislocationModifier>();
  for (const rule of DISLOCATION_KEYWORD_MODIFIER_RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      modifiers.add(rule.modifier);
    }
  }
  return [...modifiers];
}

function dischargeFamilyIdFor(
  regions: readonly DislocationRegion[],
  modifiers: readonly DislocationModifier[]
): string | null {
  const has = (r: DislocationRegion) => regions.includes(r);
  if (has("hip") || modifiers.includes("prosthetic")) return "trauma_dislocation_hip";
  if (has("jaw_tmj")) return "trauma_dislocation_jaw";
  if (has("shoulder") || has("acromioclavicular") || has("sternoclavicular")) return "trauma_dislocation_shoulder";
  if (has("elbow") || has("radial_head") || modifiers.includes("pediatric_nursemaid")) return "trauma_dislocation_elbow";
  if (has("patella") || has("knee")) return "trauma_dislocation_patella";
  if (has("hand") || has("finger") || has("thumb") || has("wrist")) return "trauma_dislocation_hand";
  if (has("ankle") || has("foot") || has("toe")) return "trauma_dislocation_generic";
  if (regions.length > 0) return "trauma_dislocation_generic";
  return null;
}

function dedupeRecommendations(
  recommendations: readonly DislocationDispositionRecommendation[]
): DislocationDispositionRecommendation[] {
  const seen = new Set<DislocationDispositionRecommendationId>();
  const out: DislocationDispositionRecommendation[] = [];
  for (const rec of recommendations) {
    if (seen.has(rec.id)) continue;
    seen.add(rec.id);
    out.push(rec);
  }
  return out;
}

/**
 * Advisory disposition recommendations only — never auto-applied to the chart or orders.
 */
export function computeDislocationDispositionRecommendations(
  regions: readonly DislocationRegion[],
  modifiers: readonly DislocationModifier[]
): DislocationDispositionRecommendation[] {
  const has = (r: DislocationRegion) => regions.includes(r);
  const hasMod = (m: DislocationModifier) => modifiers.includes(m);
  const recs: DislocationDispositionRecommendation[] = [];

  if (has("hip") || hasMod("prosthetic") || hasMod("unreduced") || hasMod("fracture_dislocation")) {
    recs.push({
      id: "admission",
      rationale:
        "Hip, prosthetic, irreducible, or fracture-dislocations often require urgent orthopedic management and may need admission.",
    });
    recs.push({
      id: "orthopedics",
      rationale: "Orthopedic surgery consultation is recommended for reduction planning and definitive care.",
    });
    if (hasMod("unreduced") || has("hip")) {
      recs.push({
        id: "transfer",
        rationale: "Consider transfer if on-site orthopedic coverage for complex reduction is unavailable.",
      });
    }
  }

  if (has("jaw_tmj")) {
    recs.push({
      id: "maxillofacial",
      rationale: "TMJ or mandible dislocation benefits from maxillofacial or ENT evaluation, especially with recurrent or irreducible dislocation.",
    });
  }

  if ((has("hand") || has("finger") || has("thumb") || has("wrist")) && !hasMod("unreduced")) {
    recs.push({
      id: "hand_surgery",
      rationale: "Hand, finger, thumb, or wrist dislocations with residual instability or tendon concern benefit from hand surgery follow-up.",
    });
  }

  if (has("knee") && !has("patella")) {
    recs.push({
      id: "admission",
      rationale: "True tibiofemoral knee dislocation is a limb-threatening injury; admission and urgent vascular/orthopedic evaluation are usually indicated.",
    });
    recs.push({
      id: "orthopedics",
      rationale: "Orthopedic and vascular assessment is recommended after knee dislocation.",
    });
  }

  const simpleReducedExtremity =
    !hasMod("unreduced") &&
    !hasMod("fracture_dislocation") &&
    !hasMod("prosthetic") &&
    !has("hip") &&
    !(has("knee") && !has("patella")) &&
    (has("shoulder") ||
      has("elbow") ||
      has("radial_head") ||
      has("patella") ||
      has("ankle") ||
      has("hand") ||
      has("finger") ||
      has("thumb") ||
      has("wrist") ||
      has("acromioclavicular") ||
      hasMod("pediatric_nursemaid") ||
      hasMod("reduced"));

  if (simpleReducedExtremity || hasMod("pediatric_nursemaid")) {
    recs.push({
      id: "discharge",
      rationale:
        "A successfully reduced isolated joint dislocation with intact neurovascular exam is often appropriate for discharge with immobilization and orthopedic follow-up.",
    });
    recs.push({
      id: "orthopedics",
      rationale: "Outpatient orthopedic follow-up is recommended for repeat exam and activity progression.",
    });
  }

  if (recs.length === 0) {
    recs.push({
      id: "observation",
      rationale:
        "Disposition depends on reduction success, neurovascular status, and associated injuries; observation may be reasonable pending further evaluation.",
    });
  }

  return dedupeRecommendations(recs);
}

export function resolveDislocationContextFromDiagnosis(input: DislocationDiagnosisInput): DislocationContext {
  const code = normalizeIcdCode(input.code ?? "");
  const text = normalizeText([input.displayName, input.code].filter(Boolean).join(" "));

  // Do not claim pure fracture codes (S* fracture chapters without dislocation wording).
  const looksLikeDislocation =
    /disloc|sublux|luxation|nursemaid|poignet de bonne|pulled elbow/.test(text) ||
    DISLOCATION_ICD_REGION_RULES.some((r) => code.startsWith(r.prefix));

  const regions = new Set<DislocationRegion>();
  if (looksLikeDislocation) {
    bestIcdRegionMatch(code).forEach((r) => regions.add(r));
    keywordRegionMatches(text).forEach((r) => regions.add(r));
  }

  const modifiers = new Set<DislocationModifier>();
  if (code.startsWith("S53.0")) modifiers.add("pediatric_nursemaid");
  keywordModifierMatches(text).forEach((m) => modifiers.add(m));

  const regionList = [...regions];
  const modifierList = [...modifiers];

  return {
    regions: regionList,
    modifiers: modifierList,
    dischargeFamilyId: dischargeFamilyIdFor(regionList, modifierList),
    dispositionRecommendations: computeDislocationDispositionRecommendations(regionList, modifierList),
  };
}

const REGION_KEY_HINTS: Partial<Record<DislocationRegion, string[]>> = {
  jaw_tmj: ["jaw", "tmj", "mandible", "malocclusion"],
  shoulder: ["shoulder", "glenohumeral"],
  acromioclavicular: ["acromioclavicular", "acjoint", "separated"],
  sternoclavicular: ["sternoclavicular"],
  elbow: ["elbow"],
  radial_head: ["radial", "nursemaid", "pulledelbow"],
  wrist: ["wrist", "carpal", "lunate"],
  hand: ["hand"],
  finger: ["finger", "phalanx"],
  thumb: ["thumb"],
  hip: ["hip"],
  patella: ["patella", "kneecap"],
  knee: ["knee", "tibiofemoral"],
  ankle: ["ankle"],
  foot: ["foot", "lisfranc", "midfoot"],
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

/** Reorders chips by region — display ordering only; never rewrites chip text. */
export function adaptDislocationComplaintIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<DislocationContext, "regions">
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
