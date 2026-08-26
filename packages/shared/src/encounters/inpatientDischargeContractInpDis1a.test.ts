/**
 * INP.DIS.1A — Canonical inpatient discharge contract tests.
 */

import { describe, expect, it } from "vitest";
import {
  extractDischargePlanningFromClinicalOps,
  hasClinicianAuthoredDischargeContent,
  hasMeaningfulDischargeSummary,
  isSynthesizedDraftFallback,
  mergeDischargeSummaryPreservingAuthored,
  plannedDestinationIsDistinctFromFinalDisposition,
  readEffectiveInpatientDischargeSummary,
  resolveFinalDisposition,
  resolveInpatientDischargeForDisplay,
  resolvePlannedDestination,
  shouldAllowSynthesizedDraftPersistence,
} from "./inpatientDischargeContractInpDis1a.js";
import {
  synthesizeInpatientDischargeSummaryDraft,
  shouldOverwriteDischargeSummaryWithSynthesis,
} from "./inpatientDischargeSynthesisD4a33a.js";
import { projectLegacyDischargeOps } from "../clinicalDocumentation/enterpriseCaseManagementDischargePlanningD4b7.js";

describe("INP.DIS.1A inpatient discharge contract", () => {
  it("legacy ED dischargeSummaryJson remains readable", () => {
    const er = {
      dischargeMode: "Domicile",
      disposition: "Stable",
      dischargeDiagnosisSummary: "Acute bronchitis",
      providerDischargeDiagnosisDocs: [{ diagnosisLabel: "Acute bronchitis", sections: {} }],
      providerDischargeDocumentedAt: "2026-08-01T12:00:00.000Z",
      providerDischargeDocumentedByDisplayName: "Dr Smith",
    };
    const effective = readEffectiveInpatientDischargeSummary(er);
    expect(hasClinicianAuthoredDischargeContent(er)).toBe(true);
    expect(hasMeaningfulDischargeSummary(er)).toBe(true);
    expect(effective.finalDisposition).toBe("Domicile");
    expect(resolveInpatientDischargeForDisplay({ stored: er })?.dischargeDiagnosisSummary).toBe(
      "Acute bronchitis"
    );
  });

  it("legacy inpatient flat dischargeSummaryJson remains readable", () => {
    const flat = {
      dischargeDiagnosisSummary: "Pneumonia resolved",
      hospitalCourse: "IV antibiotics, improved oxygenation.",
      dischargeMode: "HOME",
      patientDestination: "Home with services",
    };
    expect(hasClinicianAuthoredDischargeContent(flat)).toBe(true);
    expect(readEffectiveInpatientDischargeSummary(flat).finalDisposition).toBe("HOME");
  });

  it("empty discharge summary stays empty without explicit fallback draft", () => {
    expect(hasMeaningfulDischargeSummary(null)).toBe(false);
    expect(hasMeaningfulDischargeSummary({})).toBe(false);
    expect(resolveInpatientDischargeForDisplay({ stored: null })).toBeNull();
    expect(resolveInpatientDischargeForDisplay({ stored: {} })).toBeNull();
  });

  it("synthesized draft cannot overwrite meaningful discharge content", () => {
    const authored = {
      dischargeDiagnosisSummary: "CHF exacerbation — resolved",
      hospitalCourse: "Diuresis and oxygen wean.",
      finalDisposition: "HOME",
    };
    const draft = synthesizeInpatientDischargeSummaryDraft({
      admissionDiagnosis: "Other",
      dischargeDestination: "SNF",
      language: "en",
    });
    expect(shouldOverwriteDischargeSummaryWithSynthesis(authored)).toBe(false);
    const merged = mergeDischargeSummaryPreservingAuthored(authored, draft);
    expect(merged.dischargeDiagnosisSummary).toBe("CHF exacerbation — resolved");
    expect(merged.hospitalCourse).toBe("Diuresis and oxygen wean.");
  });

  it("planned destination never becomes provider final disposition implicitly", () => {
    const draft = synthesizeInpatientDischargeSummaryDraft({
      dischargeDestination: "Skilled Nursing Facility",
      dischargeWorkflowState: "READY",
      language: "en",
    });
    expect(draft.plannedDestinationNotFinalDisposition).toBe(true);
    expect(resolveFinalDisposition(draft)).toBeNull();
    expect(resolvePlannedDestination(draft)).toBe("Skilled Nursing Facility");
    expect(
      plannedDestinationIsDistinctFromFinalDisposition({
        plannedDestination: "SNF",
        raw: draft,
      })
    ).toBe(true);
  });

  it("uses persisted ops destination in synthesis — not Home (draft) default", () => {
    const draft = synthesizeInpatientDischargeSummaryDraft({
      dischargeDestination: "REHAB",
      dischargeWorkflowState: "PLANNING",
      language: "en",
    });
    expect(String(draft.plannedDestination)).toBe("REHAB");
    expect(String(draft.dischargeInstructions)).toMatch(/REHAB/);
    expect(String(draft.dischargeInstructions)).not.toMatch(/Home \(draft\)/);
  });

  it("anticipatedDischargeDate projects through D4B.7 legacy ops", () => {
    const ops = {
      workflowState: "READY",
      destination: "HOME",
      barriers: "Placement pending",
      anticipatedDischargeDate: "2026-09-01",
    };
    const projected = projectLegacyDischargeOps({ encounterId: "e1", ops });
    expect(projected[0]?.anticipatedDischargeDate).toBe("2026-09-01");
    expect(projected[0]?.authorizesDischarge).toBe(false);
    expect(projected[0]?.workflowState).toBe("READY");
  });

  it("extracts D3E.7 discharge planning from clinical ops", () => {
    const ctx = extractDischargePlanningFromClinicalOps({
      dischargePlanning: {
        anticipatedDischargeDate: "2026-09-15",
        destination: "SKILLED_NURSING",
        workflowState: "PLANNING",
        updatedAt: "2026-08-26T12:00:00.000Z",
      },
    });
    expect(ctx?.anticipatedDischargeDate).toBe("2026-09-15");
    expect(ctx?.destination).toBe("SKILLED_NURSING");
  });

  it("structured inpatient namespaces do not break legacy readers", () => {
    const raw = {
      dischargeDiagnosisSummary: "COPD",
      inpatientProviderDischarge: {
        schemaVersion: "INP.DIS.1A",
        hospitalCourse: "Stable on room air.",
      },
      customFutureKey: "preserved",
    };
    const effective = readEffectiveInpatientDischargeSummary(raw);
    expect(effective.flat.dischargeDiagnosisSummary).toBe("COPD");
    expect(effective.raw.customFutureKey).toBe("preserved");
    expect(effective.inpatientProviderDischarge?.hospitalCourse).toContain("Stable");
  });

  it("fallback synthesis is explicitly marked without clinician authorship", () => {
    const draft = synthesizeInpatientDischargeSummaryDraft({
      admissionDiagnosis: "Abdominal pain",
      language: "en",
    });
    expect(isSynthesizedDraftFallback(draft)).toBe(true);
    expect(hasClinicianAuthoredDischargeContent(draft)).toBe(false);
    expect(shouldAllowSynthesizedDraftPersistence(null)).toBe(true);
    expect(shouldAllowSynthesizedDraftPersistence(draft)).toBe(true);
  });

  it("provider final disposition wins over planned destination in effective reader", () => {
    const raw = {
      plannedDestination: "HOME",
      plannedDestinationNotFinalDisposition: true,
      inpatientProviderDischarge: {
        finalDisposition: "SKILLED_NURSING_FACILITY",
      },
    };
    const effective = readEffectiveInpatientDischargeSummary(raw);
    expect(effective.plannedDestination).toBe("HOME");
    expect(effective.finalDisposition).toBe("SKILLED_NURSING_FACILITY");
  });

  it("resolveInpatientDischargeForDisplay merges ephemeral fallback without mutating authored store", () => {
    const draft = synthesizeInpatientDischargeSummaryDraft({
      dischargeDestination: "HOME",
      language: "en",
    });
    const displayed = resolveInpatientDischargeForDisplay({
      stored: null,
      fallbackDraft: draft,
    });
    expect(displayed?.isSynthesizedDraftFallback).toBe(true);
    const authored = { hospitalCourse: "Authored course." };
    expect(
      resolveInpatientDischargeForDisplay({ stored: authored, fallbackDraft: draft })?.hospitalCourse
    ).toBe("Authored course.");
  });
});
