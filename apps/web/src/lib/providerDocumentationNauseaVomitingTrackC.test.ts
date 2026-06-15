import { describe, expect, it } from "vitest";
import {
  ADULT_NAUSEA_VOMITING_COMPLAINT_INTEL,
  PEDIATRIC_VOMITING_DIARRHEA_COMPLAINT_INTEL,
} from "./providerDocumentationComplaintIntelligence";
import { NAUSEA_VOMITING_COMPLAINT_V1_INTEL } from "./providerDocumentationGiComplaintIntelligence19Mdm2";
import { NAUSEA_VOMITING_METABOLIC_COMPLAINT_V1_INTEL } from "./providerDocumentationEndocrineMetabolicComplaintIntelligence19Mdm8";
import {
  assertTrackCCompliance,
  collectTrackCViolations,
} from "./providerDocumentationComplaintIntelligenceTrackC";
import { complaintIntelligenceMdmChipBindingsForTemplate } from "./providerDocumentationComplaintIntelligenceWorkspaceChips";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "./providerDocumentationModel";
import { providerDocumentationNauseaVomitingComplaintIntelEn } from "@/i18n/messages/providerDocumentationNauseaVomitingComplaintIntel.en";
import { flattenComplaintIntelligenceKeys } from "./providerDocumentationComplaintIntelligence";

export const NAUSEA_VOMITING_GOLD_STANDARD_BUNDLES = [
  ADULT_NAUSEA_VOMITING_COMPLAINT_INTEL,
  PEDIATRIC_VOMITING_DIARRHEA_COMPLAINT_INTEL,
  NAUSEA_VOMITING_COMPLAINT_V1_INTEL,
  NAUSEA_VOMITING_METABOLIC_COMPLAINT_V1_INTEL,
] as const;

export const NAUSEA_VOMITING_TEMPLATE_IDS = [
  "nausea_vomiting",
  "adult_nausea_vomiting",
  "nausea_vomiting_complaint_v1",
  "nausea_vomiting_metabolic_complaint_v1",
] as const;

function fragmentKeySuffix(fragmentKey: string): string {
  return fragmentKey.split(".").pop() ?? "";
}

function messagesForBundle(bundle: (typeof NAUSEA_VOMITING_GOLD_STANDARD_BUNDLES)[number]) {
  const prefix = flattenComplaintIntelligenceKeys(bundle)[0]?.split(".").slice(0, -1).join(".") ?? "";
  const namespace = prefix.split(".").pop() ?? "";
  const namespaceObject = providerDocumentationNauseaVomitingComplaintIntelEn[namespace as keyof typeof providerDocumentationNauseaVomitingComplaintIntelEn] ?? {};
  const out: Record<string, string> = {};
  for (const fragmentKey of flattenComplaintIntelligenceKeys(bundle)) {
    const key = fragmentKeySuffix(fragmentKey);
    if (namespaceObject[key as keyof typeof namespaceObject]) {
      out[key] = namespaceObject[key as keyof typeof namespaceObject] as string;
    }
  }
  return out;
}

describe("providerDocumentationNauseaVomitingTrackC — MEDUI.ED.ME.2C-R", () => {
  it("accounts for all discovered nausea/vomiting template IDs", () => {
    for (const templateId of NAUSEA_VOMITING_TEMPLATE_IDS) {
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it("passes Track C compliance for all N/V bundles", () => {
    for (const bundle of NAUSEA_VOMITING_GOLD_STANDARD_BUNDLES) {
      expect(collectTrackCViolations(bundle)).toEqual([]);
      expect(() => assertTrackCCompliance(bundle)).not.toThrow();
    }
  });

  it("has seven-section MDM gold standard on all N/V bundles", () => {
    for (const bundle of NAUSEA_VOMITING_GOLD_STANDARD_BUNDLES) {
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
    for (const bundle of NAUSEA_VOMITING_GOLD_STANDARD_BUNDLES) {
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
    const suffixes = (ADULT_NAUSEA_VOMITING_COMPLAINT_INTEL.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    expect(suffixes).toEqual(
      expect.arrayContaining([
        "diffBowelObstruction",
        "diffAppendicitis",
        "diffDiabeticKetoacidosis",
        "diffIntracranialProcess",
        "diffSevereDehydration",
        "diffSepsis",
        "diffPregnancyComplication",
      ])
    );
  });

  it("keeps DKA coverage on metabolic variant", () => {
    const suffixes = (NAUSEA_VOMITING_METABOLIC_COMPLAINT_V1_INTEL.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    expect(suffixes).toContain("diffDiabeticKetoacidosis");
    expect(suffixes).toContain("diffElectrolyteAbnormality");
  });

  it("exposes MDM.1 workspace bindings for adult_nausea_vomiting", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "adult_nausea_vomiting") ?? null;
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
    const messages = messagesForBundle(ADULT_NAUSEA_VOMITING_COMPLAINT_INTEL);
    expect(Object.keys(messages).length).toBe(flattenComplaintIntelligenceKeys(ADULT_NAUSEA_VOMITING_COMPLAINT_INTEL).length);
    expect(messages.hpiBeganToday).toBe("began today");
    expect(messages.hpiMultipleEpisodesVomiting).toBe("multiple episodes of vomiting");
    expect(messages.hpiNauseaDurationReviewed).toBeUndefined();
  });
});
