/**
 * MEDUI.ED.DISCHARGE.TEMPLATE_FAMILY_COVERAGE.4
 * Static seed encounter diagnoses — mirrors apps/api/prisma/seed.ts diagnosisDefs.
 */

export type EncounterDiagnosisSource =
  | "seed_encounter"
  | "qa_regression"
  | "common_diagnosis"
  | "template_canonical"
  | "dev_icd_sample"
  | "injected";

export type EncounterDiagnosisRecord = {
  code: string;
  label: string;
  source: EncounterDiagnosisSource;
  count: number;
};

export const SEED_ENCOUNTER_DIAGNOSIS_FIXTURE: ReadonlyArray<{
  code: string;
  label: string;
  source: "seed_encounter";
}> = [
  { code: "I10", label: "Essential hypertension", source: "seed_encounter" },
  { code: "J06.9", label: "Acute upper respiratory infection", source: "seed_encounter" },
  { code: "R10.9", label: "Unspecified abdominal pain", source: "seed_encounter" },
  { code: "E11.9", label: "Type 2 diabetes mellitus", source: "seed_encounter" },
  { code: "L20.9", label: "Atopic dermatitis", source: "seed_encounter" },
  { code: "A09", label: "Infectious gastroenteritis", source: "seed_encounter" },
  { code: "D64.9", label: "Anemia, unspecified", source: "seed_encounter" },
  { code: "M17.9", label: "Osteoarthritis of knee", source: "seed_encounter" },
  { code: "A01.04", label: "Typhoid fever", source: "seed_encounter" },
];

export const QA_DISCHARGE_DIAGNOSIS_FIXTURE: ReadonlyArray<{
  code: string;
  label: string;
  source: "qa_regression";
}> = [
  { code: "R11.2", label: "Nausea with vomiting", source: "qa_regression" },
  { code: "R07.9", label: "Chest pain", source: "qa_regression" },
  { code: "R55", label: "Syncope", source: "qa_regression" },
  { code: "G45.9", label: "TIA", source: "qa_regression" },
  { code: "R56.9", label: "Seizure", source: "qa_regression" },
  { code: "I26.99", label: "Pulmonary embolism", source: "qa_regression" },
  { code: "I82.409", label: "DVT", source: "qa_regression" },
  { code: "N93.9", label: "Abnormal uterine bleeding", source: "qa_regression" },
  { code: "F41.9", label: "Anxiety disorder", source: "qa_regression" },
  { code: "E11.65", label: "Hyperglycemia", source: "qa_regression" },
  { code: "E16.2", label: "Hypoglycemia", source: "qa_regression" },
  { code: "N17.9", label: "AKI", source: "qa_regression" },
  { code: "I50.9", label: "Heart failure", source: "qa_regression" },
  { code: "J44.1", label: "COPD exacerbation", source: "qa_regression" },
  { code: "R50.9", label: "Fever", source: "qa_regression" },
  { code: "L08.9", label: "Skin infection", source: "qa_regression" },
  { code: "Z99.99", label: "Unmapped code", source: "qa_regression" },
];
