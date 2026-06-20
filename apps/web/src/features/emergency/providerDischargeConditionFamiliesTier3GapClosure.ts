/**
 * MEDUI.ED.DISCHARGE.TEMPLATE_FAMILY_COVERAGE.3
 * Gap-closure families for remaining specialty follow-up templates (conservative).
 */

import type { ClinicalConditionFamilyDefinition } from "./providerDischargeConditionFamilyTypes";

export const TIER3_GAP_CLOSURE_CLINICAL_CONDITION_FAMILIES: readonly ClinicalConditionFamilyDefinition[] =
  [
    {
      id: "urology_foley_catheter",
      label: "Urology Foley Catheter Precautions",
      templateId: "urology_foley_catheter_precautions_v1",
      clinicalDomain: "Genitourinary",
      keywords: ["foley catheter precautions", "urinary catheter precautions"],
      guardrails: {
        safety: {
          requiresSpecialistFollowUp: true,
          requiresEdReturnPrecautions: true,
        },
      },
      specialtyCategory: "urology",
      riskCategory: "moderate",
      clinicalRationale:
        "Keyword-only catheter precautions; requires urology follow-up context — no ICD auto-routing.",
      reviewStatus: "draft",
      routingStatus: "NEEDS_REVIEW",
      sourceReferenceLabels: ["MedlinePlus — Urinary catheters"],
    },
    {
      id: "dialysis_return_precautions",
      label: "Dialysis Return Precautions",
      templateId: "dialysis_return_precautions_v1",
      clinicalDomain: "Genitourinary",
      keywords: ["dialysis return precautions", "dialysis follow-up precautions"],
      guardrails: {
        safety: {
          highRiskEscalation: true,
          requiresSpecialistFollowUp: true,
          requiresEdReturnPrecautions: true,
        },
      },
      specialtyCategory: "nephrology",
      riskCategory: "high",
      clinicalRationale:
        "Dialysis-specific return precautions — deferred to nephrology specialty routing only.",
      reviewStatus: "draft",
      routingStatus: "DEFERRED_SPECIALTY_ONLY",
      sourceReferenceLabels: ["MedlinePlus — Dialysis"],
    },
    {
      id: "diabetes_hyperglycemia_followup",
      label: "Diabetes Hyperglycemia Follow-Up",
      templateId: "diabetes_hyperglycemia_followup_v1",
      clinicalDomain: "Endocrine",
      icdExact: ["E11.65"],
      keywords: ["diabetes hyperglycemia follow-up", "high blood sugar follow-up"],
      guardrails: {
        safety: {
          requiresEdReturnPrecautions: true,
          requiresSpecialistFollowUp: true,
        },
      },
      specialtyCategory: "endocrinology",
      riskCategory: "moderate_to_high",
      clinicalRationale:
        "Post-ED hyperglycemia follow-up; ICD E11.65 preferred over keyword-only routing.",
      reviewStatus: "reviewed",
      routingStatus: "NEEDS_REVIEW",
      sourceReferenceLabels: ["MedlinePlus — Hyperglycemia"],
    },
    {
      id: "diabetes_hypoglycemia_followup",
      label: "Diabetes Hypoglycemia Follow-Up",
      templateId: "diabetes_hypoglycemia_followup_v1",
      clinicalDomain: "Endocrine",
      icdExact: ["E16.2"],
      keywords: ["diabetes hypoglycemia follow-up", "low blood sugar follow-up"],
      guardrails: {
        safety: {
          requiresEdReturnPrecautions: true,
          requiresSpecialistFollowUp: true,
        },
      },
      specialtyCategory: "endocrinology",
      riskCategory: "moderate_to_high",
      clinicalRationale: "Post-ED hypoglycemia follow-up; ICD E16.2 preferred.",
      reviewStatus: "reviewed",
      routingStatus: "NEEDS_REVIEW",
      sourceReferenceLabels: ["MedlinePlus — Low blood sugar"],
    },
    {
      id: "diabetes_dka_return_precautions",
      label: "Diabetes DKA Return Precautions",
      templateId: "diabetes_dka_return_precautions_v1",
      clinicalDomain: "Endocrine",
      icdPrefixes: ["E10.10", "E11.10"],
      keywords: ["dka return precautions", "diabetic ketoacidosis precautions"],
      guardrails: {
        safety: {
          highRiskEscalation: true,
          requiresEdReturnPrecautions: true,
          requiresSpecialistFollowUp: true,
        },
      },
      specialtyCategory: "endocrinology",
      riskCategory: "high",
      clinicalRationale:
        "DKA is high-risk — keyword routing only; not safe for blind ICD prefix routing in ED discharge.",
      reviewStatus: "draft",
      routingStatus: "UNSAFE_DO_NOT_MAP",
      sourceReferenceLabels: ["MedlinePlus — Diabetic ketoacidosis"],
    },
    {
      id: "diabetes_insulin_management",
      label: "Diabetes Insulin Management Precautions",
      templateId: "diabetes_insulin_management_precautions_v1",
      clinicalDomain: "Endocrine",
      icdPrefixes: ["E10", "E11"],
      excludeIcdExact: ["E11.9", "E11.65"],
      keywords: ["insulin management precautions", "insulin follow-up precautions"],
      guardrails: {
        safety: {
          requiresSpecialistFollowUp: true,
          requiresEdReturnPrecautions: true,
        },
      },
      specialtyCategory: "endocrinology",
      riskCategory: "moderate_to_high",
      clinicalRationale:
        "Insulin management requires endocrine context — keyword preferred; excludes stable E11.9.",
      reviewStatus: "draft",
      routingStatus: "NEEDS_REVIEW",
      sourceReferenceLabels: ["MedlinePlus — Diabetes"],
    },
    {
      id: "endocrine_thyroid_followup",
      label: "Endocrine Thyroid Symptom Follow-Up",
      templateId: "endocrine_thyroid_symptom_followup_v1",
      clinicalDomain: "Endocrine",
      icdPrefixes: ["E03", "E05", "E06"],
      keywords: ["thyroid symptoms follow-up", "endocrine thyroid follow-up"],
      guardrails: {
        safety: { requiresSpecialistFollowUp: true },
      },
      specialtyCategory: "endocrinology",
      riskCategory: "moderate",
      clinicalRationale: "Thyroid/endocrine specialty follow-up — deferred for outpatient routing review.",
      reviewStatus: "draft",
      routingStatus: "DEFERRED_SPECIALTY_ONLY",
      sourceReferenceLabels: ["MedlinePlus — Thyroid diseases"],
    },
    {
      id: "metabolic_dehydration_followup",
      label: "Metabolic Dehydration Follow-Up",
      templateId: "metabolic_dehydration_followup_v1",
      clinicalDomain: "General Medical",
      icdExact: ["E86.0"],
      keywords: ["metabolic dehydration follow-up", "dehydration renal precautions"],
      guardrails: {
        safety: { requiresEdReturnPrecautions: true },
      },
      specialtyCategory: "primary_care",
      riskCategory: "moderate",
      clinicalRationale: "Metabolic dehydration follow-up aligns with E86.0 when present.",
      reviewStatus: "reviewed",
      routingStatus: "READY",
      sourceReferenceLabels: ["MedlinePlus — Dehydration"],
    },
    {
      id: "metabolic_nausea_weakness_followup",
      label: "Metabolic Nausea/Weakness Follow-Up",
      templateId: "metabolic_nausea_weakness_followup_v1",
      clinicalDomain: "General Medical",
      icdExact: ["R53.1"],
      keywords: ["metabolic nausea weakness follow-up", "weakness follow-up precautions"],
      guardrails: {
        safety: {
          highRiskEscalation: true,
          requiresEdReturnPrecautions: true,
        },
      },
      specialtyCategory: "primary_care",
      riskCategory: "moderate_to_high",
      clinicalRationale: "Weakness follow-up; R53.1 ICD when coded, keyword for explicit follow-up label.",
      reviewStatus: "reviewed",
      routingStatus: "NEEDS_REVIEW",
      sourceReferenceLabels: ["MedlinePlus — Fatigue"],
    },
    {
      id: "metabolic_electrolyte_followup",
      label: "Metabolic Electrolyte Follow-Up",
      templateId: "metabolic_electrolyte_followup_v1",
      clinicalDomain: "Endocrine",
      keywords: [
        "metabolic electrolyte follow-up",
        "electrolyte follow-up precautions",
        "potassium follow-up",
        "sodium follow-up",
      ],
      guardrails: {
        safety: {
          requiresSpecialistFollowUp: true,
          requiresEdReturnPrecautions: true,
        },
      },
      specialtyCategory: "nephrology",
      riskCategory: "moderate_to_high",
      clinicalRationale: "Electrolyte abnormality follow-up — keyword-only until lab-context guardrails exist.",
      reviewStatus: "draft",
      routingStatus: "NEEDS_REVIEW",
      sourceReferenceLabels: ["MedlinePlus — Fluid and electrolyte balance"],
    },
    {
      id: "endocrine_polyuria_polydipsia",
      label: "Endocrine Polyuria/Polydipsia Follow-Up",
      templateId: "endocrine_polyuria_polydipsia_followup_v1",
      clinicalDomain: "Endocrine",
      icdPrefixes: ["R35", "R63.1"],
      keywords: ["polyuria polydipsia follow-up", "endocrine polyuria follow-up"],
      guardrails: {
        safety: {
          requiresSpecialistFollowUp: true,
          requiresEdReturnPrecautions: true,
        },
      },
      specialtyCategory: "endocrinology",
      riskCategory: "moderate",
      clinicalRationale: "Polyuria/polydipsia symptom follow-up — endocrine review required.",
      reviewStatus: "draft",
      routingStatus: "NEEDS_REVIEW",
      sourceReferenceLabels: ["MedlinePlus — Diabetes"],
    },
  ] as const;

export const TIER3_EXPLICIT_REGISTRY_TEMPLATE_FAMILY_MAP: Readonly<Record<string, string>> = {
  urology_foley_catheter_precautions_v1: "urology_foley_catheter",
  dialysis_return_precautions_v1: "dialysis_return_precautions",
  diabetes_hyperglycemia_followup_v1: "diabetes_hyperglycemia_followup",
  diabetes_hypoglycemia_followup_v1: "diabetes_hypoglycemia_followup",
  diabetes_dka_return_precautions_v1: "diabetes_dka_return_precautions",
  diabetes_insulin_management_precautions_v1: "diabetes_insulin_management",
  endocrine_thyroid_symptom_followup_v1: "endocrine_thyroid_followup",
  metabolic_dehydration_followup_v1: "metabolic_dehydration_followup",
  metabolic_nausea_weakness_followup_v1: "metabolic_nausea_weakness_followup",
  metabolic_electrolyte_followup_v1: "metabolic_electrolyte_followup",
  endocrine_polyuria_polydipsia_followup_v1: "endocrine_polyuria_polydipsia",
};
