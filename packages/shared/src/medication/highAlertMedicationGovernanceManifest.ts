import type { SafetyRequirementCode } from "./medicationSafetyClassifiers.js";
import {
  assertHighAlertMedicationGovernanceManifest,
  type HighAlertMedicationGovernanceEntry,
} from "./highAlertMedicationGovernanceValidation.js";

export type { HighAlertMedicationGovernanceEntry };

const INSULIN_REQS: SafetyRequirementCode[] = [
  "REQUIRES_INDEPENDENT_DOUBLE_CHECK",
  "REQUIRES_MAR_VERIFICATION",
];

const ANTICOAG_REQS: SafetyRequirementCode[] = [
  "REQUIRES_INDEPENDENT_DOUBLE_CHECK",
  "REQUIRES_MAR_VERIFICATION",
];

const OPIOID_REQS: SafetyRequirementCode[] = [
  "REQUIRES_INDEPENDENT_DOUBLE_CHECK",
  "REQUIRES_MAR_VERIFICATION",
  "REQUIRES_WASTE_DOCUMENTATION",
];

const BENZO_REQS: SafetyRequirementCode[] = ["REQUIRES_MAR_VERIFICATION"];

const SEDATIVE_REQS: SafetyRequirementCode[] = [
  "REQUIRES_MAR_VERIFICATION",
  "REQUIRES_DUAL_VERIFICATION",
];

const ELECTROLYTE_REQS: SafetyRequirementCode[] = [
  "REQUIRES_INDEPENDENT_DOUBLE_CHECK",
  "REQUIRES_MAR_VERIFICATION",
];

const VASOPRESSOR_REQS: SafetyRequirementCode[] = [
  "REQUIRES_INDEPENDENT_DOUBLE_CHECK",
  "REQUIRES_MAR_VERIFICATION",
];

const ANTIARRHYTHMIC_REQS: SafetyRequirementCode[] = ["REQUIRES_MAR_VERIFICATION"];

const PARALYTIC_REQS: SafetyRequirementCode[] = [
  "REQUIRES_INDEPENDENT_DOUBLE_CHECK",
  "REQUIRES_MAR_VERIFICATION",
];

/**
 * Governed high-alert assignments for medications **present in the Haiti catalog**.
 * Does not import absent agents (warfarin, enoxaparin, tPA, etc.).
 */
