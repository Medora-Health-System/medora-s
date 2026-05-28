import { apiFetch } from "@/lib/apiClient";
import type {
  BillingClassification,
  ChargeCaptureReviewResult,
  CodingIntegrityDomain,
  CodingIntegrityReason,
  CodingIntegrityStatus,
  DocumentationCompletenessFlags,
} from "@medora/shared";
import type { EncounterBillingExportReadinessPayload } from "@/lib/billingExportReadinessApi";
import type { EncounterBillingLedgerReadinessPayload } from "@/lib/billingLedgerReadinessApi";
import type { EncounterFacilityFeeReadinessPayload } from "@/lib/facilityFeeReadinessApi";

export type CodingReviewQueueRow = {
  encounterId: string;
  encounterDate: string;
  billingClassification: BillingClassification;
  codingIntegrityStatus: CodingIntegrityStatus;
  domains: CodingIntegrityDomain[];
  reasons: CodingIntegrityReason[];
  warnings: CodingIntegrityReason[];
  requiresProviderClarification: boolean;
  requiresObservationReview: boolean;
  requiresComplianceReview: boolean;
  missingItemsCount: number;
  previewOnly: true;
};

export type EncounterCodingReviewPayload = CodingReviewQueueRow & {
  requiresFacilityReview: boolean;
  readyForCodingReview: boolean;
  hold: boolean;
  documentationCompleteness: DocumentationCompletenessFlags;
  exportReadiness: EncounterBillingExportReadinessPayload;
  ledgerReadiness: EncounterBillingLedgerReadinessPayload;
  facilityFeeReadiness: EncounterFacilityFeeReadinessPayload;
  chargeReview: ChargeCaptureReviewResult & { previewOnly: true };
  previewOnly: true;
};

export type CodingReviewQueueFilters = {
  status?: CodingIntegrityStatus;
  domain?: CodingIntegrityDomain;
  billingClassification?: BillingClassification;
  dateFrom?: string;
  dateTo?: string;
  observationOnly?: boolean;
  providerClarificationOnly?: boolean;
  complianceOnly?: boolean;
  limit?: number;
};

export type CodingReviewQueuePayload = {
  rows: CodingReviewQueueRow[];
  previewOnly: true;
};

function buildQuery(filters: CodingReviewQueueFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.domain) params.set("domain", filters.domain);
  if (filters.billingClassification) params.set("billingClassification", filters.billingClassification);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.observationOnly) params.set("observationOnly", "true");
  if (filters.providerClarificationOnly) params.set("providerClarificationOnly", "true");
  if (filters.complianceOnly) params.set("complianceOnly", "true");
  if (filters.limit != null) params.set("limit", String(filters.limit));
  const q = params.toString();
  return q ? `?${q}` : "";
}

export async function fetchCodingReviewQueue(
  facilityId: string,
  filters: CodingReviewQueueFilters = {},
): Promise<CodingReviewQueuePayload> {
  return apiFetch(`/coding/review-queue${buildQuery(filters)}`, {
    facilityId,
  }) as Promise<CodingReviewQueuePayload>;
}

export async function fetchEncounterCodingReview(
  facilityId: string,
  encounterId: string,
): Promise<EncounterCodingReviewPayload> {
  return apiFetch(`/encounters/${encounterId}/coding-review`, {
    facilityId,
  }) as Promise<EncounterCodingReviewPayload>;
}
