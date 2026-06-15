import { describe, expect, it } from "vitest";
import {
  COUGH_COMPLAINT_INTEL,
  flattenComplaintIntelligenceKeys,
  URI_RESPIRATORY_COMPLAINT_INTEL,
} from "./providerDocumentationComplaintIntelligence";
import {
  CHEST_CONGESTION_COMPLAINT_V1_INTEL,
  COUGH_COMPLAINT_V1_INTEL,
  FLU_LIKE_ILLNESS_COMPLAINT_V1_INTEL,
  URI_CONGESTION_COMPLAINT_V1_INTEL,
} from "./providerDocumentationRespiratoryComplaintIntelligence19Mdm3";
import {
  assertTrackCCompliance,
  collectTrackCViolations,
} from "./providerDocumentationComplaintIntelligenceTrackC";
import { complaintIntelligenceMdmChipBindingsForTemplate } from "./providerDocumentationComplaintIntelligenceWorkspaceChips";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "./providerDocumentationModel";
import { providerDocumentationCoughUriComplaintIntelEn } from "@/i18n/messages/providerDocumentationCoughUriComplaintIntel.en";

export const COUGH_URI_GOLD_STANDARD_BUNDLES = [
  COUGH_COMPLAINT_INTEL,
  URI_RESPIRATORY_COMPLAINT_INTEL,
  COUGH_COMPLAINT_V1_INTEL,
  URI_CONGESTION_COMPLAINT_V1_INTEL,
  CHEST_CONGESTION_COMPLAINT_V1_INTEL,
  FLU_LIKE_ILLNESS_COMPLAINT_V1_INTEL,
] as const;

export const COUGH_URI_TEMPLATE_IDS = [
  "cough",
  "adult_uri_respiratory",
  "uri_respiratory",
  "cough_complaint_v1",
  "uri_congestion_complaint_v1",
  "chest_congestion_complaint_v1",
  "flu_like_illness_complaint_v1",
] as const;

function fragmentKeySuffix(fragmentKey: string): string {
  return fragmentKey.split(".").pop() ?? "";
}

function messagesForBundle(bundle: (typeof COUGH_URI_GOLD_STANDARD_BUNDLES)[number]) {
  const prefix = flattenComplaintIntelligenceKeys(bundle)[0]?.split(".").slice(0, -1).join(".") ?? "";
  const namespace = prefix.split(".").pop() ?? "";
  const namespaceObject =
    providerDocumentationCoughUriComplaintIntelEn[
      namespace as keyof typeof providerDocumentationCoughUriComplaintIntelEn
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

describe("providerDocumentationCoughUriTrackC — MEDUI.ED.ME.2F-R", () => {
  it("accounts for all discovered cough/URI template IDs", () => {
    for (const templateId of COUGH_URI_TEMPLATE_IDS) {
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it.each(COUGH_URI_GOLD_STANDARD_BUNDLES)("passes Track C compliance", (bundle) => {
    expect(collectTrackCViolations(bundle)).toEqual([]);
    expect(() => assertTrackCCompliance(bundle)).not.toThrow();
  });

  it.each(COUGH_URI_GOLD_STANDARD_BUNDLES)("has seven-section MDM gold standard", (bundle) => {
    expect(bundle.mdmWorkingAssessment?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmDifferentialSynthesis?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmDataReviewed?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmRiskStratification?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmClinicalRationale?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.clinicalImpression?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmPlanSummary?.length ?? 0).toBeGreaterThan(0);
  });

  it("excludes prohibited reviewed wording from HPI and exam keys", () => {
    const prohibited = [
      "reviewed",
      "reviewcompleted",
      "historyobtained",
      "assessmentcompleted",
      "ifdocumented",
      "ifindicated",
      "ifgiven",
      "considered",
    ];
    for (const fragmentKey of COUGH_COMPLAINT_INTEL.hpi ?? []) {
      const suffix = fragmentKeySuffix(fragmentKey).toLowerCase();
      for (const token of prohibited) {
        expect(suffix, `${fragmentKey} HPI key`).not.toContain(token);
      }
    }
    for (const fragmentKey of Object.values(COUGH_COMPLAINT_INTEL.physicalExam ?? {}).flat()) {
      const suffix = fragmentKeySuffix(fragmentKey).toLowerCase();
      for (const token of prohibited) {
        expect(suffix, `${fragmentKey} exam key`).not.toContain(token);
      }
    }
  });

  it("covers cannot-miss diagnoses on cough/URI bundle", () => {
    const suffixes = (COUGH_COMPLAINT_INTEL.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    expect(suffixes).toEqual(
      expect.arrayContaining([
        "diffBacterialPneumonia",
        "diffSepsis",
        "diffRespiratoryFailure",
        "diffPulmonaryEmbolism",
      ])
    );
  });

  it("covers common and serious differentials", () => {
    const suffixes = (URI_RESPIRATORY_COMPLAINT_INTEL.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    expect(suffixes).toEqual(
      expect.arrayContaining([
        "diffViralUri",
        "diffAcuteBronchitis",
        "diffAllergicRhinitis",
        "diffSinusitis",
        "diffPneumonia",
        "diffInfluenza",
        "diffCovid19",
        "diffAsthmaExacerbation",
        "diffCopdExacerbation",
      ])
    );
  });

  it.each(COUGH_URI_TEMPLATE_IDS)("exposes MDM.1 workspace bindings for %s", (templateId) => {
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

  it.each(COUGH_URI_GOLD_STANDARD_BUNDLES)("has chart-ready i18n for every intel fragment", (bundle) => {
    const messages = messagesForBundle(bundle);
    expect(Object.keys(messages).length).toBe(flattenComplaintIntelligenceKeys(bundle).length);
    expect(messages.hpiDryCough).toBe("dry cough");
    expect(messages.examPosteriorPharyngealErythema).toBe("posterior pharyngeal erythema");
  });

  it("has no duplicate fragment keys within each bundle", () => {
    for (const bundle of COUGH_URI_GOLD_STANDARD_BUNDLES) {
      const keys = flattenComplaintIntelligenceKeys(bundle);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});
