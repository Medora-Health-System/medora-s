/**
 * MEDUI.MEDICATION.HOSPITAL_COVERAGE_CERTIFICATION.1
 * Hospital formulary coverage expectations for certification (gap identification only).
 */

export type HospitalFormularyCoverageGroupId =
  | "analgesics"
  | "nsaids"
  | "antibiotics"
  | "antivirals"
  | "antifungals"
  | "anticoagulants"
  | "thrombolytics"
  | "pressors"
  | "paralytics"
  | "sedatives"
  | "anesthesia"
  | "critical_care"
  | "behavioral_health"
  | "cardiology"
  | "endocrinology"
  | "pulmonology"
  | "nephrology"
  | "neurology"
  | "obgyn"
  | "pediatrics"
  | "emergency_medicine"
  | "vaccines"
  | "insulins"
  | "iv_fluids"
  | "electrolytes";

export type HospitalFormularyCoverageExpectation = {
  groupId: HospitalFormularyCoverageGroupId;
  labelEn: string;
  expectedTokens: string[];
  explicitCatalogCodes?: string[];
};

export const HOSPITAL_FORMULARY_COVERAGE_GROUPS: readonly HospitalFormularyCoverageExpectation[] = [
  { groupId: "analgesics", labelEn: "Analgesics", expectedTokens: ["paracetamol", "acetaminophen", "morphine", "fentanyl"] },
  { groupId: "nsaids", labelEn: "NSAIDs", expectedTokens: ["ibuprofen", "ketorolac", "naproxen"] },
  { groupId: "antibiotics", labelEn: "Antibiotics", expectedTokens: ["amoxicillin", "ceftriaxone", "azithromycin", "vancomycin", "piperacillin"] },
  { groupId: "antivirals", labelEn: "Antivirals", expectedTokens: ["acyclovir", "oseltamivir"] },
  { groupId: "antifungals", labelEn: "Antifungals", expectedTokens: ["fluconazole", "nystatin", "amphotericin"] },
  { groupId: "anticoagulants", labelEn: "Anticoagulants", expectedTokens: ["enoxaparin", "heparin", "warfarin", "apixaban"] },
  { groupId: "thrombolytics", labelEn: "Thrombolytics", expectedTokens: ["alteplase", "tenecteplase"] },
  { groupId: "pressors", labelEn: "Pressors", expectedTokens: ["norepinephrine", "epinephrine", "phenylephrine", "vasopressin", "dopamine"] },
  { groupId: "paralytics", labelEn: "Paralytics", expectedTokens: ["rocuronium", "vecuronium", "succinylcholine"] },
  { groupId: "sedatives", labelEn: "Sedatives", expectedTokens: ["lorazepam", "midazolam", "ketamine"] },
  { groupId: "anesthesia", labelEn: "Anesthesia", expectedTokens: ["propofol", "etomidate", "ketamine", "succinylcholine"] },
  { groupId: "critical_care", labelEn: "Critical Care", expectedTokens: ["norepinephrine", "vasopressin", "propofol", "fentanyl"] },
  { groupId: "behavioral_health", labelEn: "Behavioral Health", expectedTokens: ["haloperidol", "olanzapine", "lorazepam", "sertraline"] },
  { groupId: "cardiology", labelEn: "Cardiology", expectedTokens: ["amiodarone", "adenosine", "nitroglycerin", "metoprolol", "aspirin"] },
  { groupId: "endocrinology", labelEn: "Endocrinology", expectedTokens: ["metformin", "insulin", "levothyroxine", "hydrocortisone"] },
  { groupId: "pulmonology", labelEn: "Pulmonology", expectedTokens: ["albuterol", "ipratropium", "methylprednisolone", "prednisone"] },
  { groupId: "nephrology", labelEn: "Nephrology", expectedTokens: ["furosemide", "potassium chloride", "sodium bicarbonate"] },
  { groupId: "neurology", labelEn: "Neurology", expectedTokens: ["levetiracetam", "phenytoin", "lorazepam", "valproate"] },
  { groupId: "obgyn", labelEn: "OB/GYN", expectedTokens: ["oxytocin", "misoprostol", "magnesium sulfate"] },
  { groupId: "pediatrics", labelEn: "Pediatrics", expectedTokens: ["acetaminophen", "albuterol", "ceftriaxone", "epinephrine"] },
  { groupId: "emergency_medicine", labelEn: "Emergency Medicine", expectedTokens: ["epinephrine", "naloxone", "morphine", "ketorolac", "ondansetron"] },
  {
    groupId: "vaccines",
    labelEn: "Vaccines",
    expectedTokens: ["tdap", "influenza vaccine", "pneumococcal", "hepatitis b vaccine"],
    explicitCatalogCodes: ["TDAP_VACCINE_0.5_ML_INJECTABLE_INJECTABLEINTRAMUSCULAR"],
  },
  { groupId: "insulins", labelEn: "Insulins", expectedTokens: ["insulin"] },
  { groupId: "iv_fluids", labelEn: "IV Fluids", expectedTokens: ["sodium chloride", "lactated ringer", "dextrose"] },
  { groupId: "electrolytes", labelEn: "Electrolytes", expectedTokens: ["potassium chloride", "magnesium sulfate", "calcium gluconate"] },
] as const;

export type EmergencyMedicationScenarioId =
  | "acs"
  | "stemi"
  | "nstemi"
  | "stroke"
  | "sepsis"
  | "dka"
  | "anaphylaxis"
  | "asthma"
  | "copd"
  | "behavioral_health"
  | "status_epilepticus"
  | "trauma"
  | "pain_management";

export type EmergencyMedicationScenario = {
  scenarioId: EmergencyMedicationScenarioId;
  labelEn: string;
  expectedTokens: string[];
};

