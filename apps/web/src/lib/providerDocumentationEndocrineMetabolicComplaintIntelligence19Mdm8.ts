/** Phase 19MDM.8 — Endocrine / metabolic complaint intelligence (click-to-insert only). */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  buildDehydrationMetabolicComplaintV1Intel,
  buildDiabetesSickDayComplaintV1Intel,
  buildElectrolyteAbnormalityComplaintV1Intel,
  buildGeneralizedWeaknessMetabolicComplaintV1Intel,
  buildHyperglycemiaComplaintV1Intel,
  buildHypoglycemiaComplaintV1Intel,
  buildInsulinMedicationIssueComplaintV1Intel,
  buildPolyuriaPolydipsiaComplaintV1Intel,
  buildThyroidSymptomsComplaintV1Intel,
  RENAL_METABOLIC_ENDOCRINE_TEMPLATE_IDS,
} from "./providerDocumentationRenalMetabolicEndocrineComplaintIntelGoldStandard";
import { buildNauseaVomitingMetabolicComplaintV1Intel } from "./providerDocumentationNauseaVomitingComplaintIntelGoldStandard";

const hyperglycemia = (key: string) => `providerDocumentationComplaintIntel.hyperglycemiaComplaintV1.${key}`;
const hypoglycemia = (key: string) => `providerDocumentationComplaintIntel.hypoglycemiaComplaintV1.${key}`;
const diabetesSickDay = (key: string) => `providerDocumentationComplaintIntel.diabetesSickDayComplaintV1.${key}`;
const insulinMedicationIssue = (key: string) => `providerDocumentationComplaintIntel.insulinMedicationIssueComplaintV1.${key}`;
const polyuriaPolydipsia = (key: string) => `providerDocumentationComplaintIntel.polyuriaPolydipsiaComplaintV1.${key}`;
const dehydrationMetabolic = (key: string) => `providerDocumentationComplaintIntel.dehydrationMetabolicComplaintV1.${key}`;
const electrolyteAbnormality = (key: string) => `providerDocumentationComplaintIntel.electrolyteAbnormalityComplaintV1.${key}`;
const thyroidSymptoms = (key: string) => `providerDocumentationComplaintIntel.thyroidSymptomsComplaintV1.${key}`;
const generalizedWeaknessMetabolic = (key: string) =>
  `providerDocumentationComplaintIntel.generalizedWeaknessMetabolicComplaintV1.${key}`;
const nauseaVomitingMetabolic = (key: string) => `providerDocumentationComplaintIntel.nauseaVomitingMetabolicComplaintV1.${key}`;

export const HYPERGLYCEMIA_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildHyperglycemiaComplaintV1Intel(hyperglycemia);
export const HYPOGLYCEMIA_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildHypoglycemiaComplaintV1Intel(hypoglycemia);
export const DIABETES_SICK_DAY_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildDiabetesSickDayComplaintV1Intel(diabetesSickDay);
export const INSULIN_MEDICATION_ISSUE_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildInsulinMedicationIssueComplaintV1Intel(insulinMedicationIssue);
export const POLYURIA_POLYDYPSIA_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildPolyuriaPolydipsiaComplaintV1Intel(polyuriaPolydipsia);
export const DEHYDRATION_METABOLIC_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildDehydrationMetabolicComplaintV1Intel(dehydrationMetabolic);
export const ELECTROLYTE_ABNORMALITY_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildElectrolyteAbnormalityComplaintV1Intel(electrolyteAbnormality);
export const THYROID_SYMPTOMS_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildThyroidSymptomsComplaintV1Intel(thyroidSymptoms);
export const GENERALIZED_WEAKNESS_METABOLIC_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildGeneralizedWeaknessMetabolicComplaintV1Intel(generalizedWeaknessMetabolic);
export const NAUSEA_VOMITING_METABOLIC_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildNauseaVomitingMetabolicComplaintV1Intel(nauseaVomitingMetabolic);

export const ENDOCRINE_METABOLIC_COMPLAINT_V1_TEMPLATE_IDS = RENAL_METABOLIC_ENDOCRINE_TEMPLATE_IDS.filter(
  (id) => id !== "renal_failure_symptoms_complaint_v1"
);

export const ENDOCRINE_METABOLIC_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID = {
  hyperglycemia_complaint_v1: HYPERGLYCEMIA_COMPLAINT_V1_INTEL,
  hypoglycemia_complaint_v1: HYPOGLYCEMIA_COMPLAINT_V1_INTEL,
  diabetes_sick_day_complaint_v1: DIABETES_SICK_DAY_COMPLAINT_V1_INTEL,
  insulin_medication_issue_complaint_v1: INSULIN_MEDICATION_ISSUE_COMPLAINT_V1_INTEL,
  polyuria_polydipsia_complaint_v1: POLYURIA_POLYDYPSIA_COMPLAINT_V1_INTEL,
  dehydration_metabolic_complaint_v1: DEHYDRATION_METABOLIC_COMPLAINT_V1_INTEL,
  electrolyte_abnormality_complaint_v1: ELECTROLYTE_ABNORMALITY_COMPLAINT_V1_INTEL,
  thyroid_symptoms_complaint_v1: THYROID_SYMPTOMS_COMPLAINT_V1_INTEL,
  generalized_weakness_metabolic_complaint_v1: GENERALIZED_WEAKNESS_METABOLIC_COMPLAINT_V1_INTEL,
  nausea_vomiting_metabolic_complaint_v1: NAUSEA_VOMITING_METABOLIC_COMPLAINT_V1_INTEL,
} as const;
