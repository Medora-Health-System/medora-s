/** Après enregistrement d’un résultat labo/imagerie — recharger le résumé dossier patient. */
export const MEDORA_CHART_RESULT_UPDATED = "medora-chart-result-updated";

export type MedoraChartResultDetail = { patientId?: string; encounterId?: string };

/** Après mise à jour démographique / inscription (PATCH patient) — rafraîchir chart ou espace inscription. */
export const MEDORA_PATIENT_PROFILE_UPDATED = "medora-patient-profile-updated";

export type MedoraPatientProfileUpdatedDetail = { patientId: string };
