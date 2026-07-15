import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

export type HumanBiteMechanism =
  | "human_bite" | "clenched_fist" | "assault" | "accidental" | "occupational"
  | "child_bite" | "adult_bite" | "self_inflicted" | "unknown";
export type HumanBiteContamination =
  | "saliva" | "blood" | "soil" | "fresh_water" | "salt_water" | "sewage" | "farm"
  | "organic" | "metal" | "glass" | "wood" | "teeth_fragments";
export type HumanBiteDispositionId = "discharge" | "observation" | "admission" | "hand_surgery" | "orthopedics" | "plastics" | "infectious_disease" | "trauma";
export type HumanBiteDiagnosisInput = { code?: string; displayName?: string };
export type HumanBiteDispositionRecommendation = { id: HumanBiteDispositionId; rationale: string };
export type HumanBiteHighRiskWoundContext = {
  mechanisms: HumanBiteMechanism[];
  contamination: HumanBiteContamination[];
  regions: string[];
  highRiskFlags: string[];
  infectionConcerns: string[];
  dischargeFamilyId: string | null;
  dispositionRecommendations: HumanBiteDispositionRecommendation[];
};

const norm = (value = "") => value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const unique = <T,>(values: T[]) => [...new Set(values)];

export function resolveHumanBiteHighRiskWoundContextFromDiagnosis(input: HumanBiteDiagnosisInput): HumanBiteHighRiskWoundContext {
  const code = (input.code ?? "").replace(/\s/g, "").toUpperCase();
  const text = norm(`${input.displayName ?? ""} ${input.code ?? ""}`);
  const mechanisms: HumanBiteMechanism[] = [];
  if (/w50\.3|y04\.1|human bite|morsure humaine|bite by another person/.test(`${code} ${text}`)) mechanisms.push("human_bite");
  if (/fight bite|clenched fist|knuckle bite|morsure du poing/.test(text)) mechanisms.push("clenched_fist");
  if (/assault|altercation|fight|bagarre|agression/.test(text) || code.startsWith("Y04.1")) mechanisms.push("assault");
  if (/occupational|work|healthcare|soignant/.test(text)) mechanisms.push("occupational");
  if (/child|enfant/.test(text)) mechanisms.push("child_bite");
  if (/adult/.test(text)) mechanisms.push("adult_bite");
  if (/self.inflicted|auto.inflig/.test(text)) mechanisms.push("self_inflicted");
  if (!mechanisms.length) mechanisms.push("unknown");
  const contamination: HumanBiteContamination[] = [];
  const contaminationMatchers: Array<[HumanBiteContamination, RegExp]> = [
    ["saliva", /saliva/], ["blood", /blood|sang/], ["soil", /soil|dirt|terre/],
    ["fresh_water", /freshwater|lake|river|aquarium|eau douce|lac|riviere/],
    ["salt_water", /saltwater|ocean|sea|eau salee|ocean|mer/], ["sewage", /sewage|egout/],
    ["farm", /farm|animal waste|ferme/], ["organic", /organic/], ["metal", /metal/],
    ["glass", /glass|verre/], ["wood", /wood|bois/], ["teeth_fragments", /tooth|teeth|dent/],
  ];
  contaminationMatchers.forEach(([kind, pattern]) => { if (pattern.test(text)) contamination.push(kind); });
  const regions = unique([
    ...( /hand|finger|knuckle|main|doigt|articulation/.test(text) ? ["hand"] : []),
    ...( /joint|tendon|articulation|tendon/.test(text) ? ["joint_or_tendon"] : []),
    ...( /face|lip|mouth|visage|levre|bouche/.test(text) ? ["face_or_mouth"] : []),
    ...( /foot|toe|pied|orteil/.test(text) ? ["foot"] : []),
  ]);
  const highRiskFlags = unique([
    ...(regions.includes("hand") ? ["hand"] : []),
    ...(regions.includes("joint_or_tendon") ? ["joint_or_tendon"] : []),
    ...(/delayed|days later|late presentation|retard/.test(text) ? ["delayed"] : []),
    ...(/diabetes|immunocomprom/.test(text) ? ["diabetes_or_immunocompromised"] : []),
    ...(/deep|puncture|profond|ponction/.test(text) ? ["deep_wound"] : []),
    ...(contamination.length ? ["contamination"] : []),
  ]);
  const infectionConcerns = unique([
    ...(/redness|erythema|cellulitis|rougeur/.test(text) ? ["cellulitis"] : []),
    ...(/abscess|pus|drainage/.test(text) ? ["abscess"] : []),
    ...(/flexor|tenosynovitis/.test(text) ? ["flexor_tenosynovitis"] : []),
    ...(/septic arthritis|septic joint/.test(text) ? ["septic_arthritis"] : []),
    ...(/osteomyelitis/.test(text) ? ["osteomyelitis"] : []),
    ...(/necrotiz/.test(text) ? ["necrotizing_infection"] : []),
  ]);
  const fightBite = mechanisms.includes("clenched_fist");
  const humanBite = mechanisms.includes("human_bite") || mechanisms.includes("assault");
  const dischargeFamilyId = fightBite ? "trauma_fight_bite"
    : humanBite ? "trauma_human_bite"
    : /contaminated wound|dirty wound|plaie contamin|plaie sale/.test(text) ? "trauma_contaminated_wound"
    : /freshwater|saltwater|lake|river|ocean|aquarium/.test(text) ? "trauma_water_exposed_wound"
    : /delayed wound|delayed presentation wound/.test(text) ? "trauma_delayed_wound"
    : /deep contaminated|sewage|farm contamination/.test(text) ? "trauma_deep_contaminated_wound"
    : highRiskFlags.includes("hand") ? "trauma_high_risk_hand_wound" : null;
  const highRisk = fightBite || highRiskFlags.length > 0 || infectionConcerns.length > 0;
  const recs: HumanBiteDispositionRecommendation[] = highRisk
    ? [{ id: "hand_surgery", rationale: "Hand, joint, tendon, or clenched-fist injury warrants clinician-directed hand-surgery assessment." }, { id: "orthopedics", rationale: "Possible joint or tendon involvement warrants clinician-directed orthopedic assessment." }]
    : [{ id: "discharge", rationale: "Discharge is appropriate only after clinician assessment, wound care, tetanus review, and clear infection return precautions." }];
  if (infectionConcerns.includes("flexor_tenosynovitis") || infectionConcerns.includes("septic_arthritis") || infectionConcerns.includes("necrotizing_infection")) recs.push({ id: "admission", rationale: "Deep infection concern may require monitored treatment and specialty-directed management." });
  if (contamination.includes("sewage") || contamination.includes("farm")) recs.push({ id: "infectious_disease", rationale: "Unusual contamination may warrant clinician-directed infectious-disease consultation." });
  return { mechanisms: unique(mechanisms), contamination: unique(contamination), regions, highRiskFlags, infectionConcerns, dischargeFamilyId, dispositionRecommendations: unique(recs.map((item) => item.id)).map((id) => recs.find((item) => item.id === id)!) };
}

export function adaptHumanBiteHighRiskWoundComplaintIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<HumanBiteHighRiskWoundContext, "mechanisms" | "highRiskFlags" | "infectionConcerns">,
): ProviderDocumentationComplaintIntelligence {
  const hints = [...context.mechanisms, ...context.highRiskFlags, ...context.infectionConcerns].map((value) => value.replace(/_/g, " "));
  const sort = (keys?: string[]) => keys?.slice().sort((a, b) => Number(hints.some((hint) => b.toLowerCase().includes(hint))) - Number(hints.some((hint) => a.toLowerCase().includes(hint))));
  return { ...intel, hpi: sort(intel.hpi), mdmPlanSummary: sort(intel.mdmPlanSummary) };
}
