/**
 * M1.7B — Enterprise Formulary Wave 3 types (post-localization contract).
 */

import type { MedicationLocalizationAlias } from "./medicationLocalizationTypes.js";

export type EnterpriseWave3Bucket =
  | "NEPHROLOGY"
  | "DERMATOLOGY"
  | "RHEUMATOLOGY"
  | "NEUROLOGY"
  | "PSYCHIATRY"
  | "PULMONOLOGY"
  | "ENDOCRINOLOGY";

export type EnterpriseWave3SeedMode = "CREATE" | "ENRICH";

export type EnterpriseWave3GovernanceFlags = {
  isControlled: boolean;
  controlledSchedule?: string | null;
  isHighAlert: boolean;
  requiresWitness: boolean;
  requiresDoubleSign: boolean;
  lasaGroupId?: string | null;
  requiresPharmacyVerification: boolean;
  /** DMARD / immunomodulator — manual activation review. */
  isDmard?: boolean;
  /** Biologic — not activated in Wave 3. */
  isBiologic?: boolean;
  /** Insulin or insulin secretagogue high-risk class. */
  isInsulin?: boolean;
  /** Restricted specialty (e.g. isotretinoin, lithium, stimulants). */
  requiresSpecialtyReview?: boolean;
};

export type EnterpriseWave3FormularyEntry = {
  catalogCode: string;
  genericName: string;
  displayNameFr: string;
  displayNameEn: string;
  strength: string;
  dosageForm: string;
  route: string;
  therapeuticClass: string;
  bucket: EnterpriseWave3Bucket;
  mode: EnterpriseWave3SeedMode;
  /** M1.7A.2 — language-tagged aliases (required EN + FR per row). */
  aliases: MedicationLocalizationAlias[];
  /** M1.7A.2 — from buildMedicationSearchTokens().terms at generation time. */
  searchTerms: string[];
  governance: EnterpriseWave3GovernanceFlags;
  isEssential?: boolean;
  administrationType?: string | null;
  billingClass?: string | null;
};

export type EnterpriseWave3BillingEntry = {
  catalogCode: string;
  hcpcs: string;
  description: string;
  billingUnitType?: string;
  ndc11: string;
  ndcDisplay?: string;
  administrationCpt?: string;
};

export type EnterpriseWave3PerMedicationReadiness = {
  catalogCode: string;
  pass: boolean;
  billingPass: boolean;
  governancePass: boolean;
  searchPass: boolean;
  localizationPass: boolean;
  labelPass: boolean;
  activationPass: boolean;
  failures: string[];
};

export type EnterpriseWave3ReadinessReport = {
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
  perMedication: EnterpriseWave3PerMedicationReadiness[];
  byBucket: Record<EnterpriseWave3Bucket, number>;
  highAlertCount: number;
  controlledCount: number;
  dmardCount: number;
  biologicCount: number;
  insulinCount: number;
  localizationCoveragePct: number;
  billingReadinessPct: number;
  labelIntegrityPct: number;
  wave3ReadinessPct: number;
};
