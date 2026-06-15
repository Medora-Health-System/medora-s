import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  ABDOMINAL_PAIN_COMPLAINT_V1_INTEL,
  CHEST_PAIN_COMPLAINT_INTEL,
  COMPLAINT_INTEL_BY_TEMPLATE_ID,
  DIARRHEA_COMPLAINT_V1_INTEL,
  DYSPHAGIA_COMPLAINT_V1_INTEL,
  FLANK_PAIN_COMPLAINT_V1_INTEL,
  GI_BLEED_COMPLAINT_V1_INTEL,
  GI_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  GI_COMPLAINT_V1_TEMPLATE_IDS,
  HERNIA_COMPLAINT_V1_INTEL,
  NAUSEA_VOMITING_COMPLAINT_V1_INTEL,
  RECTAL_PAIN_COMPLAINT_V1_INTEL,
  CONSTIPATION_COMPLAINT_V1_INTEL,
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
import { providerDocumentationGiComplaintIntel19Mdm2En } from "@/i18n/messages/providerDocumentationGiComplaintIntel19Mdm2.en";
import enMessages from "@/i18n/messages/en";
import frMessages from "@/i18n/messages/fr";

const GI_BUNDLES = [
  ABDOMINAL_PAIN_COMPLAINT_V1_INTEL,
  NAUSEA_VOMITING_COMPLAINT_V1_INTEL,
  DIARRHEA_COMPLAINT_V1_INTEL,
  CONSTIPATION_COMPLAINT_V1_INTEL,
  GI_BLEED_COMPLAINT_V1_INTEL,
  FLANK_PAIN_COMPLAINT_V1_INTEL,
  HERNIA_COMPLAINT_V1_INTEL,
  RECTAL_PAIN_COMPLAINT_V1_INTEL,
  DYSPHAGIA_COMPLAINT_V1_INTEL,
] as const;

function resolveGiKey(key: string): string {
  const parts = key.split(".");
  const ns = parts[2];
  const field = parts[3];
  if (!ns || !field) return key;
  const nsRecord = (providerDocumentationGiComplaintIntel19Mdm2En as Record<string, Record<string, string>>)[ns];
  return nsRecord?.[field] ?? key;
}

function assertSectionCoverage(bundle: (typeof GI_BUNDLES)[number]) {
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

describe("provider documentation GI complaint intelligence (19MDM.2)", () => {
  it("registers all 9 GI complaint_v1 templates", () => {
    expect(GI_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(9);
    for (const id of GI_COMPLAINT_V1_TEMPLATE_IDS) {
      expect(COMPLAINT_INTEL_BY_TEMPLATE_ID[id]).toBeDefined();
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === id)).toBe(true);
    }
  });

  it("places GI templates in gi_abdominal picker subgroup with localized labels", () => {
    for (const id of GI_COMPLAINT_V1_TEMPLATE_IDS) {
      const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === id);
      expect(template?.pickerSubgroupKey).toBe("gi_abdominal");
      expect(template?.majorGroup).toBe("ADULT");
    }
    expect(PROVIDER_DOCUMENTATION_TEMPLATE_PICKER_SUBGROUP_LABEL_KEYS.gi_abdominal).toBe(
      "providerDocumentationWorkspace.templateSubgroupGiAbdominal"
    );
    expect(enMessages.providerDocumentationWorkspace.templateSubgroupGiAbdominal).toBe("GI / Abdominal");
    expect(frMessages.providerDocumentationWorkspace.templateSubgroupGiAbdominal).toBe(
      "Gastro-intestinal / abdominal"
    );
  });

  it("covers required sections on every GI bundle", () => {
    for (const bundle of GI_BUNDLES) {
      assertSectionCoverage(bundle);
    }
  });

  it("does not auto-insert complaint intelligence on GI template apply", () => {
    for (const templateId of GI_COMPLAINT_V1_TEMPLATE_IDS) {
      const next = applyProviderDocumentationTemplate({
        state: emptyProviderDocumentationWorkspaceState(),
        templateId,
        resolveFragment: (key) => key,
      });
      expect(JSON.stringify(next)).not.toContain("providerDocumentationComplaintIntel");
    }
  });

  it("blocks unsafe certainty phrases in GI resolved copy", () => {
    const blockedSamples = [
      "appendicitis ruled out",
      "CT normal",
      "labs normal",
      "safe for discharge",
      "no acute process",
      "must admit",
    ];
    for (const sample of blockedSamples) {
      expect(complaintIntelligenceTextViolations(sample).length).toBeGreaterThan(0);
    }
    for (const bundle of GI_BUNDLES) {
      expect(scanComplaintIntelligenceBundleForUnsafePhrases(bundle, resolveGiKey)).toEqual([]);
    }
  });

  it("scanner includes required blocked phrase rules", () => {
    const ids = COMPLAINT_INTELLIGENCE_UNSAFE_PHRASE_RULES.map((rule) => rule.id);
    expect(ids).toContain("appendicitis_ruled_out");
    expect(ids).toContain("surgical_abdomen_ruled_out");
    expect(ids).toContain("gi_bleed_ruled_out");
    expect(ids).toContain("must_discharge");
    expect(ids).toContain("definitive_diagnosis");
  });

  it("does not duplicate keys within a GI bundle", () => {
    for (const bundle of GI_BUNDLES) {
      expect(complaintIntelligenceHasDuplicateKeys(bundle)).toBe(false);
    }
  });

  it("leaves Batch 1 chest pain intelligence unchanged", () => {
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.chest_pain).toBe(CHEST_PAIN_COMPLAINT_INTEL);
    expect(CHEST_PAIN_COMPLAINT_INTEL.hpi).toContain(
      "providerDocumentationComplaintIntel.chestPain.hpiWorseningWithExertion"
    );
    const chestKeysBefore = flattenComplaintIntelligenceKeys(CHEST_PAIN_COMPLAINT_INTEL).length;
    expect(chestKeysBefore).toBeGreaterThan(15);
  });

  it("exposes GI complaint intel in MDM multi-select when GI template active", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "abdominal_pain_complaint_v1");
    const options = buildMdmTemplateDropdownOptions(template ?? null);
    const existing = options.filter((option) => option.group === "existing");
    expect(existing.some((option) => option.fragmentKey.includes("abdominalPainComplaintV1"))).toBe(true);
    const highValue = options.filter((option) => option.group === "highValue");
    expect(highValue.length).toBe(5);
    expect(highValue.some((option) => option.fragmentKey === "providerDocumentationMdmHighValue.ekgNormal")).toBe(
      false
    );
  });

  it("renders template picker subgroup in workspace", () => {
    const source = readFileSync(
      new URL("../components/encounters/ProviderDocumentationWorkspace.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toContain("provider-template-picker-subgroup-${subgroupKey}");
    expect(source).toContain("pickerSubgroupKey");
    expect(source).toContain("PROVIDER_DOCUMENTATION_TEMPLATE_PICKER_SUBGROUP_LABEL_KEYS");
  });

  it("maps GI template ids to intel bundles", () => {
    expect(GI_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID.abdominal_pain_complaint_v1).toBe(
      ABDOMINAL_PAIN_COMPLAINT_V1_INTEL
    );
    expect(GI_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID.dysphagia_complaint_v1).toBe(DYSPHAGIA_COMPLAINT_V1_INTEL);
  });
});
