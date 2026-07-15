import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

export type PenetratingTraumaRegion = "head" | "face" | "eye" | "neck" | "chest" | "abdomen" | "pelvis" | "genitalia" | "upper_extremity" | "hand" | "lower_extremity" | "foot" | "multiple" | "unspecified";
export type PenetratingTraumaMechanism = "gunshot_single" | "gunshot_multiple" | "shotgun" | "pellet_bb" | "stab_knife" | "stab_other" | "impalement" | "industrial" | "accidental_puncture" | "glass" | "nail_metal" | "unknown_projectile" | "other" | "unknown";
export type PenetratingTraumaWoundFlag = "entry" | "exit" | "through_and_through" | "retained_projectile" | "active_bleeding" | "tourniquet" | "impaled_object_in_place";
export type PenetratingTraumaDispositionRecommendationId = "discharge" | "observation" | "admission" | "transfer" | "trauma" | "vascular" | "cardiothoracic" | "neurosurgery" | "ophthalmology" | "orthopedics" | "hand_surgery" | "plastics" | "ent" | "critical_care" | "urology" | "gynecology" | "interventional_radiology";
export type PenetratingTraumaDispositionRecommendation = { id: PenetratingTraumaDispositionRecommendationId; rationale: string };
export type PenetratingTraumaDiagnosisInput = { code?: string; displayName?: string };
export type PenetratingTraumaContext = { regions: PenetratingTraumaRegion[]; mechanisms: PenetratingTraumaMechanism[]; woundFlags: PenetratingTraumaWoundFlag[]; dischargeFamilyId: string | null; dispositionRecommendations: PenetratingTraumaDispositionRecommendation[] };

const norm = (value = "") => value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const has = (text: string, pattern: RegExp) => pattern.test(text);

function regionsFor(code: string, text: string): PenetratingTraumaRegion[] {
  const regions: PenetratingTraumaRegion[] = [];
  if (code.startsWith("S05") || has(text, /\beye|ocular|oeil/)) regions.push("eye");
  if (code.startsWith("S11") || has(text, /\bneck|cou\b/)) regions.push("neck");
  if (code.startsWith("S21") || has(text, /\bthorax|chest|poitrine/)) regions.push("chest");
  if (code.startsWith("S31") || has(text, /\babdomen|abdominal|flank|abdomen/)) regions.push("abdomen");
  if (code.startsWith("S01") || has(text, /\bhead|scalp|tete|cuir chevelu/)) regions.push("head");
  if (has(text, /\bface|facial|visage/)) regions.push("face");
  if (has(text, /\bpelvis|pelvic|bassin/)) regions.push("pelvis");
  if (has(text, /genital|penis|scrot|vulv/)) regions.push("genitalia");
  if (code.startsWith("S41") || code.startsWith("S51") || has(text, /upper extremity|upper limb|arm|forearm|bras|avant-bras/)) regions.push("upper_extremity");
  if (code.startsWith("S61") || has(text, /\bhand|finger|main|doigt/)) regions.push("hand");
  if (code.startsWith("S71") || code.startsWith("S81") || has(text, /lower extremity|lower limb|leg|thigh|jambe|cuisse/)) regions.push("lower_extremity");
  if (code.startsWith("S91") || has(text, /\bfoot|toe|pied|orteil/)) regions.push("foot");
  if (has(text, /\bmultiple|multiple gunshot|several gunshot|plusieurs/)) regions.push("multiple");
  if (!regions.length && code) regions.push("unspecified");
  return [...new Set(regions)];
}

