import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  ABDOMINAL_COMPLAINT_INTEL,
  BATCH1_COMPLAINT_TEMPLATE_IDS,
  BATCH2_COMPLAINT_TEMPLATE_IDS,
  CHEST_PAIN_COMPLAINT_INTEL,
  COMPLAINT_INTEL_BY_TEMPLATE_ID,
  COMPLAINT_INTEL_TEMPLATE_IDS,
  DIZZINESS_SYNCOPE_COMPLAINT_INTEL,
  FLANK_PAIN_COMPLAINT_INTEL,
  complaintIntelligenceHasDuplicateKeys,
  flattenComplaintIntelligenceKeys,
  HEADACHE_COMPLAINT_INTEL,
  PSYCHIATRIC_BEHAVIORAL_COMPLAINT_INTEL,
  SOB_COMPLAINT_INTEL,
  STROKE_SYMPTOMS_COMPLAINT_INTEL,
  WEAKNESS_COMPLAINT_INTEL,
  BATCH3_COMPLAINT_TEMPLATE_IDS,
  BATCH4_COMPLAINT_TEMPLATE_IDS,
  BATCH5_COMPLAINT_TEMPLATE_IDS,
  BATCH6_COMPLAINT_TEMPLATE_IDS,
  URI_RESPIRATORY_COMPLAINT_INTEL,
  FEVER_COMPLAINT_INTEL,
  COUGH_COMPLAINT_INTEL,
  ASTHMA_WHEEZING_COMPLAINT_INTEL,
  PEDIATRIC_FEVER_COMPLAINT_INTEL,
  PEDIATRIC_ABDOMINAL_PAIN_COMPLAINT_INTEL,
  PEDIATRIC_ASTHMA_WHEEZING_COMPLAINT_INTEL,
  PEDIATRIC_VOMITING_DIARRHEA_COMPLAINT_INTEL,
  UTI_URINARY_SYMPTOMS_COMPLAINT_INTEL,
  HYPERGLYCEMIA_COMPLAINT_INTEL,
  HYPERTENSION_COMPLAINT_INTEL,
  ALLERGIC_REACTION_RASH_COMPLAINT_INTEL,
  BATCH7_COMPLAINT_TEMPLATE_IDS,
  BATCH8_COMPLAINT_TEMPLATE_IDS,
  ADULT_NAUSEA_VOMITING_COMPLAINT_INTEL,
  ADULT_DIARRHEA_COMPLAINT_INTEL,
  MEDICATION_REFILL_COMPLAINT_INTEL,
  OBSERVATION_REASSESSMENT_COMPLAINT_INTEL,
  BATCH9_COMPLAINT_TEMPLATE_IDS,
  MVC_COLLISION_COMPLAINT_INTEL,
  ASSAULT_TRAUMA_COMPLAINT_INTEL,
  NECK_PAIN_TRAUMA_COMPLAINT_INTEL,
  BACK_PAIN_TRAUMA_COMPLAINT_INTEL,
  BATCH10_COMPLAINT_TEMPLATE_IDS,
  CRUSH_INJURY_COMPLAINT_INTEL,
  PENETRATING_INJURY_COMPLAINT_INTEL,
  BURN_INJURY_COMPLAINT_INTEL,
  PEDIATRIC_TRAUMA_COMPLAINT_INTEL,
  MALE_GENITAL_COMPLAINT_INTEL,
  FEMALE_PELVIC_GYN_COMPLAINT_INTEL,
  FALL_COMPLAINT_INTEL,
  HEAD_INJURY_COMPLAINT_INTEL,
  LACERATION_COMPLAINT_INTEL,
  FRACTURE_CONCERN_COMPLAINT_INTEL,
} from "./providerDocumentationComplaintIntelligence";
import {
  applyProviderDocumentationTemplate,
  buildProviderDocumentationPreviewSections,
  buildProviderDocumentationSavePayload,
  buildProviderDocumentationMetadata,
  emptyProviderDocumentationWorkspaceState,
  PROVIDER_DOCUMENTATION_TEMPLATES,
} from "./providerDocumentationModel";

describe("provider documentation complaint intelligence (19N.3 Batch 1)", () => {
  it("maps Batch 1 templates to complaint intelligence bundles", () => {
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.chest_pain).toBe(CHEST_PAIN_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.sob).toBe(SOB_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.abdominal_pain).toBe(ABDOMINAL_COMPLAINT_INTEL);
  });

  it("includes full Batch 1 chip coverage per complaint category", () => {
    expect(CHEST_PAIN_COMPLAINT_INTEL.hpi?.length).toBeGreaterThanOrEqual(20);
    expect(CHEST_PAIN_COMPLAINT_INTEL.rosImportantPositives?.length).toBeGreaterThanOrEqual(7);
    expect(CHEST_PAIN_COMPLAINT_INTEL.rosImportantNegatives?.length).toBeGreaterThanOrEqual(5);
    expect(CHEST_PAIN_COMPLAINT_INTEL.mdmDifferentialSynthesis?.length).toBeGreaterThanOrEqual(10);
    expect(SOB_COMPLAINT_INTEL.hpi?.length).toBeGreaterThanOrEqual(15);
    expect(ABDOMINAL_COMPLAINT_INTEL.mdmDifferentialSynthesis?.length).toBeGreaterThanOrEqual(10);
    for (const bundle of [CHEST_PAIN_COMPLAINT_INTEL, SOB_COMPLAINT_INTEL, ABDOMINAL_COMPLAINT_INTEL]) {
      expect(bundle.reassessment?.length).toBeGreaterThan(0);
      expect(bundle.followUpDisposition?.length).toBeGreaterThan(0);
      expect(Object.values(bundle.physicalExam ?? {}).flat().length).toBeGreaterThan(0);
    }
  });

  it("does not auto-insert complaint intelligence on template apply", () => {
    for (const templateId of BATCH1_COMPLAINT_TEMPLATE_IDS) {
      const next = applyProviderDocumentationTemplate({
        state: emptyProviderDocumentationWorkspaceState(),
        templateId,
        resolveFragment: (key) => key,
      });
      expect(JSON.stringify(next)).not.toContain("providerDocumentationComplaintIntel");
    }
  });

  it("prevents cross-template intelligence leakage by key namespace", () => {
    const chestKeys = flattenComplaintIntelligenceKeys(CHEST_PAIN_COMPLAINT_INTEL);
    const sobKeys = flattenComplaintIntelligenceKeys(SOB_COMPLAINT_INTEL);
    const abdominalKeys = flattenComplaintIntelligenceKeys(ABDOMINAL_COMPLAINT_INTEL);
    for (const key of chestKeys) expect(key).toContain(".chestPain.");
    for (const key of sobKeys) expect(key).toContain(".sob.");
    for (const key of abdominalKeys) expect(key).toContain(".abdominal.");
    expect(chestKeys.some((key) => sobKeys.includes(key))).toBe(false);
    expect(sobKeys.some((key) => abdominalKeys.includes(key))).toBe(false);
  });

  it("attaches complaint intelligence only to intelligence-enabled templates in catalog", () => {
    for (const template of PROVIDER_DOCUMENTATION_TEMPLATES) {
      if (COMPLAINT_INTEL_TEMPLATE_IDS.includes(template.id as (typeof COMPLAINT_INTEL_TEMPLATE_IDS)[number])) {
        expect(template.complaintIntelligence).toBeDefined();
      } else {
        expect(template.complaintIntelligence).toBeUndefined();
      }
    }
  });

  it("catalog Batch 1 templates expose expected intelligence entry points", () => {
    const chest = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "chest_pain");
    const sob = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "sob");
    const abdominal = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "abdominal_pain");
    expect(chest?.complaintIntelligence?.hpi).toContain(
      "providerDocumentationComplaintIntel.chestPain.hpiWorseningWithExertion"
    );
    expect(chest?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.chestPain.diffStemi"
    );
    expect(sob?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.sob.diffPulmonaryEmbolism"
    );
    expect(abdominal?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.abdominal.diffAppendicitis"
    );
    expect(chest?.promptReminderKeys).toContain("providerDocumentationPromptReminders.chestPainHeartScoreReminder");
    expect(sob?.promptReminderKeys).toContain("providerDocumentationPromptReminders.sobWorkupReminder");
    expect(abdominal?.promptReminderKeys).toContain("providerDocumentationPromptReminders.adultAbdominalRedFlags");
  });

  it("renders click-only complaint intelligence panels inside accordion workspace", () => {
    const source = readFileSync(
      new URL("../components/encounters/ProviderDocumentationWorkspace.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toContain("complaintIntelligenceFieldChips");
    expect(source).toContain("complaintIntelligenceExamChips");
    expect(source).toContain("complaintIntelligenceReassessmentChips");
    expect(source).toContain("complaintIntelligenceDispositionChips");
    expect(source).toContain("ProviderDocumentationChipPanel");
    expect(source).toContain("ProviderDocumentationAccordionSection");
    expect(source).not.toMatch(/complaintIntelligence[\s\S]{0,120}applyProviderDocumentationTemplate/);
  });

  it("preserves save payload and preview without billing or complaint-intel auto-insert", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "Provider-authored HPI";
    state.mdmDifferentialSynthesis = "ACS considered; PE considered";
    const payload = buildProviderDocumentationSavePayload({
      previousNursingAssessment: {},
      state,
      metadata: buildProviderDocumentationMetadata({
        encounterMode: "ED",
        savedAt: "2026-05-18T12:00:00.000Z",
        savedBy: "Dr Test",
        activeTemplateId: "chest_pain",
      }),
    });
    const preview = buildProviderDocumentationPreviewSections(state).flatMap((section) => section.lines).join("\n");
    expect(JSON.stringify(payload)).not.toMatch(/billingLevel|CPT|autoBill|chargeCapture/i);
    expect(JSON.stringify(payload)).not.toContain("providerDocumentationComplaintIntel");
    expect(preview).toContain("Provider-authored HPI");
    expect(preview).toContain("ACS considered");
  });

  it("uses i18n keys for all Batch 1 complaint intelligence fragments", () => {
    for (const bundle of [CHEST_PAIN_COMPLAINT_INTEL, SOB_COMPLAINT_INTEL, ABDOMINAL_COMPLAINT_INTEL]) {
      for (const key of flattenComplaintIntelligenceKeys(bundle)) {
        expect(key.startsWith("providerDocumentationComplaintIntel.")).toBe(true);
      }
    }
    expect(JSON.stringify(CHEST_PAIN_COMPLAINT_INTEL)).not.toMatch(/billingLevel|CPT|autoBill|chargeCapture/i);
  });
});

