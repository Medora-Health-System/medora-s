import { describe, expect, it } from "vitest";
import { HEMATURIA_COMPLAINT_V1_INTEL, flattenComplaintIntelligenceKeys } from "./providerDocumentationComplaintIntelligence";
import {
  assertTrackCCompliance,
  auditTrackCi18nMessageValues,
  collectTrackCViolations,
} from "./providerDocumentationComplaintIntelligenceTrackC";
import { complaintIntelligenceMdmChipBindingsForTemplate } from "./providerDocumentationComplaintIntelligenceWorkspaceChips";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "./providerDocumentationModel";
import { providerDocumentationHematuriaComplaintIntelEn } from "@/i18n/messages/providerDocumentationHematuriaComplaintIntel.en";

export const HEMATURIA_GOLD_STANDARD_BUNDLES = [HEMATURIA_COMPLAINT_V1_INTEL] as const;

export const HEMATURIA_COMPLAINT_INTEL_TEMPLATE_IDS = ["hematuria_complaint_v1"] as const;

function fragmentKeySuffix(fragmentKey: string): string {
  return fragmentKey.split(".").pop() ?? "";
}

function messagesForBundle(bundle: (typeof HEMATURIA_GOLD_STANDARD_BUNDLES)[number]) {
  const prefix = flattenComplaintIntelligenceKeys(bundle)[0]?.split(".").slice(0, -1).join(".") ?? "";
  const namespace = prefix.split(".").pop() ?? "";
  const namespaceObject =
    providerDocumentationHematuriaComplaintIntelEn[
      namespace as keyof typeof providerDocumentationHematuriaComplaintIntelEn
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

describe("providerDocumentationHematuriaTrackC — MEDUI.ED.ME.2PC-R", () => {
  it.each(HEMATURIA_GOLD_STANDARD_BUNDLES)("passes Track C compliance", (bundle) => {
    expect(collectTrackCViolations(bundle)).toEqual([]);
    expect(() => assertTrackCCompliance(bundle)).not.toThrow();
  });

  it.each(HEMATURIA_GOLD_STANDARD_BUNDLES)("has seven-section MDM gold standard", (bundle) => {
    expect(bundle.mdmWorkingAssessment?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmDifferentialSynthesis?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmDataReviewed?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmRiskStratification?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmClinicalRationale?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.clinicalImpression?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmPlanSummary?.length ?? 0).toBeGreaterThan(0);
  });

  it.each(HEMATURIA_GOLD_STANDARD_BUNDLES)("covers cannot-miss diagnoses", (bundle) => {
    const suffixes = (bundle.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    expect(suffixes).toEqual(
      expect.arrayContaining([
        "diffBladderCancer",
        "diffRenalCellCarcinoma",
        "diffInfectedObstructingStone",
        "diffUrinaryRetentionClotObstruction",
        "diffUrosepsis",
        "diffAcuteKidneyInjury",
        "diffObstructiveUropathy",
        "diffRenalAbscess",
      ])
    );
  });

  it.each(HEMATURIA_GOLD_STANDARD_BUNDLES)("has no duplicate fragment keys", (bundle) => {
    const keys = flattenComplaintIntelligenceKeys(bundle);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(HEMATURIA_GOLD_STANDARD_BUNDLES)("has chart-ready EN i18n for every key", (bundle) => {
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

  it.each(HEMATURIA_GOLD_STANDARD_BUNDLES)("does not use prohibited HPI or exam key suffixes", (bundle) => {
    const hpiKeys = (bundle.hpi ?? []).map(fragmentKeySuffix);
    const examKeys = Object.values(bundle.physicalExam ?? {})
      .flat()
      .map(fragmentKeySuffix);
    for (const key of hpiKeys) {
      expect(key).not.toMatch(
        /Reviewed|ReviewCompleted|HistoryObtained|AssessmentCompleted|IfDocumented|IfIndicated|IfGiven|Considered/i
      );
    }
    for (const key of examKeys) {
      expect(key).not.toMatch(/Reviewed|IfDocumented|IfPerformed|AssessmentCompleted/i);
    }
  });

  it.each(HEMATURIA_COMPLAINT_INTEL_TEMPLATE_IDS)("exposes MDM.1 workspace bindings for %s", (templateId) => {
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
