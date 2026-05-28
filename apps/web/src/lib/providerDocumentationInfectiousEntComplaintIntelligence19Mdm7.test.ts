import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  BACK_PAIN_COMPLAINT_V1_INTEL,
  CARDIAC_COMPLAINT_V1_TEMPLATE_IDS,
  DYSURIA_COMPLAINT_V1_INTEL,
  FEVER_COMPLAINT_V1_INTEL,
  GI_COMPLAINT_V1_TEMPLATE_IDS,
  GU_RENAL_COMPLAINT_V1_TEMPLATE_IDS,
  INFECTIOUS_ENT_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
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
import { providerDocumentationInfectiousEntComplaintIntel19Mdm7En } from "@/i18n/messages/providerDocumentationInfectiousEntComplaintIntel19Mdm7.en";
import enMessages from "@/i18n/messages/en";
import frMessages from "@/i18n/messages/fr";

const INFECTIOUS_ENT_BUNDLES = Object.values(INFECTIOUS_ENT_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID);

function resolveInfectiousEntKey(key: string): string {
  const parts = key.split(".");
  const ns = parts[2];
  const field = parts[3];
  if (!ns || !field) return key;
  const nsRecord = (providerDocumentationInfectiousEntComplaintIntel19Mdm7En as Record<
    string,
    Record<string, string>
  >)[ns];
  return nsRecord?.[field] ?? key;
}

function assertSectionCoverage(bundle: (typeof INFECTIOUS_ENT_BUNDLES)[number]) {
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

describe("provider documentation infectious / ENT complaint intelligence (19MDM.7)", () => {
  it("registers all 10 infectious/ENT complaint_v1 templates", () => {
    expect(INFECTIOUS_ENT_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(10);
    for (const id of INFECTIOUS_ENT_COMPLAINT_V1_TEMPLATE_IDS) {
      expect(COMPLAINT_INTEL_BY_TEMPLATE_ID[id]).toBeDefined();
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === id)).toBe(true);
    }
  });

  it("places infectious/ENT templates in infectious_ent picker subgroup with localized labels", () => {
    for (const id of INFECTIOUS_ENT_COMPLAINT_V1_TEMPLATE_IDS) {
      const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === id);
      expect(template?.pickerSubgroupKey).toBe("infectious_ent");
      expect(template?.majorGroup).toBe("ADULT");
    }
    expect(PROVIDER_DOCUMENTATION_TEMPLATE_PICKER_SUBGROUP_LABEL_KEYS.infectious_ent).toBe(
      "providerDocumentationWorkspace.templateSubgroupInfectiousEnt"
    );
    expect(enMessages.providerDocumentationWorkspace.templateSubgroupInfectiousEnt).toBe("Infectious / ENT");
    expect(frMessages.providerDocumentationWorkspace.templateSubgroupInfectiousEnt).toBe("Infectieux / ORL");
  });

  it("covers required sections on every infectious/ENT bundle", () => {
    for (const bundle of INFECTIOUS_ENT_BUNDLES) {
      assertSectionCoverage(bundle);
    }
  });

  it("does not auto-insert complaint intelligence on infectious/ENT template apply", () => {
    for (const templateId of INFECTIOUS_ENT_COMPLAINT_V1_TEMPLATE_IDS) {
      const next = applyProviderDocumentationTemplate({
        state: emptyProviderDocumentationWorkspaceState(),
        templateId,
        resolveFragment: (key) => key,
      });
      expect(JSON.stringify(next)).not.toContain("providerDocumentationComplaintIntel");
    }
  });

  it("blocks unsafe infectious certainty phrases in resolved copy", () => {
    const blockedSamples = [
      "sepsis ruled out",
      "meningitis ruled out",
      "abscess ruled out",
      "cellulitis ruled out",
      "mastoiditis ruled out",
      "necrotizing infection ruled out",
      "viral only",
      "bacterial only",
      "culture negative",
      "labs normal",
      "imaging normal",
      "CT negative",
      "no serious infection",
      "no deep infection",
      "benign infection",
      "safe for discharge",
      "medically cleared",
      "patient stable",
      "symptoms resolved",
      "infection resolved",
      "no emergency condition",
      "must discharge",
      "definitive diagnosis",
    ];
    for (const sample of blockedSamples) {
      expect(complaintIntelligenceTextViolations(sample).length).toBeGreaterThan(0);
    }
    for (const bundle of INFECTIOUS_ENT_BUNDLES) {
      expect(scanComplaintIntelligenceBundleForUnsafePhrases(bundle, resolveInfectiousEntKey)).toEqual([]);
    }
  });

  it("scanner includes infectious/ENT blocked phrase rules", () => {
    const ids = COMPLAINT_INTELLIGENCE_UNSAFE_PHRASE_RULES.map((rule) => rule.id);
    expect(ids).toContain("abscess_ruled_out");
    expect(ids).toContain("cellulitis_ruled_out");
    expect(ids).toContain("viral_only");
    expect(ids).toContain("culture_negative");
    expect(ids).toContain("benign_infection");
    expect(ids).toContain("infection_resolved");
  });

  it("does not duplicate keys within an infectious/ENT bundle", () => {
    for (const bundle of INFECTIOUS_ENT_BUNDLES) {
      expect(complaintIntelligenceHasDuplicateKeys(bundle)).toBe(false);
    }
  });

  it("leaves neuro, GI, respiratory, cardiac, GU, and MSK complaint templates unchanged", () => {
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.stroke_symptoms).toBe(STROKE_SYMPTOMS_COMPLAINT_INTEL);
    expect(GI_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(9);
    expect(RESPIRATORY_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(9);
    expect(CARDIAC_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(9);
    expect(GU_RENAL_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(9);
    expect(MSK_TRAUMA_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(10);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.dysuria_complaint_v1).toBe(DYSURIA_COMPLAINT_V1_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.back_pain_complaint_v1).toBe(BACK_PAIN_COMPLAINT_V1_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.sore_throat_complaint_v1).toBeDefined();
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.sore_throat_infectious_complaint_v1).toBeDefined();
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.fever).toBeDefined();
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.fever_complaint_v1).toBeDefined();
  });

  it("exposes infectious/ENT complaint intel in MDM multi-select when infectious template active", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "fever_complaint_v1");
    const options = buildMdmTemplateDropdownOptions(template ?? null);
    const existing = options.filter((option) => option.group === "existing");
    expect(existing.some((option) => option.fragmentKey.includes("feverComplaintV1"))).toBe(true);
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

  it("maps infectious/ENT template ids to intel bundles with EN/FR labels", () => {
    expect(INFECTIOUS_ENT_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID.fever_complaint_v1).toBe(FEVER_COMPLAINT_V1_INTEL);
    expect(flattenComplaintIntelligenceKeys(FEVER_COMPLAINT_V1_INTEL).every((k) =>
      k.includes(".feverComplaintV1.")
    )).toBe(true);
    expect(enMessages.providerDocumentationWorkspace.templateFeverComplaintV1).toContain("Fever");
    expect(frMessages.providerDocumentationWorkspace.templateFeverComplaintV1).toContain("Fièvre");
  });
});
