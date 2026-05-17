import { describe, expect, it } from "vitest";
import {
  appendDocumentationFragment,
  PROVIDER_DOCUMENTATION_COMPLETE_NORMAL_ROS_TEXT,
  PROVIDER_DOCUMENTATION_TEMPLATES,
  applyCompleteNormalRosPrefill,
  applyProviderDocumentationTemplate,
  buildProviderDocumentationCompleteness,
  buildProviderDocumentationMetadata,
  buildProviderDocumentationDisplayModel,
  buildProviderDocumentationReadiness,
  buildProviderDocumentationWarnings,
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

  it("defines the editable complete normal ROS prefill text", () => {
    expect(PROVIDER_DOCUMENTATION_COMPLETE_NORMAL_ROS_TEXT).toContain("Review of Systems:");
    expect(PROVIDER_DOCUMENTATION_COMPLETE_NORMAL_ROS_TEXT).toContain("Constitutional: Denies fever");
    expect(PROVIDER_DOCUMENTATION_COMPLETE_NORMAL_ROS_TEXT).toContain("Allergic/Immunologic: Denies seasonal allergies");
  });

  it("appends complete normal ROS without overwriting existing ROS text", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.rosFocusedImpression = "Patient reports mild cough.";
    const next = applyCompleteNormalRosPrefill({ state });
    expect(next.rosFocusedImpression).toContain("Patient reports mild cough.");
    expect(next.rosFocusedImpression).toContain("\n\nReview of Systems:");
  });

  it("prevents duplicate complete normal ROS insertion", () => {
    const first = applyCompleteNormalRosPrefill({ state: emptyProviderDocumentationWorkspaceState() });
    const second = applyCompleteNormalRosPrefill({ state: first });
    expect(second.rosFocusedImpression).toBe(first.rosFocusedImpression);
  });

  it("complete normal ROS prefill remains editable text and has no billing/order/diagnosis side effects", () => {
    const next = applyCompleteNormalRosPrefill({ state: emptyProviderDocumentationWorkspaceState() });
    const payload = buildProviderDocumentationSavePayload({
      previousNursingAssessment: {},
      state: next,
      metadata: buildProviderDocumentationMetadata({
        encounterMode: "ED",
        savedAt: "2026-05-17T12:00:00.000Z",
        savedBy: "Dr Test",
      }),
    });
    expect(JSON.stringify(payload)).not.toMatch(/diagnosisId|orderId|billing|billingLevel|chargeCapture|billingComplexity/i);
    const preview = buildProviderDocumentationPreviewSections(next);
    expect(preview.map((section) => section.id)).toEqual(["ros"]);
    expect(preview.flatMap((section) => section.lines).join("\n")).toContain("Review of Systems:");
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
      activeTemplateId: null,
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

  it("marks an empty draft incomplete with advisory warnings only", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    const completeness = buildProviderDocumentationCompleteness({
      state,
      encounterMode: "ED",
      dispositionContext: null,
    });
    expect(completeness.readinessState).toBe("incomplete");
    expect(completeness.completedSections).toEqual([]);
    expect(completeness.missingSections).toContain("chiefComplaintHpi");
    expect(completeness.warnings.map((warning) => warning.id)).toContain("missingHpi");
  });

  it("marks a populated unsaved draft ready to save except saved metadata advisory", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.chiefComplaint = "Chest pain";
    state.hpi = "Started today";
    state.rosImportantPositives = "chest pain";
    state.physicalExam.general = "alert";
    state.mdmWorkingAssessment = "concern for cardiopulmonary process";
    state.mdmPlanSummary = "reassessment planned";
    state.mdmAdmitObserveDischarge = "discharge criteria reviewed";
    state.clinicalImpression = "provider-authored impression";
    state.treatmentPlan = "provider-authored plan";
    state.followUpDisposition = "return precautions documented";
    const completeness = buildProviderDocumentationCompleteness({
      state,
      encounterMode: "ED",
      dispositionContext: null,
    });
    expect(completeness.readinessState).toBe("needs_review");
    expect(completeness.warnings.map((warning) => warning.id)).toEqual(["missingSavedMetadata"]);
    expect(
      buildProviderDocumentationReadiness({
        state,
        encounterMode: "ED",
        savedMetadata: buildProviderDocumentationMetadata({
          encounterMode: "ED",
          savedAt: "2026-05-17T12:00:00.000Z",
          savedBy: "Dr Test",
        }),
      })
    ).toBe("saved");
  });

  it("produces ED disposition and reassessment advisory warnings", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.chiefComplaint = "Trauma";
    state.hpi = "Fall today";
    state.rosImportantPositives = "limb pain";
    state.physicalExam.musculoskeletal = "tenderness present";
    state.mdmWorkingAssessment = "traumatic injury considered";
    state.clinicalImpression = "provider-authored impression";
    state.treatmentPlan = "provider-authored plan";
    const warnings = buildProviderDocumentationWarnings({
      state,
      encounterMode: "ED",
      dispositionContext: "DISCHARGE",
      longStayOrInterventionHeavy: true,
    }).map((warning) => warning.id);
    expect(warnings).toContain("edMissingDispositionReasoning");
    expect(warnings).toContain("edReassessmentRecommended");
  });

  it("produces observation response, readiness, pending result, and discharge advisory warnings", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.chiefComplaint = "Observation";
    state.hpi = "Interval check";
    state.rosFocusedImpression = "interval status documented";
    state.physicalExam.general = "alert";
    state.mdmWorkingAssessment = "undifferentiated symptoms";
    state.clinicalImpression = "provider-authored impression";
    state.treatmentPlan = "provider-authored plan";
    const warnings = buildProviderDocumentationWarnings({
      state,
      encounterMode: "OBSERVATION",
      hasPendingResults: true,
      dispositionContext: "DISCHARGE",
    }).map((warning) => warning.id);
    expect(warnings).toContain("observationMissingResponseToTreatment");
    expect(warnings).toContain("observationMissingVitalsTrend");
    expect(warnings).toContain("observationPendingResultsRecommended");
    expect(warnings).toContain("observationMissingReadinessOrRationale");
    expect(warnings).toContain("observationMissingTransferDischargeReasoning");
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

  it("uses i18n keys for complete normal ROS labels", () => {
    expect("providerDocumentationWorkspace.insertCompleteNormalRos").toMatch(/^providerDocumentationWorkspace\./);
    expect("providerDocumentationWorkspace.completeNormalRosHelp").toMatch(/^providerDocumentationWorkspace\./);
    expect("providerDocumentationWorkspace.completeNormalRosText").toMatch(/^providerDocumentationWorkspace\./);
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
    const completeness = buildProviderDocumentationCompleteness({
      state: next,
      encounterMode: "ED",
      dispositionContext: null,
    });
    expect(JSON.stringify(completeness)).not.toMatch(/diagnosisId|orderId|billing|chargeCapture|billingComplexity/i);
    expect(buildProviderDocumentationPreviewSections(next).flatMap((section) => section.lines).join(" ")).not.toMatch(
      /recommended|missing|readiness|warning/i
    );
  });

  it("preserves active template id in workspace metadata without exporting warnings as note text", () => {
    const state = applyProviderDocumentationTemplate({
      state: emptyProviderDocumentationWorkspaceState(),
      templateId: "chest_pain",
      resolveFragment: (key) => key,
    });
    state.clinicalImpression = "provider-authored impression";
    state.treatmentPlan = "provider-authored plan";
    const payload = buildProviderDocumentationSavePayload({
      previousNursingAssessment: {},
      state,
      metadata: buildProviderDocumentationMetadata({
        encounterMode: "ED",
        savedAt: "2026-05-17T12:00:00.000Z",
        savedBy: "Dr Test",
        activeTemplateId: state.activeTemplateId,
      }),
    });
    const metadata = readProviderDocumentationWorkspaceMetadata(payload.nursingAssessment);
    expect(metadata?.activeTemplateId).toBe("chest_pain");
    expect(JSON.stringify(payload)).not.toMatch(/warningMissing|readinessState|missingSections/i);
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

