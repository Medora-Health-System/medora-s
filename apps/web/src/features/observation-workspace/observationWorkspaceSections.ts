/** D3D — Observation dashboard tabs. */
export type ObservationWorkspaceSection =
  | "overview"
  | "providerNotes"
  | "nursing"
  | "orders"
  | "results"
  | "medications"
  | "reassessment"
  | "carePlan"
  | "summary"
  | "disposition"
  | "timeline";

export const OBSERVATION_WORKSPACE_SECTIONS: Array<{
  id: ObservationWorkspaceSection;
  labelKey: string;
}> = [
  { id: "overview", labelKey: "observationD3d.nav.overview" },
  { id: "providerNotes", labelKey: "observationD3d.nav.providerNotes" },
  { id: "nursing", labelKey: "observationD3d.nav.nursing" },
  { id: "orders", labelKey: "observationD3d.nav.orders" },
  { id: "results", labelKey: "observationD3d.nav.results" },
  { id: "medications", labelKey: "observationD3d.nav.medications" },
  { id: "reassessment", labelKey: "observationD3d.nav.reassessment" },
  { id: "carePlan", labelKey: "observationD3d.nav.carePlan" },
  { id: "summary", labelKey: "observationD3d.nav.summary" },
  { id: "disposition", labelKey: "observationD3d.nav.disposition" },
  { id: "timeline", labelKey: "observationD3d.nav.timeline" },
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
  const lower = trimmed.toLowerCase();
  const alias: Record<string, ObservationWorkspaceSection> = {
    overview: "overview",
    providernotes: "providerNotes",
    nursing: "nursing",
    orders: "orders",
    results: "results",
    medications: "medications",
    mar: "medications",
    reassessment: "reassessment",
    careplan: "carePlan",
    summary: "summary",
    disposition: "disposition",
    timeline: "timeline",
  };
  return alias[lower] ?? null;
}
