import { describe, expect, it } from "vitest";
import {
  PROVIDER_DOCUMENTATION_TEMPLATES,
  applyProviderDocumentationTemplate,
  buildProviderDocumentationSavePayload,
  buildProviderDocumentationMetadata,
  emptyProviderDocumentationWorkspaceState,
  providerDocumentationMajorGroupForTemplateId,
} from "./providerDocumentationModel";

describe("provider documentation template stratification (19N)", () => {
  it("maps trauma templates to TRAUMA major group with MDM guidance fragments", () => {
    const traumaIds = ["fall", "head_injury", "mvc", "burn"] as const;
    for (const id of traumaIds) {
      expect(providerDocumentationMajorGroupForTemplateId(id)).toBe("TRAUMA");
      const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === id);
      expect(template?.guidance?.mdmClinicalRationale?.length).toBeGreaterThan(0);
      expect(template?.promptReminderKeys?.length).toBeGreaterThan(0);
    }
  });

  it("maps pediatric templates with caregiver / hydration prompts", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "fever");
    expect(template?.majorGroup).toBe("PEDIATRIC");
    expect(template?.fields.hpi).toEqual(expect.arrayContaining(["erMseHpiChipsPediatric.caregiverHistorian"]));
    expect(template?.promptReminderKeys).toEqual(expect.arrayContaining(["providerDocumentationPromptReminders.pediatricHydration"]));
  });

  it("maps adult chest pain with ACS-oriented MDM guidance without billing auto-coding", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "chest_pain");
    expect(template?.guidance?.mdmClinicalRationale).toEqual(
      expect.arrayContaining(["erMseMdmGuidance.acsExclusionConsidered"])
    );
    const next = applyProviderDocumentationTemplate({
      state: emptyProviderDocumentationWorkspaceState(),
      templateId: "chest_pain",
      resolveFragment: (key) => key,
    });
    const payload = buildProviderDocumentationSavePayload({
      previousNursingAssessment: {},
      state: next,
      metadata: buildProviderDocumentationMetadata({
        encounterMode: "ED",
        savedAt: "2026-05-18T12:00:00.000Z",
        savedBy: "Dr Test",
        activeTemplateId: "chest_pain",
      }),
    });
    expect(JSON.stringify(payload)).not.toMatch(/billingLevel|CPT|autoBill|chargeCapture/i);
  });

  it("never auto-inserts prompt reminders — advisory only", () => {
    const next = applyProviderDocumentationTemplate({
      state: emptyProviderDocumentationWorkspaceState(),
      templateId: "stroke_symptoms",
      resolveFragment: (key) => key,
    });
    const allText = JSON.stringify(next);
    expect(allText).not.toContain("providerDocumentationPromptReminders");
    expect(allText).not.toContain("Reminder:");
  });

  it("includes adult URI / nausea-vomiting / diarrhea / seizure templates alongside pediatric versions (19N.1)", () => {
    const ids = PROVIDER_DOCUMENTATION_TEMPLATES.map((template) => template.id);
    for (const adultId of ["adult_uri_respiratory", "adult_nausea_vomiting", "adult_diarrhea", "adult_seizure"] as const) {
      expect(ids).toContain(adultId);
      expect(providerDocumentationMajorGroupForTemplateId(adultId)).toBe("ADULT");
    }
    for (const pediatricId of ["uri_respiratory", "nausea_vomiting", "diarrhea", "seizure"] as const) {
      expect(ids).toContain(pediatricId);
      expect(providerDocumentationMajorGroupForTemplateId(pediatricId)).toBe("PEDIATRIC");
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("selecting a template still sets activeTemplateId and preserves MDM guidance metadata", () => {
    const next = applyProviderDocumentationTemplate({
      state: emptyProviderDocumentationWorkspaceState(),
      templateId: "adult_uri_respiratory",
      resolveFragment: (key) => key,
    });
    expect(next.activeTemplateId).toBe("adult_uri_respiratory");
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "adult_uri_respiratory");
    expect(template?.majorGroup).toBe("ADULT");
    expect(template?.fields.mdmWorkingAssessment?.length).toBeGreaterThan(0);
  });
});
