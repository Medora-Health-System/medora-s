import { describe, expect, it } from "vitest";
import { INPATIENT_ADMISSION_CLINICAL_SECTIONS } from "./connectedInpatientAdmissionIntakeD4a0.js";
import {
  applyNurseAdmissionSignature,
  computeAdmissionCompletionSummary,
  emptyMedSurgNursingAdmissionDocV1,
  type MedSurgNursingAdmissionDocV1,
} from "./medSurgNursingAdmissionD4a1.js";
import { buildNursingAdmissionPrintSummary } from "./nursingAdmissionDomainIntegrationD4a25a.js";

function docWithStates(overrides: Partial<Record<(typeof INPATIENT_ADMISSION_CLINICAL_SECTIONS)[number], "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE" | "NOT_APPLICABLE" | "UNABLE_TO_COMPLETE">> = {}): MedSurgNursingAdmissionDocV1 {
  const doc = emptyMedSurgNursingAdmissionDocV1({ patientId: "patient", facilityId: "facility", encounterId: "encounter" });
  return {
    ...doc,
    sections: Object.fromEntries(INPATIENT_ADMISSION_CLINICAL_SECTIONS.map((sectionId) => [sectionId, {
      sectionId,
      completionState: overrides[sectionId] ?? "COMPLETE",
      expectedVersion: 0,
      ...(overrides[sectionId] === "UNABLE_TO_COMPLETE" ? { unableReason: "Patient unavailable" } : {}),
    }])) as MedSurgNursingAdmissionDocV1["sections"],
  };
}

function sign(doc: MedSurgNursingAdmissionDocV1) {
  return applyNurseAdmissionSignature({ doc, actorUserId: "rn-authority", displayName: "Marie Nurse", credentials: "RN", clientExpectedVersion: doc.expectedVersion, atIso: "2026-08-12T08:14:00.000Z" });
}

describe("INP.1B.4 signature and workflow completion regression", () => {
  it.each(["NOT_STARTED", "IN_PROGRESS"] as const)("rejects signature while an applicable section is %s without mutating it", (state) => {
    const doc = docWithStates({ PAIN: state });
    const result = sign(doc);
    expect(result).toEqual({ ok: false, code: "INCOMPLETE_ADMISSION" });
    expect(doc.sections.PAIN?.completionState).toBe(state);
    expect(doc.nurseSignature?.signed).toBe(false);
  });

  it("accepts complete, not-applicable, and unable dispositions under the existing policy", () => {
    const doc = docWithStates({ PAIN: "NOT_APPLICABLE", FALL_SAFETY: "UNABLE_TO_COMPLETE" });
    const completion = computeAdmissionCompletionSummary(doc);
    expect(completion.allRequiredComplete).toBe(true);
    expect(completion.complete).toBe(18);
    expect(completion.notApplicable).toBe(1);
    expect(completion.unable).toBe(1);
    expect(sign(doc).ok).toBe(true);
  });

  it("signs a fully completed admission without conflating the pre-sign workflow result", () => {
    const doc = docWithStates();
    expect(computeAdmissionCompletionSummary(doc).allRequiredComplete).toBe(true);
    expect(doc.nurseSignature?.signed).toBe(false);
    const result = sign(doc);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.nurseSignature).toMatchObject({ signed: true, signedByUserId: "rn-authority", displayName: "Marie Nurse" });
    expect(computeAdmissionCompletionSummary(result.doc).allRequiredComplete).toBe(true);
  });

  it("keeps existing signed historical documents readable through the authoritative legal projection", () => {
    const historical = { ...docWithStates({ PAIN: "IN_PROGRESS" }), nurseSignature: { signed: true as const, signedAt: "2026-07-01T10:00:00.000Z", signedByUserId: "legacy-rn", displayName: "Legacy Nurse" } };
    expect(computeAdmissionCompletionSummary(historical).allRequiredComplete).toBe(false);
    const summary = buildNursingAdmissionPrintSummary({ doc: historical, facility: { id: "facility" }, patient: { id: "patient" }, encounter: { id: "encounter" } });
    expect(summary.printStatus).toBe("SIGNED");
    expect(summary.signature?.displayName).toBe("Legacy Nurse");
  });
});
