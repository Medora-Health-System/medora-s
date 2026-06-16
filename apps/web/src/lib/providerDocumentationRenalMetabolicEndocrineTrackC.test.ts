import { describe, expect, it } from "vitest";
import { flattenComplaintIntelligenceKeys } from "./providerDocumentationComplaintIntelligence";
import {
  assertTrackCCompliance,
  auditTrackCi18nMessageValues,
  collectTrackCViolations,
} from "./providerDocumentationComplaintIntelligenceTrackC";
import { complaintIntelligenceMdmChipBindingsForTemplate } from "./providerDocumentationComplaintIntelligenceWorkspaceChips";
import {
  auditHumanDocumentationForFamilyTemplate,
  assertHumanDocumentationAuditPasses,
} from "./providerDocumentationHumanDocumentationAudit";
import {
  RENAL_METABOLIC_ENDOCRINE_TEMPLATE_IDS,
  buildDehydrationMetabolicComplaintV1Intel,
  buildDiabetesSickDayComplaintV1Intel,
  buildElectrolyteAbnormalityComplaintV1Intel,
  buildGeneralizedWeaknessMetabolicComplaintV1Intel,
  buildHyperglycemiaComplaintV1Intel,
  buildHypoglycemiaComplaintV1Intel,
  buildInsulinMedicationIssueComplaintV1Intel,
  buildPolyuriaPolydipsiaComplaintV1Intel,
  buildRenalFailureSymptomsComplaintV1Intel,
  buildThyroidSymptomsComplaintV1Intel,
} from "./providerDocumentationRenalMetabolicEndocrineComplaintIntelGoldStandard";
import { buildNauseaVomitingMetabolicComplaintV1Intel } from "./providerDocumentationNauseaVomitingComplaintIntelGoldStandard";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "./providerDocumentationModel";
import { providerDocumentationRenalMetabolicEndocrineComplaintIntelEn } from "@/i18n/messages/providerDocumentationRenalMetabolicEndocrineComplaintIntel.en";
import { providerDocumentationRenalMetabolicEndocrineComplaintIntelFr } from "@/i18n/messages/providerDocumentationRenalMetabolicEndocrineComplaintIntel.fr";
import { providerDocumentationNauseaVomitingComplaintIntelEn } from "@/i18n/messages/providerDocumentationNauseaVomitingComplaintIntel.en";

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
const renalFailureSymptoms = (key: string) => `providerDocumentationComplaintIntel.renalFailureSymptomsComplaintV1.${key}`;
const nauseaVomitingMetabolic = (key: string) =>
  `providerDocumentationComplaintIntel.nauseaVomitingMetabolicComplaintV1.${key}`;

const HYPERGLYCEMIA_COMPLAINT_V1_INTEL = buildHyperglycemiaComplaintV1Intel(hyperglycemia);
const HYPOGLYCEMIA_COMPLAINT_V1_INTEL = buildHypoglycemiaComplaintV1Intel(hypoglycemia);
const DIABETES_SICK_DAY_COMPLAINT_V1_INTEL = buildDiabetesSickDayComplaintV1Intel(diabetesSickDay);
const INSULIN_MEDICATION_ISSUE_COMPLAINT_V1_INTEL = buildInsulinMedicationIssueComplaintV1Intel(insulinMedicationIssue);
const POLYURIA_POLYDYPSIA_COMPLAINT_V1_INTEL = buildPolyuriaPolydipsiaComplaintV1Intel(polyuriaPolydipsia);
const DEHYDRATION_METABOLIC_COMPLAINT_V1_INTEL = buildDehydrationMetabolicComplaintV1Intel(dehydrationMetabolic);
const ELECTROLYTE_ABNORMALITY_COMPLAINT_V1_INTEL = buildElectrolyteAbnormalityComplaintV1Intel(electrolyteAbnormality);
const THYROID_SYMPTOMS_COMPLAINT_V1_INTEL = buildThyroidSymptomsComplaintV1Intel(thyroidSymptoms);
const GENERALIZED_WEAKNESS_METABOLIC_COMPLAINT_V1_INTEL =
  buildGeneralizedWeaknessMetabolicComplaintV1Intel(generalizedWeaknessMetabolic);
