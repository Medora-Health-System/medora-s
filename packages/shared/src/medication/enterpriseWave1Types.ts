/**
 * M1.6B — Enterprise Formulary Wave 1 types.
 */

export type EnterpriseWave1Bucket = "ANTICOAGULATION" | "VACCINE" | "CHRONIC_CARE";

export type EnterpriseWave1SeedMode = "CREATE" | "ENRICH";

export type EnterpriseWave1GovernanceFlags = {
  isControlled: boolean;
  controlledSchedule?: string | null;
  isHighAlert: boolean;
  requiresWitness: boolean;
  requiresDoubleSign: boolean;
  lasaGroupId?: string | null;
  requiresPharmacyVerification: boolean;
};

export type EnterpriseWave1FormularyEntry = {
  catalogCode: string;
  genericName: string;
  displayNameFr: string;
  displayNameEn: string;
  strength: string;
  dosageForm: string;
  route: string;
  therapeuticClass: string;
  bucket: EnterpriseWave1Bucket;
  /** CREATE = new catalog + chain; ENRICH = existing Haiti row (aliases/billing/chain fixup). */
  mode: EnterpriseWave1SeedMode;
  aliases: string[];
  searchTerms: string[];
  governance: EnterpriseWave1GovernanceFlags;
  isEssential?: boolean;
  administrationType?: string | null;
  billingClass?: string | null;
};

export type EnterpriseWave1BillingEntry = {
  catalogCode: string;
  /** HCPCS (J-code or vaccine product code e.g. 90686). */
  hcpcs: string;
  description: string;
  billingUnitType?: string;
  /** 11-digit NDC (required for Wave 1 activation gate). */
  ndc11: string;
  ndcDisplay?: string;
  /** Immunization administration CPT (vaccines). */
  administrationCpt?: string;
  /** CVX code for vaccine identity (documentation; no separate CVX table in MVP). */
  cvxCode?: string;
};

export type EnterpriseWave1PerMedicationReadiness = {
  catalogCode: string;
  pass: boolean;
  billingPass: boolean;
  governancePass: boolean;
  searchPass: boolean;
  failures: string[];
};

export type EnterpriseWave1ReadinessReport = {
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
  perMedication: EnterpriseWave1PerMedicationReadiness[];
  ndcCoveragePct: number;
  hcpcsCoveragePct: number;
  jCodeCoveragePct: number;
  searchCoveragePct: number;
  governanceCoveragePct: number;
  billingReadinessPct: number;
  wave1ReadinessPct: number;
};
