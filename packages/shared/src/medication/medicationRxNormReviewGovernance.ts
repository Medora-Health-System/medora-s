/**
 * Phase 6 — governed RxNorm review operations constants (non-clinical).
 * MedicationReviewer / MedicationAdmin map to Prisma RoleCode values.
 */

export const RXNORM_REVIEW_ROLE_CODES = [
  "MEDICATION_REVIEWER",
  "MEDICATION_ADMIN",
] as const;

export type RxNormReviewRoleCode = (typeof RXNORM_REVIEW_ROLE_CODES)[number];

/** Roles permitted to read the review queue / dashboard. */
export const RXNORM_REVIEW_READ_ROLE_CODES = [
  "MEDICATION_REVIEWER",
  "MEDICATION_ADMIN",
  "ADMIN",
  "MEDORA_SUPER_ADMIN",
  "PHARMACY",
] as const;

/** Roles permitted to mutate (approve/reject/defer/assign/retire/supersede/bulk). */
export const RXNORM_REVIEW_WRITE_ROLE_CODES = [
  "MEDICATION_REVIEWER",
  "MEDICATION_ADMIN",
  "ADMIN",
  "MEDORA_SUPER_ADMIN",
] as const;

/** Roles permitted to enable/configure the controlled EM pilot (still disabled by default). */
export const RXNORM_PILOT_ADMIN_ROLE_CODES = ["MEDICATION_ADMIN", "MEDORA_SUPER_ADMIN"] as const;

export const RXNORM_REVIEW_AUDIT_ACTION_VALUES = [
  "VIEW",
  "ASSIGN",
  "APPROVE",
  "REJECT",
  "DEFER",
  "SUPERSEDE",
  "RETIRE",
  "BULK_APPROVE",
  "BULK_REJECT",
  "BULK_DEFER",
  "CONFLICT_RESOLVE",
] as const;

export type RxNormReviewAuditAction = (typeof RXNORM_REVIEW_AUDIT_ACTION_VALUES)[number];

export const RXNORM_EM_PILOT_DEFAULT_CONFIG = {
  pilotId: "EM_REAL_MAPPING_PILOT_V1",
  enabled: false,
  targetCount: 100,
  therapeuticArea: "EMERGENCY_MEDICINE",
  clinicalActivationEnabled: false,
  automaticVerificationEnabled: false,
  importExecuted: false,
  notes:
    "Configurable future pilot of ~100 Emergency Medicine medications. Disabled by default. Phase 6 does not import or activate these mappings.",
} as const;

export type RxNormEmPilotConfig = {
  pilotId: string;
  enabled: boolean;
  targetCount: number;
  therapeuticArea: string;
  clinicalActivationEnabled: boolean;
  automaticVerificationEnabled: boolean;
  importExecuted: boolean;
  notes: string;
};

export function assertRxNormPilotRemainsNonClinical(config: RxNormEmPilotConfig): void {
  if (config.clinicalActivationEnabled) {
    throw new Error("Phase 6 forbids clinical activation of the EM real mapping pilot.");
  }
  if (config.automaticVerificationEnabled) {
    throw new Error("Phase 6 forbids automatic verification for the EM real mapping pilot.");
  }
  if (config.importExecuted) {
    throw new Error("Phase 6 must not import EM pilot medications.");
  }
}

export function isRxNormReviewWriteRole(role: string): boolean {
  return (RXNORM_REVIEW_WRITE_ROLE_CODES as readonly string[]).includes(role);
}

export function isRxNormReviewReadRole(role: string): boolean {
  return (RXNORM_REVIEW_READ_ROLE_CODES as readonly string[]).includes(role);
}
