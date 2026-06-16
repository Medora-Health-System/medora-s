import { describe, expect, it } from "vitest";
import {
  ALTERED_MENTAL_STATUS_COMPLAINT_V1_INTEL,
  BACK_PAIN_NEURO_RED_FLAGS_COMPLAINT_V1_INTEL,
  FOCAL_WEAKNESS_COMPLAINT_V1_INTEL,
  GAIT_INSTABILITY_FALLS_NEURO_COMPLAINT_V1_INTEL,
  NUMBNESS_TINGLING_COMPLAINT_V1_INTEL,
  STROKE_SYMPTOMS_COMPLAINT_INTEL,
  WEAKNESS_COMPLAINT_INTEL,
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
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "./providerDocumentationModel";
import { providerDocumentationNeuroStrokeWeaknessComplaintIntelEn } from "@/i18n/messages/providerDocumentationNeuroStrokeWeaknessComplaintIntel.en";
import { providerDocumentationNeuroStrokeWeaknessComplaintIntelFr } from "@/i18n/messages/providerDocumentationNeuroStrokeWeaknessComplaintIntel.fr";

export const NEURO_STROKE_WEAKNESS_GOLD_STANDARD_BUNDLES = [
  STROKE_SYMPTOMS_COMPLAINT_INTEL,
  WEAKNESS_COMPLAINT_INTEL,
  ALTERED_MENTAL_STATUS_COMPLAINT_V1_INTEL,
  FOCAL_WEAKNESS_COMPLAINT_V1_INTEL,
  NUMBNESS_TINGLING_COMPLAINT_V1_INTEL,
  GAIT_INSTABILITY_FALLS_NEURO_COMPLAINT_V1_INTEL,
  BACK_PAIN_NEURO_RED_FLAGS_COMPLAINT_V1_INTEL,
] as const;

export const NEURO_STROKE_WEAKNESS_TEMPLATE_IDS = [
  "stroke_symptoms",
  "weakness",
  "altered_mental_status_complaint_v1",
  "focal_weakness_complaint_v1",
  "numbness_tingling_complaint_v1",
  "gait_instability_falls_neuro_complaint_v1",
  "back_pain_neuro_red_flags_complaint_v1",
] as const;

const CANNOT_MISS_BY_TEMPLATE: Record<(typeof NEURO_STROKE_WEAKNESS_TEMPLATE_IDS)[number], readonly string[]> = {
  stroke_symptoms: [
    "diffIschemicStroke",
    "diffIntracranialHemorrhage",
    "diffLargeVesselOcclusion",
    "diffHypoglycemia",
    "diffSepsis",
    "diffMeningitis",
    "diffSeizure",
    "diffToxicIngestion",
    "diffSpinalCordCompression",
  ],
  weakness: ["diffIschemicStroke", "diffTia", "diffHypoglycemia", "diffSepsis", "diffSpinalCordCompression"],
  altered_mental_status_complaint_v1: [
    "diffIschemicStroke",
    "diffHypoglycemia",
    "diffSepsis",
    "diffMeningitis",
    "diffToxicIngestion",
  ],
  focal_weakness_complaint_v1: [
    "diffIschemicStroke",
    "diffLargeVesselOcclusion",
    "diffHypoglycemia",
    "diffSpinalCordCompression",
  ],
  numbness_tingling_complaint_v1: ["diffIschemicStroke", "diffTia", "diffHypoglycemia"],
  gait_instability_falls_neuro_complaint_v1: ["diffIschemicStroke", "diffCardiacArrhythmia", "diffDehydration"],
  back_pain_neuro_red_flags_complaint_v1: [
    "diffCaudaEquinaSyndrome",
    "diffSpinalCordCompression",
    "diffEpiduralAbscess",
  ],
};

const BUNDLE_BY_TEMPLATE_ID = {
  stroke_symptoms: STROKE_SYMPTOMS_COMPLAINT_INTEL,
  weakness: WEAKNESS_COMPLAINT_INTEL,
  altered_mental_status_complaint_v1: ALTERED_MENTAL_STATUS_COMPLAINT_V1_INTEL,
  focal_weakness_complaint_v1: FOCAL_WEAKNESS_COMPLAINT_V1_INTEL,
  numbness_tingling_complaint_v1: NUMBNESS_TINGLING_COMPLAINT_V1_INTEL,
  gait_instability_falls_neuro_complaint_v1: GAIT_INSTABILITY_FALLS_NEURO_COMPLAINT_V1_INTEL,
  back_pain_neuro_red_flags_complaint_v1: BACK_PAIN_NEURO_RED_FLAGS_COMPLAINT_V1_INTEL,
} as const;

const NAMESPACE_BY_TEMPLATE_ID = {
  stroke_symptoms: "stroke",
  weakness: "weakness",
  altered_mental_status_complaint_v1: "alteredMentalStatusComplaintV1",
  focal_weakness_complaint_v1: "focalWeaknessComplaintV1",
  numbness_tingling_complaint_v1: "numbnessTinglingComplaintV1",
  gait_instability_falls_neuro_complaint_v1: "gaitInstabilityFallsNeuroComplaintV1",
  back_pain_neuro_red_flags_complaint_v1: "backPainNeuroRedFlagsComplaintV1",
} as const;

function fragmentKeySuffix(fragmentKey: string): string {
  return fragmentKey.split(".").pop() ?? "";
}

function messagesForBundle(bundle: (typeof NEURO_STROKE_WEAKNESS_GOLD_STANDARD_BUNDLES)[number]) {
  const prefix = flattenComplaintIntelligenceKeys(bundle)[0]?.split(".").slice(0, -1).join(".") ?? "";
  const namespace = prefix.split(".").pop() ?? "";
  const namespaceObject =
    providerDocumentationNeuroStrokeWeaknessComplaintIntelEn[
      namespace as keyof typeof providerDocumentationNeuroStrokeWeaknessComplaintIntelEn
    ] ?? {};
  const out: Record<string, string> = {};
  for (const fragmentKey of flattenComplaintIntelligenceKeys(bundle)) {
    const key = fragmentKeySuffix(fragmentKey);
    if (namespaceObject[key as keyof typeof namespaceObject]) {
      out[key] = namespaceObject[key as keyof typeof namespaceObject] as string;
    }
  }
  return out;
}

describe("providerDocumentationNeuroStrokeWeaknessTrackC — MEDUI.ED.ME.2W-R", () => {
  it("accounts for all ME.2W-R template IDs", () => {
    for (const templateId of NEURO_STROKE_WEAKNESS_TEMPLATE_IDS) {
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it.each(NEURO_STROKE_WEAKNESS_GOLD_STANDARD_BUNDLES)("passes Track C compliance", (bundle) => {
    expect(collectTrackCViolations(bundle)).toEqual([]);
    expect(() => assertTrackCCompliance(bundle)).not.toThrow();
  });

  it.each(NEURO_STROKE_WEAKNESS_TEMPLATE_IDS)("covers cannot-miss diagnoses for %s", (templateId) => {
    const bundle = BUNDLE_BY_TEMPLATE_ID[templateId];
    const suffixes = (bundle.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    expect(suffixes).toEqual(expect.arrayContaining([...CANNOT_MISS_BY_TEMPLATE[templateId]]));
  });

  it.each(NEURO_STROKE_WEAKNESS_GOLD_STANDARD_BUNDLES)("has chart-ready EN i18n for every key", (bundle) => {
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

  it.each(NEURO_STROKE_WEAKNESS_TEMPLATE_IDS)("passes human documentation audit for %s", (templateId) => {
    const violations = auditHumanDocumentationForFamilyTemplate(
      {
        phase: "MEDUI.ED.ME.2W-R",
        requiredSamplesPerTemplate: 20,
        templates: [
          {
            templateId,
            bundle: BUNDLE_BY_TEMPLATE_ID[templateId],
            namespace: NAMESPACE_BY_TEMPLATE_ID[templateId],
          },
        ],
        messageSource: providerDocumentationNeuroStrokeWeaknessComplaintIntelEn,
      },
      templateId
    );
    expect(() => assertHumanDocumentationAuditPasses(templateId, violations)).not.toThrow();
    expect(violations).toEqual([]);
  });

  it("maintains EN/FR i18n key parity for all ME.2W-R namespaces", () => {
    for (const namespace of Object.keys(providerDocumentationNeuroStrokeWeaknessComplaintIntelEn)) {
      const enKeys = Object.keys(
        providerDocumentationNeuroStrokeWeaknessComplaintIntelEn[
          namespace as keyof typeof providerDocumentationNeuroStrokeWeaknessComplaintIntelEn
        ]
      ).sort();
      const frKeys = Object.keys(
        providerDocumentationNeuroStrokeWeaknessComplaintIntelFr[
          namespace as keyof typeof providerDocumentationNeuroStrokeWeaknessComplaintIntelFr
        ]
      ).sort();
      expect(frKeys, namespace).toEqual(enKeys);
    }
  });

  it.each(NEURO_STROKE_WEAKNESS_TEMPLATE_IDS)("exposes MDM.1 workspace bindings for %s", (templateId) => {
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
