/**
 * D3E — Inpatient clinical workspace routes and browser flags.
 */

export const INPATIENT_CENSUS_PATH = "/app/hospitalisation/inpatient";

export function inpatientActiveWorkspacePath(encounterId: string): string {
  return `/app/hospitalisation/inpatient/active/${encodeURIComponent(encounterId)}`;
}

function truthyPublicFlag(name: string): boolean {
  const v = String(process.env[name] ?? "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function isInpatientWorkspaceEnabledInBrowser(): boolean {
  return truthyPublicFlag("NEXT_PUBLIC_INPATIENT_WORKSPACE_ENABLED");
}

export function isInpatientDepartmentalOrdersEnabledInBrowser(): boolean {
  return truthyPublicFlag("NEXT_PUBLIC_INPATIENT_DEPARTMENTAL_ORDERS_ENABLED");
}

export function isInpatientMarEnabledInBrowser(): boolean {
  return truthyPublicFlag("NEXT_PUBLIC_INPATIENT_MAR_ENABLED");
}

export function isInpatientDocumentationEnabledInBrowser(): boolean {
  return truthyPublicFlag("NEXT_PUBLIC_INPATIENT_DOCUMENTATION_ENABLED");
}

export function isInpatientNursingEnabledInBrowser(): boolean {
  return truthyPublicFlag("NEXT_PUBLIC_INPATIENT_NURSING_ENABLED");
}

export function isInpatientConsultsEnabledInBrowser(): boolean {
  return truthyPublicFlag("NEXT_PUBLIC_INPATIENT_CONSULTS_ENABLED");
}

export function isInpatientCarePlanEnabledInBrowser(): boolean {
  return truthyPublicFlag("NEXT_PUBLIC_INPATIENT_CARE_PLAN_ENABLED");
}

export function isInpatientDischargePlanningEnabledInBrowser(): boolean {
  return truthyPublicFlag("NEXT_PUBLIC_INPATIENT_DISCHARGE_PLANNING_ENABLED");
}
