/** Inpatient clinical workspace section ids (sticky + deep-link destinations). */
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
 * MEDUI.INP.2F — Canonical primary sticky navigation (all inpatient clinical roles).
 * Timeline is not a sticky tab; Overview remains the operational dashboard.
 * Summary is the read-only encounter medical-record projection.
 */
export const INPATIENT_CLINICAL_PRIMARY_NAV_SECTIONS: Array<{
  id: InpatientWorkspaceSection;
  labelKey: string;
  icon: string;
}> = [
  { id: "overview", labelKey: "inpatientProviderD4a26.nav.overview", icon: "📋" },
  { id: "summary", labelKey: "inpatientProviderD4a26.nav.summary", icon: "📑" },
  { id: "admission", labelKey: "inpatientProviderD4a26.nav.nursingAdmission", icon: "🏥" },
  { id: "nursing", labelKey: "inpatientHeaderNursingD4a33.nav.nursingAssessment", icon: "🩺" },
  { id: "orders", labelKey: "inpatientCompactHeaderD4a32.nav.reviewOrders", icon: "📝" },
  { id: "medications", labelKey: "inpatientCompactHeaderD4a32.nav.mar", icon: "💊" },
  { id: "results", labelKey: "inpatientCompactHeaderD4a32.nav.reviewResults", icon: "🧪" },
  { id: "carePlan", labelKey: "inpatientProviderD4a26.nav.carePlan", icon: "🗂️" },
  { id: "dischargePlanning", labelKey: "inpatientProviderD4a26.nav.discharge", icon: "🚪" },
];

/** Nursing sticky — same eight clinical modules. */
export const INPATIENT_NURSING_STICKY_NAV_SECTIONS = INPATIENT_CLINICAL_PRIMARY_NAV_SECTIONS;

/** Shared chart sticky — same eight clinical modules. */
export const INPATIENT_SHARED_CHART_NAV_SECTIONS = INPATIENT_CLINICAL_PRIMARY_NAV_SECTIONS;

/** Provider sticky — same eight clinical modules (Admission/Assessment visible read-capable). */
export const INPATIENT_PROVIDER_STICKY_NAV_SECTIONS = INPATIENT_CLINICAL_PRIMARY_NAV_SECTIONS;

/** Alias for older tests / imports. */
export const INPATIENT_STICKY_NAV_SECTIONS = INPATIENT_CLINICAL_PRIMARY_NAV_SECTIONS;

/** Legacy sticky destination that resolves to Overview (engine retained). */
export const INPATIENT_OVERVIEW_REDIRECT_SECTIONS: readonly InpatientWorkspaceSection[] = [
  "timeline",
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

/** Map sticky-removed sections to Overview while preserving deep-link parseability. */
export function resolveInpatientWorkspaceSection(
  raw: string | null | undefined
): InpatientWorkspaceSection | null {
  const parsed = parseInpatientWorkspaceSection(raw);
  if (!parsed) return null;
  if (INPATIENT_OVERVIEW_REDIRECT_SECTIONS.includes(parsed)) return "overview";
  return parsed;
}
