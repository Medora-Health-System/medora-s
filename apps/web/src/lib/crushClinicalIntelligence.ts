import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

export type CrushRegion = "hand_finger" | "upper_extremity" | "lower_extremity" | "foot_toe" | "chest_abdomen_pelvis" | "head_face" | "multiple" | "unspecified";
export type CrushSeverity = "minor" | "moderate" | "severe" | "prolonged_compression" | "unknown";
export type CrushModifier = "open" | "degloving" | "compartment_risk" | "rhabdomyolysis_risk" | "industrial";
export type CrushDispositionRecommendationId = "discharge" | "observation" | "admission" | "transfer" | "trauma" | "orthopedics" | "vascular" | "plastics";
export type CrushDispositionRecommendation = { id: CrushDispositionRecommendationId; rationale: string };
export type CrushDiagnosisInput = { code?: string; displayName?: string };
export type CrushContext = { regions: CrushRegion[]; severity: CrushSeverity; modifiers: CrushModifier[]; dischargeFamilyId: string | null; dispositionRecommendations: CrushDispositionRecommendation[] };

const norm = (s = "") => s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const regionFor = (code: string, text: string): CrushRegion[] => {
  if (/multiple|plusieurs/.test(text)) return ["multiple"];
  if (code.startsWith("S67") || /hand|finger|main|doigt/.test(text)) return ["hand_finger"];
  if (code.startsWith("S57") || code.startsWith("S47") || /forearm|arm|upper extremity|avant-bras|bras/.test(text)) return ["upper_extremity"];
  if (code.startsWith("S77") || code.startsWith("S87") || /lower extremity|leg|knee|thigh|jambe|genou|cuisse/.test(text)) return ["lower_extremity"];
  if (code.startsWith("S97") || /foot|toe|pied|orteil/.test(text)) return ["foot_toe"];
  if (code.startsWith("S28") || code.startsWith("S38") || /chest|abdomen|pelvis|thorax|bassin/.test(text)) return ["chest_abdomen_pelvis"];
  if (code.startsWith("S07") || /head|face|tete|visage/.test(text)) return ["head_face"];
  return /crush|ecras/.test(text) || code.startsWith("T79.6") ? ["unspecified"] : [];
};
function family(regions: CrushRegion[], severity: CrushSeverity, modifiers: CrushModifier[]) {
  if (!regions.length) return null;
  if (modifiers.includes("degloving")) return "trauma_crush_degloving";
  if (modifiers.includes("compartment_risk")) return "trauma_crush_compartment_risk";
  if (severity === "prolonged_compression") return "trauma_crush_prolonged_compression";
  if (regions.includes("hand_finger")) return "trauma_crush_hand_finger";
  if (regions.includes("upper_extremity")) return "trauma_crush_upper_extremity";
  if (regions.includes("foot_toe")) return "trauma_crush_foot_toe";
  if (regions.includes("lower_extremity")) return "trauma_crush_lower_extremity";
  if (regions.includes("chest_abdomen_pelvis")) return "trauma_crush_chest_abdomen_pelvis";
  return "trauma_crush_generic";
}
export function computeCrushDispositionRecommendations(regions: readonly CrushRegion[], severity: CrushSeverity, modifiers: readonly CrushModifier[]): CrushDispositionRecommendation[] {
  const urgent = severity === "severe" || severity === "prolonged_compression" || modifiers.some((m) => ["compartment_risk", "rhabdomyolysis_risk", "degloving", "open"].includes(m));
  const recs: CrushDispositionRecommendation[] = urgent ? [{ id: "admission", rationale: "Severe crush injury requires serial neurovascular, compartment, renal, and electrolyte reassessment." }, { id: "trauma", rationale: "Trauma evaluation is appropriate for high-energy or multisystem crush injury." }] : [{ id: "discharge", rationale: "Isolated minor crush injury with reassuring neurovascular examination may be discharged with strict return precautions." }];
  if (regions.some((r) => r === "hand_finger" || r === "upper_extremity") || modifiers.includes("degloving")) recs.push({ id: "plastics", rationale: "Complex hand or degloving injury needs timely reconstructive assessment." });
  if (modifiers.includes("compartment_risk")) recs.push({ id: "orthopedics", rationale: "Compartment syndrome concern warrants urgent orthopedic assessment." });
  if (urgent) recs.push({ id: "observation", rationale: "Observation supports serial pain, perfusion, and compartment examinations." });
  return [...new Map(recs.map((r) => [r.id, r])).values()];
}
export function resolveCrushContextFromDiagnosis(input: CrushDiagnosisInput): CrushContext {
  const code = (input.code ?? "").replace(/\s/g, "").toUpperCase(), text = norm(`${input.displayName ?? ""} ${input.code ?? ""}`);
  const regions = regionFor(code, text), modifiers: CrushModifier[] = [];
  if (/open|plaie ouverte/.test(text)) modifiers.push("open"); if (/deglov/.test(text)) modifiers.push("degloving");
  if (/compartment|loges?/.test(text)) modifiers.push("compartment_risk"); if (/rhabdo|prolonged|entrapp|compression prolongee/.test(text) || code.startsWith("T79.6")) modifiers.push("rhabdomyolysis_risk");
  if (/industrial|machine|travail/.test(text)) modifiers.push("industrial");
  const severity: CrushSeverity = /prolonged|entrapp|compression prolongee|T79\.6/.test(`${text} ${code}`) ? "prolonged_compression" : modifiers.length >= 2 || /severe|grave/.test(text) ? "severe" : regions.length ? "moderate" : "unknown";
  return { regions, severity, modifiers, dischargeFamilyId: family(regions, severity, modifiers), dispositionRecommendations: computeCrushDispositionRecommendations(regions, severity, modifiers) };
}
export function adaptCrushComplaintIntel(intel: ProviderDocumentationComplaintIntelligence, context: Pick<CrushContext, "regions">): ProviderDocumentationComplaintIntelligence {
  const hints = context.regions.includes("hand_finger") ? ["hand", "finger"] : context.regions.includes("foot_toe") ? ["foot", "toe"] : context.regions.includes("head_face") ? ["head", "face"] : [];
  const sort = (keys?: string[]) =>
    keys?.slice().sort((a, b) => Number(hints.some((h) => b.toLowerCase().includes(h))) - Number(hints.some((h) => a.toLowerCase().includes(h))));
  return { ...intel, hpi: sort(intel.hpi), mdmPlanSummary: sort(intel.mdmPlanSummary) };
}