describe("provider documentation complaint intelligence (19N.5 Batch 2)", () => {
  it("maps Batch 2 templates to complaint intelligence bundles", () => {
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.stroke_symptoms).toBe(STROKE_SYMPTOMS_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.headache).toBe(HEADACHE_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.dizziness_syncope).toBe(DIZZINESS_SYNCOPE_COMPLAINT_INTEL);
  });

  it("includes full Batch 2 chip coverage per complaint category", () => {
    expect(STROKE_SYMPTOMS_COMPLAINT_INTEL.hpi?.length).toBeGreaterThanOrEqual(15);
    expect(STROKE_SYMPTOMS_COMPLAINT_INTEL.mdmDifferentialSynthesis?.length).toBeGreaterThanOrEqual(8);
    expect(HEADACHE_COMPLAINT_INTEL.hpi?.length).toBeGreaterThanOrEqual(15);
    expect(HEADACHE_COMPLAINT_INTEL.mdmDifferentialSynthesis?.length).toBeGreaterThanOrEqual(10);
    expect(DIZZINESS_SYNCOPE_COMPLAINT_INTEL.hpi?.length).toBeGreaterThanOrEqual(15);
    expect(DIZZINESS_SYNCOPE_COMPLAINT_INTEL.mdmDifferentialSynthesis?.length).toBeGreaterThanOrEqual(10);
    for (const bundle of [
      STROKE_SYMPTOMS_COMPLAINT_INTEL,
      HEADACHE_COMPLAINT_INTEL,
      DIZZINESS_SYNCOPE_COMPLAINT_INTEL,
    ]) {
      expect(bundle.rosImportantPositives?.length).toBeGreaterThan(0);
      expect(bundle.rosImportantNegatives?.length).toBeGreaterThan(0);
      expect(bundle.rosRedFlags?.length).toBeGreaterThan(0);
      expect(bundle.reassessment?.length).toBeGreaterThan(0);
      expect(bundle.followUpDisposition?.length).toBeGreaterThan(0);
      expect(Object.values(bundle.physicalExam ?? {}).flat().length).toBeGreaterThan(0);
      expect(bundle.mdmWorkingAssessment?.length).toBeGreaterThan(0);
      expect(bundle.mdmDataReviewed?.length).toBeGreaterThan(0);
      expect(bundle.mdmClinicalRationale?.length).toBeGreaterThan(0);
    }
  });

  it("does not auto-insert Batch 2 complaint intelligence on template apply", () => {
    for (const templateId of BATCH2_COMPLAINT_TEMPLATE_IDS) {
      const next = applyProviderDocumentationTemplate({
        state: emptyProviderDocumentationWorkspaceState(),
        templateId,
        resolveFragment: (key) => key,
      });
      expect(JSON.stringify(next)).not.toContain("providerDocumentationComplaintIntel");
    }
  });

  it("prevents cross-template intelligence leakage by key namespace", () => {
    const strokeKeys = flattenComplaintIntelligenceKeys(STROKE_SYMPTOMS_COMPLAINT_INTEL);
    const headacheKeys = flattenComplaintIntelligenceKeys(HEADACHE_COMPLAINT_INTEL);
    const dizzKeys = flattenComplaintIntelligenceKeys(DIZZINESS_SYNCOPE_COMPLAINT_INTEL);
    for (const key of strokeKeys) expect(key).toContain(".stroke.");
    for (const key of headacheKeys) expect(key).toContain(".headache.");
    for (const key of dizzKeys) expect(key).toContain(".dizzinessSyncope.");
    expect(strokeKeys.some((key) => headacheKeys.includes(key))).toBe(false);
    expect(headacheKeys.some((key) => dizzKeys.includes(key))).toBe(false);
  });

  it("catalog Batch 2 templates expose expected intelligence entry points", () => {
    const stroke = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "stroke_symptoms");
    const headache = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "headache");
    const dizz = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "dizziness_syncope");
    expect(stroke?.complaintIntelligence?.hpi).toContain(
      "providerDocumentationComplaintIntel.stroke.hpiLastKnownWellReviewed"
    );
    expect(stroke?.complaintIntelligence?.physicalExam?.neuroPsych).toContain(
      "providerDocumentationComplaintIntel.stroke.examNihssPerformed"
    );
    expect(stroke?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.stroke.diffBellPalsy"
    );
    expect(headache?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.headache.diffPostTraumaticHeadache"
    );
    expect(dizz?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.dizzinessSyncope.diffBenignParoxysmalPositionalVertigo"
    );
    expect(stroke?.complaintIntelligence?.reassessment?.length).toBeGreaterThanOrEqual(4);
    expect(headache?.complaintIntelligence?.followUpDisposition?.length).toBeGreaterThanOrEqual(5);
    expect(dizz?.complaintIntelligence?.followUpDisposition?.length).toBeGreaterThanOrEqual(5);
    expect(stroke?.promptReminderKeys).toContain("providerDocumentationPromptReminders.adultStrokeTimeSensitive");
    expect(headache?.promptReminderKeys).toContain("providerDocumentationPromptReminders.adultHeadacheRedFlags");
    expect(dizz?.promptReminderKeys).toContain("providerDocumentationPromptReminders.adultSyncopeWorkup");
    expect(headache?.promptReminderKeys).not.toContain("providerDocumentationPromptReminders.chestPainHeartScoreReminder");
  });

  it("keeps Batch 2 intelligence free of other complaint namespaces", () => {
    for (const bundle of [
      STROKE_SYMPTOMS_COMPLAINT_INTEL,
      HEADACHE_COMPLAINT_INTEL,
      DIZZINESS_SYNCOPE_COMPLAINT_INTEL,
    ]) {
      const keys = flattenComplaintIntelligenceKeys(bundle);
      expect(keys.some((key) => key.includes(".chestPain."))).toBe(false);
      expect(keys.some((key) => key.includes(".abdominal."))).toBe(false);
      expect(keys.some((key) => key.includes(".sob."))).toBe(false);
    }
  });

  it("does not duplicate intelligence fragment keys within a Batch 2 bundle", () => {
    for (const bundle of [
      STROKE_SYMPTOMS_COMPLAINT_INTEL,
      HEADACHE_COMPLAINT_INTEL,
      DIZZINESS_SYNCOPE_COMPLAINT_INTEL,
    ]) {
      expect(complaintIntelligenceHasDuplicateKeys(bundle)).toBe(false);
    }
  });

  it("leaves Batch 1 intelligence bundles unchanged", () => {
    expect(CHEST_PAIN_COMPLAINT_INTEL.hpi).toContain(
      "providerDocumentationComplaintIntel.chestPain.hpiWorseningWithExertion"
    );
    expect(SOB_COMPLAINT_INTEL.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.sob.diffPulmonaryEmbolism"
    );
    expect(ABDOMINAL_COMPLAINT_INTEL.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.abdominal.diffAppendicitis"
    );
    expect(complaintIntelligenceHasDuplicateKeys(CHEST_PAIN_COMPLAINT_INTEL)).toBe(false);
  });

  it("uses i18n keys for all Batch 2 complaint intelligence fragments", () => {
    for (const bundle of [
      STROKE_SYMPTOMS_COMPLAINT_INTEL,
      HEADACHE_COMPLAINT_INTEL,
      DIZZINESS_SYNCOPE_COMPLAINT_INTEL,
    ]) {
      for (const key of flattenComplaintIntelligenceKeys(bundle)) {
        expect(key.startsWith("providerDocumentationComplaintIntel.")).toBe(true);
      }
    }
    expect(JSON.stringify(STROKE_SYMPTOMS_COMPLAINT_INTEL)).not.toMatch(/billingLevel|CPT|autoBill|chargeCapture/i);
  });

  it("preserves chip toggle wiring for complaint intelligence panels", () => {
    const source = readFileSync(
      new URL("../components/encounters/ProviderDocumentationWorkspace.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toContain("toggleDocumentationFragment");
    expect(source).toContain("aria-pressed");
    expect(source).toContain("complaintIntelligenceReassessmentChips");
    expect(source).toContain("complaintIntelligenceDispositionChips");
  });
});

