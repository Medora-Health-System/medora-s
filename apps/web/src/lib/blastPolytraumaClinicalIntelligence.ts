import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

export type BlastCategory = "primary" | "secondary" | "tertiary" | "quaternary" | "quinary";
export type BlastSystem = "ear" | "lung" | "abdomen" | "neuro" | "fragment" | "crush" | "burn" | "multiple";
export type BlastDispositionRecommendationId = "discharge" | "observation" | "admission" | "transfer" | "trauma" | "critical_care" | "ent" | "pulmonology" | "surgery" | "neurosurgery";
export type BlastPolytraumaDiagnosisInput = { code?: string; displayName?: string };
export type BlastPolytraumaDispositionRecommendation = { id: BlastDispositionRecommendationId; rationale: string };
export type BlastPolytraumaContext = {
  categories: BlastCategory[];
  incidentTypes: string[];
  systems: BlastSystem[];
  enclosed: boolean;
  entrapment: boolean;
  thrown: boolean;
  fragments: boolean;
  burns: boolean;
  inhalation: boolean;
  dischargeFamilyId: string | null;
  dispositionRecommendations: BlastPolytraumaDispositionRecommendation[];
};

const norm = (value = "") => value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const match = (text: string, pattern: RegExp) => pattern.test(text);

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function computeBlastPolytraumaDispositionRecommendations(
  systems: readonly BlastSystem[],
  context: Pick<BlastPolytraumaContext, "enclosed" | "entrapment" | "thrown" | "fragments" | "burns" | "inhalation">,
  description = "",
  code = "",
): BlastPolytraumaDispositionRecommendation[] {
  const text = norm(description);
  const highRisk = systems.includes("multiple") || systems.includes("lung") || systems.includes("abdomen") ||
    systems.includes("neuro") || context.enclosed || context.entrapment || context.inhalation ||
    code.startsWith("T79.4") || code.startsWith("T07");
  const recs: BlastPolytraumaDispositionRecommendation[] = [];
  if (highRisk) {
    recs.push(
      { id: "transfer", rationale: "Blast injury with possible multisystem or delayed effects needs trauma-capable evaluation; this is advisory and requires clinician judgment." },
      { id: "trauma", rationale: "Trauma-team evaluation is appropriate when blast exposure may involve more than one body system." },
    );
    if (systems.includes("lung") || context.inhalation) recs.push({ id: "critical_care", rationale: "Respiratory compromise or inhalation exposure may require close monitoring." }, { id: "pulmonology", rationale: "Pulmonary blast effects may require specialty assessment." });
    if (systems.includes("abdomen") || systems.includes("fragment")) recs.push({ id: "surgery", rationale: "Abdominal or fragment injury may require surgical assessment." });
    if (systems.includes("neuro") || context.thrown) recs.push({ id: "neurosurgery", rationale: "Head injury after blast or body displacement may require neurosurgical assessment." });
    if (systems.includes("ear")) recs.push({ id: "ent", rationale: "Blast-related ear injury may require ENT assessment." });
  } else if (systems.includes("ear") || systems.includes("fragment") || systems.includes("crush") || context.burns) {
    recs.push({ id: "observation", rationale: "Serial reassessment may be appropriate because blast symptoms can evolve after the initial examination." });
    if (systems.includes("ear")) recs.push({ id: "ent", rationale: "Blast-related hearing or ear symptoms may need ENT follow-up." });
  } else {
    recs.push({ id: "discharge", rationale: "A limited external-cause exposure without identified anatomic injury may be discharged only after clinician assessment and clear return precautions." });
  }
  return unique(recs.map((item) => item.id)).map((id) => recs.find((item) => item.id === id)!);
}

