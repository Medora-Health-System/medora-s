import { describe, expect, it } from "vitest";
import { ALLERGIC_REACTION_RASH_COMPLAINT_INTEL, flattenComplaintIntelligenceKeys } from "./providerDocumentationComplaintIntelligence";
import {
  ABSCESS_SOFT_TISSUE_COMPLAINT_V1_INTEL,
  CELLULITIS_SKIN_INFECTION_COMPLAINT_V1_INTEL,
  RASH_SKIN_COMPLAINT_V1_INTEL,
  WOUND_INFECTION_COMPLAINT_V1_INTEL,
} from "./providerDocumentationInfectiousEntComplaintIntelligence19Mdm7";
import {
  assertTrackCCompliance,
  auditTrackCi18nMessageValues,
  collectTrackCViolations,
} from "./providerDocumentationComplaintIntelligenceTrackC";
import { complaintIntelligenceMdmChipBindingsForTemplate } from "./providerDocumentationComplaintIntelligenceWorkspaceChips";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "./providerDocumentationModel";
import { providerDocumentationRashSkinComplaintIntelEn } from "@/i18n/messages/providerDocumentationRashSkinComplaintIntel.en";
import { providerDocumentationRashSkinComplaintIntelFr } from "@/i18n/messages/providerDocumentationRashSkinComplaintIntel.fr";

export const RASH_SKIN_GOLD_STANDARD_BUNDLES = [
  ALLERGIC_REACTION_RASH_COMPLAINT_INTEL,
  RASH_SKIN_COMPLAINT_V1_INTEL,
  CELLULITIS_SKIN_INFECTION_COMPLAINT_V1_INTEL,
  ABSCESS_SOFT_TISSUE_COMPLAINT_V1_INTEL,
  WOUND_INFECTION_COMPLAINT_V1_INTEL,
] as const;

export const RASH_SKIN_COMPLAINT_INTEL_TEMPLATE_IDS = [
  "allergic_reaction_rash",
  "rash_skin_complaint_v1",
  "cellulitis_skin_infection_complaint_v1",
  "abscess_soft_tissue_complaint_v1",
  "wound_infection_complaint_v1",
] as const;

function fragmentKeySuffix(fragmentKey: string): string {
  return fragmentKey.split(".").pop() ?? "";
}

function messagesForBundle(bundle: (typeof RASH_SKIN_GOLD_STANDARD_BUNDLES)[number]) {
  const prefix = flattenComplaintIntelligenceKeys(bundle)[0]?.split(".").slice(0, -1).join(".") ?? "";
  const namespace = prefix.split(".").pop() ?? "";
  const namespaceObject =
    providerDocumentationRashSkinComplaintIntelEn[
      namespace as keyof typeof providerDocumentationRashSkinComplaintIntelEn
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

describe("providerDocumentationRashTrackC — MEDUI.ED.ME.2J-R", () => {
  it.each(RASH_SKIN_GOLD_STANDARD_BUNDLES)("passes Track C compliance", (bundle) => {
    expect(collectTrackCViolations(bundle)).toEqual([]);
    expect(() => assertTrackCCompliance(bundle)).not.toThrow();
  });

  it.each(RASH_SKIN_GOLD_STANDARD_BUNDLES)("has seven-section MDM gold standard", (bundle) => {
    expect(bundle.mdmWorkingAssessment?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmDifferentialSynthesis?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmDataReviewed?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmRiskStratification?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmClinicalRationale?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.clinicalImpression?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmPlanSummary?.length ?? 0).toBeGreaterThan(0);
  });

  it("covers cannot-miss diagnoses on rash dermatology bundle", () => {
    const suffixes = (RASH_SKIN_COMPLAINT_V1_INTEL.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    expect(suffixes).toEqual(
      expect.arrayContaining([
        "diffAnaphylaxis",
        "diffAngioedema",
        "diffStevensJohnsonSyndrome",
        "diffToxicEpidermalNecrolysis",
        "diffNecrotizingSoftTissueInfection",
        "diffMeningococcemia",
        "diffRockyMountainSpottedFever",
        "diffSepsis",
      ])
    );
  });

  it("covers required exam morphology chips on rash bundle", () => {
    const suffixes = Object.values(RASH_SKIN_COMPLAINT_V1_INTEL.physicalExam ?? {})
      .flat()
      .map(fragmentKeySuffix);
    expect(suffixes).toEqual(
      expect.arrayContaining([
        "examUrticarialRash",
        "examVesicularRash",
        "examMaculopapularRash",
        "examPurpura",
        "examPetechiae",
      ])
    );
  });

  it("covers clinical reasoning chips on rash bundle", () => {
    const suffixes = (RASH_SKIN_COMPLAINT_V1_INTEL.mdmClinicalRationale ?? []).map(fragmentKeySuffix);
    expect(suffixes).toEqual(
      expect.arrayContaining([
        "reasoningLowSuspicionNecrotizingInfection",
        "reasoningNoAirwayInvolvementIdentified",
        "reasoningNoMucosalInvolvementIdentified",
        "reasoningMostConsistentAllergicDermatitis",
      ])
    );
  });

  it.each(RASH_SKIN_GOLD_STANDARD_BUNDLES)("has no duplicate fragment keys", (bundle) => {
    const keys = flattenComplaintIntelligenceKeys(bundle);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(RASH_SKIN_GOLD_STANDARD_BUNDLES)("has chart-ready EN i18n for every key", (bundle) => {
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

  it.each(RASH_SKIN_COMPLAINT_INTEL_TEMPLATE_IDS)("exposes MDM.1 workspace bindings for %s", (templateId) => {
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
