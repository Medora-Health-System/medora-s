import { describe, expect, it } from "vitest";
import {
  SOB_COMPLAINT_INTEL,
  PEDIATRIC_ASTHMA_WHEEZING_COMPLAINT_INTEL,
} from "./providerDocumentationComplaintIntelligence";
import {
  ASTHMA_WHEEZING_COMPLAINT_V1_INTEL,
  COPD_EXACERBATION_COMPLAINT_V1_INTEL,
  PNEUMONIA_SYMPTOMS_COMPLAINT_V1_INTEL,
  HEMOPTYSIS_COMPLAINT_V1_INTEL,
} from "./providerDocumentationRespiratoryComplaintIntelligence19Mdm3";
import {
  assertTrackCCompliance,
  collectTrackCViolations,
} from "./providerDocumentationComplaintIntelligenceTrackC";
import { complaintIntelligenceMdmChipBindingsForTemplate } from "./providerDocumentationComplaintIntelligenceWorkspaceChips";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "./providerDocumentationModel";
import { providerDocumentationShortnessOfBreathComplaintIntelEn } from "@/i18n/messages/providerDocumentationShortnessOfBreathComplaintIntel.en";
import { flattenComplaintIntelligenceKeys } from "./providerDocumentationComplaintIntelligence";

export const SHORTNESS_OF_BREATH_GOLD_STANDARD_BUNDLES = [
  SOB_COMPLAINT_INTEL,
  PEDIATRIC_ASTHMA_WHEEZING_COMPLAINT_INTEL,
  ASTHMA_WHEEZING_COMPLAINT_V1_INTEL,
  COPD_EXACERBATION_COMPLAINT_V1_INTEL,
  PNEUMONIA_SYMPTOMS_COMPLAINT_V1_INTEL,
  HEMOPTYSIS_COMPLAINT_V1_INTEL,
] as const;

export const SHORTNESS_OF_BREATH_TEMPLATE_IDS = [
  "sob",
  "asthma_wheezing",
  "asthma_wheezing_complaint_v1",
  "copd_exacerbation_complaint_v1",
  "pneumonia_symptoms_complaint_v1",
  "hemoptysis_complaint_v1",
] as const;

function fragmentKeySuffix(fragmentKey: string): string {
  return fragmentKey.split(".").pop() ?? "";
}

function messagesForBundle(bundle: (typeof SHORTNESS_OF_BREATH_GOLD_STANDARD_BUNDLES)[number]) {
  const prefix = flattenComplaintIntelligenceKeys(bundle)[0]?.split(".").slice(0, -1).join(".") ?? "";
  const namespace = prefix.split(".").pop() ?? "";
  const namespaceObject =
    providerDocumentationShortnessOfBreathComplaintIntelEn[
      namespace as keyof typeof providerDocumentationShortnessOfBreathComplaintIntelEn
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

describe("providerDocumentationShortnessOfBreathTrackC — MEDUI.ED.ME.2E-R", () => {
  it("accounts for all discovered shortness of breath template IDs", () => {
    for (const templateId of SHORTNESS_OF_BREATH_TEMPLATE_IDS) {
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it("passes Track C compliance for all SOB bundles", () => {
    for (const bundle of SHORTNESS_OF_BREATH_GOLD_STANDARD_BUNDLES) {
      expect(collectTrackCViolations(bundle)).toEqual([]);
      expect(() => assertTrackCCompliance(bundle)).not.toThrow();
    }
  });

  it("has seven-section MDM gold standard on all SOB bundles", () => {
    for (const bundle of SHORTNESS_OF_BREATH_GOLD_STANDARD_BUNDLES) {
      expect(bundle.mdmWorkingAssessment?.length ?? 0).toBeGreaterThan(0);
      expect(bundle.mdmDifferentialSynthesis?.length ?? 0).toBeGreaterThan(0);
      expect(bundle.mdmDataReviewed?.length ?? 0).toBeGreaterThan(0);
      expect(bundle.mdmRiskStratification?.length ?? 0).toBeGreaterThan(0);
      expect(bundle.mdmClinicalRationale?.length ?? 0).toBeGreaterThan(0);
      expect(bundle.clinicalImpression?.length ?? 0).toBeGreaterThan(0);
      expect(bundle.mdmPlanSummary?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("excludes prohibited reviewed wording from HPI and exam keys", () => {
    const prohibited = ["reviewed", "ifdocumented", "considered", "ifindicated", "ifgiven"];
    for (const bundle of SHORTNESS_OF_BREATH_GOLD_STANDARD_BUNDLES) {
      for (const fragmentKey of bundle.hpi ?? []) {
        const suffix = fragmentKeySuffix(fragmentKey).toLowerCase();
        for (const token of prohibited) {
          expect(suffix, `${fragmentKey} HPI key`).not.toContain(token);
        }
      }
      for (const fragmentKey of Object.values(bundle.physicalExam ?? {}).flat()) {
        const suffix = fragmentKeySuffix(fragmentKey).toLowerCase();
        for (const token of prohibited) {
          expect(suffix, `${fragmentKey} exam key`).not.toContain(token);
        }
      }
    }
  });

  it("covers cannot-miss diagnoses on adult bundle", () => {
    const suffixes = (SOB_COMPLAINT_INTEL.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    expect(suffixes).toEqual(
      expect.arrayContaining([
        "diffRespiratoryFailure",
        "diffMassivePulmonaryEmbolism",
        "diffTensionPneumothorax",
        "diffSepsis",
        "diffAnaphylaxis",
        "diffAcutePulmonaryEdema",
      ])
    );
  });

  it("preserves pediatric-specific differential coverage", () => {
    const suffixes = (PEDIATRIC_ASTHMA_WHEEZING_COMPLAINT_INTEL.mdmDifferentialSynthesis ?? []).map(
      fragmentKeySuffix
    );
    expect(suffixes).toContain("diffBronchiolitis");
    expect(suffixes).toContain("diffForeignBodyAspiration");
  });

  it("exposes MDM.1 workspace bindings for sob", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "sob") ?? null;
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

  it("has chart-ready i18n for every adult intel fragment", () => {
    const messages = messagesForBundle(SOB_COMPLAINT_INTEL);
    expect(Object.keys(messages).length).toBe(flattenComplaintIntelligenceKeys(SOB_COMPLAINT_INTEL).length);
    expect(messages.hpiShortnessOfBreathBeganToday).toBe("shortness of breath began today");
    expect(messages.hpiSuddenOnsetDyspnea).toBeUndefined();
    expect(messages.mdmPeConsidered).toBeUndefined();
  });
});
