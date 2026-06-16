import { describe, expect, it } from "vitest";
import { EXTREMITY_MSK_COMPLAINT_INTEL } from "./providerDocumentationComplaintIntelligence";
import {
  assertTrackCCompliance,
  auditTrackCi18nMessageValues,
  collectTrackCViolations,
} from "./providerDocumentationComplaintIntelligenceTrackC";
import { complaintIntelligenceMdmChipBindingsForTemplate } from "./providerDocumentationComplaintIntelligenceWorkspaceChips";
import { flattenComplaintIntelligenceKeys } from "./providerDocumentationComplaintIntelligence";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "./providerDocumentationModel";
import { providerDocumentationExtremityMskComplaintIntelEn } from "@/i18n/messages/providerDocumentationExtremityMskComplaintIntel.en";
import { providerDocumentationExtremityMskComplaintIntelFr } from "@/i18n/messages/providerDocumentationExtremityMskComplaintIntel.fr";

export const EXTREMITY_MSK_GOLD_STANDARD_BUNDLES = [EXTREMITY_MSK_COMPLAINT_INTEL] as const;

export const EXTREMITY_MSK_TEMPLATE_IDS = ["trauma_musculoskeletal"] as const;

const CANNOT_MISS_SUFFIXES = [
  "diffCompartmentSyndrome",
  "diffSepticArthritis",
  "diffAcuteLimbIschemia",
  "diffOpenFracture",
  "diffNecrotizingSoftTissueInfection",
  "diffDeepVeinThrombosis",
  "diffOsteomyelitis",
] as const;

function fragmentKeySuffix(fragmentKey: string): string {
  return fragmentKey.split(".").pop() ?? "";
}

function messagesForBundle(
  bundle: (typeof EXTREMITY_MSK_GOLD_STANDARD_BUNDLES)[number],
  locale: "en" | "fr"
) {
  const prefix = flattenComplaintIntelligenceKeys(bundle)[0]?.split(".").slice(0, -1).join(".") ?? "";
  const namespace = prefix.split(".").pop() ?? "";
  const namespaceObject =
    (locale === "en"
      ? providerDocumentationExtremityMskComplaintIntelEn
      : providerDocumentationExtremityMskComplaintIntelFr)[
      namespace as keyof typeof providerDocumentationExtremityMskComplaintIntelEn
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

describe("providerDocumentationExtremityMskTrackC — MEDUI.ED.ME.2O-R", () => {
  it("accounts for all discovered extremity MSK template IDs", () => {
    for (const templateId of EXTREMITY_MSK_TEMPLATE_IDS) {
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it("passes Track C compliance for extremity MSK bundle", () => {
    expect(collectTrackCViolations(EXTREMITY_MSK_COMPLAINT_INTEL)).toEqual([]);
    expect(() => assertTrackCCompliance(EXTREMITY_MSK_COMPLAINT_INTEL)).not.toThrow();
  });

  it("has seven-section MDM gold standard on extremity MSK bundle", () => {
    expect(EXTREMITY_MSK_COMPLAINT_INTEL.mdmWorkingAssessment?.length ?? 0).toBeGreaterThan(0);
    expect(EXTREMITY_MSK_COMPLAINT_INTEL.mdmDifferentialSynthesis?.length ?? 0).toBeGreaterThan(0);
    expect(EXTREMITY_MSK_COMPLAINT_INTEL.mdmDataReviewed?.length ?? 0).toBeGreaterThan(0);
    expect(EXTREMITY_MSK_COMPLAINT_INTEL.mdmRiskStratification?.length ?? 0).toBeGreaterThan(0);
    expect(EXTREMITY_MSK_COMPLAINT_INTEL.mdmClinicalRationale?.length ?? 0).toBeGreaterThan(0);
    expect(EXTREMITY_MSK_COMPLAINT_INTEL.clinicalImpression?.length ?? 0).toBeGreaterThan(0);
    expect(EXTREMITY_MSK_COMPLAINT_INTEL.mdmPlanSummary?.length ?? 0).toBeGreaterThan(0);
  });

  it("covers extremity cannot-miss diagnoses", () => {
    const suffixes = (EXTREMITY_MSK_COMPLAINT_INTEL.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    expect(suffixes).toEqual(expect.arrayContaining([...CANNOT_MISS_SUFFIXES]));
  });

  it("has no duplicate fragment keys", () => {
    const keys = flattenComplaintIntelligenceKeys(EXTREMITY_MSK_COMPLAINT_INTEL);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("excludes prohibited reviewed wording from HPI and exam keys", () => {
    const prohibited = ["reviewed", "ifdocumented", "considered", "ifindicated", "ifgiven"];
    for (const fragmentKey of EXTREMITY_MSK_COMPLAINT_INTEL.hpi ?? []) {
      const suffix = fragmentKeySuffix(fragmentKey).toLowerCase();
      for (const token of prohibited) {
        expect(suffix, `${fragmentKey} HPI key`).not.toContain(token);
      }
    }
    for (const fragmentKey of Object.values(EXTREMITY_MSK_COMPLAINT_INTEL.physicalExam ?? {}).flat()) {
      const suffix = fragmentKeySuffix(fragmentKey).toLowerCase();
      for (const token of prohibited) {
        expect(suffix, `${fragmentKey} exam key`).not.toContain(token);
      }
    }
  });

  it("has chart-ready EN i18n for every key", () => {
    const messages = messagesForBundle(EXTREMITY_MSK_COMPLAINT_INTEL, "en");
    const keys = flattenComplaintIntelligenceKeys(EXTREMITY_MSK_COMPLAINT_INTEL).map(fragmentKeySuffix);
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

  it("maintains EN/FR i18n key parity", () => {
    const enKeys = Object.keys(providerDocumentationExtremityMskComplaintIntelEn.extremityMskComplaint).sort();
    const frKeys = Object.keys(providerDocumentationExtremityMskComplaintIntelFr.extremityMskComplaint).sort();
    expect(frKeys).toEqual(enKeys);
  });

  it("has chart-ready FR i18n for every key", () => {
    const messages = messagesForBundle(EXTREMITY_MSK_COMPLAINT_INTEL, "fr");
    const keys = flattenComplaintIntelligenceKeys(EXTREMITY_MSK_COMPLAINT_INTEL).map(fragmentKeySuffix);
    for (const key of keys) {
      expect(messages[key], `missing FR i18n for ${key}`).toBeTruthy();
    }
  });

  it.each(EXTREMITY_MSK_TEMPLATE_IDS)("exposes MDM.1 workspace bindings for %s", (templateId) => {
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
