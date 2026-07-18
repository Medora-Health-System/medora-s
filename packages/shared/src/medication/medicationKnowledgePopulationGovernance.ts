/**
 * Phase 12 — controlled Emergency Medicine clinical/safety knowledge population.
 * Draft-only import; no automatic approval; no clinical activation.
 */

export const PHASE12_KNOWLEDGE_POPULATION_DEFAULTS = {
  providerFacingAlertsEnabled: false,
  orderBlockingEnabled: false,
  providerOverrideWorkflowEnabled: false,
  clinicalActivationEnabled: false,
  activeCdsModeAvailable: false,
  automaticMedicationIdentityCreationEnabled: false,
  automaticKnowledgeApprovalEnabled: false,
  recordsWithoutSourcesAllowed: false,
} as const;

/** Confirmed live-DB EM families for Phase 12 controlled batch (prompt-locked scope). */
export const PHASE12_EMERGENCY_MEDICATION_FAMILY_NAMES = [
  "acetaminophen",
  "ibuprofen",
  "naproxen",
  "aspirin",
  "ondansetron",
  "metoclopramide",
  "promethazine",
  "famotidine",
  "pantoprazole",
  "omeprazole",
  "lactulose",
  "ceftazidime",
  "vancomycin",
  "clindamycin",
  "azithromycin",
  "doxycycline",
  "ciprofloxacin",
  "metronidazole",
  "meropenem",
  "fluconazole",
  "acyclovir",
  "metoprolol",
  "heparin",
  "enoxaparin",
  "ipratropium",
  "budesonide",
  "dexamethasone",
  "prednisone",
  "cetirizine",
  "magnesium sulfate",
  "calcium gluconate",
  "potassium chloride",
  "tranexamic acid",
  "vitamin K",
  "oxytocin",
] as const;

export type Phase12EmergencyFamilyName =
  (typeof PHASE12_EMERGENCY_MEDICATION_FAMILY_NAMES)[number];

export const PHASE12_BATCH_STATUS_VALUES = [
  "DRAFT",
  "IDENTITY_RESOLUTION",
  "SOURCE_PREPARATION",
  "PREVIEW_READY",
  "DRY_RUN_VALIDATED",
  "CONTENT_CREATED",
  "UNDER_CLINICAL_REVIEW",
  "UNDER_PHARMACIST_REVIEW",
  "UNDER_MEDICAL_REVIEW",
  "PARTIALLY_APPROVED",
  "APPROVED",
  "COMPLETED",
  "BLOCKED",
  "REJECTED",
  "RETIRED",
] as const;

export type Phase12BatchStatus = (typeof PHASE12_BATCH_STATUS_VALUES)[number];

export const PHASE12_BATCH_STATUS_TRANSITIONS: Record<
  Phase12BatchStatus,
  readonly Phase12BatchStatus[]
> = {
  DRAFT: ["IDENTITY_RESOLUTION", "REJECTED"],
  IDENTITY_RESOLUTION: ["SOURCE_PREPARATION", "BLOCKED", "DRAFT"],
  SOURCE_PREPARATION: ["PREVIEW_READY", "BLOCKED"],
  PREVIEW_READY: ["DRY_RUN_VALIDATED", "SOURCE_PREPARATION"],
  DRY_RUN_VALIDATED: ["CONTENT_CREATED", "PREVIEW_READY"],
  CONTENT_CREATED: [
    "UNDER_CLINICAL_REVIEW",
    "UNDER_PHARMACIST_REVIEW",
    "BLOCKED",
  ],
  UNDER_CLINICAL_REVIEW: [
    "UNDER_PHARMACIST_REVIEW",
    "UNDER_MEDICAL_REVIEW",
    "PARTIALLY_APPROVED",
    "REJECTED",
  ],
  UNDER_PHARMACIST_REVIEW: [
    "UNDER_MEDICAL_REVIEW",
    "PARTIALLY_APPROVED",
    "APPROVED",
    "REJECTED",
  ],
  UNDER_MEDICAL_REVIEW: ["PARTIALLY_APPROVED", "APPROVED", "REJECTED"],
  PARTIALLY_APPROVED: ["UNDER_PHARMACIST_REVIEW", "APPROVED", "COMPLETED"],
  APPROVED: ["COMPLETED", "RETIRED"],
  COMPLETED: ["RETIRED"],
  BLOCKED: ["IDENTITY_RESOLUTION", "SOURCE_PREPARATION", "REJECTED"],
  REJECTED: ["DRAFT", "RETIRED"],
  RETIRED: [],
};

