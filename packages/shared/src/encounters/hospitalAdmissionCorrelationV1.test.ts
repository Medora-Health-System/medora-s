import { describe, expect, it } from "vitest";
import {
  admissionPathwaysMustAllowEdPlusInpatient,
  admittedAtProximityAloneCannotProveCorrelation,
  buildAdmissionCorrelationId,
  buildHospitalAdmissionCorrelationV1,
  canTransitionAdmissionCorrelationStatus,
  clinicalGovernanceBelongsToReceivingEncounter,
  evaluateDuplicateAdmission,
  evaluateLegacyAdmissionLinkage,
  hospitalEpisodeAloneCannotProveCorrelation,
  isUnsafePatientActiveCorrelationId,
  mergeHospitalAdmissionCorrelationIntoSummary,
  planResolveOrCreateReceivingEncounter,
  readHospitalAdmissionCorrelation,
  resolveReceivingEncounterReuse,
} from "./hospitalAdmissionCorrelationV1.js";
import { evaluateConcurrentEncounterCreate } from "./concurrentEncounterPolicyV1.js";
import { diagnoseAdmissionCorrelation } from "./admissionCorrelationDiagnosticsV1.js";
import {
  admissionCorrelationProductionDefaultsAreOff,
  wrongOpenInpatientReusePreventionAlwaysOn,
} from "./admissionCorrelationFlags.js";

