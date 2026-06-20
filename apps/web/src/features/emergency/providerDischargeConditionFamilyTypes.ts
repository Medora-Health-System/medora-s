/**
 * MEDUI.ED.DISCHARGE.TEMPLATE_FAMILY_COVERAGE.2
 * Shared types for clinical condition family architecture.
 */

export type ClinicalConditionFamilyReviewStatus = "draft" | "reviewed" | "approved";

/** Conservative routing review gate — audit and future production switch. */
export type ClinicalConditionFamilyRoutingStatus =
  | "READY"
  | "NEEDS_REVIEW"
  | "UNSAFE_DO_NOT_MAP"
  | "DEFERRED_SPECIALTY_ONLY";

export type EdClinicalDomain =
  | "Respiratory"
  | "Cardiac"
  | "Neurologic"
  | "Gastrointestinal"
  | "Genitourinary"
  | "Skin/Infection"
  | "Musculoskeletal"
  | "Trauma"
  | "Behavioral Health"
  | "OB/GYN"
  | "Endocrine"
  | "Toxicology"
  | "ENT"
  | "Ophthalmology"
  | "Dental"
  | "General Medical";

export type ClinicalConditionFamilyAgeGuardrail = {
  /** Family eligible only when patient age is strictly below this value (pediatric). */
  maxAgeYears?: number;
  /** Family eligible only when patient age is at or above this value. */
  minAgeYears?: number;
};

export type ClinicalConditionFamilySexGuardrail = {
  /** Restrict to documented sex when available (future chart context). */
  sex?: "female" | "male";
};

export type ClinicalConditionFamilySafetyGuardrails = {
  /** Route only when high-risk escalation language is clinically appropriate. */
  highRiskEscalation?: boolean;
  /** Crisis / behavioral return precautions required in template. */
  requiresCrisisReturnPrecautions?: boolean;
  /** Specialist follow-up recommended (audit metadata). */
  requiresSpecialistFollowUp?: boolean;
  /** ED return precaution block required. */
  requiresEdReturnPrecautions?: boolean;
};

export type ClinicalConditionFamilyGuardrails = {
  age?: ClinicalConditionFamilyAgeGuardrail;
  sex?: ClinicalConditionFamilySexGuardrail;
  /** When true, family requires explicit pregnancy context (future chart context). */
  pregnancyContextRequired?: boolean;
  safety?: ClinicalConditionFamilySafetyGuardrails;
};

/** Maps specific ICD exact codes to alternate templates within the same clinical family. */
export type ClinicalConditionFamilyIcdExactTemplateOverrides = Readonly<Record<string, string>>;

export type ClinicalConditionFamilyDefinition = {
  id: string;
  label: string;
  templateId: string;
  /** Additional registry templates covered by this family (coverage metrics only). */
  additionalTemplateIds?: readonly string[];
  clinicalDomain: EdClinicalDomain;
  icdExact?: readonly string[];
  icdPrefixes?: readonly string[];
  excludeIcdExact?: readonly string[];
  excludeIcdPrefixes?: readonly string[];
  keywords?: readonly string[];
  icdExactTemplateOverrides?: ClinicalConditionFamilyIcdExactTemplateOverrides;
  guardrails?: ClinicalConditionFamilyGuardrails;
  specialtyCategory: string;
  riskCategory: string;
  clinicalRationale: string;
  reviewStatus: ClinicalConditionFamilyReviewStatus;
  routingStatus: ClinicalConditionFamilyRoutingStatus;
  sourceReferenceLabels?: readonly string[];
};
