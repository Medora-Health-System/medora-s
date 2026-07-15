import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  BACK_PAIN_COMPLAINT_V1_INTEL,
  CARDIAC_COMPLAINT_V1_TEMPLATE_IDS,
  COMPLAINT_INTEL_BY_TEMPLATE_ID,
  DYSURIA_COMPLAINT_V1_INTEL,
  GI_COMPLAINT_V1_TEMPLATE_IDS,
  GU_RENAL_COMPLAINT_V1_TEMPLATE_IDS,
  MSK_TRAUMA_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  MSK_TRAUMA_COMPLAINT_V1_TEMPLATE_IDS,
  RESPIRATORY_COMPLAINT_V1_TEMPLATE_IDS,
  STROKE_SYMPTOMS_COMPLAINT_INTEL,
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
import { providerDocumentationTraumaInjuryComplaintIntelEn } from "@/i18n/messages/providerDocumentationTraumaInjuryComplaintIntel.en";
import enMessages from "@/i18n/messages/en";
import frMessages from "@/i18n/messages/fr";

const MSK_TRAUMA_BUNDLES = Object.values(MSK_TRAUMA_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID);

function resolveMskTraumaKey(key: string): string {
  const parts = key.split(".");
  const ns = parts[2];
  const field = parts[3];
  if (!ns || !field) return key;
  const nsRecord = (providerDocumentationTraumaInjuryComplaintIntelEn as Record<string, Record<string, string>>)[
    ns
  ];
  return nsRecord?.[field] ?? key;
}

function assertSectionCoverage(bundle: (typeof MSK_TRAUMA_BUNDLES)[number]) {
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

describe("provider documentation MSK / trauma complaint intelligence (19MDM.6)", () => {
  it("registers all 20 MSK/trauma complaint_v1 templates", () => {
    expect(MSK_TRAUMA_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(21);
    for (const id of MSK_TRAUMA_COMPLAINT_V1_TEMPLATE_IDS) {
      expect(COMPLAINT_INTEL_BY_TEMPLATE_ID[id]).toBeDefined();
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === id)).toBe(true);
    }
  });

  it("places MSK/trauma templates in msk_trauma picker subgroup with localized labels", () => {
    for (const id of MSK_TRAUMA_COMPLAINT_V1_TEMPLATE_IDS) {
      const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === id);
      expect(template?.pickerSubgroupKey).toBe("msk_trauma");
      expect(template?.majorGroup).toBe("ADULT");
    }
    expect(PROVIDER_DOCUMENTATION_TEMPLATE_PICKER_SUBGROUP_LABEL_KEYS.msk_trauma).toBe(
      "providerDocumentationWorkspace.templateSubgroupMskTrauma"
    );
    expect(enMessages.providerDocumentationWorkspace.templateSubgroupMskTrauma).toBe("MSK / Trauma");
    expect(frMessages.providerDocumentationWorkspace.templateSubgroupMskTrauma).toBe("MSK / traumatique");
  });

  it("covers required sections on every MSK/trauma bundle", () => {
    for (const bundle of MSK_TRAUMA_BUNDLES) {
      assertSectionCoverage(bundle);
    }
  });

  it("does not auto-insert complaint intelligence on MSK/trauma template apply", () => {
    for (const templateId of MSK_TRAUMA_COMPLAINT_V1_TEMPLATE_IDS) {
      const next = applyProviderDocumentationTemplate({
        state: emptyProviderDocumentationWorkspaceState(),
        templateId,
        resolveFragment: (key) => key,
      });
      expect(JSON.stringify(next)).not.toContain("providerDocumentationComplaintIntel");
    }
  });

  it("blocks unsafe MSK/trauma certainty phrases in resolved copy", () => {
    const blockedSamples = [
      "fracture ruled out",
      "dislocation ruled out",
      "spinal injury ruled out",
      "intracranial injury ruled out",
      "compartment syndrome ruled out",
      "DVT ruled out",
      "concussion ruled out",
      "X-ray negative",
      "CT negative",
      "MRI negative",
      "imaging normal",
      "no fracture",
      "no dislocation",
      "no serious injury",
      "benign trauma exam",
      "neurologically intact",
      "safe for discharge",
      "medically cleared",
      "patient stable",
      "injury resolved",
      "no acute findings",
      "minor injury only",
      "must discharge",
      "definitive diagnosis",
    ];
    for (const sample of blockedSamples) {
      expect(complaintIntelligenceTextViolations(sample).length).toBeGreaterThan(0);
    }
    for (const bundle of MSK_TRAUMA_BUNDLES) {
      expect(scanComplaintIntelligenceBundleForUnsafePhrases(bundle, resolveMskTraumaKey)).toEqual([]);
    }
  });

  it("scanner includes MSK/trauma blocked phrase rules", () => {
    const ids = COMPLAINT_INTELLIGENCE_UNSAFE_PHRASE_RULES.map((rule) => rule.id);
    expect(ids).toContain("fracture_ruled_out");
    expect(ids).toContain("xray_negative");
    expect(ids).toContain("imaging_normal");
    expect(ids).toContain("no_fracture");
    expect(ids).toContain("neurologically_intact");
    expect(ids).toContain("minor_injury_only");
  });

  it("does not duplicate keys within an MSK/trauma bundle", () => {
    for (const bundle of MSK_TRAUMA_BUNDLES) {
      expect(complaintIntelligenceHasDuplicateKeys(bundle)).toBe(false);
    }
  });

  it("leaves neuro, GI, respiratory, cardiac, and GU complaint templates unchanged", () => {
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.stroke_symptoms).toBe(STROKE_SYMPTOMS_COMPLAINT_INTEL);
    expect(GI_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(9);
    expect(RESPIRATORY_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(9);
    expect(CARDIAC_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(9);
    expect(GU_RENAL_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(9);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.dysuria_complaint_v1).toBe(DYSURIA_COMPLAINT_V1_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.back_pain).toBeDefined();
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.back_pain_complaint_v1).toBeDefined();
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.back_pain).not.toBe(
      COMPLAINT_INTEL_BY_TEMPLATE_ID.back_pain_complaint_v1
    );
  });

  it("exposes MSK/trauma complaint intel in MDM multi-select when MSK template active", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "back_pain_complaint_v1");
    const options = buildMdmTemplateDropdownOptions(template ?? null);
    const existing = options.filter((option) => option.group === "existing");
    expect(existing.some((option) => option.fragmentKey.includes("backPainComplaintV1"))).toBe(true);
    expect(options.filter((option) => option.group === "highValue").length).toBeGreaterThanOrEqual(5);
  });

  it("renders template picker subgroup support in workspace", () => {
    const source = readFileSync(
      new URL("../components/encounters/ProviderDocumentationWorkspace.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toContain("provider-template-picker-subgroup-${subgroupKey}");
    expect(source).toContain("pickerSubgroupKey");
  });

  it("maps MSK/trauma template ids to intel bundles with EN/FR labels", () => {
    expect(MSK_TRAUMA_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID.back_pain_complaint_v1).toBe(
      BACK_PAIN_COMPLAINT_V1_INTEL
    );
    expect(flattenComplaintIntelligenceKeys(BACK_PAIN_COMPLAINT_V1_INTEL).every((k) =>
      k.includes(".backPainComplaintV1.")
    )).toBe(true);
    expect(enMessages.providerDocumentationWorkspace.templateBackPainComplaintV1).toContain("Back pain");
    expect(frMessages.providerDocumentationWorkspace.templateBackPainComplaintV1).toContain("dorsale");
  });
});
