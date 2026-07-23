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
  "DIRECT_ADMISSION_SCHEMA_INCOMPATIBLE",
  "DIRECT_ADMISSION_DISABLED",
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
  DIRECT_ADMISSION_SCHEMA_INCOMPATIBLE:
    "L'admission hospitalière n'a pas pu être créée car la base de données de l'établissement n'a pas terminé une mise à jour de compatibilité requise. Aucune admission n'a été finalisée. Contactez l'administration système et fournissez la référence de support.",
  DIRECT_ADMISSION_DISABLED:
    "L'admission directe est désactivée pour cet environnement. Contactez un administrateur.",
};

export const DIRECT_ADMISSION_ERROR_MESSAGES_EN: Record<DirectAdmissionErrorCode, string> = {
  PATIENT_NOT_FOUND_IN_FACILITY:
    "Patient not found at this facility. Check selection and active facility session.",
  SOURCE_ED_ENCOUNTER_NOT_FOUND:
    "The source ED encounter was not found or does not belong to this patient.",
  ATTENDING_NOT_FOUND: "The selected attending provider is not valid at this facility.",
  ENCOUNTER_NOT_FOUND: "Encounter not found.",
  BED_NOT_FOUND: "The selected bed was not found or is no longer assignable.",
  UNIT_NOT_FOUND: "The requested unit was not found.",
  DIRECT_ADMISSION_ROUTE_NOT_DEPLOYED:
    "The deployed API does not support this admission operation.",
  DIRECT_ADMISSION_SCHEMA_INCOMPATIBLE:
    "The inpatient admission could not be created because the hospital database has not completed a required compatibility update. No admission was finalized. Contact system administration and provide the support reference.",
  DIRECT_ADMISSION_DISABLED:
    "Direct inpatient admission is disabled for this environment. Contact an administrator.",
};

export function isDirectAdmissionErrorCode(raw: unknown): raw is DirectAdmissionErrorCode {
  return (
    typeof raw === "string" &&
    (DIRECT_ADMISSION_ERROR_CODES as readonly string[]).includes(raw)
  );
}
