import { describe, expect, it } from "vitest";
import { flattenComplaintIntelligenceKeys } from "./providerDocumentationComplaintIntelligence";
import { FEVER_COMPLAINT_V1_INTEL } from "./providerDocumentationInfectiousEntComplaintIntelligence19Mdm7";
import {
  assertTrackCCompliance,
  auditTrackCi18nMessageValues,
  collectTrackCViolations,
} from "./providerDocumentationComplaintIntelligenceTrackC";
import { complaintIntelligenceMdmChipBindingsForTemplate } from "./providerDocumentationComplaintIntelligenceWorkspaceChips";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "./providerDocumentationModel";
import { providerDocumentationAdultFeverComplaintIntelEn } from "@/i18n/messages/providerDocumentationAdultFeverComplaintIntel.en";
import { providerDocumentationAdultFeverComplaintIntelFr } from "@/i18n/messages/providerDocumentationAdultFeverComplaintIntel.fr";

export const ADULT_FEVER_GOLD_STANDARD_BUNDLES = [FEVER_COMPLAINT_V1_INTEL] as const;

export const ADULT_FEVER_TEMPLATE_IDS = ["fever_complaint_v1"] as const;

function fragmentKeySuffix(fragmentKey: string): string {
  return fragmentKey.split(".").pop() ?? "";
}

function messagesForBundle(bundle: (typeof ADULT_FEVER_GOLD_STANDARD_BUNDLES)[number]) {
  const prefix = flattenComplaintIntelligenceKeys(bundle)[0]?.split(".").slice(0, -1).join(".") ?? "";
  const namespace = prefix.split(".").pop() ?? "";
  const namespaceObject =
    providerDocumentationAdultFeverComplaintIntelEn[
      namespace as keyof typeof providerDocumentationAdultFeverComplaintIntelEn
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

describe("providerDocumentationAdultFeverTrackC — MEDUI.ED.ME.2G-R", () => {
  it("accounts for all discovered ME.2G adult fever template IDs", () => {
    for (const templateId of ADULT_FEVER_TEMPLATE_IDS) {
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it.each(ADULT_FEVER_GOLD_STANDARD_BUNDLES)("passes Track C compliance", (bundle) => {
    expect(collectTrackCViolations(bundle)).toEqual([]);
    expect(() => assertTrackCCompliance(bundle)).not.toThrow();
  });

  it.each(ADULT_FEVER_GOLD_STANDARD_BUNDLES)("has seven-section MDM gold standard", (bundle) => {
    expect(bundle.mdmWorkingAssessment?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmDifferentialSynthesis?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmDataReviewed?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmRiskStratification?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmClinicalRationale?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.clinicalImpression?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmPlanSummary?.length ?? 0).toBeGreaterThan(0);
  });

  it("excludes prohibited wording from HPI and exam keys", () => {
    const prohibited = [
      "reviewed",
      "reviewcompleted",
      "historyobtained",
      "assessmentcompleted",
      "ifdocumented",
      "ifindicated",
      "ifgiven",
      "considered",
    ];
    for (const fragmentKey of FEVER_COMPLAINT_V1_INTEL.hpi ?? []) {
      const suffix = fragmentKeySuffix(fragmentKey).toLowerCase();
      for (const token of prohibited) {
        expect(suffix, `${fragmentKey} HPI key`).not.toContain(token);
      }
    }
    for (const fragmentKey of Object.values(FEVER_COMPLAINT_V1_INTEL.physicalExam ?? {}).flat()) {
      const suffix = fragmentKeySuffix(fragmentKey).toLowerCase();
      for (const token of prohibited) {
        expect(suffix, `${fragmentKey} exam key`).not.toContain(token);
      }
    }
  });

  it("covers cannot-miss diagnoses", () => {
    const suffixes = (FEVER_COMPLAINT_V1_INTEL.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    expect(suffixes).toEqual(
      expect.arrayContaining([
        "diffSepsis",
        "diffSepticShock",
        "diffMeningitis",
        "diffPneumoniaWithHypoxia",
        "diffPyelonephritis",
        "diffNeutropenicFever",
        "diffEndocarditis",
        "diffAppendicitis",
        "diffSeriousBacterialInfection",
      ])
    );
  });

  it("has no duplicate fragment keys in bundle", () => {
    const keys = flattenComplaintIntelligenceKeys(FEVER_COMPLAINT_V1_INTEL);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("has chart-ready EN i18n for every bundle key", () => {
    const messages = messagesForBundle(FEVER_COMPLAINT_V1_INTEL);
    const keys = flattenComplaintIntelligenceKeys(FEVER_COMPLAINT_V1_INTEL).map(fragmentKeySuffix);
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

  it("has chart-ready FR i18n for every bundle key", () => {
    const namespaceObject = providerDocumentationAdultFeverComplaintIntelFr.feverComplaintV1;
    const keys = flattenComplaintIntelligenceKeys(FEVER_COMPLAINT_V1_INTEL).map(fragmentKeySuffix);
    for (const key of keys) {
      expect(namespaceObject[key as keyof typeof namespaceObject], `missing FR i18n for ${key}`).toBeTruthy();
    }
  });

  it.each(ADULT_FEVER_TEMPLATE_IDS)("exposes MDM.1 workspace bindings for %s", (templateId) => {
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
