/**
 * Phase 8 — clinical knowledge foundation (storage only; no CDS / patient dosing calc).
 * Knowledge is versioned, provenance-aware, and separated from medication identity.
 */

export const MEDICATION_CLINICAL_KNOWLEDGE_LIFECYCLE_VALUES = [
  "DRAFT",
  "UNDER_REVIEW",
  "APPROVED",
  "SUPERSEDED",
  "RETIRED",
] as const;

export type MedicationClinicalKnowledgeLifecycle =
  (typeof MEDICATION_CLINICAL_KNOWLEDGE_LIFECYCLE_VALUES)[number];

export const MEDICATION_CLINICAL_KNOWLEDGE_DOMAIN_VALUES = [
  "ADULT_DOSING",
  "PEDIATRIC_DOSING",
  "WEIGHT_BASED_DOSING",
  "MAXIMUM_DOSE",
  "MINIMUM_DOSE",
  "RENAL_ADJUSTMENT",
  "HEPATIC_ADJUSTMENT",
  "PREGNANCY",
  "LACTATION",
  "GERIATRIC",
  "ADMINISTRATION",
  "IV_DILUTION",
  "INFUSION_RATE",
  "IV_PUSH_RATE",
  "MONITORING",
  "LABORATORY_MONITORING",
  "CONTRAINDICATION",
  "PRECAUTION",
  "BLACK_BOX_WARNING",
  "HIGH_ALERT",
  "LASA",
  "CONTROLLED_SUBSTANCE",
  "INDICATION",
  "EMERGENCY_USE",
  "STORAGE",
  "RECONSTITUTION",
  "STABILITY",
  "COMMON_ADVERSE_EFFECT",
  "SEVERE_ADVERSE_EFFECT",
  "DOCUMENTATION_NOTE",
] as const;

export type MedicationClinicalKnowledgeDomain =
  (typeof MEDICATION_CLINICAL_KNOWLEDGE_DOMAIN_VALUES)[number];

export const MEDICATION_EMERGENCY_USE_PROFILE_VALUES = [
  "RSI",
  "ACLS",
  "PALS",
  "STROKE",
  "SEPSIS",
  "TRAUMA",
  "PROCEDURAL_SEDATION",
  "TOXICOLOGY",
  "ANAPHYLAXIS",
  "STATUS_EPILEPTICUS",
  "OTHER",
] as const;

export type MedicationEmergencyUseProfile =
  (typeof MEDICATION_EMERGENCY_USE_PROFILE_VALUES)[number];

export const MEDICATION_DOSE_KIND_VALUES = [
  "FIXED",
  "WEIGHT_BASED",
  "BSA_BASED",
  "AGE_BASED",
  "ADULT",
  "PEDIATRIC",
] as const;

export type MedicationClinicalDoseKind = (typeof MEDICATION_DOSE_KIND_VALUES)[number];

export const MEDICATION_CLINICAL_KNOWLEDGE_LIFECYCLE_TRANSITIONS: Record<
  MedicationClinicalKnowledgeLifecycle,
  readonly MedicationClinicalKnowledgeLifecycle[]
> = {
  DRAFT: ["UNDER_REVIEW", "RETIRED"],
  UNDER_REVIEW: ["APPROVED", "DRAFT", "RETIRED"],
  APPROVED: ["SUPERSEDED", "RETIRED"],
  SUPERSEDED: ["RETIRED"],
  RETIRED: [],
};

/** Clinical knowledge never activates patient-facing workflows in Phase 8. */
export const PHASE8_CLINICAL_KNOWLEDGE_DEFAULTS = {
  automaticClinicalActivationEnabled: false,
  clinicalDecisionSupportEnabled: false,
  patientSpecificDosingEnabled: false,
  interactionCheckingEnabled: false,
  clinicalAlertsEnabled: false,
} as const;

export function assertClinicalKnowledgeActivationDisabled(
  automaticClinicalActivationEnabled: boolean
): void {
  if (automaticClinicalActivationEnabled) {
    throw new Error("Phase 8 forbids automaticClinicalActivationEnabled=true.");
  }
}

export function assertLegalClinicalKnowledgeLifecycleTransition(
  from: MedicationClinicalKnowledgeLifecycle,
  to: MedicationClinicalKnowledgeLifecycle
): void {
  const allowed = MEDICATION_CLINICAL_KNOWLEDGE_LIFECYCLE_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`Illegal clinical knowledge lifecycle transition ${from} → ${to}.`);
  }
}

export function assertApprovedKnowledgeImmutable(lifecycleStatus: string): void {
  if (lifecycleStatus === "APPROVED") {
    throw new Error(
      "Approved clinical knowledge cannot be modified in place; create a new version."
    );
  }
}

export function assertOnlyAdminMayApprove(roles: string[]): void {
  const ok =
    roles.includes("MEDICATION_ADMIN") || roles.includes("MEDORA_SUPER_ADMIN");
  if (!ok) {
    throw new Error("Only MEDICATION_ADMIN may approve clinical knowledge.");
  }
}

export function isClinicalKnowledgeEligibleForFutureUse(
  lifecycleStatus: MedicationClinicalKnowledgeLifecycle
): boolean {
  return lifecycleStatus === "APPROVED";
}