describe("provider documentation complaint intelligence (19N.6 Batch 3)", () => {
  it("maps Batch 3 templates to complaint intelligence bundles", () => {
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.psychiatric_behavioral).toBe(PSYCHIATRIC_BEHAVIORAL_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.weakness).toBe(WEAKNESS_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.flank_pain).toBe(FLANK_PAIN_COMPLAINT_INTEL);
  });

  it("includes all 7 required intelligence categories per Batch 3 template", () => {
    for (const bundle of [
      PSYCHIATRIC_BEHAVIORAL_COMPLAINT_INTEL,
      WEAKNESS_COMPLAINT_INTEL,
      FLANK_PAIN_COMPLAINT_INTEL,
    ]) {
      expect(bundle.hpi?.length).toBeGreaterThan(0);
      expect(bundle.rosImportantPositives?.length).toBeGreaterThan(0);
      expect(bundle.rosImportantNegatives?.length).toBeGreaterThan(0);
      expect(bundle.rosRedFlags?.length).toBeGreaterThan(0);
      expect(Object.values(bundle.physicalExam ?? {}).flat().length).toBeGreaterThan(0);
      expect(bundle.mdmDifferentialSynthesis?.length).toBeGreaterThan(0);
      expect(bundle.mdmWorkingAssessment?.length).toBeGreaterThan(0);
      expect(bundle.reassessment?.length).toBeGreaterThan(0);
      expect(bundle.followUpDisposition?.length).toBeGreaterThan(0);
    }
  });

  it("does not auto-insert Batch 3 complaint intelligence on template apply", () => {
    for (const templateId of BATCH3_COMPLAINT_TEMPLATE_IDS) {
      const next = applyProviderDocumentationTemplate({
        state: emptyProviderDocumentationWorkspaceState(),
        templateId,
        resolveFragment: (key) => key,
      });
      expect(JSON.stringify(next)).not.toContain("providerDocumentationComplaintIntel");
    }
  });

  it("prevents cross-template intelligence leakage by key namespace", () => {
    const psychKeys = flattenComplaintIntelligenceKeys(PSYCHIATRIC_BEHAVIORAL_COMPLAINT_INTEL);
    const weaknessKeys = flattenComplaintIntelligenceKeys(WEAKNESS_COMPLAINT_INTEL);
    const flankKeys = flattenComplaintIntelligenceKeys(FLANK_PAIN_COMPLAINT_INTEL);
    for (const key of psychKeys) expect(key).toContain(".psychiatricBehavioral.");
    for (const key of weaknessKeys) expect(key).toContain(".weakness.");
    for (const key of flankKeys) expect(key).toContain(".flankPain.");
    expect(psychKeys.some((key) => weaknessKeys.includes(key))).toBe(false);
    expect(weaknessKeys.some((key) => flankKeys.includes(key))).toBe(false);
  });

  it("keeps Batch 3 intelligence free of other complaint namespaces", () => {
    const foreignNamespaces = [
      ".chestPain.",
      ".abdominal.",
      ".sob.",
      ".stroke.",
      ".headache.",
      ".dizzinessSyncope.",
    ];
    for (const bundle of [
      PSYCHIATRIC_BEHAVIORAL_COMPLAINT_INTEL,
      WEAKNESS_COMPLAINT_INTEL,
      FLANK_PAIN_COMPLAINT_INTEL,
    ]) {
      const keys = flattenComplaintIntelligenceKeys(bundle);
      for (const ns of foreignNamespaces) {
        expect(keys.some((key) => key.includes(ns))).toBe(false);
      }
    }
  });

  it("does not leak complaint-specific chips across Batch 3 templates", () => {
    const psychKeys = flattenComplaintIntelligenceKeys(PSYCHIATRIC_BEHAVIORAL_COMPLAINT_INTEL);
    const weaknessKeys = flattenComplaintIntelligenceKeys(WEAKNESS_COMPLAINT_INTEL);
    const flankKeys = flattenComplaintIntelligenceKeys(FLANK_PAIN_COMPLAINT_INTEL);
    expect(psychKeys.some((key) => key.includes(".flankPain."))).toBe(false);
    expect(weaknessKeys.some((key) => key.includes(".psychiatricBehavioral."))).toBe(false);
    expect(flankKeys.some((key) => key.includes(".stroke."))).toBe(false);
    expect(flankKeys.some((key) => key.includes(".chestPain."))).toBe(false);
  });

  it("does not duplicate intelligence fragment keys within a Batch 3 bundle", () => {
    for (const bundle of [
      PSYCHIATRIC_BEHAVIORAL_COMPLAINT_INTEL,
      WEAKNESS_COMPLAINT_INTEL,
      FLANK_PAIN_COMPLAINT_INTEL,
    ]) {
      expect(complaintIntelligenceHasDuplicateKeys(bundle)).toBe(false);
    }
  });

  it("catalog Batch 3 templates expose expected intelligence entry points", () => {
    const psych = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "psychiatric_behavioral");
    const weakness = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "weakness");
    const flank = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "flank_pain");
    expect(psych?.complaintIntelligence?.hpi).toContain(
      "providerDocumentationComplaintIntel.psychiatricBehavioral.hpiSuicidalIdeationReported"
    );
    expect(weakness?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.weakness.diffStrokeTia"
    );
    expect(flank?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.flankPain.diffRenalColic"
    );
    expect(psych?.complaintIntelligence?.reassessment?.length).toBeGreaterThanOrEqual(5);
    expect(weakness?.complaintIntelligence?.followUpDisposition?.length).toBeGreaterThanOrEqual(5);
    expect(flank?.complaintIntelligence?.followUpDisposition?.length).toBeGreaterThanOrEqual(5);
    expect(psych?.promptReminderKeys).toContain("providerDocumentationPromptReminders.adultPsychSafetyRisk");
    expect(weakness?.promptReminderKeys).toContain("providerDocumentationPromptReminders.adultWeaknessWorkup");
    expect(flank?.promptReminderKeys).toContain("providerDocumentationPromptReminders.adultFlankPainWorkup");
    expect(flank?.promptReminderKeys).not.toContain("providerDocumentationPromptReminders.chestPainHeartScoreReminder");
  });

  it("leaves Batch 1 and Batch 2 intelligence bundles unchanged", () => {
    expect(STROKE_SYMPTOMS_COMPLAINT_INTEL.hpi).toContain(
      "providerDocumentationComplaintIntel.stroke.hpiLastKnownWellReviewed"
    );
    expect(CHEST_PAIN_COMPLAINT_INTEL.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.chestPain.diffStemi"
    );
    expect(HEADACHE_COMPLAINT_INTEL.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.headache.diffSubarachnoidHemorrhage"
    );
  });

  it("uses i18n keys for all Batch 3 complaint intelligence fragments", () => {
    for (const bundle of [
      PSYCHIATRIC_BEHAVIORAL_COMPLAINT_INTEL,
      WEAKNESS_COMPLAINT_INTEL,
      FLANK_PAIN_COMPLAINT_INTEL,
    ]) {
      for (const key of flattenComplaintIntelligenceKeys(bundle)) {
        expect(key.startsWith("providerDocumentationComplaintIntel.")).toBe(true);
      }
    }
    expect(JSON.stringify(PSYCHIATRIC_BEHAVIORAL_COMPLAINT_INTEL)).not.toMatch(
      /billingLevel|CPT|autoBill|chargeCapture/i
    );
  });

  it("preserves chip toggle wiring for Batch 3 complaint intelligence panels", () => {
    const source = readFileSync(
      new URL("../components/encounters/ProviderDocumentationWorkspace.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toContain("toggleDocumentationFragment");
    expect(source).toContain("complaintIntelligenceReassessmentChips");
    expect(source).toContain("complaintIntelligenceDispositionChips");
  });
});

describe("provider documentation complaint intelligence (19N.7 Batch 4)", () => {
  it("maps Batch 4 templates to complaint intelligence bundles", () => {
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.adult_uri_respiratory).toBe(URI_RESPIRATORY_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.uri_respiratory).toBe(URI_RESPIRATORY_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.cough).toBe(COUGH_COMPLAINT_INTEL);
  });

  it("includes all 7 required intelligence categories per Batch 4 template", () => {
    for (const bundle of [URI_RESPIRATORY_COMPLAINT_INTEL, COUGH_COMPLAINT_INTEL]) {
      expect(bundle.hpi?.length).toBeGreaterThan(0);
      expect(bundle.rosImportantPositives?.length).toBeGreaterThan(0);
      expect(bundle.rosImportantNegatives?.length).toBeGreaterThan(0);
      expect(bundle.rosRedFlags?.length).toBeGreaterThan(0);
      expect(Object.values(bundle.physicalExam ?? {}).flat().length).toBeGreaterThan(0);
      expect(bundle.mdmDifferentialSynthesis?.length).toBeGreaterThan(0);
      expect(bundle.mdmWorkingAssessment?.length).toBeGreaterThan(0);
      expect(bundle.reassessment?.length).toBeGreaterThan(0);
      expect(bundle.followUpDisposition?.length).toBeGreaterThan(0);
    }
  });

  it("does not auto-insert Batch 4 complaint intelligence on template apply", () => {
    for (const templateId of BATCH4_COMPLAINT_TEMPLATE_IDS) {
      const next = applyProviderDocumentationTemplate({
        state: emptyProviderDocumentationWorkspaceState(),
        templateId,
        resolveFragment: (key) => key,
      });
      expect(JSON.stringify(next)).not.toContain("providerDocumentationComplaintIntel");
    }
  });

  it("prevents cross-template intelligence leakage by key namespace", () => {
    const uriKeys = flattenComplaintIntelligenceKeys(URI_RESPIRATORY_COMPLAINT_INTEL);
    const coughKeys = flattenComplaintIntelligenceKeys(COUGH_COMPLAINT_INTEL);
    for (const key of uriKeys) expect(key).toContain(".uriRespiratory.");
    for (const key of coughKeys) expect(key).toContain(".cough.");
  });

  it("keeps Batch 4 intelligence free of other complaint namespaces", () => {
    const foreignNamespaces = [
      ".chestPain.",
      ".flankPain.",
      ".psychiatricBehavioral.",
      ".stroke.",
      ".weakness.",
    ];
    for (const bundle of [URI_RESPIRATORY_COMPLAINT_INTEL, COUGH_COMPLAINT_INTEL]) {
      const keys = flattenComplaintIntelligenceKeys(bundle);
      for (const ns of foreignNamespaces) {
        expect(keys.some((key) => key.includes(ns))).toBe(false);
      }
    }
  });

  it("does not leak complaint-specific chips across Batch 4 templates", () => {
    const uriKeys = flattenComplaintIntelligenceKeys(URI_RESPIRATORY_COMPLAINT_INTEL);
    const coughKeys = flattenComplaintIntelligenceKeys(COUGH_COMPLAINT_INTEL);
    expect(uriKeys.some((key) => key.includes(".asthmaWheezing.rfSilentChestConcern"))).toBe(false);
    expect(coughKeys.some((key) => key.includes(".chestPain."))).toBe(false);
  });

  it("does not duplicate intelligence fragment keys within a Batch 4 bundle", () => {
    for (const bundle of [URI_RESPIRATORY_COMPLAINT_INTEL, COUGH_COMPLAINT_INTEL]) {
      expect(complaintIntelligenceHasDuplicateKeys(bundle)).toBe(false);
    }
  });

  it("catalog Batch 4 templates expose expected intelligence entry points", () => {
    const uri = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "adult_uri_respiratory");
    const cough = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "cough");
    expect(uri?.complaintIntelligence?.hpi).toContain(
      "providerDocumentationComplaintIntel.uriRespiratory.hpiNasalCongestion"
    );
    expect(cough?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.cough.diffPneumonia"
    );
    expect(uri?.promptReminderKeys).toContain("providerDocumentationPromptReminders.adultUriInfectiousWorkup");
    expect(cough?.promptReminderKeys).toContain("providerDocumentationPromptReminders.coughRespiratoryWorkup");
    expect(cough?.promptReminderKeys).not.toContain("providerDocumentationPromptReminders.chestPainHeartScoreReminder");
  });

  it("leaves Batch 1–3 intelligence bundles unchanged", () => {
    expect(FLANK_PAIN_COMPLAINT_INTEL.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.flankPain.diffRenalColic"
    );
    expect(PSYCHIATRIC_BEHAVIORAL_COMPLAINT_INTEL.hpi).toContain(
      "providerDocumentationComplaintIntel.psychiatricBehavioral.hpiSuicidalIdeationReported"
    );
    expect(STROKE_SYMPTOMS_COMPLAINT_INTEL.hpi).toContain(
      "providerDocumentationComplaintIntel.stroke.hpiLastKnownWellReviewed"
    );
  });

  it("uses i18n keys for all Batch 4 complaint intelligence fragments", () => {
    for (const bundle of [URI_RESPIRATORY_COMPLAINT_INTEL, COUGH_COMPLAINT_INTEL]) {
      for (const key of flattenComplaintIntelligenceKeys(bundle)) {
        expect(key.startsWith("providerDocumentationComplaintIntel.")).toBe(true);
      }
    }
    expect(JSON.stringify(COUGH_COMPLAINT_INTEL)).not.toMatch(/billingLevel|CPT|autoBill|chargeCapture/i);
  });

  it("preserves chip toggle wiring for Batch 4 complaint intelligence panels", () => {
    const source = readFileSync(
      new URL("../components/encounters/ProviderDocumentationWorkspace.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toContain("toggleDocumentationFragment");
    expect(source).toContain("complaintIntelligenceReassessmentChips");
    expect(source).toContain("complaintIntelligenceDispositionChips");
  });
});

