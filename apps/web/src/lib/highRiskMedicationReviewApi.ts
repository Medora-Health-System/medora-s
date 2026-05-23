import { apiFetch } from "./apiClient";

const API_BASE = "/medication-master/high-risk-review";

export type HighRiskMedicationQueueRow = {
  productId: string;
  productCode: string;
  medicationName: string;
  dose: string;
  form: string;
  classificationReasonCodes: string[];
  sourceFilename: string;
  sourceRowNumber: number;
  sourceRowKey: string;
  importedAt: string;
  facilityId: string;
  facilityName: string | null;
  duplicateWarning: string | null;
  isHighAlert: boolean;
  isControlled: boolean;
  governanceStatus: string;
};

export type HighRiskMedicationQueueResult = {
  rows: HighRiskMedicationQueueRow[];
  total: number;
};

export type HighRiskMedicationActionResult = {
  productId: string;
  governanceStatus: string;
  orderSearchEnabled: boolean;
  marEnabled: boolean;
  billingEnabled: boolean;
};

export async function fetchHighRiskMedicationQueue(
  facilityId: string
): Promise<HighRiskMedicationQueueResult> {
  const data = await apiFetch(`${API_BASE}?facilityId=${encodeURIComponent(facilityId)}`, {
    facilityId,
  });
  return data as HighRiskMedicationQueueResult;
}

export async function approveHighRiskCatalogOnly(
  productId: string,
  params: { facilityId: string; note: string }
): Promise<HighRiskMedicationActionResult> {
  const data = await apiFetch(`${API_BASE}/${productId}/approve-catalog`, {
    method: "POST",
    body: JSON.stringify(params),
    facilityId: params.facilityId,
  });
  return data as HighRiskMedicationActionResult;
}

export async function approveHighRiskProviderOrdering(
  productId: string,
  params: {
    facilityId: string;
    note: string;
    confirmProviderOrderingOnly: true;
    confirmMarRemainsOff: true;
    confirmBillingRemainsOff: true;
    confirmInventoryRemainsOff: true;
  }
): Promise<HighRiskMedicationActionResult> {
  const data = await apiFetch(`${API_BASE}/${productId}/approve-provider-ordering`, {
    method: "POST",
    body: JSON.stringify(params),
    facilityId: params.facilityId,
  });
  return data as HighRiskMedicationActionResult;
}

export async function rejectHighRiskMedication(
  productId: string,
  params: { facilityId: string; note: string }
): Promise<HighRiskMedicationActionResult> {
  const data = await apiFetch(`${API_BASE}/${productId}/reject`, {
    method: "POST",
    body: JSON.stringify(params),
    facilityId: params.facilityId,
  });
  return data as HighRiskMedicationActionResult;
}
