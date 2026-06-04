/**
 * M1.7C — Enterprise Formulary Wave 4 ED/Hospital types.
 */

import type { MedicationLocalizationAlias } from "./medicationLocalizationTypes.js";

export type EnterpriseWave4EdHospitalBucket =
  | "RSI"
  | "PROCEDURAL_SEDATION"
  | "ACLS_CARDIAC"
  | "VASOPRESSORS"
  | "SEPSIS_ANTIBIOTICS"
  | "STROKE_NEURO"
  | "ACS_HYPERTENSIVE"
  | "RESPIRATORY"
  | "TOXICOLOGY"
  | "ELECTROLYTE"
  | "OB_EMERGENCY"
  | "PEDIATRIC_ED";

export type EnterpriseWave4EdHospitalSeedMode = "CREATE" | "ENRICH";

export type EnterpriseWave4EdHospitalGovernanceFlags = {
  isControlled: boolean;
  controlledSchedule?: string | null;
  isHighAlert: boolean;
  requiresWitness: boolean;
  requiresDoubleSign: boolean;
  lasaGroupId?: string | null;
  /** Informational only — M1.7A.9 never blocks MAR. */
  requiresPharmacyVerification: boolean;
  isInsulin?: boolean;
  isRsiParalytic?: boolean;
  isThrombolytic?: boolean;
  isVasopressor?: boolean;
  isAntidote?: boolean;
  isContinuousInfusion?: boolean;
  isBloodProduct?: boolean;
  isAnticoagulantInfusion?: boolean;
  requiresSpecialtyReview?: boolean;
};

export type EnterpriseWave4EdHospitalFormularyEntry = {
  catalogCode: string;
  genericName: string;
  displayNameFr: string;
  displayNameEn: string;
  strength: string;
  dosageForm: string;
  route: string;
  therapeuticClass: string;
  bucket: EnterpriseWave4EdHospitalBucket;
  mode: EnterpriseWave4EdHospitalSeedMode;
  aliases: MedicationLocalizationAlias[];
  searchTerms: string[];
  governance: EnterpriseWave4EdHospitalGovernanceFlags;
  isEssential?: boolean;
  administrationType?: string | null;
  billingClass?: string | null;
};

export type EnterpriseWave4EdHospitalBillingEntry = {
  catalogCode: string;
  hcpcs: string;
  description: string;
  billingUnitType?: string;
  ndc11: string;
  ndcDisplay?: string;
  administrationCpt?: string;
};

export type EnterpriseWave4EdHospitalPerMedicationReadiness = {
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

export type EnterpriseWave4EdHospitalReadinessReport = {
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
  perMedication: EnterpriseWave4EdHospitalPerMedicationReadiness[];
  byBucket: Record<EnterpriseWave4EdHospitalBucket, number>;
  highAlertCount: number;
  controlledCount: number;
  doubleSignCount: number;
  localizationCoveragePct: number;
  billingReadinessPct: number;
  labelIntegrityPct: number;
  wave4ReadinessPct: number;
};
