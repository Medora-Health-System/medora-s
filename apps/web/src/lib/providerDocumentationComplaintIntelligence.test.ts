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
  flattenComplaintIntelligenceKeys,
  HEADACHE_COMPLAINT_INTEL,
  SOB_COMPLAINT_INTEL,
  STROKE_SYMPTOMS_COMPLAINT_INTEL,
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
    expect(CHEST_PAIN_COMPLAINT_INTEL.rosImportantPositives?.length).toBeGreaterThanOrEqual(8);
    expect(CHEST_PAIN_COMPLAINT_INTEL.rosImportantNegatives?.length).toBeGreaterThanOrEqual(6);
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
      "providerDocumentationComplaintIntel.chestPain.hpiExertional"
    );
    expect(chest?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.chestPain.diffStemiNstemi"
    );
    expect(sob?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.sob.diffPe"
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

describe("provider documentation complaint intelligence (19N.4 Batch 2)", () => {
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
    expect(stroke?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.stroke.diffIschemicStroke"
    );
    expect(headache?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.headache.diffSubarachnoidHemorrhage"
    );
    expect(dizz?.complaintIntelligence?.mdmDifferentialSynthesis).toContain(
      "providerDocumentationComplaintIntel.dizzinessSyncope.diffCardiacArrhythmia"
    );
    expect(stroke?.promptReminderKeys).toContain("providerDocumentationPromptReminders.adultStrokeTimeSensitive");
    expect(headache?.promptReminderKeys).toContain("providerDocumentationPromptReminders.adultHeadacheRedFlags");
    expect(dizz?.promptReminderKeys).toContain("providerDocumentationPromptReminders.adultSyncopeWorkup");
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
});
