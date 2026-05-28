import { apiFetch } from "@/lib/apiClient";
import type {
  BillingClassification,
  BillingRouteReason,
  ClaimExportRoute,
  ClaimFormReadiness,
} from "@medora/shared";

export type EncounterBillingExportReadinessPayload = {
  encounterId: string;
  facilityId: string;
  billingClassification: BillingClassification;
  route: ClaimExportRoute;
  formReadiness: ClaimFormReadiness;
  reasons: BillingRouteReason[];
  warnings: BillingRouteReason[];
  requiresManualReview: boolean;
  missingItems: BillingRouteReason[];
  facilityBillingIdentityComplete: boolean;
  hasPrimaryDiagnosis: boolean;
  hasProcedureCodes: boolean;
  hasPayer: boolean;
  previewOnly: true;
};

export async function fetchEncounterBillingExportReadiness(
  facilityId: string,
  encounterId: string,
): Promise<EncounterBillingExportReadinessPayload> {
  return apiFetch(`/encounters/${encounterId}/billing-readiness`, {
    facilityId,
  }) as Promise<EncounterBillingExportReadinessPayload>;
}