export const HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST: HighAlertMedicationGovernanceEntry[] = [
  // --- INSULIN ---
  {
    genericName: "Regular Insulin",
    displayNameEn: "Regular Insulin",
    strengthPattern: "100 UI/mL",
    highAlertClass: "HIGH_ALERT_INSULIN",
    safetyRequirementCodes: INSULIN_REQS,
    governanceStatus: "APPLY",
    rationale: "ISMP insulin high-alert; Haiti catalog SKU",
    sourcePhase: "M1.3D",
    manualReview: false,
  },
  {
    genericName: "NPH Insulin",
    displayNameEn: "NPH Insulin",
    strengthPattern: "100 UI/mL",
    highAlertClass: "HIGH_ALERT_INSULIN",
    safetyRequirementCodes: INSULIN_REQS,
    governanceStatus: "APPLY",
    rationale: "ISMP insulin high-alert; Haiti catalog SKU",
    sourcePhase: "M1.3D",
    manualReview: false,
  },
  {
    genericName: "Insulin 70/30",
    displayNameEn: "Insulin 70/30",
    strengthPattern: "100 UI/mL",
    highAlertClass: "HIGH_ALERT_INSULIN",
    safetyRequirementCodes: INSULIN_REQS,
    governanceStatus: "APPLY",
    rationale: "ISMP insulin high-alert; premix SKU",
    sourcePhase: "M1.3D",
    manualReview: false,
  },
  // --- ANTICOAGULANT ---
  {
    catalogCode: "HEPARIN_5000UI_ML_INJECTABLE",
    genericName: "Heparin",
    displayNameEn: "Heparin",
    highAlertClass: "HIGH_ALERT_ANTICOAGULANT",
    safetyRequirementCodes: ANTICOAG_REQS,
    governanceStatus: "APPLY",
    rationale: "ER anticoagulant high-alert; Haiti catalog",
    sourcePhase: "M1.3D",
    manualReview: false,
  },
  // --- OPIOID (overlaps M1.3C controlled; witness flags merged idempotently) ---
  {
    genericName: "Morphine",
    displayNameEn: "Morphine",
    strengthPattern: "10 mg/mL",
    highAlertClass: "HIGH_ALERT_OPIOID",
    safetyRequirementCodes: OPIOID_REQS,
    governanceStatus: "APPLY",
    rationale: "ER opioid high-alert + controlled II",
    sourcePhase: "M1.3D",
    manualReview: false,
  },
  {
    catalogCode: "HYDROMORPHONE_2MG_ML_INJECTABLE",
    genericName: "Hydromorphone",
    displayNameEn: "Hydromorphone",
    highAlertClass: "HIGH_ALERT_OPIOID",
    safetyRequirementCodes: OPIOID_REQS,
    governanceStatus: "APPLY",
    rationale: "ER opioid high-alert + controlled II",
    sourcePhase: "M1.3D",
    manualReview: false,
  },
  {
    catalogCode: "FENTANYL_50MCG_ML_INJECTABLE",
    genericName: "Fentanyl",
    displayNameEn: "Fentanyl",
    highAlertClass: "HIGH_ALERT_OPIOID",
    safetyRequirementCodes: OPIOID_REQS,
    governanceStatus: "APPLY",
    rationale: "ER opioid high-alert + controlled II",
    sourcePhase: "M1.3D",
    manualReview: false,
  },
  // --- BENZODIAZEPINE ---
  {
    catalogCode: "LORAZEPAM_2MG_ML_INJECTABLE",
    genericName: "Lorazepam",
    displayNameEn: "Lorazepam",
    highAlertClass: "HIGH_ALERT_BENZODIAZEPINE",
    safetyRequirementCodes: BENZO_REQS,
    governanceStatus: "APPLY",
    rationale: "ED benzodiazepine high-alert",
    sourcePhase: "M1.3D",
    manualReview: false,
  },
  {
    genericName: "Lorazepam",
    displayNameEn: "Lorazepam",
    strengthPattern: "2 mg",
    dosageFormPattern: "comprimé",
    highAlertClass: "HIGH_ALERT_BENZODIAZEPINE",
    safetyRequirementCodes: BENZO_REQS,
    governanceStatus: "APPLY",
    rationale: "Oral lorazepam high-alert",
    sourcePhase: "M1.3D",
    manualReview: false,
  },
  {
    genericName: "Diazepam",
    displayNameEn: "Diazepam",
    strengthPattern: "5 mg",
    dosageFormPattern: "comprimé",
    highAlertClass: "HIGH_ALERT_BENZODIAZEPINE",
    safetyRequirementCodes: BENZO_REQS,
    governanceStatus: "APPLY",
    rationale: "Oral diazepam high-alert",
    sourcePhase: "M1.3D",
    manualReview: false,
  },
  {
    genericName: "Diazepam",
    displayNameEn: "Diazepam",
    strengthPattern: "10 mg/2 mL",
    highAlertClass: "HIGH_ALERT_BENZODIAZEPINE",
    safetyRequirementCodes: BENZO_REQS,
    governanceStatus: "APPLY",
    rationale: "Injectable diazepam high-alert",
    sourcePhase: "M1.3D",
    manualReview: false,
  },
  // --- SEDATIVE ---
  {
    catalogCode: "MIDAZOLAM_5MG_ML_INJECTABLE",
    genericName: "Midazolam",
    displayNameEn: "Midazolam",
    highAlertClass: "HIGH_ALERT_SEDATIVE",
    safetyRequirementCodes: SEDATIVE_REQS,
    governanceStatus: "APPLY",
    rationale: "Procedural sedation agent",
    sourcePhase: "M1.3D",
    manualReview: false,
  },
  {
    catalogCode: "PROPOFOL_10MG_ML_IV",
    genericName: "Propofol",
    displayNameEn: "Propofol",
    highAlertClass: "HIGH_ALERT_SEDATIVE",
    safetyRequirementCodes: SEDATIVE_REQS,
    governanceStatus: "APPLY",
    rationale: "Deep sedation / RSI agent",
    sourcePhase: "M1.3D",
    manualReview: false,
  },
  {
    catalogCode: "KETAMINE_50MG_ML_INJECTABLE",
    genericName: "Ketamine",
    displayNameEn: "Ketamine",
    highAlertClass: "HIGH_ALERT_SEDATIVE",
    safetyRequirementCodes: SEDATIVE_REQS,
    governanceStatus: "APPLY",
    rationale: "Dissociative sedative; controlled III overlap",
    sourcePhase: "M1.3D",
    manualReview: false,
  },
  // --- ELECTROLYTE IVPB (M1.8B.7E.2B) ---
  {
    catalogCode: "POTASSIUM_CHLORIDE_20_MEQ_PER_10_ML_INJECTABLE_INTRAVENOUS",
    genericName: "Potassium chloride",
    displayNameEn: "Potassium chloride",
    highAlertClass: "HIGH_ALERT_ELECTROLYTE",
    safetyRequirementCodes: ELECTROLYTE_REQS,
    governanceStatus: "APPLY",
    rationale: "High-alert potassium concentrate / IVPB",
    sourcePhase: "M1.8B.7E.2B",
    manualReview: false,
  },
  {
    catalogCode: "POTASSIUM_CHLORIDE_10_MEQ_100_ML_PERFUSION_INTRAVEINEUSE",
    genericName: "Potassium chloride",
    displayNameEn: "Potassium chloride",
    highAlertClass: "HIGH_ALERT_ELECTROLYTE",
    safetyRequirementCodes: ELECTROLYTE_REQS,
    governanceStatus: "APPLY",
    rationale: "High-alert potassium IVPB bag",
    sourcePhase: "M1.8B.7E.2B",
    manualReview: false,
  },
  {
    catalogCode: "POTASSIUM_CHLORIDE_40_MEQ_1000_ML_PERFUSION_INTRAVEINEUSE",
    genericName: "Potassium chloride",
    displayNameEn: "Potassium chloride",
    highAlertClass: "HIGH_ALERT_ELECTROLYTE",
    safetyRequirementCodes: ELECTROLYTE_REQS,
    governanceStatus: "APPLY",
    rationale: "High-alert potassium replacement IVPB",
    sourcePhase: "M1.8B.7E.2B",
    manualReview: false,
  },
  {
    catalogCode: "MAGNESIUM_SULFATE_2_G_50_ML_INJECTABLE_INTRAVEINEUSE",
    genericName: "Magnesium sulfate",
    displayNameEn: "Magnesium sulfate",
    highAlertClass: "HIGH_ALERT_ELECTROLYTE",
    safetyRequirementCodes: ELECTROLYTE_REQS,
    governanceStatus: "APPLY",
    rationale: "High-alert magnesium IVPB (enterprise SKU)",
    sourcePhase: "M1.8B.7E.2B",
    manualReview: false,
  },
  {
    catalogCode: "MAGNESIUM_SULFATE_2_G_PER_50_ML_PERFUSION_INTRAVENOUS",
    genericName: "Magnesium sulfate",
    displayNameEn: "Magnesium sulfate",
    highAlertClass: "HIGH_ALERT_ELECTROLYTE",
    safetyRequirementCodes: ELECTROLYTE_REQS,
    governanceStatus: "APPLY",
    rationale: "High-alert magnesium IVPB (Haiti seed SKU)",
    sourcePhase: "M1.8B.7E.2B",
    manualReview: false,
  },
  {
    catalogCode: "MAGNESIUM_SULFATE_4_G_100_ML_PERFUSION_INTRAVEINEUSE",
    genericName: "Magnesium sulfate",
    displayNameEn: "Magnesium sulfate",
    highAlertClass: "HIGH_ALERT_ELECTROLYTE",
    safetyRequirementCodes: ELECTROLYTE_REQS,
    governanceStatus: "APPLY",
    rationale: "High-alert magnesium IVPB bag",
    sourcePhase: "M1.8B.7E.2B",
    manualReview: false,
  },
  {
    catalogCode: "MAGNESIUM_SULFATE_4_G_100_ML_OB_PERFUSION_INTRAVEINEUSE",
    genericName: "Magnesium sulfate",
    displayNameEn: "Magnesium sulfate",
    highAlertClass: "HIGH_ALERT_ELECTROLYTE",
    safetyRequirementCodes: ELECTROLYTE_REQS,
    governanceStatus: "APPLY",
    rationale: "High-alert magnesium OB loading IVPB",
    sourcePhase: "M1.8B.7E.2B",
    manualReview: false,
  },
  {
    catalogCode: "MAGNESIUM_SULFATE_40_G_1000_ML_OB_PERFUSION_INTRAVEINEUSE",
    genericName: "Magnesium sulfate",
    displayNameEn: "Magnesium sulfate",
    highAlertClass: "HIGH_ALERT_ELECTROLYTE",
    safetyRequirementCodes: ELECTROLYTE_REQS,
    governanceStatus: "APPLY",
    rationale: "High-alert magnesium OB maintenance IVPB",
    sourcePhase: "M1.8B.7E.2B",
    manualReview: false,
  },
  // --- VASOPRESSOR ---
  {
    catalogCode: "NOREPINEPHRINE_4MG_4ML_IV",
    genericName: "Norepinephrine",
    displayNameEn: "Norepinephrine",
    highAlertClass: "HIGH_ALERT_VASOPRESSOR",
    safetyRequirementCodes: VASOPRESSOR_REQS,
    governanceStatus: "APPLY",
    rationale: "Critical-care vasopressor",
    sourcePhase: "M1.3D",
    manualReview: false,
  },
  {
    genericName: "Adrenaline",
    displayNameEn: "Epinephrine",
    strengthPattern: "1 mg/mL",
    highAlertClass: "HIGH_ALERT_VASOPRESSOR",
    safetyRequirementCodes: VASOPRESSOR_REQS,
    governanceStatus: "APPLY",
    rationale: "Epinephrine (Adrenaline) pressor SKU",
    sourcePhase: "M1.3D",
    manualReview: false,
  },
  {
    catalogCode: "PHENYLEPHRINE_10MG_ML_IV",
    genericName: "Phenylephrine",
    displayNameEn: "Phenylephrine",
    highAlertClass: "HIGH_ALERT_VASOPRESSOR",
    safetyRequirementCodes: VASOPRESSOR_REQS,
    governanceStatus: "APPLY",
    rationale: "Vasopressor infusion",
    sourcePhase: "M1.3D",
    manualReview: false,
  },
  {
    catalogCode: "VASOPRESSIN_20UI_ML_IV",
    genericName: "Vasopressin",
    displayNameEn: "Vasopressin",
    highAlertClass: "HIGH_ALERT_VASOPRESSOR",
    safetyRequirementCodes: VASOPRESSOR_REQS,
    governanceStatus: "APPLY",
    rationale: "Vasopressor infusion",
    sourcePhase: "M1.3D",
    manualReview: false,
  },
  {
    catalogCode: "DOPAMINE_400MG_250ML_IV",
    genericName: "Dopamine",
    displayNameEn: "Dopamine",
    highAlertClass: "HIGH_ALERT_VASOPRESSOR",
    safetyRequirementCodes: VASOPRESSOR_REQS,
    governanceStatus: "APPLY",
    rationale: "Inotrope / vasopressor drip",
    sourcePhase: "M1.3D",
    manualReview: false,
  },
  {
    catalogCode: "DOBUTAMINE_250MG_20ML_IV",
    genericName: "Dobutamine",
    displayNameEn: "Dobutamine",
    highAlertClass: "HIGH_ALERT_VASOPRESSOR",
    safetyRequirementCodes: VASOPRESSOR_REQS,
    governanceStatus: "APPLY",
    rationale: "Inotrope infusion",
    sourcePhase: "M1.3D",
    manualReview: false,
  },
  // --- ANTIARRHYTHMIC ---
  {
    catalogCode: "AMIODARONE_150MG_3ML_IV",
    genericName: "Amiodarone",
    displayNameEn: "Amiodarone",
    highAlertClass: "HIGH_ALERT_ANTIARRHYTHMIC",
    safetyRequirementCodes: ANTIARRHYTHMIC_REQS,
    governanceStatus: "APPLY",
    rationale: "High-risk antiarrhythmic IV",
    sourcePhase: "M1.3D",
    manualReview: false,
  },
  // --- PARALYTIC ---
  {
    catalogCode: "ROCURONIUM_10MG_ML_IV",
    genericName: "Rocuronium",
    displayNameEn: "Rocuronium",
    highAlertClass: "HIGH_ALERT_PARALYTIC",
    safetyRequirementCodes: PARALYTIC_REQS,
    governanceStatus: "APPLY",
    rationale: "NMBA RSI agent",
    sourcePhase: "M1.3D",
    manualReview: false,
  },
  {
    catalogCode: "SUCCINYLCHOLINE_20MG_ML_IV",
    genericName: "Succinylcholine",
    displayNameEn: "Succinylcholine",
    highAlertClass: "HIGH_ALERT_PARALYTIC",
    safetyRequirementCodes: PARALYTIC_REQS,
    governanceStatus: "APPLY",
    rationale: "Depolarizing NMBA RSI",
    sourcePhase: "M1.3D",
    manualReview: false,
  },
  // --- Manual review ---
  {
    genericName: "Tramadol",
    displayNameEn: "Tramadol",
    strengthPattern: "50 mg",
    highAlertClass: "HIGH_ALERT_OPIOID",
    safetyRequirementCodes: ["REQUIRES_MAR_VERIFICATION"],
    governanceStatus: "MANUAL_REVIEW",
    rationale: "Weak opioid; HA class policy pending clinical sign-off",
    sourcePhase: "M1.3D",
    manualReview: true,
  },
  {
    genericName: "Tramadol",
    displayNameEn: "Tramadol",
    strengthPattern: "100 mg/2 mL",
    highAlertClass: "HIGH_ALERT_OPIOID",
    safetyRequirementCodes: ["REQUIRES_MAR_VERIFICATION"],
    governanceStatus: "MANUAL_REVIEW",
    rationale: "Tramadol injectable; not auto-applied",
    sourcePhase: "M1.3D",
    manualReview: true,
  },
  // --- Missing from catalog (document only) ---
  {
    genericName: "Warfarin",
    highAlertClass: "HIGH_ALERT_ANTICOAGULANT",
    safetyRequirementCodes: ANTICOAG_REQS,
    governanceStatus: "MISSING_CATALOG",
    rationale: "Not in Haiti catalog",
    sourcePhase: "M1.3D",
    manualReview: true,
  },
  {
    genericName: "Enoxaparin",
    highAlertClass: "HIGH_ALERT_ANTICOAGULANT",
    safetyRequirementCodes: ANTICOAG_REQS,
    governanceStatus: "MISSING_CATALOG",
    rationale: "Not in Haiti catalog",
    sourcePhase: "M1.3D",
    manualReview: true,
  },
  {
    genericName: "Apixaban",
    highAlertClass: "HIGH_ALERT_ANTICOAGULANT",
    safetyRequirementCodes: ANTICOAG_REQS,
    governanceStatus: "MISSING_CATALOG",
    rationale: "Not in Haiti catalog",
    sourcePhase: "M1.3D",
    manualReview: true,
  },
  {
    genericName: "Rivaroxaban",
    highAlertClass: "HIGH_ALERT_ANTICOAGULANT",
    safetyRequirementCodes: ANTICOAG_REQS,
    governanceStatus: "MISSING_CATALOG",
    rationale: "Not in Haiti catalog",
    sourcePhase: "M1.3D",
    manualReview: true,
  },
  {
    genericName: "Insulin glargine",
    highAlertClass: "HIGH_ALERT_INSULIN",
    safetyRequirementCodes: INSULIN_REQS,
    governanceStatus: "MISSING_CATALOG",
    rationale: "Basal insulin not in Haiti MVP catalog",
    sourcePhase: "M1.3D",
    manualReview: true,
  },
  {
    genericName: "Insulin lispro",
    highAlertClass: "HIGH_ALERT_INSULIN",
    safetyRequirementCodes: INSULIN_REQS,
    governanceStatus: "MISSING_CATALOG",
    rationale: "Rapid insulin not in Haiti MVP catalog",
    sourcePhase: "M1.3D",
    manualReview: true,
  },
  {
    genericName: "Insulin aspart",
    highAlertClass: "HIGH_ALERT_INSULIN",
    safetyRequirementCodes: INSULIN_REQS,
    governanceStatus: "MISSING_CATALOG",
    rationale: "Rapid insulin not in Haiti MVP catalog",
    sourcePhase: "M1.3D",
    manualReview: true,
  },
  {
    genericName: "Alteplase",
    highAlertClass: "HIGH_ALERT_THROMBOLYTIC",
    safetyRequirementCodes: [
      "REQUIRES_INDEPENDENT_DOUBLE_CHECK",
      "REQUIRES_MAR_VERIFICATION",
      "REQUIRES_OVERRIDE_REASON",
    ],
    governanceStatus: "MISSING_CATALOG",
    rationale: "tPA not in Haiti catalog",
    sourcePhase: "M1.3D",
    manualReview: true,
  },
];

assertHighAlertMedicationGovernanceManifest(HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST);

export const HIGH_ALERT_MEDICATION_GOVERNANCE_APPLY_COUNT =
  HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST.filter((e) => e.governanceStatus === "APPLY").length;

export const HIGH_ALERT_MEDICATION_GOVERNANCE_MANUAL_REVIEW_COUNT =
  HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST.filter((e) => e.governanceStatus === "MANUAL_REVIEW").length;

export const HIGH_ALERT_MEDICATION_GOVERNANCE_MISSING_CATALOG_COUNT =
  HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST.filter((e) => e.governanceStatus === "MISSING_CATALOG").length;

export const HIGH_ALERT_MEDICATION_GOVERNANCE_SAFETY_REQUIREMENT_CODE_COUNT =
  HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST.reduce((set, entry) => {
    for (const code of entry.safetyRequirementCodes) {
      set.add(code);
    }
    return set;
  }, new Set<string>()).size;
