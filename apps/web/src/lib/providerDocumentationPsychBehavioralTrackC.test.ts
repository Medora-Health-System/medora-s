import { describe, expect, it } from "vitest";
import { flattenComplaintIntelligenceKeys } from "./providerDocumentationComplaintIntelligence";
import {
  assertTrackCCompliance,
  auditTrackCi18nMessageValues,
  collectTrackCViolations,
} from "./providerDocumentationComplaintIntelligenceTrackC";
import { complaintIntelligenceMdmChipBindingsForTemplate } from "./providerDocumentationComplaintIntelligenceWorkspaceChips";
import {
  auditHumanDocumentationForFamilyTemplate,
  assertHumanDocumentationAuditPasses,
} from "./providerDocumentationHumanDocumentationAudit";
import {
  PSYCH_BEHAVIORAL_TEMPLATE_IDS,
  buildPsychiatricBehavioralComplaintIntel,
} from "./providerDocumentationPsychBehavioralComplaintIntelGoldStandard";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "./providerDocumentationModel";
import { providerDocumentationPsychBehavioralComplaintIntelEn } from "@/i18n/messages/providerDocumentationPsychBehavioralComplaintIntel.en";
import { providerDocumentationPsychBehavioralComplaintIntelFr } from "@/i18n/messages/providerDocumentationPsychBehavioralComplaintIntel.fr";

const psychFn = (key: string) => `providerDocumentationComplaintIntel.psychiatricBehavioral.${key}`;

const PSYCHIATRIC_BEHAVIORAL_COMPLAINT_INTEL = buildPsychiatricBehavioralComplaintIntel(psychFn);

export const PSYCH_BEHAVIORAL_GOLD_STANDARD_BUNDLES = [PSYCHIATRIC_BEHAVIORAL_COMPLAINT_INTEL] as const;

const CANNOT_MISS = [
  "diffImminentSuicideRisk",
  "diffHomicidalRisk",
  "diffAcutePsychosisUnsafeBehavior",
  "diffOverdoseToxicIngestion",
  "diffDelirium",
  "diffAlcoholWithdrawalSeizureRisk",
  "diffSerotoninSyndrome",
  "diffNeurolepticMalignantSyndrome",
  "diffHypoglycemia",
  "diffSepsis",
] as const;

const COMMON_SERIOUS = [
  "diffSuicidalIdeation",
  "diffHomicidalIdeation",
  "diffPsychosis",
  "diffMajorDepression",
  "diffAnxietyPanicReaction",
  "diffSubstanceIntoxication",
  "diffSubstanceWithdrawal",
  "diffMania",
  "diffMedicationNonadherence",
] as const;

function fragmentKeySuffix(fragmentKey: string): string {
  return fragmentKey.split(".").pop() ?? "";
}

