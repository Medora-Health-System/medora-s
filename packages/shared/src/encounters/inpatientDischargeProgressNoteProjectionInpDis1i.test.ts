/**
 * INP.DIS.1I — Hospital Course projector clinical/legal safety tests.
 */

import { describe, expect, it } from "vitest";
import {
  assembleInpatientHospitalCourseDraft,
  dedupeClinicalSentences,
  formatDischargeNarrativeForDisplay,
  formatInpatientDischargeDiagnosisDisplay,
  formatInpatientDischargeHumanLabel,
  formatInpatientDischargePendingStudyTypeLabel,
  hasDischargeAuthoringMarkup,
  projectProgressNoteForDischargeCourse,
  projectProgressNotesForDischargeCourse,
} from "./inpatientDischargeProgressNoteProjectionInpDis1i.js";
import {
  buildInpatientDischargeChartDraft,
  hydrateInpatientProviderDischarge1C,
  listProtectedChartFieldsWithUpdates,
  markClinicianEditedField,
  mergeChartDraftPreservingClinicianEdits,
  mergeInpatientProviderDischargeIntoDischargeSummary1C,
} from "./inpatientProviderDischargeInpDis1c.js";
import { emptyInpatientProviderDischarge } from "./inpatientProviderDischargeInpDis1b.js";

const SOAP_NOTE = `## Subjective
No chest pain.

## Objective
BP 120/80.

## Assessment
Sepsis, unspecified organism. Monitor clinical status.

## Plan
Consult cardiology.
Start antibiotics.
Monitor clinical status.`;

