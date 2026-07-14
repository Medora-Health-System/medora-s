/**
 * Sprain / strain clinical intelligence — region/modifier resolution, discharge-family advisory
 * mapping, and disposition-recommendation inputs for the single `sprain_strain_adult_complaint_v1`
 * provider documentation template. Advisory only — never auto-applies orders or disposition.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

export type SprainStrainRegion =
  | "cervical"
  | "thoracic"
  | "lumbar"
  | "shoulder"
  | "rotator_cuff"
  | "elbow"
  | "wrist"
  | "hand"
  | "finger"
  | "thumb"
  | "hip"
  | "groin"
  | "thigh"
  | "hamstring"
  | "quadriceps"
  | "knee"
  | "ankle"
  | "foot"
  | "toe"
  | "chest_wall"
  | "abdominal_wall"
  | "multiple"
  | "unspecified";

export type SprainStrainModifier = "sprain" | "strain" | "ligament" | "high_ankle" | "unstable";

export type SprainStrainDispositionRecommendationId =
  | "discharge"
  | "observation"
  | "admission"
  | "orthopedics"
  | "primary_care"
  | "hand_surgery";

export type SprainStrainDispositionRecommendation = {
  id: SprainStrainDispositionRecommendationId;
  rationale: string;
};

export type SprainStrainDiagnosisInput = {
  code?: string;
  displayName?: string;
};

export type SprainStrainContext = {
  regions: SprainStrainRegion[];
  modifiers: SprainStrainModifier[];
  dischargeFamilyId: string | null;
  dispositionRecommendations: SprainStrainDispositionRecommendation[];
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
 * ICD-10-CM prefix → sprain/strain region map.
 * Avoid claiming pure dislocation prefixes (S43.0, S53.0/1 dislocation, S73.0, S83.0).
 * Longest matching prefix wins.
 */
const SPRAIN_ICD_REGION_RULES: ReadonlyArray<{ prefix: string; regions: SprainStrainRegion[] }> = [
  { prefix: "S13.4", regions: ["cervical"] },
  { prefix: "S13", regions: ["cervical"] },
  { prefix: "S16", regions: ["cervical"] },
  { prefix: "S23.3", regions: ["thoracic"] },
  { prefix: "S23", regions: ["thoracic", "chest_wall"] },
  { prefix: "S29", regions: ["chest_wall"] },
  { prefix: "S33.5", regions: ["lumbar"] },
  { prefix: "S33", regions: ["lumbar"] },
  { prefix: "S39.01", regions: ["lumbar", "abdominal_wall"] },
  { prefix: "S39", regions: ["abdominal_wall", "lumbar"] },
  { prefix: "S43.4", regions: ["shoulder"] },
  { prefix: "S43.5", regions: ["shoulder"] },
  { prefix: "S46", regions: ["rotator_cuff", "shoulder"] },
  { prefix: "S53.4", regions: ["elbow"] },
  { prefix: "S53.3", regions: ["elbow"] },
  { prefix: "S63.5", regions: ["wrist"] },
  { prefix: "S63.6", regions: ["finger", "hand"] },
  { prefix: "S63.3", regions: ["thumb", "hand"] },
  { prefix: "S63.4", regions: ["hand"] },
  { prefix: "S73.1", regions: ["hip"] },
  { prefix: "S76.1", regions: ["quadriceps", "thigh"] },
  { prefix: "S76.2", regions: ["hamstring", "thigh"] },
  { prefix: "S76.3", regions: ["thigh"] },
  { prefix: "S76", regions: ["thigh"] },
  { prefix: "S83.4", regions: ["knee"] },
  { prefix: "S83.5", regions: ["knee"] },
  { prefix: "S83.2", regions: ["knee"] },
  { prefix: "S83.3", regions: ["knee"] },
  { prefix: "S83.6", regions: ["knee"] },
  { prefix: "S93.4", regions: ["ankle"] },
  { prefix: "S93.5", regions: ["toe", "foot"] },
  { prefix: "S93.6", regions: ["foot"] },
];

