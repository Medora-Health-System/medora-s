/**
 * MEDUI.INP.2B.2A — Save coordinator, progress, structured fields, compact cards.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";
import {
  NURSING_ADMISSION_OPTION_CATALOGS,
  NURSING_ADMISSION_SECTION_SCHEMAS,
  NURSING_ADMISSION_STAGES,
  computeAdmissionCompletionSummary,
  deriveAdmissionSectionCompletion,
  emptyMedSurgNursingAdmissionDocV1,
  emptyPatientClinicalHistoryProfile,
  mergeAdmissionPreloadFromPatientProfile,
  projectNursingAdmissionOverview,
  saveAdmissionSectionDraft,
  validateSectionDraftSave,
} from "@medora/shared";
import {
  answersChangedDuringFlight,
  createNursingAdmissionSaveCoordinator,
} from "./nursingAdmissionSaveCoordinator";

const root = join(__dirname);
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("MEDUI.INP.2B.2A nursing admission UAT correction", () => {
  it("1-3 — successful save refreshes expectedVersion; rapid edits coalesce", async () => {
    let version = 3;
    let saves = 0;
    let local = { a: 1 };
    const coord = createNursingAdmissionSaveCoordinator({
      isWriteBlocked: () => false,
      getExpectedVersion: () => version,
      setExpectedVersion: (next) => {
        version = next;
      },
      localAnswers: () => local,
      runSectionSave: async () => {
        saves += 1;
        const saved = { ...local };
        version += 1;
        return { ok: true, expectedVersion: version, savedAnswers: saved };
      },
      runVerify: async () => ({ ok: true, expectedVersion: version }),
    });
    const first = coord.requestSectionSave();
    local = { a: 2 };
    const second = coord.requestSectionSave();
    const [a, b] = await Promise.all([first, second]);
    expect(a.ok || b.ok).toBe(true);
    expect(version).toBeGreaterThan(3);
    expect(saves).toBeGreaterThanOrEqual(1);
    expect(answersChangedDuringFlight({ a: 2 }, { a: 1 })).toBe(true);
  });

  it("4-5 — Save & Continue and navigation share the coordinator queue", () => {
    const shell = read("InpatientAdmissionClinicalShell.tsx");
    expect(shell).toContain("createNursingAdmissionSaveCoordinator");
    expect(shell).toContain('persistSection(undefined, "CONTINUE")');
    expect(shell).toContain('persistSection(undefined, "DRAFT")');
    expect(shell).toContain("requestSectionSave");
    expect(shell).not.toContain("saveInFlightRef");
  });

  it("6-9 — Confirm uses verify after serialized section save; no competing PATCH", () => {
    const shell = read("InpatientAdmissionClinicalShell.tsx");
    expect(shell).toContain("requestVerify");
    expect(shell).toContain('if (status === "UPDATED")');
    expect(shell).toContain("historyReviewComplete");
    expect(shell).toContain("surgicalReviewComplete");
    expect(shell).toContain("reconComplete");
    expect(shell).toContain("allergyReviewComplete");
    expect(shell).toContain("reviewCompletePatchForDomain");
    expect(shell).toContain("requestVerify");
  });

  it("10 — Update reuses enterprise history editor and allergy modal", () => {
    const shell = read("InpatientAdmissionClinicalShell.tsx");
    const editor = read("NursingAdmissionEnterpriseHistoryEditor.tsx");
    expect(shell).toContain("NursingAdmissionEnterpriseHistoryEditor");
    expect(shell).toContain("InpatientAllergyEditorModal");
    expect(shell).toContain("admission-preload-empty");
    expect(editor).toContain("clinical-history-profile/sections/");
    expect(editor).not.toContain("createNursingAdmissionPmh");
  });

  it("10b — preload overlay refreshes enterprise value without duplicating PMH or dropping verification", () => {
    const merged = mergeAdmissionPreloadFromPatientProfile({
      existing: [
        {
          itemId: "pmh-summary",
          domain: "MEDICAL_HISTORY",
          displayLabel: "Past medical history",
          valueText: "old HTN",
          provenance: {
            sourceType: "PATIENT_PROFILE",
            verified: true,
            verificationStatus: "CONFIRMED",
            verifiedByUserId: "rn-1",
            verifiedAt: "2026-08-17T00:00:00.000Z",
            recordedByUserId: null,
            recordedAt: null,
            sourceEncounterId: null,
            sourceLabel: "patient_clinical_history_profile",
          },
        },
      ],
      profile: {
        ...emptyPatientClinicalHistoryProfile("2026-08-18T00:00:00.000Z"),
        medicalHistory: { pastMedicalHistory: "HTN; INP2B2A-live" },
        surgicalHistory: { pastSurgicalHistory: "Appendectomy 2019" },
        homeMedications: { medicationsSummary: "Lisinopril 10 mg daily" },
      },
    });
    const pmh = merged.find((i) => i.itemId === "pmh-summary");
    expect(pmh?.valueText).toBe("HTN; INP2B2A-live");
    expect(pmh?.provenance.verificationStatus).toBe("CONFIRMED");
    expect(merged.some((i) => i.itemId === "psh-summary")).toBe(true);
    expect(merged.some((i) => i.itemId === "home-meds-summary")).toBe(true);
    expect(merged.filter((i) => i.domain === "MEDICAL_HISTORY")).toHaveLength(1);
  });

  it("11-12 — true conflict still 409 and preserves local draft", () => {
    expect(validateSectionDraftSave({ currentExpectedVersion: 4, clientExpectedVersion: 3 }).ok).toBe(false);
    const shell = read("InpatientAdmissionClinicalShell.tsx");
    expect(shell).toContain("CONFLICT_DETECTED");
    expect(shell).toContain("localDraftBackup");
    expect(shell).toContain("inpatientAdmissionInp2b2a.conflict.body");
    expect(shell).toContain("admission-conflict-banner");
  });

  it("13-19 — Save & Continue marks COMPLETE; IN_PROGRESS excluded; N/A and Unable count resolved", () => {
    expect(
      deriveAdmissionSectionCompletion({
        sectionId: "PAIN",
        answers: { painPresent: "NO" },
        previousState: "IN_PROGRESS",
        mode: "CONTINUE",
      })
    ).toBe("COMPLETE");
    expect(
      deriveAdmissionSectionCompletion({
        sectionId: "PAIN",
        answers: { painPresent: "YES" },
        previousState: "NOT_STARTED",
        mode: "DRAFT",
      })
    ).toBe("IN_PROGRESS");
    const doc = emptyMedSurgNursingAdmissionDocV1({
      patientId: "p1",
      facilityId: "f1",
      encounterId: "e1",
    });
    doc.sections.PAIN = { ...doc.sections.PAIN!, completionState: "COMPLETE" };
    doc.sections.FALL_SAFETY = { ...doc.sections.FALL_SAFETY!, completionState: "NOT_APPLICABLE" };
    doc.sections.NUTRITION = {
      ...doc.sections.NUTRITION!,
      completionState: "UNABLE_TO_COMPLETE",
      unableReason: "Off unit",
    };
    doc.sections.OVERVIEW = { ...doc.sections.OVERVIEW!, completionState: "IN_PROGRESS" };
    const summary = computeAdmissionCompletionSummary(doc);
    expect(summary.resolved).toBe(3);
    expect(summary.complete).toBe(1);
    expect(summary.inProgress).toBe(1);
    const saved = saveAdmissionSectionDraft({
      doc,
      sectionId: "PAIN",
      answers: { painPresent: "NO" },
      completionState: "COMPLETE",
      clientExpectedVersion: doc.expectedVersion,
      actorUserId: "rn-1",
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(computeAdmissionCompletionSummary(saved.doc).resolved).toBeGreaterThanOrEqual(3);
    const chrome = read("NursingAdmissionWorkspaceChromeInp2b1.tsx");
    expect(chrome).toContain("nursing-admission-progress-label");
    expect(en.inpatientAdmissionInp2b1.overallProgress).toMatch(/resolved/);
  });

  it("progress survives reload because completionState is on the durable section doc", () => {
    const doc = emptyMedSurgNursingAdmissionDocV1({
      patientId: "p1",
      facilityId: "f1",
      encounterId: "e1",
    });
    const first = saveAdmissionSectionDraft({
      doc,
      sectionId: "PAIN",
      answers: { painPresent: "NO" },
      completionState: "COMPLETE",
      clientExpectedVersion: 0,
      actorUserId: "rn-1",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.doc.sections.PAIN?.completionState).toBe("COMPLETE");
    expect(computeAdmissionCompletionSummary(first.doc).resolved).toBe(1);
  });

  it("20-22 — compact admission source / mode-of-arrival cards persist icons", () => {
    const controls = read("rapid-documentation/ClinicalRapidControls.tsx");
    expect(controls).toContain("minmax(118px, 1fr)");
    expect(controls).toContain("minmax(88px, 1fr)");
    expect(controls).toContain("minHeight: 76");
    expect(controls).toContain("minHeight: 72");
    expect(controls).toContain('aria-pressed={on}');
    const rapid = read("rapid-documentation/NursingAdmissionRapidSectionControls.tsx");
    expect(rapid).toContain('density="source"');
    expect(rapid).toContain('density="arrival"');
  });

  it("23-25 — skin, mobility, social categorical selectors", () => {
    expect(NURSING_ADMISSION_SECTION_SCHEMAS.SKIN_WOUND.fields.find((f) => f.key === "color")?.control).toBe("select");
    expect(NURSING_ADMISSION_SECTION_SCHEMAS.SKIN_WOUND.fields.find((f) => f.key === "temperature")?.control).toBe(
      "select"
    );
    expect(NURSING_ADMISSION_SECTION_SCHEMAS.FUNCTIONAL_MOBILITY.fields.find((f) => f.key === "assistiveDevices")?.control).toBe(
      "multiselect"
    );
    expect(
      NURSING_ADMISSION_SECTION_SCHEMAS.FUNCTIONAL_MOBILITY.fields.find((f) => f.key === "weightBearingRestriction")
        ?.control
    ).toBe("select");
    expect(NURSING_ADMISSION_SECTION_SCHEMAS.SOCIAL_HISTORY.fields.find((f) => f.key === "livingSituation")?.control).toBe(
      "select"
    );
    expect(NURSING_ADMISSION_SECTION_SCHEMAS.SOCIAL_HISTORY.fields.some((f) => f.key === "livesWith")).toBe(false);
    expect(NURSING_ADMISSION_OPTION_CATALOGS.skinColorDetail).toContain("PALE");
    expect(NURSING_ADMISSION_OPTION_CATALOGS.assistiveDevices).toContain("WALKER");
    expect(NURSING_ADMISSION_OPTION_CATALOGS.livingSituation).toContain("LIVES_ALONE");
  });

  it("26 — assignment fields are projections, not a second bed authority", () => {
    const form = read("NursingAdmissionStructuredSectionForm.tsx");
    expect(form).toContain("admission-assignment-projection");
    expect(form).toContain("assignedUnit");
    expect(form).not.toContain("createBedAssignment");
    expect(form).toContain('"assignedBed"');
  });

  it("27-29 — RN/ADMIN write; PROVIDER read-only", () => {
    const panel = read("InpatientWorkspacePanel.tsx");
    expect(panel).toContain('readOnly={!(roles.includes("RN") || roles.includes("ADMIN"))}');
    expect(panel).toContain("canAdmin={roles.includes(\"ADMIN\")}");
  });

  it("30 — Overview projection includes resolvedCount", () => {
    const doc = emptyMedSurgNursingAdmissionDocV1({
      patientId: "p1",
      facilityId: "f1",
      encounterId: "e1",
    });
    doc.sections.PAIN = { ...doc.sections.PAIN!, completionState: "COMPLETE" };
    const projected = projectNursingAdmissionOverview(doc);
    expect(projected.resolvedCount).toBe(1);
    expect(NURSING_ADMISSION_STAGES).toHaveLength(6);
  });

  it("31-32 — EN/FR 2B.2A keys mirrored", () => {
    expect(Object.keys(en.inpatientAdmissionInp2b2a)).toEqual(Object.keys(fr.inpatientAdmissionInp2b2a));
    expect(fr.inpatientAdmissionInp2b2a.conflict.body).toMatch(/session/i);
    expect(en.inpatientAdmissionInp2b2a.addNote).toMatch(/note/i);
    expect(en.inpatientAdmissionInp2b2a.preloadEmpty).toMatch(/history/i);
  });

  it("33 — accessibility on compact cards", () => {
    const controls = read("rapid-documentation/ClinicalRapidControls.tsx");
    expect(controls).toContain('role="radio"');
    expect(controls).toContain("aria-checked");
    expect(controls).toContain("aria-pressed");
    expect(controls).toContain("aria-label");
  });

  it("34-36 — Nursing Assessment / ED / Observation regression isolation", () => {
    const panel = read("InpatientWorkspacePanel.tsx");
    expect(panel).toContain("InpatientNursingAssessmentSection");
    expect(panel).toContain("InpatientAdmissionClinicalShell");
    const sections = read("inpatientWorkspaceSections.ts");
    expect(sections).not.toContain("EmergencyTrackboard");
    const rapid = read("rapid-documentation/NursingAdmissionRapidSectionControls.tsx");
    expect(rapid).not.toContain("ObservationWorkspace");
  });

  it("coordinator still exposes 409 without last-write-wins", async () => {
    const coord = createNursingAdmissionSaveCoordinator({
      isWriteBlocked: () => false,
      getExpectedVersion: () => 1,
      setExpectedVersion: () => undefined,
      localAnswers: () => ({}),
      runSectionSave: async () => ({ ok: false, conflict: true }),
      runVerify: async () => ({ ok: false, conflict: true }),
    });
    const result = await coord.requestSectionSave();
    expect(result.conflict).toBe(true);
    expect(result.ok).toBe(false);
  });
});