describe("INP.DIS.1I hospital course projector", () => {
  it("removes SOAP headings and preserves Assessment/Plan content", () => {
    const out = projectProgressNoteForDischargeCourse(SOAP_NOTE);
    expect(out).not.toMatch(/##\s*Subjective/i);
    expect(out).not.toMatch(/##\s*Plan/i);
    expect(out).toContain("No chest pain");
    expect(out).toContain("BP 120/80");
    expect(out).toContain("Sepsis, unspecified organism");
    expect(out).toContain("Monitor clinical status");
  });

  it("does not convert plan into a completed action", () => {
    const out = projectProgressNoteForDischargeCourse(SOAP_NOTE);
    expect(out).toContain("Plan documented: Consult cardiology");
    expect(out).toContain("Plan documented: Start antibiotics");
    expect(out).not.toMatch(/cardiology was consulted/i);
    expect(out).not.toMatch(/antibiotics were administered/i);
    expect(out).not.toMatch(/patient remained stable/i);
  });

  it("does not paraphrase provider prose", () => {
    const out = projectProgressNoteForDischargeCourse(
      "## Plan\nMonitor clinical status."
    );
    expect(out).toContain("Monitor clinical status");
    expect(out).not.toMatch(/remained stable/i);
    expect(out).not.toMatch(/improved/i);
  });

  it("removes exact duplicate sentences and keeps similar-but-different statements", () => {
    const out = projectProgressNotesForDischargeCourse([
      "Monitor clinical status. Monitor clinical status.",
      "No chest pain. Chest pain improved.",
      "Monitor BP. Monitor BP closely due to hypotension.",
    ]);
    const monitorCount = (out.match(/Monitor clinical status/gi) ?? []).length;
    expect(monitorCount).toBe(1);
    expect(out).toContain("No chest pain");
    expect(out).toContain("Chest pain improved");
    expect(out).toContain("Monitor BP.");
    expect(out).toContain("Monitor BP closely due to hypotension");
  });

  it("dedupe is exact-normalized only", () => {
    const kept = dedupeClinicalSentences([
      "No chest pain.",
      "no chest pain",
      "Chest pain improved.",
      "Monitor BP.",
      "Monitor BP closely due to hypotension.",
    ]);
    expect(kept).toEqual([
      "No chest pain.",
      "Chest pain improved.",
      "Monitor BP.",
      "Monitor BP closely due to hypotension.",
    ]);
  });

  it("preserves legacy plain text without invented SOAP assignment", () => {
    const legacy =
      "Day 2: remains febrile. Continue current antibiotics. Reassess in the morning.";
    const out = projectProgressNoteForDischargeCourse(legacy);
    expect(out).toContain("Day 2: remains febrile");
    expect(out).toContain("Continue current antibiotics");
    expect(out).toContain("Reassess in the morning");
    expect(out).not.toMatch(/^Subjective/i);
    expect(out).not.toContain("Plan documented:");
  });

  it("removes markdown fences and does not leak JSON/internal markers", () => {
    const out = projectProgressNoteForDischargeCourse(
      "Afebrile overnight.\n```json\n{\"schemaVersion\":\"INP.DIS.1C\",\"hospitalCourse\":\"secret\"}\n```\nContinue observation."
    );
    expect(out).toContain("Afebrile overnight");
    expect(out).toContain("Continue observation");
    expect(out).not.toContain("```");
    expect(out).not.toContain("schemaVersion");
    expect(out).not.toContain("INP.DIS.1C");
    expect(hasDischargeAuthoringMarkup("## Plan\nGo")).toBe(true);
  });

  it("assembles labeled sections and omits empty ones; consults stay out of course blob", () => {
    const course = assembleInpatientHospitalCourseDraft({
      language: "en",
      admissionReason: "Pneumonia",
      progressNoteTexts: [SOAP_NOTE],
    });
    expect(course).toContain("Admission reason");
    expect(course).toContain("Clinical course / provider documentation");
    expect(course).not.toContain("Consultations");
    expect(course).not.toMatch(/## /);

    const draft = buildInpatientDischargeChartDraft({
      admissionDiagnosis: { description: "Pneumonia" },
      consults: [{ specialty: "Cardiology", status: "COMPLETED" }],
      progressNoteExcerpts: ["## Plan\nConsult cardiology."],
      language: "en",
    });
    expect(String(draft.hospitalCourse)).toContain("Plan documented: Consult cardiology");
    expect(String(draft.hospitalCourse)).not.toMatch(/cardiology was consulted/i);
    expect(draft.consultations).toContain("Cardiology");
    expect(String(draft.hospitalCourse)).not.toContain("Cardiology — COMPLETED");
  });
});

describe("INP.DIS.1I diagnosis persistence + refresh + print projection", () => {
  it("hydrates id, code, description, isPrimary, sortOrder after reload", () => {
    const hydrated = hydrateInpatientProviderDischarge1C({
      schemaVersion: "INP.DIS.1C",
      hospitalCourse: "Course",
      dischargeDiagnoses: [
        {
          id: "dx-a41",
          code: "A41.9",
          description: "Sepsis, unspecified organism",
          isPrimary: true,
          sortOrder: 0,
        },
      ],
    });
    expect(hydrated?.dischargeDiagnoses).toEqual([
      {
        id: "dx-a41",
        code: "A41.9",
        description: "Sepsis, unspecified organism",
        isPrimary: true,
        sortOrder: 0,
      },
    ]);
  });

  it("remove-primary is not reassigned by normalize/hydrate", () => {
    const hydrated = hydrateInpatientProviderDischarge1C({
      schemaVersion: "INP.DIS.1C",
      hospitalCourse: "Course",
      dischargeDiagnoses: [
        { id: "1", code: "A41.9", description: "Sepsis", isPrimary: false, sortOrder: 0 },
        { id: "2", code: "J18.9", description: "Pneumonia", isPrimary: false, sortOrder: 1 },
      ],
    });
    expect(hydrated?.dischargeDiagnoses.every((d) => d.isPrimary === false)).toBe(true);
  });

  it("diagnosis display is description-first", () => {
    expect(
      formatInpatientDischargeDiagnosisDisplay({
        code: "A41.9",
        description: "Sepsis, unspecified organism",
      })
    ).toBe("Sepsis, unspecified organism (A41.9)");
  });

  it("lists protected chart fields that differ for explicit refresh review", () => {
    const existing = {
      ...emptyInpatientProviderDischarge(),
      hospitalCourse: "Clinician authored course",
      fieldProvenance: markClinicianEditedField(null, "hospitalCourse"),
    };
    const draft = buildInpatientDischargeChartDraft({
      admissionDiagnosis: { description: "Pneumonia" },
      progressNoteExcerpts: ["Day 2: remains febrile."],
      language: "en",
    });
    expect(
      listProtectedChartFieldsWithUpdates({ existing, draft })
    ).toContain("hospitalCourse");
    const declined = mergeChartDraftPreservingClinicianEdits({
      existing,
      draft,
      forceReplaceFields: [],
    });
    expect(declined.next.hospitalCourse).toBe("Clinician authored course");
  });

  it("print merge uses description+code, sanitized course, human disposition, no SOAP/raw type", () => {
    const doc = hydrateInpatientProviderDischarge1C({
      schemaVersion: "INP.DIS.1C",
      hospitalCourse: "## Subjective\nNo chest pain.\n## Plan\nConsult cardiology.",
      dischargeDiagnoses: [
        {
          id: "1",
          code: "A41.9",
          description: "Sepsis, unspecified organism",
          isPrimary: true,
          sortOrder: 0,
        },
      ],
      conditionAtDischarge: { status: "STABLE" },
      finalDisposition: { code: "HOME_WITH_HOME_HEALTH" },
      pendingStudies: [{ id: "p1", type: "LAB", description: "Blood culture" }],
    });
    const merged = mergeInpatientProviderDischargeIntoDischargeSummary1C({}, doc!);
    expect(String(merged.hospitalCourse)).not.toMatch(/##/);
    expect(String(merged.hospitalCourse)).toContain("No chest pain");
    expect(String(merged.hospitalCourse)).toContain("Plan documented: Consult cardiology");
    expect(String(merged.dischargeDiagnosisSummary)).toContain(
      "Sepsis, unspecified organism (A41.9)"
    );
    expect(String(merged.dischargeDiagnosisSummary)).toMatch(/^PRIMARY — /);
    expect(merged.dischargeMode).toBe("Home With Home Health");
    expect(merged.exitCondition).toBe("Stable");
    expect(String(merged.pendingStudiesSummary)).toContain("Laboratory");
    expect(String(merged.pendingStudiesSummary)).not.toMatch(/\bLAB\b/);
    expect(formatDischargeNarrativeForDisplay(String(merged.hospitalCourse))).not.toMatch(/##/);
    expect(formatInpatientDischargePendingStudyTypeLabel("IMAGING", "fr")).toBe("Imagerie");
    expect(formatInpatientDischargePendingStudyTypeLabel("LAB", "en")).toBe("Laboratory");
    expect(formatInpatientDischargePendingStudyTypeLabel("IMAGING", "es")).toBe("IMAGING");
    expect(formatInpatientDischargePendingStudyTypeLabel("IMAGING", "es")).not.toBe("Imaging");
    expect(formatInpatientDischargePendingStudyTypeLabel("IMAGING", "es")).not.toBe("Imagerie");
    const esCourse = assembleInpatientHospitalCourseDraft({
      language: "es",
      admissionReason: "Chest pain",
    });
    expect(esCourse).toContain("UNLOCALIZED_SOURCE");
    expect(esCourse).toContain("Chest pain");
    expect(esCourse).not.toContain("Admission reason");
    expect(esCourse).not.toContain("Motif d'admission");
    expect(formatInpatientDischargeHumanLabel("SKILLED_NURSING_FACILITY")).toBe(
      "Skilled Nursing Facility"
    );
  });
});