export const PHASE12_RESOLUTION_STATUS_VALUES = [
  "UNRESOLVED",
  "RESOLVED_EXACT",
  "RESOLVED_GOVERNED_MAPPING",
  "AMBIGUOUS",
  "MULTIPLE_CANDIDATES",
  "INACTIVE_TARGET",
  "IDENTITY_REVIEW_REQUIRED",
  "EXCLUDED",
] as const;

export type Phase12ResolutionStatus =
  (typeof PHASE12_RESOLUTION_STATUS_VALUES)[number];

export const PHASE12_SOURCE_TIER_VALUES = [
  "TIER_1_REGULATORY",
  "TIER_2_GOVERNMENT",
  "TIER_3_PROFESSIONAL_GUIDELINE",
  "TIER_4_LICENSED_COMPENDIUM",
  "TIER_5_INSTITUTIONAL_POLICY",
  "TIER_6_MANUFACTURER",
  "TIER_7_EXPERT_CONSENSUS",
] as const;

export const PHASE12_DOMAIN_APPLICABILITY_VALUES = [
  "REQUIRED",
  "APPLICABLE",
  "NOT_APPLICABLE",
  "SOURCE_UNAVAILABLE",
  "REVIEW_REQUIRED",
  "DEFERRED",
] as const;

export type Phase12DomainApplicability =
  (typeof PHASE12_DOMAIN_APPLICABILITY_VALUES)[number];

export const PHASE12_CLINICAL_DOMAIN_VALUES = [
  "CLINICAL_PROFILE",
  "COMMON_INDICATIONS",
  "EMERGENCY_INDICATIONS",
  "ADULT_DOSING",
  "PEDIATRIC_DOSING",
  "WEIGHT_BASED_DOSING",
  "MAXIMUM_SINGLE_DOSE",
  "MAXIMUM_DAILY_DOSE",
  "RENAL_ADJUSTMENT",
  "HEPATIC_ADJUSTMENT",
  "ADMINISTRATION",
  "RECONSTITUTION",
  "DILUTION",
  "INFUSION",
  "COMPATIBILITY_REFERENCE",
  "MONITORING",
  "CONTRAINDICATIONS",
  "PRECAUTIONS",
  "BLACK_BOX_WARNING",
  "PREGNANCY",
  "LACTATION",
  "HIGH_ALERT",
  "LASA",
  "CONTROLLED_STATUS",
  "STORAGE",
  "EMERGENCY_MEDICINE_PROFILE",
] as const;

export const PHASE12_SAFETY_DOMAIN_VALUES = [
  "THERAPEUTIC_CLASS_MEMBERSHIP",
  "DRUG_DRUG_INTERACTION",
  "DRUG_CLASS_INTERACTION",
  "CLASS_CLASS_INTERACTION",
  "ALLERGEN_MAPPING",
  "ACTIVE_INGREDIENT_ALLERGEN_MAPPING",
  "THERAPEUTIC_CLASS_ALLERGY_RELATIONSHIP",
  "CROSS_REACTIVITY",
  "DUPLICATE_THERAPY_MEMBERSHIP",
  "DUPLICATE_THERAPY_RULE",
  "ADDITIVE_TOXICITY_RULE",
  "HIGH_RISK_COMBINATION",
  "EMERGENCY_CONTEXT_EXCEPTION",
  "SAFETY_EVIDENCE",
] as const;

