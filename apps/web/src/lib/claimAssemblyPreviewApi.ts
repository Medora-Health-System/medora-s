import { apiFetch } from "@/lib/apiClient";
import type {
  BillingClassification,
  ChargeCaptureReviewResult,
  ClaimAssemblyPackagePreview,
  ClaimAssemblyPackageType,
  ClaimAssemblyPreviewStatus,
  ClaimAssemblyReason,
  CodingIntegrityReviewResult,
} from "@medora/shared";
import type { EncounterBillingExportReadinessPayload } from "@/lib/billingExportReadinessApi";
import type { EncounterBillingLedgerReadinessPayload } from "@/lib/billingLedgerReadinessApi";
import type { EncounterFacilityFeeReadinessPayload } from "@/lib/facilityFeeReadinessApi";

export type ClaimAssemblyPreviewQueueRow = {
  encounterId: string;
  encounterDate: string;
  billingClassification: BillingClassification;
  status: ClaimAssemblyPreviewStatus;
  packageType: ClaimAssemblyPackageType;
  professionalReady: boolean;
  facilityReady: boolean;
  professionalPackage: ClaimAssemblyPackagePreview;
  facilityPackage: ClaimAssemblyPackagePreview;
  reasons: ClaimAssemblyReason[];
  warnings: ClaimAssemblyReason[];
  requiresManualReview: boolean;
  missingItemsCount: number;
  nextOperationalAction: ClaimAssemblyPreviewStatus;
  previewOnly: true;
};

export type EncounterClaimAssemblyPreviewPayload = ClaimAssemblyPreviewQueueRow & {
  exportReadiness: EncounterBillingExportReadinessPayload;
  ledgerReadiness: EncounterBillingLedgerReadinessPayload;
  facilityFeeReadiness: EncounterFacilityFeeReadinessPayload;
  chargeReview: ChargeCaptureReviewResult & { previewOnly: true };
  codingReview: CodingIntegrityReviewResult & { previewOnly: true };
  previewOnly: true;
};

export type ClaimAssemblyPreviewQueueFilters = {
  status?: ClaimAssemblyPreviewStatus;
  packageType?: ClaimAssemblyPackageType;
  billingClassification?: BillingClassification;
  dateFrom?: string;
  dateTo?: string;
  manualReviewOnly?: boolean;
  professionalOnly?: boolean;
  facilityOnly?: boolean;
  limit?: number;
};

export type ClaimAssemblyPreviewQueuePayload = {
  rows: ClaimAssemblyPreviewQueueRow[];
  previewOnly: true;
};

function buildQuery(filters: ClaimAssemblyPreviewQueueFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.packageType) params.set("packageType", filters.packageType);
  if (filters.billingClassification) params.set("billingClassification", filters.billingClassification);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.manualReviewOnly) params.set("manualReviewOnly", "true");
  if (filters.professionalOnly) params.set("professionalOnly", "true");
  if (filters.facilityOnly) params.set("facilityOnly", "true");
  if (filters.limit != null) params.set("limit", String(filters.limit));
  const q = params.toString();
  return q ? `?${q}` : "";
}

export async function fetchClaimAssemblyPreviewQueue(
  facilityId: string,
  filters: ClaimAssemblyPreviewQueueFilters = {},
): Promise<ClaimAssemblyPreviewQueuePayload> {
  return apiFetch(`/billing/claim-assembly-preview${buildQuery(filters)}`, {
    facilityId,
  }) as Promise<ClaimAssemblyPreviewQueuePayload>;
}

export async function fetchEncounterClaimAssemblyPreview(
  facilityId: string,
  encounterId: string,
): Promise<EncounterClaimAssemblyPreviewPayload> {
  return apiFetch(`/encounters/${encounterId}/claim-assembly-preview`, {
    facilityId,
  }) as Promise<EncounterClaimAssemblyPreviewPayload>;
}
