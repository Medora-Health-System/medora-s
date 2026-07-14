import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  BACK_PAIN_COMPLAINT_V1_INTEL,
  DYSURIA_COMPLAINT_V1_INTEL,
  ENDOCRINE_METABOLIC_COMPLAINT_V1_TEMPLATE_IDS,
  FEVER_COMPLAINT_V1_INTEL,
  GI_COMPLAINT_V1_TEMPLATE_IDS,
  GU_RENAL_COMPLAINT_V1_TEMPLATE_IDS,
  HEADACHE_COMPLAINT_INTEL,
  INFECTIOUS_ENT_COMPLAINT_V1_TEMPLATE_IDS,
  MSK_TRAUMA_COMPLAINT_V1_TEMPLATE_IDS,
  NEURO_EXPANSION_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
  NEURO_EXPANSION_COMPLAINT_V1_TEMPLATE_IDS,
  RESPIRATORY_COMPLAINT_V1_TEMPLATE_IDS,
  SEIZURE_COMPLAINT_V1_INTEL,
  STROKE_SYMPTOMS_COMPLAINT_INTEL,
  DIZZINESS_SYNCOPE_COMPLAINT_INTEL,
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
import { providerDocumentationNeuroExpansionComplaintIntel19Mdm9En } from "@/i18n/messages/providerDocumentationNeuroExpansionComplaintIntel19Mdm9.en";
import enMessages from "@/i18n/messages/en";
import frMessages from "@/i18n/messages/fr";

const NEURO_EXPANSION_BUNDLES = Object.values(NEURO_EXPANSION_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID);

const HIGH_RISK_NEURO_TEMPLATE_IDS = [
  "seizure_complaint_v1",
  "concussion_followup_complaint_v1",
  "gait_instability_falls_neuro_complaint_v1",
  "back_pain_neuro_red_flags_complaint_v1",
] as const;

function resolveNeuroExpansionKey(key: string): string {
  const parts = key.split(".");
  const ns = parts[2];
  const field = parts[3];
  if (!ns || !field) return key;
  const nsRecord = (providerDocumentationNeuroExpansionComplaintIntel19Mdm9En as Record<
    string,
    Record<string, string>
  >)[ns];
  return nsRecord?.[field] ?? key;
}

function assertSectionCoverage(bundle: (typeof NEURO_EXPANSION_BUNDLES)[number]) {
  expect(bundle.hpi?.length).toBeGreaterThan(0);
  expect(bundle.rosImportantPositives?.length).toBeGreaterThan(0);
  expect(bundle.rosImportantNegatives?.length).toBeGreaterThan(0);
  expect(bundle.rosRedFlags?.length).toBeGreaterThan(0);
  expect(Object.values(bundle.physicalExam ?? {}).flat().length).toBeGreaterThan(0);
  expect(bundle.physicalExam?.neuroPsych?.length).toBeGreaterThan(0);
  expect(bundle.mdmDifferentialSynthesis?.length).toBeGreaterThan(0);
  expect(bundle.mdmDataReviewed?.length).toBeGreaterThan(0);
  expect(bundle.reassessment?.length).toBeGreaterThan(0);
  expect(bundle.followUpDisposition?.length).toBeGreaterThan(0);
}

