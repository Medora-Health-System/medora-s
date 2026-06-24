/**
 * MEDUI.MEDICATION.GASTROENTEROLOGY_PROVIDER_ORDERING_EXPANSION.1
 * Billing / NDC manifest for gastroenterology catalog remediation and Haiti gap fill.
 */

export type GastroenterologyNdcConfidence = "verified" | "review" | "placeholder";

export type EnterpriseGastroenterologyBillingEntry = {
  catalogCode: string;
  hcpcs: string;
  description: string;
  billingUnitType: string;
  ndc11: string;
  ndcDisplay: string;
  ndcConfidence: GastroenterologyNdcConfidence;
};

export const ENTERPRISE_GASTROENTEROLOGY_BILLING_MANIFEST: EnterpriseGastroenterologyBillingEntry[] = [
  {
    catalogCode: "RIFAXIMIN_550_MG_COMPRIME_ORALE",
    hcpcs: "J3490",
    description: "Rifaximin 550 mg oral (hepatic encephalopathy)",
    billingUnitType: "tablet",
    ndc11: "00000900101",
    ndcDisplay: "00000-9001-01",
    ndcConfidence: "review",
  },
  {
    catalogCode: "SENNA_8_6_MG_COMPRIME_ORALE",
    hcpcs: "J3490",
    description: "Senna 8.6 mg oral",
    billingUnitType: "tablet",
    ndc11: "00000900102",
    ndcDisplay: "00000-9001-02",
    ndcConfidence: "review",
  },
  {
    catalogCode: "BISACODYL_5_MG_COMPRIME_ORALE",
    hcpcs: "J3490",
    description: "Bisacodyl 5 mg oral",
    billingUnitType: "tablet",
    ndc11: "00000900103",
    ndcDisplay: "00000-9001-03",
    ndcConfidence: "review",
  },
  {
    catalogCode: "LACTULOSE_10_G_PER_15_ML_SIROP_ORAL",
    hcpcs: "J3490",
    description: "Lactulose 10 g/15 mL oral",
    billingUnitType: "mL",
    ndc11: "00000900104",
    ndcDisplay: "00000-9001-04",
    ndcConfidence: "review",
  },
  {
    catalogCode: "LOPERAMIDE_2_MG_CAPSULE_ORAL",
    hcpcs: "J3490",
    description: "Loperamide 2 mg oral",
    billingUnitType: "capsule",
    ndc11: "00000900105",
    ndcDisplay: "00000-9001-05",
    ndcConfidence: "review",
  },
  {
    catalogCode: "METOCLOPRAMIDE_10_MG_COMPRIME_ORAL",
    hcpcs: "J3490",
    description: "Metoclopramide 10 mg oral",
    billingUnitType: "tablet",
    ndc11: "00000900106",
    ndcDisplay: "00000-9001-06",
    ndcConfidence: "review",
  },
  {
    catalogCode: "METOCLOPRAMIDE_10_MG_PER_2_ML_INJECTABLE_INJECTION",
    hcpcs: "J2765",
    description: "Metoclopramide injection",
    billingUnitType: "mg",
    ndc11: "00000900107",
    ndcDisplay: "00000-9001-07",
    ndcConfidence: "review",
  },
  {
    catalogCode: "PANTOPRAZOLE_40MG_IV",
    hcpcs: "J3490",
    description: "Pantoprazole 40 mg IV",
    billingUnitType: "mg",
    ndc11: "00000900108",
    ndcDisplay: "00000-9001-08",
    ndcConfidence: "review",
  },
];

export const ENTERPRISE_GASTROENTEROLOGY_BILLING_BY_CODE = Object.fromEntries(
  ENTERPRISE_GASTROENTEROLOGY_BILLING_MANIFEST.map((entry) => [entry.catalogCode, entry])
) as Record<string, EnterpriseGastroenterologyBillingEntry>;
