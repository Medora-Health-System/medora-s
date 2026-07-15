/** Routes URGENCES — isolées du flux consultation générique. */

import type { ErWorkspaceSection } from "@/features/emergency/erWorkspaceSections";

export function emergencyTrackboardPath(): string {
  return "/app/emergency/trackboard";
}

export function emergencyActiveWorkspacePath(
  encounterId: string,
  options?: { section?: ErWorkspaceSection }
): string {
  const base = `/app/emergency/active/${encodeURIComponent(encounterId)}`;
  const section = options?.section?.trim();
  if (section) {
    return `${base}?section=${encodeURIComponent(section)}`;
  }
  return base;
}

/** Dossier / charte urgence complet (toutes les zones ER). */
export function emergencyChartPath(encounterId: string): string {
  return `/app/emergency/chart/${encodeURIComponent(encounterId)}`;
}

/** Dossier consultation Medora générique (secondaire pour l’urgence). */
export function genericEncounterPath(encounterId: string): string {
  return `/app/encounters/${encodeURIComponent(encounterId)}`;
}

/**
 * Primary patient-name destination from ED boards.
 * Closed → read-only chart; open / incomplete → active workspace.
 */
export function resolveEdBoardPatientNameHref(input: {
  encounterId: string;
  status?: string | null;
  workflowState?: string | null;
}): string {
  const closed =
    input.status === "CLOSED" ||
    input.workflowState === "CLOSED" ||
    input.status === "SIGNED";
  if (closed) return emergencyChartPath(input.encounterId);
  return emergencyActiveWorkspacePath(input.encounterId);
}