export const PHASE12_FIXTURE_MARKER = "PHASE12_KNOWLEDGE_FIXTURE";
export const PHASE12_BATCH_KEY = "EM_KNOWLEDGE_POPULATION_V1";
export const PHASE12_MANIFEST_VERSION = "1.0.0";

export const PHASE12_SUGGESTED_WAVES: Record<string, readonly string[]> = {
  WAVE_1: [
    "acetaminophen",
    "ibuprofen",
    "ondansetron",
    "famotidine",
    "pantoprazole",
    "dexamethasone",
    "prednisone",
    "cetirizine",
    "ipratropium",
  ],
  WAVE_2: [
    "ceftazidime",
    "vancomycin",
    "clindamycin",
    "azithromycin",
    "doxycycline",
    "ciprofloxacin",
    "metronidazole",
    "meropenem",
    "fluconazole",
    "acyclovir",
  ],
  WAVE_3: [
    "heparin",
    "enoxaparin",
    "magnesium sulfate",
    "calcium gluconate",
    "potassium chloride",
    "tranexamic acid",
    "vitamin K",
    "oxytocin",
  ],
  WAVE_4: [
    "naproxen",
    "aspirin",
    "metoclopramide",
    "promethazine",
    "omeprazole",
    "lactulose",
    "metoprolol",
    "budesonide",
  ],
};

export const PHASE12_HIGH_ALERT_REVIEW_CANDIDATES = [
  "heparin",
  "enoxaparin",
  "potassium chloride",
  "magnesium sulfate",
  "oxytocin",
  "vancomycin",
  "tranexamic acid",
] as const;

export function normalizeMedicationFamilyName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function familyKeyFromName(name: string): string {
  return `EM_FAM_${normalizeMedicationFamilyName(name)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")}`.toUpperCase();
}

export function assertPhase12BatchTransition(
  from: string,
  to: string
): void {
  const allowed =
    PHASE12_BATCH_STATUS_TRANSITIONS[from as Phase12BatchStatus] ?? [];
  if (!(allowed as readonly string[]).includes(to)) {
    throw new Error(`Invalid Phase 12 batch transition: ${from} → ${to}`);
  }
  if (from === "DRAFT" && to === "APPROVED") {
    throw new Error("Phase 12 forbids DRAFT → APPROVED.");
  }
}

export function assertNoDirectDraftToApproved(from: string, to: string): void {
  if (from === "DRAFT" && to === "APPROVED") {
    throw new Error("No direct import-to-approved pathway.");
  }
}

export function assertPhase12NoAutomaticApproval(autoApprove: boolean): void {
  if (autoApprove) {
    throw new Error("Phase 12 forbids automatic knowledge approval.");
  }
}

export function assertPhase12ClinicalActivationDisabled(
  enabled: boolean
): void {
  if (enabled) {
    throw new Error("Phase 12 forbids clinicalActivationEnabled=true.");
  }
}

export function assertPhase12NoProviderFacingAlerts(enabled: boolean): void {
  if (enabled) throw new Error("Phase 12 forbids provider-facing alerts.");
}

export function assertPhase12NoOrderBlocking(enabled: boolean): void {
  if (enabled) throw new Error("Phase 12 forbids order blocking.");
}

export function assertRecordsRequireSource(
  sourceVersionId: string | null | undefined
): void {
  if (!sourceVersionId) {
    throw new Error("Phase 12 forbids knowledge records without a source version.");
  }
}

export function isPhase12FixtureMarker(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.toUpperCase().includes("PHASE12_KNOWLEDGE_FIXTURE");
}

export function waveForFamily(familyName: string): string {
  const n = normalizeMedicationFamilyName(familyName);
  for (const [wave, names] of Object.entries(PHASE12_SUGGESTED_WAVES)) {
    if (names.map(normalizeMedicationFamilyName).includes(n)) return wave;
  }
  return "UNASSIGNED";
}

