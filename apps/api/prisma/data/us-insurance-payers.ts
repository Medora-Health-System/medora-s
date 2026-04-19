/**
 * U.S. primary-payer starter catalog — canonical English display names.
 * Seeded idempotently via `code` (see `seed-us-insurance-payers.ts`).
 */
export const US_INSURANCE_PAYERS_SEED: ReadonlyArray<{ readonly code: string; readonly name: string }> = [
  { code: "US_CAT_AETNA", name: "Aetna" },
  { code: "US_CAT_CIGNA", name: "Cigna" },
  { code: "US_CAT_BCBS", name: "Blue Cross Blue Shield" },
  { code: "US_CAT_BLUE_SHIELD", name: "Blue Shield" },
  { code: "US_CAT_ANTHEM", name: "Anthem" },
  { code: "US_CAT_UHC", name: "UnitedHealthcare" },
  { code: "US_CAT_UHC_COMMUNITY", name: "UnitedHealthcare Community Plan" },
  { code: "US_CAT_HUMANA", name: "Humana" },
  { code: "US_CAT_MEDICARE", name: "Medicare" },
  { code: "US_CAT_MEDICAID", name: "Medicaid" },
  { code: "US_CAT_MEDICAID_MANAGED", name: "Medicaid Managed Care" },
  { code: "US_CAT_TRICARE", name: "Tricare" },
  { code: "US_CAT_MOLINA", name: "Molina Healthcare" },
  { code: "US_CAT_KAISER", name: "Kaiser Permanente" },
  { code: "US_CAT_AMBETTER", name: "Ambetter" },
  { code: "US_CAT_CENTENE", name: "Centene" },
  { code: "US_CAT_WELLCARE", name: "Wellcare" },
  { code: "US_CAT_HEALTH_NET", name: "Health Net" },
  { code: "US_CAT_OSCAR", name: "Oscar" },
  { code: "US_CAT_GEHA", name: "GEHA" },
  { code: "US_CAT_UMR", name: "UMR" },
  { code: "US_CAT_BCBS_TX", name: "Blue Cross Blue Shield of Texas" },
  { code: "US_CAT_BCBS_FL", name: "Blue Cross Blue Shield of Florida" },
];
