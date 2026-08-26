/**
 * INP.DIS.1B — Provider inpatient discharge documentation tests.
 */

import { describe, expect, it } from "vitest";
import {
  emptyInpatientProviderDischarge,
  hydrateInpatientProviderDischarge,
  mergeInpatientProviderDischargeIntoDischargeSummary,
  mergeInpatientProviderDischargePayload,
  normalizeDischargeDiagnoses,
  plannedDestinationSilentlyBecameFinalDisposition,
  projectInpatientProviderDischargeToFlatFields,
  sanitizeInpatientProviderDischargeClientPayload,
  suggestFinalDispositionFromPlannedDestination,
  validateInpatientProviderDischarge,
} from "./inpatientProviderDischargeInpDis1b.js";
import {
  hasClinicianAuthoredDischargeContent,
  mergeDischargeSummaryPreservingAuthored,
  readEffectiveInpatientDischargeSummary,
  resolveFinalDisposition,
  resolveInpatientDischargeForDisplay,
} from "./inpatientDischargeContractInpDis1a.js";
import {
  shouldOverwriteDischargeSummaryWithSynthesis,
  synthesizeInpatientDischargeSummaryDraft,
} from "./inpatientDischargeSynthesisD4a33a.js";

function sampleCompleteDoc() {
  return mergeInpatientProviderDischargePayload(null, {
    dischargeDiagnoses: [
      {
        id: "dx-1",
        code: "J18.9",
        description: "Pneumonia",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        id: "dx-2",
        code: "E11.9",
        description: "Type 2 diabetes",
        isPrimary: false,
        sortOrder: 1,
      },
    ],
    hospitalCourse: "IV antibiotics, improved oxygenation.",
    conditionAtDischarge: { status: "IMPROVED" },
    finalDisposition: {
      code: "HOME",
      labelSnapshot: "Home",
    },
    reasonForHospitalization: "Community-acquired pneumonia.",
    pendingStudies: [
      {
        id: "p-1",
        type: "CULTURE",
        description: "Blood culture pending",
        responsibleParty: "Lab",
        followUpPlan: "PCP follow-up",
      },
    ],
  });
}

