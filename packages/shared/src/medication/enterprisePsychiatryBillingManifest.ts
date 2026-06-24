/**
 * MEDUI.MEDICATION.PSYCHIATRY_PROVIDER_ORDERING_EXPANSION.1
 * Billing / NDC manifest for psychiatry catalog remediation and Haiti gap fill.
 */

export type PsychiatryNdcConfidence = "verified" | "review" | "placeholder";

export type EnterprisePsychiatryBillingEntry = {
  catalogCode: string;
  hcpcs: string;
  description: string;
  billingUnitType: string;
  ndc11: string;
  ndcDisplay: string;
  ndcConfidence: PsychiatryNdcConfidence;
};

export const ENTERPRISE_PSYCHIATRY_BILLING_MANIFEST: EnterprisePsychiatryBillingEntry[] = [
  {
    catalogCode: "OLANZAPINE_10_MG_ODT_COMPRIME_ORODISPERSIBLE_ORALE",
    hcpcs: "J3490",
    description: "Olanzapine ODT",
    billingUnitType: "tablet",
    ndc11: "00000900101",
    ndcDisplay: "00000-9001-01",
    ndcConfidence: "review",
  },
  {
    catalogCode: "OLANZAPINE_10_MG_INJECTABLE_INTRAMUSCULAIRE",
    hcpcs: "J3490",
    description: "Olanzapine IM",
    billingUnitType: "mg",
    ndc11: "00000900102",
    ndcDisplay: "00000-9001-02",
    ndcConfidence: "review",
  },
  {
    catalogCode: "ZIPRASIDONE_20_MG_INJECTABLE_INTRAMUSCULAIRE",
    hcpcs: "J3490",
    description: "Ziprasidone IM",
    billingUnitType: "mg",
    ndc11: "00000900103",
    ndcDisplay: "00000-9001-03",
    ndcConfidence: "review",
  },
  {
    catalogCode: "LURASIDONE_40_MG_COMPRIME_ORALE",
    hcpcs: "J3490",
    description: "Lurasidone oral",
    billingUnitType: "tablet",
    ndc11: "00000900104",
    ndcDisplay: "00000-9001-04",
    ndcConfidence: "review",
  },
  {
    catalogCode: "BENZTROPINE_1_MG_COMPRIME_ORALE",
    hcpcs: "J3490",
    description: "Benztropine oral",
    billingUnitType: "tablet",
    ndc11: "00000900105",
    ndcDisplay: "00000-9001-05",
    ndcConfidence: "review",
  },
  {
    catalogCode: "BENZTROPINE_1_MG_ML_INJECTABLE_INTRAMUSCULAIRE",
    hcpcs: "J3490",
    description: "Benztropine IM",
    billingUnitType: "mg",
    ndc11: "00000900106",
    ndcDisplay: "00000-9001-06",
    ndcConfidence: "review",
  },
  {
    catalogCode: "HYDROXYZINE_25_MG_COMPRIME_ORALE",
    hcpcs: "J3490",
    description: "Hydroxyzine oral",
    billingUnitType: "tablet",
    ndc11: "00000900107",
    ndcDisplay: "00000-9001-07",
    ndcConfidence: "review",
  },
  {
    catalogCode: "HYDROXYZINE_50_MG_ML_INJECTABLE_INTRAMUSCULAIRE",
    hcpcs: "J3490",
    description: "Hydroxyzine IM",
    billingUnitType: "mg",
    ndc11: "00000900108",
    ndcDisplay: "00000-9001-08",
    ndcConfidence: "review",
  },
  {
    catalogCode: "PROPRANOLOL_10_MG_COMPRIME_ORALE",
    hcpcs: "J3490",
    description: "Propranolol oral",
    billingUnitType: "tablet",
    ndc11: "00000900109",
    ndcDisplay: "00000-9001-09",
    ndcConfidence: "review",
  },
  {
    catalogCode: "PROPRANOLOL_1_MG_ML_INJECTABLE_INTRAVEINEUSE",
    hcpcs: "J3490",
    description: "Propranolol IV",
    billingUnitType: "mg",
    ndc11: "00000900110",
    ndcDisplay: "00000-9001-10",
    ndcConfidence: "review",
  },
  {
    catalogCode: "DIVALPROEX_250_MG_GELULE_ORALE",
    hcpcs: "J3490",
    description: "Divalproex oral",
    billingUnitType: "capsule",
    ndc11: "00000900111",
    ndcDisplay: "00000-9001-11",
    ndcConfidence: "review",
  },
  {
    catalogCode: "DIPHENHYDRAMINE_50MG_ML",
    hcpcs: "J1200",
    description: "Diphenhydramine injection (Haiti)",
    billingUnitType: "mg",
    ndc11: "00000900112",
    ndcDisplay: "00000-9001-12",
    ndcConfidence: "review",
  },
  {
    catalogCode: "ZIPRASIDONE_20_MG_GELULE_ORAL",
    hcpcs: "J3490",
    description: "Ziprasidone oral (Haiti)",
    billingUnitType: "capsule",
    ndc11: "60505252806",
    ndcDisplay: "60505-2528-06",
    ndcConfidence: "review",
  },
  {
    catalogCode: "DIAZEPAM_5_MG_COMPRIME_ORAL",
    hcpcs: "J3490",
    description: "Diazepam oral (controlled — audit only)",
    billingUnitType: "tablet",
    ndc11: "00000900113",
    ndcDisplay: "00000-9001-13",
    ndcConfidence: "review",
  },
  {
    catalogCode: "LORAZEPAM_2_MG_COMPRIME_ORAL",
    hcpcs: "J3490",
    description: "Lorazepam oral (controlled — audit only)",
    billingUnitType: "tablet",
    ndc11: "00000900114",
    ndcDisplay: "00000-9001-14",
    ndcConfidence: "review",
  },
  {
    catalogCode: "LORAZEPAM_2MG_ML_INJECTABLE",
    hcpcs: "J2060",
    description: "Lorazepam injection (controlled — audit only)",
    billingUnitType: "mg",
    ndc11: "00000900115",
    ndcDisplay: "00000-9001-15",
    ndcConfidence: "review",
  },
];

export const ENTERPRISE_PSYCHIATRY_BILLING_BY_CODE = Object.fromEntries(
  ENTERPRISE_PSYCHIATRY_BILLING_MANIFEST.map((entry) => [entry.catalogCode, entry])
) as Record<string, EnterprisePsychiatryBillingEntry>;