function mechanismsFor(text: string): PenetratingTraumaMechanism[] {
  const mechanisms: PenetratingTraumaMechanism[] = [];
  if (has(text, /shotgun/)) mechanisms.push("shotgun");
  else if (has(text, /pellet|bb\b/)) mechanisms.push("pellet_bb");
  else if (has(text, /multiple gunshot|multiple gsw|several gunshot|multiple balle/)) mechanisms.push("gunshot_multiple");
  else if (has(text, /gunshot|firearm|bullet|gsw|arme a feu|balle/)) mechanisms.push("gunshot_single");
  if (has(text, /\bknife|couteau/)) mechanisms.push("stab_knife");
  else if (has(text, /\bstab|stabbing|arme blanche|poignard/)) mechanisms.push("stab_other");
  if (has(text, /impale|empal/)) mechanisms.push("impalement");
  if (has(text, /industrial/)) mechanisms.push("industrial");
  if (has(text, /\bglass|verre/)) mechanisms.push("glass");
  if (has(text, /\bnail|metal|clou|metal/)) mechanisms.push("nail_metal");
  if (has(text, /\bpuncture|ponction|piqure/)) mechanisms.push("accidental_puncture");
  if (has(text, /projectile/) && !mechanisms.length) mechanisms.push("unknown_projectile");
  return [...new Set<PenetratingTraumaMechanism>(mechanisms.length ? mechanisms : ["unknown"])];
}

function flagsFor(text: string): PenetratingTraumaWoundFlag[] {
  const flags: PenetratingTraumaWoundFlag[] = [];
  if (has(text, /\bentry|entree/)) flags.push("entry");
  if (has(text, /\bexit|sortie/)) flags.push("exit");
  if (has(text, /through.and.through|transfix|traversant/)) flags.push("through_and_through");
  if (has(text, /retained.*(?:projectile|bullet)|(?:projectile|bullet).*retained|balle retenue|projectile retenu/)) flags.push("retained_projectile");
  if (has(text, /active bleeding|hemorrhag|saignement actif/)) flags.push("active_bleeding");
  if (has(text, /tourniquet|garrot/)) flags.push("tourniquet");
  if (has(text, /impaled object|objet empale|objet en place/)) flags.push("impaled_object_in_place");
  return [...new Set(flags)];
}

function family(regions: PenetratingTraumaRegion[], mechanisms: PenetratingTraumaMechanism[], flags: PenetratingTraumaWoundFlag[], code: string): string | null {
  if (!regions.length && mechanisms[0] === "unknown" && !code) return null;
  const major = regions.some((region) => ["eye", "chest", "abdomen", "neck"].includes(region)) || /^S(?:15|25|35|26|27|36|37)/.test(code);
  if (regions.includes("eye")) return "trauma_penetrating_eye";
  if (regions.includes("chest")) return "trauma_penetrating_chest";
  if (regions.includes("abdomen")) return "trauma_penetrating_abdomen";
  if (regions.includes("neck")) return "trauma_penetrating_neck";
  if (regions.includes("head")) return "trauma_penetrating_head";
  // Do not emit an unregistered "major" family: these cases stay disposition-led
  // until a region-specific discharge family is selected by the diagnosis resolver.
  if (major) return null;
  if (regions.includes("hand")) return "trauma_penetrating_hand";
  if (regions.includes("foot")) return "trauma_penetrating_foot";
  if (regions.includes("face")) return "trauma_penetrating_face";
  if (flags.includes("retained_projectile")) return "trauma_penetrating_retained_projectile";
  if (mechanisms.some((item) => item.startsWith("gunshot"))) return "trauma_penetrating_gsw_extremity";
  if (mechanisms.some((item) => item.startsWith("stab"))) return "trauma_penetrating_stab_minor";
  if (mechanisms.includes("accidental_puncture")) return "trauma_penetrating_minor";
  return null;
}

