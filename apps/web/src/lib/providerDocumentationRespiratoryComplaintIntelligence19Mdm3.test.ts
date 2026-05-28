import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  CHEST_PAIN_COMPLAINT_INTEL,
  COMPLAINT_INTEL_BY_TEMPLATE_ID,
  COUGH_COMPLAINT_V1_INTEL,
  FLU_LIKE_ILLNESS_COMPLAINT_V1_INTEL,
  GI_COMPLAINT_V1_TEMPLATE_IDS,
  RESPIRATORY_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  RESPIRATORY_COMPLAINT_V1_TEMPLATE_IDS,
  SOB_COMPLAINT_INTEL,
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
import { providerDocumentationRespiratoryComplaintIntel19Mdm3En } from "@/i18n/messages/providerDocumentationRespiratoryComplaintIntel19Mdm3.en";
import enMessages from "@/i18n/messages/en";
import frMessages from "@/i18n/messages/fr";

const RESPIRATORY_BUNDLES = Object.values(RESPIRATORY_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID);

function resolveRespiratoryKey(key: string): string {
  const parts = key.split(".");
  const ns = parts[2];
  const field = parts[3];
  if (!ns || !field) return key;
  const nsRecord = (providerDocumentationRespiratoryComplaintIntel19Mdm3En as Record<string, Record<string, string>>)[
    ns
  ];
  return nsRecord?.[field] ?? key;
}

function assertSectionCoverage(bundle: (typeof RESPIRATORY_BUNDLES)[number]) {
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

describe("provider documentation respiratory complaint intelligence (19MDM.3)", () => {
  it("registers all 9 respiratory complaint_v1 templates", () => {
    expect(RESPIRATORY_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(9);
    for (const id of RESPIRATORY_COMPLAINT_V1_TEMPLATE_IDS) {
      expect(COMPLAINT_INTEL_BY_TEMPLATE_ID[id]).toBeDefined();
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === id)).toBe(true);
    }
  });

  it("places respiratory templates in respiratory_ent picker subgroup with localized labels", () => {
    for (const id of RESPIRATORY_COMPLAINT_V1_TEMPLATE_IDS) {
      const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === id);
      expect(template?.pickerSubgroupKey).toBe("respiratory_ent");
      expect(template?.majorGroup).toBe("ADULT");
    }
    expect(PROVIDER_DOCUMENTATION_TEMPLATE_PICKER_SUBGROUP_LABEL_KEYS.respiratory_ent).toBe(
      "providerDocumentationWorkspace.templateSubgroupRespiratoryEnt"
    );
    expect(enMessages.providerDocumentationWorkspace.templateSubgroupRespiratoryEnt).toBe("Respiratory / ENT");
    expect(frMessages.providerDocumentationWorkspace.templateSubgroupRespiratoryEnt).toBe(
      "Respiratoire / ORL"
    );
  });

  it("covers required sections on every respiratory bundle", () => {
    for (const bundle of RESPIRATORY_BUNDLES) {
      assertSectionCoverage(bundle);
    }
  });

  it("does not auto-insert complaint intelligence on respiratory template apply", () => {
    for (const templateId of RESPIRATORY_COMPLAINT_V1_TEMPLATE_IDS) {
      const next = applyProviderDocumentationTemplate({
        state: emptyProviderDocumentationWorkspaceState(),
        templateId,
        resolveFragment: (key) => key,
      });
      expect(JSON.stringify(next)).not.toContain("providerDocumentationComplaintIntel");
    }
  });

  it("blocks unsafe respiratory certainty phrases in resolved copy", () => {
    const blockedSamples = [
      "pneumonia ruled out",
      "PE ruled out",
      "chest x-ray normal",
      "COVID negative",
      "lungs clear",
      "no respiratory distress",
      "safe for discharge",
      "symptoms resolved",
    ];
    for (const sample of blockedSamples) {
      expect(complaintIntelligenceTextViolations(sample).length).toBeGreaterThan(0);
    }
    for (const bundle of RESPIRATORY_BUNDLES) {
      expect(scanComplaintIntelligenceBundleForUnsafePhrases(bundle, resolveRespiratoryKey)).toEqual([]);
    }
  });

  it("scanner includes respiratory blocked phrase rules", () => {
    const ids = COMPLAINT_INTELLIGENCE_UNSAFE_PHRASE_RULES.map((rule) => rule.id);
    expect(ids).toContain("pneumonia_ruled_out");
    expect(ids).toContain("covid_negative");
    expect(ids).toContain("lungs_clear");
    expect(ids).toContain("no_respiratory_distress");
  });

  it("does not duplicate keys within a respiratory bundle", () => {
    for (const bundle of RESPIRATORY_BUNDLES) {
      expect(complaintIntelligenceHasDuplicateKeys(bundle)).toBe(false);
    }
  });

  it("leaves chest pain, SOB, and GI complaint templates unchanged", () => {
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.chest_pain).toBe(CHEST_PAIN_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.sob).toBe(SOB_COMPLAINT_INTEL);
    expect(CHEST_PAIN_COMPLAINT_INTEL.hpi).toContain(
      "providerDocumentationComplaintIntel.chestPain.hpiExertional"
    );
    expect(GI_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(9);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.abdominal_pain_complaint_v1).toBeDefined();
  });

  it("exposes respiratory complaint intel in MDM multi-select when respiratory template active", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "cough_complaint_v1");
    const options = buildMdmTemplateDropdownOptions(template ?? null);
    const existing = options.filter((option) => option.group === "existing");
    expect(existing.some((option) => option.fragmentKey.includes("coughComplaintV1"))).toBe(true);
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

  it("maps respiratory template ids to intel bundles", () => {
    expect(RESPIRATORY_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID.cough_complaint_v1).toBe(COUGH_COMPLAINT_V1_INTEL);
    expect(RESPIRATORY_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID.flu_like_illness_complaint_v1).toBe(
      FLU_LIKE_ILLNESS_COMPLAINT_V1_INTEL
    );
    expect(flattenComplaintIntelligenceKeys(COUGH_COMPLAINT_V1_INTEL).every((k) => k.includes(".coughComplaintV1."))).toBe(
      true
    );
  });
});