describe("provider documentation neurology expansion complaint intelligence (19MDM.9)", () => {
  it("registers all 10 neurology expansion complaint_v1 templates", () => {
    expect(NEURO_EXPANSION_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(10);
    for (const id of NEURO_EXPANSION_COMPLAINT_V1_TEMPLATE_IDS) {
      expect(COMPLAINT_INTEL_BY_TEMPLATE_ID[id]).toBeDefined();
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === id)).toBe(true);
    }
  });

  it("places neurology expansion templates in neurology_expansion picker subgroup with localized labels", () => {
    for (const id of NEURO_EXPANSION_COMPLAINT_V1_TEMPLATE_IDS) {
      const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === id);
      expect(template?.pickerSubgroupKey).toBe("neurology_expansion");
      expect(template?.majorGroup).toBe("ADULT");
    }
    expect(PROVIDER_DOCUMENTATION_TEMPLATE_PICKER_SUBGROUP_LABEL_KEYS.neurology_expansion).toBe(
      "providerDocumentationWorkspace.templateSubgroupNeurologyExpansion"
    );
    expect(enMessages.providerDocumentationWorkspace.templateSubgroupNeurologyExpansion).toBe(
      "Neurology Expansion"
    );
    expect(frMessages.providerDocumentationWorkspace.templateSubgroupNeurologyExpansion).toBe(
      "Neurologie avancée"
    );
  });

  it("covers required sections on every neurology expansion bundle", () => {
    for (const bundle of NEURO_EXPANSION_BUNDLES) {
      assertSectionCoverage(bundle);
    }
  });

  it("includes restriction/follow-up/disposition prompts on high-risk neuro bundles", () => {
    for (const templateId of HIGH_RISK_NEURO_TEMPLATE_IDS) {
      const bundle = NEURO_EXPANSION_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID[templateId];
      const consultOrFollowUp = [
        ...(bundle.mdmClinicalRationale ?? []),
        ...(bundle.followUpDisposition ?? []),
        ...(bundle.mdmAdmitObserveDischarge ?? []),
      ];
      expect(consultOrFollowUp.length).toBeGreaterThan(0);
    }
  });

  it("does not auto-insert complaint intelligence on neurology expansion template apply", () => {
    for (const templateId of NEURO_EXPANSION_COMPLAINT_V1_TEMPLATE_IDS) {
      const next = applyProviderDocumentationTemplate({
        state: emptyProviderDocumentationWorkspaceState(),
        templateId,
        resolveFragment: (key) => key,
      });
      expect(JSON.stringify(next)).not.toContain("providerDocumentationComplaintIntel");
    }
  });

  it("blocks unsafe neurology expansion certainty phrases in resolved copy", () => {
    const blockedSamples = [
      "stroke ruled out",
      "TIA ruled out",
      "seizure ruled out",
      "intracranial hemorrhage ruled out",
      "brain bleed ruled out",
      "meningitis ruled out",
      "spinal cord compression ruled out",
      "cauda equina ruled out",
      "CT negative",
      "MRI negative",
      "CTA negative",
      "EEG normal",
      "labs normal",
      "neuro exam normal",
      "neurologically intact",
      "no neurologic emergency",
      "no focal deficit",
      "symptoms resolved",
      "safe to drive",
      "cleared to drive",
      "safe for discharge",
      "medically cleared",
      "patient stable",
      "concussion resolved",
      "must discharge",
      "must admit",
      "definitive diagnosis",
    ];
    for (const sample of blockedSamples) {
      expect(complaintIntelligenceTextViolations(sample).length).toBeGreaterThan(0);
    }
    for (const bundle of NEURO_EXPANSION_BUNDLES) {
      expect(scanComplaintIntelligenceBundleForUnsafePhrases(bundle, resolveNeuroExpansionKey)).toEqual([]);
    }
  });

  it("scanner includes neurology expansion blocked phrase rules", () => {
    const ids = COMPLAINT_INTELLIGENCE_UNSAFE_PHRASE_RULES.map((rule) => rule.id);
    expect(ids).toContain("seizure_ruled_out");
    expect(ids).toContain("meningitis_ruled_out");
    expect(ids).toContain("cauda_equina_ruled_out");
    expect(ids).toContain("cta_negative");
    expect(ids).toContain("eeg_normal");
    expect(ids).toContain("neuro_exam_normal");
    expect(ids).toContain("safe_to_drive");
    expect(ids).toContain("concussion_resolved");
  });

  it("does not duplicate keys within a neurology expansion bundle", () => {
    for (const bundle of NEURO_EXPANSION_BUNDLES) {
      expect(complaintIntelligenceHasDuplicateKeys(bundle)).toBe(false);
    }
  });

  it("leaves existing neuro, GI, respiratory, cardiac, GU, MSK, infectious, and endocrine complaint templates unchanged", () => {
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.stroke_symptoms).toBe(STROKE_SYMPTOMS_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.headache).toBe(HEADACHE_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.dizziness_syncope).toBe(DIZZINESS_SYNCOPE_COMPLAINT_INTEL);
    expect(GI_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(9);
    expect(RESPIRATORY_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(9);
    expect(GU_RENAL_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(9);
    expect(MSK_TRAUMA_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(11);
    expect(INFECTIOUS_ENT_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(10);
    expect(ENDOCRINE_METABOLIC_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(10);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.dysuria_complaint_v1).toBe(DYSURIA_COMPLAINT_V1_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.back_pain_complaint_v1).toBe(BACK_PAIN_COMPLAINT_V1_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.fever_complaint_v1).toBe(FEVER_COMPLAINT_V1_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.seizure_complaint_v1).toBe(SEIZURE_COMPLAINT_V1_INTEL);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === "seizure")).toBe(true);
  });

  it("exposes neurology expansion complaint intel in MDM multi-select when neuro expansion template active", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "seizure_complaint_v1");
    const options = buildMdmTemplateDropdownOptions(template ?? null);
    const existing = options.filter((option) => option.group === "existing");
    expect(existing.some((option) => option.fragmentKey.includes("seizureComplaintV1"))).toBe(true);
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

  it("maps neurology expansion template ids to intel bundles with EN/FR labels", () => {
    expect(NEURO_EXPANSION_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID.seizure_complaint_v1).toBe(
      SEIZURE_COMPLAINT_V1_INTEL
    );
    expect(flattenComplaintIntelligenceKeys(SEIZURE_COMPLAINT_V1_INTEL).every((k) =>
      k.includes(".seizureComplaintV1.")
    )).toBe(true);
    expect(enMessages.providerDocumentationWorkspace.templateSeizureComplaintV1).toContain("Seizure");
    expect(frMessages.providerDocumentationWorkspace.templateSeizureComplaintV1).toContain("Crise convulsive");
  });
});
