/** Routes URGENCES — isolées du flux consultation générique. */

export function emergencyTrackboardPath(): string {
  return "/app/emergency/trackboard";
}

export function emergencyActiveWorkspacePath(encounterId: string): string {
  return `/app/emergency/active/${encodeURIComponent(encounterId)}`;
}

/** Dossier / charte urgence complet (toutes les zones ER). */
export function emergencyChartPath(encounterId: string): string {
  return `/app/emergency/chart/${encodeURIComponent(encounterId)}`;
}

/** Dossier consultation Medora générique (secondaire pour l’urgence). */
export function genericEncounterPath(encounterId: string): string {
  return `/app/encounters/${encodeURIComponent(encounterId)}`;
}
