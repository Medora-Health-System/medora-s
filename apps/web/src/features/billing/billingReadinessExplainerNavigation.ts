import type { BillingReadinessExplainerSuggestedAction } from "@medora/shared";

export type BillingReadinessExplainerLink = {
  href: string;
  labelKey: string;
};

export function resolveBillingReadinessExplainerActionLink(
  action: BillingReadinessExplainerSuggestedAction,
  encounterId: string,
  patientId?: string | null
): BillingReadinessExplainerLink {
  switch (action) {
    case "open_coding_review":
      return { href: "/app/billing/coding-review", labelKey: "billingPage.readinessExplainerOpenCodingReview" };
    case "open_charge_capture_review":
      return {
        href: "/app/billing/charge-review",
        labelKey: "billingPage.readinessExplainerOpenChargeCaptureReview",
      };
    case "open_manual_billing_review":
      return {
        href: "/app/billing/manual-review",
        labelKey: "billingPage.readinessExplainerOpenManualBillingReview",
      };
    case "open_claim_assembly_preview":
      return {
        href: "/app/billing/claim-assembly-preview",
        labelKey: "billingPage.readinessExplainerOpenClaimAssemblyPreview",
      };
    case "open_patient_registration":
      return {
        href: patientId ? `/app/patients/${patientId}/profile` : "/app/registration",
        labelKey: "billingPage.readinessExplainerOpenPatientRegistration",
      };
    case "open_facility_billing_settings":
      return {
        href: "/app/admin/billing-governance",
        labelKey: "billingPage.readinessExplainerOpenFacilityBillingSettings",
      };
    case "open_billing_ledger":
    default:
      return {
        href: `/app/billing/encounters/${encounterId}`,
        labelKey: "billingPage.readinessExplainerOpenLedger",
      };
  }
}

export const BILLING_READINESS_EXPLAINER_CATEGORY_I18N: Record<string, string> = {
  MANUAL_REVIEW: "billingPage.readinessExplainerCategoryManualReview",
  CODING: "billingPage.readinessExplainerCategoryCoding",
  CHARGE_MAPPING: "billingPage.readinessExplainerCategoryChargeMapping",
  PAYER: "billingPage.readinessExplainerCategoryPayer",
  PROVIDER: "billingPage.readinessExplainerCategoryProvider",
  FACILITY: "billingPage.readinessExplainerCategoryFacility",
  CLAIM_ASSEMBLY: "billingPage.readinessExplainerCategoryClaimAssembly",
  EXPORT: "billingPage.readinessExplainerCategoryExport",
  UNKNOWN: "billingPage.readinessExplainerCategoryUnknown",
};