/** Default domain applicability scaffolding — not clinical truth. */
export function defaultClinicalDomainApplicability(
  familyName: string
): Record<string, Phase12DomainApplicability> {
  const n = normalizeMedicationFamilyName(familyName);
  const highAlert = (PHASE12_HIGH_ALERT_REVIEW_CANDIDATES as readonly string[])
    .map(normalizeMedicationFamilyName)
    .includes(n);
  const base: Record<string, Phase12DomainApplicability> = {
    CLINICAL_PROFILE: "REQUIRED",
    EMERGENCY_INDICATIONS: "REQUIRED",
    ADULT_DOSING: "REVIEW_REQUIRED",
    PEDIATRIC_DOSING: "REVIEW_REQUIRED",
    WEIGHT_BASED_DOSING: "REVIEW_REQUIRED",
    ADMINISTRATION: "REQUIRED",
    MONITORING: "APPLICABLE",
    CONTRAINDICATIONS: "REQUIRED",
    PRECAUTIONS: "APPLICABLE",
    PREGNANCY: "REVIEW_REQUIRED",
    LACTATION: "REVIEW_REQUIRED",
    EMERGENCY_MEDICINE_PROFILE: "REQUIRED",
    HIGH_ALERT: highAlert ? "REVIEW_REQUIRED" : "NOT_APPLICABLE",
    RENAL_ADJUSTMENT: "REVIEW_REQUIRED",
    HEPATIC_ADJUSTMENT: "REVIEW_REQUIRED",
    INFUSION: "REVIEW_REQUIRED",
    BLACK_BOX_WARNING: "REVIEW_REQUIRED",
  };
  return base;
}

export function defaultSafetyDomainApplicability(): Record<
  string,
  Phase12DomainApplicability
> {
  return {
    THERAPEUTIC_CLASS_MEMBERSHIP: "REQUIRED",
    ACTIVE_INGREDIENT_ALLERGEN_MAPPING: "REQUIRED",
    DUPLICATE_THERAPY_MEMBERSHIP: "REQUIRED",
    DRUG_DRUG_INTERACTION: "REVIEW_REQUIRED",
    CROSS_REACTIVITY: "REVIEW_REQUIRED",
    EMERGENCY_CONTEXT_EXCEPTION: "APPLICABLE",
  };
}

export function evaluateShadowEligibilityGates(input: {
  identityResolved: boolean;
  hasGovernedSourceVersion: boolean;
  clinicalProfileApproved: boolean;
  administrationReviewed: boolean;
  monitoringReviewed: boolean;
  therapeuticClassReviewed: boolean;
  allergyMappingReviewed: boolean;
  duplicateTherapyReviewed: boolean;
  majorSafetyKnowledgeReviewed: boolean;
  emergencyContextReviewed: boolean;
  criticalConflictCount: number;
  identityBlockerCount: number;
}): {
  shadowEvaluable: boolean;
  reasonCodes: string[];
  gates: Record<string, boolean>;
} {
  const gates = {
    identityResolved: input.identityResolved,
    hasGovernedSourceVersion: input.hasGovernedSourceVersion,
    clinicalProfileApproved: input.clinicalProfileApproved,
    administrationReviewed: input.administrationReviewed,
    monitoringReviewed: input.monitoringReviewed,
    therapeuticClassReviewed: input.therapeuticClassReviewed,
    allergyMappingReviewed: input.allergyMappingReviewed,
    duplicateTherapyReviewed: input.duplicateTherapyReviewed,
    majorSafetyKnowledgeReviewed: input.majorSafetyKnowledgeReviewed,
    emergencyContextReviewed: input.emergencyContextReviewed,
    noCriticalConflicts: input.criticalConflictCount === 0,
    noIdentityBlockers: input.identityBlockerCount === 0,
  };
  const reasonCodes = Object.entries(gates)
    .filter(([, ok]) => !ok)
    .map(([k]) => `GATE_FAILED_${k}`);
  return {
    shadowEvaluable: Object.values(gates).every(Boolean),
    reasonCodes,
    gates,
  };
}
