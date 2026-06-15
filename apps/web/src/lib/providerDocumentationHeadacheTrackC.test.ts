import { describe, expect, it } from "vitest";
import {
  flattenComplaintIntelligenceKeys,
  HEADACHE_COMPLAINT_INTEL,
} from "./providerDocumentationComplaintIntelligence";
import { MIGRAINE_HEADACHE_COMPLAINT_V1_INTEL } from "./providerDocumentationNeuroExpansionComplaintIntelligence19Mdm9";
import {
  assertTrackCCompliance,
  collectTrackCViolations,
} from "./providerDocumentationComplaintIntelligenceTrackC";
import { complaintIntelligenceMdmChipBindingsForTemplate } from "./providerDocumentationComplaintIntelligenceWorkspaceChips";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "./providerDocumentationModel";
import { providerDocumentationHeadacheComplaintIntelEn } from "@/i18n/messages/providerDocumentationHeadacheComplaintIntel.en";

export const HEADACHE_GOLD_STANDARD_BUNDLES = [
  HEADACHE_COMPLAINT_INTEL,
  MIGRAINE_HEADACHE_COMPLAINT_V1_INTEL,
] as const;

export const HEADACHE_TEMPLATE_IDS = ["headache", "migraine_headache_complaint_v1"] as const;

function fragmentKeySuffix(fragmentKey: string): string {
  return fragmentKey.split(".").pop() ?? "";
}

function messagesForBundle(bundle: (typeof HEADACHE_GOLD_STANDARD_BUNDLES)[number]) {
  const prefix = flattenComplaintIntelligenceKeys(bundle)[0]?.split(".").slice(0, -1).join(".") ?? "";
  const namespace = prefix.split(".").pop() ?? "";
  const namespaceObject =
    providerDocumentationHeadacheComplaintIntelEn[
      namespace as keyof typeof providerDocumentationHeadacheComplaintIntelEn
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

describe("providerDocumentationHeadacheTrackC — MEDUI.ED.ME.2K-R", () => {
  it("accounts for all discovered headache template IDs", () => {
    for (const templateId of HEADACHE_TEMPLATE_IDS) {
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it.each(HEADACHE_GOLD_STANDARD_BUNDLES)("passes Track C compliance", (bundle) => {
    expect(collectTrackCViolations(bundle)).toEqual([]);
    expect(() => assertTrackCCompliance(bundle)).not.toThrow();
  });

  it.each(HEADACHE_GOLD_STANDARD_BUNDLES)("has seven-section MDM gold standard", (bundle) => {
    expect(bundle.mdmWorkingAssessment?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmDifferentialSynthesis?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmDataReviewed?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmRiskStratification?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmClinicalRationale?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.clinicalImpression?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmPlanSummary?.length ?? 0).toBeGreaterThan(0);
  });

  it("excludes prohibited reviewed wording from HPI and exam keys on headache bundle", () => {
    const prohibited = ["reviewed", "ifdocumented", "considered", "ifindicated", "ifgiven"];
    for (const fragmentKey of HEADACHE_COMPLAINT_INTEL.hpi ?? []) {
      const suffix = fragmentKeySuffix(fragmentKey).toLowerCase();
      for (const token of prohibited) {
        expect(suffix, `${fragmentKey} HPI key`).not.toContain(token);
      }
    }
    for (const fragmentKey of Object.values(HEADACHE_COMPLAINT_INTEL.physicalExam ?? {}).flat()) {
      const suffix = fragmentKeySuffix(fragmentKey).toLowerCase();
      for (const token of prohibited) {
        expect(suffix, `${fragmentKey} exam key`).not.toContain(token);
      }
    }
  });

  it("covers cannot-miss diagnoses on headache bundle", () => {
    const suffixes = (HEADACHE_COMPLAINT_INTEL.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    expect(suffixes).toEqual(
      expect.arrayContaining([
        "diffSubarachnoidHemorrhage",
        "diffIntracranialHemorrhage",
        "diffMeningitis",
        "diffEncephalitis",
        "diffBrainMass",
        "diffCerebralVenousSinusThrombosis",
        "diffAcuteAngleClosureGlaucoma",
      ])
    );
  });

  it("covers common and serious differentials", () => {
    const suffixes = (HEADACHE_COMPLAINT_INTEL.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    expect(suffixes).toEqual(
      expect.arrayContaining([
        "diffMigraine",
        "diffTensionHeadache",
        "diffClusterHeadache",
        "diffSinusHeadache",
        "diffMedicationOveruseHeadache",
        "diffHypertensiveHeadache",
        "diffPostTraumaticHeadache",
        "diffTemporalArteritis",
      ])
    );
  });

  it.each(HEADACHE_TEMPLATE_IDS)("exposes MDM.1 workspace bindings for %s", (templateId) => {
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

  it.each(HEADACHE_GOLD_STANDARD_BUNDLES)("has chart-ready i18n for every intel fragment", (bundle) => {
    const messages = messagesForBundle(bundle);
    expect(Object.keys(messages).length).toBe(flattenComplaintIntelligenceKeys(bundle).length);
    expect(messages.hpiTraumaReviewed).toBeUndefined();
    expect(messages.mdmSahConsidered).toBeUndefined();
    expect(messages.hpiHeadacheBeganToday).toBe("headache began today");
  });
});
