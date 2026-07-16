import { describe, expect, it } from "vitest";
import {
  ASSAULT_TRAUMA_COMPLAINT_INTEL,
  BACK_PAIN_TRAUMA_COMPLAINT_INTEL,
  BURN_INJURY_COMPLAINT_INTEL,
  CRUSH_INJURY_COMPLAINT_INTEL,
  FALL_COMPLAINT_INTEL,
  FRACTURE_CONCERN_COMPLAINT_INTEL,
  HEAD_INJURY_COMPLAINT_INTEL,
  LACERATION_COMPLAINT_INTEL,
  MVC_COLLISION_COMPLAINT_INTEL,
  NECK_PAIN_TRAUMA_COMPLAINT_INTEL,
  PEDIATRIC_TRAUMA_COMPLAINT_INTEL,
  PENETRATING_INJURY_COMPLAINT_INTEL,
  flattenComplaintIntelligenceKeys,
} from "./providerDocumentationComplaintIntelligence";
import {
  FALL_TRAUMA_COMPLAINT_V1_INTEL,
  LACERATION_SOFT_TISSUE_COMPLAINT_V1_INTEL,
  MINOR_HEAD_INJURY_COMPLAINT_V1_INTEL,
  MSK_TRAUMA_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
} from "./providerDocumentationMskTraumaComplaintIntelligence19Mdm6";
import { CONCUSSION_FOLLOWUP_COMPLAINT_V1_INTEL } from "./providerDocumentationNeuroExpansionComplaintIntelligence19Mdm9";
import { TRAUMA_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationTraumaGovernance";
import {
  assertTrackCCompliance,
  auditTrackCi18nMessageValues,
  collectTrackCViolations,
} from "./providerDocumentationComplaintIntelligenceTrackC";
import { complaintIntelligenceMdmChipBindingsForTemplate } from "./providerDocumentationComplaintIntelligenceWorkspaceChips";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "./providerDocumentationModel";
import { providerDocumentationTraumaInjuryComplaintIntelEn } from "@/i18n/messages/providerDocumentationTraumaInjuryComplaintIntel.en";

export const TRAUMA_INJURY_GOLD_STANDARD_BUNDLES = [
  FALL_COMPLAINT_INTEL,
  HEAD_INJURY_COMPLAINT_INTEL,
  LACERATION_COMPLAINT_INTEL,
  FRACTURE_CONCERN_COMPLAINT_INTEL,
  MVC_COLLISION_COMPLAINT_INTEL,
  ASSAULT_TRAUMA_COMPLAINT_INTEL,
  NECK_PAIN_TRAUMA_COMPLAINT_INTEL,
  BACK_PAIN_TRAUMA_COMPLAINT_INTEL,
  CRUSH_INJURY_COMPLAINT_INTEL,
  PENETRATING_INJURY_COMPLAINT_INTEL,
  BURN_INJURY_COMPLAINT_INTEL,
  PEDIATRIC_TRAUMA_COMPLAINT_INTEL,
  ...Object.values(MSK_TRAUMA_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID),
  CONCUSSION_FOLLOWUP_COMPLAINT_V1_INTEL,
] as const;

export const TRAUMA_INJURY_COMPLAINT_INTEL_TEMPLATE_IDS = [...TRAUMA_GOVERNED_TEMPLATE_IDS] as const;

const CANNOT_MISS_SUFFIXES = [
  "diffSubduralHematoma",
  "diffEpiduralHematoma",
  "diffSubarachnoidHemorrhage",
  "diffCervicalSpineFracture",
  "diffSpinalCordInjury",
  "diffCompartmentSyndrome",
  "diffOccultFracture",
  "diffSolidOrganInjury",
] as const;

function fragmentKeySuffix(fragmentKey: string): string {
  return fragmentKey.split(".").pop() ?? "";
}

function messagesForBundle(bundle: (typeof TRAUMA_INJURY_GOLD_STANDARD_BUNDLES)[number]) {
  const prefix = flattenComplaintIntelligenceKeys(bundle)[0]?.split(".").slice(0, -1).join(".") ?? "";
  const namespace = prefix.split(".").pop() ?? "";
  const namespaceObject =
    providerDocumentationTraumaInjuryComplaintIntelEn[
      namespace as keyof typeof providerDocumentationTraumaInjuryComplaintIntelEn
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

describe("providerDocumentationTraumaInjuryTrackC — MEDUI.ED.ME.2N-R", () => {
  it("accounts for all governed trauma template IDs", () => {
    expect(TRAUMA_INJURY_COMPLAINT_INTEL_TEMPLATE_IDS).toHaveLength(40);
    for (const templateId of TRAUMA_INJURY_COMPLAINT_INTEL_TEMPLATE_IDS) {
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it.each(TRAUMA_INJURY_GOLD_STANDARD_BUNDLES)("passes Track C compliance", (bundle) => {
    expect(collectTrackCViolations(bundle)).toEqual([]);
    expect(() => assertTrackCCompliance(bundle)).not.toThrow();
  });

  it.each(TRAUMA_INJURY_GOLD_STANDARD_BUNDLES)("has seven-section MDM gold standard", (bundle) => {
    expect(bundle.mdmWorkingAssessment?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmDifferentialSynthesis?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmDataReviewed?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmRiskStratification?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmClinicalRationale?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.clinicalImpression?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmPlanSummary?.length ?? 0).toBeGreaterThan(0);
  });

  it.each(TRAUMA_INJURY_GOLD_STANDARD_BUNDLES)("covers cannot-miss diagnoses", (bundle) => {
    const suffixes = (bundle.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    expect(suffixes).toEqual(expect.arrayContaining([...CANNOT_MISS_SUFFIXES]));
  });

  it.each(TRAUMA_INJURY_GOLD_STANDARD_BUNDLES)("has no duplicate fragment keys", (bundle) => {
    const keys = flattenComplaintIntelligenceKeys(bundle);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(TRAUMA_INJURY_GOLD_STANDARD_BUNDLES)("has chart-ready EN i18n for every key", (bundle) => {
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

  it.each(TRAUMA_INJURY_GOLD_STANDARD_BUNDLES)("does not use prohibited HPI or exam key suffixes", (bundle) => {
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

  it.each(TRAUMA_INJURY_COMPLAINT_INTEL_TEMPLATE_IDS)("exposes MDM.1 workspace bindings for %s", (templateId) => {
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

  it("preserves governance sentinel keys for fall, head injury, MVC, fracture, and fall trauma v1", () => {
    expect(flattenComplaintIntelligenceKeys(FALL_COMPLAINT_INTEL)).toContain(
      "providerDocumentationComplaintIntel.fall.hpiMechanicalFall"
    );
    expect(flattenComplaintIntelligenceKeys(HEAD_INJURY_COMPLAINT_INTEL)).toContain(
      "providerDocumentationComplaintIntel.headInjury.diffConcussion"
    );
    expect(flattenComplaintIntelligenceKeys(MVC_COLLISION_COMPLAINT_INTEL)).toContain(
      "providerDocumentationComplaintIntel.mvcCollision.diffConcussion"
    );
    expect(flattenComplaintIntelligenceKeys(FRACTURE_CONCERN_COMPLAINT_INTEL)).toContain(
      "providerDocumentationComplaintIntel.fractureConcern.diffFracture"
    );
    expect(flattenComplaintIntelligenceKeys(FRACTURE_CONCERN_COMPLAINT_INTEL)).toContain(
      "providerDocumentationComplaintIntel.fractureConcern.mdmXrayReviewed"
    );
    expect(flattenComplaintIntelligenceKeys(FALL_TRAUMA_COMPLAINT_V1_INTEL)).toContain(
      "providerDocumentationComplaintIntel.fallTraumaComplaintV1.hpiFallMechanismHeight"
    );
    expect(flattenComplaintIntelligenceKeys(MINOR_HEAD_INJURY_COMPLAINT_V1_INTEL)).toContain(
      "providerDocumentationComplaintIntel.minorHeadInjuryComplaintV1.diffConcussion"
    );
    expect(flattenComplaintIntelligenceKeys(CONCUSSION_FOLLOWUP_COMPLAINT_V1_INTEL)).toContain(
      "providerDocumentationComplaintIntel.concussionFollowupComplaintV1.diffConcussion"
    );
    expect(flattenComplaintIntelligenceKeys(LACERATION_SOFT_TISSUE_COMPLAINT_V1_INTEL)).toBeDefined();
  });
});
