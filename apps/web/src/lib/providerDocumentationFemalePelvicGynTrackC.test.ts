import { describe, expect, it } from "vitest";
import { FEMALE_PELVIC_GYN_COMPLAINT_INTEL, flattenComplaintIntelligenceKeys } from "./providerDocumentationComplaintIntelligence";
import {
  PELVIC_PAIN_COMPLAINT_V1_INTEL,
  VAGINAL_BLEEDING_COMPLAINT_V1_INTEL,
  VAGINAL_DISCHARGE_COMPLAINT_V1_INTEL,
} from "./providerDocumentationGuRenalComplaintIntelligence19Mdm5";
import {
  assertTrackCCompliance,
  auditTrackCi18nMessageValues,
  collectTrackCViolations,
} from "./providerDocumentationComplaintIntelligenceTrackC";
import { complaintIntelligenceMdmChipBindingsForTemplate } from "./providerDocumentationComplaintIntelligenceWorkspaceChips";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "./providerDocumentationModel";
import { providerDocumentationFemalePelvicGynComplaintIntelEn } from "@/i18n/messages/providerDocumentationFemalePelvicGynComplaintIntel.en";

export const FEMALE_PELVIC_GYN_GOLD_STANDARD_BUNDLES = [
  FEMALE_PELVIC_GYN_COMPLAINT_INTEL,
  PELVIC_PAIN_COMPLAINT_V1_INTEL,
  VAGINAL_BLEEDING_COMPLAINT_V1_INTEL,
  VAGINAL_DISCHARGE_COMPLAINT_V1_INTEL,
] as const;

export const FEMALE_PELVIC_GYN_COMPLAINT_INTEL_TEMPLATE_IDS = [
  "female_pelvic_gyn_complaint",
  "pelvic_pain_complaint_v1",
  "vaginal_bleeding_complaint_v1",
  "vaginal_discharge_complaint_v1",
] as const;

function fragmentKeySuffix(fragmentKey: string): string {
  return fragmentKey.split(".").pop() ?? "";
}

function messagesForBundle(bundle: (typeof FEMALE_PELVIC_GYN_GOLD_STANDARD_BUNDLES)[number]) {
  const prefix = flattenComplaintIntelligenceKeys(bundle)[0]?.split(".").slice(0, -1).join(".") ?? "";
  const namespace = prefix.split(".").pop() ?? "";
  const namespaceObject =
    providerDocumentationFemalePelvicGynComplaintIntelEn[
      namespace as keyof typeof providerDocumentationFemalePelvicGynComplaintIntelEn
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

describe("providerDocumentationFemalePelvicGynTrackC — MEDUI.ED.ME.2I-R", () => {
  it.each(FEMALE_PELVIC_GYN_GOLD_STANDARD_BUNDLES)("passes Track C compliance", (bundle) => {
    expect(collectTrackCViolations(bundle)).toEqual([]);
    expect(() => assertTrackCCompliance(bundle)).not.toThrow();
  });

  it.each(FEMALE_PELVIC_GYN_GOLD_STANDARD_BUNDLES)("has seven-section MDM gold standard", (bundle) => {
    expect(bundle.mdmWorkingAssessment?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmDifferentialSynthesis?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmDataReviewed?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmRiskStratification?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmClinicalRationale?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.clinicalImpression?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmPlanSummary?.length ?? 0).toBeGreaterThan(0);
  });

  it("covers cannot-miss diagnoses on composite GYN bundle", () => {
    const suffixes = (FEMALE_PELVIC_GYN_COMPLAINT_INTEL.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    expect(suffixes).toEqual(
      expect.arrayContaining([
        "diffEctopicPregnancy",
        "diffOvarianTorsion",
        "diffTuboOvarianAbscess",
        "diffSepticAbortion",
        "diffHemorrhagicOvarianCyst",
        "diffSevereAnemiaFromBleeding",
        "diffSepsis",
        "diffAppendicitis",
      ])
    );
  });

  it("covers required pelvic exam chips on composite bundle", () => {
    const suffixes = Object.values(FEMALE_PELVIC_GYN_COMPLAINT_INTEL.physicalExam ?? {})
      .flat()
      .map(fragmentKeySuffix);
    expect(suffixes).toEqual(
      expect.arrayContaining([
        "examPelvicExamPerformedWithChaperone",
        "examPelvicExamDeferred",
        "examCervicalMotionTendernessPresent",
        "examNoCervicalMotionTenderness",
        "examSuprapubicTenderness",
      ])
    );
  });

  it("covers clinical reasoning chips on composite bundle", () => {
    const suffixes = (FEMALE_PELVIC_GYN_COMPLAINT_INTEL.mdmClinicalRationale ?? []).map(fragmentKeySuffix);
    expect(suffixes).toEqual(
      expect.arrayContaining([
        "reasoningLowSuspicionEctopicPregnancy",
        "reasoningLowSuspicionOvarianTorsion",
        "reasoningNoPeritonealSignsOnExamination",
      ])
    );
  });

  it.each(FEMALE_PELVIC_GYN_GOLD_STANDARD_BUNDLES)("has no duplicate fragment keys", (bundle) => {
    const keys = flattenComplaintIntelligenceKeys(bundle);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(FEMALE_PELVIC_GYN_GOLD_STANDARD_BUNDLES)("has chart-ready EN i18n for every key", (bundle) => {
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

  it.each(FEMALE_PELVIC_GYN_COMPLAINT_INTEL_TEMPLATE_IDS)("exposes MDM.1 workspace bindings for %s", (templateId) => {
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
});
