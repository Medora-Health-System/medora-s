import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  CHEST_PAIN_COMPLAINT_INTEL,
  COMPLAINT_INTEL_BY_TEMPLATE_ID,
  COUGH_COMPLAINT_V1_INTEL,
  GI_COMPLAINT_V1_TEMPLATE_IDS,
  PALPITATIONS_COMPLAINT_V1_INTEL,
  RESPIRATORY_COMPLAINT_V1_TEMPLATE_IDS,
  SOB_COMPLAINT_INTEL,
  STROKE_SYMPTOMS_COMPLAINT_INTEL,
  CARDIAC_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  CARDIAC_COMPLAINT_V1_TEMPLATE_IDS,
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
import { providerDocumentationCardiacComplaintIntel19Mdm4En } from "@/i18n/messages/providerDocumentationCardiacComplaintIntel19Mdm4.en";
import enMessages from "@/i18n/messages/en";
import frMessages from "@/i18n/messages/fr";

const CARDIAC_BUNDLES = Object.values(CARDIAC_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID);

const CONSULT_EXPECTED_TEMPLATE_IDS = [
  "afib_rapid_rate_complaint_v1",
  "chf_symptoms_complaint_v1",
  "leg_swelling_dvt_complaint_v1",
  "near_syncope_complaint_v1",
  "palpitations_complaint_v1",
] as const;

function resolveCardiacKey(key: string): string {
  const parts = key.split(".");
  const ns = parts[2];
  const field = parts[3];
  if (!ns || !field) return key;
  const nsRecord = (providerDocumentationCardiacComplaintIntel19Mdm4En as Record<string, Record<string, string>>)[
    ns
  ];
  return nsRecord?.[field] ?? key;
}

