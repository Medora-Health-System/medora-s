/** D3E / D4A.2.6 / MEDUI.D4A.3.3 — Inpatient clinical workspace tabs. */
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
  | "notes"
  | "timeline"
  | "summary"
  | "tasks";

export const INPATIENT_WORKSPACE_SECTIONS: Array<{
  id: InpatientWorkspaceSection;
  labelKey: string;
}> = [
  { id: "overview", labelKey: "inpatientProviderD4a26.nav.overview" },
  { id: "nursing", labelKey: "inpatientHeaderNursingD4a33.nav.nursingAssessment" },
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
  { id: "notes", labelKey: "inpatientHeaderNursingD4a33.nav.notes" },
  { id: "tasks", labelKey: "inpatientRapidConvergenceD4a27c.actions.tasks" },
  { id: "timeline", labelKey: "inpatientProviderD4a26.nav.timeline" },
  { id: "summary", labelKey: "inpatientProviderD4a26.nav.summary" },
];

/**
 * MEDUI.D4A.3.3 — Nursing sticky nav (no Timeline / Summary).
 * Admission and Assessment lead the RN workflow so both remain visible before
 * horizontally scrolling the action-oriented chart navigation.
 */
export const INPATIENT_NURSING_STICKY_NAV_SECTIONS: Array<{
  id: InpatientWorkspaceSection;
  labelKey: string;
  icon: string;
}> = [
  { id: "overview", labelKey: "inpatientProviderD4a26.nav.overview", icon: "📋" },
  { id: "admission", labelKey: "inpatientProviderD4a26.nav.nursingAdmission", icon: "🏥" },
  { id: "nursing", labelKey: "inpatientHeaderNursingD4a33.nav.nursingAssessment", icon: "🩺" },
  { id: "orders", labelKey: "inpatientCompactHeaderD4a32.nav.reviewOrders", icon: "📝" },
  { id: "medications", labelKey: "inpatientCompactHeaderD4a32.nav.mar", icon: "💊" },
  { id: "results", labelKey: "inpatientCompactHeaderD4a32.nav.reviewResults", icon: "🧪" },
  { id: "carePlan", labelKey: "inpatientProviderD4a26.nav.carePlan", icon: "🗂️" },
  { id: "notes", labelKey: "inpatientHeaderNursingD4a33.nav.notes", icon: "🗒️" },
  { id: "dischargePlanning", labelKey: "inpatientProviderD4a26.nav.discharge", icon: "🚪" },
];

/**
 * INP.1B.1 — the shared chart is the common clinical record navigator.  Keep
 * nursing destinations visible here; authoring remains governed by the
 * clinical panels and API authorization, not by the presence of a tab.
 */
export const INPATIENT_SHARED_CHART_NAV_SECTIONS: Array<{
  id: InpatientWorkspaceSection;
  labelKey: string;
  icon: string;
}> = [
  { id: "overview", labelKey: "inpatientProviderD4a26.nav.overview", icon: "📋" },
  { id: "admission", labelKey: "inpatientProviderD4a26.nav.nursingAdmission", icon: "🏥" },
  { id: "nursing", labelKey: "inpatientHeaderNursingD4a33.nav.nursingAssessment", icon: "🩺" },
  { id: "orders", labelKey: "inpatientCompactHeaderD4a32.nav.reviewOrders", icon: "📝" },
  { id: "medications", labelKey: "inpatientCompactHeaderD4a32.nav.mar", icon: "💊" },
  { id: "results", labelKey: "inpatientCompactHeaderD4a32.nav.reviewResults", icon: "🧪" },
  { id: "carePlan", labelKey: "inpatientProviderD4a26.nav.carePlan", icon: "🗂️" },
  { id: "dischargePlanning", labelKey: "inpatientProviderD4a26.nav.discharge", icon: "🚪" },
  { id: "timeline", labelKey: "inpatientProviderD4a26.nav.timeline", icon: "⏱️" },
  { id: "summary", labelKey: "inpatientProviderD4a26.nav.summary", icon: "📄" },
];

/**
 * Provider sticky chrome — keeps Timeline + Summary; no Nursing Assessment / Notes tabs.
 */
export const INPATIENT_PROVIDER_STICKY_NAV_SECTIONS: Array<{
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
  { id: "timeline", labelKey: "inpatientProviderD4a26.nav.timeline", icon: "⏱️" },
  { id: "summary", labelKey: "inpatientProviderD4a26.nav.summary", icon: "📄" },
];

/** @deprecated Prefer role-specific sticky lists; kept as nursing alias for D4A.3.2 tests migration. */
export const INPATIENT_STICKY_NAV_SECTIONS = INPATIENT_NURSING_STICKY_NAV_SECTIONS;

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
    nursingassessment: "nursing",
    notes: "notes",
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
