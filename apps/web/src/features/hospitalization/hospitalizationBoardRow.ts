/**
 * Presentation row for the V0 hospitalization board (`/app/hospitalization`).
 * Populated from `HospitalisationBoardEncounterRow` (API); not a mock-only shape.
 */

export type HospitalizationBoardAcuity = "critical" | "monitoring" | "stable";

export type HospitalizationBoardRow = {
  id: string;
  room: string;
  unit: string;
  patientName: string;
  /** Motif / plainte principale (affichage carte). */
  chiefComplaint: string;
  physician: string;
  /** Libellé infirmier affiché (ou « — »). */
  nurseDisplay: string;
  acuity: HospitalizationBoardAcuity;
  /** Libellé âge + sexe (format produit). */
  ageSex: string;
  esi: number | null;
  /** Heure d’arrivée affichée (HH:mm). */
  arrivalTime: string;
  /** Statut de consultation (valeur API, ex. OPEN). */
  status: string;
};
