/**
 * Tendon injury/rupture clinical intelligence — region/modifier resolution, discharge-family
 * advisory mapping, and disposition recommendations for `tendon_injury_adult_complaint_v1`.
 * Advisory only — never auto-applies orders or disposition.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

export type TendonRegion =
  | "rotator_cuff"
  | "biceps"
  | "triceps"
  | "extensor_hand"
  | "flexor_hand"
  | "finger"
  | "mallet_finger"
  | "achilles"
  | "patellar"
  | "quadriceps"
  | "hamstring"
  | "adductor"
  | "peroneal"
  | "posterior_tibial"
  | "foot_ankle_other"
  | "unspecified";

export type TendonModifier =
  | "partial_tear"
  | "complete_rupture"
  | "laceration"
  | "traumatic"
  | "degenerative"
  | "overuse";

export type TendonDispositionRecommendationId =
  | "discharge"
  | "observation"
  | "admission"
  | "orthopedics"
  | "hand_surgery"
  | "sports_medicine"
  | "transfer";

export type TendonDispositionRecommendation = {
  id: TendonDispositionRecommendationId;
  rationale: string;
};

export type TendonDiagnosisInput = { code?: string; displayName?: string };

export type TendonContext = {
  regions: TendonRegion[];
  modifiers: TendonModifier[];
  dischargeFamilyId: string | null;
  dispositionRecommendations: TendonDispositionRecommendation[];
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

const TENDON_ICD_REGION_RULES: ReadonlyArray<{ prefix: string; regions: TendonRegion[] }> = [
  { prefix: "S46.0", regions: ["rotator_cuff"] },
  { prefix: "S46.1", regions: ["biceps"] },
  { prefix: "S46.2", regions: ["biceps"] },
  { prefix: "S46.3", regions: ["triceps"] },
  { prefix: "S66.1", regions: ["flexor_hand", "finger"] },
  { prefix: "S66.2", regions: ["flexor_hand"] },
  { prefix: "S66.3", regions: ["extensor_hand", "finger", "mallet_finger"] },
  { prefix: "S66.5", regions: ["extensor_hand"] },
  { prefix: "S66", regions: ["finger"] },
  { prefix: "S86.0", regions: ["achilles"] },
  { prefix: "S86.3", regions: ["peroneal", "foot_ankle_other"] },
  { prefix: "S86", regions: ["foot_ankle_other"] },
  { prefix: "S76.1", regions: ["quadriceps"] },
  { prefix: "S76.2", regions: ["hamstring"] },
  { prefix: "S76.0", regions: ["adductor"] },
  { prefix: "S76", regions: ["hamstring"] },
  { prefix: "M66.2", regions: ["extensor_hand"] },
  { prefix: "M66.3", regions: ["flexor_hand"] },
  { prefix: "M75.1", regions: ["rotator_cuff"] },
];

const TENDON_KEYWORD_REGION_RULES: ReadonlyArray<{ keywords: string[]; regions: TendonRegion[] }> = [
  { keywords: ["rotator cuff", "coiffe des rotateurs", "supraspinatus"], regions: ["rotator_cuff"] },
  { keywords: ["biceps tendon", "biceps rupture", "popeye", "tendon du biceps"], regions: ["biceps"] },
  { keywords: ["triceps tendon", "triceps rupture", "tendon du triceps"], regions: ["triceps"] },
  { keywords: ["mallet finger", "doigt en maillet", "extensor lag"], regions: ["mallet_finger", "extensor_hand", "finger"] },
  { keywords: ["extensor tendon", "tendon extenseur"], regions: ["extensor_hand", "finger"] },
  { keywords: ["flexor tendon", "tendon flechisseur", "tendon fléchisseur", "jersey finger"], regions: ["flexor_hand", "finger"] },
  { keywords: ["achilles", "achille", "tendon d'achille", "tendon d achille"], regions: ["achilles"] },
  { keywords: ["patellar tendon", "patellar rupture", "tendon rotulien"], regions: ["patellar"] },
  { keywords: ["quadriceps tendon", "quad tendon", "tendon du quadriceps"], regions: ["quadriceps"] },
  { keywords: ["hamstring tendon", "tendon ischio"], regions: ["hamstring"] },
  { keywords: ["adductor tendon", "groin tendon"], regions: ["adductor"] },
  { keywords: ["peroneal tendon", "fibular tendon"], regions: ["peroneal", "foot_ankle_other"] },
  { keywords: ["posterior tibial", "tibialis posterior"], regions: ["posterior_tibial", "foot_ankle_other"] },
  { keywords: ["tendon rupture", "tendon tear", "tendon injury", "rupture tendineuse", "lesion tendineuse"], regions: ["unspecified"] },
];

const TENDON_KEYWORD_MODIFIER_RULES: ReadonlyArray<{ keywords: string[]; modifier: TendonModifier }> = [
  { keywords: ["partial tear", "partial rupture", "dechirure partielle", "déchirure partielle"], modifier: "partial_tear" },
  { keywords: ["complete rupture", "complete tear", "full thickness", "rupture complete", "rupture complète"], modifier: "complete_rupture" },
  { keywords: ["lacerated tendon", "tendon laceration", "laceration of tendon", "section tendineuse"], modifier: "laceration" },
  { keywords: ["traumatic"], modifier: "traumatic" },
  { keywords: ["degenerative", "attrition", "degeneratif", "dégénératif"], modifier: "degenerative" },
  { keywords: ["overuse", "surmenage", "surmenage"], modifier: "overuse" },
];

function bestIcdRegionMatch(code: string): TendonRegion[] {
  let best: { prefix: string; regions: TendonRegion[] } | null = null;
  for (const rule of TENDON_ICD_REGION_RULES) {
    if (code.startsWith(rule.prefix) && (!best || rule.prefix.length > best.prefix.length)) best = rule;
  }
  return best?.regions ?? [];
}

function keywordRegionMatches(text: string): TendonRegion[] {
  const regions = new Set<TendonRegion>();
  for (const rule of TENDON_KEYWORD_REGION_RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) rule.regions.forEach((r) => regions.add(r));
  }
  return [...regions];
}

function keywordModifierMatches(text: string): TendonModifier[] {
  const modifiers = new Set<TendonModifier>();
  for (const rule of TENDON_KEYWORD_MODIFIER_RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) modifiers.add(rule.modifier);
  }
  return [...modifiers];
}

function dischargeFamilyIdFor(regions: readonly TendonRegion[], modifiers: readonly TendonModifier[]): string | null {
  const has = (r: TendonRegion) => regions.includes(r);
  if (has("achilles")) return "trauma_tendon_achilles";
  if (has("patellar") || has("quadriceps")) return "trauma_tendon_extensor_mechanism";
  if (has("rotator_cuff") || has("biceps") || has("triceps")) return "trauma_tendon_shoulder";
  if (has("mallet_finger") || has("extensor_hand") || has("flexor_hand") || has("finger") || modifiers.includes("laceration")) {
    return "trauma_tendon_hand";
  }
  if (has("hamstring") || has("adductor") || has("peroneal") || has("posterior_tibial") || has("foot_ankle_other") || has("unspecified")) {
    return "trauma_tendon_generic";
  }
  return regions.length > 0 ? "trauma_tendon_generic" : null;
}

function dedupeRecommendations(
  recommendations: readonly TendonDispositionRecommendation[]
): TendonDispositionRecommendation[] {
  const seen = new Set<TendonDispositionRecommendationId>();
  const out: TendonDispositionRecommendation[] = [];
  for (const rec of recommendations) {
    if (seen.has(rec.id)) continue;
    seen.add(rec.id);
    out.push(rec);
  }
  return out;
}

export function computeTendonDispositionRecommendations(
  regions: readonly TendonRegion[],
  modifiers: readonly TendonModifier[]
): TendonDispositionRecommendation[] {
  const has = (r: TendonRegion) => regions.includes(r);
  const hasMod = (m: TendonModifier) => modifiers.includes(m);
  const recs: TendonDispositionRecommendation[] = [];

  if (has("achilles") || has("patellar") || has("quadriceps") || hasMod("complete_rupture") || hasMod("laceration")) {
    recs.push({
      id: "orthopedics",
      rationale:
        "Complete tendon rupture, extensor-mechanism injury, Achilles rupture, or lacerated tendon typically warrants orthopedic evaluation for repair versus protected mobilization.",
    });
    if (has("achilles") || has("patellar") || has("quadriceps")) {
      recs.push({
        id: "observation",
        rationale: "Observation may be appropriate pending imaging confirmation, pain control, and orthopedic availability.",
      });
    }
  }

  if (has("flexor_hand") || has("extensor_hand") || has("mallet_finger") || has("finger") || hasMod("laceration")) {
    recs.push({
      id: "hand_surgery",
      rationale: "Hand flexor/extensor tendon injuries benefit from hand surgery follow-up for splinting protocol and possible repair.",
    });
  }

  if (has("rotator_cuff") || has("biceps") || has("hamstring") || has("adductor")) {
    recs.push({
      id: "sports_medicine",
      rationale: "Sports medicine or orthopedic follow-up is recommended for staged rehab and return-to-activity planning.",
    });
  }

  const dischargeOk =
    !hasMod("laceration") &&
    (hasMod("partial_tear") ||
      has("rotator_cuff") ||
      has("biceps") ||
      has("mallet_finger") ||
      has("hamstring") ||
      has("adductor") ||
      has("peroneal") ||
      has("posterior_tibial") ||
      has("triceps") ||
      has("foot_ankle_other") ||
      has("unspecified") ||
      has("achilles"));

  if (dischargeOk) {
    recs.push({
      id: "discharge",
      rationale:
        "Many isolated tendon injuries with intact neurovascular exam are appropriate for discharge with immobilization, protected weight-bearing, and specialty follow-up.",
    });
    recs.push({
      id: "orthopedics",
      rationale: "Outpatient orthopedic follow-up is recommended to confirm tear extent and guide therapy.",
    });
  }

  if (recs.length === 0) {
    recs.push({
      id: "observation",
      rationale: "Disposition depends on tear completeness, functional deficit, and specialty availability.",
    });
  }

  return dedupeRecommendations(recs);
}

export function resolveTendonContextFromDiagnosis(input: TendonDiagnosisInput): TendonContext {
  const code = normalizeIcdCode(input.code ?? "");
  const text = normalizeText([input.displayName, input.code].filter(Boolean).join(" "));

  const looksLikeTendon =
    /tendon|achilles|rotator cuff|biceps|triceps|mallet|flexor|extensor|quadriceps tendon|patellar tendon|rupture tendineuse|coiffe/.test(
      text
    ) || TENDON_ICD_REGION_RULES.some((r) => code.startsWith(r.prefix));

  // Avoid pure sprain/ligament-only labels without tendon wording when code is S83/S93 sprain chapters.
  const pureLigamentSprain =
    (code.startsWith("S83.4") || code.startsWith("S83.5") || code.startsWith("S93.4") || code.startsWith("S63.5")) &&
    !/tendon|achilles|mallet|flexor|extensor|rotator cuff|biceps|triceps/.test(text);

  const regions = new Set<TendonRegion>();
  if (looksLikeTendon && !pureLigamentSprain) {
    bestIcdRegionMatch(code).forEach((r) => regions.add(r));
    keywordRegionMatches(text).forEach((r) => regions.add(r));
  }
  if (regions.size > 1) regions.delete("unspecified");

  const modifiers = new Set<TendonModifier>();
  keywordModifierMatches(text).forEach((m) => modifiers.add(m));
  if (/rupture|complete/.test(text)) modifiers.add("complete_rupture");
  if (code.startsWith("S66") && /laceration|open/.test(text)) modifiers.add("laceration");

  const regionList = [...regions];
  const modifierList = [...modifiers];
  return {
    regions: regionList,
    modifiers: modifierList,
    dischargeFamilyId: dischargeFamilyIdFor(regionList, modifierList),
    dispositionRecommendations: computeTendonDispositionRecommendations(regionList, modifierList),
  };
}

const REGION_KEY_HINTS: Partial<Record<TendonRegion, string[]>> = {
  rotator_cuff: ["rotator", "coiffe", "shoulder"],
  biceps: ["biceps", "popeye"],
  triceps: ["triceps"],
  extensor_hand: ["extensor"],
  flexor_hand: ["flexor"],
  finger: ["finger"],
  mallet_finger: ["mallet"],
  achilles: ["achilles", "achille"],
  patellar: ["patellar", "rotulien"],
  quadriceps: ["quadriceps", "quad"],
  hamstring: ["hamstring", "ischio"],
  adductor: ["adductor", "groin"],
  peroneal: ["peroneal", "fibular"],
  posterior_tibial: ["tibial", "posterior"],
  foot_ankle_other: ["ankle", "foot"],
  unspecified: ["tendon"],
};

function prioritizeByRegion(keys: string[] | undefined, hints: readonly string[]): string[] | undefined {
  if (!keys || keys.length === 0 || hints.length === 0) return keys;
  return keys
    .map((key, index) => ({ key, index, matches: hints.some((h) => key.toLowerCase().includes(h)) }))
    .sort((a, b) => (a.matches === b.matches ? a.index - b.index : a.matches ? -1 : 1))
    .map((e) => e.key);
}

export function adaptTendonComplaintIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<TendonContext, "regions">
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
