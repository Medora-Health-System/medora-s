import { z } from "zod";

/** MAR modal / API — aligned with `MedicationAdministrationTab` `MarAction`. */
export const marClinicalActionValues = ["administered", "refused", "not_available", "md_changed"] as const;
export type MarClinicalAction = (typeof marClinicalActionValues)[number];

export const marClinicalActionSchema = z.enum(marClinicalActionValues);

function firstLineAfterActionColon(notes: string | null | undefined): string {
  if (!notes || typeof notes !== "string") return "";
  const firstLine = notes.split("\n")[0] ?? "";
  const idx = firstLine.indexOf(":");
  if (idx < 0) return "";
  return firstLine.slice(idx + 1).trim();
}

/** First-line labels produced by MAR UI (`buildMarNotes`) in EN and FR. */
const ADMINISTERED_LABELS = new Set(["Administered", "Administré"]);
const REFUSED_LABELS = new Set(["Patient refused", "Patient refusé"]);
const NOT_AVAILABLE_LABELS = new Set(["Not available", "Non disponible"]);
const MD_CHANGED_LABELS = new Set(["Changed by physician", "Modifié par le médecin"]);

/**
 * Best-effort parse of `MedicationAdministration.notes` (legacy rows had no structured field).
 * Unknown / empty → `administered` (historical MAR rows were administration documentation).
 */
export function deriveMarClinicalActionFromNotes(notes: string | null | undefined): MarClinicalAction {
  const tail = firstLineAfterActionColon(notes);
  if (REFUSED_LABELS.has(tail)) return "refused";
  if (NOT_AVAILABLE_LABELS.has(tail)) return "not_available";
  if (MD_CHANGED_LABELS.has(tail)) return "md_changed";
  if (ADMINISTERED_LABELS.has(tail)) return "administered";
  return "administered";
}

/**
 * Primary MAR outcome: explicit `marAction` from persistence when present; otherwise legacy notes parse.
 * New writes must always persist `marAction` on the administration row (API / DB).
 */
export function resolveMedicationMarActionFromStorage(input: {
  marAction?: string | null;
  notes?: string | null;
}): MarClinicalAction {
  const raw = typeof input.marAction === "string" ? input.marAction.trim() : "";
  if (raw && (marClinicalActionValues as readonly string[]).includes(raw)) {
    return raw as MarClinicalAction;
  }
  return deriveMarClinicalActionFromNotes(input.notes);
}
