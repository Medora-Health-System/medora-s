/** D3E — Inpatient clinical workspace tabs. */
export type InpatientWorkspaceSection =
  | "overview"
  | "historyPhysical"
  | "progressNotes"
  | "nursing"
  | "orders"
  | "results"
  | "medications"
  | "consults"
  | "carePlan"
  | "dischargePlanning"
  | "timeline"
  | "summary";

export const INPATIENT_WORKSPACE_SECTIONS: Array<{
  id: InpatientWorkspaceSection;
  labelKey: string;
}> = [
  { id: "overview", labelKey: "inpatientD3e.nav.overview" },
  { id: "historyPhysical", labelKey: "inpatientD3e.nav.historyPhysical" },
  { id: "progressNotes", labelKey: "inpatientD3e.nav.progressNotes" },
  { id: "nursing", labelKey: "inpatientD3e.nav.nursing" },
  { id: "orders", labelKey: "inpatientD3e.nav.orders" },
  { id: "results", labelKey: "inpatientD3e.nav.results" },
  { id: "medications", labelKey: "inpatientD3e.nav.medications" },
  { id: "consults", labelKey: "inpatientD3e.nav.consults" },
  { id: "carePlan", labelKey: "inpatientD3e.nav.carePlan" },
  { id: "dischargePlanning", labelKey: "inpatientD3e.nav.dischargePlanning" },
  { id: "timeline", labelKey: "inpatientD3e.nav.timeline" },
  { id: "summary", labelKey: "inpatientD3e.nav.summary" },
];

const SECTION_SET = new Set(INPATIENT_WORKSPACE_SECTIONS.map((s) => s.id));

export function parseInpatientWorkspaceSection(
  raw: string | null | undefined
): InpatientWorkspaceSection | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  if (SECTION_SET.has(trimmed as InpatientWorkspaceSection)) {
    return trimmed as InpatientWorkspaceSection;
  }
  const lower = trimmed.toLowerCase().replace(/[_-]/g, "");
  const alias: Record<string, InpatientWorkspaceSection> = {
    overview: "overview",
    hp: "historyPhysical",
    historyphysical: "historyPhysical",
    handp: "historyPhysical",
    progress: "progressNotes",
    progressnotes: "progressNotes",
    nursing: "nursing",
    orders: "orders",
    results: "results",
    medications: "medications",
    mar: "medications",
    consults: "consults",
    careplan: "carePlan",
    discharge: "dischargePlanning",
    dischargeplanning: "dischargePlanning",
    timeline: "timeline",
    summary: "summary",
  };
  return alias[lower] ?? null;
}
