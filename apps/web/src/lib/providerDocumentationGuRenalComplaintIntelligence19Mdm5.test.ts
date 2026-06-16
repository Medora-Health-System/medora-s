import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  CARDIAC_COMPLAINT_V1_TEMPLATE_IDS,
  COUGH_COMPLAINT_V1_INTEL,
  DYSURIA_COMPLAINT_V1_INTEL,
  GI_COMPLAINT_V1_TEMPLATE_IDS,
  GU_RENAL_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  GU_RENAL_COMPLAINT_V1_TEMPLATE_IDS,
  PALPITATIONS_COMPLAINT_V1_INTEL,
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
import { providerDocumentationGuRenalComplaintIntel19Mdm5En } from "@/i18n/messages/providerDocumentationGuRenalComplaintIntel19Mdm5.en";
import { providerDocumentationHematuriaComplaintIntelEn } from "@/i18n/messages/providerDocumentationHematuriaComplaintIntel.en";
import enMessages from "@/i18n/messages/en";
import frMessages from "@/i18n/messages/fr";

const GU_RENAL_BUNDLES = Object.values(GU_RENAL_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID);

const HIGH_RISK_GU_TEMPLATE_IDS = [
  "testicular_pain_complaint_v1",
  "hematuria_complaint_v1",
  "vaginal_bleeding_complaint_v1",
  "renal_failure_symptoms_complaint_v1",
  "urinary_retention_complaint_v1",
] as const;

function resolveGuRenalKey(key: string): string {
  const parts = key.split(".");
  const ns = parts[2];
  const field = parts[3];
  if (!ns || !field) return key;
  const nsRecord = (providerDocumentationGuRenalComplaintIntel19Mdm5En as Record<string, Record<string, string>>)[
    ns
  ];
  if (nsRecord?.[field]) return nsRecord[field];
  const hematuriaRecord = providerDocumentationHematuriaComplaintIntelEn.hematuriaComplaintV1;
  if (ns === "hematuriaComplaintV1" && hematuriaRecord[field as keyof typeof hematuriaRecord]) {
    return hematuriaRecord[field as keyof typeof hematuriaRecord] as string;
  }
  return key;
}

