/**
 * Ligament injury/tear clinical intelligence — region/modifier resolution, discharge-family
 * advisory mapping, and disposition recommendations for `ligament_injury_adult_complaint_v1`.
 * Advisory only — never auto-applies orders or disposition.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

export type LigamentRegion =
  | "acl"
  | "pcl"
  | "mcl"
  | "lcl"
  | "knee_combined"
  | "ankle_lateral"
  | "syndesmosis"
  | "deltoid"
  | "thumb_ucl"
  | "finger_collateral"
  | "wrist"
  | "scapholunate"
  | "elbow_collateral"
  | "ac_shoulder"
  | "cervical"
  | "lumbar"
  | "pelvic"
  | "unspecified";

export type LigamentModifier = "partial_tear" | "complete_tear" | "unstable" | "traumatic" | "degenerative";

export type LigamentDispositionRecommendationId =
  | "discharge"
  | "observation"
  | "admission"
  | "orthopedics"
  | "hand_surgery"
  | "sports_medicine";

export type LigamentDispositionRecommendation = {
  id: LigamentDispositionRecommendationId;
  rationale: string;
};

export type LigamentDiagnosisInput = { code?: string; displayName?: string };

export type LigamentContext = {
  regions: LigamentRegion[];
  modifiers: LigamentModifier[];
  dischargeFamilyId: string | null;
  dispositionRecommendations: LigamentDispositionRecommendation[];
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

const LIGAMENT_ICD_REGION_RULES: ReadonlyArray<{ prefix: string; regions: LigamentRegion[] }> = [
  { prefix: "S83.51", regions: ["acl"] },
  { prefix: "S83.52", regions: ["pcl"] },
  { prefix: "S83.41", regions: ["mcl"] },
  { prefix: "S83.42", regions: ["lcl"] },
  { prefix: "S83.4", regions: ["mcl"] },
  { prefix: "S83.5", regions: ["acl"] },
  { prefix: "S93.43", regions: ["syndesmosis"] },
  { prefix: "S93.42", regions: ["deltoid"] },
  { prefix: "S93.41", regions: ["ankle_lateral"] },
  { prefix: "S93.4", regions: ["ankle_lateral"] },
  { prefix: "S63.64", regions: ["thumb_ucl"] },
  { prefix: "S63.61", regions: ["finger_collateral"] },
  { prefix: "S63.62", regions: ["finger_collateral"] },
  { prefix: "S63.3", regions: ["finger_collateral"] },
  { prefix: "S63.51", regions: ["scapholunate", "wrist"] },
  { prefix: "S63.5", regions: ["wrist"] },
  { prefix: "S53.4", regions: ["elbow_collateral"] },
  { prefix: "S43.4", regions: ["ac_shoulder"] },
  { prefix: "S13.1", regions: ["cervical"] },
  { prefix: "S33.5", regions: ["lumbar"] },
  { prefix: "S33.4", regions: ["pelvic"] },
];

const LIGAMENT_KEYWORD_REGION_RULES: ReadonlyArray<{ keywords: string[]; regions: LigamentRegion[] }> = [
  { keywords: ["acl", "anterior cruciate", "croise anterieur", "croisé antérieur"], regions: ["acl"] },
  { keywords: ["pcl", "posterior cruciate", "croise posterieur", "croisé postérieur"], regions: ["pcl"] },
  { keywords: ["mcl", "medial collateral", "collateral medial", "collateral médial"], regions: ["mcl"] },
  { keywords: ["lcl", "lateral collateral", "collateral lateral", "collateral latéral"], regions: ["lcl"] },
  { keywords: ["multi ligament", "combined knee ligament", "knee dislocation ligament"], regions: ["knee_combined"] },
  { keywords: ["high ankle", "syndesmosis", "tibiofibular ligament"], regions: ["syndesmosis"] },
  { keywords: ["deltoid ligament"], regions: ["deltoid"] },
  { keywords: ["ankle sprain", "lateral ankle ligament", "atfl", "entorse cheville"], regions: ["ankle_lateral"] },
  { keywords: ["ucl", "skier", "gamekeeper", "thumb collateral", "pouce du skieur"], regions: ["thumb_ucl"] },
  { keywords: ["finger collateral", "collateral ligament finger"], regions: ["finger_collateral"] },
  { keywords: ["scapholunate", "sl ligament"], regions: ["scapholunate", "wrist"] },
  { keywords: ["lunotriquetral", "wrist ligament"], regions: ["wrist"] },
  { keywords: ["elbow collateral", "ucl elbow", "rcl elbow"], regions: ["elbow_collateral"] },
  { keywords: ["ac ligament", "acromioclavicular ligament", "ac sprain"], regions: ["ac_shoulder"] },
  { keywords: ["cervical ligament", "neck ligament"], regions: ["cervical"] },
  { keywords: ["lumbar ligament", "back ligament"], regions: ["lumbar"] },
  { keywords: ["pelvic ligament", "sacroiliac ligament"], regions: ["pelvic"] },
  { keywords: ["ligament tear", "ligament injury", "ligament rupture", "lesion ligamentaire", "lésion ligamentaire"], regions: ["unspecified"] },
];

const LIGAMENT_KEYWORD_MODIFIER_RULES: ReadonlyArray<{ keywords: string[]; modifier: LigamentModifier }> = [
  { keywords: ["partial tear", "grade 1", "grade 2", "dechirure partielle", "déchirure partielle"], modifier: "partial_tear" },
  { keywords: ["complete tear", "complete rupture", "grade 3", "rupture complete", "rupture complète"], modifier: "complete_tear" },
  { keywords: ["unstable", "instability", "giving way", "instabilite", "instabilité"], modifier: "unstable" },
  { keywords: ["traumatic"], modifier: "traumatic" },
  { keywords: ["degenerative", "chronic", "degeneratif", "dégénératif"], modifier: "degenerative" },
];

function bestIcdRegionMatch(code: string): LigamentRegion[] {
  let best: { prefix: string; regions: LigamentRegion[] } | null = null;
  for (const rule of LIGAMENT_ICD_REGION_RULES) {
    if (code.startsWith(rule.prefix) && (!best || rule.prefix.length > best.prefix.length)) best = rule;
  }
  return best?.regions ?? [];
}

function keywordRegionMatches(text: string): LigamentRegion[] {
  const regions = new Set<LigamentRegion>();
  for (const rule of LIGAMENT_KEYWORD_REGION_RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) rule.regions.forEach((r) => regions.add(r));
  }
  return [...regions];
}

function keywordModifierMatches(text: string): LigamentModifier[] {
  const modifiers = new Set<LigamentModifier>();
  for (const rule of LIGAMENT_KEYWORD_MODIFIER_RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) modifiers.add(rule.modifier);
  }
  return [...modifiers];
}

function dischargeFamilyIdFor(regions: readonly LigamentRegion[]): string | null {
  const has = (r: LigamentRegion) => regions.includes(r);
  if (has("acl") || has("pcl") || has("mcl") || has("lcl") || has("knee_combined")) return "trauma_ligament_knee";
  if (has("syndesmosis") || has("deltoid") || has("ankle_lateral")) return "trauma_ligament_ankle";
  if (has("thumb_ucl") || has("finger_collateral")) return "trauma_ligament_hand";
  if (has("scapholunate") || has("wrist") || has("elbow_collateral")) return "trauma_ligament_upper_extremity";
  if (has("ac_shoulder")) return "trauma_ligament_shoulder";
  if (has("cervical") || has("lumbar") || has("pelvic") || has("unspecified")) return "trauma_ligament_generic";
  return regions.length > 0 ? "trauma_ligament_generic" : null;
}

function dedupeRecommendations(
  recommendations: readonly LigamentDispositionRecommendation[]
): LigamentDispositionRecommendation[] {
  const seen = new Set<LigamentDispositionRecommendationId>();
  const out: LigamentDispositionRecommendation[] = [];
  for (const rec of recommendations) {
    if (seen.has(rec.id)) continue;
    seen.add(rec.id);
    out.push(rec);
  }
  return out;
}

export function computeLigamentDispositionRecommendations(
  regions: readonly LigamentRegion[],
  modifiers: readonly LigamentModifier[]
): LigamentDispositionRecommendation[] {
  const has = (r: LigamentRegion) => regions.includes(r);
  const hasMod = (m: LigamentModifier) => modifiers.includes(m);
  const recs: LigamentDispositionRecommendation[] = [];

  if (has("acl") || has("pcl") || has("knee_combined") || (hasMod("complete_tear") && (has("mcl") || has("lcl")))) {
    recs.push({
      id: "orthopedics",
      rationale: "Significant knee ligament injury warrants prompt orthopedic or sports-medicine follow-up for bracing and operative planning if indicated.",
    });
    if (hasMod("unstable") || has("knee_combined")) {
      recs.push({
        id: "observation",
        rationale: "Observation may be reasonable if weight-bearing, swelling control, or neurovascular status remains uncertain.",
      });
    }
  }

  if (has("syndesmosis")) {
    recs.push({
      id: "orthopedics",
      rationale: "High-ankle/syndesmotic injury often needs orthopedic follow-up and protected weight-bearing.",
    });
  }

  if (has("thumb_ucl") || has("finger_collateral") || has("scapholunate")) {
    recs.push({
      id: "hand_surgery",
      rationale: "Thumb UCL, finger collateral, or scapholunate injuries benefit from hand surgery follow-up for stability assessment.",
    });
  }

  const dischargeOk =
    has("ankle_lateral") ||
    has("mcl") ||
    has("ac_shoulder") ||
    has("wrist") ||
    has("elbow_collateral") ||
    has("deltoid") ||
    has("finger_collateral") ||
    has("thumb_ucl") ||
    has("acl") ||
    has("cervical") ||
    has("lumbar") ||
    has("unspecified") ||
    has("pelvic");

  if (dischargeOk) {
    recs.push({
      id: "discharge",
      rationale:
        "Isolated ligament injuries with intact neurovascular exam are often appropriate for discharge with bracing, RICE, and specialty follow-up.",
    });
    recs.push({
      id: "sports_medicine",
      rationale: "Sports medicine or orthopedic follow-up is recommended for rehab progression and return-to-play clearance.",
    });
  }

  if (recs.length === 0) {
    recs.push({
      id: "discharge",
      rationale: "Most ligament sprains/tears are managed outpatient with immobilization and follow-up.",
    });
    recs.push({
      id: "orthopedics",
      rationale: "Orthopedic follow-up is recommended if instability or functional limitation persists.",
    });
  }

  return dedupeRecommendations(recs);
}

export function resolveLigamentContextFromDiagnosis(input: LigamentDiagnosisInput): LigamentContext {
  const code = normalizeIcdCode(input.code ?? "");
  const text = normalizeText([input.displayName, input.code].filter(Boolean).join(" "));

  const looksLikeLigament =
    /ligament|acl|pcl|mcl|lcl|ucl|syndesmosis|scapholunate|gamekeeper|skier|collateral|croise|croisé/.test(text) ||
    LIGAMENT_ICD_REGION_RULES.some((r) => code.startsWith(r.prefix));

  // Avoid pure tendon-rupture labels without ligament wording.
  const tendonOnly =
    /tendon|achilles|rotator cuff tear|biceps rupture|mallet finger|quadriceps tendon|patellar tendon/.test(text) &&
    !/ligament|acl|pcl|mcl|lcl|ucl|syndesmosis|collateral/.test(text);

  const regions = new Set<LigamentRegion>();
  if (looksLikeLigament && !tendonOnly) {
    bestIcdRegionMatch(code).forEach((r) => regions.add(r));
    keywordRegionMatches(text).forEach((r) => regions.add(r));
  }
  if (regions.size > 1) regions.delete("unspecified");

  const modifiers = new Set<LigamentModifier>();
  keywordModifierMatches(text).forEach((m) => modifiers.add(m));

  const regionList = [...regions];
  const modifierList = [...modifiers];
  return {
    regions: regionList,
    modifiers: modifierList,
    dischargeFamilyId: dischargeFamilyIdFor(regionList),
    dispositionRecommendations: computeLigamentDispositionRecommendations(regionList, modifierList),
  };
}

const REGION_KEY_HINTS: Partial<Record<LigamentRegion, string[]>> = {
  acl: ["acl", "anterior", "cruciate"],
  pcl: ["pcl", "posterior"],
  mcl: ["mcl", "medial"],
  lcl: ["lcl", "lateral"],
  knee_combined: ["knee", "combined"],
  ankle_lateral: ["ankle", "atfl", "lateral"],
  syndesmosis: ["syndesmosis", "highankle"],
  deltoid: ["deltoid"],
  thumb_ucl: ["thumb", "ucl", "skier", "gamekeeper"],
  finger_collateral: ["finger", "collateral"],
  wrist: ["wrist"],
  scapholunate: ["scapholunate"],
  elbow_collateral: ["elbow"],
  ac_shoulder: ["acromioclavicular", "shoulder", "ac"],
  cervical: ["cervical", "neck"],
  lumbar: ["lumbar", "back"],
  pelvic: ["pelvic", "pelvis"],
  unspecified: ["ligament"],
};

function prioritizeByRegion(keys: string[] | undefined, hints: readonly string[]): string[] | undefined {
  if (!keys || keys.length === 0 || hints.length === 0) return keys;
  return keys
    .map((key, index) => ({ key, index, matches: hints.some((h) => key.toLowerCase().includes(h)) }))
    .sort((a, b) => (a.matches === b.matches ? a.index - b.index : a.matches ? -1 : 1))
    .map((e) => e.key);
}

export function adaptLigamentComplaintIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<LigamentContext, "regions">
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
