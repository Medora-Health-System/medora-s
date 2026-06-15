import { describe, expect, it } from "vitest";
import { CHEST_PAIN_COMPLAINT_INTEL } from "./providerDocumentationComplaintIntelligence";
import {
  assertTrackCCompliance,
  collectTrackCViolations,
} from "./providerDocumentationComplaintIntelligenceTrackC";
import { complaintIntelligenceMdmChipBindingsForTemplate } from "./providerDocumentationComplaintIntelligenceWorkspaceChips";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "./providerDocumentationModel";
import { providerDocumentationChestPainComplaintIntelEn } from "@/i18n/messages/providerDocumentationChestPainComplaintIntel.en";
import { flattenComplaintIntelligenceKeys } from "./providerDocumentationComplaintIntelligence";

export const CHEST_PAIN_GOLD_STANDARD_BUNDLES = [CHEST_PAIN_COMPLAINT_INTEL] as const;

export const CHEST_PAIN_TEMPLATE_IDS = ["chest_pain"] as const;

function fragmentKeySuffix(fragmentKey: string): string {
  return fragmentKey.split(".").pop() ?? "";
}

function messagesForBundle(bundle: (typeof CHEST_PAIN_GOLD_STANDARD_BUNDLES)[number]) {
  const prefix = flattenComplaintIntelligenceKeys(bundle)[0]?.split(".").slice(0, -1).join(".") ?? "";
  const namespace = prefix.split(".").pop() ?? "";
  const namespaceObject =
    providerDocumentationChestPainComplaintIntelEn[
      namespace as keyof typeof providerDocumentationChestPainComplaintIntelEn
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

describe("providerDocumentationChestPainTrackC — MEDUI.ED.ME.2L-R", () => {
  it("accounts for all discovered chest pain template IDs", () => {
    for (const templateId of CHEST_PAIN_TEMPLATE_IDS) {
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it("passes Track C compliance for chest pain bundle", () => {
    expect(collectTrackCViolations(CHEST_PAIN_COMPLAINT_INTEL)).toEqual([]);
    expect(() => assertTrackCCompliance(CHEST_PAIN_COMPLAINT_INTEL)).not.toThrow();
  });

  it("has seven-section MDM gold standard on chest pain bundle", () => {
    expect(CHEST_PAIN_COMPLAINT_INTEL.mdmWorkingAssessment?.length ?? 0).toBeGreaterThan(0);
    expect(CHEST_PAIN_COMPLAINT_INTEL.mdmDifferentialSynthesis?.length ?? 0).toBeGreaterThan(0);
    expect(CHEST_PAIN_COMPLAINT_INTEL.mdmDataReviewed?.length ?? 0).toBeGreaterThan(0);
    expect(CHEST_PAIN_COMPLAINT_INTEL.mdmRiskStratification?.length ?? 0).toBeGreaterThan(0);
    expect(CHEST_PAIN_COMPLAINT_INTEL.mdmClinicalRationale?.length ?? 0).toBeGreaterThan(0);
    expect(CHEST_PAIN_COMPLAINT_INTEL.clinicalImpression?.length ?? 0).toBeGreaterThan(0);
    expect(CHEST_PAIN_COMPLAINT_INTEL.mdmPlanSummary?.length ?? 0).toBeGreaterThan(0);
  });

  it("excludes prohibited reviewed wording from HPI and exam keys", () => {
    const prohibited = ["reviewed", "ifdocumented", "considered", "ifindicated", "ifgiven"];
    for (const fragmentKey of CHEST_PAIN_COMPLAINT_INTEL.hpi ?? []) {
      const suffix = fragmentKeySuffix(fragmentKey).toLowerCase();
      for (const token of prohibited) {
        expect(suffix, `${fragmentKey} HPI key`).not.toContain(token);
      }
    }
    for (const fragmentKey of Object.values(CHEST_PAIN_COMPLAINT_INTEL.physicalExam ?? {}).flat()) {
      const suffix = fragmentKeySuffix(fragmentKey).toLowerCase();
      for (const token of prohibited) {
        expect(suffix, `${fragmentKey} exam key`).not.toContain(token);
      }
    }
  });

  it("covers cannot-miss diagnoses on chest pain bundle", () => {
    const suffixes = (CHEST_PAIN_COMPLAINT_INTEL.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    expect(suffixes).toEqual(
      expect.arrayContaining([
        "diffStemi",
        "diffNstemi",
        "diffAorticDissection",
        "diffTensionPneumothorax",
        "diffMassivePulmonaryEmbolism",
        "diffEsophagealRupture",
        "diffCardiacTamponade",
      ])
    );
  });

  it("covers common and serious differentials", () => {
    const suffixes = (CHEST_PAIN_COMPLAINT_INTEL.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    expect(suffixes).toEqual(
      expect.arrayContaining([
        "diffMusculoskeletalChestPain",
        "diffGerd",
        "diffAnxiety",
        "diffAcuteCoronarySyndrome",
        "diffPulmonaryEmbolism",
        "diffPericarditis",
        "diffMyocarditis",
      ])
    );
  });

  it("exposes MDM.1 workspace bindings for chest_pain", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "chest_pain") ?? null;
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

  it("has chart-ready i18n for every chest pain intel fragment", () => {
    const messages = messagesForBundle(CHEST_PAIN_COMPLAINT_INTEL);
    expect(Object.keys(messages).length).toBe(flattenComplaintIntelligenceKeys(CHEST_PAIN_COMPLAINT_INTEL).length);
    expect(messages.hpiChestPainBeganToday).toBe("chest pain began today");
    expect(messages.hpiExertional).toBeUndefined();
    expect(messages.mdmAcsConsidered).toBeUndefined();
  });
});