describe("provider documentation complaint intelligence (19N.8 Batch 5)", () => {
  it("maps Batch 5 templates to complaint intelligence bundles", () => {
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.fall).toBe(FALL_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.head_injury).toBe(HEAD_INJURY_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.laceration).toBe(LACERATION_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.fracture_concern).toBe(FRACTURE_CONCERN_COMPLAINT_INTEL);
  });

  it("includes all 7 required intelligence categories per Batch 5 template", () => {
    for (const bundle of [
      FALL_COMPLAINT_INTEL,
      HEAD_INJURY_COMPLAINT_INTEL,
      LACERATION_COMPLAINT_INTEL,
      FRACTURE_CONCERN_COMPLAINT_INTEL,
    ]) {
      expect(bundle.hpi?.length).toBeGreaterThan(0);
      expect(bundle.rosImportantPositives?.length).toBeGreaterThan(0);
      expect(bundle.rosImportantNegatives?.length).toBeGreaterThan(0);
      expect(bundle.rosRedFlags?.length).toBeGreaterThan(0);
      expect(Object.values(bundle.physicalExam ?? {}).flat().length).toBeGreaterThan(0);
      expect(bundle.mdmDifferentialSynthesis?.length).toBeGreaterThan(0);
      expect(bundle.mdmWorkingAssessment?.length).toBeGreaterThan(0);
      expect(bundle.reassessment?.length).toBeGreaterThan(0);
      expect(bundle.followUpDisposition?.length).toBeGreaterThan(0);
    }
  });

  it("does not auto-insert Batch 5 complaint intelligence on template apply", () => {
    for (const templateId of BATCH5_COMPLAINT_TEMPLATE_IDS) {
      const next = applyProviderDocumentationTemplate({
        state: emptyProviderDocumentationWorkspaceState(),
        templateId,
        resolveFragment: (key) => key,
      });
      expect(JSON.stringify(next)).not.toContain("providerDocumentationComplaintIntel");
    }
  });

  it("prevents cross-template intelligence leakage by key namespace", () => {
    const fallKeys = flattenComplaintIntelligenceKeys(FALL_COMPLAINT_INTEL);
    const headKeys = flattenComplaintIntelligenceKeys(HEAD_INJURY_COMPLAINT_INTEL);
    const lacKeys = flattenComplaintIntelligenceKeys(LACERATION_COMPLAINT_INTEL);
    const fracKeys = flattenComplaintIntelligenceKeys(FRACTURE_CONCERN_COMPLAINT_INTEL);
    for (const key of fallKeys) expect(key).toContain(".fall.");
    for (const key of headKeys) expect(key).toContain(".headInjury.");
    for (const key of lacKeys) expect(key).toContain(".laceration.");
    for (const key of fracKeys) expect(key).toContain(".fractureConcern.");
  });

  it("keeps Batch 5 intelligence free of unrelated complaint namespaces", () => {
    const foreignNamespaces = [
      ".psychiatricBehavioral.",
      ".flankPain.",
      ".stroke.",
      ".chestPain.",
      ".asthmaWheezing.",
      ".fever.",
    ];
    for (const bundle of [
      FALL_COMPLAINT_INTEL,
      HEAD_INJURY_COMPLAINT_INTEL,
      LACERATION_COMPLAINT_INTEL,
      FRACTURE_CONCERN_COMPLAINT_INTEL,
    ]) {
      const keys = flattenComplaintIntelligenceKeys(bundle);
      for (const ns of foreignNamespaces) {
        expect(keys.some((key) => key.includes(ns))).toBe(false);
      }
    }
  });

  it("does not leak complaint-specific chips across Batch 5 templates", () => {
    expect(flattenComplaintIntelligenceKeys(FALL_COMPLAINT_INTEL).some((k) => k.includes(".psychiatricBehavioral."))).toBe(false);
    expect(flattenComplaintIntelligenceKeys(FALL_COMPLAINT_INTEL).some((k) => k.includes(".flankPain."))).toBe(false);
    expect(flattenComplaintIntelligenceKeys(HEAD_INJURY_COMPLAINT_INTEL).some((k) => k.includes(".chestPain."))).toBe(false);
    expect(flattenComplaintIntelligenceKeys(LACERATION_COMPLAINT_INTEL).some((k) => k.includes(".asthmaWheezing."))).toBe(false);
    expect(flattenComplaintIntelligenceKeys(LACERATION_COMPLAINT_INTEL).some((k) => k.includes(".uriRespiratory."))).toBe(false);
    expect(flattenComplaintIntelligenceKeys(FRACTURE_CONCERN_COMPLAINT_INTEL).some((k) => k.includes(".fever.diffSepsis"))).toBe(false);
  });

  it("does not duplicate intelligence fragment keys within a Batch 5 bundle", () => {
    for (const bundle of [
      FALL_COMPLAINT_INTEL,
      HEAD_INJURY_COMPLAINT_INTEL,
      LACERATION_COMPLAINT_INTEL,
      FRACTURE_CONCERN_COMPLAINT_INTEL,
    ]) {
      expect(complaintIntelligenceHasDuplicateKeys(bundle)).toBe(false);
    }
  });

  it("catalog Batch 5 templates expose expected intelligence entry points", () => {
    const fall = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "fall");
    const head = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "head_injury");
    const lac = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "laceration");
    const frac = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "fracture_concern");
    expect(fall?.complaintIntelligence?.hpi).toContain("providerDocumentationComplaintIntel.fall.hpiMechanicalFall");
    expect(head?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.headInjury.diffConcussion"
    );
    expect(lac?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.laceration.diffSimpleLaceration"
    );
    expect(frac?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.fractureConcern.diffFracture"
    );
    expect(fall?.promptReminderKeys).toContain("providerDocumentationPromptReminders.traumaFallSyncopeReminder");
    expect(head?.promptReminderKeys).toContain("providerDocumentationPromptReminders.traumaHeadInjuryRedFlags");
    expect(lac?.promptReminderKeys).toContain("providerDocumentationPromptReminders.traumaLacerationWoundCare");
    expect(frac?.promptReminderKeys).toContain("providerDocumentationPromptReminders.traumaFractureOrthopedicReminder");
  });

  it("leaves Batch 1–4 intelligence bundles unchanged", () => {
    expect(URI_RESPIRATORY_COMPLAINT_INTEL.hpi).toContain(
      "providerDocumentationComplaintIntel.uriRespiratory.hpiNasalCongestion"
    );
    expect(FLANK_PAIN_COMPLAINT_INTEL.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.flankPain.diffRenalColic"
    );
    expect(STROKE_SYMPTOMS_COMPLAINT_INTEL.hpi).toContain(
      "providerDocumentationComplaintIntel.stroke.hpiLastKnownWellReviewed"
    );
  });

  it("uses i18n keys for all Batch 5 complaint intelligence fragments", () => {
    for (const bundle of [
      FALL_COMPLAINT_INTEL,
      HEAD_INJURY_COMPLAINT_INTEL,
      LACERATION_COMPLAINT_INTEL,
      FRACTURE_CONCERN_COMPLAINT_INTEL,
    ]) {
      for (const key of flattenComplaintIntelligenceKeys(bundle)) {
        expect(key.startsWith("providerDocumentationComplaintIntel.")).toBe(true);
      }
    }
    expect(JSON.stringify(FRACTURE_CONCERN_COMPLAINT_INTEL)).not.toMatch(/billingLevel|CPT|autoBill|chargeCapture/i);
  });

  it("preserves chip toggle wiring for Batch 5 complaint intelligence panels", () => {
    const source = readFileSync(
      new URL("../components/encounters/ProviderDocumentationWorkspace.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toContain("toggleDocumentationFragment");
    expect(source).toContain("complaintIntelligenceReassessmentChips");
    expect(source).toContain("complaintIntelligenceDispositionChips");
  });
});