function messagesForBundle(bundle: (typeof PSYCH_BEHAVIORAL_GOLD_STANDARD_BUNDLES)[number]) {
  const prefix = flattenComplaintIntelligenceKeys(bundle)[0]?.split(".").slice(0, -1).join(".") ?? "";
  const namespace = prefix.split(".").pop() ?? "";
  const namespaceObject =
    providerDocumentationPsychBehavioralComplaintIntelEn[
      namespace as keyof typeof providerDocumentationPsychBehavioralComplaintIntelEn
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

describe("providerDocumentationPsychBehavioralTrackC — MEDUI.ED.ME.2X-R", () => {
  it("accounts for all ME.2X-R template IDs", () => {
    for (const templateId of PSYCH_BEHAVIORAL_TEMPLATE_IDS) {
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it.each(PSYCH_BEHAVIORAL_GOLD_STANDARD_BUNDLES)("passes Track C compliance", (bundle) => {
    expect(collectTrackCViolations(bundle)).toEqual([]);
    expect(() => assertTrackCCompliance(bundle)).not.toThrow();
  });

  it.each(PSYCH_BEHAVIORAL_GOLD_STANDARD_BUNDLES)("has seven-section MDM gold standard", (bundle) => {
    expect(bundle.mdmWorkingAssessment?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmDifferentialSynthesis?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmDataReviewed?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmRiskStratification?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmClinicalRationale?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.clinicalImpression?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmPlanSummary?.length ?? 0).toBeGreaterThan(0);
  });

  it("covers cannot-miss and common/serious differentials", () => {
    const suffixes = (PSYCHIATRIC_BEHAVIORAL_COMPLAINT_INTEL.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    expect(suffixes).toEqual(expect.arrayContaining([...CANNOT_MISS]));
    expect(suffixes).toEqual(expect.arrayContaining([...COMMON_SERIOUS]));
  });

  it("excludes prohibited key tokens from HPI and exam", () => {
    const prohibited = ["reviewed", "ifdocumented", "considered", "ifindicated", "ifgiven", "assessed"];
    for (const fragmentKey of PSYCHIATRIC_BEHAVIORAL_COMPLAINT_INTEL.hpi ?? []) {
      const suffix = fragmentKeySuffix(fragmentKey).toLowerCase();
      for (const token of prohibited) {
        expect(suffix, `${fragmentKey} HPI key`).not.toContain(token);
      }
    }
    for (const fragmentKey of Object.values(PSYCHIATRIC_BEHAVIORAL_COMPLAINT_INTEL.physicalExam ?? {}).flat()) {
      const suffix = fragmentKeySuffix(fragmentKey).toLowerCase();
      for (const token of prohibited) {
        expect(suffix, `${fragmentKey} exam key`).not.toContain(token);
      }
    }
  });

  it.each(PSYCH_BEHAVIORAL_GOLD_STANDARD_BUNDLES)("has chart-ready EN i18n for every key", (bundle) => {
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
    expect(messages.hpiReportsSuicidalThoughts).toBe("reports suicidal thoughts");
    expect(messages.hpiDeniesCurrentSuicidalPlan).toBe("denies current plan");
    expect(messages.examCalmAndCooperative).toBe("calm and cooperative");
    expect(messages.examSpeechClear).toBe("speech clear");
    expect(messages.planSuicidePrecautionsInitiated).toBe("placed on suicide precautions");
    expect(messages.planBehavioralHealthConsulted).toBe("behavioral health consulted");
    expect(messages.dispReturnPsychiatricRedFlags).toBe(
      "return for suicidal thoughts, homicidal thoughts, hallucinations, worsening agitation, or inability to stay safe"
    );
  });

  it("passes human documentation audit for psychiatric_behavioral", () => {
    const violations = auditHumanDocumentationForFamilyTemplate(
      {
        phase: "MEDUI.ED.ME.2X-R",
        requiredSamplesPerTemplate: 20,
        templates: [
          {
            templateId: "psychiatric_behavioral",
            bundle: PSYCHIATRIC_BEHAVIORAL_COMPLAINT_INTEL,
            namespace: "psychiatricBehavioral",
          },
        ],
        messageSource: providerDocumentationPsychBehavioralComplaintIntelEn,
      },
      "psychiatric_behavioral"
    );
    expect(() => assertHumanDocumentationAuditPasses("psychiatric_behavioral", violations)).not.toThrow();
    expect(violations).toEqual([]);
  });

  it("maintains EN/FR i18n key parity for psychiatricBehavioral namespace", () => {
    const enKeys = Object.keys(providerDocumentationPsychBehavioralComplaintIntelEn.psychiatricBehavioral).sort();
    const frKeys = Object.keys(providerDocumentationPsychBehavioralComplaintIntelFr.psychiatricBehavioral).sort();
    expect(frKeys).toEqual(enKeys);
  });

  it.each(PSYCH_BEHAVIORAL_TEMPLATE_IDS)("exposes MDM.1 workspace bindings for %s", (templateId) => {
    const catalogTemplate = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId);
    expect(catalogTemplate).toBeTruthy();
    const template = {
      ...catalogTemplate!,
      complaintIntelligence: PSYCHIATRIC_BEHAVIORAL_COMPLAINT_INTEL,
    };
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

  it("reports ME.2X-R gold standard key count", () => {
    const keyCount = flattenComplaintIntelligenceKeys(PSYCHIATRIC_BEHAVIORAL_COMPLAINT_INTEL).length;
    expect(keyCount).toBeGreaterThanOrEqual(90);
    expect(keyCount).toBeLessThanOrEqual(160);
  });
});
