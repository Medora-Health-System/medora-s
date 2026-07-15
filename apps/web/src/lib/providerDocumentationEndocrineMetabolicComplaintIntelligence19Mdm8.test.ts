import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  BACK_PAIN_COMPLAINT_V1_INTEL,
  DYSURIA_COMPLAINT_V1_INTEL,
  ENDOCRINE_METABOLIC_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  ENDOCRINE_METABOLIC_COMPLAINT_V1_TEMPLATE_IDS,
  FEVER_COMPLAINT_V1_INTEL,
  GI_COMPLAINT_V1_TEMPLATE_IDS,
  GU_RENAL_COMPLAINT_V1_TEMPLATE_IDS,
  HYPERGLYCEMIA_COMPLAINT_V1_INTEL,
  INFECTIOUS_ENT_COMPLAINT_V1_TEMPLATE_IDS,
  MSK_TRAUMA_COMPLAINT_V1_TEMPLATE_IDS,
  RESPIRATORY_COMPLAINT_V1_TEMPLATE_IDS,
  STROKE_SYMPTOMS_COMPLAINT_INTEL,
  COMPLAINT_INTEL_BY_TEMPLATE_ID,
  complaintIntelligenceHasDuplicateKeys,
  flattenComplaintIntelligenceKeys,
} from "./providerDocumentationComplaintIntelligence";
import {
  applyProviderDocumentationTemplate,
  emptyProviderDocumentationWorkspaceState,
  PROVIDER_DOCUMENTATION_TEMPLATES,
} from "./providerDocumentationModel";
import { PROVIDER_DOCUMENTATION_TEMPLATE_PICKER_SUBGROUP_LABEL_KEYS } from "./providerDocumentationTemplateCatalog";
import { buildMdmTemplateDropdownOptions } from "./providerDocumentationMdmTemplateCatalog";
import {
  COMPLAINT_INTELLIGENCE_UNSAFE_PHRASE_RULES,
  complaintIntelligenceTextViolations,
  scanComplaintIntelligenceBundleForUnsafePhrases,
} from "./providerDocumentationComplaintIntelligenceGovernance";
import { providerDocumentationEndocrineMetabolicComplaintIntel19Mdm8En } from "@/i18n/messages/providerDocumentationEndocrineMetabolicComplaintIntel19Mdm8.en";
import enMessages from "@/i18n/messages/en";
import frMessages from "@/i18n/messages/fr";

const ENDOCRINE_METABOLIC_BUNDLES = Object.values(ENDOCRINE_METABOLIC_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID);

const HIGH_RISK_DIABETES_TEMPLATE_IDS = [
  "hyperglycemia_complaint_v1",
  "hypoglycemia_complaint_v1",
  "diabetes_sick_day_complaint_v1",
  "insulin_medication_issue_complaint_v1",
  "nausea_vomiting_metabolic_complaint_v1",
] as const;

function resolveEndocrineMetabolicKey(key: string): string {
  const parts = key.split(".");
  const ns = parts[2];
  const field = parts[3];
  if (!ns || !field) return key;
  const nsRecord = (providerDocumentationEndocrineMetabolicComplaintIntel19Mdm8En as Record<
    string,
    Record<string, string>
  >)[ns];
  return nsRecord?.[field] ?? key;
}

function assertSectionCoverage(bundle: (typeof ENDOCRINE_METABOLIC_BUNDLES)[number]) {
  expect(bundle.hpi?.length).toBeGreaterThan(0);
  expect(bundle.rosImportantPositives?.length).toBeGreaterThan(0);
  expect(bundle.rosImportantNegatives?.length).toBeGreaterThan(0);
  expect(bundle.rosRedFlags?.length).toBeGreaterThan(0);
  expect(Object.values(bundle.physicalExam ?? {}).flat().length).toBeGreaterThan(0);
  expect(bundle.mdmDifferentialSynthesis?.length).toBeGreaterThan(0);
  expect(bundle.mdmDataReviewed?.length).toBeGreaterThan(0);
  expect(bundle.reassessment?.length).toBeGreaterThan(0);
  expect(bundle.followUpDisposition?.length).toBeGreaterThan(0);
}

