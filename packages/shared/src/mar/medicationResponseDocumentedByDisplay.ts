/** MEDUI.MAR.MEDICATION_RESPONSE_POST_SUBMIT_UX_FINALIZATION.1 */

import type { ParsedMarMedicationResponse } from "./marMedicationResponseGovernance.js";

/** Derive initials from a display name (e.g. "Elizabeth Posada RN" → "EP"). */
export function derivePersonInitials(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  const initials = parts
    .map((part) => part.replace(/[^A-Za-zÀ-ÿ]/g, "").charAt(0))
    .filter(Boolean)
    .join("")
    .toUpperCase();
  return initials.slice(0, 4) || null;
}

export type MedicationResponseDocumentedByInput = Pick<
  ParsedMarMedicationResponse,
  "documentedBy" | "documentedByInitials" | "documentedByDisplayName"
>;

/** Best available documented-by label for response summary display. */
export function resolveMedicationResponseDocumentedByLabel(
  response: MedicationResponseDocumentedByInput
): string | null {
  const initials = response.documentedByInitials?.trim();
  if (initials) return initials;

  const displayName = response.documentedByDisplayName?.trim();
  if (displayName) {
    return derivePersonInitials(displayName) ?? displayName;
  }

  const fullName = response.documentedBy?.trim();
  if (fullName) {
    return derivePersonInitials(fullName) ?? fullName;
  }

  return null;
}
