import { describe, expect, it } from "vitest";
import {
  AFIB_RAPID_RATE_COMPLAINT_V1_INTEL,
  CHF_SYMPTOMS_COMPLAINT_V1_INTEL,
  EDEMA_VOLUME_OVERLOAD_COMPLAINT_V1_INTEL,
  EXERTIONAL_DYSPNEA_COMPLAINT_V1_INTEL,
  GENERALIZED_WEAKNESS_CARDIAC_EQUIVALENT_COMPLAINT_V1_INTEL,
  HYPERTENSION_COMPLAINT_V1_INTEL,
  LEG_SWELLING_DVT_COMPLAINT_V1_INTEL,
  NEAR_SYNCOPE_COMPLAINT_V1_INTEL,
  PALPITATIONS_COMPLAINT_V1_INTEL,
  flattenComplaintIntelligenceKeys,
} from "./providerDocumentationComplaintIntelligence";
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
import { CARDIAC_NON_CHEST_PAIN_TEMPLATE_IDS } from "./providerDocumentationCardiacNonChestPainComplaintIntelGoldStandard";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "./providerDocumentationModel";
import { providerDocumentationCardiacNonChestPainComplaintIntelEn } from "@/i18n/messages/providerDocumentationCardiacNonChestPainComplaintIntel.en";
import { providerDocumentationCardiacNonChestPainComplaintIntelFr } from "@/i18n/messages/providerDocumentationCardiacNonChestPainComplaintIntel.fr";
import { providerDocumentationDizzinessVertigoComplaintIntelEn } from "@/i18n/messages/providerDocumentationDizzinessVertigoComplaintIntel.en";

export const CARDIAC_NON_CHEST_PAIN_GOLD_STANDARD_BUNDLES = [
  PALPITATIONS_COMPLAINT_V1_INTEL,
  HYPERTENSION_COMPLAINT_V1_INTEL,
  LEG_SWELLING_DVT_COMPLAINT_V1_INTEL,
  CHF_SYMPTOMS_COMPLAINT_V1_INTEL,
  AFIB_RAPID_RATE_COMPLAINT_V1_INTEL,
  GENERALIZED_WEAKNESS_CARDIAC_EQUIVALENT_COMPLAINT_V1_INTEL,
  NEAR_SYNCOPE_COMPLAINT_V1_INTEL,
  EXERTIONAL_DYSPNEA_COMPLAINT_V1_INTEL,
  EDEMA_VOLUME_OVERLOAD_COMPLAINT_V1_INTEL,
] as const;

const CANNOT_MISS_CARDIAC = [
  "diffAcuteCoronarySyndrome",
  "diffPulmonaryEmbolism",
  "diffHeartFailureExacerbation",
  "diffUnstableArrhythmia",
  "diffVentricularTachycardia",
  "diffHypertensiveEmergency",
] as const;

const BUNDLE_BY_TEMPLATE_ID = {
  palpitations_complaint_v1: PALPITATIONS_COMPLAINT_V1_INTEL,
  hypertension_complaint_v1: HYPERTENSION_COMPLAINT_V1_INTEL,
  leg_swelling_dvt_complaint_v1: LEG_SWELLING_DVT_COMPLAINT_V1_INTEL,
  chf_symptoms_complaint_v1: CHF_SYMPTOMS_COMPLAINT_V1_INTEL,
  afib_rapid_rate_complaint_v1: AFIB_RAPID_RATE_COMPLAINT_V1_INTEL,
  generalized_weakness_cardiac_equivalent_complaint_v1: GENERALIZED_WEAKNESS_CARDIAC_EQUIVALENT_COMPLAINT_V1_INTEL,
  near_syncope_complaint_v1: NEAR_SYNCOPE_COMPLAINT_V1_INTEL,
  exertional_dyspnea_complaint_v1: EXERTIONAL_DYSPNEA_COMPLAINT_V1_INTEL,
  edema_volume_overload_complaint_v1: EDEMA_VOLUME_OVERLOAD_COMPLAINT_V1_INTEL,
} as const;

const NAMESPACE_BY_TEMPLATE_ID = {
  palpitations_complaint_v1: "palpitationsComplaintV1",
  hypertension_complaint_v1: "hypertensionComplaintV1",
  leg_swelling_dvt_complaint_v1: "legSwellingDvtComplaintV1",
  chf_symptoms_complaint_v1: "chfSymptomsComplaintV1",
  afib_rapid_rate_complaint_v1: "afibRapidRateComplaintV1",
  generalized_weakness_cardiac_equivalent_complaint_v1: "generalizedWeaknessCardiacEquivalentComplaintV1",
  near_syncope_complaint_v1: "nearSyncopeComplaintV1",
  exertional_dyspnea_complaint_v1: "exertionalDyspneaComplaintV1",
  edema_volume_overload_complaint_v1: "edemaVolumeOverloadComplaintV1",
} as const;

