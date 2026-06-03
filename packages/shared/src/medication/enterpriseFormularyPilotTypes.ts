/**
 * M1.6F — Enterprise formulary controlled pilot activation types.
 */

export const ENTERPRISE_PILOT_TRANCHE_A = "TRANCHE_A" as const;

export const ENTERPRISE_PILOT_ELIGIBILITY_STATUS_VALUES = [
  "PILOT_ELIGIBLE",
  "PILOT_EXCLUDED_CONTROLLED",
  "PILOT_EXCLUDED_HIGH_ALERT",
  "PILOT_EXCLUDED_LASA",
  "PILOT_EXCLUDED_INJECTABLE",
  "PILOT_EXCLUDED_PSYCHOTROPIC",
  "PILOT_EXCLUDED_ER_CRITICAL",
  "PILOT_EXCLUDED_NOT_ENTERPRISE",
  "PILOT_EXCLUDED_ROUTE",
] as const;

export type EnterprisePilotEligibilityStatus =
  (typeof ENTERPRISE_PILOT_ELIGIBILITY_STATUS_VALUES)[number];

export type EnterpriseFormularyPilotTrancheEntry = {
  catalogCode: string;
  genericName: string;
  displayName: string;
  tranche: typeof ENTERPRISE_PILOT_TRANCHE_A;
  wave: "WAVE1" | "WAVE2";
  administrationType: string;
  pilotStatus: EnterprisePilotEligibilityStatus;
  pilotEligible: boolean;
  pilotRationale: string;
};

export type EnterprisePilotValidationIssue = {
  kind: string;
  catalogCode?: string;
  message: string;
  severity: "blocking" | "warning";
};

export type EnterprisePilotChainSnapshot = {
  product?: {
    productId: string;
    productCode: string;
    legacyCatalogMedicationId: string | null;
    isActive: boolean;
    governanceStatus: string;
    governanceNotes: string | null;
    baselineAvailable: boolean;
  } | null;
  concept?: { isActive: boolean } | null;
  package?: { id: string; isActive: boolean; ndc11: string | null } | null;
  catalog?: {
    catalogId: string;
    catalogCode: string;
    genericName: string | null;
    billingCodeDefault: string | null;
    ndc11: string | null;
  } | null;
  safetyProfile?: {
    isControlled: boolean;
    isHighAlert: boolean;
    lasaGroupId: string | null;
    requiresWitness: boolean;
  } | null;
  billingProfileHcpcs?: string | null;
  billingRequiresManualReview?: boolean;
  aliasCount?: number;
};

export type EnterpriseFormularyPilotDashboard = {
  tranche: typeof ENTERPRISE_PILOT_TRANCHE_A;
  trancheTotal: number;
  pilotEligible: number;
  activatedCount: number;
  pendingReviewCount: number;
  blockedCount: number;
  alreadyActivatedCount: number;
  activationReadinessPct: number;
  rollbackReadinessPct: number;
};

export type EnterprisePilotReadinessScores = {
  canonicalIntegrity: number;
  billingReadiness: number;
  governanceReadiness: number;
  searchReadiness: number;
  activationReadiness: number;
  rollbackReadiness: number;
};
