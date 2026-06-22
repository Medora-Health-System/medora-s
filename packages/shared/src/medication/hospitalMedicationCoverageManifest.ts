/**
 * MEDUI.MEDICATION_CATALOG.HOSPITAL_ORDERABILITY_AND_TDAP.1
 * Hospital core medication coverage groups — flag gaps for clinical/pharmacy review.
 */

export type HospitalMedicationCoverageGroupId =
  | "analgesics"
  | "nsaids"
  | "opioids"
  | "antipyretics"
  | "antibiotics"
  | "antivirals"
  | "antifungals"
  | "antihypertensives"
  | "anticoagulants"
  | "antiplatelets"
  | "antiemetics"
  | "antihistamines"
  | "bronchodilators"
  | "steroids"
  | "insulin"
  | "diabetes_meds"
  | "cardiac_emergency"
  | "acls_meds"
  | "sedatives"
  | "seizure_meds"
  | "psychiatric_emergency"
  | "iv_fluids"
  | "electrolytes"
  | "vaccines"
  | "wound_tetanus_prophylaxis"
  | "obgyn_emergency"
  | "pediatric_emergency"
  | "contrast_allergy_premedication"
  | "reversal_agents";

export type HospitalMedicationCoverageExpectation = {
  groupId: HospitalMedicationCoverageGroupId;
  labelEn: string;
  labelFr: string;
  /** Generic-name or alias tokens (lowercase) expected in catalog universe. */
  expectedTokens: string[];
  /** Explicit catalog codes when known (optional). */
  explicitCatalogCodes?: string[];
};

