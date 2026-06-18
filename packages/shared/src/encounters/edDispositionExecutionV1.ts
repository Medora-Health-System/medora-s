/**
 * ER disposition execution V1 — read helpers under `Encounter.nursingAssessment`.
 * Shared by ED lifecycle projection and web disposition workflows.
 */

export const ER_DISPOSITION_EXECUTION_V1_KEY = "erDispositionExecutionV1" as const;

export type ErDischargeSortieExecutionStored = {
  dischargeSortieCompletedAt: string;
  dischargeSortieCompletedByDisplayName: string;
  dischargeSortieExecutionNote?: string;
};

/** Read nursing discharge sortie execution (home / AMA physical departure signal). */
export function readEdDischargeSortieExecutionFromNursingAssessment(
  nursingAssessment: unknown
): ErDischargeSortieExecutionStored | null {
  if (!nursingAssessment || typeof nursingAssessment !== "object" || Array.isArray(nursingAssessment)) {
    return null;
  }
  const raw = (nursingAssessment as Record<string, unknown>)[ER_DISPOSITION_EXECUTION_V1_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const at = (raw as Record<string, unknown>).dischargeSortieCompletedAt;
  const by = (raw as Record<string, unknown>).dischargeSortieCompletedByDisplayName;
  if (typeof at !== "string" || typeof by !== "string") return null;
  const note = (raw as Record<string, unknown>).dischargeSortieExecutionNote;
  const out: ErDischargeSortieExecutionStored = {
    dischargeSortieCompletedAt: at,
    dischargeSortieCompletedByDisplayName: by,
  };
  if (typeof note === "string" && note.trim()) {
    out.dischargeSortieExecutionNote = note.trim();
  }
  return out;
}
