import { apiFetch } from "@/lib/apiClient";
import type { BillingClassification, FacilityBillingClassificationMode } from "@medora/shared";

export type FacilityBillingWorkflowPayload = {
  facilityId: string;
  facilityName: string;
  billingClassificationMode: FacilityBillingClassificationMode | null;
  billingSiteType: string | null;
  allowedEncounterBillingClassifications: BillingClassification[];
  allowUrgentCareToEmergencyUpgrade: boolean;
  requireUcToEdPatientAcknowledgement: boolean;
  showEncounterBillingControls: boolean;
};

export type BillingClassificationOptionsPayload = {
  currentClassification: BillingClassification;
  allowedTargets: BillingClassification[];
  showControls: boolean;
  allowChange: boolean;
  requireAcknowledgment: boolean;
  facilityConfig: {
    billingClassificationMode: FacilityBillingClassificationMode | null;
    allowUrgentCareToEmergencyUpgrade: boolean;
    showEncounterBillingControls: boolean;
  };
};

export async function fetchFacilityBillingWorkflow(facilityId: string): Promise<FacilityBillingWorkflowPayload> {
  return apiFetch("/facilities/billing-workflow", { facilityId }) as Promise<FacilityBillingWorkflowPayload>;
}

export async function fetchAdminFacilityBillingWorkflow(
  headerFacilityId: string,
  targetFacilityId: string,
): Promise<FacilityBillingWorkflowPayload> {
  return apiFetch(`/admin/facilities/${targetFacilityId}/billing-workflow`, {
    facilityId: headerFacilityId,
  }) as Promise<FacilityBillingWorkflowPayload>;
}

export async function patchAdminFacilityBillingWorkflow(
  headerFacilityId: string,
  targetFacilityId: string,
  body: Record<string, unknown>,
): Promise<FacilityBillingWorkflowPayload> {
  return apiFetch(`/admin/facilities/${targetFacilityId}/billing-workflow`, {
    facilityId: headerFacilityId,
    method: "PATCH",
    body: JSON.stringify(body),
  }) as Promise<FacilityBillingWorkflowPayload>;
}

export async function fetchBillingClassificationOptions(
  facilityId: string,
  encounterId: string,
): Promise<BillingClassificationOptionsPayload> {
  return apiFetch(`/encounters/${encounterId}/billing-classification/options`, {
    facilityId,
  }) as Promise<BillingClassificationOptionsPayload>;
}

export async function patchBillingClassification(
  facilityId: string,
  encounterId: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  return apiFetch(`/encounters/${encounterId}/billing-classification`, {
    facilityId,
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
