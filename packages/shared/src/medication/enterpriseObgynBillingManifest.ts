/**
 * MEDUI.MEDICATION.OBGYN_PROVIDER_ORDERING_EXPANSION.1
 * Billing / NDC manifest for OBGYN catalog remediation and Haiti gap fill.
 */

export type ObgynNdcConfidence = "verified" | "review" | "placeholder";

export type EnterpriseObgynBillingEntry = {
  catalogCode: string;
  hcpcs: string;
  description: string;
  billingUnitType: string;
  ndc11: string;
  ndcDisplay: string;
  ndcConfidence: ObgynNdcConfidence;
};

export const ENTERPRISE_OBGYN_BILLING_MANIFEST: EnterpriseObgynBillingEntry[] = [
  {
    catalogCode: "PENICILLIN_G_5_MILLION_UNITS_POUDRE_INTRAVEINEUSE",
    hcpcs: "J2543",
    description: "Penicillin G potassium injection",
    billingUnitType: "unit",
    ndc11: "00000800101",
    ndcDisplay: "00000-8001-01",
    ndcConfidence: "review",
  },
  {
    catalogCode: "TRANEXAMIC_ACID_1000_MG_10_ML_INJECTABLE_INTRAVEINEUSE",
    hcpcs: "J3490",
    description: "Tranexamic acid IV (OBGYN)",
    billingUnitType: "mg",
    ndc11: "00000800102",
    ndcDisplay: "00000-8001-02",
    ndcConfidence: "review",
  },
  {
    catalogCode: "TRANEXAMIC_ACID_500_MG_PER_5_ML_INJECTABLE_INJECTION",
    hcpcs: "J3490",
    description: "Tranexamic acid injection (Haiti)",
    billingUnitType: "mg",
    ndc11: "00000800103",
    ndcDisplay: "00000-8001-03",
    ndcConfidence: "review",
  },
  {
    catalogCode: "ACETAMINOPHEN_500",
    hcpcs: "J3490",
    description: "Acetaminophen 500 mg oral",
    billingUnitType: "tablet",
    ndc11: "00000800104",
    ndcDisplay: "00000-8001-04",
    ndcConfidence: "review",
  },
  {
    catalogCode: "IBUPROFEN_400_MG_COMPRIME_ORAL",
    hcpcs: "J3490",
    description: "Ibuprofen 400 mg oral",
    billingUnitType: "tablet",
    ndc11: "00000800105",
    ndcDisplay: "00000-8001-05",
    ndcConfidence: "review",
  },
];

export const ENTERPRISE_OBGYN_BILLING_BY_CODE = Object.fromEntries(
  ENTERPRISE_OBGYN_BILLING_MANIFEST.map((entry) => [entry.catalogCode, entry])
) as Record<string, EnterpriseObgynBillingEntry>;