function assertSectionCoverage(bundle: (typeof GU_RENAL_BUNDLES)[number]) {
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

describe("provider documentation GU / renal complaint intelligence (19MDM.5)", () => {
  it("registers all 9 GU/renal complaint_v1 templates", () => {
    expect(GU_RENAL_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(9);
    for (const id of GU_RENAL_COMPLAINT_V1_TEMPLATE_IDS) {
      expect(COMPLAINT_INTEL_BY_TEMPLATE_ID[id]).toBeDefined();
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === id)).toBe(true);
    }
  });

  it("places GU/renal templates in gu_renal picker subgroup with localized labels", () => {
    for (const id of GU_RENAL_COMPLAINT_V1_TEMPLATE_IDS) {
      const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === id);
      expect(template?.pickerSubgroupKey).toBe("gu_renal");
      expect(template?.majorGroup).toBe("ADULT");
    }
    expect(PROVIDER_DOCUMENTATION_TEMPLATE_PICKER_SUBGROUP_LABEL_KEYS.gu_renal).toBe(
      "providerDocumentationWorkspace.templateSubgroupGuRenal"
    );
    expect(enMessages.providerDocumentationWorkspace.templateSubgroupGuRenal).toBe("GU / Renal");
    expect(frMessages.providerDocumentationWorkspace.templateSubgroupGuRenal).toBe("GU / rénal");
  });

  it("covers required sections on every GU/renal bundle", () => {
    for (const bundle of GU_RENAL_BUNDLES) {
      assertSectionCoverage(bundle);
    }
  });

  it("includes consult / follow-up prompts on high-risk GU bundles", () => {
    for (const templateId of HIGH_RISK_GU_TEMPLATE_IDS) {
      const bundle = GU_RENAL_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID[templateId];
      const consultOrFollowUp = [
        ...(bundle.mdmClinicalRationale ?? []),
        ...(bundle.followUpDisposition ?? []),
        ...(bundle.mdmAdmitObserveDischarge ?? []),
      ];
      expect(consultOrFollowUp.length).toBeGreaterThan(0);
    }
  });

  it("does not auto-insert complaint intelligence on GU/renal template apply", () => {
    for (const templateId of GU_RENAL_COMPLAINT_V1_TEMPLATE_IDS) {
      const next = applyProviderDocumentationTemplate({
        state: emptyProviderDocumentationWorkspaceState(),
        templateId,
        resolveFragment: (key) => key,
      });
      expect(JSON.stringify(next)).not.toContain("providerDocumentationComplaintIntel");
    }
  });

  it("blocks unsafe GU certainty phrases in resolved copy", () => {
    const blockedSamples = [
      "UTI ruled out",
      "pyelonephritis ruled out",
      "torsion ruled out",
      "ectopic ruled out",
      "obstruction ruled out",
      "STI ruled out",
      "kidney stone ruled out",
      "renal failure ruled out",
      "UA negative",
      "urine culture negative",
      "CT negative",
      "ultrasound normal",
      "labs normal",
      "renal function normal",
      "creatinine normal",
      "no infection",
      "benign GU exam",
      "safe for discharge",
      "medically cleared",
      "patient stable",
      "torsion excluded",
      "stone passed",
      "must discharge",
      "definitive diagnosis",
    ];
    for (const sample of blockedSamples) {
      expect(complaintIntelligenceTextViolations(sample).length).toBeGreaterThan(0);
    }
    for (const bundle of GU_RENAL_BUNDLES) {
      expect(scanComplaintIntelligenceBundleForUnsafePhrases(bundle, resolveGuRenalKey)).toEqual([]);
    }
  });

  it("scanner includes GU/renal blocked phrase rules", () => {
    const ids = COMPLAINT_INTELLIGENCE_UNSAFE_PHRASE_RULES.map((rule) => rule.id);
    expect(ids).toContain("uti_ruled_out");
    expect(ids).toContain("torsion_ruled_out");
    expect(ids).toContain("ua_negative");
    expect(ids).toContain("torsion_excluded");
    expect(ids).toContain("benign_gu_exam");
  });

  it("does not duplicate keys within a GU/renal bundle", () => {
    for (const bundle of GU_RENAL_BUNDLES) {
      expect(complaintIntelligenceHasDuplicateKeys(bundle)).toBe(false);
    }
  });

  it("leaves neuro, GI, respiratory, and cardiac complaint templates unchanged", () => {
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.stroke_symptoms).toBe(STROKE_SYMPTOMS_COMPLAINT_INTEL);
    expect(GI_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(9);
    expect(RESPIRATORY_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(9);
    expect(CARDIAC_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(9);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.cough_complaint_v1).toBe(COUGH_COMPLAINT_V1_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.palpitations_complaint_v1).toBe(PALPITATIONS_COMPLAINT_V1_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.flank_pain_complaint_v1).toBeDefined();
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.flank_pain_renal_complaint_v1).toBeDefined();
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.flank_pain).toBeDefined();
  });

  it("exposes GU/renal complaint intel in MDM multi-select when GU template active", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "dysuria_complaint_v1");
    const options = buildMdmTemplateDropdownOptions(template ?? null);
    const existing = options.filter((option) => option.group === "existing");
    expect(existing.some((option) => option.fragmentKey.includes("dysuriaComplaintV1"))).toBe(true);
    expect(options.filter((option) => option.group === "highValue").length).toBe(5);
  });

  it("renders template picker subgroup support in workspace", () => {
    const source = readFileSync(
      new URL("../components/encounters/ProviderDocumentationWorkspace.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toContain("provider-template-picker-subgroup-${subgroupKey}");
    expect(source).toContain("pickerSubgroupKey");
  });

  it("maps GU/renal template ids to intel bundles with EN/FR labels", () => {
    expect(GU_RENAL_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID.dysuria_complaint_v1).toBe(DYSURIA_COMPLAINT_V1_INTEL);
    expect(flattenComplaintIntelligenceKeys(DYSURIA_COMPLAINT_V1_INTEL).every((k) =>
      k.includes(".dysuriaComplaintV1.")
    )).toBe(true);
    expect(enMessages.providerDocumentationWorkspace.templateDysuriaComplaintV1).toContain("Dysuria");
    expect(frMessages.providerDocumentationWorkspace.templateDysuriaComplaintV1).toContain("Dysurie");
  });
});