const SPRAIN_KEYWORD_REGION_RULES: ReadonlyArray<{ keywords: string[]; regions: SprainStrainRegion[] }> = [
  { keywords: ["neck strain", "cervical strain", "whiplash", "entorse cervicale", "entorse du cou"], regions: ["cervical"] },
  { keywords: ["thoracic strain", "mid back strain"], regions: ["thoracic"] },
  { keywords: ["back strain", "lumbar strain", "low back strain", "entorse lombaire", "entorse du dos"], regions: ["lumbar"] },
  { keywords: ["shoulder sprain", "shoulder strain", "ac sprain", "entorse de l'epaule"], regions: ["shoulder"] },
  { keywords: ["rotator cuff", "coiffe des rotateurs"], regions: ["rotator_cuff", "shoulder"] },
  { keywords: ["elbow sprain", "tennis elbow sprain", "entorse du coude"], regions: ["elbow"] },
  { keywords: ["wrist sprain", "entorse du poignet", "entorse poignet"], regions: ["wrist"] },
  { keywords: ["finger sprain", "thumb sprain", "gamekeeper", "entorse du doigt"], regions: ["finger", "hand"] },
  { keywords: ["hip sprain", "groin strain", "adductor strain", "entorse de la hanche", "claquage adducteur"], regions: ["hip", "groin"] },
  { keywords: ["hamstring", "ischio", "claquage ischio"], regions: ["hamstring", "thigh"] },
  { keywords: ["quadriceps", "quad strain", "claquage quadriceps"], regions: ["quadriceps", "thigh"] },
  { keywords: ["thigh strain", "pulled thigh"], regions: ["thigh"] },
  { keywords: ["knee sprain", "acl sprain", "mcl sprain", "ligament sprain", "entorse du genou"], regions: ["knee"] },
  { keywords: ["ankle sprain", "twisted ankle", "entorse de la cheville", "entorse cheville"], regions: ["ankle"] },
  { keywords: ["high ankle sprain", "syndesmosis"], regions: ["ankle"] },
  { keywords: ["foot sprain", "toe sprain", "entorse du pied"], regions: ["foot", "toe"] },
  { keywords: ["chest wall strain", "intercostal strain", "entorse thoracique"], regions: ["chest_wall"] },
  { keywords: ["abdominal wall strain", "abdominal muscle strain"], regions: ["abdominal_wall"] },
  { keywords: ["multiple sites", "multiple sprain"], regions: ["multiple"] },
  { keywords: ["sprain", "strain", "entorse", "elongation", "élongation", "claquage"], regions: ["unspecified"] },
];

const SPRAIN_KEYWORD_MODIFIER_RULES: ReadonlyArray<{ keywords: string[]; modifier: SprainStrainModifier }> = [
  { keywords: ["sprain", "entorse"], modifier: "sprain" },
  { keywords: ["strain", "elongation", "élongation", "claquage", "pulled muscle"], modifier: "strain" },
  { keywords: ["ligament", "acl", "mcl", "lcl", "pcl", "atfl"], modifier: "ligament" },
  { keywords: ["high ankle", "syndesmosis"], modifier: "high_ankle" },
  { keywords: ["unstable", "instability", "giving way", "instabilite"], modifier: "unstable" },
];

function bestIcdRegionMatch(code: string): SprainStrainRegion[] {
  let best: { prefix: string; regions: SprainStrainRegion[] } | null = null;
  for (const rule of SPRAIN_ICD_REGION_RULES) {
    if (code.startsWith(rule.prefix) && (!best || rule.prefix.length > best.prefix.length)) {
      best = rule;
    }
  }
  return best?.regions ?? [];
}

function keywordRegionMatches(text: string): SprainStrainRegion[] {
  const regions = new Set<SprainStrainRegion>();
  for (const rule of SPRAIN_KEYWORD_REGION_RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      rule.regions.forEach((r) => regions.add(r));
    }
  }
  return [...regions];
}

function keywordModifierMatches(text: string): SprainStrainModifier[] {
  const modifiers = new Set<SprainStrainModifier>();
  for (const rule of SPRAIN_KEYWORD_MODIFIER_RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      modifiers.add(rule.modifier);
    }
  }
  return [...modifiers];
}