const RENAL_FAILURE_SYMPTOMS_COMPLAINT_V1_INTEL = buildRenalFailureSymptomsComplaintV1Intel(renalFailureSymptoms);
const NAUSEA_VOMITING_METABOLIC_COMPLAINT_V1_INTEL = buildNauseaVomitingMetabolicComplaintV1Intel(nauseaVomitingMetabolic);

export const RENAL_METABOLIC_ENDOCRINE_GOLD_STANDARD_BUNDLES = [
  HYPERGLYCEMIA_COMPLAINT_V1_INTEL,
  HYPOGLYCEMIA_COMPLAINT_V1_INTEL,
  DIABETES_SICK_DAY_COMPLAINT_V1_INTEL,
  INSULIN_MEDICATION_ISSUE_COMPLAINT_V1_INTEL,
  POLYURIA_POLYDYPSIA_COMPLAINT_V1_INTEL,
  DEHYDRATION_METABOLIC_COMPLAINT_V1_INTEL,
  ELECTROLYTE_ABNORMALITY_COMPLAINT_V1_INTEL,
  THYROID_SYMPTOMS_COMPLAINT_V1_INTEL,
  GENERALIZED_WEAKNESS_METABOLIC_COMPLAINT_V1_INTEL,
  RENAL_FAILURE_SYMPTOMS_COMPLAINT_V1_INTEL,
  NAUSEA_VOMITING_METABOLIC_COMPLAINT_V1_INTEL,
] as const;

const CANNOT_MISS_BY_TEMPLATE: Record<string, readonly string[]> = {
  hyperglycemia_complaint_v1: ["diffDka", "diffHhs", "diffSepsis", "diffAcuteKidneyInjury"],
  hypoglycemia_complaint_v1: ["diffSevereHypoglycemia", "diffSepsis", "diffAdrenalCrisis"],
  diabetes_sick_day_complaint_v1: ["diffDka", "diffHhs", "diffSepsis"],
  insulin_medication_issue_complaint_v1: ["diffDka", "diffHhs", "diffSevereHypoglycemia"],
  polyuria_polydipsia_complaint_v1: ["diffDka", "diffHhs"],
  dehydration_metabolic_complaint_v1: [
    "diffDka",
    "diffHhs",
    "diffSepsis",
    "diffAcuteKidneyInjury",
    "diffHyperkalemia",
    "diffAdrenalCrisis",
  ],
  electrolyte_abnormality_complaint_v1: ["diffHyperkalemia", "diffAcuteKidneyInjury", "diffAdrenalCrisis"],
  thyroid_symptoms_complaint_v1: ["diffThyroidStorm", "diffMyxedemaComa", "diffSepsis"],
  generalized_weakness_metabolic_complaint_v1: [
    "diffDka",
    "diffHhs",
    "diffSevereHypoglycemia",
    "diffHyperkalemia",
    "diffAcuteKidneyInjury",
    "diffSepsis",
    "diffAdrenalCrisis",
  ],
  renal_failure_symptoms_complaint_v1: ["diffAcuteKidneyInjury", "diffHyperkalemia", "diffSepsis"],
  nausea_vomiting_metabolic_complaint_v1: ["diffDiabeticKetoacidosis", "diffSepsis"],
};

const BUNDLE_BY_TEMPLATE_ID = {
  hyperglycemia_complaint_v1: HYPERGLYCEMIA_COMPLAINT_V1_INTEL,
  hypoglycemia_complaint_v1: HYPOGLYCEMIA_COMPLAINT_V1_INTEL,
  diabetes_sick_day_complaint_v1: DIABETES_SICK_DAY_COMPLAINT_V1_INTEL,
  insulin_medication_issue_complaint_v1: INSULIN_MEDICATION_ISSUE_COMPLAINT_V1_INTEL,
  polyuria_polydipsia_complaint_v1: POLYURIA_POLYDYPSIA_COMPLAINT_V1_INTEL,
  dehydration_metabolic_complaint_v1: DEHYDRATION_METABOLIC_COMPLAINT_V1_INTEL,
  electrolyte_abnormality_complaint_v1: ELECTROLYTE_ABNORMALITY_COMPLAINT_V1_INTEL,
  thyroid_symptoms_complaint_v1: THYROID_SYMPTOMS_COMPLAINT_V1_INTEL,
  generalized_weakness_metabolic_complaint_v1: GENERALIZED_WEAKNESS_METABOLIC_COMPLAINT_V1_INTEL,
  renal_failure_symptoms_complaint_v1: RENAL_FAILURE_SYMPTOMS_COMPLAINT_V1_INTEL,
  nausea_vomiting_metabolic_complaint_v1: NAUSEA_VOMITING_METABOLIC_COMPLAINT_V1_INTEL,
} as const;