export function resolveBlastPolytraumaContextFromDiagnosis(input: BlastPolytraumaDiagnosisInput): BlastPolytraumaContext {
  const code = (input.code ?? "").replace(/\s/g, "").toUpperCase();
  const text = norm(`${input.displayName ?? ""} ${input.code ?? ""}`);
  const incidentTypes = unique([
    ...(match(text, /blast|explos|firework|blasting material|detonation|explosion/) || /^(W3[5-9]|W40|X75|X96|Y25|Y3[5-8]|V)/.test(code) ? ["explosion"] : []),
    ...(match(text, /collapse|cave-in|cave in|building|ensevel/) || code.startsWith("T71.21") ? ["structural_collapse"] : []),
  ]);
  const systems: BlastSystem[] = [];
  if (code.startsWith("S09.2") || code.startsWith("T70.0") || code.startsWith("H83.3") || match(text, /ear|hearing|tinnitus|tympan/)) systems.push("ear");
  if (code.startsWith("T70.8") || code.startsWith("T70.9") || match(text, /lung|pulmon|barotrauma|chest pressure|dyspnea/)) systems.push("lung");
  if (match(text, /abdomen|abdominal|bowel|flank/)) systems.push("abdomen");
  if (match(text, /head|brain|concussion|neuro|confusion|thrown/)) systems.push("neuro");
  if (match(text, /fragment|shrapnel|projectile/)) systems.push("fragment");
  if (match(text, /crush|entrap|collapse|cave-in|ensevel/)) systems.push("crush");
  if (match(text, /burn|flame|smoke/)) systems.push("burn");
  if (code.startsWith("T07") || systems.filter((system) => system !== "multiple").length > 1) systems.push("multiple");
  const categories: BlastCategory[] = [];
  if (systems.includes("lung") || systems.includes("ear") || systems.includes("abdomen")) categories.push("primary");
  if (systems.includes("fragment")) categories.push("secondary");
  if (systems.includes("neuro") || match(text, /thrown|fall/)) categories.push("tertiary");
  if (systems.includes("burn") || match(text, /smoke|inhalation/)) categories.push("quaternary");
  if (match(text, /contamin|toxic|chemical/)) categories.push("quinary");
  if (!categories.length && incidentTypes.length) categories.push("primary");
  const enclosed = match(text, /enclosed|indoor|inside|confined|ferme|interieur/);
  const entrapment = match(text, /entrap|trapped|collapse|cave-in|ensevel/);
  const thrown = match(text, /thrown|threw|ejected|projected|projete/);
  const fragments = systems.includes("fragment");
  const burns = systems.includes("burn");
  const inhalation = match(text, /inhalation|smoke|fume|soot/);
  let dischargeFamilyId: string | null = null;
  if (systems.includes("ear")) dischargeFamilyId = "trauma_blast_ear";
  else if (systems.includes("lung")) dischargeFamilyId = "trauma_blast_lung";
  else if (systems.includes("abdomen")) dischargeFamilyId = "trauma_blast_abdomen";
  else if (systems.includes("neuro")) dischargeFamilyId = "trauma_blast_mild_tbi";
  else if (systems.includes("fragment")) dischargeFamilyId = "trauma_blast_fragment";
  else if (systems.includes("burn")) dischargeFamilyId = "trauma_blast_burn";
  else if (systems.includes("crush")) dischargeFamilyId = entrapment ? "trauma_blast_collapse" : "trauma_blast_crush";
  else if (code.startsWith("T07") || code.startsWith("T79.4")) dischargeFamilyId = "trauma_polytrauma";
  else if (incidentTypes.length) dischargeFamilyId = "trauma_blast_minor";
  return { categories: unique(categories), incidentTypes, systems: unique(systems), enclosed, entrapment, thrown, fragments, burns, inhalation, dischargeFamilyId, dispositionRecommendations: computeBlastPolytraumaDispositionRecommendations(unique(systems), { enclosed, entrapment, thrown, fragments, burns, inhalation }, text, code) };
}

export function adaptBlastPolytraumaComplaintIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<BlastPolytraumaContext, "categories" | "systems" | "incidentTypes">,
): ProviderDocumentationComplaintIntelligence {
  const hints = [...context.categories, ...context.systems, ...context.incidentTypes].map((value) => value.replace(/_/g, " "));
  const sort = (keys?: string[]) => keys?.slice().sort((a, b) => Number(hints.some((hint) => b.toLowerCase().includes(hint))) - Number(hints.some((hint) => a.toLowerCase().includes(hint))));
  return { ...intel, hpi: sort(intel.hpi), mdmPlanSummary: sort(intel.mdmPlanSummary) };
}
