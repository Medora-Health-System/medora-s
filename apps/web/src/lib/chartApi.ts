import { apiFetch } from "./apiClient";

/** Compact order line for patient chart timeline (catalog labels embedded). */
export type ChartSummaryOrderItem = {
  id: string;
  catalogItemType: string;
  status: string;
  displayLabel: string;
  medicationFulfillmentIntent: string | null;
  completedAt: string | null;
  completedBy: { firstName: string; lastName: string } | null;
  /** Renseignés lorsque la commande parente est annulée (réplication pour affichage liste / filtre). */
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  cancelledByDisplayFr?: string | null;
  result: {
    resultText: string | null;
    verifiedAt: string | null;
    criticalValue: boolean;
    /** Nom du professionnel ayant saisi / validé le résultat */
    enteredByDisplayFr?: string | null;
    attachmentSummaryFr?: string | null;
    /** Pièces jointes (avec ou sans base64 — message FR si fichier indisponible). */
    attachments?: Array<{
      fileName?: string | null;
      mimeType?: string | null;
      dataBase64?: string | null;
    }>;
  } | null;
};

export type ChartSummaryOrder = {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  cancelledByDisplayFr?: string | null;
  items: ChartSummaryOrderItem[];
};

export type ChartEncounterDiagnosis = {
  id: string;
  code: string;
  description: string | null;
  status: string;
  encounterId: string;
  createdAt: string;
};

export type ChartEncounterMedicationDispense = {
  id: string;
  encounterId: string;
  quantityDispensed: number;
  dosageInstructions: string | null;
  dispensedAt: string;
  catalogMedication: { code: string; name: string; displayNameFr?: string | null };
  dispensedBy?: { firstName: string; lastName: string } | null;
};

export type ChartSummaryEncounter = {
  id: string;
  type: string;
  status: string;
  visitReason: string | null;
  chiefComplaint: string | null;
  treatmentPlanPreview: string | null;
  clinicianImpressionPreview: string | null;
  /** DRAFT | SIGNED — chart API */
  providerDocumentationStatus?: string;
  providerDocumentationSignedAt?: string | null;
  providerDocumentationSignedByDisplayFr?: string | null;
  /** Append-only addenda after signature (V1). */
  providerAddenda?: Array<{
    id: string;
    text: string;
    createdAt: string;
    createdByDisplayFr: string | null;
  }>;
  followUpDate: string | null;
  createdAt: string;
  dischargedAt: string | null;
  dischargeStatus: string | null;
  roomLabel?: string | null;
  physicianAssignedUserId?: string | null;
  physicianAssigned?: { id: string; firstName: string; lastName: string } | null;
  nursingAssessment?: unknown;
  dischargeSummaryJson?: unknown;
  /** Dossier d'admission (depuis la consultation) */
  admissionSummaryJson?: unknown;
  admittedAt?: string | null;
  /** Présents côté API récent ; optionnel pour vieux caches hors-ligne. */
  encounterDiagnoses?: ChartEncounterDiagnosis[];
  orders?: ChartSummaryOrder[];
  encounterMedicationDispenses?: ChartEncounterMedicationDispense[];
  triage: {
    vitalsJson: Record<string, unknown> | null;
    triageCompleteAt: string | null;
    chiefComplaint: string | null;
    esi: number | null;
  } | null;
};

export type ChartSummary = {
  patient: {
    id: string;
    mrn: string | null;
    globalMrn: string | null;
    firstName: string;
    lastName: string;
    dob: string | null;
    phone: string | null;
    email: string | null;
    sexAtBirth: string | null;
    /** Dernier relevé dénormalisé (répli possible si /triage indisponible). */
    latestVitalsJson?: unknown;
    latestVitalsAt?: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    language: string | null;
    createdAt: string;
  };
  recentEncounters: ChartSummaryEncounter[];
  activeDiagnoses: Array<{
    id: string;
    code: string;
    description: string | null;
    onsetDate: string | null;
    notes: string | null;
    createdAt: string;
    encounter: { id: string; type: string; createdAt: string };
  }>;
  recentMedicationDispenses: Array<{
    id: string;
    encounterId: string;
    quantityDispensed: number;
    dosageInstructions: string | null;
    dispensedAt: string;
    catalogMedication: { code: string; name: string; displayNameFr?: string | null };
    inventoryItem: { sku: string; lotNumber: string | null } | null;
    dispensedBy?: { firstName: string; lastName: string } | null;
  }>;
  recentVaccinations: Array<{
    id: string;
    doseNumber: number | null;
    lotNumber: string | null;
    administeredAt: string;
    nextDueAt: string | null;
    vaccineCatalog: { code: string; name: string };
  }>;
};

export async function fetchChartSummary(
  facilityId: string,
  patientId: string
): Promise<ChartSummary> {
  return apiFetch(`/patients/${patientId}/chart-summary`, {
    facilityId,
  }) as Promise<ChartSummary>;
}

export async function createDiagnosis(
  facilityId: string,
  encounterId: string,
  body: { code: string; description?: string; onsetDate?: string; notes?: string }
) {
  return apiFetch(`/encounters/${encounterId}/diagnoses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    facilityId,
  });
}

export async function resolveDiagnosis(
  facilityId: string,
  diagnosisId: string
) {
  return apiFetch(`/diagnoses/${diagnosisId}/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    facilityId,
  });
}
