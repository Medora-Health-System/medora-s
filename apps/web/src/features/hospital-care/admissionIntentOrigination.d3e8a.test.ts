/**
 * D3E.8A — Admission journey / resume UI contract smoke tests.
 */

import { describe, expect, it } from "vitest";
import {
  ADMISSION_INTENT_ORIGINATION_CERTIFICATION_ID,
  admissionIntentOriginationProductionDefaultsAreOff,
  admissionJourneyLifecycleSteps,
  applyAdmissionCorrelationMutation,
  buildHospitalAdmissionCorrelationV1,
  evaluateExistingAdmissionIntent,
  planEdAdmitIntentOrigination,
  planObservationToInpatientConversion,
} from "@medora/shared";

describe("D3E.8A admission intent origination UI contracts", () => {
  it("certification id is stable", () => {
    expect(ADMISSION_INTENT_ORIGINATION_CERTIFICATION_ID).toBe(
      "MEDUI.ADMISSION_INTENT_ORIGINATION_OBS_CONVERSION.D3E8A"
    );
  });

  it("production feature defaults remain off", () => {
    expect(admissionIntentOriginationProductionDefaultsAreOff({})).toBe(true);
  });

  it("ED admit plan creates correlation before placement attachment completes", () => {
    const plan = planEdAdmitIntentOrigination({
      patientId: "p1",
      facilityId: "f1",
      sourceEncounterId: "ed-1",
      placementRequestId: "ipr-1",
      initiatedByUserId: "u1",
      serverGeneratedId: "seed-1",
    });
    expect(plan.steps[0]?.action).toBe("CREATE_CORRELATION");
    expect(plan.initialCorrelation.status).toBe("INTENT_CREATED");
    expect(plan.finalCorrelation.internalPlacementRequestId).toBe("ipr-1");
    expect(plan.finalCorrelation.status).toBe("PLACEMENT_REQUESTED");
  });

  it("double intent evaluation returns EXISTING_ADMISSION_INTENT", () => {
    const corr = buildHospitalAdmissionCorrelationV1({
      admissionIntent: "ED_ADMIT_TO_INPATIENT",
      patientId: "p1",
      facilityId: "f1",
      sourceEncounterId: "ed-1",
      serverGeneratedId: "s1",
    });
    const evalResult = evaluateExistingAdmissionIntent({
      sourceEncounterId: "ed-1",
      destinationContext: "INPATIENT",
      existingCorrelations: [corr],
    });
    expect(evalResult.code).toBe("EXISTING_ADMISSION_INTENT");
  });

  it("stale expectedVersion is rejected", () => {
    const corr = buildHospitalAdmissionCorrelationV1({
      admissionIntent: "DIRECT_ADMISSION",
      patientId: "p1",
      facilityId: "f1",
      serverGeneratedId: "s2",
      correlationVersion: 3,
    });
    const mut = applyAdmissionCorrelationMutation(corr, 2, { status: "CANCELLED" });
    expect(mut.ok).toBe(false);
    if (!mut.ok) expect(mut.code).toBe("VERSION_CONFLICT");
  });

  it("observation conversion preserves OBSERVATION type and requires med transition", () => {
    const plan = planObservationToInpatientConversion({
      patientId: "p1",
      facilityId: "f1",
      sourceObservationEncounterId: "obs-1",
      sourceEncounterType: "OBSERVATION",
      medicationTransitionAction: "CONTINUE",
      initiatedByUserId: "u1",
      serverGeneratedId: "s3",
    });
    expect("ok" in plan && plan.ok === false).toBe(false);
    if (!("ok" in plan)) {
      expect(plan.createNewInpatient).toBe(true);
      expect(plan.preserveObservationEncounterType).toBe(true);
      expect(plan.correlation.admissionIntent).toBe("OBSERVATION_CONVERSION");
    }
  });

  it("journey lifecycle exposes clinician-friendly ordered steps", () => {
    const corr = buildHospitalAdmissionCorrelationV1({
      admissionIntent: "ED_ADMIT_TO_INPATIENT",
      status: "PLACEMENT_REQUESTED",
      patientId: "p1",
      facilityId: "f1",
      serverGeneratedId: "s4",
    });
    const steps = admissionJourneyLifecycleSteps(corr);
    expect(steps.length).toBeGreaterThanOrEqual(8);
    expect(steps[0]?.stepKey).toBe("admission_decision");
    expect(steps.some((s) => s.current)).toBe(true);
  });
});
