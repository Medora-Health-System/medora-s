import { describe, expect, it } from "vitest";
import { flattenComplaintIntelligenceKeys } from "./providerDocumentationComplaintIntelligence";
import {
  assertTrackCCompliance,
  auditTrackCi18nMessageValues,
  collectTrackCViolations,
} from "./providerDocumentationComplaintIntelligenceTrackC";
import {
  EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL,
  SINUS_SYMPTOMS_COMPLAINT_V1_INTEL,
  SORE_THROAT_INFECTIOUS_COMPLAINT_V1_INTEL,
  DEHYDRATION_VIRAL_ILLNESS_COMPLAINT_V1_INTEL,
} from "./providerDocumentationInfectiousEntComplaintIntelligence19Mdm7";
import { SORE_THROAT_COMPLAINT_V1_INTEL } from "./providerDocumentationRespiratoryComplaintIntelligence19Mdm3";
import { providerDocumentationInfectiousEntComplaintIntel19Mdm7En } from "@/i18n/messages/providerDocumentationInfectiousEntComplaintIntel19Mdm7.en";
import { providerDocumentationRespiratoryComplaintIntel19Mdm3En } from "@/i18n/messages/providerDocumentationRespiratoryComplaintIntel19Mdm3.en";
import { providerDocumentationInfectiousEntComplaintIntel19Mdm7Fr } from "@/i18n/messages/providerDocumentationInfectiousEntComplaintIntel19Mdm7.fr";
import { providerDocumentationRespiratoryComplaintIntel19Mdm3Fr } from "@/i18n/messages/providerDocumentationRespiratoryComplaintIntel19Mdm3.fr";
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

/** ME.2T-A — Track C gold-standard bundles (extend for future complaint families). */
export const TRACK_C_GOLD_STANDARD_COMPLAINT_BUNDLES: ProviderDocumentationComplaintIntelligence[] = [
  EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL,
  SINUS_SYMPTOMS_COMPLAINT_V1_INTEL,
  SORE_THROAT_COMPLAINT_V1_INTEL,
  SORE_THROAT_INFECTIOUS_COMPLAINT_V1_INTEL,
  DEHYDRATION_VIRAL_ILLNESS_COMPLAINT_V1_INTEL,
];

function fragmentKeySuffix(fragmentKey: string): string {
  const parts = fragmentKey.split(".");
  return parts[parts.length - 1] ?? "";
}

function assertNoKeySubstrings(keys: string[], prohibited: string[], label: string): void {
  for (const fragmentKey of keys) {
    const suffix = fragmentKeySuffix(fragmentKey).toLowerCase();
    for (const token of prohibited) {
      expect(suffix, `${label} key "${suffix}" must not contain "${token}"`).not.toContain(token);
    }
  }
}

function messagesForBundle(
  bundle: ProviderDocumentationComplaintIntelligence,
  namespaceMessages: Record<string, Record<string, string>>
): Record<string, string> {
  const prefix = flattenComplaintIntelligenceKeys(bundle)[0]?.split(".").slice(0, -1).join(".") ?? "";
  const namespace = prefix.split(".").pop() ?? "";
  const namespaceObject = namespaceMessages[namespace] ?? {};
  const out: Record<string, string> = {};
  for (const fragmentKey of flattenComplaintIntelligenceKeys(bundle)) {
    const key = fragmentKeySuffix(fragmentKey);
    if (namespaceObject[key]) out[key] = namespaceObject[key];
  }
  return out;
}

function dataReviewedMessages(bundle: ProviderDocumentationComplaintIntelligence, allMessages: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const fragmentKey of bundle.mdmDataReviewed ?? []) {
    const key = fragmentKeySuffix(fragmentKey);
    if (allMessages[key]) out[key] = allMessages[key];
  }
  return out;
}

function reassessmentMessages(bundle: ProviderDocumentationComplaintIntelligence, allMessages: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const fragmentKey of bundle.reassessment ?? []) {
    const key = fragmentKeySuffix(fragmentKey);
    if (allMessages[key]) out[key] = allMessages[key];
  }
  return out;
}

