import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

export type BurnRegion = "face" | "eye" | "hand" | "foot" | "trunk" | "upper_limb" | "lower_limb" | "respiratory" | "internal" | "genital" | "multiple" | "unspecified" | "frostbite_site";
export type BurnMechanism = "flame" | "scald" | "steam" | "contact" | "grease" | "chemical_acid" | "chemical_alkali" | "chemical_unknown" | "electrical_low" | "electrical_high" | "lightning" | "radiation" | "sun" | "smoke_inhalation" | "hot_gas_inhalation" | "frostbite" | "other" | "unknown";
export type BurnDepth = "superficial" | "superficial_partial" | "deep_partial" | "full_thickness" | "fourth_degree" | "mixed" | "indeterminate" | "not_applicable_inhalation";
export type BurnDispositionRecommendationId = "discharge" | "observation" | "admission" | "transfer" | "burn_center" | "trauma" | "plastics" | "ophthalmology" | "hand_surgery" | "ent" | "pulmonology" | "critical_care" | "toxicology" | "pediatrics";
export type BurnDispositionRecommendation = { id: BurnDispositionRecommendationId; rationale: string };
export type BurnDiagnosisInput = { code?: string; displayName?: string };
export type BurnContext = { regions: BurnRegion[]; mechanisms: BurnMechanism[]; depth: BurnDepth; dischargeFamilyId: string | null; dispositionRecommendations: BurnDispositionRecommendation[] };

const norm = (s = "") => s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const has = (text: string, pattern: RegExp) => pattern.test(text);

function regionsFor(code: string, text: string): BurnRegion[] {
  const regions: BurnRegion[] = [];
  if (code.startsWith("T26") || has(text, /\beye|ocular|corne|oeil/)) regions.push("eye");
  if (code.startsWith("T27") || has(text, /inhalation|respiratory|smoke|fumee|hot gas|gaz chaud|airway|voies? aeriennes?/)) regions.push("respiratory");
  if (code.startsWith("T23") || has(text, /\bhand|finger|main|doigt/)) regions.push("hand");
  if (code.startsWith("T25") || has(text, /\bfoot|toe|pied|orteil/)) regions.push("foot");
  if (code.startsWith("T20") || has(text, /\bface|facial|visage/)) regions.push("face");
  if (code.startsWith("T21") || has(text, /\btrunk|chest|abdomen|back|thorax|tronc|dos/)) regions.push("trunk");
  if (code.startsWith("T22") || has(text, /upper limb|upper extremity|arm|forearm|bras|avant-bras/)) regions.push("upper_limb");
  if (code.startsWith("T24") || has(text, /lower limb|lower extremity|leg|thigh|jambe|cuisse/)) regions.push("lower_limb");
  if (code.startsWith("T28")) regions.push("internal");
  if (code.startsWith("T33") || code.startsWith("T34") || code.startsWith("T35") || has(text, /frostbite|gelure/)) regions.push("frostbite_site");
  if (has(text, /genital|perine|scrot|vulv/)) regions.push("genital");
  if (code.startsWith("T30") || code.startsWith("T31") || code.startsWith("T32")) regions.push("unspecified");
  if (has(text, /multiple|plusieurs/)) regions.push("multiple");
  return [...new Set(regions)];
}

function mechanismsFor(code: string, text: string): BurnMechanism[] {
  const mechanisms: BurnMechanism[] = [];
  if (code.startsWith("L55") || has(text, /sunburn|coup de soleil/)) mechanisms.push("sun");
  // FY2026: T75.0 = effects of lightning; T75.4 = electrocution.
  if (code.startsWith("T75.0") || has(text, /lightning|foudre/)) mechanisms.push("lightning");
  else if (code.startsWith("T75.4") || has(text, /electric|electrocution|electriqu/)) {
    mechanisms.push(has(text, /high voltage|haute tension/) ? "electrical_high" : "electrical_low");
  }
  if (has(text, /corrosion|acid|acide/)) mechanisms.push("chemical_acid");
  else if (has(text, /alkali|alcal/)) mechanisms.push("chemical_alkali");
  else if (
    has(text, /chemical|chimique/) ||
    /^T2[0-8]\.[4-7]/.test(code) ||
    /^T2[0-8][4-7]/.test(code.replace(/\./g, "")) ||
    code.startsWith("T32")
  ) {
    mechanisms.push("chemical_unknown");
  }
  if (has(text, /smoke|fumee/)) mechanisms.push("smoke_inhalation");
  if (has(text, /hot gas|gaz chaud/)) mechanisms.push("hot_gas_inhalation");
  if (has(text, /frostbite|gelure/)) mechanisms.push("frostbite");
  if (has(text, /flame|fire|flamme|incendie/)) mechanisms.push("flame");
  if (has(text, /scald|liquid hot|eau bouillante|ebouillant/)) mechanisms.push("scald");
  if (has(text, /steam|vapeur/)) mechanisms.push("steam");
  if (has(text, /grease|oil|huile|graisse/)) mechanisms.push("grease");
  if (has(text, /contact/)) mechanisms.push("contact");
  if (has(text, /radiation|rayonn/)) mechanisms.push("radiation");
  return [...new Set<BurnMechanism>(mechanisms.length ? mechanisms : ["unknown"])];
}

