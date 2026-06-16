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
  GI_EXTENSIONS_TEMPLATE_IDS,
  buildConstipationComplaintV1Intel,
  buildDysphagiaComplaintV1Intel,
  buildGiBleedComplaintV1Intel,
  buildHerniaComplaintV1Intel,
  buildRectalPainComplaintV1Intel,
} from "./providerDocumentationGiExtensionsComplaintIntelGoldStandard";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "./providerDocumentationModel";
import { providerDocumentationGiExtensionsComplaintIntelEn } from "@/i18n/messages/providerDocumentationGiExtensionsComplaintIntel.en";
import { providerDocumentationGiExtensionsComplaintIntelFr } from "@/i18n/messages/providerDocumentationGiExtensionsComplaintIntel.fr";

const constipation = (key: string) => `providerDocumentationComplaintIntel.constipationComplaintV1.${key}`;
const giBleed = (key: string) => `providerDocumentationComplaintIntel.giBleedComplaintV1.${key}`;
const hernia = (key: string) => `providerDocumentationComplaintIntel.herniaComplaintV1.${key}`;
const rectalPain = (key: string) => `providerDocumentationComplaintIntel.rectalPainComplaintV1.${key}`;
const dysphagia = (key: string) => `providerDocumentationComplaintIntel.dysphagiaComplaintV1.${key}`;

const CONSTIPATION_COMPLAINT_V1_INTEL = buildConstipationComplaintV1Intel(constipation);
const GI_BLEED_COMPLAINT_V1_INTEL = buildGiBleedComplaintV1Intel(giBleed);
const HERNIA_COMPLAINT_V1_INTEL = buildHerniaComplaintV1Intel(hernia);
const RECTAL_PAIN_COMPLAINT_V1_INTEL = buildRectalPainComplaintV1Intel(rectalPain);
const DYSPHAGIA_COMPLAINT_V1_INTEL = buildDysphagiaComplaintV1Intel(dysphagia);

export const GI_EXTENSIONS_GOLD_STANDARD_BUNDLES = [
  CONSTIPATION_COMPLAINT_V1_INTEL,
  GI_BLEED_COMPLAINT_V1_INTEL,
  HERNIA_COMPLAINT_V1_INTEL,
  RECTAL_PAIN_COMPLAINT_V1_INTEL,
  DYSPHAGIA_COMPLAINT_V1_INTEL,
] as const;

const CANNOT_MISS_BY_TEMPLATE: Record<string, readonly string[]> = {
  constipation_complaint_v1: [
    "diffBowelObstruction",
    "diffPerforatedViscus",
    "diffAppendicitis",
    "diffActiveGiBleeding",
    "diffIschemicBowel",
    "diffSepsis",
    "diffFunctionalConstipation",
    "diffHemorrhoids",
  ],
  gi_bleed_complaint_v1: [
    "diffActiveGiBleeding",
    "diffUpperGiBleed",
    "diffLowerGiBleed",
    "diffPerforatedViscus",
    "diffBowelObstruction",
    "diffAcuteCholecystitis",
    "diffIschemicBowel",
    "diffSepsis",
  ],
  hernia_complaint_v1: [
    "diffIncarceratedHernia",
    "diffStrangulatedHernia",
    "diffBowelObstruction",
    "diffPerforatedViscus",
    "diffAppendicitis",
    "diffIschemicBowel",
    "diffSepsis",
  ],
  rectal_pain_complaint_v1: [
    "diffHemorrhoid",
    "diffAnalFissure",
    "diffActiveGiBleeding",
    "diffPerforatedViscus",
    "diffBowelObstruction",
    "diffSepsis",
  ],
  dysphagia_complaint_v1: [
    "diffEsophagealImpaction",
    "diffEsophagitis",
    "diffPerforatedViscus",
    "diffAcuteCholecystitis",
    "diffSepsis",
  ],
};

const BUNDLE_BY_TEMPLATE_ID = {
  constipation_complaint_v1: CONSTIPATION_COMPLAINT_V1_INTEL,
  gi_bleed_complaint_v1: GI_BLEED_COMPLAINT_V1_INTEL,
  hernia_complaint_v1: HERNIA_COMPLAINT_V1_INTEL,
  rectal_pain_complaint_v1: RECTAL_PAIN_COMPLAINT_V1_INTEL,
  dysphagia_complaint_v1: DYSPHAGIA_COMPLAINT_V1_INTEL,
} as const;

const NAMESPACE_BY_TEMPLATE_ID = {
  constipation_complaint_v1: "constipationComplaintV1",
  gi_bleed_complaint_v1: "giBleedComplaintV1",
  hernia_complaint_v1: "herniaComplaintV1",
  rectal_pain_complaint_v1: "rectalPainComplaintV1",
  dysphagia_complaint_v1: "dysphagiaComplaintV1",
} as const;