describe("provider documentation endocrine / metabolic complaint intelligence (19MDM.8)", () => {
  it("registers all 10 endocrine/metabolic complaint_v1 templates", () => {
    expect(ENDOCRINE_METABOLIC_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(10);
    for (const id of ENDOCRINE_METABOLIC_COMPLAINT_V1_TEMPLATE_IDS) {
      expect(COMPLAINT_INTEL_BY_TEMPLATE_ID[id]).toBeDefined();
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === id)).toBe(true);
    }
  });

  it("places endocrine/metabolic templates in endocrine_metabolic picker subgroup with localized labels", () => {
    for (const id of ENDOCRINE_METABOLIC_COMPLAINT_V1_TEMPLATE_IDS) {
      const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === id);
      expect(template?.pickerSubgroupKey).toBe("endocrine_metabolic");
      expect(template?.majorGroup).toBe("ADULT");
    }
    expect(PROVIDER_DOCUMENTATION_TEMPLATE_PICKER_SUBGROUP_LABEL_KEYS.endocrine_metabolic).toBe(
      "providerDocumentationWorkspace.templateSubgroupEndocrineMetabolic"
    );
    expect(enMessages.providerDocumentationWorkspace.templateSubgroupEndocrineMetabolic).toBe(
      "Endocrine / Metabolic"
    );
    expect(frMessages.providerDocumentationWorkspace.templateSubgroupEndocrineMetabolic).toBe(
      "Endocrinien / métabolique"
    );
  });

  it("covers required sections on every endocrine/metabolic bundle", () => {
    for (const bundle of ENDOCRINE_METABOLIC_BUNDLES) {
      assertSectionCoverage(bundle);
    }
  });

  it("includes follow-up/consult prompts on high-risk diabetes/metabolic bundles", () => {
    for (const templateId of HIGH_RISK_DIABETES_TEMPLATE_IDS) {
      const bundle = ENDOCRINE_METABOLIC_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID[templateId];
      const consultOrFollowUp = [
        ...(bundle.mdmClinicalRationale ?? []),
        ...(bundle.followUpDisposition ?? []),
        ...(bundle.mdmAdmitObserveDischarge ?? []),
      ];
      expect(consultOrFollowUp.length).toBeGreaterThan(0);
    }
  });

  it("does not auto-insert complaint intelligence on endocrine/metabolic template apply", () => {
    for (const templateId of ENDOCRINE_METABOLIC_COMPLAINT_V1_TEMPLATE_IDS) {
      const next = applyProviderDocumentationTemplate({
        state: emptyProviderDocumentationWorkspaceState(),
        templateId,
        resolveFragment: (key) => key,
      });
      expect(JSON.stringify(next)).not.toContain("providerDocumentationComplaintIntel");
    }
  });

  it("blocks unsafe endocrine/metabolic certainty phrases in resolved copy", () => {
    const blockedSamples = [
      "DKA ruled out",
      "HHS ruled out",
      "hypoglycemia ruled out",
      "hyperglycemia ruled out",
      "thyroid storm ruled out",
      "adrenal crisis ruled out",
      "glucose normal",
      "blood sugar normal",
      "ketones negative",
      "anion gap normal",
      "electrolytes normal",
      "metabolic panel normal",
      "insulin not needed",
      "diabetes controlled",
      "diabetic emergency ruled out",
      "no diabetic emergency",
      "safe for discharge",
      "medically cleared",
      "patient stable",
      "symptoms resolved",
      "must discharge",
      "definitive diagnosis",
    ];
    for (const sample of blockedSamples) {
      expect(complaintIntelligenceTextViolations(sample).length).toBeGreaterThan(0);
    }
    for (const bundle of ENDOCRINE_METABOLIC_BUNDLES) {
      expect(scanComplaintIntelligenceBundleForUnsafePhrases(bundle, resolveEndocrineMetabolicKey)).toEqual([]);
    }
  });

  it("scanner includes endocrine/metabolic blocked phrase rules", () => {
    const ids = COMPLAINT_INTELLIGENCE_UNSAFE_PHRASE_RULES.map((rule) => rule.id);
    expect(ids).toContain("dka_ruled_out");
    expect(ids).toContain("ketones_negative");
    expect(ids).toContain("insulin_not_needed");
    expect(ids).toContain("diabetes_controlled");
    expect(ids).toContain("no_diabetic_emergency");
  });

  it("does not duplicate keys within an endocrine/metabolic bundle", () => {
    for (const bundle of ENDOCRINE_METABOLIC_BUNDLES) {
      expect(complaintIntelligenceHasDuplicateKeys(bundle)).toBe(false);
    }
  });

  it("leaves neuro, GI, respiratory, cardiac, GU, MSK, and infectious complaint templates unchanged", () => {
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.stroke_symptoms).toBe(STROKE_SYMPTOMS_COMPLAINT_INTEL);
    expect(GI_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(9);
    expect(RESPIRATORY_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(9);
    expect(GU_RENAL_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(9);
    expect(MSK_TRAUMA_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(23);
    expect(INFECTIOUS_ENT_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(10);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.dysuria_complaint_v1).toBe(DYSURIA_COMPLAINT_V1_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.back_pain_complaint_v1).toBe(BACK_PAIN_COMPLAINT_V1_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.fever_complaint_v1).toBe(FEVER_COMPLAINT_V1_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.hyperglycemia).toBeDefined();
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.hyperglycemia_complaint_v1).toBeDefined();
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.hyperglycemia).not.toBe(
      COMPLAINT_INTEL_BY_TEMPLATE_ID.hyperglycemia_complaint_v1
    );
  });

  it("exposes endocrine/metabolic complaint intel in MDM multi-select when endocrine template active", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "hyperglycemia_complaint_v1");
    const options = buildMdmTemplateDropdownOptions(template ?? null);
    const existing = options.filter((option) => option.group === "existing");
    expect(existing.some((option) => option.fragmentKey.includes("hyperglycemiaComplaintV1"))).toBe(true);
    expect(options.filter((option) => option.group === "highValue").length).toBe(6);
  });

  it("renders template picker subgroup support in workspace", () => {
    const source = readFileSync(
      new URL("../components/encounters/ProviderDocumentationWorkspace.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toContain("provider-template-picker-subgroup-${subgroupKey}");
    expect(source).toContain("pickerSubgroupKey");
  });

  it("maps endocrine/metabolic template ids to intel bundles with EN/FR labels", () => {
    expect(ENDOCRINE_METABOLIC_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID.hyperglycemia_complaint_v1).toBe(
      HYPERGLYCEMIA_COMPLAINT_V1_INTEL
    );
    expect(flattenComplaintIntelligenceKeys(HYPERGLYCEMIA_COMPLAINT_V1_INTEL).every((k) =>
      k.includes(".hyperglycemiaComplaintV1.")
    )).toBe(true);
    expect(enMessages.providerDocumentationWorkspace.templateHyperglycemiaComplaintV1).toContain("Hyperglycemia");
    expect(frMessages.providerDocumentationWorkspace.templateHyperglycemiaComplaintV1).toContain("Hyperglycémie");
  });
});