function depthFor(text: string, respiratory: boolean): BurnDepth {
  if (respiratory) return "not_applicable_inhalation";
  if (has(text, /fourth degree|quatrieme degre/)) return "fourth_degree";
  if (has(text, /full thickness|third degree|troisieme degre/)) return "full_thickness";
  if (has(text, /deep partial|second degree deep|deuxieme degre profond/)) return "deep_partial";
  if (has(text, /superficial partial|partial thickness|second degree|deuxieme degre/)) return "superficial_partial";
  if (has(text, /superficial|first degree|premier degre/)) return "superficial";
  return "indeterminate";
}

function family(regions: BurnRegion[], mechanisms: BurnMechanism[], depth: BurnDepth): string | null {
  if (!regions.length && mechanisms[0] === "unknown") return null;
  if (regions.includes("frostbite_site") || mechanisms.includes("frostbite")) return "trauma_burn_frostbite";
  if (regions.includes("respiratory")) return "trauma_burn_inhalation";
  if (regions.includes("eye")) return "trauma_burn_eye";
  if (mechanisms.some((m) => m.startsWith("chemical"))) return "trauma_burn_chemical";
  if (mechanisms.some((m) => m.startsWith("electrical") || m === "lightning")) return "trauma_burn_electrical";
  if (mechanisms.includes("sun")) return "trauma_burn_sunburn";
  if (regions.includes("face")) return "trauma_burn_face";
  if (regions.includes("hand")) return "trauma_burn_hand";
  if (regions.includes("foot")) return "trauma_burn_foot";
  if (depth === "full_thickness" || depth === "fourth_degree") return "trauma_burn_full_thickness";
  if (depth === "superficial") return "trauma_burn_superficial";
  if (depth === "superficial_partial" || depth === "deep_partial") return "trauma_burn_partial_thickness";
  return "trauma_burn_generic";
}

export function computeBurnDispositionRecommendations(regions: readonly BurnRegion[], mechanisms: readonly BurnMechanism[], depth: BurnDepth, description = ""): BurnDispositionRecommendation[] {
  const text = norm(description);
  const inhalation = regions.includes("respiratory");
  const eye = regions.includes("eye");
  const chemical = mechanisms.some((m) => m.startsWith("chemical"));
  const electrical = mechanisms.some((m) => m === "electrical_high" || m === "lightning");
  const highRisk = inhalation || depth === "full_thickness" || depth === "fourth_degree" || electrical || (chemical && eye) || regions.includes("genital") || has(text, /circumferential|circulaire|tbsa.*(?:significant|important)|large surface|grande surface/);
  const recs: BurnDispositionRecommendation[] = [];
  if (highRisk) {
    recs.push({ id: "transfer", rationale: "High-risk burn features warrant transfer-capable evaluation; this is advisory and requires clinician judgment." }, { id: "burn_center", rationale: "Burn-center consultation is appropriate for high-risk burn features." });
    if (inhalation) recs.push({ id: "critical_care", rationale: "Inhalation injury requires close airway and respiratory monitoring." }, { id: "pulmonology", rationale: "Respiratory specialty input may support inhalation injury management." }, { id: "ent", rationale: "ENT assessment may be needed when upper-airway injury is suspected." });
    if (eye) recs.push({ id: "ophthalmology", rationale: "Ocular burn requires urgent eye-specialist assessment." });
    if (chemical) recs.push({ id: "toxicology", rationale: "Chemical exposure may require poison/toxicology support." });
    if (regions.includes("hand")) recs.push({ id: "hand_surgery", rationale: "Hand burns may need early hand-specialist assessment." });
    if (depth === "full_thickness" || depth === "fourth_degree") recs.push({ id: "plastics", rationale: "Full-thickness burns may require reconstructive assessment." });
  } else if (depth === "superficial_partial" || depth === "deep_partial" || regions.includes("face") || regions.includes("hand") || regions.includes("foot")) {
    recs.push({ id: "observation", rationale: "Observation or admission should be considered for depth, function, pain, and wound reassessment." }, { id: "admission", rationale: "Admission may be appropriate when wound care, pain control, or serial reassessment cannot be safely arranged." });
  } else {
    recs.push({ id: "discharge", rationale: "A small superficial burn with reassuring examination may be discharged with wound care and strict return precautions." });
  }
  return [...new Map(recs.map((r) => [r.id, r])).values()];
}

export function resolveBurnContextFromDiagnosis(input: BurnDiagnosisInput): BurnContext {
  const code = (input.code ?? "").replace(/\s/g, "").toUpperCase();
  const text = norm(`${input.displayName ?? ""} ${input.code ?? ""}`);
  const regions = regionsFor(code, text);
  const mechanisms = mechanismsFor(code, text);
  const depth = code.startsWith("L55") ? "superficial" : depthFor(text, regions.includes("respiratory"));
  return { regions, mechanisms, depth, dischargeFamilyId: family(regions, mechanisms, depth), dispositionRecommendations: computeBurnDispositionRecommendations(regions, mechanisms, depth, text) };
}

export function adaptBurnComplaintIntel(intel: ProviderDocumentationComplaintIntelligence, context: Pick<BurnContext, "regions" | "mechanisms" | "depth">): ProviderDocumentationComplaintIntelligence {
  const hints = [...context.regions, ...context.mechanisms, context.depth].map((value) => value.replace(/_/g, " "));
  const sort = (keys?: string[]) => keys?.slice().sort((a, b) => Number(hints.some((hint) => b.toLowerCase().includes(hint))) - Number(hints.some((hint) => a.toLowerCase().includes(hint))));
  return { ...intel, hpi: sort(intel.hpi), mdmPlanSummary: sort(intel.mdmPlanSummary) };
}