const ME_2Y_R_MESSAGE_SOURCE = {
  ...providerDocumentationCardiacNonChestPainComplaintIntelEn,
  nearSyncopeComplaintV1: providerDocumentationDizzinessVertigoComplaintIntelEn.nearSyncopeComplaintV1,
};

function fragmentKeySuffix(fragmentKey: string): string {
  return fragmentKey.split(".").pop() ?? "";
}

function messagesForBundle(bundle: (typeof CARDIAC_NON_CHEST_PAIN_GOLD_STANDARD_BUNDLES)[number]) {
  const prefix = flattenComplaintIntelligenceKeys(bundle)[0]?.split(".").slice(0, -1).join(".") ?? "";
  const namespace = prefix.split(".").pop() ?? "";
  const namespaceObject =
    ME_2Y_R_MESSAGE_SOURCE[namespace as keyof typeof ME_2Y_R_MESSAGE_SOURCE] ?? {};
  const out: Record<string, string> = {};
  for (const fragmentKey of flattenComplaintIntelligenceKeys(bundle)) {
    const key = fragmentKeySuffix(fragmentKey);
    if (namespaceObject[key as keyof typeof namespaceObject]) {
      out[key] = namespaceObject[key as keyof typeof namespaceObject] as string;
    }
  }
  return out;
}

describe("providerDocumentationCardiacNonChestPainTrackC — MEDUI.ED.ME.2Y-R", () => {
  it("accounts for all ME.2Y-R template IDs", () => {
    for (const templateId of CARDIAC_NON_CHEST_PAIN_TEMPLATE_IDS) {
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it.each(CARDIAC_NON_CHEST_PAIN_GOLD_STANDARD_BUNDLES)("passes Track C compliance", (bundle) => {
    expect(collectTrackCViolations(bundle)).toEqual([]);
    expect(() => assertTrackCCompliance(bundle)).not.toThrow();
  });

  it.each(CARDIAC_NON_CHEST_PAIN_TEMPLATE_IDS.filter((id) => id !== "near_syncope_complaint_v1"))(
    "covers cannot-miss cardiac diagnoses for %s",
    (templateId) => {
      const bundle = BUNDLE_BY_TEMPLATE_ID[templateId];
      const suffixes = (bundle.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
      expect(suffixes).toEqual(expect.arrayContaining([...CANNOT_MISS_CARDIAC]));
    }
  );

  it.each(CARDIAC_NON_CHEST_PAIN_GOLD_STANDARD_BUNDLES)("has chart-ready EN i18n for every key", (bundle) => {
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

  it.each(CARDIAC_NON_CHEST_PAIN_TEMPLATE_IDS)("passes human documentation audit for %s", (templateId) => {
    const violations = auditHumanDocumentationForFamilyTemplate(
      {
        phase: "MEDUI.ED.ME.2Y-R",
        requiredSamplesPerTemplate: 20,
        templates: [
          {
            templateId,
            bundle: BUNDLE_BY_TEMPLATE_ID[templateId],
            namespace: NAMESPACE_BY_TEMPLATE_ID[templateId],
          },
        ],
        messageSource: ME_2Y_R_MESSAGE_SOURCE,
      },
      templateId
    );
    expect(() => assertHumanDocumentationAuditPasses(templateId, violations)).not.toThrow();
    expect(violations).toEqual([]);
  });

  it("maintains EN/FR i18n key parity for all ME.2Y-R cardiac namespaces", () => {
    for (const namespace of Object.keys(providerDocumentationCardiacNonChestPainComplaintIntelEn)) {
      const enKeys = Object.keys(
        providerDocumentationCardiacNonChestPainComplaintIntelEn[
          namespace as keyof typeof providerDocumentationCardiacNonChestPainComplaintIntelEn
        ]
      ).sort();
      const frKeys = Object.keys(
        providerDocumentationCardiacNonChestPainComplaintIntelFr[
          namespace as keyof typeof providerDocumentationCardiacNonChestPainComplaintIntelFr
        ]
      ).sort();
      expect(frKeys, namespace).toEqual(enKeys);
    }
  });

  it.each(CARDIAC_NON_CHEST_PAIN_TEMPLATE_IDS)("exposes MDM.1 workspace bindings for %s", (templateId) => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId) ?? null;
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
});