export function computePenetratingTraumaDispositionRecommendations(regions: readonly PenetratingTraumaRegion[], mechanisms: readonly PenetratingTraumaMechanism[], woundFlags: readonly PenetratingTraumaWoundFlag[], description = "", code = ""): PenetratingTraumaDispositionRecommendation[] {
  const text = norm(description);
  const vascularOrOrgan = /^S(?:15|25|35|26|27|36|37)/.test(code) || has(text, /vascular|artery|vein|heart|cardiac|organ injury|hemodynamic|hypoten|shock/);
  const major = regions.some((region) => ["chest", "abdomen", "neck", "eye"].includes(region)) || vascularOrOrgan || mechanisms.includes("impalement") || mechanisms.includes("gunshot_multiple") || regions.includes("multiple") || woundFlags.includes("active_bleeding") || woundFlags.includes("tourniquet");
  const recs: PenetratingTraumaDispositionRecommendation[] = [];
  if (major) {
    recs.push({ id: "transfer", rationale: "High-risk penetrating trauma requires transfer-capable trauma evaluation; this is advisory and requires clinician judgment." }, { id: "trauma", rationale: "Trauma-team evaluation is appropriate for high-risk penetrating injury." });
    if (regions.includes("eye")) recs.push({ id: "ophthalmology", rationale: "Penetrating eye injury requires urgent ophthalmology assessment." });
    if (regions.includes("chest") || code.startsWith("S26") || code.startsWith("S27")) recs.push({ id: "cardiothoracic", rationale: "Thoracic penetrating injury may require cardiothoracic assessment." });
    if (regions.includes("neck")) recs.push({ id: "ent", rationale: "Neck penetrating injury may require airway and ENT assessment." });
    if (vascularOrOrgan) recs.push({ id: "vascular", rationale: "Possible vascular or organ injury requires urgent specialty assessment." }, { id: "critical_care", rationale: "High-risk injury requires close hemodynamic monitoring." });
    if (regions.includes("head")) recs.push({ id: "neurosurgery", rationale: "Penetrating head injury requires urgent neurosurgical assessment." });
    if (regions.includes("genitalia")) recs.push({ id: "urology", rationale: "Genitourinary penetrating injury may require urology assessment." }, { id: "gynecology", rationale: "Gynecologic assessment may be required for genital or pelvic injury." });
    if (mechanisms.includes("impalement") || woundFlags.includes("retained_projectile")) recs.push({ id: "interventional_radiology", rationale: "Retained projectile or impaled-object management may require image-guided support." });
  } else if (woundFlags.includes("retained_projectile") || mechanisms.some((item) => item.startsWith("gunshot") || item.startsWith("stab"))) {
    recs.push({ id: "observation", rationale: "Serial wound, neurovascular, and bleeding reassessment should be considered." }, { id: "admission", rationale: "Admission may be appropriate when serial examination, imaging, or wound care cannot be safely arranged." });
    if (regions.includes("hand")) recs.push({ id: "hand_surgery", rationale: "Penetrating hand injury may require hand-specialist assessment." });
    if (regions.some((region) => ["upper_extremity", "lower_extremity", "foot"].includes(region))) recs.push({ id: "orthopedics", rationale: "Extremity injury may require orthopedic assessment." });
  } else {
    recs.push({ id: "discharge", rationale: "A superficial extremity puncture with reassuring examination may be discharged with wound care and strict return precautions." });
  }
  return [...new Map(recs.map((item) => [item.id, item])).values()];
}

export function resolvePenetratingTraumaContextFromDiagnosis(input: PenetratingTraumaDiagnosisInput): PenetratingTraumaContext {
  const code = (input.code ?? "").replace(/\s/g, "").toUpperCase();
  const text = norm(`${input.displayName ?? ""} ${input.code ?? ""}`);
  const regions = regionsFor(code, text);
  const mechanisms = mechanismsFor(text);
  const woundFlags = flagsFor(text);
  return { regions, mechanisms, woundFlags, dischargeFamilyId: family(regions, mechanisms, woundFlags, code), dispositionRecommendations: computePenetratingTraumaDispositionRecommendations(regions, mechanisms, woundFlags, text, code) };
}

export function adaptPenetratingTraumaComplaintIntel(intel: ProviderDocumentationComplaintIntelligence, context: Pick<PenetratingTraumaContext, "regions" | "mechanisms" | "woundFlags">): ProviderDocumentationComplaintIntelligence {
  const hints = [...context.regions, ...context.mechanisms, ...context.woundFlags].map((value) => value.replace(/_/g, " "));
  const sort = (keys?: string[]) => keys?.slice().sort((a, b) => Number(hints.some((hint) => b.toLowerCase().includes(hint))) - Number(hints.some((hint) => a.toLowerCase().includes(hint))));
  return { ...intel, hpi: sort(intel.hpi), mdmPlanSummary: sort(intel.mdmPlanSummary) };
}
