/**
 * Stable, PHI-safe error codes for POST /inpatient-operations/direct-admission.
 * Messages are French for Nest responses; web may map codes to i18n.
 */

export const DIRECT_ADMISSION_ERROR_CODES = [
  "PATIENT_NOT_FOUND_IN_FACILITY",
  "SOURCE_ED_ENCOUNTER_NOT_FOUND",
  "ATTENDING_NOT_FOUND",
  "ENCOUNTER_NOT_FOUND",
  "BED_NOT_FOUND",
  "UNIT_NOT_FOUND",
  "DIRECT_ADMISSION_ROUTE_NOT_DEPLOYED",
] as const;

export type DirectAdmissionErrorCode = (typeof DIRECT_ADMISSION_ERROR_CODES)[number];

export const DIRECT_ADMISSION_ERROR_MESSAGES_FR: Record<DirectAdmissionErrorCode, string> = {
  PATIENT_NOT_FOUND_IN_FACILITY:
    "Patient introuvable dans cet établissement. Vérifiez la sélection et le site de connexion.",
  SOURCE_ED_ENCOUNTER_NOT_FOUND:
    "La rencontre urgences source est introuvable ou n'appartient pas à ce patient.",
  ATTENDING_NOT_FOUND:
    "Le médecin traitant sélectionné n'est pas valide dans cet établissement.",
  ENCOUNTER_NOT_FOUND: "Rencontre introuvable.",
  BED_NOT_FOUND: "Le lit sélectionné est introuvable ou n'est plus assignable.",
  UNIT_NOT_FOUND: "L'unité demandée est introuvable.",
  DIRECT_ADMISSION_ROUTE_NOT_DEPLOYED:
    "L'API déployée ne prend pas en charge cette opération d'admission.",
};

export function isDirectAdmissionErrorCode(raw: unknown): raw is DirectAdmissionErrorCode {
  return (
    typeof raw === "string" &&
    (DIRECT_ADMISSION_ERROR_CODES as readonly string[]).includes(raw)
  );
}
