/**
 * M1.6D — Enterprise Formulary Wave 2 types.
 */

export type EnterpriseWave2Bucket =
  | "ANTICOAGULATION"
  | "CARDIOLOGY"
  | "DIABETES"
  | "WOMENS_HEALTH"
  | "PULMONOLOGY"
  | "VACCINE"
  | "GI"
  | "PSYCHIATRY"
  | "INFECTIOUS_DISEASE"
  | "ER_CRITICAL"
  | "CHRONIC";

export type EnterpriseWave2SeedMode = "CREATE" | "ENRICH";

export type EnterpriseWave2GovernanceFlags = {
  isControlled: boolean;
  controlledSchedule?: string | null;
  isHighAlert: boolean;
  requiresWitness: boolean;
  requiresDoubleSign: boolean;
  lasaGroupId?: string | null;
  requiresPharmacyVerification: boolean;
};

export type EnterpriseWave2FormularyEntry = {
  catalogCode: string;
  genericName: string;
  displayNameFr: string;
  displayNameEn: string;
  strength: string;
  dosageForm: string;
  route: string;
  therapeuticClass: string;
  bucket: EnterpriseWave2Bucket;
  mode: EnterpriseWave2SeedMode;
  aliases: string[];
  searchTerms: string[];
  governance: EnterpriseWave2GovernanceFlags;
  isEssential?: boolean;
  administrationType?: string | null;
  billingClass?: string | null;
};

export type EnterpriseWave2BillingEntry = {
  catalogCode: string;
  hcpcs: string;
  description: string;
  billingUnitType?: string;
  ndc11: string;
  ndcDisplay?: string;
  administrationCpt?: string;
  cvxCode?: string;
};

export type EnterpriseWave2PerMedicationReadiness = {
  catalogCode: string;
  pass: boolean;
  billingPass: boolean;
  governancePass: boolean;
  searchPass: boolean;
  activationPass: boolean;
  failures: string[];
};

export type EnterpriseWave2ReadinessReport = {
  manifestEntries: number;
  catalogCreated: number;
  catalogEnriched: number;
  conceptsCreated: number;
  productsCreated: number;
  packagesCreated: number;
  aliasesAdded: number;
  safetyProfilesCreated: number;
  billingProfilesCreated: number;
  billingCatalogRowsCreated: number;
  perMedication: EnterpriseWave2PerMedicationReadiness[];
  canonicalCoveragePct: number;
  ndcCoveragePct: number;
  hcpcsCoveragePct: number;
  jCodeCoveragePct: number;
  searchCoveragePct: number;
  governanceCoveragePct: number;
  billingReadinessPct: number;
  activationReadinessPct: number;
  wave2ReadinessPct: number;
};