describe("provider documentation complaint intelligence (19N.9 Batch 6)", () => {
  it("maps Batch 6 pediatric templates to complaint intelligence bundles", () => {
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.fever).toBe(PEDIATRIC_FEVER_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.abdominal_pain_pediatric).toBe(
      PEDIATRIC_ABDOMINAL_PAIN_COMPLAINT_INTEL
    );
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.asthma_wheezing).toBe(PEDIATRIC_ASTHMA_WHEEZING_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.nausea_vomiting).toBe(PEDIATRIC_VOMITING_DIARRHEA_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.diarrhea).toBe(PEDIATRIC_VOMITING_DIARRHEA_COMPLAINT_INTEL);
  });

  it("includes all 7 required intelligence categories per Batch 6 template", () => {
    for (const bundle of [
      PEDIATRIC_FEVER_COMPLAINT_INTEL,
      PEDIATRIC_ABDOMINAL_PAIN_COMPLAINT_INTEL,
      PEDIATRIC_ASTHMA_WHEEZING_COMPLAINT_INTEL,
      PEDIATRIC_VOMITING_DIARRHEA_COMPLAINT_INTEL,
    ]) {
      expect(bundle.hpi?.length).toBeGreaterThan(0);
      expect(bundle.rosImportantPositives?.length).toBeGreaterThan(0);
      expect(bundle.rosImportantNegatives?.length).toBeGreaterThan(0);
      expect(bundle.rosRedFlags?.length).toBeGreaterThan(0);
      expect(Object.values(bundle.physicalExam ?? {}).flat().length).toBeGreaterThan(0);
      expect(bundle.mdmDifferentialSynthesis?.length).toBeGreaterThan(0);
      expect(bundle.mdmWorkingAssessment?.length).toBeGreaterThan(0);
      expect(bundle.reassessment?.length).toBeGreaterThan(0);
      expect(bundle.followUpDisposition?.length).toBeGreaterThan(0);
    }
  });

  it("does not auto-insert Batch 6 complaint intelligence on template apply", () => {
    const templateIds = [...BATCH6_COMPLAINT_TEMPLATE_IDS, "diarrhea"] as const;
    for (const templateId of templateIds) {
      const next = applyProviderDocumentationTemplate({
        state: emptyProviderDocumentationWorkspaceState(),
        templateId,
        resolveFragment: (key) => key,
      });
      expect(JSON.stringify(next)).not.toContain("providerDocumentationComplaintIntel");
    }
  });

  it("prevents cross-template intelligence leakage by key namespace", () => {
    const feverKeys = flattenComplaintIntelligenceKeys(PEDIATRIC_FEVER_COMPLAINT_INTEL);
    const abdKeys = flattenComplaintIntelligenceKeys(PEDIATRIC_ABDOMINAL_PAIN_COMPLAINT_INTEL);
    const asthmaKeys = flattenComplaintIntelligenceKeys(PEDIATRIC_ASTHMA_WHEEZING_COMPLAINT_INTEL);
    const gastroKeys = flattenComplaintIntelligenceKeys(PEDIATRIC_VOMITING_DIARRHEA_COMPLAINT_INTEL);
    for (const key of feverKeys) expect(key).toContain(".pediatricFever.");
    for (const key of abdKeys) expect(key).toContain(".pediatricAbdominalPain.");
    for (const key of asthmaKeys) expect(key).toContain(".pediatricAsthmaWheezing.");
    for (const key of gastroKeys) expect(key).toContain(".pediatricVomitingDiarrhea.");
  });

  it("does not leak adult or unrelated complaint chips into Batch 6 pediatric bundles", () => {
    const feverKeys = flattenComplaintIntelligenceKeys(PEDIATRIC_FEVER_COMPLAINT_INTEL);
    const abdKeys = flattenComplaintIntelligenceKeys(PEDIATRIC_ABDOMINAL_PAIN_COMPLAINT_INTEL);
    const asthmaKeys = flattenComplaintIntelligenceKeys(PEDIATRIC_ASTHMA_WHEEZING_COMPLAINT_INTEL);
    const gastroKeys = flattenComplaintIntelligenceKeys(PEDIATRIC_VOMITING_DIARRHEA_COMPLAINT_INTEL);
    expect(feverKeys.some((key) => key.includes(".chestPain."))).toBe(false);
    expect(feverKeys.some((key) => key.includes(".stroke."))).toBe(false);
    expect(abdKeys.some((key) => key.includes(".flankPain."))).toBe(false);
    expect(asthmaKeys.some((key) => key.includes(".psychiatricBehavioral."))).toBe(false);
    expect(asthmaKeys.some((key) => key.includes(".dizzinessSyncope."))).toBe(false);
    expect(gastroKeys.some((key) => key.includes(".fractureConcern."))).toBe(false);
    expect(gastroKeys.some((key) => key.includes(".laceration."))).toBe(false);
  });

  it("does not duplicate intelligence fragment keys within a Batch 6 bundle", () => {
    for (const bundle of [
      PEDIATRIC_FEVER_COMPLAINT_INTEL,
      PEDIATRIC_ABDOMINAL_PAIN_COMPLAINT_INTEL,
      PEDIATRIC_ASTHMA_WHEEZING_COMPLAINT_INTEL,
      PEDIATRIC_VOMITING_DIARRHEA_COMPLAINT_INTEL,
    ]) {
      expect(complaintIntelligenceHasDuplicateKeys(bundle)).toBe(false);
    }
  });

  it("catalog Batch 6 templates expose expected intelligence entry points", () => {
    const fever = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "fever");
    const abd = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "abdominal_pain_pediatric");
    const asthma = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "asthma_wheezing");
    const vomiting = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "nausea_vomiting");
    const diarrhea = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "diarrhea");
    expect(fever?.complaintIntelligence?.hpi).toContain(
      "providerDocumentationComplaintIntel.pediatricFever.hpiCaregiverHistorianUsed"
    );
    expect(fever?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.pediatricFever.diffSepsis"
    );
    expect(abd?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.pediatricAbdominalPain.diffAppendicitis"
    );
    expect(asthma?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.pediatricAsthmaWheezing.diffAsthmaExacerbation"
    );
    expect(vomiting?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.pediatricVomitingDiarrhea.diffGastroenteritis"
    );
    expect(diarrhea?.complaintIntelligence).toBe(PEDIATRIC_VOMITING_DIARRHEA_COMPLAINT_INTEL);
    expect(fever?.promptReminderKeys).toContain("providerDocumentationPromptReminders.pediatricFeverSourceReminder");
    expect(abd?.promptReminderKeys).toContain("providerDocumentationPromptReminders.pediatricAbdominalRedFlags");
    expect(asthma?.promptReminderKeys).toContain("providerDocumentationPromptReminders.pediatricAsthmaWheezingReminder");
    expect(vomiting?.promptReminderKeys).toContain(
      "providerDocumentationPromptReminders.pediatricGastroDehydrationReminder"
    );
  });

  it("leaves Batch 1–5 intelligence bundles unchanged", () => {
    expect(FEVER_COMPLAINT_INTEL.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.fever.diffSepsis"
    );
    expect(ASTHMA_WHEEZING_COMPLAINT_INTEL.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.asthmaWheezing.diffAsthmaExacerbation"
    );
    expect(FRACTURE_CONCERN_COMPLAINT_INTEL.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.fractureConcern.diffFracture"
    );
  });

  it("uses i18n keys for all Batch 6 complaint intelligence fragments", () => {
    for (const bundle of [
      PEDIATRIC_FEVER_COMPLAINT_INTEL,
      PEDIATRIC_ABDOMINAL_PAIN_COMPLAINT_INTEL,
      PEDIATRIC_ASTHMA_WHEEZING_COMPLAINT_INTEL,
      PEDIATRIC_VOMITING_DIARRHEA_COMPLAINT_INTEL,
    ]) {
      for (const key of flattenComplaintIntelligenceKeys(bundle)) {
        expect(key.startsWith("providerDocumentationComplaintIntel.")).toBe(true);
      }
    }
    expect(JSON.stringify(PEDIATRIC_FEVER_COMPLAINT_INTEL)).not.toMatch(
      /billingLevel|CPT|autoBill|chargeCapture/i
    );
  });

  it("preserves chip toggle wiring for Batch 6 complaint intelligence panels", () => {
    const source = readFileSync(
      new URL("../components/encounters/ProviderDocumentationWorkspace.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toContain("toggleDocumentationFragment");
    expect(source).toContain("complaintIntelligenceReassessmentChips");
    expect(source).toContain("complaintIntelligenceDispositionChips");
  });
});

