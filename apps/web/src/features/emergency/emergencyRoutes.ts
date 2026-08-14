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
 * Closed → ED chart archive adapter (enterprise CLOSED_READ_ONLY content).
 * OPEN (including signed provider documentation) → active workspace.
 * SIGNED ≠ CLOSED (D4C.8A).
 */
export function resolveEdBoardPatientNameHref(input: {
  encounterId: string;
  status?: string | null;
  workflowState?: string | null;
}): string {
  void input.workflowState;
  const status = String(input.status ?? "").trim().toUpperCase();
  if (status === "CLOSED" || status === "CANCELLED") {
    return emergencyChartPath(input.encounterId);
  }
  return emergencyActiveWorkspacePath(input.encounterId);
}
