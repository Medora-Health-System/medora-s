/**
 * MEDUI.TRILANG.DX.P2 — durable ICD-10-CM terminology contracts.
 * Display labels are exact-key only. Aliases are search-only.
 * Multiple provenance/sourceId rows may exist; at most one is effective for clinician display.
 *
 * provenance         = source CLASS (OFFICIAL_SOURCE | LICENSED_VENDOR | MEDORA_GOVERNED)
 * sourceId           = actual source identity (required, non-empty)
 * terminologyVersion = version of that source's terminology artifact / review set
 *
 * Source-row uniqueness includes terminologyVersion so IMO.2026.1 and IMO.2027.1
 * both remain auditable. Effective display is a separate partial unique.
 */

export const ICD10_CM_CODE_SYSTEM = "ICD-10-CM" as const;

export const ICD10_GOVERNED_TERMINOLOGY_VERSION = "MEDORA.TRILANG.DX.P2.GOVERNED.89";
export const ICD10_GOVERNED_SEARCH_ALIAS_VERSION = "MEDORA.TRILANG.DX.P2.SEARCH_ALIAS.ES.NARROW";
/** Stable Medora governed source identity. Not a file path. */
export const ICD10_GOVERNED_SOURCE_ID = "MEDORA_DX_GOVERNED";
export const ICD10_OFFICIAL_SOURCE_ID_FY2026 = "CDC_NCHS_FY2026";
/** Ministerio de Sanidad CIE-10-ES Diagnósticos 6ª edición 2026 (product-approved display source). */
export const ICD10_CIE10ES_SOURCE_ID = "CIE10ES_MS_DIAG_2026";
export const ICD10_CIE10ES_TERMINOLOGY_VERSION = "CIE10ES.6.2026";
export const ICD10_CIE10ES_ARTIFACT_SHA256 =
  "3695159d8f9a5a77e7ecdcee29657debbee4ed74b470a6d6143e99c80a5782fc";
/** Medora-governed FY2026 Spanish gap-closure set (not CIE-10-ES / not machine source). */
export const ICD10_FY2026_ES_GAP_SOURCE_ID = "MEDORA_DX_GOVERNED_FY2026_ES_GAP";
export const ICD10_FY2026_ES_GAP_TERMINOLOGY_VERSION = "MEDORA.TRILANG.DX.P3F7.ES.GAP.1";

export type Icd10TerminologyLabelRegister = "CLINICIAN_PREFERRED" | "CONSUMER";
export type Icd10TerminologyProvenance = "OFFICIAL_SOURCE" | "LICENSED_VENDOR" | "MEDORA_GOVERNED";
export type Icd10TerminologyExactness = "EXACT_SOURCE" | "EXACT_GOVERNED";
export type Icd10TerminologyStatus = "APPROVED" | "PENDING_REVIEW" | "REJECTED" | "SUPERSEDED";

export type Icd10DisplayExactness = Icd10TerminologyExactness | "UNLOCALIZED_CODE";

/**
 * Runtime display origin. Presentation metadata only — never persisted on Diagnosis.
 * Distinguishes catalog English vs approved terminology-row vs code-only.
 */
export const ICD10_DISPLAY_SOURCE_KINDS = ["CATALOG_SOURCE", "TERMINOLOGY_ROW", "UNLOCALIZED_CODE"] as const;
export type Icd10DisplaySourceKind = (typeof ICD10_DISPLAY_SOURCE_KINDS)[number];

/**
 * Lower number = higher preference within the same provenance class.
 * Not a substitute for provenance precedence.
 */
export const ICD10_SOURCE_PRIORITY = {
  MEDORA_GOVERNED: 10,
  LICENSED_VENDOR: 50,
  OFFICIAL_SOURCE: 80,
  DEFAULT: 100,
} as const;

export type Icd10DiagnosisDisplayResult = {
  code: string;
  displayName: string;
  exactness: Icd10DisplayExactness;
  provenance: Icd10TerminologyProvenance | null;
  localized: boolean;
  /** How the displayName was produced. Not a persistence field. */
  sourceKind: Icd10DisplaySourceKind;
};

export type Icd10CatalogDisplaySource = {
  code: string;
  codeSystem: string;
  releaseVersion: string;
  shortDescription: string | null;
  longDescription?: string | null;
};

export type Icd10TerminologyDisplayRow = {
  id?: string;
  codeSystem: string;
  releaseVersion: string;
  code: string;
  locale: string;
  preferredLabel: string;
  labelRegister: Icd10TerminologyLabelRegister;
  provenance: Icd10TerminologyProvenance;
  exactness: Icd10TerminologyExactness;
  status: Icd10TerminologyStatus;
  sourceId: string;
  terminologyVersion: string;
  sourcePriority?: number;
  isEffective?: boolean;
};

export const ICD10_CLINICIAN_PROVENANCE_PRECEDENCE: readonly Icd10TerminologyProvenance[] = [
  "MEDORA_GOVERNED",
  "LICENSED_VENDOR",
  "OFFICIAL_SOURCE",
];