const NAMESPACE_BY_TEMPLATE_ID = {
  hyperglycemia_complaint_v1: "hyperglycemiaComplaintV1",
  hypoglycemia_complaint_v1: "hypoglycemiaComplaintV1",
  diabetes_sick_day_complaint_v1: "diabetesSickDayComplaintV1",
  insulin_medication_issue_complaint_v1: "insulinMedicationIssueComplaintV1",
  polyuria_polydipsia_complaint_v1: "polyuriaPolydipsiaComplaintV1",
  dehydration_metabolic_complaint_v1: "dehydrationMetabolicComplaintV1",
  electrolyte_abnormality_complaint_v1: "electrolyteAbnormalityComplaintV1",
  thyroid_symptoms_complaint_v1: "thyroidSymptomsComplaintV1",
  generalized_weakness_metabolic_complaint_v1: "generalizedWeaknessMetabolicComplaintV1",
  renal_failure_symptoms_complaint_v1: "renalFailureSymptomsComplaintV1",
  nausea_vomiting_metabolic_complaint_v1: "nauseaVomitingMetabolicComplaintV1",
} as const;

const ME_2Z_R_MESSAGE_SOURCE = {
  ...providerDocumentationRenalMetabolicEndocrineComplaintIntelEn,
  nauseaVomitingMetabolicComplaintV1: providerDocumentationNauseaVomitingComplaintIntelEn.nauseaVomitingMetabolicComplaintV1,
};

function fragmentKeySuffix(fragmentKey: string): string {
  return fragmentKey.split(".").pop() ?? "";
}

function messagesForBundle(bundle: (typeof RENAL_METABOLIC_ENDOCRINE_GOLD_STANDARD_BUNDLES)[number]) {
  const prefix = flattenComplaintIntelligenceKeys(bundle)[0]?.split(".").slice(0, -1).join(".") ?? "";
  const namespace = prefix.split(".").pop() ?? "";
  const namespaceObject = ME_2Z_R_MESSAGE_SOURCE[namespace as keyof typeof ME_2Z_R_MESSAGE_SOURCE] ?? {};
  const out: Record<string, string> = {};
  for (const fragmentKey of flattenComplaintIntelligenceKeys(bundle)) {
    const key = fragmentKeySuffix(fragmentKey);
    if (namespaceObject[key as keyof typeof namespaceObject]) {
      out[key] = namespaceObject[key as keyof typeof namespaceObject] as string;
    }
  }
  return out;
}