describe("provider documentation complaint intelligence (19N.10 Batch 7)", () => {
  it("maps Batch 7 templates to complaint intelligence bundles", () => {
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.urinary_symptoms).toBe(UTI_URINARY_SYMPTOMS_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.hyperglycemia).toBe(HYPERGLYCEMIA_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.hypertension).toBe(HYPERTENSION_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.allergic_reaction_rash).toBe(ALLERGIC_REACTION_RASH_COMPLAINT_INTEL);
  });

  it("includes all 7 required intelligence categories per Batch 7 template", () => {
    for (const bundle of [
      UTI_URINARY_SYMPTOMS_COMPLAINT_INTEL,
      HYPERGLYCEMIA_COMPLAINT_INTEL,
      HYPERTENSION_COMPLAINT_INTEL,
      ALLERGIC_REACTION_RASH_COMPLAINT_INTEL,
    ]) {
      expect(bundle.hpi?.length).toBeGreaterThan(0);
      expect(bundle.rosImportantPositives?.length).toBeGreaterThan(0);
      expect(bundle.rosImportantNegatives?.length).toBeGreaterThan(0);
      expect(bundle.rosRedFlags?.length).toBeGreaterThan(0);
      expect(Object.values(bundle.physicalExam ?? {}).flat().length).toBeGreaterThan(0);
      expect(bundle.mdmDifferentialSynthesis?.length).toBeGreaterThan(0);
      expect(bundle.mdmWorkingAssessment?.length).toBeGreaterThan(0);
      expect(bundle.reassessment?.length).toBeGreaterThan(0);
      expect(bundle.followUpDisposition?.length).toBeGreaterThan(0);
    }
  });

  it("does not auto-insert Batch 7 complaint intelligence on template apply", () => {
    for (const templateId of BATCH7_COMPLAINT_TEMPLATE_IDS) {
      const next = applyProviderDocumentationTemplate({
        state: emptyProviderDocumentationWorkspaceState(),
        templateId,
        resolveFragment: (key) => key,
      });
      expect(JSON.stringify(next)).not.toContain("providerDocumentationComplaintIntel");
    }
  });

  it("prevents cross-template intelligence leakage by key namespace", () => {
    const utiKeys = flattenComplaintIntelligenceKeys(UTI_URINARY_SYMPTOMS_COMPLAINT_INTEL);
    const hyperKeys = flattenComplaintIntelligenceKeys(HYPERGLYCEMIA_COMPLAINT_INTEL);
    const htKeys = flattenComplaintIntelligenceKeys(HYPERTENSION_COMPLAINT_INTEL);
    const allergyKeys = flattenComplaintIntelligenceKeys(ALLERGIC_REACTION_RASH_COMPLAINT_INTEL);
    for (const key of utiKeys) expect(key).toContain(".utiUrinarySymptoms.");
    for (const key of hyperKeys) expect(key).toContain(".hyperglycemia.");
    for (const key of htKeys) expect(key).toContain(".hypertension.");
    for (const key of allergyKeys) expect(key).toContain(".allergicReactionRash.");
  });

  it("does not leak unrelated complaint chips into Batch 7 bundles", () => {
    const utiKeys = flattenComplaintIntelligenceKeys(UTI_URINARY_SYMPTOMS_COMPLAINT_INTEL);
    const hyperKeys = flattenComplaintIntelligenceKeys(HYPERGLYCEMIA_COMPLAINT_INTEL);
    const htKeys = flattenComplaintIntelligenceKeys(HYPERTENSION_COMPLAINT_INTEL);
    const allergyKeys = flattenComplaintIntelligenceKeys(ALLERGIC_REACTION_RASH_COMPLAINT_INTEL);
    expect(utiKeys.some((key) => key.includes(".flankPain."))).toBe(false);
    expect(utiKeys.some((key) => key.includes(".flankPain.diffRenalColic"))).toBe(false);
    expect(hyperKeys.some((key) => key.includes(".hypertension."))).toBe(false);
    expect(hyperKeys.some((key) => key.includes(".allergicReactionRash."))).toBe(false);
    expect(htKeys.some((key) => key.includes(".hyperglycemia.diffDka"))).toBe(false);
    expect(htKeys.some((key) => key.includes(".hyperglycemia."))).toBe(false);
    expect(allergyKeys.some((key) => key.includes(".psychiatricBehavioral."))).toBe(false);
    expect(allergyKeys.some((key) => key.includes(".stroke."))).toBe(false);
  });

  it("does not duplicate intelligence fragment keys within a Batch 7 bundle", () => {
    for (const bundle of [
      UTI_URINARY_SYMPTOMS_COMPLAINT_INTEL,
      HYPERGLYCEMIA_COMPLAINT_INTEL,
      HYPERTENSION_COMPLAINT_INTEL,
      ALLERGIC_REACTION_RASH_COMPLAINT_INTEL,
    ]) {
      expect(complaintIntelligenceHasDuplicateKeys(bundle)).toBe(false);
    }
  });

  it("catalog Batch 7 templates expose expected intelligence entry points", () => {
    const uti = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "urinary_symptoms");
    const hyper = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "hyperglycemia");
    const ht = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "hypertension");
    const allergy = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "allergic_reaction_rash");
    expect(uti?.complaintIntelligence?.hpi).toContain(
      "providerDocumentationComplaintIntel.utiUrinarySymptoms.hpiDysuria"
    );
    expect(uti?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.utiUrinarySymptoms.diffPyelonephritis"
    );
    expect(hyper?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.hyperglycemia.diffDka"
    );
    expect(ht?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.hypertension.diffHypertensiveEmergency"
    );
    expect(allergy?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.allergicReactionRash.diffAnaphylaxis"
    );
    expect(uti?.promptReminderKeys).toContain("providerDocumentationPromptReminders.adultUtiUrinaryWorkupReminder");
    expect(hyper?.promptReminderKeys).toContain("providerDocumentationPromptReminders.adultHyperglycemiaDkaReminder");
    expect(ht?.promptReminderKeys).toContain("providerDocumentationPromptReminders.adultHypertensionEmergencyReminder");
    expect(allergy?.promptReminderKeys).toContain(
      "providerDocumentationPromptReminders.adultAllergicAnaphylaxisReminder"
    );
  });

  it("leaves Batch 1–6 intelligence bundles unchanged", () => {
    expect(FLANK_PAIN_COMPLAINT_INTEL.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.flankPain.diffRenalColic"
    );
    expect(PEDIATRIC_FEVER_COMPLAINT_INTEL.hpi).toContain(
      "providerDocumentationComplaintIntel.pediatricFever.hpiCaregiverHistorianUsed"
    );
    expect(FRACTURE_CONCERN_COMPLAINT_INTEL.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.fractureConcern.diffFracture"
    );
  });

  it("uses i18n keys for all Batch 7 complaint intelligence fragments", () => {
    for (const bundle of [
      UTI_URINARY_SYMPTOMS_COMPLAINT_INTEL,
      HYPERGLYCEMIA_COMPLAINT_INTEL,
      HYPERTENSION_COMPLAINT_INTEL,
      ALLERGIC_REACTION_RASH_COMPLAINT_INTEL,
    ]) {
      for (const key of flattenComplaintIntelligenceKeys(bundle)) {
        expect(key.startsWith("providerDocumentationComplaintIntel.")).toBe(true);
      }
    }
    expect(JSON.stringify(ALLERGIC_REACTION_RASH_COMPLAINT_INTEL)).not.toMatch(
      /billingLevel|CPT|autoBill|chargeCapture/i
    );
  });

  it("preserves chip toggle wiring for Batch 7 complaint intelligence panels", () => {
    const source = readFileSync(
      new URL("../components/encounters/ProviderDocumentationWorkspace.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toContain("toggleDocumentationFragment");
    expect(source).toContain("complaintIntelligenceReassessmentChips");
    expect(source).toContain("complaintIntelligenceDispositionChips");
  });
});

describe("provider documentation complaint intelligence (19N.11 Batch 8)", () => {
  it("maps Batch 8 templates to complaint intelligence bundles", () => {
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.adult_nausea_vomiting).toBe(ADULT_NAUSEA_VOMITING_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.adult_diarrhea).toBe(ADULT_DIARRHEA_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.medication_refill).toBe(MEDICATION_REFILL_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.observation_reassessment).toBe(OBSERVATION_REASSESSMENT_COMPLAINT_INTEL);
  });

  it("includes all 7 required intelligence categories per Batch 8 template", () => {
    for (const bundle of [
      ADULT_NAUSEA_VOMITING_COMPLAINT_INTEL,
      ADULT_DIARRHEA_COMPLAINT_INTEL,
      MEDICATION_REFILL_COMPLAINT_INTEL,
      OBSERVATION_REASSESSMENT_COMPLAINT_INTEL,
    ]) {
      expect(bundle.hpi?.length).toBeGreaterThan(0);
      expect(bundle.rosImportantPositives?.length).toBeGreaterThan(0);
      expect(bundle.rosImportantNegatives?.length).toBeGreaterThan(0);
      expect(bundle.rosRedFlags?.length).toBeGreaterThan(0);
      expect(Object.values(bundle.physicalExam ?? {}).flat().length).toBeGreaterThan(0);
      expect(bundle.mdmDifferentialSynthesis?.length).toBeGreaterThan(0);
      expect(bundle.mdmWorkingAssessment?.length).toBeGreaterThan(0);
      expect(bundle.reassessment?.length).toBeGreaterThan(0);
      expect(bundle.followUpDisposition?.length).toBeGreaterThan(0);
    }
  });

  it("does not auto-insert Batch 8 complaint intelligence on template apply", () => {
    for (const templateId of BATCH8_COMPLAINT_TEMPLATE_IDS) {
      const next = applyProviderDocumentationTemplate({
        state: emptyProviderDocumentationWorkspaceState(),
        templateId,
        resolveFragment: (key) => key,
      });
      expect(JSON.stringify(next)).not.toContain("providerDocumentationComplaintIntel");
    }
  });

  it("prevents cross-template intelligence leakage by key namespace", () => {
    const nvKeys = flattenComplaintIntelligenceKeys(ADULT_NAUSEA_VOMITING_COMPLAINT_INTEL);
    const diarrheaKeys = flattenComplaintIntelligenceKeys(ADULT_DIARRHEA_COMPLAINT_INTEL);
    const refillKeys = flattenComplaintIntelligenceKeys(MEDICATION_REFILL_COMPLAINT_INTEL);
    const obsKeys = flattenComplaintIntelligenceKeys(OBSERVATION_REASSESSMENT_COMPLAINT_INTEL);
    for (const key of nvKeys) expect(key).toContain(".adultNauseaVomiting.");
    for (const key of diarrheaKeys) expect(key).toContain(".adultDiarrhea.");
    for (const key of refillKeys) expect(key).toContain(".medicationRefill.");
    for (const key of obsKeys) expect(key).toContain(".observationReassessment.");
  });

  it("does not leak unrelated complaint chips into Batch 8 bundles", () => {
    const nvKeys = flattenComplaintIntelligenceKeys(ADULT_NAUSEA_VOMITING_COMPLAINT_INTEL);
    const diarrheaKeys = flattenComplaintIntelligenceKeys(ADULT_DIARRHEA_COMPLAINT_INTEL);
    const refillKeys = flattenComplaintIntelligenceKeys(MEDICATION_REFILL_COMPLAINT_INTEL);
    const obsKeys = flattenComplaintIntelligenceKeys(OBSERVATION_REASSESSMENT_COMPLAINT_INTEL);
    expect(nvKeys.some((key) => key.includes(".pediatricVomitingDiarrhea."))).toBe(false);
    expect(diarrheaKeys.some((key) => key.includes(".observationReassessment."))).toBe(false);
    expect(refillKeys.some((key) => key.includes(".psychiatricBehavioral."))).toBe(false);
    expect(refillKeys.some((key) => key.includes(".psychiatricBehavioral.hpiSuicidalIdeationReported"))).toBe(false);
    expect(refillKeys.some((key) => key.includes("providerDocumentationComplaintIntel.medicationRefill.mdmPdmpReviewedIfControlledSubstanceApplicable"))).toBe(true);
    expect(obsKeys.some((key) => key.includes(".medicationRefill."))).toBe(false);
    expect(obsKeys.some((key) => key.includes(".adultDiarrhea."))).toBe(false);
    expect(obsKeys.some((key) => key.includes(".adultNauseaVomiting."))).toBe(false);
  });

  it("does not duplicate intelligence fragment keys within a Batch 8 bundle", () => {
    for (const bundle of [
      ADULT_NAUSEA_VOMITING_COMPLAINT_INTEL,
      ADULT_DIARRHEA_COMPLAINT_INTEL,
      MEDICATION_REFILL_COMPLAINT_INTEL,
      OBSERVATION_REASSESSMENT_COMPLAINT_INTEL,
    ]) {
      expect(complaintIntelligenceHasDuplicateKeys(bundle)).toBe(false);
    }
  });

  it("catalog Batch 8 templates expose expected intelligence entry points", () => {
    const nv = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "adult_nausea_vomiting");
    const diarrhea = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "adult_diarrhea");
    const refill = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "medication_refill");
    const obs = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "observation_reassessment");
    expect(nv?.complaintIntelligence?.hpi).toContain(
      "providerDocumentationComplaintIntel.adultNauseaVomiting.hpiBeganToday"
    );
    expect(nv?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.adultNauseaVomiting.diffBowelObstruction"
    );
    expect(diarrhea?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.adultDiarrhea.diffCDifficileColitis"
    );
    expect(refill?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.medicationRefill.diffMedicationLapse"
    );
    expect(obs?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.observationReassessment.diffDischargeReadiness"
    );
    expect(nv?.promptReminderKeys).toContain("providerDocumentationPromptReminders.adultNauseaVomitingGiReminder");
    expect(diarrhea?.promptReminderKeys).toContain(
      "providerDocumentationPromptReminders.adultDiarrheaInfectiousReminder"
    );
    expect(refill?.promptReminderKeys).toContain(
      "providerDocumentationPromptReminders.adultMedicationRefillSafetyReminder"
    );
    expect(obs?.promptReminderKeys).toContain(
      "providerDocumentationPromptReminders.adultObservationReassessmentReminder"
    );
  });

  it("leaves Batch 1–7 intelligence bundles unchanged", () => {
    expect(PEDIATRIC_VOMITING_DIARRHEA_COMPLAINT_INTEL.hpi).toContain(
      "providerDocumentationComplaintIntel.pediatricVomitingDiarrhea.hpiCaregiverPresent"
    );
    expect(ALLERGIC_REACTION_RASH_COMPLAINT_INTEL.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.allergicReactionRash.diffAnaphylaxis"
    );
    expect(UTI_URINARY_SYMPTOMS_COMPLAINT_INTEL.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.utiUrinarySymptoms.diffPyelonephritis"
    );
  });

  it("uses i18n keys for all Batch 8 complaint intelligence fragments", () => {
    for (const bundle of [
      ADULT_NAUSEA_VOMITING_COMPLAINT_INTEL,
      ADULT_DIARRHEA_COMPLAINT_INTEL,
      MEDICATION_REFILL_COMPLAINT_INTEL,
      OBSERVATION_REASSESSMENT_COMPLAINT_INTEL,
    ]) {
      for (const key of flattenComplaintIntelligenceKeys(bundle)) {
        expect(key.startsWith("providerDocumentationComplaintIntel.")).toBe(true);
      }
    }
    expect(JSON.stringify(MEDICATION_REFILL_COMPLAINT_INTEL)).not.toMatch(
      /billingLevel|CPT|autoBill|chargeCapture/i
    );
  });

  it("preserves chip toggle wiring for Batch 8 complaint intelligence panels", () => {
    const source = readFileSync(
      new URL("../components/encounters/ProviderDocumentationWorkspace.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toContain("toggleDocumentationFragment");
    expect(source).toContain("complaintIntelligenceReassessmentChips");
    expect(source).toContain("complaintIntelligenceDispositionChips");
  });
});

