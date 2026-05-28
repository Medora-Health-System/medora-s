import { apiFetch } from "@/lib/apiClient";
import type {
  BillingClassification,
  BillingLedgerReason,
  BillingLedgerReadinessStatus,
  ClaimExportRoute,
} from "@medora/shared";

export type BillingLedgerSidePayload = {
  applies: boolean;
  status: BillingLedgerReadinessStatus;
  reasons: BillingLedgerReason[];
  warnings: BillingLedgerReason[];
};

export type EncounterBillingLedgerReadinessPayload = {
  encounterId: string;
  facilityId: string;
  billingClassification: BillingClassification;
  exportRoute: ClaimExportRoute;
  professional: BillingLedgerSidePayload;
  facility: BillingLedgerSidePayload;
  overallStatus: BillingLedgerReadinessStatus;
  requiresManualReview: boolean;
  exportGrouping: {
    professionalPackagePreview: boolean;
    facilityPackagePreview: boolean;
  };
  ledgerPreview: {
    professionalLineCount: number;
    facilityLineCount: number;
  };
  previewOnly: true;
};

export async function fetchEncounterBillingLedgerReadiness(
  facilityId: string,
  encounterId: string,
): Promise<EncounterBillingLedgerReadinessPayload> {
  return apiFetch(`/encounters/${encounterId}/billing-ledger-readiness`, {
    facilityId,
  }) as Promise<EncounterBillingLedgerReadinessPayload>;
}
