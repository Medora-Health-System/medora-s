import {
  assertLasaMedicationGovernanceManifest,
  type LasaMedicationGovernanceEntry,
} from "./lasaMedicationGovernanceValidation.js";

export type { LasaMedicationGovernanceEntry };

/**
 * Governed LASA groups for medications **present in the Haiti catalog**.
 */
export const LASA_MEDICATION_GOVERNANCE_MANIFEST: LasaMedicationGovernanceEntry[] = [
  // --- LASA_HIGH: opioid look-alike ---
  {
    lasaGroupCode: "GROUP_LASA_OPIOID_MORPHINE_HYDROMORPHONE",
    lasaGroupLabel: "Morphine / hydromorphone",
    lasaSeverity: "LASA_HIGH",
    genericName: "Morphine",
    displayNameEn: "Morphine",
    strengthPattern: "10 mg/mL",
    governanceStatus: "APPLY",
    rationale: "ISMP LASA opioid pair; Haiti ER injectable morphine",
    sourcePhase: "M1.3E",
    manualReview: false,
  },
  {
    lasaGroupCode: "GROUP_LASA_OPIOID_MORPHINE_HYDROMORPHONE",
    lasaGroupLabel: "Morphine / hydromorphone",
    lasaSeverity: "LASA_HIGH",
    catalogCode: "HYDROMORPHONE_2MG_ML_INJECTABLE",
    genericName: "Hydromorphone",
    displayNameEn: "Hydromorphone",
    governanceStatus: "APPLY",
    rationale: "ISMP LASA opioid pair; Haiti catalog",
    sourcePhase: "M1.3E",
    manualReview: false,
  },
  // --- LASA_HIGH: vasopressor sound-alike ---
  {
    lasaGroupCode: "GROUP_LASA_VASOPRESSOR_EPI_NOREPI",
    lasaGroupLabel: "Epinephrine / norepinephrine",
    lasaSeverity: "LASA_HIGH",
    genericName: "Adrenaline",
    displayNameEn: "Epinephrine",
    strengthPattern: "1 mg/mL",
    governanceStatus: "APPLY",
    rationale: "Epinephrine vs norepinephrine LASA; Adrenaline SKU",
    sourcePhase: "M1.3E",
    manualReview: false,
  },
  {
    lasaGroupCode: "GROUP_LASA_VASOPRESSOR_EPI_NOREPI",
    lasaGroupLabel: "Epinephrine / norepinephrine",
    lasaSeverity: "LASA_HIGH",
    catalogCode: "NOREPINEPHRINE_4MG_4ML_IV",
    genericName: "Norepinephrine",
    displayNameEn: "Norepinephrine",
    governanceStatus: "APPLY",
    rationale: "Epinephrine vs norepinephrine LASA",
    sourcePhase: "M1.3E",
    manualReview: false,
  },
  // --- LASA_HIGH: inotrope look-alike ---
  {
    lasaGroupCode: "GROUP_LASA_INOTROPE_DOPAMINE_DOBUTAMINE",
    lasaGroupLabel: "Dopamine / dobutamine",
    lasaSeverity: "LASA_HIGH",
    catalogCode: "DOPAMINE_400MG_250ML_IV",
    genericName: "Dopamine",
    displayNameEn: "Dopamine",
    governanceStatus: "APPLY",
    rationale: "Dopamine vs dobutamine LASA",
    sourcePhase: "M1.3E",
    manualReview: false,
  },
  {
    lasaGroupCode: "GROUP_LASA_INOTROPE_DOPAMINE_DOBUTAMINE",
    lasaGroupLabel: "Dopamine / dobutamine",
    lasaSeverity: "LASA_HIGH",
    catalogCode: "DOBUTAMINE_250MG_20ML_IV",
    genericName: "Dobutamine",
    displayNameEn: "Dobutamine",
    governanceStatus: "APPLY",
    rationale: "Dopamine vs dobutamine LASA",
    sourcePhase: "M1.3E",
    manualReview: false,
  },
  // --- LASA_MEDIUM: cephalosporin look-alike ---
  {
    lasaGroupCode: "GROUP_LASA_CEFAZOLIN_CEFTRIAXONE",
    lasaGroupLabel: "Cefazolin / ceftriaxone",
    lasaSeverity: "LASA_MEDIUM",
    catalogCode: "CEFAZOLIN_1G_INJECTABLE",
    genericName: "Cefazolin",
    displayNameEn: "Cefazolin",
    governanceStatus: "APPLY",
    rationale: "Ceph LASA pair; 1 g injectable anchor SKU",
    sourcePhase: "M1.3E",
    manualReview: false,
  },
  {
    lasaGroupCode: "GROUP_LASA_CEFAZOLIN_CEFTRIAXONE",
    lasaGroupLabel: "Cefazolin / ceftriaxone",
    lasaSeverity: "LASA_MEDIUM",
    genericName: "Ceftriaxone",
    displayNameEn: "Ceftriaxone",
    strengthPattern: "1 g",
    dosageFormPattern: "injectable",
    governanceStatus: "APPLY",
    rationale: "Ceph LASA pair; 1 g injectable anchor SKU",
    sourcePhase: "M1.3E",
    manualReview: false,
  },
  // --- MANUAL_REVIEW: insulin types ---
  {
    lasaGroupCode: "GROUP_LASA_INSULIN_TYPES",
    lasaGroupLabel: "Insulin product types",
    lasaSeverity: "LASA_HIGH",
    genericName: "Regular Insulin",
    displayNameEn: "Regular Insulin",
    strengthPattern: "100 UI/mL",
    governanceStatus: "MANUAL_REVIEW",
    rationale: "Insulin LASA policy requires clinical sign-off before APPLY",
    sourcePhase: "M1.3E",
    manualReview: true,
  },
  {
    lasaGroupCode: "GROUP_LASA_INSULIN_TYPES",
    lasaGroupLabel: "Insulin product types",
    lasaSeverity: "LASA_HIGH",
    genericName: "NPH Insulin",
    displayNameEn: "NPH Insulin",
    strengthPattern: "100 UI/mL",
    governanceStatus: "MANUAL_REVIEW",
    rationale: "Insulin LASA policy requires clinical sign-off before APPLY",
    sourcePhase: "M1.3E",
    manualReview: true,
  },
  {
    lasaGroupCode: "GROUP_LASA_INSULIN_TYPES",
    lasaGroupLabel: "Insulin product types",
    lasaSeverity: "LASA_HIGH",
    genericName: "Insulin 70/30",
    displayNameEn: "Insulin 70/30",
    strengthPattern: "100 UI/mL",
    governanceStatus: "MANUAL_REVIEW",
    rationale: "Insulin LASA policy requires clinical sign-off before APPLY",
    sourcePhase: "M1.3E",
    manualReview: true,
  },
  // --- MANUAL_REVIEW: corticosteroid name similarity ---
  {
    lasaGroupCode: "GROUP_LASA_PREDNISONE_PREDNISOLONE",
    lasaGroupLabel: "Prednisone / prednisolone",
    lasaSeverity: "LASA_MEDIUM",
    genericName: "Prednisone",
    displayNameEn: "Prednisone",
    strengthPattern: "5 mg",
    dosageFormPattern: "comprimé",
    governanceStatus: "MANUAL_REVIEW",
    rationale: "Multiple SKUs per steroid; clinical review before APPLY",
    sourcePhase: "M1.3E",
    manualReview: true,
  },
  {
    lasaGroupCode: "GROUP_LASA_PREDNISONE_PREDNISOLONE",
    lasaGroupLabel: "Prednisone / prednisolone",
    lasaSeverity: "LASA_MEDIUM",
    genericName: "Prednisolone",
    displayNameEn: "Prednisolone",
    strengthPattern: "5 mg",
    dosageFormPattern: "comprimé",
    governanceStatus: "MANUAL_REVIEW",
    rationale: "Multiple SKUs per steroid; clinical review before APPLY",
    sourcePhase: "M1.3E",
    manualReview: true,
  },
  // --- MISSING_CATALOG: hydralazine / hydroxyzine ---
  {
    lasaGroupCode: "GROUP_LASA_HYDRA_HYDROXYZINE",
    lasaGroupLabel: "Hydralazine / hydroxyzine",
    lasaSeverity: "LASA_MEDIUM",
    genericName: "Hydralazine",
    governanceStatus: "MISSING_CATALOG",
    rationale: "Hydralazine not in Haiti catalog",
    sourcePhase: "M1.3E",
    manualReview: true,
  },
  {
    lasaGroupCode: "GROUP_LASA_HYDRA_HYDROXYZINE",
    lasaGroupLabel: "Hydralazine / hydroxyzine",
    lasaSeverity: "LASA_MEDIUM",
    genericName: "Hydroxyzine",
    governanceStatus: "MISSING_CATALOG",
    rationale: "Hydroxyzine not in Haiti catalog",
    sourcePhase: "M1.3E",
    manualReview: true,
  },
  // --- MISSING_CATALOG / MANUAL_REVIEW: clonidine / clonazepam ---
  {
    lasaGroupCode: "GROUP_LASA_CLONIDINE_CLONAZEPAM",
    lasaGroupLabel: "Clonidine / clonazepam",
    lasaSeverity: "LASA_HIGH",
    catalogCode: "CLONIDINE_0_1_MG_COMPRIME_ORAL",
    genericName: "Clonidine",
    displayNameEn: "Clonidine",
    governanceStatus: "MANUAL_REVIEW",
    rationale: "Clonidine in catalog; clonazepam still missing — LASA pair manual review",
    sourcePhase: "M1.8B",
    manualReview: true,
  },
  {
    lasaGroupCode: "GROUP_LASA_CLONIDINE_CLONAZEPAM",
    lasaGroupLabel: "Clonidine / clonazepam",
    lasaSeverity: "LASA_HIGH",
    genericName: "Clonazepam",
    governanceStatus: "MISSING_CATALOG",
    rationale: "Clonazepam not in Haiti catalog",
    sourcePhase: "M1.3E",
    manualReview: true,
  },
];

