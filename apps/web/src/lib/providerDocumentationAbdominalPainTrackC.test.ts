import { describe, expect, it } from "vitest";
import {
  ABDOMINAL_COMPLAINT_INTEL,
  PEDIATRIC_ABDOMINAL_PAIN_COMPLAINT_INTEL,
} from "./providerDocumentationComplaintIntelligence";
import { ABDOMINAL_PAIN_COMPLAINT_V1_INTEL } from "./providerDocumentationGiComplaintIntelligence19Mdm2";
import {
  assertTrackCCompliance,
  collectTrackCViolations,
} from "./providerDocumentationComplaintIntelligenceTrackC";
import { complaintIntelligenceMdmChipBindingsForTemplate } from "./providerDocumentationComplaintIntelligenceWorkspaceChips";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "./providerDocumentationModel";
import { providerDocumentationAbdominalPainComplaintIntelEn } from "@/i18n/messages/providerDocumentationAbdominalPainComplaintIntel.en";
import { flattenComplaintIntelligenceKeys } from "./providerDocumentationComplaintIntelligence";

export const ABDOMINAL_PAIN_GOLD_STANDARD_BUNDLES = [
  ABDOMINAL_COMPLAINT_INTEL,
  PEDIATRIC_ABDOMINAL_PAIN_COMPLAINT_INTEL,
  ABDOMINAL_PAIN_COMPLAINT_V1_INTEL,
] as const;

export const ABDOMINAL_PAIN_TEMPLATE_IDS = [
  "abdominal_pain",
  "abdominal_pain_pediatric",
  "abdominal_pain_complaint_v1",
] as const;

function fragmentKeySuffix(fragmentKey: string): string {
  return fragmentKey.split(".").pop() ?? "";
}

function messagesForBundle(bundle: (typeof ABDOMINAL_PAIN_GOLD_STANDARD_BUNDLES)[number]) {
  const prefix = flattenComplaintIntelligenceKeys(bundle)[0]?.split(".").slice(0, -1).join(".") ?? "";
  const namespace = prefix.split(".").pop() ?? "";
  const namespaceObject =
    providerDocumentationAbdominalPainComplaintIntelEn[
      namespace as keyof typeof providerDocumentationAbdominalPainComplaintIntelEn
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

describe("providerDocumentationAbdominalPainTrackC — MEDUI.ED.ME.2D-R", () => {
  it("accounts for all discovered abdominal pain template IDs", () => {
    for (const templateId of ABDOMINAL_PAIN_TEMPLATE_IDS) {
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it("passes Track C compliance for all abdominal pain bundles", () => {
    for (const bundle of ABDOMINAL_PAIN_GOLD_STANDARD_BUNDLES) {
      expect(collectTrackCViolations(bundle)).toEqual([]);
      expect(() => assertTrackCCompliance(bundle)).not.toThrow();
    }
  });

  it("has seven-section MDM gold standard on all abdominal pain bundles", () => {
    for (const bundle of ABDOMINAL_PAIN_GOLD_STANDARD_BUNDLES) {
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
    for (const bundle of ABDOMINAL_PAIN_GOLD_STANDARD_BUNDLES) {
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
    const suffixes = (ABDOMINAL_COMPLAINT_INTEL.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    expect(suffixes).toEqual(
      expect.arrayContaining([
        "diffPerforatedViscus",
        "diffMesentericIschemia",
        "diffAbdominalAorticAneurysm",
        "diffSepsis",
        "diffBowelObstruction",
        "diffAppendicitis",
        "diffEctopicPregnancy",
        "diffOvarianTorsion",
      ])
    );
  });

  it("preserves pediatric-specific differential coverage", () => {
    const suffixes = (PEDIATRIC_ABDOMINAL_PAIN_COMPLAINT_INTEL.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    expect(suffixes).toContain("diffTesticularTorsion");
    expect(suffixes).toContain("diffIntussusception");
  });

  it("preserves female/GU overlap on adult bundle", () => {
    const hpi = ABDOMINAL_COMPLAINT_INTEL.hpi ?? [];
    expect(hpi.some((key) => key.endsWith(".hpiUrinarySymptoms"))).toBe(true);
    expect(hpi.some((key) => key.endsWith(".hpiVaginalBleeding"))).toBe(true);
    expect(hpi.some((key) => key.endsWith(".hpiPregnancyConcern"))).toBe(true);
    const exam = Object.values(ABDOMINAL_COMPLAINT_INTEL.physicalExam ?? {}).flat();
    expect(exam.some((key) => key.endsWith(".examCvaTendernessPresent"))).toBe(true);
    expect(exam.some((key) => key.endsWith(".examPelvicExamDeferred"))).toBe(true);
  });

  it("exposes MDM.1 workspace bindings for abdominal_pain", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "abdominal_pain") ?? null;
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
    const messages = messagesForBundle(ABDOMINAL_COMPLAINT_INTEL);
    expect(Object.keys(messages).length).toBe(flattenComplaintIntelligenceKeys(ABDOMINAL_COMPLAINT_INTEL).length);
    expect(messages.hpiBeganToday).toBe("began today");
    expect(messages.hpiRightLowerQuadrantPain).toBe("right lower quadrant pain");
    expect(messages.hpiPainLocationReviewed).toBeUndefined();
  });
});
