import { describe, expect, it } from "vitest";
import { MALE_GENITAL_COMPLAINT_INTEL, flattenComplaintIntelligenceKeys } from "./providerDocumentationComplaintIntelligence";
import { TESTICULAR_PAIN_COMPLAINT_V1_INTEL } from "./providerDocumentationGuRenalComplaintIntelligence19Mdm5";
import {
  assertTrackCCompliance,
  auditTrackCi18nMessageValues,
  collectTrackCViolations,
} from "./providerDocumentationComplaintIntelligenceTrackC";
import { complaintIntelligenceMdmChipBindingsForTemplate } from "./providerDocumentationComplaintIntelligenceWorkspaceChips";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "./providerDocumentationModel";
import { providerDocumentationMaleGuComplaintIntelEn } from "@/i18n/messages/providerDocumentationMaleGuComplaintIntel.en";

export const MALE_GU_GOLD_STANDARD_BUNDLES = [
  MALE_GENITAL_COMPLAINT_INTEL,
  TESTICULAR_PAIN_COMPLAINT_V1_INTEL,
] as const;

export const MALE_GU_COMPLAINT_INTEL_TEMPLATE_IDS = [
  "male_genital_complaint",
  "testicular_pain_complaint_v1",
] as const;

function fragmentKeySuffix(fragmentKey: string): string {
  return fragmentKey.split(".").pop() ?? "";
}

function messagesForBundle(bundle: (typeof MALE_GU_GOLD_STANDARD_BUNDLES)[number]) {
  const prefix = flattenComplaintIntelligenceKeys(bundle)[0]?.split(".").slice(0, -1).join(".") ?? "";
  const namespace = prefix.split(".").pop() ?? "";
  const namespaceObject =
    providerDocumentationMaleGuComplaintIntelEn[
      namespace as keyof typeof providerDocumentationMaleGuComplaintIntelEn
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

describe("providerDocumentationMaleGuTrackC — MEDUI.ED.ME.2P-R", () => {
  it.each(MALE_GU_GOLD_STANDARD_BUNDLES)("passes Track C compliance", (bundle) => {
    expect(collectTrackCViolations(bundle)).toEqual([]);
    expect(() => assertTrackCCompliance(bundle)).not.toThrow();
  });

  it.each(MALE_GU_GOLD_STANDARD_BUNDLES)("has seven-section MDM gold standard", (bundle) => {
    expect(bundle.mdmWorkingAssessment?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmDifferentialSynthesis?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmDataReviewed?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmRiskStratification?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmClinicalRationale?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.clinicalImpression?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmPlanSummary?.length ?? 0).toBeGreaterThan(0);
  });

  it("covers cannot-miss diagnoses on composite male GU bundle", () => {
    const suffixes = (MALE_GENITAL_COMPLAINT_INTEL.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    expect(suffixes).toEqual(
      expect.arrayContaining([
        "diffTesticularTorsion",
        "diffFournierGangrene",
        "diffTesticularAbscess",
        "diffSepsis",
        "diffObstructiveUropathy",
        "diffAcuteUrinaryRetention",
      ])
    );
  });

  it.each(MALE_GU_COMPLAINT_INTEL_TEMPLATE_IDS)("exposes MDM.1 workspace bindings for %s", (templateId) => {
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
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

  it.each(MALE_GU_GOLD_STANDARD_BUNDLES)("has no duplicate fragment keys", (bundle) => {
    const keys = flattenComplaintIntelligenceKeys(bundle);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(MALE_GU_GOLD_STANDARD_BUNDLES)("has chart-ready EN i18n for every key", (bundle) => {
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
});