assertLasaMedicationGovernanceManifest(LASA_MEDICATION_GOVERNANCE_MANIFEST);

export const LASA_MEDICATION_GOVERNANCE_APPLY_MEMBER_COUNT = LASA_MEDICATION_GOVERNANCE_MANIFEST.filter(
  (e) => e.governanceStatus === "APPLY"
).length;

export const LASA_MEDICATION_GOVERNANCE_MANUAL_REVIEW_COUNT =
  LASA_MEDICATION_GOVERNANCE_MANIFEST.filter((e) => e.governanceStatus === "MANUAL_REVIEW").length;

export const LASA_MEDICATION_GOVERNANCE_MISSING_CATALOG_COUNT =
  LASA_MEDICATION_GOVERNANCE_MANIFEST.filter((e) => e.governanceStatus === "MISSING_CATALOG").length;

export const LASA_MEDICATION_GOVERNANCE_GROUP_COUNT = new Set(
  LASA_MEDICATION_GOVERNANCE_MANIFEST.map((e) => e.lasaGroupCode)
).size;

export const LASA_MEDICATION_GOVERNANCE_APPLY_GROUP_COUNT = new Set(
  LASA_MEDICATION_GOVERNANCE_MANIFEST.filter((e) => e.governanceStatus === "APPLY").map(
    (e) => e.lasaGroupCode
  )
).size;
