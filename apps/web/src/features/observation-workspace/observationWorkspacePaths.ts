/**
 * D3D — Observation clinical workspace routes (under Hospital Care).
 */

export const OBSERVATION_CENSUS_PATH = "/app/hospitalisation/observation";

export function observationActiveWorkspacePath(encounterId: string): string {
  return `/app/hospitalisation/observation/active/${encodeURIComponent(encounterId)}`;
}

export function isObservationWorkspaceEnabledInBrowser(): boolean {
  const v = String(process.env.NEXT_PUBLIC_OBSERVATION_WORKSPACE_ENABLED ?? "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}
