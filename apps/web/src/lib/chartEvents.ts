/** Après enregistrement d’un résultat labo/imagerie — recharger le résumé dossier patient. */
export const MEDORA_CHART_RESULT_UPDATED = "medora-chart-result-updated";

export type MedoraChartResultDetail = { patientId?: string; encounterId?: string };
