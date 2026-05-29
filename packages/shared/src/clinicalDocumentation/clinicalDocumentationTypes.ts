export const CLINICAL_DOCUMENTATION_CATEGORIES = [
  "FLOWSHEETS",
  "SCORES_AND_SCREENS",
  "INTAKE_OUTPUT",
  "SAFETY_DOCUMENTATION",
  "RESPIRATORY_DOCUMENTATION",
  "BLOOD_PRODUCT_DOCUMENTATION",
  "STROKE_DOCUMENTATION",
  "CARDIAC_MONITORING_DOCUMENTATION",
  "OBSERVATION_DOCUMENTATION",
  "RESTRAINT_DOCUMENTATION",
  "PROCEDURE_MONITORING",
] as const;

export type ClinicalDocumentationCategory = (typeof CLINICAL_DOCUMENTATION_CATEGORIES)[number];

export const CLINICAL_DOCUMENTATION_CARE_SETTINGS = [
  "ED",
  "OBSERVATION",
  "INPATIENT",
  "ICU",
  "TELEMETRY",
  "CLINIC",
  "URGENT_CARE",
] as const;

export type ClinicalDocumentationCareSetting = (typeof CLINICAL_DOCUMENTATION_CARE_SETTINGS)[number];

export const CLINICAL_DOCUMENTATION_ROLES = [
  "RN",
  "PROVIDER",
  "TECHNICIAN",
  "RT",
  "LAB",
  "RADIOLOGY",
  "MULTI_ROLE",
] as const;

export type ClinicalDocumentationRole = (typeof CLINICAL_DOCUMENTATION_ROLES)[number];

export const CLINICAL_DOCUMENTATION_IMPLEMENTATION_STATUSES = [
  "AVAILABLE",
  "FOUNDATION_ONLY",
  "FUTURE",
] as const;

export type ClinicalDocumentationImplementationStatus =
  (typeof CLINICAL_DOCUMENTATION_IMPLEMENTATION_STATUSES)[number];

/** Workflow readiness (distinct from implementation depth). */
export const CLINICAL_DOCUMENTATION_CARD_STATUSES = ["ACTIVE", "PLACEHOLDER"] as const;

export type ClinicalDocumentationCardStatus = (typeof CLINICAL_DOCUMENTATION_CARD_STATUSES)[number];

export type ClinicalDocumentationCard = {
  id: string;
  titleEn: string;
  titleFr: string;
  category: ClinicalDocumentationCategory;
  careSettings: readonly ClinicalDocumentationCareSetting[];
  primaryRole: ClinicalDocumentationRole;
  legalChartSection: string;
  repeatable: boolean;
  status: ClinicalDocumentationCardStatus;
  implementationStatus: ClinicalDocumentationImplementationStatus;
  tags: readonly string[];
  searchAliases: readonly string[];
  descriptionEn: string;
  descriptionFr: string;
  /** EDOC.4 — platform default dual-signature when true (facility policy may extend). */
  requiresWitnessSignature?: boolean;
};

export type ClinicalDocumentationCategoryMeta = {
  id: ClinicalDocumentationCategory;
  titleEn: string;
  titleFr: string;
  descriptionEn: string;
  descriptionFr: string;
};
