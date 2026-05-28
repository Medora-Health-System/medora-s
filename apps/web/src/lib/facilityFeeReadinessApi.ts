import { apiFetch } from "@/lib/apiClient";
import type {
  BillingClassification,
  ClaimExportRoute,
  FacilityFeeOperationalCategory,
  FacilityFeeOperationalFlags,
  FacilityFeeReadinessStatus,
  FacilityFeeReason,
  ObservationOperationalStatus,
} from "@medora/shared";

export type EncounterFacilityFeeReadinessPayload = {
  encounterId: string;
  facilityId: string;
  billingClassification: BillingClassification;
  exportRoute: ClaimExportRoute;
  facilityFeeCategory: FacilityFeeOperationalCategory;
  observationOperationalStatus: ObservationOperationalStatus;
  readinessStatus: FacilityFeeReadinessStatus;
  reasons: FacilityFeeReason[];
  warnings: FacilityFeeReason[];
  requiresManualReview: boolean;
  operationalFlags: FacilityFeeOperationalFlags;
  previewOnly: true;
};

export async function fetchEncounterFacilityFeeReadiness(
  facilityId: string,
  encounterId: string,
): Promise<EncounterFacilityFeeReadinessPayload> {
  return apiFetch(`/encounters/${encounterId}/facility-fee-readiness`, {
    facilityId,
  }) as Promise<EncounterFacilityFeeReadinessPayload>;
}
