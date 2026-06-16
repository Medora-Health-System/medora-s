import { describe, expect, it } from "vitest";
import { DENTAL_PAIN_INFECTION_COMPLAINT_V1_INTEL } from "./providerDocumentationInfectiousEntComplaintIntelligence19Mdm7";
import {
  assertTrackCCompliance,
  auditTrackCi18nMessageValues,
  collectTrackCViolations,
} from "./providerDocumentationComplaintIntelligenceTrackC";
import { complaintIntelligenceMdmChipBindingsForTemplate } from "./providerDocumentationComplaintIntelligenceWorkspaceChips";
import { flattenComplaintIntelligenceKeys } from "./providerDocumentationComplaintIntelligence";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "./providerDocumentationModel";
import { providerDocumentationDentalOralComplaintIntelEn } from "@/i18n/messages/providerDocumentationDentalOralComplaintIntel.en";
import { providerDocumentationDentalOralComplaintIntelFr } from "@/i18n/messages/providerDocumentationDentalOralComplaintIntel.fr";

export const DENTAL_ORAL_GOLD_STANDARD_BUNDLES = [DENTAL_PAIN_INFECTION_COMPLAINT_V1_INTEL] as const;

export const DENTAL_ORAL_TEMPLATE_IDS = ["dental_pain_infection_complaint_v1"] as const;

const CANNOT_MISS_SUFFIXES = [
  "diffLudwigAngina",
  "diffDeepNeckSpaceInfection",
  "diffAirwayCompromise",
  "diffSepsis",
  "diffNecrotizingSoftTissueInfection",
  "diffMandibularOsteomyelitis",
  "diffFacialCellulitis",
  "diffDeepSpaceInfection",
] as const;

function fragmentKeySuffix(fragmentKey: string): string {
  return fragmentKey.split(".").pop() ?? "";
}

function messagesForBundle(
  bundle: (typeof DENTAL_ORAL_GOLD_STANDARD_BUNDLES)[number],
  locale: "en" | "fr"
) {
  const prefix = flattenComplaintIntelligenceKeys(bundle)[0]?.split(".").slice(0, -1).join(".") ?? "";
  const namespace = prefix.split(".").pop() ?? "";
  const namespaceObject =
    (locale === "en"
      ? providerDocumentationDentalOralComplaintIntelEn
      : providerDocumentationDentalOralComplaintIntelFr)[
      namespace as keyof typeof providerDocumentationDentalOralComplaintIntelEn
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

describe("providerDocumentationDentalOralTrackC — MEDUI.ED.ME.2Q-R", () => {
  it("accounts for all discovered dental/oral template IDs", () => {
    for (const templateId of DENTAL_ORAL_TEMPLATE_IDS) {
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it("passes Track C compliance for dental/oral bundle", () => {
    expect(collectTrackCViolations(DENTAL_PAIN_INFECTION_COMPLAINT_V1_INTEL)).toEqual([]);
    expect(() => assertTrackCCompliance(DENTAL_PAIN_INFECTION_COMPLAINT_V1_INTEL)).not.toThrow();
  });

  it("has seven-section MDM gold standard on dental/oral bundle", () => {
    expect(DENTAL_PAIN_INFECTION_COMPLAINT_V1_INTEL.mdmWorkingAssessment?.length ?? 0).toBeGreaterThan(0);
    expect(DENTAL_PAIN_INFECTION_COMPLAINT_V1_INTEL.mdmDifferentialSynthesis?.length ?? 0).toBeGreaterThan(0);
    expect(DENTAL_PAIN_INFECTION_COMPLAINT_V1_INTEL.mdmDataReviewed?.length ?? 0).toBeGreaterThan(0);
    expect(DENTAL_PAIN_INFECTION_COMPLAINT_V1_INTEL.mdmRiskStratification?.length ?? 0).toBeGreaterThan(0);
    expect(DENTAL_PAIN_INFECTION_COMPLAINT_V1_INTEL.mdmClinicalRationale?.length ?? 0).toBeGreaterThan(0);
    expect(DENTAL_PAIN_INFECTION_COMPLAINT_V1_INTEL.clinicalImpression?.length ?? 0).toBeGreaterThan(0);
    expect(DENTAL_PAIN_INFECTION_COMPLAINT_V1_INTEL.mdmPlanSummary?.length ?? 0).toBeGreaterThan(0);
  });

  it("covers dental/oral cannot-miss diagnoses", () => {
    const suffixes = (DENTAL_PAIN_INFECTION_COMPLAINT_V1_INTEL.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    expect(suffixes).toEqual(expect.arrayContaining([...CANNOT_MISS_SUFFIXES]));
  });

  it("has no duplicate fragment keys", () => {
    const keys = flattenComplaintIntelligenceKeys(DENTAL_PAIN_INFECTION_COMPLAINT_V1_INTEL);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("excludes prohibited reviewed wording from HPI and exam keys", () => {
    const prohibited = ["reviewed", "ifdocumented", "considered", "ifindicated", "ifgiven"];
    for (const fragmentKey of DENTAL_PAIN_INFECTION_COMPLAINT_V1_INTEL.hpi ?? []) {
      const suffix = fragmentKeySuffix(fragmentKey).toLowerCase();
      for (const token of prohibited) {
        expect(suffix, `${fragmentKey} HPI key`).not.toContain(token);
      }
    }
    for (const fragmentKey of Object.values(DENTAL_PAIN_INFECTION_COMPLAINT_V1_INTEL.physicalExam ?? {}).flat()) {
      const suffix = fragmentKeySuffix(fragmentKey).toLowerCase();
      for (const token of prohibited) {
        expect(suffix, `${fragmentKey} exam key`).not.toContain(token);
      }
    }
  });

  it("has chart-ready EN i18n for every key", () => {
    const messages = messagesForBundle(DENTAL_PAIN_INFECTION_COMPLAINT_V1_INTEL, "en");
    const keys = flattenComplaintIntelligenceKeys(DENTAL_PAIN_INFECTION_COMPLAINT_V1_INTEL).map(fragmentKeySuffix);
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
    const enKeys = Object.keys(providerDocumentationDentalOralComplaintIntelEn.dentalPainInfectionComplaintV1).sort();
    const frKeys = Object.keys(providerDocumentationDentalOralComplaintIntelFr.dentalPainInfectionComplaintV1).sort();
    expect(frKeys).toEqual(enKeys);
  });

  it("has chart-ready FR i18n for every key", () => {
    const messages = messagesForBundle(DENTAL_PAIN_INFECTION_COMPLAINT_V1_INTEL, "fr");
    const keys = flattenComplaintIntelligenceKeys(DENTAL_PAIN_INFECTION_COMPLAINT_V1_INTEL).map(fragmentKeySuffix);
    for (const key of keys) {
      expect(messages[key], `missing FR i18n for ${key}`).toBeTruthy();
    }
  });

  it.each(DENTAL_ORAL_TEMPLATE_IDS)("exposes MDM.1 workspace bindings for %s", (templateId) => {
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
