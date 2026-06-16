import { describe, expect, it } from "vitest";
import { flattenComplaintIntelligenceKeys } from "./providerDocumentationComplaintIntelligence";
import { URINARY_RETENTION_COMPLAINT_V1_INTEL } from "./providerDocumentationGuRenalComplaintIntelligence19Mdm5";
import {
  assertTrackCCompliance,
  auditTrackCi18nMessageValues,
  collectTrackCViolations,
} from "./providerDocumentationComplaintIntelligenceTrackC";
import { complaintIntelligenceMdmChipBindingsForTemplate } from "./providerDocumentationComplaintIntelligenceWorkspaceChips";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "./providerDocumentationModel";
import { providerDocumentationUrinaryRetentionComplaintIntelEn } from "@/i18n/messages/providerDocumentationUrinaryRetentionComplaintIntel.en";

export const URINARY_RETENTION_GOLD_STANDARD_BUNDLES = [URINARY_RETENTION_COMPLAINT_V1_INTEL] as const;

export const URINARY_RETENTION_COMPLAINT_INTEL_TEMPLATE_IDS = ["urinary_retention_complaint_v1"] as const;

function fragmentKeySuffix(fragmentKey: string): string {
  return fragmentKey.split(".").pop() ?? "";
}

function messagesForBundle(bundle: (typeof URINARY_RETENTION_GOLD_STANDARD_BUNDLES)[number]) {
  const prefix = flattenComplaintIntelligenceKeys(bundle)[0]?.split(".").slice(0, -1).join(".") ?? "";
  const namespace = prefix.split(".").pop() ?? "";
  const namespaceObject =
    providerDocumentationUrinaryRetentionComplaintIntelEn[
      namespace as keyof typeof providerDocumentationUrinaryRetentionComplaintIntelEn
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

describe("providerDocumentationUrinaryRetentionTrackC — MEDUI.ED.ME.2PA-R", () => {
  it("passes Track C compliance", () => {
    expect(collectTrackCViolations(URINARY_RETENTION_COMPLAINT_V1_INTEL)).toEqual([]);
    expect(() => assertTrackCCompliance(URINARY_RETENTION_COMPLAINT_V1_INTEL)).not.toThrow();
  });

  it("has seven-section MDM gold standard", () => {
    const bundle = URINARY_RETENTION_COMPLAINT_V1_INTEL;
    expect(bundle.mdmWorkingAssessment?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmDifferentialSynthesis?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmDataReviewed?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmRiskStratification?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmClinicalRationale?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.clinicalImpression?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmPlanSummary?.length ?? 0).toBeGreaterThan(0);
  });

  it("covers cannot-miss diagnoses", () => {
    const suffixes = (URINARY_RETENTION_COMPLAINT_V1_INTEL.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    expect(suffixes).toEqual(
      expect.arrayContaining([
        "diffCaudaEquinaSyndrome",
        "diffSpinalCordCompression",
        "diffUrosepsis",
        "diffAcuteKidneyInjury",
      ])
    );
  });

  it("covers bladder distention and neuro exam chips", () => {
    const suffixes = Object.values(URINARY_RETENTION_COMPLAINT_V1_INTEL.physicalExam ?? {})
      .flat()
      .map(fragmentKeySuffix);
    expect(suffixes).toEqual(
      expect.arrayContaining([
        "examBladderDistentionPresent",
        "examSuprapubicTenderness",
        "examDecreasedPerinealSensation",
        "examNormalLowerExtremityStrength",
      ])
    );
  });

  it("has no duplicate fragment keys", () => {
    const keys = flattenComplaintIntelligenceKeys(URINARY_RETENTION_COMPLAINT_V1_INTEL);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("has chart-ready EN i18n for every key", () => {
    const messages = messagesForBundle(URINARY_RETENTION_COMPLAINT_V1_INTEL);
    const keys = flattenComplaintIntelligenceKeys(URINARY_RETENTION_COMPLAINT_V1_INTEL).map(fragmentKeySuffix);
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

  it("does not use prohibited HPI or exam key suffixes", () => {
    const hpiKeys = (URINARY_RETENTION_COMPLAINT_V1_INTEL.hpi ?? []).map(fragmentKeySuffix);
    const examKeys = Object.values(URINARY_RETENTION_COMPLAINT_V1_INTEL.physicalExam ?? {})
      .flat()
      .map(fragmentKeySuffix);
    for (const key of hpiKeys) {
      expect(key).not.toMatch(/Reviewed|ReviewCompleted|HistoryObtained|AssessmentCompleted|IfDocumented|IfIndicated|IfGiven|Considered/i);
    }
    for (const key of examKeys) {
      expect(key).not.toMatch(/Reviewed|IfDocumented|IfPerformed|AssessmentCompleted/i);
    }
  });

  it("exposes MDM.1 workspace bindings for urinary_retention_complaint_v1", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "urinary_retention_complaint_v1") ?? null;
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
