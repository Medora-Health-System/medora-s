import { apiFetch } from "@/lib/apiClient";
import type {
  BillingClassification,
  BillingLedgerReadinessStatus,
  ChargeReviewDomain,
  ChargeReviewReason,
  ChargeReviewStatus,
  FacilityFeeReadinessStatus,
} from "@medora/shared";
import type { EncounterBillingExportReadinessPayload } from "@/lib/billingExportReadinessApi";
import type { EncounterBillingLedgerReadinessPayload } from "@/lib/billingLedgerReadinessApi";
import type { EncounterFacilityFeeReadinessPayload } from "@/lib/facilityFeeReadinessApi";

export type ChargeReviewEventCounts = {
  professionalEventCount: number;
  facilityEventCount: number;
  unknownSideEventCount: number;
  procedureCodeCount: number;
};

export type ChargeReviewQueueRow = {
  encounterId: string;
  patientDisplaySafeLabel: string;
  encounterDate: string;
  billingClassification: BillingClassification;
  chargeReviewStatus: ChargeReviewStatus;
  domains: ChargeReviewDomain[];
  reasons: ChargeReviewReason[];
  warnings: ChargeReviewReason[];
  professionalStatus: BillingLedgerReadinessStatus;
  facilityStatus: BillingLedgerReadinessStatus;
  facilityFeeStatus: FacilityFeeReadinessStatus;
  manualReviewRequired: boolean;
  missingItemsCount: number;
  previewOnly: true;
};

export type EncounterChargeReviewPayload = ChargeReviewQueueRow & {
  requiresCoderReview: boolean;
  requiresProviderClarification: boolean;
  requiresFacilityReview: boolean;
  hold: boolean;
  readyForReview: boolean;
  nextOperationalAction: ChargeReviewStatus;
  eventCounts: ChargeReviewEventCounts;
  exportReadiness: EncounterBillingExportReadinessPayload;
  ledgerReadiness: EncounterBillingLedgerReadinessPayload;
  facilityFeeReadiness: EncounterFacilityFeeReadinessPayload;
  previewOnly: true;
};

export type ChargeReviewQueueFilters = {
  status?: ChargeReviewStatus;
  domain?: ChargeReviewDomain;
  billingClassification?: BillingClassification;
  dateFrom?: string;
  dateTo?: string;
  encounterOpen?: boolean;
  manualReviewOnly?: boolean;
  limit?: number;
};

export type ChargeReviewQueuePayload = {
  rows: ChargeReviewQueueRow[];
  previewOnly: true;
};

function buildQuery(filters: ChargeReviewQueueFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.domain) params.set("domain", filters.domain);
  if (filters.billingClassification) params.set("billingClassification", filters.billingClassification);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.encounterOpen === true) params.set("encounterOpen", "true");
  if (filters.encounterOpen === false) params.set("encounterOpen", "false");
  if (filters.manualReviewOnly) params.set("manualReviewOnly", "true");
  if (filters.limit != null) params.set("limit", String(filters.limit));
  const q = params.toString();
  return q ? `?${q}` : "";
}

export async function fetchChargeReviewQueue(
  facilityId: string,
  filters: ChargeReviewQueueFilters = {},
): Promise<ChargeReviewQueuePayload> {
  return apiFetch(`/billing/charge-review${buildQuery(filters)}`, {
    facilityId,
  }) as Promise<ChargeReviewQueuePayload>;
}

export async function fetchEncounterChargeReview(
  facilityId: string,
  encounterId: string,
): Promise<EncounterChargeReviewPayload> {
  return apiFetch(`/encounters/${encounterId}/charge-review`, {
    facilityId,
  }) as Promise<EncounterChargeReviewPayload>;
}
