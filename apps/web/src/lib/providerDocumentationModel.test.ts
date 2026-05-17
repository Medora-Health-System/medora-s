import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  appendDocumentationFragment,
  PROVIDER_DOCUMENTATION_COMPLETE_NORMAL_ROS_TEXT,
  PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS,
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
  buildProviderDocumentationSignReadiness,
  emptyProviderDocumentationWorkspaceState,
  hydrateProviderDocumentationWorkspaceState,
  providerDocumentationCanSubmitSignature,
  providerDocumentationSignedTimelineLabel,
  providerDocumentationTimelineLabel,
  providerDocumentationTitleKey,
  readProviderDocumentationWorkspaceMetadata,
} from "./providerDocumentationModel";
import {
  createProviderDocumentationAutosaveScheduler,
  shouldAutosaveProviderDocumentation,
} from "./providerDocumentationAutosave";
import {
  buildProviderDocumentationDraftKey,
  providerDocumentationStateSignature,
  readProviderDocumentationDraft,
  removeProviderDocumentationDraft,
  shouldRestoreProviderDocumentationDraft,
  writeProviderDocumentationDraft,
  type ProviderDocumentationStorageLike,
} from "./providerDocumentationDraftStorage";

function makeMemoryStorage(): ProviderDocumentationStorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

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

  it("preserves free-text MDM, impression, and plan fields in preview", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "Free text HPI";
    state.rosFocusedImpression = "Free text ROS";
    state.physicalExam.general = "Free text exam";
    state.physicalExam.reassessment = "Free text reassessment";
    state.mdmWorkingAssessment = "Free text working assessment";
    state.mdmClinicalRationale = "Free text clinical rationale";
    state.clinicalImpression = "Free text clinical impression";
    state.treatmentPlan = "Free text treatment plan";
    const previewText = buildProviderDocumentationPreviewSections(state)
      .flatMap((section) => section.lines)
      .join("\n");
    expect(previewText).toContain("Free text working assessment");
    expect(previewText).toContain("Free text clinical rationale");
    expect(previewText).toContain("Free text clinical impression");
    expect(previewText).toContain("Free text treatment plan");
    expect(previewText).toContain("Free text reassessment");
  });

  it("chip/template insertion does not erase manual free text afterward", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.mdmWorkingAssessment = "Manual working assessment";
    state.clinicalImpression = "Manual impression";
    state.treatmentPlan = "Manual treatment plan";
    const next = applyProviderDocumentationTemplate({
      state,
      templateId: "chest_pain",
      resolveFragment: (key) => key,
    });
    next.mdmWorkingAssessment = appendDocumentationFragment(next.mdmWorkingAssessment, "Manual addition after chip");
    expect(next.mdmWorkingAssessment).toContain("Manual working assessment");
    expect(next.mdmWorkingAssessment).toContain("Manual addition after chip");
    expect(next.clinicalImpression).toBe("Manual impression");
    expect(next.treatmentPlan).toBe("Manual treatment plan");
  });

  it("live preview data is empty until fields are entered and has no side effects", () => {
    const empty = emptyProviderDocumentationWorkspaceState();
    expect(buildProviderDocumentationPreviewSections(empty)).toEqual([]);
    empty.hpi = "Unsaved HPI";
    empty.rosFocusedImpression = "Unsaved ROS";
    empty.physicalExam.general = "Unsaved PE";
    empty.mdmWorkingAssessment = "Unsaved MDM";
    empty.clinicalImpression = "Unsaved impression";
    empty.treatmentPlan = "Unsaved plan";
    const preview = buildProviderDocumentationPreviewSections(empty);
    expect(preview.map((section) => section.id)).toEqual(["hpi", "ros", "physicalExam", "mdm", "impression", "plan"]);
    expect(JSON.stringify(preview)).not.toMatch(/billing|diagnosisId|orderId|chargeCapture/i);
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

  it("prefers chief complaint for new saves while preserving legacy reason fallback", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.reasonForVisit = "Legacy reason for visit";
    state.chiefComplaint = "Provider-authored chief complaint";
    const payload = buildProviderDocumentationSavePayload({
      previousNursingAssessment: {},
      state,
      metadata: buildProviderDocumentationMetadata({
        encounterMode: "ED",
        savedAt: "2026-05-17T12:00:00.000Z",
        savedBy: "Dr Test",
      }),
    });
    const stored = payload.nursingAssessment.erProviderMseV1 as Record<string, unknown>;
    expect(payload.visitReason).toBe("Provider-authored chief complaint");
    expect(stored.chiefConcern).toBe("Provider-authored chief complaint");

    const legacyOnlyPayload = buildProviderDocumentationSavePayload({
      previousNursingAssessment: {},
      state: { ...emptyProviderDocumentationWorkspaceState(), reasonForVisit: "Legacy reason only" },
      metadata: buildProviderDocumentationMetadata({
        encounterMode: "ED",
        savedAt: "2026-05-17T12:00:00.000Z",
        savedBy: "Dr Test",
      }),
    });
    expect(legacyOnlyPayload.visitReason).toBe("Legacy reason only");
  });

  it("hydrates old reason for visit as chief complaint fallback without duplicate preview", () => {
    const hydrated = hydrateProviderDocumentationWorkspaceState({
      encounter: { visitReason: "Legacy visit reason", nursingAssessment: {} },
    });
    expect(hydrated.reasonForVisit).toBe("Legacy visit reason");
    expect(hydrated.chiefComplaint).toBe("Legacy visit reason");
    hydrated.hpi = "Focused HPI";
    const previewText = buildProviderDocumentationPreviewSections(hydrated)
      .flatMap((section) => section.lines)
      .join("\n");
    expect(previewText.match(/Legacy visit reason/g)?.length).toBe(1);
    expect(previewText).not.toMatch(/billing|diagnosisId|orderId|chargeCapture/i);
  });

  it("keeps chief complaint editable and removes separate reason for visit UI", () => {
    const source = readFileSync(
      new URL("../components/encounters/ProviderDocumentationWorkspace.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toContain('ta("chiefComplaint"');
    expect(source).not.toContain('ta("reasonForVisit"');
  });

  it("builds scoped local draft keys and restores only newer matching drafts", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "Unsaved local HPI";
    const key = buildProviderDocumentationDraftKey({
      encounterId: "enc-1",
      encounterMode: "ED",
      providerUserId: "user-1",
    });
    expect(key).toContain("enc-1");
    expect(key).toContain("ED");
    expect(key).toContain("user-1");

    const storage = makeMemoryStorage();
    writeProviderDocumentationDraft(storage, key, {
      schemaVersion: 1,
      encounterId: "enc-1",
      encounterMode: "ED",
      providerUserId: "user-1",
      updatedAt: "2026-05-17T12:05:00.000Z",
      serverSavedAt: "2026-05-17T12:00:00.000Z",
      state,
    });
    const draft = readProviderDocumentationDraft(storage, key);
    expect(
      shouldRestoreProviderDocumentationDraft({
        draft,
        encounterId: "enc-1",
        encounterMode: "ED",
        providerUserId: "user-1",
        serverSavedAt: "2026-05-17T12:00:00.000Z",
      })
    ).toBe(true);
    expect(
      shouldRestoreProviderDocumentationDraft({
        draft,
        encounterId: "enc-2",
        encounterMode: "ED",
        providerUserId: "user-1",
        serverSavedAt: "2026-05-17T12:00:00.000Z",
      })
    ).toBe(false);
    expect(
      shouldRestoreProviderDocumentationDraft({
        draft,
        encounterId: "enc-1",
        encounterMode: "ED",
        providerUserId: "user-2",
        serverSavedAt: "2026-05-17T12:00:00.000Z",
      })
    ).toBe(false);
  });

  it("rejects stale local drafts to avoid overwriting newer server notes", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "Stale HPI";
    expect(
      shouldRestoreProviderDocumentationDraft({
        draft: {
          schemaVersion: 1,
          encounterId: "enc-1",
          encounterMode: "OBSERVATION",
          providerUserId: "unknown-provider",
          updatedAt: "2026-05-17T11:55:00.000Z",
          serverSavedAt: "2026-05-17T12:00:00.000Z",
          state,
        },
        encounterId: "enc-1",
        encounterMode: "OBSERVATION",
        serverSavedAt: "2026-05-17T12:00:00.000Z",
      })
    ).toBe(false);
  });

  it("debounces autosave and supports failed-save draft preservation", async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockResolvedValue(undefined);
    const scheduler = createProviderDocumentationAutosaveScheduler({
      debounceMs: 2000,
      save,
    });
    scheduler.schedule();
    scheduler.schedule();
    await vi.advanceTimersByTimeAsync(1999);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
    vi.useRealTimers();

    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "Draft survives failed save";
    const storage = makeMemoryStorage();
    const key = buildProviderDocumentationDraftKey({ encounterId: "enc-1", encounterMode: "ED" });
    writeProviderDocumentationDraft(storage, key, {
      schemaVersion: 1,
      encounterId: "enc-1",
      encounterMode: "ED",
      providerUserId: "unknown-provider",
      updatedAt: "2026-05-17T12:05:00.000Z",
      serverSavedAt: null,
      state,
    });
    expect(readProviderDocumentationDraft(storage, key)?.state.hpi).toBe("Draft survives failed save");
  });

  it("autosave is blocked after sign/finalization and for unchanged content", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "Draft";
    const signature = providerDocumentationStateSignature(state);
    expect(
      shouldAutosaveProviderDocumentation({
        currentSignature: `${signature}-changed`,
        lastSavedSignature: signature,
        signedOrFinalized: true,
        hasContent: true,
      })
    ).toBe(false);
    expect(
      shouldAutosaveProviderDocumentation({
        currentSignature: signature,
        lastSavedSignature: signature,
        hasContent: true,
      })
    ).toBe(false);
    expect(
      shouldAutosaveProviderDocumentation({
        currentSignature: `${signature}-changed`,
        lastSavedSignature: signature,
        hasContent: true,
      })
    ).toBe(true);
  });

  it("local drafts do not contaminate save payload or export-oriented preview unless restored into state", () => {
    const savedState = emptyProviderDocumentationWorkspaceState();
    savedState.hpi = "Saved HPI";
    const unsavedDraftState = emptyProviderDocumentationWorkspaceState();
    unsavedDraftState.hpi = "Unsaved local-only HPI";
    const storage = makeMemoryStorage();
    const key = buildProviderDocumentationDraftKey({ encounterId: "enc-1", encounterMode: "ED" });
    writeProviderDocumentationDraft(storage, key, {
      schemaVersion: 1,
      encounterId: "enc-1",
      encounterMode: "ED",
      providerUserId: "unknown-provider",
      updatedAt: "2026-05-17T12:05:00.000Z",
      serverSavedAt: "2026-05-17T12:00:00.000Z",
      state: unsavedDraftState,
    });
    const payload = buildProviderDocumentationSavePayload({
      previousNursingAssessment: {},
      state: savedState,
      metadata: buildProviderDocumentationMetadata({
        encounterMode: "ED",
        savedAt: "2026-05-17T12:00:00.000Z",
        savedBy: "Dr Test",
      }),
    });
    expect(JSON.stringify(payload)).toContain("Saved HPI");
    expect(JSON.stringify(payload)).not.toContain("Unsaved local-only HPI");
    expect(buildProviderDocumentationPreviewSections(savedState).flatMap((section) => section.lines).join("\n")).not.toContain(
      "Unsaved local-only HPI"
    );
    removeProviderDocumentationDraft(storage, key);
    expect(readProviderDocumentationDraft(storage, key)).toBeNull();
  });

  it("defines stable dictation textarea IDs for major sections", () => {
    expect(PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS).toEqual({
      chiefComplaint: "provider-documentation-chief-complaint",
      hpi: "provider-documentation-hpi",
      rosFocusedImpression: "provider-documentation-ros-focused-impression",
      rosImportantPositives: "provider-documentation-ros-important-positives",
      rosImportantNegatives: "provider-documentation-ros-important-negatives",
      rosRedFlags: "provider-documentation-ros-red-flags",
      physicalExamGeneral: "provider-documentation-exam-general",
      physicalExamHeent: "provider-documentation-exam-heent",
      physicalExamCardiovascular: "provider-documentation-exam-cardiovascular",
      physicalExamRespiratory: "provider-documentation-exam-respiratory",
      physicalExamAbdomen: "provider-documentation-exam-abdomen",
      physicalExamNeuroPsych: "provider-documentation-exam-neuro-psych",
      physicalExamMusculoskeletal: "provider-documentation-exam-musculoskeletal",
      physicalExamSkin: "provider-documentation-exam-skin",
      physicalExamReassessment: "provider-documentation-exam-reassessment",
      mdmWorkingAssessment: "provider-documentation-mdm-working-assessment",
      mdmDifferentialSynthesis: "provider-documentation-mdm-differential-synthesis",
      mdmDataReviewed: "provider-documentation-mdm-data-reviewed",
      mdmClinicalRationale: "provider-documentation-mdm-clinical-rationale",
      mdmPlanSummary: "provider-documentation-mdm-plan-summary",
      mdmImmediateActionsRationale: "provider-documentation-mdm-immediate-actions-rationale",
      mdmConsultsDiscussed: "provider-documentation-mdm-consults-discussed",
      mdmAdmitObserveDischarge: "provider-documentation-mdm-admit-observe-discharge",
      clinicalImpression: "provider-documentation-clinical-impression",
      treatmentPlan: "provider-documentation-treatment-plan",
      followUpDisposition: "provider-documentation-follow-up-disposition",
      providerAddendum: "provider-documentation-provider-addendum",
    });
  });

  it("renders dictation hints, navigation targets, and microphone focus affordances without changing save behavior", () => {
    const source = readFileSync(
      new URL("../components/encounters/ProviderDocumentationWorkspace.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toContain("dictationReady");
    expect(source).toContain("dictationInstruction");
    expect(source).toContain("dictationNextSection");
    expect(source).toContain("dictationPreviousSection");
    expect(source).toContain("voiceReadyField");
    expect(source).toContain("dictationFocusField");
    expect(source).toContain("dictationReadOnlyField");
    expect(source).toContain("MicrophoneGlyph");
    expect(source).toContain("focusDictationField");
    for (const key of Object.keys(PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS)) {
      expect(source).toContain(`PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.${key}`);
    }
    expect(source).not.toMatch(/SpeechRecognition|webkitSpeechRecognition|getUserMedia|MediaRecorder|navigator\.mediaDevices/i);
  });

  it("autosave and dictation readiness do not transform dictated field values", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "Dragon dictated line one.\nDragon dictated line two with punctuation.";
    const before = providerDocumentationStateSignature(state);
    const shouldAutosave = shouldAutosaveProviderDocumentation({
      currentSignature: `${before}-changed`,
      lastSavedSignature: before,
      hasContent: true,
    });
    expect(shouldAutosave).toBe(true);
    expect(state.hpi).toBe("Dragon dictated line one.\nDragon dictated line two with punctuation.");
    expect(JSON.stringify(state)).not.toMatch(/billing|diagnosisId|orderId|chargeCapture|billingComplexity/i);
  });

  it("all major dictation fields remain editable provider-authored text", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.chiefComplaint = "Dictated chief complaint";
    state.hpi = "Dictated HPI";
    state.rosFocusedImpression = "Dictated ROS";
    state.physicalExam.general = "Dictated exam";
    state.mdmWorkingAssessment = "Dictated MDM";
    state.clinicalImpression = "Dictated impression";
    state.treatmentPlan = "Dictated plan";
    const preview = buildProviderDocumentationPreviewSections(state).flatMap((section) => section.lines).join("\n");
    expect(preview).toContain("Dictated chief complaint");
    expect(preview).toContain("Dictated HPI");
    expect(preview).toContain("Dictated ROS");
    expect(preview).toContain("Dictated exam");
    expect(preview).toContain("Dictated MDM");
    expect(preview).toContain("Dictated impression");
    expect(preview).toContain("Dictated plan");
    expect(preview).not.toMatch(/billing|diagnosisId|orderId|chargeCapture|billingComplexity/i);
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

  it("shows incomplete notes as not ready to sign with missing sections", () => {
    const signReadiness = buildProviderDocumentationSignReadiness({
      state: emptyProviderDocumentationWorkspaceState(),
      encounterMode: "ED",
      savedMetadata: buildProviderDocumentationMetadata({
        encounterMode: "ED",
        savedAt: "2026-05-17T12:00:00.000Z",
        savedBy: "Dr Test",
      }),
    });
    expect(signReadiness.readyToSign).toBe(false);
    expect(signReadiness.missingSections).toEqual([
      "chiefComplaintHpi",
      "ros",
      "physicalExam",
      "mdm",
      "impression",
      "plan",
    ]);
  });

  it("shows complete saved notes as ready to sign", () => {
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
    const signReadiness = buildProviderDocumentationSignReadiness({
      state,
      encounterMode: "ED",
      savedMetadata: buildProviderDocumentationMetadata({
        encounterMode: "ED",
        savedAt: "2026-05-17T12:00:00.000Z",
        savedBy: "Dr Test",
      }),
    });
    expect(signReadiness.readyToSign).toBe(true);
    expect(signReadiness.missingSections).toEqual([]);
  });

  it("requires attestation before signature submission and keeps warnings advisory", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "Focused history";
    const signReadiness = buildProviderDocumentationSignReadiness({
      state,
      encounterMode: "ED",
      savedMetadata: buildProviderDocumentationMetadata({
        encounterMode: "ED",
        savedAt: "2026-05-17T12:00:00.000Z",
        savedBy: "Dr Test",
      }),
    });
    expect(signReadiness.readyToSign).toBe(false);
    expect(providerDocumentationCanSubmitSignature({ attestationAccepted: false, signReadiness })).toBe(false);
    expect(providerDocumentationCanSubmitSignature({ attestationAccepted: true, signReadiness })).toBe(true);
    expect(JSON.stringify(signReadiness)).not.toMatch(/diagnosisId|orderId|billing|chargeCapture|billingComplexity/i);
  });

  it("treats signed notes as locked and keeps addenda outside draft fields", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.chiefComplaint = "Chest pain";
    state.hpi = "Started today";
    state.rosImportantPositives = "chest pain";
    state.physicalExam.general = "alert";
    state.mdmWorkingAssessment = "concern for cardiopulmonary process";
    state.clinicalImpression = "provider-authored impression";
    state.treatmentPlan = "provider-authored plan";
    const signReadiness = buildProviderDocumentationSignReadiness({
      state,
      encounterMode: "ED",
      savedMetadata: buildProviderDocumentationMetadata({
        encounterMode: "ED",
        savedAt: "2026-05-17T12:00:00.000Z",
        savedBy: "Dr Test",
      }),
      signedOrFinalized: true,
    });
    expect(signReadiness.readyToSign).toBe(false);
    expect(providerDocumentationCanSubmitSignature({ attestationAccepted: true, signReadiness, signedOrFinalized: true })).toBe(false);
    const addendumPayload = { providerAddenda: [{ text: "Post-sign addendum remains append-only." }] };
    expect(JSON.stringify(addendumPayload)).not.toMatch(/billing|diagnosisId|orderId/i);
  });

  it("uses ED and observation signed timeline labels", () => {
    expect(providerDocumentationSignedTimelineLabel("ED")).toBe("ED provider documentation signed");
    expect(providerDocumentationSignedTimelineLabel("OBSERVATION")).toBe(
      "Observation provider progress note signed"
    );
    expect(providerDocumentationSignedTimelineLabel("OBSERVATION")).not.toMatch(/discharge/i);
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

