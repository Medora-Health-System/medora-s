/**
 * INP.DIS.1C — Enterprise inpatient discharge completion tests.
 */

import { describe, expect, it } from "vitest";
import {
  emptyInpatientProviderDischarge,
  mergeInpatientProviderDischargePayload,
  plannedDestinationSilentlyBecameFinalDisposition,
  validateInpatientProviderDischarge,
} from "./inpatientProviderDischargeInpDis1b.js";
import {
  buildInpatientDischargeChartDraft,
  dispositionRequiresConditionAtDischarge,
  dispositionSkipsPatientInstructionRequirement,
  dispositionUsesHomeInstructionEngine,
  hydrateInpatientProviderDischarge1C,
  mapInpatientDispositionToLifecycleStatus,
  mergeChartDraftPreservingClinicianEdits,
  mergeInpatientProviderDischargeIntoDischargeSummary1C,
  projectInpatientDischargeReadiness,
  suggestFinalDispositionFromPlannedDestination1C,
  validateInpatientProviderDischarge1C,
} from "./inpatientProviderDischargeInpDis1c.js";
import {
  hasClinicianAuthoredDischargeContent,
  resolveInpatientDischargeForDisplay,
} from "./inpatientDischargeContractInpDis1a.js";
import { synthesizeInpatientDischargeSummaryDraft } from "./inpatientDischargeSynthesisD4a33a.js";

