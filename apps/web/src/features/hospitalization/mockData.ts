/**
 * Données fictives — UI maquette hospitalisation uniquement (aucun appel API).
 */

export type HospitalizationAcuity = "critical" | "monitoring" | "stable";

export type MockHospitalizationPatient = {
  id: string;
  room: string;
  unit: string;
  patientName: string;
  /** Motif / plainte principale (affichage carte). */
  chiefComplaint: string;
  physician: string;
  /** « — » ou « Non assigné » pour la maquette. */
  nurseDisplay: string;
  acuity: HospitalizationAcuity;
  /** Libellé court âge + sexe */
  ageSex: string;
  esi: number | null;
  /** Heure d’arrivée affichée (HH:mm). */
  arrivalTime: string;
};

export const MOCK_UNITS = ["Médecine A", "Chirurgie B", "Urgences"] as const;

export const MOCK_PHYSICIANS = ["Dr. Jean Paul", "Dr. Marie Dubois", "Dr. H. Joseph"] as const;

export const MOCK_HOSPITALIZATION_ROWS: MockHospitalizationPatient[] = [
  {
    id: "mock-1",
    room: "312A",
    unit: "Médecine A",
    patientName: "Sophie Bernard",
    chiefComplaint: "Pneumonie communautaire — dyspnée",
    physician: "Dr. Jean Paul",
    nurseDisplay: "—",
    acuity: "critical",
    ageSex: "42 ans • F",
    esi: 2,
    arrivalTime: "08:12",
  },
  {
    id: "mock-2",
    room: "205",
    unit: "Chirurgie B",
    patientName: "Marc Volcy",
    chiefComplaint: "Suivi post-op appendicectomie",
    physician: "Dr. Marie Dubois",
    nurseDisplay: "Non assigné",
    acuity: "monitoring",
    ageSex: "31 ans • M",
    esi: 3,
    arrivalTime: "09:45",
  },
  {
    id: "mock-3",
    room: "U-04",
    unit: "Urgences",
    patientName: "Rosemond C.",
    chiefComplaint: "Douleur thoracique — observation",
    physician: "Dr. H. Joseph",
    nurseDisplay: "—",
    acuity: "monitoring",
    ageSex: "58 ans • M",
    esi: 3,
    arrivalTime: "11:20",
  },
  {
    id: "mock-4",
    room: "118",
    unit: "Médecine A",
    patientName: "Judith Pierre",
    chiefComplaint: "HTA — réglage traitement",
    physician: "Dr. Jean Paul",
    nurseDisplay: "Inf. C. Laurent",
    acuity: "stable",
    ageSex: "67 ans • F",
    esi: 4,
    arrivalTime: "07:55",
  },
  {
    id: "mock-5",
    room: "401",
    unit: "Chirurgie B",
    patientName: "Wilson J.",
    chiefComplaint: "Convalescence post-fracture",
    physician: "Dr. Marie Dubois",
    nurseDisplay: "—",
    acuity: "stable",
    ageSex: "29 ans • M",
    esi: 4,
    arrivalTime: "10:03",
  },
];