export const HOSPITAL_MEDICATION_COVERAGE_GROUPS: readonly HospitalMedicationCoverageExpectation[] = [
  {
    groupId: "analgesics",
    labelEn: "Analgesics",
    labelFr: "Analgésiques",
    expectedTokens: ["paracetamol", "acetaminophen", "morphine"],
    explicitCatalogCodes: ["ACETAMINOPHEN_500"],
  },
  {
    groupId: "nsaids",
    labelEn: "NSAIDs",
    labelFr: "AINS",
    expectedTokens: ["ibuprofen", "ketorolac", "naproxen"],
    explicitCatalogCodes: ["IBUPROFEN_200"],
  },
  {
    groupId: "opioids",
    labelEn: "Opioids",
    labelFr: "Opioïdes",
    expectedTokens: ["morphine", "fentanyl", "hydromorphone", "oxycodone"],
  },
  {
    groupId: "antipyretics",
    labelEn: "Antipyretics",
    labelFr: "Antipyrétiques",
    expectedTokens: ["paracetamol", "acetaminophen", "ibuprofen"],
    explicitCatalogCodes: ["ACETAMINOPHEN_500", "IBUPROFEN_200"],
  },
  {
    groupId: "antibiotics",
    labelEn: "Antibiotics",
    labelFr: "Antibiotiques",
    expectedTokens: ["amoxicillin", "ceftriaxone", "azithromycin", "ciprofloxacin", "vancomycin"],
    explicitCatalogCodes: ["AMOXICILLIN_500", "CEFTRIAXONE_1G_IV", "AZITHROMYCIN_250", "CIPROFLOXACIN_500"],
  },
  {
    groupId: "antivirals",
    labelEn: "Antivirals",
    labelFr: "Antiviraux",
    expectedTokens: ["acyclovir", "oseltamivir"],
    explicitCatalogCodes: ["ACYCLOVIR_400_MG_COMPRIME_ORAL"],
  },
  {
    groupId: "antifungals",
    labelEn: "Antifungals",
    labelFr: "Antifongiques",
    expectedTokens: ["fluconazole", "nystatin"],
  },
  {
    groupId: "antihypertensives",
    labelEn: "Antihypertensives",
    labelFr: "Antihypertenseurs",
    expectedTokens: ["lisinopril", "amlodipine", "losartan", "labetalol", "hydralazine"],
    explicitCatalogCodes: ["LISINOPRIL_10", "LOSARTAN_50", "HYDROCHLOROTHIAZIDE_25"],
  },
  {
    groupId: "anticoagulants",
    labelEn: "Anticoagulants",
    labelFr: "Anticoagulants",
    expectedTokens: ["enoxaparin", "heparin", "warfarin", "apixaban"],
  },
  {
    groupId: "antiplatelets",
    labelEn: "Antiplatelets",
    labelFr: "Antiplaquettaires",
    expectedTokens: ["aspirin", "clopidogrel"],
    explicitCatalogCodes: ["ASPIRIN_81"],
  },
  {
    groupId: "antiemetics",
    labelEn: "Antiemetics",
    labelFr: "Antiemétiques",
    expectedTokens: ["ondansetron", "metoclopramide", "promethazine"],
  },
  {
    groupId: "antihistamines",
    labelEn: "Antihistamines",
    labelFr: "Antihistaminiques",
    expectedTokens: ["diphenhydramine", "loratadine", "cetirizine", "promethazine"],
  },
  {
    groupId: "bronchodilators",
    labelEn: "Bronchodilators",
    labelFr: "Bronchodilatateurs",
    expectedTokens: ["albuterol", "salbutamol", "ipratropium"],
  },
  {
    groupId: "steroids",
    labelEn: "Steroids",
    labelFr: "Corticoïdes",
    expectedTokens: ["prednisone", "methylprednisolone", "dexamethasone", "hydrocortisone"],
    explicitCatalogCodes: ["PREDNISONE_5"],
  },
  {
    groupId: "insulin",
    labelEn: "Insulin",
    labelFr: "Insuline",
    expectedTokens: ["insulin"],
  },
  {
    groupId: "diabetes_meds",
    labelEn: "Diabetes medications",
    labelFr: "Médicaments du diabète",
    expectedTokens: ["metformin", "glipizide", "dextrose"],
    explicitCatalogCodes: ["METFORMIN_500"],
  },
  {
    groupId: "cardiac_emergency",
    labelEn: "Cardiac emergency medications",
    labelFr: "Médicaments d'urgence cardiaque",
    expectedTokens: ["nitroglycerin", "adenosine", "amiodarone", "atropine"],
  },
  {
    groupId: "acls_meds",
    labelEn: "ACLS medications",
    labelFr: "Médicaments RCP",
    expectedTokens: ["epinephrine", "amiodarone", "atropine", "adenosine", "calcium chloride"],
  },
  {
    groupId: "sedatives",
    labelEn: "Sedatives",
    labelFr: "Sédatifs",
    expectedTokens: ["lorazepam", "midazolam", "ketamine"],
  },
  {
    groupId: "seizure_meds",
    labelEn: "Seizure medications",
    labelFr: "Anticonvulsivants",
    expectedTokens: ["lorazepam", "levetiracetam", "phenytoin", "valproate"],
  },
  {
    groupId: "psychiatric_emergency",
    labelEn: "Psychiatric emergency medications",
    labelFr: "Urgences psychiatriques",
    expectedTokens: ["haloperidol", "olanzapine", "lorazepam"],
  },
  {
    groupId: "iv_fluids",
    labelEn: "IV fluids",
    labelFr: "Solutés IV",
    expectedTokens: ["sodium chloride", "lactated ringer", "dextrose", "oral rehydration"],
    explicitCatalogCodes: ["ORAL_REHYDRATION"],
  },
  {
    groupId: "electrolytes",
    labelEn: "Electrolytes",
    labelFr: "Électrolytes",
    expectedTokens: ["potassium chloride", "magnesium sulfate", "calcium gluconate"],
  },
  {
    groupId: "vaccines",
    labelEn: "Vaccines",
    labelFr: "Vaccins",
    expectedTokens: ["tdap", "influenza vaccine", "pneumococcal", "hepatitis b vaccine"],
    explicitCatalogCodes: ["TDAP_VACCINE_0.5_ML_INJECTABLE_INJECTABLEINTRAMUSCULAR"],
  },
  {
    groupId: "wound_tetanus_prophylaxis",
    labelEn: "Wound / tetanus prophylaxis",
    labelFr: "Prophylaxie plaie / tétanos",
    expectedTokens: ["tdap", "tetanus", "td vaccine"],
    explicitCatalogCodes: ["TDAP_VACCINE_0.5_ML_INJECTABLE_INJECTABLEINTRAMUSCULAR"],
  },
  {
    groupId: "obgyn_emergency",
    labelEn: "OB/GYN emergency medications",
    labelFr: "Urgences OB/GYN",
    expectedTokens: ["oxytocin", "misoprostol", "magnesium sulfate"],
  },
  {
    groupId: "pediatric_emergency",
    labelEn: "Pediatric emergency medications",
    labelFr: "Urgences pédiatriques",
    expectedTokens: ["albuterol", "epinephrine", "ceftriaxone", "acetaminophen"],
  },
  {
    groupId: "contrast_allergy_premedication",
    labelEn: "Contrast / allergy premedication",
    labelFr: "Prémédication contraste / allergie",
    expectedTokens: ["diphenhydramine", "methylprednisolone", "prednisone", "epinephrine"],
  },
  {
    groupId: "reversal_agents",
    labelEn: "Reversal agents",
    labelFr: "Agents de réversion",
    expectedTokens: ["naloxone", "flumazenil", "protamine", "glucagon"],
  },
] as const;

export type HospitalMedicationCoverageRow = {
  groupId: HospitalMedicationCoverageGroupId;
  labelEn: string;
  expectedCount: number;
  presentCount: number;
  orderableCount: number;
  missingTokens: string[];
  restrictedCount: number;
  status: "COVERED" | "PARTIAL" | "NEEDS_CLINICAL_REVIEW";
};
