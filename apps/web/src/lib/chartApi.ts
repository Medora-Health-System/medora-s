import { apiFetch } from "./apiClient";
import type { ObservationOperationalSnapshot, ObservationStaySummaryForExport } from "@medora/shared";

/** Compact order line for patient chart timeline (catalog labels embedded). */
export type ChartSummaryOrderItem = {
  id: string;
  catalogItemType: string;
  status: string;
  /** @deprecated Prefer `displayLabelFr` / `displayLabelEn` with locale; kept as French-first for legacy. */
  displayLabel: string;
  displayLabelFr?: string;
  displayLabelEn?: string;
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
    attachmentSummaryEn?: string | null;
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
  authority?: {
    source?: string | null;
    readbackConfirmed?: boolean | null;
    protocolName?: string | null;
  } | null;
  createdByDisplay?: { userId?: string | null; name?: string | null; role?: string | null; at?: string | null } | null;
  lastActionDisplay?: { action?: string | null; name?: string | null; role?: string | null; at?: string | null } | null;
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
  sortOrder?: number;
  codeSource?: string;
};

export type ChartEncounterMedicationDispense = {
  id: string;
  encounterId: string;
  quantityDispensed: number;
  doseValue?: number | null;
  doseUnit?: string | null;
  billingQuantity?: number | null;
  quantityUnit?: string | null;
  ndc11Snapshot?: string | null;
  ndcDisplaySnapshot?: string | null;
  dosageInstructions: string | null;
  dispensedAt: string;
  catalogMedication: {
    code: string;
    name: string;
    displayNameEn?: string | null;
    displayNameFr?: string | null;
  };
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
  /** Phase 13C — additive observation stay / LOS (INPATIENT observation path). */
  observationStaySummary?: ObservationStaySummaryForExport;
  /** Open INPATIENT only — operational flags from shared snapshot. */
  observationOperational?: ObservationOperationalSnapshot | null;
};

/** Ligne d’historique d’audit (dossier patient — lecture seule, V1). */
export type ChartAuditTimelineItem = {
  id: string;
  action: string;
  createdAt: string;
  userDisplayFr: string | null;
  /** Display line — mapped from JSON `shortLabelFr` until bilingual API titles exist. */
  shortLabel: string;
  detailFr: string | null;
  encounterId: string | null;
  entityType: string;
  entityId: string | null;
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
    doseValue?: number | null;
    doseUnit?: string | null;
    billingQuantity?: number | null;
    quantityUnit?: string | null;
    ndc11Snapshot?: string | null;
    ndcDisplaySnapshot?: string | null;
    dosageInstructions: string | null;
    dispensedAt: string;
    catalogMedication: {
      code: string;
      name: string;
      displayNameEn?: string | null;
      displayNameFr?: string | null;
    };
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
  /** Derniers événements d’audit pertinents (max 50), du plus récent au plus ancien. */
  auditTimeline?: ChartAuditTimelineItem[];
};

function normalizeAuditTimelineEntries(
  list: ChartAuditTimelineItem[] | undefined
): ChartAuditTimelineItem[] | undefined {
  if (!list?.length) return list;
  return list.map((it) => {
    const fromApi = it as ChartAuditTimelineItem & { shortLabelFr?: string };
    return {
      ...it,
      shortLabel: (it.shortLabel?.trim() || fromApi.shortLabelFr || "").trim(),
    };
  });
}

export async function fetchChartSummary(
  facilityId: string,
  patientId: string
): Promise<ChartSummary> {
  const data = (await apiFetch(`/patients/${patientId}/chart-summary`, {
    facilityId,
  })) as ChartSummary;
  if (data.auditTimeline?.length) {
    data.auditTimeline = normalizeAuditTimelineEntries(data.auditTimeline) ?? [];
  }
  return data;
}

/** Timeline d’audit pour une consultation (GET /encounters/:id/audit-timeline) — ordre chronologique côté serveur. */
export async function fetchEncounterAuditTimeline(
  facilityId: string,
  encounterId: string
): Promise<ChartAuditTimelineItem[]> {
  const data = await apiFetch(`/encounters/${encounterId}/audit-timeline`, {
    facilityId,
  });
  if (!Array.isArray(data)) return [];
  return data.map((raw: Record<string, unknown>) => {
    const shortFromApi = raw.shortLabelFr ?? raw.shortLabel;
    return {
      ...(raw as object),
      shortLabel: typeof shortFromApi === "string" ? shortFromApi : "",
    } as ChartAuditTimelineItem;
  });
}

export type CreateDiagnosisBody = {
  code?: string;
  description?: string;
  onsetDate?: string;
  notes?: string;
  icd10CatalogId?: string;
  manualNonCatalog?: boolean;
  sortOrder?: number;
};

export async function createDiagnosis(facilityId: string, encounterId: string, body: CreateDiagnosisBody) {
  return apiFetch(`/encounters/${encounterId}/diagnoses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    facilityId,
  });
}

export type Icd10SearchHit = {
  id: string;
  code: string;
  shortDescription: string;
  longDescription: string | null;
  isBillable: boolean;
};

export async function searchIcd10Catalog(q: string, limit = 30): Promise<{ items: Icd10SearchHit[] }> {
  const params = new URLSearchParams({ q: q.trim(), limit: String(limit) });
  return apiFetch(`/diagnoses/icd10/search?${params.toString()}`) as Promise<{ items: Icd10SearchHit[] }>;
}

export async function reorderEncounterDiagnoses(facilityId: string, encounterId: string, orderedIds: string[]) {
  return apiFetch(`/encounters/${encounterId}/diagnoses/reorder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderedIds }),
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

export type BillingProcedureSearchHit = {
  id: string;
  code: string;
  normalizedCode: string;
  codeSystem: "CPT" | "HCPCS";
  shortDescription: string;
  longDescription: string | null;
  effectiveYear: number | null;
  codeSetVersion: string | null;
};

export async function searchBillingProcedureCodes(
  facilityId: string,
  q: string,
  limit = 30,
  system?: "CPT" | "HCPCS"
): Promise<{ items: BillingProcedureSearchHit[] }> {
  const params = new URLSearchParams({ q: q.trim(), limit: String(limit) });
  if (system) params.set("system", system);
  return apiFetch(`/billing/procedure-codes/search?${params.toString()}`, { facilityId }) as Promise<{
    items: BillingProcedureSearchHit[];
  }>;
}

export type AppendProcedureCaptureBody =
  | { billingProcedureCodeId: string; modifiers?: string[]; units?: number }
  | {
      manualNonCatalog: true;
      code: string;
      codeSystem: "CPT" | "HCPCS";
      description?: string;
      modifiers?: string[];
      units?: number;
    };

export type AppendProcedureCaptureResult =
  | { duplicateBlocked: true; reasonCode: "PROCEDURE_DUPLICATE_BLOCKED" }
  | { duplicateBlocked: false; captureItemId: string };

export async function appendProcedureCapture(
  facilityId: string,
  encounterId: string,
  body: AppendProcedureCaptureBody
): Promise<AppendProcedureCaptureResult> {
  return apiFetch(`/encounters/${encounterId}/procedure-capture`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    facilityId,
  }) as Promise<AppendProcedureCaptureResult>;
}
