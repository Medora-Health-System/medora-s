import { describe, expect, it } from "vitest";
import {
  appendDocumentationFragment,
  buildProviderDocumentationMetadata,
  buildProviderDocumentationPreviewSections,
  buildProviderDocumentationSavePayload,
  emptyProviderDocumentationWorkspaceState,
  hydrateProviderDocumentationWorkspaceState,
  providerDocumentationTimelineLabel,
  providerDocumentationTitleKey,
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
});