describe("providerDocumentationComplaintIntelligenceTrackC — MEDUI.ED.ME.2T-A", () => {
  it("passes Track C compliance for ME.2R, ME.2S, ME.2T, and ME.2U bundles", () => {
    for (const bundle of TRACK_C_GOLD_STANDARD_COMPLAINT_BUNDLES) {
      expect(collectTrackCViolations(bundle)).toEqual([]);
      expect(() => assertTrackCCompliance(bundle)).not.toThrow();
    }
  });

  it("rejects prohibited key tokens in HPI and exam sections", () => {
    const prohibited = ["reviewed", "ifdocumented", "considered"];
    for (const bundle of TRACK_C_GOLD_STANDARD_COMPLAINT_BUNDLES) {
      assertNoKeySubstrings(bundle.hpi ?? [], prohibited, "HPI");
      assertNoKeySubstrings(Object.values(bundle.physicalExam ?? {}).flat(), prohibited, "Exam");
    }
  });

  it("requires risk stratification, impression, and plan sections", () => {
    for (const bundle of TRACK_C_GOLD_STANDARD_COMPLAINT_BUNDLES) {
      expect(bundle.mdmRiskStratification?.length ?? 0).toBeGreaterThan(0);
      expect(bundle.clinicalImpression?.length ?? 0).toBeGreaterThan(0);
      expect(bundle.mdmPlanSummary?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("audits chart-ready English i18n for remediated namespaces", () => {
    const infectiousBundles = [
      { bundle: EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL, messages: providerDocumentationInfectiousEntComplaintIntel19Mdm7En },
      { bundle: SINUS_SYMPTOMS_COMPLAINT_V1_INTEL, messages: providerDocumentationInfectiousEntComplaintIntel19Mdm7En },
      { bundle: SORE_THROAT_INFECTIOUS_COMPLAINT_V1_INTEL, messages: providerDocumentationInfectiousEntComplaintIntel19Mdm7En },
      { bundle: DEHYDRATION_VIRAL_ILLNESS_COMPLAINT_V1_INTEL, messages: providerDocumentationInfectiousEntComplaintIntel19Mdm7En },
    ];
    const respiratoryBundles = [
      { bundle: SORE_THROAT_COMPLAINT_V1_INTEL, messages: providerDocumentationRespiratoryComplaintIntel19Mdm3En },
    ];

    for (const { bundle, messages } of [...infectiousBundles, ...respiratoryBundles]) {
      const chartMessages = messagesForBundle(bundle, messages);
      expect(Object.keys(chartMessages).length).toBe(flattenComplaintIntelligenceKeys(bundle).length);

      const hpiRosExamMdmMessages = { ...chartMessages };
      for (const key of [...(bundle.mdmDataReviewed ?? []), ...(bundle.reassessment ?? [])].map(fragmentKeySuffix)) {
        delete hpiRosExamMdmMessages[key];
      }
      expect(auditTrackCi18nMessageValues(hpiRosExamMdmMessages)).toEqual([]);
      expect(auditTrackCi18nMessageValues(dataReviewedMessages(bundle, chartMessages), { allowReviewLanguage: true })).toEqual([]);
      expect(auditTrackCi18nMessageValues(reassessmentMessages(bundle, chartMessages), { allowReviewLanguage: true })).toEqual([]);
    }
  });

  it("audits chart-ready French i18n for remediated namespaces", () => {
    const bundles = [
      { bundle: EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL, messages: providerDocumentationInfectiousEntComplaintIntel19Mdm7Fr },
      { bundle: SINUS_SYMPTOMS_COMPLAINT_V1_INTEL, messages: providerDocumentationInfectiousEntComplaintIntel19Mdm7Fr },
      { bundle: SORE_THROAT_INFECTIOUS_COMPLAINT_V1_INTEL, messages: providerDocumentationInfectiousEntComplaintIntel19Mdm7Fr },
      { bundle: DEHYDRATION_VIRAL_ILLNESS_COMPLAINT_V1_INTEL, messages: providerDocumentationInfectiousEntComplaintIntel19Mdm7Fr },
      { bundle: SORE_THROAT_COMPLAINT_V1_INTEL, messages: providerDocumentationRespiratoryComplaintIntel19Mdm3Fr },
    ];

    for (const { bundle, messages } of bundles) {
      const chartMessages = messagesForBundle(bundle, messages);
      const hpiRosExamMdmMessages = { ...chartMessages };
      for (const key of [...(bundle.mdmDataReviewed ?? []), ...(bundle.reassessment ?? [])].map(fragmentKeySuffix)) {
        delete hpiRosExamMdmMessages[key];
      }
      expect(auditTrackCi18nMessageValues(hpiRosExamMdmMessages)).toEqual([]);
    }
  });
});
