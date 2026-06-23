/**
 * MEDUI.MEDICATION.NEUROLOGY_AND_INFECTIOUS_DISEASE_PROVIDER_ORDERING_EXPANSION.1
 * Billing / NDC manifest for neurology and infectious disease catalog remediation.
 */

export type NeurologyInfectiousDiseaseNdcConfidence = "verified" | "review" | "placeholder";

export type EnterpriseNeurologyInfectiousDiseaseBillingEntry = {
  catalogCode: string;
  hcpcs: string;
  description: string;
  billingUnitType: string;
  ndc11: string;
  ndcDisplay: string;
  ndcConfidence: NeurologyInfectiousDiseaseNdcConfidence;
};

export const ENTERPRISE_NEUROLOGY_INFECTIOUS_DISEASE_BILLING_MANIFEST: EnterpriseNeurologyInfectiousDiseaseBillingEntry[] = [
  {
    catalogCode: "FOSPHEYTOIN_100_MG_PE_INJECTABLE_INTRAVEINEUSE",
    hcpcs: "J1205",
    description: "Neurology Fosphenytoin 100 mg PE",
    billingUnitType: "mg",
    ndc11: "00000600130",
    ndcDisplay: "00000-6001-30",
    ndcConfidence: "review",
  },
  {
    catalogCode: "LACOSAMIDE_200_MG_COMPRIME_ORALE",
    hcpcs: "J3490",
    description: "Neurology Lacosamide 200 mg PO",
    billingUnitType: "tablet",
    ndc11: "00000600131",
    ndcDisplay: "00000-6001-31",
    ndcConfidence: "review",
  },
  {
    catalogCode: "VANCOMYCIN_125_MG_COMPRIME_ORALE",
    hcpcs: "J3490",
    description: "Infectious Disease Vancomycin 125 mg PO",
    billingUnitType: "capsule",
    ndc11: "00000600132",
    ndcDisplay: "00000-6001-32",
    ndcConfidence: "review",
  },
];

export const ENTERPRISE_NEUROLOGY_INFECTIOUS_DISEASE_BILLING_BY_CODE: Record<
  string,
  EnterpriseNeurologyInfectiousDiseaseBillingEntry
> = Object.fromEntries(ENTERPRISE_NEUROLOGY_INFECTIOUS_DISEASE_BILLING_MANIFEST.map((entry) => [entry.catalogCode, entry]));