function dischargeFamilyIdFor(regions: readonly SprainStrainRegion[]): string | null {
  const has = (r: SprainStrainRegion) => regions.includes(r);
  if (has("ankle")) return "trauma_sprain_ankle";
  if (has("wrist")) return "trauma_sprain_wrist";
  if (has("knee")) return "trauma_sprain_knee";
  if (has("shoulder") || has("rotator_cuff")) return "trauma_sprain_shoulder";
  if (has("cervical")) return "trauma_strain_neck";
  if (has("lumbar") || has("thoracic")) return "trauma_strain_back";
  if (
    has("hand") ||
    has("finger") ||
    has("thumb") ||
    has("elbow") ||
    has("hip") ||
    has("groin") ||
    has("thigh") ||
    has("hamstring") ||
    has("quadriceps") ||
    has("foot") ||
    has("toe") ||
    has("chest_wall") ||
    has("abdominal_wall") ||
    has("multiple") ||
    has("unspecified")
  ) {
    return "trauma_sprain_generic";
  }
  return null;
}

function dedupeRecommendations(
  recommendations: readonly SprainStrainDispositionRecommendation[]
): SprainStrainDispositionRecommendation[] {
  const seen = new Set<SprainStrainDispositionRecommendationId>();
  const out: SprainStrainDispositionRecommendation[] = [];
  for (const rec of recommendations) {
    if (seen.has(rec.id)) continue;
    seen.add(rec.id);
    out.push(rec);
  }
  return out;
}

export function computeSprainStrainDispositionRecommendations(
  regions: readonly SprainStrainRegion[],
  modifiers: readonly SprainStrainModifier[]
): SprainStrainDispositionRecommendation[] {
  const has = (r: SprainStrainRegion) => regions.includes(r);
  const hasMod = (m: SprainStrainModifier) => modifiers.includes(m);
  const recs: SprainStrainDispositionRecommendation[] = [];

  if (hasMod("unstable") || (has("knee") && hasMod("ligament"))) {
    recs.push({
      id: "orthopedics",
      rationale: "Unstable joint or significant ligament injury warrants prompt orthopedic follow-up for bracing and further imaging.",
    });
    recs.push({
      id: "observation",
      rationale: "Observation may be appropriate if pain control, weight-bearing, or neurovascular status remains uncertain.",
    });
  }

  if (has("cervical") || has("lumbar") || has("thoracic")) {
    recs.push({
      id: "discharge",
      rationale:
        "Isolated neck or back strain without neurologic red flags is often appropriate for discharge with activity limits and primary-care follow-up.",
    });
    recs.push({
      id: "primary_care",
      rationale: "Primary-care follow-up is recommended for symptom progression and return-to-activity guidance.",
    });
  }

  if (has("hand") || has("finger") || has("thumb")) {
    recs.push({
      id: "hand_surgery",
      rationale: "Hand or thumb sprains with instability or suspected ligament rupture benefit from hand surgery follow-up.",
    });
  }

  const simpleExtremity =
    has("ankle") ||
    has("wrist") ||
    has("shoulder") ||
    has("elbow") ||
    has("foot") ||
    has("toe") ||
    has("hip") ||
    has("groin") ||
    has("thigh") ||
    has("hamstring") ||
    has("quadriceps") ||
    has("rotator_cuff") ||
    (has("knee") && !hasMod("unstable"));

  if (simpleExtremity) {
    recs.push({
      id: "discharge",
      rationale:
        "An isolated sprain or strain with intact neurovascular exam and adequate pain control is often appropriate for discharge with RICE, bracing, and outpatient follow-up.",
    });
    recs.push({
      id: "orthopedics",
      rationale: "Orthopedic or sports-medicine follow-up is recommended if pain, instability, or functional limitation persists.",
    });
  }

  if (recs.length === 0) {
    recs.push({
      id: "discharge",
      rationale: "Most uncomplicated sprains and strains are managed with outpatient care, activity modification, and return precautions.",
    });
    recs.push({
      id: "primary_care",
      rationale: "Primary-care follow-up is recommended if symptoms do not improve as expected.",
    });
  }

  return dedupeRecommendations(recs);
}