describe("provider documentation complaint intelligence (19N.12 Batch 9)", () => {
  it("maps Batch 9 templates to complaint intelligence bundles", () => {
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.mvc).toBe(MVC_COLLISION_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.assault).toBe(ASSAULT_TRAUMA_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.neck_pain_trauma).toBe(NECK_PAIN_TRAUMA_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.back_pain).toBe(BACK_PAIN_TRAUMA_COMPLAINT_INTEL);
  });

  it("includes all 7 required intelligence categories per Batch 9 template", () => {
    for (const bundle of [
      MVC_COLLISION_COMPLAINT_INTEL,
      ASSAULT_TRAUMA_COMPLAINT_INTEL,
      NECK_PAIN_TRAUMA_COMPLAINT_INTEL,
      BACK_PAIN_TRAUMA_COMPLAINT_INTEL,
    ]) {
      expect(bundle.hpi?.length).toBeGreaterThan(0);
      expect(bundle.rosImportantPositives?.length).toBeGreaterThan(0);
      expect(bundle.rosImportantNegatives?.length).toBeGreaterThan(0);
      expect(bundle.rosRedFlags?.length).toBeGreaterThan(0);
      expect(Object.values(bundle.physicalExam ?? {}).flat().length).toBeGreaterThan(0);
      expect(bundle.mdmDifferentialSynthesis?.length).toBeGreaterThan(0);
      expect(bundle.mdmWorkingAssessment?.length).toBeGreaterThan(0);
      expect(bundle.reassessment?.length).toBeGreaterThan(0);
      expect(bundle.followUpDisposition?.length).toBeGreaterThan(0);
    }
  });

  it("does not auto-insert Batch 9 complaint intelligence on template apply", () => {
    for (const templateId of BATCH9_COMPLAINT_TEMPLATE_IDS) {
      const next = applyProviderDocumentationTemplate({
        state: emptyProviderDocumentationWorkspaceState(),
        templateId,
        resolveFragment: (key) => key,
      });
      expect(JSON.stringify(next)).not.toContain("providerDocumentationComplaintIntel");
    }
  });

  it("prevents cross-template intelligence leakage by key namespace", () => {
    const mvcKeys = flattenComplaintIntelligenceKeys(MVC_COLLISION_COMPLAINT_INTEL);
    const assaultKeys = flattenComplaintIntelligenceKeys(ASSAULT_TRAUMA_COMPLAINT_INTEL);
    const neckKeys = flattenComplaintIntelligenceKeys(NECK_PAIN_TRAUMA_COMPLAINT_INTEL);
    const backKeys = flattenComplaintIntelligenceKeys(BACK_PAIN_TRAUMA_COMPLAINT_INTEL);
    for (const key of mvcKeys) expect(key).toContain(".mvcCollision.");
    for (const key of assaultKeys) expect(key).toContain(".assaultTrauma.");
    for (const key of neckKeys) expect(key).toContain(".neckPainTrauma.");
    for (const key of backKeys) expect(key).toContain(".backPainTrauma.");
  });

  it("does not leak unrelated complaint chips into Batch 9 trauma bundles", () => {
    const mvcKeys = flattenComplaintIntelligenceKeys(MVC_COLLISION_COMPLAINT_INTEL);
    const assaultKeys = flattenComplaintIntelligenceKeys(ASSAULT_TRAUMA_COMPLAINT_INTEL);
    const neckKeys = flattenComplaintIntelligenceKeys(NECK_PAIN_TRAUMA_COMPLAINT_INTEL);
    const backKeys = flattenComplaintIntelligenceKeys(BACK_PAIN_TRAUMA_COMPLAINT_INTEL);
    expect(mvcKeys.some((key) => key.includes(".psychiatricBehavioral."))).toBe(false);
    expect(mvcKeys.some((key) => key.includes(".flankPain."))).toBe(false);
    expect(mvcKeys.some((key) => key.includes(".asthmaWheezing."))).toBe(false);
    expect(assaultKeys.some((key) => key.includes(".medicationRefill."))).toBe(false);
    expect(assaultKeys.some((key) => key.includes(".adultDiarrhea."))).toBe(false);
    expect(assaultKeys.some((key) => key.includes(".adultNauseaVomiting."))).toBe(false);
    expect(neckKeys.some((key) => key.includes(".headache.hpiThunderclapOnset"))).toBe(false);
    expect(neckKeys.some((key) => key.includes(".headache."))).toBe(false);
    expect(backKeys.some((key) => key.includes(".flankPain.diffRenalColic"))).toBe(false);
    expect(backKeys.some((key) => key.includes(".flankPain."))).toBe(false);
    expect(backKeys.some((key) => key.includes(".backPainTrauma.diffRenalInjury"))).toBe(true);
  });

  it("does not duplicate intelligence fragment keys within a Batch 9 bundle", () => {
    for (const bundle of [
      MVC_COLLISION_COMPLAINT_INTEL,
      ASSAULT_TRAUMA_COMPLAINT_INTEL,
      NECK_PAIN_TRAUMA_COMPLAINT_INTEL,
      BACK_PAIN_TRAUMA_COMPLAINT_INTEL,
    ]) {
      expect(complaintIntelligenceHasDuplicateKeys(bundle)).toBe(false);
    }
  });

  it("catalog Batch 9 templates expose expected intelligence entry points", () => {
    const mvc = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "mvc");
    const assault = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "assault");
    const neck = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "neck_pain_trauma");
    const back = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "back_pain");
    expect(mvc?.complaintIntelligence?.hpi).toContain(
      "providerDocumentationComplaintIntel.mvcCollision.hpiRestrainedDriverPassenger"
    );
    expect(mvc?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.mvcCollision.diffCervicalSpineInjury"
    );
    expect(assault?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.assaultTrauma.diffStrangulationInjury"
    );
    expect(neck?.complaintIntelligence?.mdmClinicalRationale).toContain(
      "providerDocumentationComplaintIntel.neckPainTrauma.mdmNexusCanadianCspineConsiderationsReviewed"
    );
    expect(back?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.backPainTrauma.diffCaudaEquinaSyndrome"
    );
    expect(mvc?.promptReminderKeys).toContain("providerDocumentationPromptReminders.traumaMvcMechanismReminder");
    expect(assault?.promptReminderKeys).toContain("providerDocumentationPromptReminders.traumaAssaultSafetyReminder");
    expect(neck?.promptReminderKeys).toContain("providerDocumentationPromptReminders.traumaNeckSpineCspineReminder");
    expect(back?.promptReminderKeys).toContain("providerDocumentationPromptReminders.traumaBackSpineRedFlagsReminder");
  });

  it("leaves Batch 1–8 intelligence bundles unchanged", () => {
    expect(FALL_COMPLAINT_INTEL.hpi).toContain("providerDocumentationComplaintIntel.fall.hpiMechanicalFall");
    expect(HEAD_INJURY_COMPLAINT_INTEL.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.headInjury.diffConcussion"
    );
    expect(ADULT_NAUSEA_VOMITING_COMPLAINT_INTEL.hpi).toContain(
      "providerDocumentationComplaintIntel.adultNauseaVomiting.hpiBeganToday"
    );
  });

  it("uses i18n keys for all Batch 9 complaint intelligence fragments", () => {
    for (const bundle of [
      MVC_COLLISION_COMPLAINT_INTEL,
      ASSAULT_TRAUMA_COMPLAINT_INTEL,
      NECK_PAIN_TRAUMA_COMPLAINT_INTEL,
      BACK_PAIN_TRAUMA_COMPLAINT_INTEL,
    ]) {
      for (const key of flattenComplaintIntelligenceKeys(bundle)) {
        expect(key.startsWith("providerDocumentationComplaintIntel.")).toBe(true);
      }
    }
    expect(JSON.stringify(MVC_COLLISION_COMPLAINT_INTEL)).not.toMatch(
      /billingLevel|CPT|autoBill|chargeCapture/i
    );
  });

  it("preserves chip toggle wiring for Batch 9 complaint intelligence panels", () => {
    const source = readFileSync(
      new URL("../components/encounters/ProviderDocumentationWorkspace.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toContain("toggleDocumentationFragment");
    expect(source).toContain("complaintIntelligenceReassessmentChips");
    expect(source).toContain("complaintIntelligenceDispositionChips");
  });
});

