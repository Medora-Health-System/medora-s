/** D3D / D4A.2.7C — Observation dashboard tabs (provider + nursing). */
export type ObservationWorkspaceSection =
  | "overview"
  | "providerNotes"
  | "problemsPlan"
  | "nursing"
  | "assessments"
  | "vitals"
  | "orders"
  | "results"
  | "medications"
  | "reassessment"
  | "tasks"
  | "education"
  | "carePlan"
  | "summary"
  | "disposition"
  | "timeline";

export const OBSERVATION_WORKSPACE_SECTIONS: Array<{
  id: ObservationWorkspaceSection;
  labelKey: string;
}> = [
  { id: "overview", labelKey: "inpatientRapidConvergenceD4a27c.observation.providerNav.overview" },
  { id: "providerNotes", labelKey: "inpatientRapidConvergenceD4a27c.observation.providerNav.providerNotes" },
  { id: "problemsPlan", labelKey: "inpatientRapidConvergenceD4a27c.observation.providerNav.problemsPlan" },
  { id: "nursing", labelKey: "observationD3d.nav.nursing" },
  { id: "assessments", labelKey: "inpatientRapidConvergenceD4a27c.observation.nursingNav.assessments" },
  { id: "vitals", labelKey: "inpatientRapidConvergenceD4a27c.observation.nursingNav.vitals" },
  { id: "orders", labelKey: "inpatientRapidConvergenceD4a27c.observation.providerNav.orders" },
  { id: "results", labelKey: "inpatientRapidConvergenceD4a27c.observation.providerNav.results" },
  { id: "medications", labelKey: "inpatientRapidConvergenceD4a27c.observation.providerNav.medications" },
  { id: "reassessment", labelKey: "inpatientRapidConvergenceD4a27c.observation.providerNav.reassessment" },
  { id: "tasks", labelKey: "inpatientRapidConvergenceD4a27c.observation.nursingNav.tasks" },
  { id: "education", labelKey: "inpatientRapidConvergenceD4a27c.observation.nursingNav.education" },
  { id: "carePlan", labelKey: "inpatientRapidConvergenceD4a27c.observation.providerNav.carePlan" },
  { id: "summary", labelKey: "inpatientRapidConvergenceD4a27c.observation.providerNav.summary" },
  { id: "disposition", labelKey: "inpatientRapidConvergenceD4a27c.observation.providerNav.disposition" },
  { id: "timeline", labelKey: "inpatientRapidConvergenceD4a27c.observation.providerNav.timeline" },
];

const SECTION_SET = new Set(OBSERVATION_WORKSPACE_SECTIONS.map((s) => s.id));

export function parseObservationWorkspaceSection(
  raw: string | null | undefined
): ObservationWorkspaceSection | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  if (SECTION_SET.has(trimmed as ObservationWorkspaceSection)) {
    return trimmed as ObservationWorkspaceSection;
  }
  const lower = trimmed.toLowerCase().replace(/[_-]/g, "");
  const alias: Record<string, ObservationWorkspaceSection> = {
    overview: "overview",
    providernotes: "providerNotes",
    problemsplan: "problemsPlan",
    problems: "problemsPlan",
    nursing: "nursing",
    assessments: "assessments",
    vitals: "vitals",
    orders: "orders",
    results: "results",
    medications: "medications",
    mar: "medications",
    reassessment: "reassessment",
    tasks: "tasks",
    education: "education",
    careplan: "carePlan",
    summary: "summary",
    disposition: "disposition",
    timeline: "timeline",
  };
  return alias[lower] ?? null;
}