export const ME_2AA_R_MESSAGE_SOURCE = providerDocumentationGiExtensionsComplaintIntelEn;

function fragmentKeySuffix(fragmentKey: string): string {
  return fragmentKey.split(".").pop() ?? "";
}

function messagesForBundle(bundle: (typeof GI_EXTENSIONS_GOLD_STANDARD_BUNDLES)[number]) {
  const prefix = flattenComplaintIntelligenceKeys(bundle)[0]?.split(".").slice(0, -1).join(".") ?? "";
  const namespace = prefix.split(".").pop() ?? "";
  const namespaceObject = ME_2AA_R_MESSAGE_SOURCE[namespace as keyof typeof ME_2AA_R_MESSAGE_SOURCE] ?? {};
  const out: Record<string, string> = {};
  for (const fragmentKey of flattenComplaintIntelligenceKeys(bundle)) {
    const key = fragmentKeySuffix(fragmentKey);
    if (namespaceObject[key as keyof typeof namespaceObject]) {
      out[key] = namespaceObject[key as keyof typeof namespaceObject] as string;
    }
  }
  return out;
}

describe("providerDocumentationGiExtensionsTrackC — MEDUI.ED.ME.2AA-R", () => {
  it("accounts for all ME.2AA-R template IDs", () => {
    for (const templateId of GI_EXTENSIONS_TEMPLATE_IDS) {
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it.each(GI_EXTENSIONS_GOLD_STANDARD_BUNDLES)("passes Track C compliance", (bundle) => {
    expect(collectTrackCViolations(bundle)).toEqual([]);
    expect(() => assertTrackCCompliance(bundle)).not.toThrow();
  });

  it.each(GI_EXTENSIONS_TEMPLATE_IDS)("covers cannot-miss diagnoses for %s", (templateId) => {
    const bundle = BUNDLE_BY_TEMPLATE_ID[templateId];
    const suffixes = (bundle.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    expect(suffixes).toEqual(expect.arrayContaining([...(CANNOT_MISS_BY_TEMPLATE[templateId] ?? [])]));
  });

  it.each(GI_EXTENSIONS_GOLD_STANDARD_BUNDLES)("has chart-ready EN i18n for every key", (bundle) => {
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

  it.each(GI_EXTENSIONS_TEMPLATE_IDS)("passes human documentation audit for %s", (templateId) => {
    const violations = auditHumanDocumentationForFamilyTemplate(
      {
        phase: "MEDUI.ED.ME.2AA-R",
        requiredSamplesPerTemplate: 20,
        templates: [
          {
            templateId,
            bundle: BUNDLE_BY_TEMPLATE_ID[templateId],
            namespace: NAMESPACE_BY_TEMPLATE_ID[templateId],
          },
        ],
        messageSource: ME_2AA_R_MESSAGE_SOURCE,
      },
      templateId
    );
    expect(() => assertHumanDocumentationAuditPasses(templateId, violations)).not.toThrow();
    expect(violations).toEqual([]);
  });

  it("maintains EN/FR i18n key parity for all ME.2AA-R GI extension namespaces", () => {
    for (const namespace of Object.keys(providerDocumentationGiExtensionsComplaintIntelEn)) {
      const enKeys = Object.keys(
        providerDocumentationGiExtensionsComplaintIntelEn[
          namespace as keyof typeof providerDocumentationGiExtensionsComplaintIntelEn
        ]
      ).sort();
      const frKeys = Object.keys(
        providerDocumentationGiExtensionsComplaintIntelFr[
          namespace as keyof typeof providerDocumentationGiExtensionsComplaintIntelFr
        ]
      ).sort();
      expect(frKeys, namespace).toEqual(enKeys);
    }
  });

  it.each(GI_EXTENSIONS_TEMPLATE_IDS)("exposes MDM.1 workspace bindings for %s", (templateId) => {
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

  it("reports ME.2AA-R gold standard key counts", () => {
    const namespaceCounts = Object.fromEntries(
      GI_EXTENSIONS_GOLD_STANDARD_BUNDLES.map((bundle) => {
        const namespace = flattenComplaintIntelligenceKeys(bundle)[0]?.split(".").slice(-2, -1)[0] ?? "unknown";
        return [namespace, flattenComplaintIntelligenceKeys(bundle).length];
      })
    );
    expect(namespaceCounts).toMatchObject({
      constipationComplaintV1: 93,
      giBleedComplaintV1: 92,
    });
    const totalKeys = GI_EXTENSIONS_GOLD_STANDARD_BUNDLES.reduce(
      (sum, bundle) => sum + flattenComplaintIntelligenceKeys(bundle).length,
      0
    );
    expect(totalKeys).toBe(430);
  });
});
