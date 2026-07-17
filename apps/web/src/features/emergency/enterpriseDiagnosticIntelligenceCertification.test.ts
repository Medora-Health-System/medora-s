import { describe, expect, it } from "vitest";
import { COMMON_DIAGNOSES } from "@/constants/clinicalTemplates";
import {
  COMPLAINT_INTELLIGENCE_UNSAFE_PHRASE_RULES,
} from "@/lib/providerDocumentationComplaintIntelligenceGovernance";
import {
  BATCH28_PSYCHIATRIC_BEHAVIORAL_CAPACITY_COMPLAINT_TEMPLATE_IDS,
  COMPLAINT_INTEL_BY_TEMPLATE_ID,
} from "@/lib/providerDocumentationComplaintIntelligence";
import { parseBehavioralHealthFromText } from "@/lib/behavioralHealthFoundation";
import { resolvePsychiatricBehavioralRedFlags } from "@/lib/psychiatricBehavioralRedFlagEngine";
import { resolveToxicIngestionOverdoseContext } from "@/lib/toxicIngestionOverdoseClinicalIntelligence";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "@/lib/providerDocumentationModel";
import { CLINICAL_CONDITION_FAMILY_DEFINITIONS } from "./providerDischargeConditionFamilies";
import { resolveClinicalConditionFamily } from "./providerDischargeConditionFamilyResolver";
import {
  emptyProviderDischargeDocumentationForm,
  PROVIDER_DISCHARGE_CARD_TEMPLATE_SYNC_VERSION,
} from "./providerDischargeDocumentationModel";
import { ensureProviderDischargeCardForRef } from "./providerDischargeCardTemplateSync";
import { ENTERPRISE_DIAGNOSTIC_GOVERNANCE_COUNTS } from "./enterpriseDiagnosticGovernanceCounts";
import { composePsychiatricBehavioralDischargeGuidance } from "./psychiatricBehavioralCompositeDischargeGuidance";

import { resolveProviderDischargeTemplateForDiagnosis } from "./providerDischargeTemplateRegistry";

/** Affirmative certainty phrases engines must not auto-emit (advisory "Do not …" text excluded). */
const ENGINE_AUTO_FORBIDDEN_MDM_PATTERNS = [
  /\bmedically cleared\b/i,
  /\btroponin negative\b/i,
  /\blungs clear\b/i,
  /\bappendicitis ruled out\b/i,
  /\bpe ruled out\b/i,
  /\bno acute process\b/i,
] as const;