export const EMERGENCY_MEDICATION_SCENARIOS: readonly EmergencyMedicationScenario[] = [
  { scenarioId: "acs", labelEn: "ACS", expectedTokens: ["aspirin", "nitroglycerin", "heparin", "morphine"] },
  { scenarioId: "stemi", labelEn: "STEMI", expectedTokens: ["aspirin", "heparin", "nitroglycerin", "morphine", "fentanyl"] },
  { scenarioId: "nstemi", labelEn: "NSTEMI", expectedTokens: ["aspirin", "heparin", "nitroglycerin", "morphine"] },
  { scenarioId: "stroke", labelEn: "Stroke", expectedTokens: ["alteplase", "aspirin", "labetalol"] },
  { scenarioId: "sepsis", labelEn: "Sepsis", expectedTokens: ["ceftriaxone", "vancomycin", "norepinephrine", "lactated ringer"] },
  { scenarioId: "dka", labelEn: "DKA", expectedTokens: ["insulin", "potassium chloride", "sodium chloride"] },
  { scenarioId: "anaphylaxis", labelEn: "Anaphylaxis", expectedTokens: ["epinephrine", "diphenhydramine", "methylprednisolone"] },
  { scenarioId: "asthma", labelEn: "Asthma", expectedTokens: ["albuterol", "prednisone", "methylprednisolone"] },
  { scenarioId: "copd", labelEn: "COPD", expectedTokens: ["albuterol", "ipratropium", "prednisone", "methylprednisolone"] },
  { scenarioId: "behavioral_health", labelEn: "Behavioral health", expectedTokens: ["haloperidol", "lorazepam", "olanzapine"] },
  { scenarioId: "status_epilepticus", labelEn: "Status epilepticus", expectedTokens: ["lorazepam", "levetiracetam", "phenytoin"] },
  { scenarioId: "trauma", labelEn: "Trauma", expectedTokens: ["tranexamic acid", "morphine", "fentanyl", "tdap"] },
  { scenarioId: "pain_management", labelEn: "Pain management", expectedTokens: ["morphine", "fentanyl", "ketorolac", "acetaminophen"] },
] as const;

export type CriticalCareCoverageCategoryId =
  | "pressors"
  | "sedatives"
  | "paralytics"
  | "rsi_medications"
  | "critical_care_infusions";

export type CriticalCareCoverageCategory = {
  categoryId: CriticalCareCoverageCategoryId;
  labelEn: string;
  expectedTokens: string[];
};

export const CRITICAL_CARE_COVERAGE_CATEGORIES: readonly CriticalCareCoverageCategory[] = [
  { categoryId: "pressors", labelEn: "Pressors", expectedTokens: ["norepinephrine", "epinephrine", "phenylephrine", "vasopressin"] },
  { categoryId: "sedatives", labelEn: "Sedatives", expectedTokens: ["propofol", "midazolam", "ketamine", "lorazepam"] },
  { categoryId: "paralytics", labelEn: "Paralytics", expectedTokens: ["rocuronium", "succinylcholine", "vecuronium"] },
  { categoryId: "rsi_medications", labelEn: "RSI medications", expectedTokens: ["etomidate", "ketamine", "succinylcholine", "rocuronium"] },
  { categoryId: "critical_care_infusions", labelEn: "Critical-care infusions", expectedTokens: ["norepinephrine", "propofol", "fentanyl", "insulin"] },
] as const;

export type EnterpriseVaccineId =
  | "tdap"
  | "td"
  | "dtap"
  | "mmr"
  | "varicella"
  | "influenza"
  | "covid"
  | "hepatitis_a"
  | "hepatitis_b"
  | "pneumococcal"
  | "hpv"
  | "meningococcal";

export type EnterpriseVaccineExpectation = {
  vaccineId: EnterpriseVaccineId;
  labelEn: string;
  searchTokens: string[];
  explicitCatalogCode?: string;
};

export const ENTERPRISE_VACCINE_EXPECTATIONS: readonly EnterpriseVaccineExpectation[] = [
  { vaccineId: "tdap", labelEn: "Tdap", searchTokens: ["tdap"], explicitCatalogCode: "TDAP_VACCINE_0.5_ML_INJECTABLE_INJECTABLEINTRAMUSCULAR" },
  { vaccineId: "td", labelEn: "Td", searchTokens: ["td vaccine", "tetanus diphtheria"] },
  { vaccineId: "dtap", labelEn: "DTaP", searchTokens: ["dtap", "diphtheria tetanus pertussis"] },
  { vaccineId: "mmr", labelEn: "MMR", searchTokens: ["mmr vaccine", "measles"] },
  { vaccineId: "varicella", labelEn: "Varicella", searchTokens: ["varicella", "chickenpox"] },
  { vaccineId: "influenza", labelEn: "Influenza", searchTokens: ["influenza vaccine", "flu shot"] },
  { vaccineId: "covid", labelEn: "COVID", searchTokens: ["covid-19 vaccine", "covid vaccine"] },
  { vaccineId: "hepatitis_a", labelEn: "Hepatitis A", searchTokens: ["hepatitis a vaccine", "hep a"] },
  { vaccineId: "hepatitis_b", labelEn: "Hepatitis B", searchTokens: ["hepatitis b vaccine", "hep b"] },
  { vaccineId: "pneumococcal", labelEn: "Pneumococcal", searchTokens: ["pneumococcal", "prevnar"] },
  { vaccineId: "hpv", labelEn: "HPV", searchTokens: ["hpv vaccine", "gardasil"] },
  { vaccineId: "meningococcal", labelEn: "Meningococcal", searchTokens: ["meningococcal", "menveo"] },
] as const;