function assertSectionCoverage(bundle: (typeof CARDIAC_BUNDLES)[number]) {
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

describe("provider documentation cardiac / vascular complaint intelligence (19MDM.4)", () => {
  it("registers all 9 cardiac complaint_v1 templates", () => {
    expect(CARDIAC_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(9);
    for (const id of CARDIAC_COMPLAINT_V1_TEMPLATE_IDS) {
      expect(COMPLAINT_INTEL_BY_TEMPLATE_ID[id]).toBeDefined();
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === id)).toBe(true);
    }
  });

  it("places cardiac templates in cardiac_vascular picker subgroup with localized labels", () => {
    for (const id of CARDIAC_COMPLAINT_V1_TEMPLATE_IDS) {
      const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === id);
      expect(template?.pickerSubgroupKey).toBe("cardiac_vascular");
      expect(template?.majorGroup).toBe("ADULT");
    }
    expect(PROVIDER_DOCUMENTATION_TEMPLATE_PICKER_SUBGROUP_LABEL_KEYS.cardiac_vascular).toBe(
      "providerDocumentationWorkspace.templateSubgroupCardiacVascular"
    );
    expect(enMessages.providerDocumentationWorkspace.templateSubgroupCardiacVascular).toBe("Cardiac / Vascular");
    expect(frMessages.providerDocumentationWorkspace.templateSubgroupCardiacVascular).toBe("Cardiaque / vasculaire");
  });

  it("covers required sections on every cardiac bundle", () => {
    for (const bundle of CARDIAC_BUNDLES) {
      assertSectionCoverage(bundle);
    }
  });

  it("includes consult / follow-up prompts on AFib, syncope, CHF, DVT, and palpitations bundles", () => {
    for (const templateId of CONSULT_EXPECTED_TEMPLATE_IDS) {
      const bundle = CARDIAC_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID[templateId];
      const consultOrFollowUp = [
        ...(bundle.mdmClinicalRationale ?? []),
        ...(bundle.followUpDisposition ?? []),
        ...(bundle.mdmAdmitObserveDischarge ?? []),
      ];
      expect(consultOrFollowUp.length).toBeGreaterThan(0);
    }
  });

  it("does not auto-insert complaint intelligence on cardiac template apply", () => {
    for (const templateId of CARDIAC_COMPLAINT_V1_TEMPLATE_IDS) {
      const next = applyProviderDocumentationTemplate({
        state: emptyProviderDocumentationWorkspaceState(),
        templateId,
        resolveFragment: (key) => key,
      });
      expect(JSON.stringify(next)).not.toContain("providerDocumentationComplaintIntel");
    }
  });

  it("blocks unsafe cardiac certainty phrases in resolved copy", () => {
    const blockedSamples = [
      "ACS ruled out",
      "MI ruled out",
      "PE ruled out",
      "DVT ruled out",
      "stroke ruled out",
      "TIA ruled out",
      "EKG normal",
      "troponin negative",
      "D-dimer negative",
      "ultrasound negative",
      "low cardiac risk",
      "no PE",
      "no DVT",
      "safe for discharge",
      "medically cleared",
      "patient stable",
      "rate controlled permanently",
      "anticoagulation not needed",
      "must discharge",
      "must admit",
      "definitive diagnosis",
    ];
    for (const sample of blockedSamples) {
      expect(complaintIntelligenceTextViolations(sample).length).toBeGreaterThan(0);
    }
    for (const bundle of CARDIAC_BUNDLES) {
      expect(scanComplaintIntelligenceBundleForUnsafePhrases(bundle, resolveCardiacKey)).toEqual([]);
    }
  });

  it("scanner includes cardiac blocked phrase rules", () => {
    const ids = COMPLAINT_INTELLIGENCE_UNSAFE_PHRASE_RULES.map((rule) => rule.id);
    expect(ids).toContain("mi_ruled_out");
    expect(ids).toContain("dvt_ruled_out");
    expect(ids).toContain("ekg_normal");
    expect(ids).toContain("troponin_negative");
    expect(ids).toContain("low_cardiac_risk");
    expect(ids).toContain("anticoagulation_not_needed");
  });

  it("does not duplicate keys within a cardiac bundle", () => {
    for (const bundle of CARDIAC_BUNDLES) {
      expect(complaintIntelligenceHasDuplicateKeys(bundle)).toBe(false);
    }
  });

  it("leaves chest pain, SOB, neuro, GI, and respiratory complaint templates unchanged", () => {
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.chest_pain).toBe(CHEST_PAIN_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.sob).toBe(SOB_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.stroke_symptoms).toBe(STROKE_SYMPTOMS_COMPLAINT_INTEL);
    expect(CHEST_PAIN_COMPLAINT_INTEL.hpi).toContain(
      "providerDocumentationComplaintIntel.chestPain.hpiExertional"
    );
    expect(GI_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(9);
    expect(RESPIRATORY_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(9);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.cough_complaint_v1).toBe(COUGH_COMPLAINT_V1_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.hypertension).toBeDefined();
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.hypertension_complaint_v1).toBeDefined();
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.hypertension).not.toBe(
      COMPLAINT_INTEL_BY_TEMPLATE_ID.hypertension_complaint_v1
    );
  });

  it("exposes cardiac complaint intel in MDM multi-select when cardiac template active", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "palpitations_complaint_v1");
    const options = buildMdmTemplateDropdownOptions(template ?? null);
    const existing = options.filter((option) => option.group === "existing");
    expect(existing.some((option) => option.fragmentKey.includes("palpitationsComplaintV1"))).toBe(true);
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

  it("maps cardiac template ids to intel bundles with EN/FR labels", () => {
    expect(CARDIAC_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID.palpitations_complaint_v1).toBe(
      PALPITATIONS_COMPLAINT_V1_INTEL
    );
    expect(flattenComplaintIntelligenceKeys(PALPITATIONS_COMPLAINT_V1_INTEL).every((k) =>
      k.includes(".palpitationsComplaintV1.")
    )).toBe(true);
    expect(enMessages.providerDocumentationWorkspace.templatePalpitationsComplaintV1).toContain("Palpitations");
    expect(frMessages.providerDocumentationWorkspace.templatePalpitationsComplaintV1).toContain("Palpitations");
  });
});
