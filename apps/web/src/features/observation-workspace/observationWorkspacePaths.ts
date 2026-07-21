/**
 * D3D / D3DA — Observation clinical workspace routes and browser flags.
 */

export const OBSERVATION_CENSUS_PATH = "/app/hospitalisation/observation";

export function observationActiveWorkspacePath(encounterId: string): string {
  return `/app/hospitalisation/observation/active/${encodeURIComponent(encounterId)}`;
}

function truthyPublicFlag(name: string): boolean {
  const v = String(process.env[name] ?? "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function isObservationWorkspaceEnabledInBrowser(): boolean {
  return truthyPublicFlag("NEXT_PUBLIC_OBSERVATION_WORKSPACE_ENABLED");
}

export function isObservationDepartmentalOrdersEnabledInBrowser(): boolean {
  return truthyPublicFlag("NEXT_PUBLIC_OBSERVATION_DEPARTMENTAL_ORDERS_ENABLED");
}

export function isObservationMarEnabledInBrowser(): boolean {
  return truthyPublicFlag("NEXT_PUBLIC_OBSERVATION_MAR_ENABLED");
}

export function isObservationDocumentationEnabledInBrowser(): boolean {
  return truthyPublicFlag("NEXT_PUBLIC_OBSERVATION_DOCUMENTATION_ENABLED");
}
