/** Stable API error codes for medication IV infusion start/stop (M1.8B.7K.10B). */

export const MEDICATION_INFUSION_ERROR_CODES = [
  "NO_ACTIVE_INFUSION",
  "STOP_BEFORE_START",
  "INFUSION_ALREADY_STOPPED",
  "INVALID_STOP_TIME",
  "INVALID_START_TIME",
  "INFUSION_NOT_ELIGIBLE",
  "ORDER_LINE_TERMINAL",
] as const;

export type MedicationInfusionErrorCode = (typeof MEDICATION_INFUSION_ERROR_CODES)[number];

export function isMedicationInfusionErrorCode(raw: unknown): raw is MedicationInfusionErrorCode {
  return (
    typeof raw === "string" &&
    (MEDICATION_INFUSION_ERROR_CODES as readonly string[]).includes(raw.trim())
  );
}

/** Default French API messages (clinical product language). Clients should map `code` via i18n. */
export const MEDICATION_INFUSION_ERROR_MESSAGES_FR: Record<MedicationInfusionErrorCode, string> = {
  NO_ACTIVE_INFUSION: "Aucune perfusion en cours pour ce médicament.",
  STOP_BEFORE_START: "L'heure d'arrêt ne peut pas précéder le début de la perfusion.",
  INFUSION_ALREADY_STOPPED: "La perfusion est déjà arrêtée pour cette ligne.",
  INVALID_STOP_TIME: "Horodatage d'arrêt invalide.",
  INVALID_START_TIME: "Heure de début de perfusion invalide.",
  INFUSION_NOT_ELIGIBLE:
    "Cette ligne n'est pas éligible à la perfusion (voie / libellé). Utilisez l'administration au lit habituelle.",
  ORDER_LINE_TERMINAL: "Ligne déjà terminée ou annulée.",
};