describe("provider documentation complaint intelligence (19N.13 Batch 10)", () => {
  const batch10Bundles = [
    CRUSH_INJURY_COMPLAINT_INTEL,
    PENETRATING_INJURY_COMPLAINT_INTEL,
    BURN_INJURY_COMPLAINT_INTEL,
    PEDIATRIC_TRAUMA_COMPLAINT_INTEL,
    MALE_GENITAL_COMPLAINT_INTEL,
    FEMALE_PELVIC_GYN_COMPLAINT_INTEL,
  ] as const;

  it("maps Batch 10 templates to complaint intelligence bundles", () => {
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.crush_injury).toBe(CRUSH_INJURY_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.penetrating_injury).toBe(PENETRATING_INJURY_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.burn).toBe(BURN_INJURY_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.pediatric_trauma).toBe(PEDIATRIC_TRAUMA_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.male_genital_complaint).toBe(MALE_GENITAL_COMPLAINT_INTEL);
    expect(COMPLAINT_INTEL_BY_TEMPLATE_ID.female_pelvic_gyn_complaint).toBe(
      FEMALE_PELVIC_GYN_COMPLAINT_INTEL
    );
  });

  it("includes all 7 required intelligence categories per Batch 10 template", () => {
    for (const bundle of batch10Bundles) {
      expect(bundle.hpi?.length).toBeGreaterThan(0);
      expect(bundle.rosImportantPositives?.length).toBeGreaterThan(0);
      expect(bundle.rosImportantNegatives?.length).toBeGreaterThan(0);
      expect(bundle.rosRedFlags?.length).toBeGreaterThan(0);
      expect(Object.values(bundle.physicalExam ?? {}).flat().length).toBeGreaterThan(0);
      expect(bundle.mdmDifferentialSynthesis?.length).toBeGreaterThan(0);
      expect(bundle.mdmWorkingAssessment?.length).toBeGreaterThan(0);
      expect(bundle.reassessment?.length).toBeGreaterThan(0);
      expect(bundle.followUpDisposition?.length).toBeGreaterThan(0);
    }
  });

  it("does not auto-insert Batch 10 complaint intelligence on template apply", () => {
    for (const templateId of BATCH10_COMPLAINT_TEMPLATE_IDS) {
      const next = applyProviderDocumentationTemplate({
        state: emptyProviderDocumentationWorkspaceState(),
        templateId,
        resolveFragment: (key) => key,
      });
      expect(JSON.stringify(next)).not.toContain("providerDocumentationComplaintIntel");
    }
  });

  it("prevents cross-template intelligence leakage by key namespace", () => {
    const crushKeys = flattenComplaintIntelligenceKeys(CRUSH_INJURY_COMPLAINT_INTEL);
    const penKeys = flattenComplaintIntelligenceKeys(PENETRATING_INJURY_COMPLAINT_INTEL);
    const burnKeys = flattenComplaintIntelligenceKeys(BURN_INJURY_COMPLAINT_INTEL);
    const pedTraumaKeys = flattenComplaintIntelligenceKeys(PEDIATRIC_TRAUMA_COMPLAINT_INTEL);
    const maleKeys = flattenComplaintIntelligenceKeys(MALE_GENITAL_COMPLAINT_INTEL);
    const femaleKeys = flattenComplaintIntelligenceKeys(FEMALE_PELVIC_GYN_COMPLAINT_INTEL);
    for (const key of crushKeys) expect(key).toContain(".crushInjury.");
    for (const key of penKeys) expect(key).toContain(".penetratingInjury.");
    for (const key of burnKeys) expect(key).toContain(".burnInjury.");
    for (const key of pedTraumaKeys) expect(key).toContain(".pediatricTrauma.");
    for (const key of maleKeys) expect(key).toContain(".maleGenitalComplaint.");
    for (const key of femaleKeys) expect(key).toContain(".femalePelvicGynComplaint.");
  });

  it("does not leak unrelated complaint chips into genital or trauma bundles", () => {
    const maleKeys = flattenComplaintIntelligenceKeys(MALE_GENITAL_COMPLAINT_INTEL);
    const femaleKeys = flattenComplaintIntelligenceKeys(FEMALE_PELVIC_GYN_COMPLAINT_INTEL);
    const crushKeys = flattenComplaintIntelligenceKeys(CRUSH_INJURY_COMPLAINT_INTEL);
    expect(maleKeys.some((key) => key.includes(".chestPain."))).toBe(false);
    expect(maleKeys.some((key) => key.includes(".strokeSymptoms."))).toBe(false);
    expect(maleKeys.some((key) => key.includes(".mvcCollision."))).toBe(false);
    expect(femaleKeys.some((key) => key.includes(".headache."))).toBe(false);
    expect(femaleKeys.some((key) => key.includes(".assaultTrauma."))).toBe(false);
    expect(femaleKeys.some((key) => key.includes(".crushInjury."))).toBe(false);
    expect(crushKeys.some((key) => key.includes(".maleGenitalComplaint."))).toBe(false);
    expect(crushKeys.some((key) => key.includes(".femalePelvicGynComplaint."))).toBe(false);
  });

  it("pelvic/GYN bundle uses summary exam chips without auto-inserting sensitive findings", () => {
    const femaleKeys = flattenComplaintIntelligenceKeys(FEMALE_PELVIC_GYN_COMPLAINT_INTEL);
    expect(femaleKeys).toContain(
      "providerDocumentationComplaintIntel.femalePelvicGynComplaint.examPelvicExamPerformedWithChaperone"
    );
    expect(femaleKeys).toContain(
      "providerDocumentationComplaintIntel.femalePelvicGynComplaint.examPelvicExamDeferred"
    );
    expect(femaleKeys).not.toContain(
      "providerDocumentationComplaintIntel.femalePelvicGynComplaint.examDetailedSpeculumFindingsAuto"
    );
    const applied = applyProviderDocumentationTemplate({
      state: emptyProviderDocumentationWorkspaceState(),
      templateId: "female_pelvic_gyn_complaint",
      resolveFragment: (key) => key,
    });
    expect(JSON.stringify(applied)).not.toContain("providerDocumentationComplaintIntel.femalePelvicGynComplaint");
  });

  it("registers male and female genital templates in the adult group", () => {
    const male = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "male_genital_complaint");
    const female = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "female_pelvic_gyn_complaint");
    expect(male?.majorGroup).toBe("ADULT");
    expect(female?.majorGroup).toBe("ADULT");
    expect(male?.labelKey).toBe("providerDocumentationWorkspace.templateMaleGenitalComplaint");
    expect(female?.labelKey).toBe("providerDocumentationWorkspace.templateFemalePelvicGynComplaint");
  });

  it("does not duplicate intelligence fragment keys within a Batch 10 bundle", () => {
    for (const bundle of batch10Bundles) {
      expect(complaintIntelligenceHasDuplicateKeys(bundle)).toBe(false);
    }
  });

  it("catalog Batch 10 templates expose expected intelligence entry points", () => {
    const crush = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "crush_injury");
    const penetrating = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "penetrating_injury");
    const burn = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "burn");
    const pedTrauma = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "pediatric_trauma");
    const male = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "male_genital_complaint");
    const female = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "female_pelvic_gyn_complaint");
    expect(crush?.complaintIntelligence?.hpi).toContain(
      "providerDocumentationComplaintIntel.crushInjury.hpiCrushMechanism"
    );
    expect(penetrating?.complaintIntelligence?.rosRedFlags).toContain(
      "providerDocumentationComplaintIntel.penetratingInjury.rfRetainedForeignBody"
    );
    expect(burn?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.burnInjury.diffInhalationInjury"
    );
    expect(pedTrauma?.complaintIntelligence?.rosRedFlags).toContain(
      "providerDocumentationComplaintIntel.pediatricTrauma.rfNonAccidentalTraumaConcern"
    );
    expect(male?.complaintIntelligence?.rosRedFlags).toContain(
      "providerDocumentationComplaintIntel.maleGenitalComplaint.rfTesticularTorsionConcern"
    );
    expect(female?.complaintIntelligence?.mdmClinicalRationale).toContain(
      "providerDocumentationComplaintIntel.femalePelvicGynComplaint.reasoningLowSuspicionEctopicPregnancy"
    );
    expect(crush?.promptReminderKeys).toContain("providerDocumentationPromptReminders.traumaCrushRhabdoReminder");
    expect(male?.promptReminderKeys).toContain("providerDocumentationPromptReminders.adultMaleGenitalTorsionReminder");
    expect(female?.promptReminderKeys).toContain("providerDocumentationPromptReminders.adultFemalePelvicGynReminder");
  });

  it("leaves Batch 1–9 intelligence bundles unchanged", () => {
    expect(MVC_COLLISION_COMPLAINT_INTEL.hpi).toContain(
      "providerDocumentationComplaintIntel.mvcCollision.hpiRestrainedDriverPassenger"
    );
    expect(BACK_PAIN_TRAUMA_COMPLAINT_INTEL.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.backPainTrauma.diffCaudaEquinaSyndrome"
    );
  });

  it("uses i18n keys for all Batch 10 complaint intelligence fragments", () => {
    for (const bundle of batch10Bundles) {
      for (const key of flattenComplaintIntelligenceKeys(bundle)) {
        expect(key.startsWith("providerDocumentationComplaintIntel.")).toBe(true);
      }
    }
    expect(JSON.stringify(MALE_GENITAL_COMPLAINT_INTEL)).not.toMatch(
      /billingLevel|CPT|autoBill|chargeCapture/i
    );
  });

  it("preserves chip toggle wiring for Batch 10 complaint intelligence panels", () => {
    const source = readFileSync(
      new URL("../components/encounters/ProviderDocumentationWorkspace.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toContain("toggleDocumentationFragment");
    expect(source).toContain("complaintIntelligenceReassessmentChips");
    expect(source).toContain("complaintIntelligenceDispositionChips");
  });
});
