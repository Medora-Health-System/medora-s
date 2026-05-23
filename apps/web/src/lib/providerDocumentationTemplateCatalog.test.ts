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
});