export function resolveSprainStrainContextFromDiagnosis(input: SprainStrainDiagnosisInput): SprainStrainContext {
  const code = normalizeIcdCode(input.code ?? "");
  const text = normalizeText([input.displayName, input.code].filter(Boolean).join(" "));

  // Avoid claiming pure dislocation codes that belong to the dislocation engine.
  const pureDislocationPrefixes = ["S43.0", "S43.1", "S43.2", "S53.0", "S53.1", "S73.0", "S83.0", "S03.0"];
  const isPureDislocationCode = pureDislocationPrefixes.some((p) => code.startsWith(p));
  const textIsDislocationOnly =
    /disloc|sublux|luxation|nursemaid|poignet de bonne/.test(text) && !/sprain|strain|entorse|elongation|claquage|ligament/.test(text);

  // Prefer dedicated tendon / ligament engines for specific tear/rupture families.
  const pureTendonPrefixes = ["S46.0", "S46.1", "S46.2", "S46.3", "S66.1", "S66.2", "S66.3", "S66.5", "S86.0", "M66.2", "M66.3", "M75.1"];
  const isPureTendonCode = pureTendonPrefixes.some((p) => code.startsWith(p));
  const textIsTendonOnly =
    /tendon|achilles|achille|rotator cuff tear|biceps rupture|triceps rupture|mallet finger|quadriceps tendon|patellar tendon|rupture tendineuse/.test(
      text
    ) && !/sprain|entorse|strain|elongation|claquage/.test(text);

  const pureLigamentPrefixes = ["S83.51", "S83.52", "S83.41", "S83.42", "S93.43", "S63.64", "S63.51", "S13.1"];
  const isPureLigamentCode = pureLigamentPrefixes.some((p) => code.startsWith(p));
  const textIsLigamentTearOnly =
    /\b(acl|pcl|mcl|lcl|ucl|syndesmosis|scapholunate|gamekeeper|skier.?s? thumb|ligament tear|dechirure ligamentaire)\b/.test(
      text
    ) && !/sprain|entorse|strain|elongation|claquage|tendon/.test(text);

  const regions = new Set<SprainStrainRegion>();
  if (
    !isPureDislocationCode &&
    !textIsDislocationOnly &&
    !isPureTendonCode &&
    !textIsTendonOnly &&
    !isPureLigamentCode &&
    !textIsLigamentTearOnly
  ) {
    bestIcdRegionMatch(code).forEach((r) => regions.add(r));
    keywordRegionMatches(text).forEach((r) => regions.add(r));
  }

  // Drop unspecified if a more specific region is present.
  if (regions.size > 1) regions.delete("unspecified");

  const modifiers = new Set<SprainStrainModifier>();
  keywordModifierMatches(text).forEach((m) => modifiers.add(m));
  if (code.startsWith("S93.4") || code.startsWith("S63.5") || code.startsWith("S83.4") || code.startsWith("S83.5")) {
    modifiers.add("sprain");
  }
  if (code.startsWith("S16") || code.startsWith("S39.01") || code.startsWith("S46") || code.startsWith("S76")) {
    modifiers.add("strain");
  }

  const regionList = [...regions];
  const modifierList = [...modifiers];

  return {
    regions: regionList,
    modifiers: modifierList,
    dischargeFamilyId: dischargeFamilyIdFor(regionList),
    dispositionRecommendations: computeSprainStrainDispositionRecommendations(regionList, modifierList),
  };
}

const REGION_KEY_HINTS: Partial<Record<SprainStrainRegion, string[]>> = {
  cervical: ["cervical", "neck", "whiplash"],
  thoracic: ["thoracic", "midback"],
  lumbar: ["lumbar", "back", "lowback"],
  shoulder: ["shoulder"],
  rotator_cuff: ["rotator", "coiffe"],
  elbow: ["elbow"],
  wrist: ["wrist"],
  hand: ["hand"],
  finger: ["finger"],
  thumb: ["thumb"],
  hip: ["hip"],
  groin: ["groin", "adductor"],
  thigh: ["thigh"],
  hamstring: ["hamstring", "ischio"],
  quadriceps: ["quadriceps", "quad"],
  knee: ["knee", "acl", "mcl", "ligament"],
  ankle: ["ankle"],
  foot: ["foot"],
  toe: ["toe"],
  chest_wall: ["chest", "intercostal", "rib"],
  abdominal_wall: ["abdominal", "abdomen"],
  multiple: ["multiple"],
  unspecified: ["unspecified"],
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

export function adaptSprainStrainComplaintIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<SprainStrainContext, "regions">
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