describe("D3E.8 hospitalAdmissionCorrelationV1", () => {
  it("reuses by idempotency key", () => {
    const corr = buildHospitalAdmissionCorrelationV1({
      admissionIntent: "NURSE_ADMISSION_INTAKE",
      patientId: "p1",
      facilityId: "f1",
      idempotencyKey: "idem-1",
      receivingEncounterId: "ip-1",
    });
    const decision = resolveReceivingEncounterReuse({
      patientId: "p1",
      facilityId: "f1",
      admissionIntent: "NURSE_ADMISSION_INTAKE",
      idempotencyKey: "idem-1",
      openInpatientCandidates: [
        {
          id: "ip-1",
          admissionSummaryJson: mergeHospitalAdmissionCorrelationIntoSummary({}, corr),
        },
      ],
    });
    expect(decision.action).toBe("REUSE");
    if (decision.action === "REUSE") {
      expect(decision.reason).toBe("IDEMPOTENCY_KEY");
    }
  });

  it("reuses placement ↔ nurse intake via source + placement bridge", () => {
    const nurseCorr = buildHospitalAdmissionCorrelationV1({
      admissionIntent: "NURSE_ADMISSION_INTAKE",
      patientId: "p1",
      facilityId: "f1",
      hospitalEpisodeId: "ep-1",
      sourceEncounterId: "ed-1",
      receivingEncounterId: "ip-nurse",
      idempotencyKey: "adm-abc",
    });
    const decision = resolveReceivingEncounterReuse({
      patientId: "p1",
      facilityId: "f1",
      admissionIntent: "PLACEMENT_RECEIVING",
      hospitalEpisodeId: "ep-1",
      sourceEncounterId: "ed-1",
      internalPlacementRequestId: "plc-1",
      openInpatientCandidates: [
        {
          id: "ip-nurse",
          hospitalEpisodeId: "ep-1",
          admissionSummaryJson: mergeHospitalAdmissionCorrelationIntoSummary({}, nurseCorr),
        },
      ],
    });
    expect(decision.action).toBe("REUSE");
    if (decision.action === "REUSE") {
      expect(decision.reason).toBe("SOURCE_AND_PLACEMENT");
    }
  });

  it("does not reuse when only HospitalEpisode matches", () => {
    const prior = buildHospitalAdmissionCorrelationV1({
      admissionIntent: "DIRECT_ADMISSION",
      patientId: "p1",
      facilityId: "f1",
      hospitalEpisodeId: "ep-1",
      sourceEncounterId: "ed-old",
      receivingEncounterId: "ip-old",
      idempotencyKey: "other",
    });
    const decision = resolveReceivingEncounterReuse({
      patientId: "p1",
      facilityId: "f1",
      admissionIntent: "NURSE_ADMISSION_INTAKE",
      hospitalEpisodeId: "ep-1",
      sourceEncounterId: "ed-new",
      idempotencyKey: "new-key",
      openInpatientCandidates: [
        {
          id: "ip-old",
          hospitalEpisodeId: "ep-1",
          admissionSummaryJson: mergeHospitalAdmissionCorrelationIntoSummary({}, prior),
        },
      ],
    });
    expect(decision.action).toBe("DENY");
    expect(hospitalEpisodeAloneCannotProveCorrelation()).toBe(true);
    expect(admittedAtProximityAloneCannotProveCorrelation()).toBe(true);
  });

  it("rejects unsafe patient:active correlation ids for matching", () => {
    expect(isUnsafePatientActiveCorrelationId("admcorr:patient:f1:p1:active")).toBe(true);
    const built = buildAdmissionCorrelationId({
      patientId: "p1",
      facilityId: "f1",
    });
    expect(built.ok).toBe(false);
    const withUuid = buildAdmissionCorrelationId({ serverGeneratedId: "u-1" });
    expect(withUuid.ok).toBe(true);
  });

  it("denies blind concurrent create without correlation", () => {
    const d = evaluateConcurrentEncounterCreate({
      pathway: "NURSE_ADMISSION_INTAKE",
      requestedType: "INPATIENT",
      existingOpen: [{ id: "ip-1", type: "INPATIENT", status: "OPEN" }],
    });
    expect(d.allowed).toBe(false);
  });

  it("allows ED + Inpatient when no open IP", () => {
    const d = evaluateConcurrentEncounterCreate({
      pathway: "NURSE_ADMISSION_INTAKE",
      requestedType: "INPATIENT",
      existingOpen: [{ id: "ed-1", type: "EMERGENCY", status: "OPEN" }],
    });
    expect(d.allowed).toBe(true);
    expect(admissionPathwaysMustAllowEdPlusInpatient("NURSE_ADMISSION_INTAKE")).toBe(true);
  });

  it("legacy ambiguous linkage requires review", () => {
    const legacy = evaluateLegacyAdmissionLinkage({
      samePatientOnly: true,
      sameEpisodeOnly: true,
    });
    expect(legacy.action).toBe("REVIEW_REQUIRED");
  });

  it("planResolveOrCreate reuses correlation.receivingEncounterId", () => {
    const corr = buildHospitalAdmissionCorrelationV1({
      admissionIntent: "DIRECT_ADMISSION",
      patientId: "p1",
      facilityId: "f1",
      receivingEncounterId: "ip-fixed",
      serverGeneratedId: "seed-1",
    });
    const plan = planResolveOrCreateReceivingEncounter({
      correlation: corr,
      actorUserId: "u1",
      expectedPatientId: "p1",
      expectedFacilityId: "f1",
      openInpatientCandidates: [],
    });
    expect(plan.action).toBe("REUSE");
    if (plan.action === "REUSE") {
      expect(plan.receivingEncounterId).toBe("ip-fixed");
    }
  });

  it("duplicate evaluator maps reuse/deny", () => {
    expect(
      evaluateDuplicateAdmission({
        reuse: {
          action: "REUSE",
          receivingEncounterId: "ip-1",
          reason: "IDEMPOTENCY_KEY",
          correlation: null,
        },
      }).code
    ).toBe("EXISTING_CORRELATED_ADMISSION");
  });

  it("status transitions are governed", () => {
    expect(canTransitionAdmissionCorrelationStatus("INTENT_CREATED", "CANCELLED")).toBe(true);
    expect(canTransitionAdmissionCorrelationStatus("COMPLETED", "ACTIVE")).toBe(false);
  });

  it("diagnostics detect placement/correlation receiving mismatch", () => {
    const corr = buildHospitalAdmissionCorrelationV1({
      admissionIntent: "PLACEMENT_RECEIVING",
      patientId: "p1",
      facilityId: "f1",
      receivingEncounterId: "ip-a",
      serverGeneratedId: "s1",
    });
    const findings = diagnoseAdmissionCorrelation({
      correlation: corr,
      placement: {
        id: "plc-1",
        patientId: "p1",
        facilityId: "f1",
        receivingEncounterId: "ip-b",
      },
    });
    expect(findings.some((f) => f.code === "PLACEMENT_CORRELATION_RECEIVING_MISMATCH")).toBe(
      true
    );
  });

  it("keeps wrong-reuse prevention always on and production flags off", () => {
    expect(wrongOpenInpatientReusePreventionAlwaysOn()).toBe(true);
    expect(admissionCorrelationProductionDefaultsAreOff({})).toBe(true);
    expect(clinicalGovernanceBelongsToReceivingEncounter()).toBe(true);
  });

  it("reads legacy summary fields into correlation view", () => {
    const legacy = readHospitalAdmissionCorrelation({
      d3e6dHospitalAdmissionIntake: true,
      d3e6dIdempotencyKey: "k1",
      originatingEdEncounterId: "ed-9",
      fromInternalPlacementRequestId: "plc-9",
    });
    expect(legacy?.idempotencyKey).toBe("k1");
    expect(legacy?.sourceEncounterId).toBe("ed-9");
  });
});