describe("enterpriseDiagnosticIntelligenceCertification — Phase 19 Commit 1", () => {
  it("derives stable visible template count from PROVIDER_DOCUMENTATION_TEMPLATES", () => {
    expect(ENTERPRISE_DIAGNOSTIC_GOVERNANCE_COUNTS.visibleTemplates).toBe(
      PROVIDER_DOCUMENTATION_TEMPLATES.length
    );
    expect(ENTERPRISE_DIAGNOSTIC_GOVERNANCE_COUNTS.visibleTemplates).toBe(172);
  });

  it("keeps Phase 19 visible template surface at BATCH28 only (6 psych templates; no BATCH29)", () => {
    expect(BATCH28_PSYCHIATRIC_BEHAVIORAL_CAPACITY_COMPLAINT_TEMPLATE_IDS).toHaveLength(6);
    expect(ENTERPRISE_DIAGNOSTIC_GOVERNANCE_COUNTS.batch28PsychTemplates).toBe(6);
    expect(
      PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => /^batch29_/i.test(template.id))
    ).toBe(false);
  });

  it("maps every visible template id to a catalog entry exactly once", () => {
    const ids = PROVIDER_DOCUMENTATION_TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const template of PROVIDER_DOCUMENTATION_TEMPLATES) {
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.filter((row) => row.id === template.id)).toHaveLength(1);
    }
  });

  it("provides complaint intel for every catalog template with complaintIntelligence (incl. adult_seizure)", () => {
    const templatesWithIntel = PROVIDER_DOCUMENTATION_TEMPLATES.filter(
      (template) => template.complaintIntelligence
    );
    expect(templatesWithIntel.length).toBeGreaterThan(0);
    for (const template of templatesWithIntel) {
      expect(COMPLAINT_INTEL_BY_TEMPLATE_ID[template.id]).toBeDefined();
    }
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.adult_seizure).toBeDefined();
  });

  it("maintains unique discharge condition family ids", () => {
    const familyIds = CLINICAL_CONDITION_FAMILY_DEFINITIONS.map((family) => family.id);
    const duplicates = familyIds.filter((id, index) => familyIds.indexOf(id) !== index);
    expect(duplicates).toEqual([]);
    expect(ENTERPRISE_DIAGNOSTIC_GOVERNANCE_COUNTS.dischargeFamiliesUnique).toBe(familyIds.length);
  });

  it("routes known ownership regressions deterministically", () => {
    const kidneyStone = resolveClinicalConditionFamily({ code: "N20.0", displayName: "Kidney stone" });
    expect(kidneyStone.familyId).toBe("kidney_stone");
    expect(kidneyStone.templateId).toBe("kidney_stone_v1");

    const fournier = resolveProviderDischargeTemplateForDiagnosis({
      code: "N49.3",
      displayName: "Fournier gangrene",
    });
    expect(fournier.template.id).toBe("necrotizing_soft_tissue_infection_post_acute_v1");

    const delirium = resolveProviderDischargeTemplateForDiagnosis({ code: "F05", displayName: "Delirium" });
    const psychosis = resolveProviderDischargeTemplateForDiagnosis({ code: "F29", displayName: "Psychosis" });
    expect(delirium.template.id).toBe("delirium_post_acute_v1");
    expect(psychosis.template.id).toBe("psychosis_post_acute_v1");

    const postpartumPsych = resolveProviderDischargeTemplateForDiagnosis({
      code: "F53.1",
      displayName: "Postpartum psychosis",
    });
    expect(postpartumPsych.template.id).toBe("postpartum_psychiatric_crisis_post_acute_v1");

    const intentionalOd = resolveToxicIngestionOverdoseContext({
      displayName: "Intentional overdose with suicidal ideation",
      code: "T50.902A",
    });
    expect(intentionalOd.branches).toContain("intentional_overdose");
    expect(intentionalOd.psychiatricLinkageAdvisory).toBe(true);
  });

  it("resolves duplicate E11.65 icdExact owners deterministically to diabetes_hyperglycemia", () => {
    const first = resolveClinicalConditionFamily({ code: "E11.65", displayName: "Hyperglycemia" });
    const second = resolveClinicalConditionFamily({ code: "E11.65", displayName: "Hyperglycemia" });
    expect(first.familyId).toBe(second.familyId);
    expect(first.familyId).toBe("diabetes_hyperglycemia");
    expect(first.templateId).toBe("hyperglycemia_v1");
  });

  it("does not auto-generate forbidden unsupported MDM phrases from engines (sample)", () => {
    const engineOutputs = [
      resolvePsychiatricBehavioralRedFlags({
        displayName: "Active suicidal ideation with plan and access to lethal means",
      }).prompts.join(" "),
      composePsychiatricBehavioralDischargeGuidance([
        { code: "F05", displayName: "Delirium", isPrimary: true },
        { code: "R45.1", displayName: "Agitation", isPrimary: false },
      ]).returnPrecautions,
    ];
    for (const text of engineOutputs) {
      for (const pattern of ENGINE_AUTO_FORBIDDEN_MDM_PATTERNS) {
        expect(pattern.test(text), `forbidden auto-MDM phrase in engine output: ${pattern}`).toBe(false);
      }
    }
    expect(COMPLAINT_INTELLIGENCE_UNSAFE_PHRASE_RULES.length).toBeGreaterThan(20);
  });

  it("keeps red-flag engines advisory-only without order payloads (smoke)", () => {
    const redFlags = resolvePsychiatricBehavioralRedFlags({
      displayName: "Active suicidal ideation with plan and access to lethal means",
    });
    expect(redFlags.categories.length).toBeGreaterThan(0);
    expect(Object.keys(redFlags)).toEqual(["categories", "prompts"]);
    expect(JSON.stringify(redFlags)).not.toMatch(/createOrder|orderLine|medicationOrder/i);
  });

  it("documents 5150/302 as recognition tokens only (facility-configurable holds)", () => {
    expect(parseBehavioralHealthFromText("Patient on 5150 hold per chart.").legalStatusReported).toBe(true);
    expect(parseBehavioralHealthFromText("302 certification documented.").legalStatusReported).toBe(true);
    expect(parseBehavioralHealthFromText("No legal hold documented.").legalStatusReported).toBe(false);
  });

  it("records known nonblocking limitation: crisis discharge copy may reference 911 (hash-governed)", () => {
    // EN/FR psychiatric discharge suggested text is hash-governed in edDisposition19Y.test.ts;
    // facility-neutral crisis numbers deferred to avoid mass hash churn in Commit 1.
    expect(COMMON_DIAGNOSES.length).toBe(ENTERPRISE_DIAGNOSTIC_GOVERNANCE_COUNTS.commonDiagnoses);
  });

  it("preserves discharge diagnosis creation identity immutability on card materialization", () => {
    const form = emptyProviderDischargeDocumentationForm();
    const ref = {
      encounterDiagnosisId: "dx-enterprise-immutability",
      code: "J45.901",
      label: "Asthma exacerbation",
      isPrimary: true,
    };
    const card = ensureProviderDischargeCardForRef(form, ref, {
      applyTemplate: true,
      locale: "en",
      isPrimary: true,
      displayOrder: 0,
    });
    expect(card.resolvedDiagnosisCodeAtCreation).toBe("J45.901");
    expect(card.resolvedDiagnosisLabelAtCreation).toBe("Asthma exacerbation");
    expect(card.resolvedTemplateIdAtCreation).toBe("asthma_exacerbation_v1");
    expect(card.cardTemplateSyncVersion).toBe(PROVIDER_DISCHARGE_CARD_TEMPLATE_SYNC_VERSION);
  });
});
