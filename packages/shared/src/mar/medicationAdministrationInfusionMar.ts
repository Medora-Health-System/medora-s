import { resolveMedicationMarActionFromStorage } from "./marClinicalAction.js";

/** French clinical note prefix for infusion START MAR rows (Phase 15F-B.1). */
export const INFUSION_START_MAR_NOTE_PREFIX = "Perfusion IV — début";

const TERMINAL_INFUSION_MAR_NOTE_PREFIX = "Perfusion IV terminée";

export type MedicationAdministrationInfusionPhaseValue = "INFUSION_START" | "INFUSION_STOP";

export type MedicationAdministrationInfusionPhaseChipKind = "start" | "stop";

export type MedicationAdministrationInfusionRowRef = {
  marAction?: string | null;
  notes?: string | null;
  infusionPhase?: string | null;
  infusionSessionKey?: string | null;
};

export function medicationAdministrationRowIsInfusionStart(
  notes: string | null | undefined,
  infusionPhase?: string | null
): boolean {
  if (infusionPhase === "INFUSION_START") return true;
  const t = notes?.trim() ?? "";
  return t.startsWith(INFUSION_START_MAR_NOTE_PREFIX);
}

export function medicationAdministrationRowIsInfusionStop(
  notes: string | null | undefined,
  infusionPhase?: string | null
): boolean {
  if (infusionPhase === "INFUSION_STOP") return true;
  return medicationAdministrationRowIsInfusionTerminal(notes);
}

export function medicationAdministrationRowIsInfusionTerminal(notes: string | null | undefined): boolean {
  const t = notes?.trim() ?? "";
  return t.startsWith(TERMINAL_INFUSION_MAR_NOTE_PREFIX);
}

/** UI chip kind for infusion phase rows; null for standard (non-infusion-phase) administrations. */
export function medicationAdministrationInfusionPhaseChipKind(
  row: MedicationAdministrationInfusionRowRef
): MedicationAdministrationInfusionPhaseChipKind | null {
  if (medicationAdministrationRowIsInfusionStart(row.notes, row.infusionPhase)) return "start";
  if (medicationAdministrationRowIsInfusionStop(row.notes, row.infusionPhase)) return "stop";
  return null;
}

/**
 * Terminal / completed medication administration for counts, overdue, and dose totals.
 * INFUSION_START rows are in-progress anchors — not completed administrations.
 */
export function medicationAdministrationCountsAsCompletedAdministration(
  row: MedicationAdministrationInfusionRowRef
): boolean {
  const marAction = resolveMedicationMarActionFromStorage({
    marAction: row.marAction ?? null,
    notes: row.notes ?? null,
  });
  if (marAction !== "administered") return false;
  if (medicationAdministrationRowIsInfusionStart(row.notes, row.infusionPhase)) return false;
  return true;
}