describe("INP.DIS.1B inpatient provider discharge", () => {
  it("hydrates legacy 1A shell and preserves clinician narrative unchanged", () => {
    const legacy = {
      schemaVersion: "INP.DIS.1A",
      hospitalCourse: "Stable on room air.",
      finalDisposition: "HOME",
      dischargeDiagnoses: [{ label: "COPD", isPrimary: true }],
      authorization: {
        at: "2026-08-01T12:00:00.000Z",
        byUserId: "provider-1",
        displayNameSnapshot: "Dr Smith",
      },
    };
    const hydrated = hydrateInpatientProviderDischarge(legacy);
    expect(hydrated?.hospitalCourse).toBe("Stable on room air.");
    expect(hydrated?.finalDisposition?.code).toBe("HOME");
    expect(hydrated?.dischargeDiagnoses[0]?.description).toBe("COPD");
    expect(hydrated?.documentedByUserId).toBe("provider-1");
  });

  it("enforces exactly one primary discharge diagnosis on normalize", () => {
    const normalized = normalizeDischargeDiagnoses([
      { id: "a", description: "A", isPrimary: true, sortOrder: 0 },
      { id: "b", description: "B", isPrimary: true, sortOrder: 1 },
      { id: "c", description: "C", isPrimary: false, sortOrder: 2 },
    ]);
    expect(normalized.filter((d) => d.isPrimary)).toHaveLength(1);
    expect(normalized[0]?.isPrimary).toBe(true);
  });

  it("validates complete save requirements", () => {
    const incomplete = emptyInpatientProviderDischarge();
    expect(validateInpatientProviderDischarge(incomplete, "complete").ok).toBe(false);
    expect(validateInpatientProviderDischarge(sampleCompleteDoc(), "complete").ok).toBe(true);
    expect(validateInpatientProviderDischarge(sampleCompleteDoc(), "draft").ok).toBe(true);
  });

  it("merge preserves unrelated discharge namespaces and unknown keys", () => {
    const existing = {
      dischargeDiagnosisSummary: "legacy",
      inpatientMedRecon: { schemaVersion: "INP.DIS.1A", lines: [{ id: "m1" }] },
      inpatientNursingDischarge: { destinationConfirmed: "HOME" },
      providerDischargeDiagnosisDocs: [{ id: "er-card" }],
      customFutureKey: "preserved",
    };
    const merged = mergeInpatientProviderDischargeIntoDischargeSummary(existing, sampleCompleteDoc());
    expect(merged.inpatientMedRecon).toEqual(existing.inpatientMedRecon);
    expect(merged.inpatientNursingDischarge).toEqual(existing.inpatientNursingDischarge);
    expect(merged.providerDischargeDiagnosisDocs).toEqual(existing.providerDischargeDiagnosisDocs);
    expect(merged.customFutureKey).toBe("preserved");
    expect(merged.inpatientProviderDischarge).toBeDefined();
    expect(merged.hospitalCourse).toContain("IV antibiotics");
  });

  it("strips client-submitted authorship fields from payload", () => {
    const sanitized = sanitizeInpatientProviderDischargeClientPayload({
      hospitalCourse: "Course text",
      documentedByUserId: "fake-user",
      documentedByDisplayNameSnapshot: "Fake Name",
      revision: 99,
    });
    expect(sanitized.hospitalCourse).toBe("Course text");
    expect(sanitized.documentedByUserId).toBeUndefined();
    expect(sanitized.revision).toBeUndefined();
  });

  it("planned destination suggestion does not silently become final disposition", () => {
    expect(suggestFinalDispositionFromPlannedDestination("SKILLED_NURSING")).toBe(
      "SKILLED_NURSING_FACILITY"
    );
    expect(
      plannedDestinationSilentlyBecameFinalDisposition({
        plannedDestination: "SKILLED_NURSING",
        finalDisposition: { code: "SKILLED_NURSING_FACILITY" },
      })
    ).toBe(true);
    expect(
      plannedDestinationSilentlyBecameFinalDisposition({
        plannedDestination: "SKILLED_NURSING",
        finalDisposition: { code: "SKILLED_NURSING_FACILITY" },
        explicitlyConfirmed: true,
      })
    ).toBe(false);
  });

  it("provider-authored data wins over D4A.3.3A synthesis fallback", () => {
    const authored = mergeInpatientProviderDischargeIntoDischargeSummary({}, sampleCompleteDoc());
    const draft = synthesizeInpatientDischargeSummaryDraft({
      admissionDiagnosis: "Other admission",
      dischargeDestination: "SNF",
      language: "en",
    });
    expect(hasClinicianAuthoredDischargeContent(authored)).toBe(true);
    expect(shouldOverwriteDischargeSummaryWithSynthesis(authored)).toBe(false);
    const merged = mergeDischargeSummaryPreservingAuthored(authored, draft);
    expect(merged.hospitalCourse).toContain("IV antibiotics");
    expect(resolveFinalDisposition(merged)).toBe("Home");
    expect(resolveInpatientDischargeForDisplay({ stored: merged })?.hospitalCourse).toContain(
      "IV antibiotics"
    );
  });

  it("projects provider fields into effective discharge reader", () => {
    const raw = mergeInpatientProviderDischargeIntoDischargeSummary({}, sampleCompleteDoc());
    const effective = readEffectiveInpatientDischargeSummary(raw);
    expect(effective.hasClinicianAuthoredContent).toBe(true);
    expect(effective.finalDisposition).toBe("Home");
    expect(effective.inpatientProviderDischarge?.pendingStudies).toHaveLength(1);
    const flat = projectInpatientProviderDischargeToFlatFields(sampleCompleteDoc());
    expect(String(flat.dischargeDiagnosisSummary)).toContain("Pneumonia");
    expect(flat.pendingStudiesSummary).toContain("Blood culture");
  });
});
