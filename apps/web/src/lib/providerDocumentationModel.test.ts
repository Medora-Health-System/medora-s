import { describe, expect, it } from "vitest";
import {
  appendDocumentationFragment,
  PROVIDER_DOCUMENTATION_TEMPLATES,
  applyProviderDocumentationTemplate,
  buildProviderDocumentationMetadata,
  buildProviderDocumentationDisplayModel,
  providerDocumentationCompletedSectionIds,
  providerDocumentationMissingSectionIds,
  buildProviderDocumentationPreviewSections,
  buildProviderDocumentationSavePayload,
  emptyProviderDocumentationWorkspaceState,
  hydrateProviderDocumentationWorkspaceState,
  providerDocumentationTimelineLabel,
  providerDocumentationTitleKey,
  readProviderDocumentationWorkspaceMetadata,
} from "./providerDocumentationModel";

describe("providerDocumentationModel", () => {
  it("appends chip fragments and prevents duplicates", () => {
    expect(appendDocumentationFragment("nausea", "vomiting")).toBe("nausea; vomiting");
    expect(appendDocumentationFragment("nausea; vomiting", "Vomiting")).toBe("nausea; vomiting");
  });

  it("resolves ED and observation titles and timeline labels safely", () => {
    expect(providerDocumentationTitleKey("ED")).toBe("providerDocumentationWorkspace.titleEd");
    expect(providerDocumentationTimelineLabel("ED")).toBe("ED provider documentation saved");
    expect(providerDocumentationTitleKey("OBSERVATION")).toBe("providerDocumentationWorkspace.titleObservation");
    expect(providerDocumentationTimelineLabel("OBSERVATION")).toBe(
      "Observation provider progress note saved"
    );
    expect(providerDocumentationTimelineLabel("OBSERVATION")).not.toMatch(/discharge/i);
  });

  it("builds preview only from entered fields", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    expect(buildProviderDocumentationPreviewSections(state)).toEqual([]);
    state.hpi = "Patient reports vomiting.";
    state.mdmWorkingAssessment = "Undifferentiated symptoms.";
    const preview = buildProviderDocumentationPreviewSections(state);
    expect(preview.map((s) => s.id)).toEqual(["hpi", "mdm"]);
    expect(preview.flatMap((s) => s.lines).join(" ")).not.toContain("diagnosis");
  });

  it("save payload includes required safe metadata and no billing conclusions", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.chiefComplaint = "Vomiting";
    state.mdmWorkingAssessment = "Undifferentiated symptoms";
    const metadata = buildProviderDocumentationMetadata({
      encounterMode: "OBSERVATION",
      savedAt: "2026-05-17T12:00:00.000Z",
      savedBy: "Dr Test",
    });
    const payload = buildProviderDocumentationSavePayload({
      previousNursingAssessment: { nursingEvalV1: { keep: true } },
      state,
      metadata,
    });
    const stored = (payload.nursingAssessment.erProviderMseV1 ?? {}) as Record<string, unknown>;
    expect(payload.nursingAssessment.nursingEvalV1).toEqual({ keep: true });
    expect(stored.workspaceMetadata).toEqual({
      encounterMode: "OBSERVATION",
      documentType: "OBSERVATION_PROVIDER_PROGRESS_NOTE",
      savedAt: "2026-05-17T12:00:00.000Z",
      savedBy: "Dr Test",
      source: "PROVIDER_DOCUMENTATION_WORKSPACE",
    });
    expect(JSON.stringify(payload)).not.toMatch(/billing|orderId|diagnosisId/i);
  });

  it("preserves physical exam user edits through hydrate and save", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.physicalExam.respiratory = "clear breath sounds; user edit";
    const payload = buildProviderDocumentationSavePayload({
      previousNursingAssessment: {},
      state,
      metadata: buildProviderDocumentationMetadata({
        encounterMode: "ED",
        savedAt: "2026-05-17T12:00:00.000Z",
        savedBy: "Dr Test",
      }),
    });
    const hydrated = hydrateProviderDocumentationWorkspaceState({
      encounter: { nursingAssessment: payload.nursingAssessment },
    });
    expect(hydrated.physicalExam.respiratory).toBe("clear breath sounds; user edit");
  });

  it("keeps English and French label keys separate for callers", () => {
    expect(providerDocumentationTitleKey("ED")).toMatch(/^providerDocumentationWorkspace\./);
    expect(providerDocumentationTitleKey("ED")).not.toContain("Documentation du");
    expect(providerDocumentationTitleKey("OBSERVATION")).not.toContain("Provider documentation");
  });

  it("defines all requested complaint-driven templates", () => {
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.map((template) => template.id)).toEqual([
      "chest_pain",
      "abdominal_pain",
      "headache",
      "back_pain",
      "uri_respiratory",
      "trauma_musculoskeletal",
      "nausea_vomiting",
      "dizziness_syncope",
      "allergic_reaction_rash",
      "urinary_symptoms",
      "psychiatric_behavioral",
      "observation_reassessment",
    ]);
  });

  it("gives every complaint template complete editable sticker coverage", () => {
    for (const template of PROVIDER_DOCUMENTATION_TEMPLATES) {
      expect(template.categoryKey).toMatch(/^providerDocumentationWorkspace\./);
      expect(template.fields.hpi?.length, template.id).toBeGreaterThan(0);
      expect(template.fields.rosImportantPositives?.length, template.id).toBeGreaterThan(0);
      expect(template.fields.rosImportantNegatives?.length, template.id).toBeGreaterThan(0);
      expect(template.fields.rosRedFlags?.length, template.id).toBeGreaterThan(0);
      expect(Object.values(template.physicalExam).flat().length, template.id).toBeGreaterThan(0);
      expect(template.fields.mdmWorkingAssessment?.length, template.id).toBeGreaterThan(0);
      expect(template.fields.mdmDataReviewed?.length, template.id).toBeGreaterThan(0);
      expect(template.fields.mdmPlanSummary?.length, template.id).toBeGreaterThan(0);
      expect(template.fields.mdmAdmitObserveDischarge?.length, template.id).toBeGreaterThan(0);
    }
  });

  it("uses i18n keys for template labels and active template display", () => {
    for (const template of PROVIDER_DOCUMENTATION_TEMPLATES) {
      const label = template.labelKey.replace("providerDocumentationWorkspace.", "");
      const helper = template.helperKey.replace("providerDocumentationWorkspace.", "");
      expect(label, template.id).toMatch(/^template/);
      expect(helper, template.id).toMatch(/^template/);
      expect(template.labelKey, template.id).not.toContain("Douleur");
    }
  });

  it("applies a complaint template into visible editable fields only", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "custom history";
    const next = applyProviderDocumentationTemplate({
      state,
      templateId: "chest_pain",
      resolveFragment: (key) => key,
    });
    expect(next.hpi).toContain("custom history");
    expect(next.hpi).toContain("erMseHpiChips.locChestPain");
    expect(next.rosImportantPositives).toContain("erMseRosChips.posChestPain");
    expect(next.physicalExam.cardiovascular).toContain("erMseExamChips.cardioRrr");
    expect(next.clinicalImpression).toBe("");
    expect(next.treatmentPlan).toBe("");
  });

  it("does not duplicate template fragments on repeated application", () => {
    const first = applyProviderDocumentationTemplate({
      state: emptyProviderDocumentationWorkspaceState(),
      templateId: "observation_reassessment",
      resolveFragment: (key) => key,
    });
    const second = applyProviderDocumentationTemplate({
      state: first,
      templateId: "observation_reassessment",
      resolveFragment: (key) => key,
    });
    expect(second.hpi).toBe(first.hpi);
    expect(second.mdmPlanSummary).toBe(first.mdmPlanSummary);
  });

  it("tracks completed and missing overview sections without blocking save", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "Focused history";
    state.rosImportantPositives = "vomiting";
    expect(providerDocumentationCompletedSectionIds(state)).toEqual(["hpi", "ros"]);
    expect(providerDocumentationMissingSectionIds(state)).toEqual([
      "physicalExam",
      "mdm",
      "impression",
      "plan",
    ]);
  });

  it("templates do not create diagnoses, orders, billing, or preview-only content", () => {
    const next = applyProviderDocumentationTemplate({
      state: emptyProviderDocumentationWorkspaceState(),
      templateId: "trauma_musculoskeletal",
      resolveFragment: (key) => key,
    });
    const payload = buildProviderDocumentationSavePayload({
      previousNursingAssessment: {},
      state: next,
      metadata: buildProviderDocumentationMetadata({
        encounterMode: "ED",
        savedAt: "2026-05-17T12:00:00.000Z",
        savedBy: "Dr Test",
      }),
    });
    expect(JSON.stringify(payload)).not.toMatch(/diagnosisId|orderId|billing|billingLevel/i);
    expect(JSON.stringify(payload)).not.toMatch(/chargeCapture|billingComplexity/i);
    expect(buildProviderDocumentationPreviewSections(next).map((section) => section.id)).toEqual([
      "hpi",
      "ros",
      "physicalExam",
      "mdm",
    ]);
  });

  it("builds an ordered export-safe display model from the structured workspace note", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.chiefComplaint = "Chest pain";
    state.hpi = "Started today";
    state.rosImportantPositives = "shortness of breath";
    state.physicalExam.cardiovascular = "regular rate and rhythm";
    state.mdmWorkingAssessment = "concern for cardiopulmonary process";
    state.clinicalImpression = "provider-authored impression";
    state.treatmentPlan = "reassessment planned";
    const payload = buildProviderDocumentationSavePayload({
      previousNursingAssessment: { physicianEvalV1: { hpi: "legacy duplicate" } },
      state,
      metadata: buildProviderDocumentationMetadata({
        encounterMode: "ED",
        savedAt: "2026-05-17T12:00:00.000Z",
        savedBy: "Dr Test",
      }),
    });
    const model = buildProviderDocumentationDisplayModel({
      nursingAssessment: payload.nursingAssessment,
      locale: "en",
    });
    expect(model?.title).toBe("ED provider documentation");
    expect(model?.savedAt).toBe("2026-05-17T12:00:00.000Z");
    expect(model?.savedBy).toBe("Dr Test");
    expect(model?.sections.map((section) => section.id)).toEqual([
      "hpi",
      "ros",
      "physicalExam",
      "mdm",
      "impression",
      "plan",
    ]);
    expect(model?.sections.map((section) => section.text).join("\n")).not.toContain("legacy duplicate");
  });

  it("uses observation labels without discharge wording or French leakage in English", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "Symptoms improving";
    const payload = buildProviderDocumentationSavePayload({
      previousNursingAssessment: {},
      state,
      metadata: buildProviderDocumentationMetadata({
        encounterMode: "OBSERVATION",
        savedAt: "2026-05-17T12:00:00.000Z",
        savedBy: "Dr Test",
      }),
    });
    const metadata = readProviderDocumentationWorkspaceMetadata(payload.nursingAssessment);
    const model = buildProviderDocumentationDisplayModel({
      nursingAssessment: payload.nursingAssessment,
      locale: "en",
    });
    expect(metadata?.documentType).toBe("OBSERVATION_PROVIDER_PROGRESS_NOTE");
    expect(model?.title).toBe("Observation provider progress note");
    expect(model?.title).not.toMatch(/discharge|sortie|observation médecin/i);
  });
});