describe("INP.DIS.1C inpatient discharge completion", () => {
  it("expands disposition taxonomy and maps lifecycle statuses", () => {
    expect(mapInpatientDispositionToLifecycleStatus("HOME")).toBe("DISCHARGED");
    expect(mapInpatientDispositionToLifecycleStatus("TRANSFER_ACUTE_CARE")).toBe("TRANSFERRED");
    expect(mapInpatientDispositionToLifecycleStatus("SKILLED_NURSING_FACILITY")).toBe(
      "TRANSFERRED"
    );
    expect(mapInpatientDispositionToLifecycleStatus("AGAINST_MEDICAL_ADVICE")).toBe("AMA");
    expect(mapInpatientDispositionToLifecycleStatus("ELOPED")).toBe("AMA");
    expect(mapInpatientDispositionToLifecycleStatus("DECEASED")).toBe("DECEASED");
    expect(mapInpatientDispositionToLifecycleStatus("CORRECTIONAL_FACILITY")).toBe("TRANSFERRED");
    expect(mapInpatientDispositionToLifecycleStatus("ASSISTED_LIVING")).toBe("TRANSFERRED");
    expect(mapInpatientDispositionToLifecycleStatus("HOSPICE")).toBe("TRANSFERRED");
  });

  it("disposition-aware validation skips home requirements for deceased/eloped", () => {
    const deceased = mergeInpatientProviderDischargePayload(null, {
      finalDisposition: {
        code: "DECEASED",
        deceased: { pronouncedAt: "2026-08-28T12:00:00.000Z" },
      } as never,
    });
    expect(validateInpatientProviderDischarge(deceased, "complete").ok).toBe(true);
    expect(dispositionRequiresConditionAtDischarge("DECEASED")).toBe(false);
    expect(dispositionSkipsPatientInstructionRequirement("ELOPED")).toBe(true);
    expect(dispositionUsesHomeInstructionEngine("HOME")).toBe(true);
    expect(dispositionUsesHomeInstructionEngine("DECEASED")).toBe(false);
  });

  it("requires transfer hospital and SNF facility for complete save", () => {
    const transfer = mergeInpatientProviderDischargePayload(null, {
      dischargeDiagnoses: [
        { id: "1", description: "CHF", isPrimary: true, sortOrder: 0 },
      ],
      hospitalCourse: "Course",
      conditionAtDischarge: { status: "STABLE" },
      finalDisposition: { code: "TRANSFER_ACUTE_CARE" },
    });
    expect(validateInpatientProviderDischarge(transfer, "complete").ok).toBe(false);
    const withHospital = mergeInpatientProviderDischargePayload(transfer, {
      finalDisposition: {
        code: "TRANSFER_ACUTE_CARE",
        transfer: { receivingHospital: "Baylor" },
      } as never,
    });
    expect(validateInpatientProviderDischarge(withHospital, "complete").ok).toBe(true);
  });

  it("planned destination suggestion never silently becomes final disposition", () => {
    expect(suggestFinalDispositionFromPlannedDestination1C("HOME")).toBe("HOME");
    expect(
      plannedDestinationSilentlyBecameFinalDisposition({
        plannedDestination: "HOME",
        finalDisposition: { code: "HOME" },
      })
    ).toBe(true);
    expect(
      plannedDestinationSilentlyBecameFinalDisposition({
        plannedDestination: "HOME",
        finalDisposition: { code: "HOME" },
        explicitlyConfirmed: true,
      })
    ).toBe(false);
  });

  it("chart draft preserves clinician-edited fields when force list empty", () => {
    const existing = {
      ...emptyInpatientProviderDischarge(),
      hospitalCourse: "Clinician authored course",
      consultations: "Old consult",
      fieldProvenance: { clinicianEditedFields: ["hospitalCourse"] },
    };
    const draft = buildInpatientDischargeChartDraft({
      admissionDiagnosis: { description: "Pneumonia" },
      consults: [{ specialty: "Cardiology", status: "COMPLETED" }],
      language: "en",
    });
    const declined = mergeChartDraftPreservingClinicianEdits({
      existing,
      draft,
      forceReplaceFields: [],
    });
    expect(declined.next.hospitalCourse).toBe("Clinician authored course");
    expect(declined.refreshed).not.toContain("hospitalCourse");
    expect(declined.next.consultations).toContain("Cardiology");

    const confirmed = mergeChartDraftPreservingClinicianEdits({
      existing,
      draft,
      forceReplaceFields: ["hospitalCourse"],
    });
    expect(confirmed.next.hospitalCourse).not.toBe("Clinician authored course");
    expect(confirmed.refreshed).toContain("hospitalCourse");
    expect(confirmed.next.fieldProvenance?.clinicianEditedFields ?? []).not.toContain(
      "hospitalCourse"
    );
  });

  it("chart draft does not fabricate undocumented complications", () => {
    const draft = buildInpatientDischargeChartDraft({
      admissionDiagnosis: { description: "Pneumonia" },
      language: "en",
    });
    expect(draft.complications).toBeUndefined();
    expect(String(draft.hospitalCourse)).toContain("Admission reason");
    expect(String(draft.hospitalCourse)).toContain("Pneumonia");
    expect(String(draft.hospitalCourse)).not.toMatch(/no complications/i);
  });

  it("merge preserves unrelated namespaces and projects instructions", () => {
    const doc = hydrateInpatientProviderDischarge1C({
      schemaVersion: "INP.DIS.1C",
      hospitalCourse: "Improved",
      dischargeDiagnoses: [
        { id: "1", description: "Pneumonia", isPrimary: true, sortOrder: 0 },
      ],
      conditionAtDischarge: { status: "IMPROVED" },
      finalDisposition: { code: "HOME", labelSnapshot: "Home" },
      pendingStudies: [],
      patientInstructions: {
        returnPrecautions: "Return for fever",
        diagnosisInstructions: "Finish antibiotics",
      },
      followUps: [{ id: "f1", specialty: "PCP", timing: "1-2 days" }],
    });
    expect(doc).not.toBeNull();
    const merged = mergeInpatientProviderDischargeIntoDischargeSummary1C(
      {
        inpatientMedRecon: { lines: [{ id: "m1" }] },
        customKey: "kept",
      },
      doc!
    );
    expect(merged.inpatientMedRecon).toEqual({ lines: [{ id: "m1" }] });
    expect(merged.customKey).toBe("kept");
    expect(merged.returnPrecautions).toBe("Return for fever");
    expect(merged.dischargeStatusMapped).toBe("DISCHARGED");
    expect(hasClinicianAuthoredDischargeContent(merged)).toBe(true);
    expect(
      resolveInpatientDischargeForDisplay({
        stored: merged,
        fallbackDraft: synthesizeInpatientDischargeSummaryDraft({ language: "en" }),
      })?.hospitalCourse
    ).toBe("Improved");
  });

  it("readiness projection marks home instructions attention when missing", () => {
    const chips = projectInpatientDischargeReadiness({
      ...emptyInpatientProviderDischarge(),
      finalDisposition: { code: "HOME" },
      dischargeDiagnoses: [
        { id: "1", description: "PNA", isPrimary: true, sortOrder: 0 },
      ],
      hospitalCourse: "Course",
    });
    expect(chips.find((c) => c.id === "finalDisposition")?.status).toBe("complete");
    expect(chips.find((c) => c.id === "patientInstructions")?.status).toBe("attention");
  });

  it("1C validate mirrors disposition-aware 1B rules", () => {
    const incomplete = emptyInpatientProviderDischarge();
    expect(validateInpatientProviderDischarge1C(incomplete, "complete").ok).toBe(false);
    expect(validateInpatientProviderDischarge1C(incomplete, "draft").ok).toBe(true);
  });
});
