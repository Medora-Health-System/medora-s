/** D3E / D4A.2.6 — Inpatient clinical workspace tabs (provider-first chrome). */
export type InpatientWorkspaceSection =
  | "overview"
  | "historyPhysical"
  | "problemsPlan"
  | "progressNotes"
  | "orders"
  | "results"
  | "medications"
  | "consults"
  | "carePlan"
  | "dischargePlanning"
  | "admission"
  | "nursing"
  | "timeline"
  | "summary"
  | "tasks";

export const INPATIENT_WORKSPACE_SECTIONS: Array<{
  id: InpatientWorkspaceSection;
  labelKey: string;
}> = [
  { id: "overview", labelKey: "inpatientProviderD4a26.nav.overview" },
  { id: "historyPhysical", labelKey: "inpatientProviderD4a26.nav.historyPhysical" },
  { id: "problemsPlan", labelKey: "inpatientProviderD4a26.nav.problemsPlan" },
  { id: "progressNotes", labelKey: "inpatientProviderD4a26.nav.progressNotes" },
  { id: "orders", labelKey: "inpatientProviderD4a26.nav.orders" },
  { id: "results", labelKey: "inpatientProviderD4a26.nav.results" },
  { id: "medications", labelKey: "inpatientProviderD4a26.nav.medications" },
  { id: "consults", labelKey: "inpatientProviderD4a26.nav.consults" },
  { id: "carePlan", labelKey: "inpatientProviderD4a26.nav.carePlan" },
  { id: "dischargePlanning", labelKey: "inpatientProviderD4a26.nav.discharge" },
  { id: "admission", labelKey: "inpatientProviderD4a26.nav.nursingAdmission" },
  { id: "nursing", labelKey: "inpatientProviderD4a26.nav.nursing" },
  { id: "tasks", labelKey: "inpatientRapidConvergenceD4a27c.actions.tasks" },
  { id: "timeline", labelKey: "inpatientProviderD4a26.nav.timeline" },
  { id: "summary", labelKey: "inpatientProviderD4a26.nav.summary" },
];

/**
 * MEDUI.D4A.3.2 — Single sticky horizontal menu (tabs + Review Orders / MAR / Review Results).
 * Route key for MAR remains `medications` for back-compat.
 */
export const INPATIENT_STICKY_NAV_SECTIONS: Array<{
  id: InpatientWorkspaceSection;
  labelKey: string;
  icon: string;
}> = [
  { id: "overview", labelKey: "inpatientProviderD4a26.nav.overview", icon: "📋" },
  { id: "orders", labelKey: "inpatientCompactHeaderD4a32.nav.reviewOrders", icon: "📝" },
  { id: "medications", labelKey: "inpatientCompactHeaderD4a32.nav.mar", icon: "💊" },
  { id: "results", labelKey: "inpatientCompactHeaderD4a32.nav.reviewResults", icon: "🧪" },
  { id: "carePlan", labelKey: "inpatientProviderD4a26.nav.carePlan", icon: "🗂️" },
  { id: "dischargePlanning", labelKey: "inpatientProviderD4a26.nav.discharge", icon: "🚪" },
  { id: "admission", labelKey: "inpatientProviderD4a26.nav.nursingAdmission", icon: "🏥" },
  { id: "nursing", labelKey: "inpatientProviderD4a26.nav.nursing", icon: "🩺" },
  { id: "timeline", labelKey: "inpatientProviderD4a26.nav.timeline", icon: "⏱️" },
  { id: "summary", labelKey: "inpatientProviderD4a26.nav.summary", icon: "📄" },
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
    admission: "admission",
    nursingadmission: "admission",
    hp: "historyPhysical",
    historyphysical: "historyPhysical",
    handp: "historyPhysical",
    problems: "problemsPlan",
    problemsplan: "problemsPlan",
    plan: "problemsPlan",
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
    rounding: "overview",
    tasks: "tasks",
    technician: "tasks",
  };
  return alias[lower] ?? null;
}
