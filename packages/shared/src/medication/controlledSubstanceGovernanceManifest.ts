import {
  assertControlledSubstanceGovernanceManifest,
  type ControlledSubstanceGovernanceEntry,
} from "./controlledSubstanceGovernanceValidation.js";

export type { ControlledSubstanceGovernanceEntry };

/**
 * Governed controlled-substance assignments for medications **present in the Haiti catalog**.
 * Does not import absent molecules (hydrocodone, oxycodone, etc.).
 */
export const CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST: ControlledSubstanceGovernanceEntry[] = [
  // --- Schedule II (opioids) — catalog present ---
  {
    catalogCode: "HYDROMORPHONE_2MG_ML_INJECTABLE",
    genericName: "Hydromorphone",
    displayNameEn: "Hydromorphone",
    controlledSubstanceClass: "CONTROLLED_SCHEDULE_II",
    deaSchedule: "II",
    governanceStatus: "APPLY",
    rationale: "ER opioid; Haiti seed already flags II with double-sign",
    sourcePhase: "M1.3C",
    manualReview: false,
    requiresDoubleSign: true,
  },
  {
    catalogCode: "FENTANYL_50MCG_ML_INJECTABLE",
    genericName: "Fentanyl",
    displayNameEn: "Fentanyl",
    controlledSubstanceClass: "CONTROLLED_SCHEDULE_II",
    deaSchedule: "II",
    governanceStatus: "APPLY",
    rationale: "ER opioid; Haiti seed already flags II",
    sourcePhase: "M1.3C",
    manualReview: false,
    requiresDoubleSign: true,
  },
  {
    genericName: "Morphine",
    displayNameEn: "Morphine",
    strengthPattern: "10 mg/mL",
    controlledSubstanceClass: "CONTROLLED_SCHEDULE_II",
    deaSchedule: "II",
    governanceStatus: "APPLY",
    rationale: "Morphine injectable in Haiti catalog; align legacy + safety profile",
    sourcePhase: "M1.3C",
    manualReview: false,
    requiresDoubleSign: true,
  },
  // --- Schedule III ---
  {
    catalogCode: "KETAMINE_50MG_ML_INJECTABLE",
    genericName: "Ketamine",
    displayNameEn: "Ketamine",
    controlledSubstanceClass: "CONTROLLED_SCHEDULE_III",
    deaSchedule: "III",
    governanceStatus: "APPLY",
    rationale: "Haiti seed flags III with double-sign",
    sourcePhase: "M1.3C",
    manualReview: false,
    requiresDoubleSign: true,
  },
  // --- Schedule IV (benzodiazepines) ---
  {
    catalogCode: "MIDAZOLAM_5MG_ML_INJECTABLE",
    genericName: "Midazolam",
    displayNameEn: "Midazolam",
    controlledSubstanceClass: "CONTROLLED_SCHEDULE_IV",
    deaSchedule: "IV",
    governanceStatus: "APPLY",
    rationale: "ED benzodiazepine; Haiti seed flags IV",
    sourcePhase: "M1.3C",
    manualReview: false,
    requiresDoubleSign: false,
  },
  {
    catalogCode: "LORAZEPAM_2MG_ML_INJECTABLE",
    genericName: "Lorazepam",
    displayNameEn: "Lorazepam",
    controlledSubstanceClass: "CONTROLLED_SCHEDULE_IV",
    deaSchedule: "IV",
    governanceStatus: "APPLY",
    rationale: "Lorazepam injectable; M1.1B partial flag — complete coverage",
    sourcePhase: "M1.3C",
    manualReview: false,
    requiresDoubleSign: false,
  },
  {
    genericName: "Lorazepam",
    displayNameEn: "Lorazepam",
    strengthPattern: "2 mg",
    dosageFormPattern: "comprimé",
    controlledSubstanceClass: "CONTROLLED_SCHEDULE_IV",
    deaSchedule: "IV",
    governanceStatus: "APPLY",
    rationale: "Lorazepam oral; M1.1B gap — oral SKU unflagged",
    sourcePhase: "M1.3C",
    manualReview: false,
    requiresDoubleSign: false,
  },
  {
    genericName: "Diazepam",
    displayNameEn: "Diazepam",
    strengthPattern: "5 mg",
    dosageFormPattern: "comprimé",
    controlledSubstanceClass: "CONTROLLED_SCHEDULE_IV",
    deaSchedule: "IV",
    governanceStatus: "APPLY",
    rationale: "Diazepam oral; M1.1B gap — unflagged",
    sourcePhase: "M1.3C",
    manualReview: false,
    requiresDoubleSign: false,
  },
  {
    genericName: "Diazepam",
    displayNameEn: "Diazepam",
    strengthPattern: "10 mg/2 mL",
    controlledSubstanceClass: "CONTROLLED_SCHEDULE_IV",
    deaSchedule: "IV",
    governanceStatus: "APPLY",
    rationale: "Diazepam injectable; M1.1B gap — unflagged",
    sourcePhase: "M1.3C",
    manualReview: false,
    requiresDoubleSign: false,
  },
  // --- Manual review (policy uncertain) ---
  {
    genericName: "Tramadol",
    displayNameEn: "Tramadol",
    strengthPattern: "50 mg",
    controlledSubstanceClass: "CONTROLLED_SCHEDULE_IV",
    deaSchedule: "IV",
    governanceStatus: "MANUAL_REVIEW",
    rationale: "Tramadol schedule jurisdiction-dependent; not auto-applied per M1.3C policy",
    sourcePhase: "M1.3C",
    manualReview: true,
  },
  {
    genericName: "Tramadol",
    displayNameEn: "Tramadol",
    strengthPattern: "100 mg/2 mL",
    controlledSubstanceClass: "CONTROLLED_SCHEDULE_IV",
    deaSchedule: "IV",
    governanceStatus: "MANUAL_REVIEW",
    rationale: "Tramadol injectable; clinical sign-off required before APPLY",
    sourcePhase: "M1.3C",
    manualReview: true,
  },
  // --- Not in catalog (document only; no import) ---
  {
    genericName: "Hydrocodone",
    controlledSubstanceClass: "CONTROLLED_SCHEDULE_II",
    deaSchedule: "II",
    governanceStatus: "MISSING_CATALOG",
    rationale: "Not in Haiti catalog; future formulary decision",
    sourcePhase: "M1.3C",
    manualReview: true,
  },
  {
    genericName: "Oxycodone",
    controlledSubstanceClass: "CONTROLLED_SCHEDULE_II",
    deaSchedule: "II",
    governanceStatus: "MISSING_CATALOG",
    rationale: "Not in Haiti catalog; future formulary decision",
    sourcePhase: "M1.3C",
    manualReview: true,
  },
  {
    genericName: "Codeine",
    controlledSubstanceClass: "CONTROLLED_SCHEDULE_II",
    deaSchedule: "II",
    governanceStatus: "MISSING_CATALOG",
    rationale: "Not in Haiti catalog; formulation-dependent",
    sourcePhase: "M1.3C",
    manualReview: true,
  },
  {
    genericName: "Alprazolam",
    controlledSubstanceClass: "CONTROLLED_SCHEDULE_IV",
    deaSchedule: "IV",
    governanceStatus: "MISSING_CATALOG",
    rationale: "Not in Haiti catalog",
    sourcePhase: "M1.3C",
    manualReview: true,
  },
  {
    genericName: "Clonazepam",
    controlledSubstanceClass: "CONTROLLED_SCHEDULE_IV",
    deaSchedule: "IV",
    governanceStatus: "MISSING_CATALOG",
    rationale: "Not in Haiti catalog",
    sourcePhase: "M1.3C",
    manualReview: true,
  },
];

assertControlledSubstanceGovernanceManifest(CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST);

export const CONTROLLED_SUBSTANCE_GOVERNANCE_APPLY_COUNT = CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST.filter(
  (e) => e.governanceStatus === "APPLY"
).length;

export const CONTROLLED_SUBSTANCE_GOVERNANCE_MANUAL_REVIEW_COUNT =
  CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST.filter((e) => e.governanceStatus === "MANUAL_REVIEW").length;

export const CONTROLLED_SUBSTANCE_GOVERNANCE_MISSING_CATALOG_COUNT =
  CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST.filter((e) => e.governanceStatus === "MISSING_CATALOG").length;