describe("providerDocumentationRenalMetabolicEndocrineTrackC — MEDUI.ED.ME.2Z-R", () => {
  it("accounts for all ME.2Z-R template IDs", () => {
    for (const templateId of RENAL_METABOLIC_ENDOCRINE_TEMPLATE_IDS) {
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it.each(RENAL_METABOLIC_ENDOCRINE_GOLD_STANDARD_BUNDLES)("passes Track C compliance", (bundle) => {
    expect(collectTrackCViolations(bundle)).toEqual([]);
    expect(() => assertTrackCCompliance(bundle)).not.toThrow();
  });

  it.each(RENAL_METABOLIC_ENDOCRINE_TEMPLATE_IDS)("covers cannot-miss diagnoses for %s", (templateId) => {
    const bundle = BUNDLE_BY_TEMPLATE_ID[templateId];
    const suffixes = (bundle.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    expect(suffixes).toEqual(expect.arrayContaining([...(CANNOT_MISS_BY_TEMPLATE[templateId] ?? [])]));
  });

  it.each(RENAL_METABOLIC_ENDOCRINE_GOLD_STANDARD_BUNDLES.filter(
    (bundle) => bundle !== NAUSEA_VOMITING_METABOLIC_COMPLAINT_V1_INTEL
  ))("has chart-ready EN i18n for every key", (bundle) => {
    const messages = messagesForBundle(bundle);
    const keys = flattenComplaintIntelligenceKeys(bundle).map(fragmentKeySuffix);
    for (const key of keys) {
      expect(messages[key], `missing EN i18n for ${key}`).toBeTruthy();
    }
    const chartReadyMessages = Object.fromEntries(
      Object.entries(messages).filter(([key]) => !key.toLowerCase().includes("reviewed"))
    );
    const dataReviewedMessages = Object.fromEntries(
      Object.entries(messages).filter(([key]) => key.toLowerCase().includes("reviewed"))
    );
    expect(auditTrackCi18nMessageValues(chartReadyMessages)).toEqual([]);
    expect(auditTrackCi18nMessageValues(dataReviewedMessages, { allowReviewLanguage: true })).toEqual([]);
  });

  it.each(RENAL_METABOLIC_ENDOCRINE_TEMPLATE_IDS)("passes human documentation audit for %s", (templateId) => {
      const violations = auditHumanDocumentationForFamilyTemplate(
        {
          phase: "MEDUI.ED.ME.2Z-R",
          requiredSamplesPerTemplate: 20,
          templates: [
            {
              templateId,
              bundle: BUNDLE_BY_TEMPLATE_ID[templateId],
              namespace: NAMESPACE_BY_TEMPLATE_ID[templateId],
            },
          ],
          messageSource: ME_2Z_R_MESSAGE_SOURCE,
        },
        templateId
      );
      expect(() => assertHumanDocumentationAuditPasses(templateId, violations)).not.toThrow();
      expect(violations).toEqual([]);
    }
  );

  it("maintains EN/FR i18n key parity for all ME.2Z-R renal/metabolic/endocrine namespaces", () => {
    for (const namespace of Object.keys(providerDocumentationRenalMetabolicEndocrineComplaintIntelEn)) {
      const enKeys = Object.keys(
        providerDocumentationRenalMetabolicEndocrineComplaintIntelEn[
          namespace as keyof typeof providerDocumentationRenalMetabolicEndocrineComplaintIntelEn
        ]
      ).sort();
      const frKeys = Object.keys(
        providerDocumentationRenalMetabolicEndocrineComplaintIntelFr[
          namespace as keyof typeof providerDocumentationRenalMetabolicEndocrineComplaintIntelFr
        ]
      ).sort();
      expect(frKeys, namespace).toEqual(enKeys);
    }
  });

  it.each(RENAL_METABOLIC_ENDOCRINE_TEMPLATE_IDS)("exposes MDM.1 workspace bindings for %s", (templateId) => {
    const catalogTemplate = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId);
    expect(catalogTemplate).toBeTruthy();
    const template = {
      ...catalogTemplate!,
      complaintIntelligence: BUNDLE_BY_TEMPLATE_ID[templateId],
    };
    expect(complaintIntelligenceMdmChipBindingsForTemplate(template).map((binding) => binding.intelField)).toEqual([
      "mdmWorkingAssessment",
      "mdmDifferentialSynthesis",
      "mdmDataReviewed",
      "mdmRiskStratification",
      "mdmClinicalRationale",
      "clinicalImpression",
      "mdmPlanSummary",
    ]);
  });

  it("reports ME.2Z-R gold standard key counts", () => {
    const namespaceCounts = Object.fromEntries(
      RENAL_METABOLIC_ENDOCRINE_GOLD_STANDARD_BUNDLES.map((bundle) => {
        const namespace = flattenComplaintIntelligenceKeys(bundle)[0]?.split(".").slice(-2, -1)[0] ?? "unknown";
        return [namespace, flattenComplaintIntelligenceKeys(bundle).length];
      })
    );
    expect(namespaceCounts).toMatchObject({
      hyperglycemiaComplaintV1: 97,
      hypoglycemiaComplaintV1: 92,
    });
    const totalKeys = RENAL_METABOLIC_ENDOCRINE_GOLD_STANDARD_BUNDLES.reduce(
      (sum, bundle) => sum + flattenComplaintIntelligenceKeys(bundle).length,
      0
    );
    expect(totalKeys).toBeGreaterThan(800);
  });
});
