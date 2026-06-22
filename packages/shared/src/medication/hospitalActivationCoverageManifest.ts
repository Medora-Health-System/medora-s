/**
 * MEDUI.MEDICATION.GOVERNED_ACTIVATION_FRAMEWORK.1
 * Hospital activation coverage groups for gap analysis (identify only — no activation).
 */

export type HospitalActivationCoverageGroupId =
  | "analgesics"
  | "nsaids"
  | "antibiotics"
  | "antivirals"
  | "antifungals"
  | "antihypertensives"
  | "heart_failure"
  | "antiarrhythmics"
  | "anticoagulants"
  | "thrombolytics"
  | "diabetes"
  | "insulin"
  | "electrolytes"
  | "iv_fluids"
  | "respiratory"
  | "asthma"
  | "copd"
  | "seizure"
  | "psychiatric_emergency"
  | "behavioral_health"
  | "obgyn"
  | "pediatrics"
  | "emergency_reversal_agents"
  | "vaccines"
  | "sedation"
  | "anesthesia"
  | "critical_care"
  | "pressors"
  | "paralytics";

export type HospitalActivationCoverageExpectation = {
  groupId: HospitalActivationCoverageGroupId;
  labelEn: string;
  expectedTokens: string[];
  explicitCatalogCodes?: string[];
};

export const HOSPITAL_ACTIVATION_COVERAGE_GROUPS: readonly HospitalActivationCoverageExpectation[] = [
  { groupId: "analgesics", labelEn: "Analgesics", expectedTokens: ["paracetamol", "acetaminophen", "morphine"] },
  { groupId: "nsaids", labelEn: "NSAIDs", expectedTokens: ["ibuprofen", "ketorolac", "naproxen"] },
  {
    groupId: "antibiotics",
    labelEn: "Antibiotics",
    expectedTokens: ["amoxicillin", "ceftriaxone", "azithromycin", "vancomycin", "ciprofloxacin"],
  },
  { groupId: "antivirals", labelEn: "Antivirals", expectedTokens: ["acyclovir", "oseltamivir"] },
  { groupId: "antifungals", labelEn: "Antifungals", expectedTokens: ["fluconazole", "nystatin"] },
  {
    groupId: "antihypertensives",
    labelEn: "Antihypertensives",
    expectedTokens: ["lisinopril", "amlodipine", "losartan", "labetalol", "hydralazine"],
  },
  {
    groupId: "heart_failure",
    labelEn: "Heart Failure",
    expectedTokens: ["furosemide", "carvedilol", "metoprolol", "lisinopril", "spironolactone"],
  },
  {
    groupId: "antiarrhythmics",
    labelEn: "Antiarrhythmics",
    expectedTokens: ["amiodarone", "adenosine", "procainamide", "lidocaine"],
  },
  {
    groupId: "anticoagulants",
    labelEn: "Anticoagulants",
    expectedTokens: ["enoxaparin", "heparin", "warfarin", "apixaban"],
  },
  { groupId: "thrombolytics", labelEn: "Thrombolytics", expectedTokens: ["alteplase", "tenecteplase"] },
  { groupId: "diabetes", labelEn: "Diabetes", expectedTokens: ["metformin", "glipizide", "insulin glargine"] },
  { groupId: "insulin", labelEn: "Insulin", expectedTokens: ["insulin"] },
  {
    groupId: "electrolytes",
    labelEn: "Electrolytes",
    expectedTokens: ["potassium chloride", "magnesium sulfate", "calcium gluconate", "sodium bicarbonate"],
  },
  {
    groupId: "iv_fluids",
    labelEn: "IV Fluids",
    expectedTokens: ["sodium chloride", "lactated ringer", "dextrose", "oral rehydration"],
  },
  { groupId: "respiratory", labelEn: "Respiratory", expectedTokens: ["albuterol", "ipratropium", "methylprednisolone"] },
  { groupId: "asthma", labelEn: "Asthma", expectedTokens: ["albuterol", "salbutamol", "prednisone"] },
  { groupId: "copd", labelEn: "COPD", expectedTokens: ["albuterol", "ipratropium", "methylprednisolone"] },
  {
    groupId: "seizure",
    labelEn: "Seizure",
    expectedTokens: ["lorazepam", "levetiracetam", "phenytoin", "valproate"],
  },
  {
    groupId: "psychiatric_emergency",
    labelEn: "Psychiatric Emergency",
    expectedTokens: ["haloperidol", "olanzapine", "lorazepam"],
  },
  {
    groupId: "behavioral_health",
    labelEn: "Behavioral Health",
    expectedTokens: ["sertraline", "fluoxetine", "quetiapine", "risperidone"],
  },
  { groupId: "obgyn", labelEn: "OB/GYN", expectedTokens: ["oxytocin", "misoprostol", "magnesium sulfate"] },
  {
    groupId: "pediatrics",
    labelEn: "Pediatrics",
    expectedTokens: ["acetaminophen", "albuterol", "ceftriaxone", "epinephrine"],
  },
  {
    groupId: "emergency_reversal_agents",
    labelEn: "Emergency Reversal Agents",
    expectedTokens: ["naloxone", "flumazenil", "glucagon", "protamine"],
  },
  {
    groupId: "vaccines",
    labelEn: "Vaccines",
    expectedTokens: ["tdap", "influenza vaccine", "pneumococcal", "hepatitis b vaccine"],
    explicitCatalogCodes: ["TDAP_VACCINE_0.5_ML_INJECTABLE_INJECTABLEINTRAMUSCULAR"],
  },
  { groupId: "sedation", labelEn: "Sedation", expectedTokens: ["lorazepam", "midazolam", "ketamine"] },
  { groupId: "anesthesia", labelEn: "Anesthesia", expectedTokens: ["propofol", "etomidate", "ketamine", "succinylcholine"] },
  {
    groupId: "critical_care",
    labelEn: "Critical Care",
    expectedTokens: ["norepinephrine", "vasopressin", "phenylephrine", "dobutamine"],
  },
  { groupId: "pressors", labelEn: "Pressors", expectedTokens: ["norepinephrine", "epinephrine", "phenylephrine", "dopamine"] },
  { groupId: "paralytics", labelEn: "Paralytics", expectedTokens: ["rocuronium", "vecuronium", "succinylcholine"] },
] as const;

export type HospitalCoverageGapStatus = "READY" | "PARTIAL" | "REVIEW_REQUIRED" | "MISSING";

export type HospitalCoverageGapRow = {
  groupId: HospitalActivationCoverageGroupId;
  group: string;
  expectedExamples: string[];
  presentInCatalog: number;
  orderableCount: number;
  missing: string[];
  restrictedCount: number;
  status: HospitalCoverageGapStatus;
};
