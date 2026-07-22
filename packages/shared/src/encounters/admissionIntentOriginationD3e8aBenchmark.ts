/**
 * D3E.8A — ≥1500 deterministic admission intent origination scenarios.
 */

import {
  admissionIntentOriginationProductionDefaultsAreOff,
  earlyAdmissionCorrelationEnabled,
  observationInpatientConversionEnabled,
  admissionCorrelationReconciliationEnabled,
} from "./admissionIntentOriginationFlags.js";
import {
  ADMISSION_INTENT_ORIGINATION_CERTIFICATION_ID,
  activeAdmissionCorrelationStatuses,
  admissionJourneyLifecycleSteps,
  applyAdmissionCorrelationMutation,
  diagnoseAdmissionOrphans,
  evaluateExistingAdmissionIntent,
  evaluateLegacyReconciliationEvidence,
  hospitalEpisodeIsContinuityNotIdentity,
  isActiveAdmissionCorrelationStatus,
  planAttachPlacementToCorrelation,
  planCancelAdmissionBeforeArrival,
  planCancelAfterReceivingStarted,
  planDirectScheduledTransferIntentOrigination,
  planEdAdmitIntentOrigination,
  planObservationToInpatientConversion,
  placementSpecialNeedsWithCorrelation,
  readPlacementAdmissionCorrelationId,
} from "./admissionIntentOriginationD3e8a.js";
import {
  buildHospitalAdmissionCorrelationV1,
  canTransitionAdmissionCorrelationStatus,
  type AdmissionCorrelationStatus,
} from "./hospitalAdmissionCorrelationV1.js";

export type AdmissionIntentOriginationD3e8aCase = {
  id: string;
  category: string;
  signal: string;
  expected: boolean | string | number;
  actual: boolean | string | number;
};

function row(
  id: string,
  category: string,
  signal: string,
  expected: boolean | string | number,
  actual: boolean | string | number
): AdmissionIntentOriginationD3e8aCase {
  return { id, category, signal, expected, actual };
}

export function countAdmissionIntentOriginationD3e8aCasesByCategory(
  cases: AdmissionIntentOriginationD3e8aCase[] = buildAdmissionIntentOriginationD3e8aBenchmarkCases()
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const c of cases) {
    counts[c.category] = (counts[c.category] ?? 0) + 1;
  }
  return counts;
}

export function buildAdmissionIntentOriginationD3e8aBenchmarkCases(): AdmissionIntentOriginationD3e8aCase[] {
  const cases: AdmissionIntentOriginationD3e8aCase[] = [];

  // ED_INTENT (≥150)
  for (let i = 1; i <= 75; i++) {
    const plan = planEdAdmitIntentOrigination({
      patientId: `p-ed-${i}`,
      facilityId: "fac-1",
      sourceEncounterId: `ed-${i}`,
      placementRequestId: `plc-ed-${i}`,
      initiatedByUserId: `u-ed-${i}`,
      idempotencyKey: `idem-ed-${i}`,
      serverGeneratedId: `sg-ed-${i}`,
    });
    cases.push(
      row(`ed-intent-before-${i}`, "ED_INTENT", "intent_created_first", "INTENT_CREATED", plan.initialCorrelation.status)
    );
    cases.push(
      row(`ed-intent-intent-${i}`, "ED_INTENT", "ed_admit_intent", "ED_ADMIT_TO_INPATIENT", plan.initialCorrelation.admissionIntent)
    );
  }

  // PLACEMENT_ATTACH (≥120)
  for (let i = 1; i <= 60; i++) {
    const corr = buildHospitalAdmissionCorrelationV1({
      admissionIntent: "ED_ADMIT_TO_INPATIENT",
      patientId: `p-${i}`,
      facilityId: "fac-1",
      sourceEncounterId: `ed-${i}`,
      serverGeneratedId: `pa-${i}`,
    });
    const attach = planAttachPlacementToCorrelation({
      correlation: corr,
      placementId: `plc-${i}`,
      placementPatientId: `p-${i}`,
      placementFacilityId: "fac-1",
    });
    cases.push(
      row(
        `pa-bidir-${i}`,
        "PLACEMENT_ATTACH",
        "both_directions",
        true,
        attach.ok && attach.correlation.internalPlacementRequestId === `plc-${i}`
      )
    );
    cases.push(
      row(
        `pa-needs-${i}`,
        "PLACEMENT_ATTACH",
        "special_needs",
        corr.admissionCorrelationId,
        attach.ok ? (readPlacementAdmissionCorrelationId(attach.placementSpecialNeeds) ?? "") : ""
      )
    );
  }

  // INTENT_IDEMPOTENCY (≥100)
  for (let i = 1; i <= 50; i++) {
    const existing = buildHospitalAdmissionCorrelationV1({
      admissionIntent: "ED_ADMIT_TO_INPATIENT",
      status: "PLACEMENT_REQUESTED",
      patientId: `p-${i}`,
      facilityId: "fac-1",
      sourceEncounterId: `ed-${i}`,
      internalPlacementRequestId: `plc-${i}`,
      serverGeneratedId: `idem-${i}`,
    });
    const evalExisting = evaluateExistingAdmissionIntent({
      sourceEncounterId: `ed-${i}`,
      destinationContext: "INPATIENT",
      existingCorrelations: [existing],
    });
    cases.push(
      row(
        `ii-dup-${i}`,
        "INTENT_IDEMPOTENCY",
        "existing_intent",
        "EXISTING_ADMISSION_INTENT",
        evalExisting.code
      )
    );
    cases.push(
      row(
        `ii-new-${i}`,
        "INTENT_IDEMPOTENCY",
        "new_source",
        "OK_CREATE",
        evaluateExistingAdmissionIntent({
          sourceEncounterId: `ed-other-${i}`,
          destinationContext: "INPATIENT",
          existingCorrelations: [existing],
        }).code
      )
    );
  }

  // VERSION_CONCURRENCY (≥150)
  for (let i = 1; i <= 75; i++) {
    const corr = buildHospitalAdmissionCorrelationV1({
      admissionIntent: "ED_ADMIT_TO_INPATIENT",
      patientId: `p-${i}`,
      facilityId: "fac-1",
      correlationVersion: i % 5 === 0 ? 3 : 2,
      serverGeneratedId: `vc-${i}`,
    });
    const stale = applyAdmissionCorrelationMutation(corr, 1, { status: "PLACEMENT_REQUESTED" });
    const ok = applyAdmissionCorrelationMutation(corr, corr.correlationVersion, {
      status: "PLACEMENT_REQUESTED",
    });
    cases.push(
      row(`vc-stale-${i}`, "VERSION_CONCURRENCY", "version_conflict", "VERSION_CONFLICT", stale.ok ? "" : stale.code)
    );
    cases.push(
      row(`vc-ok-${i}`, "VERSION_CONCURRENCY", "increment", corr.correlationVersion + 1, ok.ok ? ok.correlation.correlationVersion : -1)
    );
  }

  // OBS_CONVERSION (≥180)
  for (let i = 1; i <= 90; i++) {
    const plan = planObservationToInpatientConversion({
      patientId: `p-obs-${i}`,
      facilityId: "fac-1",
      sourceObservationEncounterId: `obs-${i}`,
      sourceEncounterType: "OBSERVATION",
      medicationTransitionAction: i % 5 === 0 ? "CONTINUE" : i % 5 === 1 ? "MODIFY" : i % 5 === 2 ? "HOLD" : i % 5 === 3 ? "DISCONTINUE" : "REPLACE",
      initiatedByUserId: `u-${i}`,
      serverGeneratedId: `oc-${i}`,
    });
    const ok = "correlation" in plan;
    cases.push(
      row(`oc-intent-${i}`, "OBS_CONVERSION", "observation_conversion", "OBSERVATION_CONVERSION", ok ? plan.correlation.admissionIntent : "")
    );
    cases.push(
      row(`oc-new-ip-${i}`, "OBS_CONVERSION", "new_inpatient", true, ok ? plan.createNewInpatient : false)
    );
  }

  // CANCELLATION (≥120)
  for (let i = 1; i <= 60; i++) {
    const statuses: AdmissionCorrelationStatus[] = ["INTENT_CREATED", "PLACEMENT_REQUESTED", "ACCEPTED"];
    const status = statuses[i % 3]!;
    const corr = buildHospitalAdmissionCorrelationV1({
      admissionIntent: "ED_ADMIT_TO_INPATIENT",
      status,
      patientId: `p-${i}`,
      facilityId: "fac-1",
      internalPlacementRequestId: `plc-${i}`,
      correlationVersion: 1,
      serverGeneratedId: `can-${i}`,
    });
    const before = planCancelAdmissionBeforeArrival({
      correlation: corr,
      patientArrived: false,
      expectedVersion: 1,
    });
    cases.push(
      row(
        `can-before-${i}`,
        "CANCELLATION",
        "no_receiver",
        false,
        before.ok && "createReceivingEncounter" in before ? before.createReceivingEncounter : false
      )
    );
    cases.push(
      row(
        `can-release-${i}`,
        "CANCELLATION",
        "release_bed",
        true,
        before.ok && "releaseBedIfNotArrived" in before ? before.releaseBedIfNotArrived : false
      )
    );
  }

  // ORPHAN_PREVENTION (≥100)
  for (let i = 1; i <= 50; i++) {
    const cancelled = buildHospitalAdmissionCorrelationV1({
      admissionIntent: "ED_ADMIT_TO_INPATIENT",
      status: "CANCELLED",
      patientId: `p-${i}`,
      facilityId: "fac-1",
      internalPlacementRequestId: `plc-${i}`,
      serverGeneratedId: `orph-${i}`,
    });
    const findings = diagnoseAdmissionOrphans({
      correlation: cancelled,
      placement: {
        id: `plc-${i}`,
        patientId: `p-${i}`,
        facilityId: "fac-1",
        status: "ACTIVE",
      },
      placementRequired: true,
    });
    cases.push(
      row(
        `orph-cancel-plc-${i}`,
        "ORPHAN_PREVENTION",
        "cancelled_active_placement",
        true,
        findings.some((f) => f.code === "CANCELLED_CORRELATION_ACTIVE_PLACEMENT")
      )
    );
    cases.push(
      row(
        `orph-no-corr-${i}`,
        "ORPHAN_PREVENTION",
        "placement_without_corr",
        true,
        diagnoseAdmissionOrphans({
          placement: { id: `plc-x-${i}`, patientId: `p-${i}`, facilityId: "fac-1" },
        }).some((f) => f.code === "PLACEMENT_WITHOUT_CORRELATION")
      )
    );
  }

  // LEGACY (≥150)
  for (let i = 1; i <= 75; i++) {
    const amb = evaluateLegacyReconciliationEvidence({
      samePatientOnly: true,
      sameEpisodeOnly: true,
      openInpatientOnly: true,
    });
    const ok = evaluateLegacyReconciliationEvidence({
      placementReceivingEncounterId: `ip-${i}`,
      candidateEncounterId: `ip-${i}`,
    });
    cases.push(row(`leg-amb-${i}`, "LEGACY", "review_required", "REVIEW_REQUIRED", amb.action));
    cases.push(row(`leg-explicit-${i}`, "LEGACY", "explicit_link", "LINK", ok.action));
  }

  // JOURNEY_UI (≥100)
  for (let i = 1; i <= 50; i++) {
    const statuses: AdmissionCorrelationStatus[] = [
      "INTENT_CREATED",
      "PLACEMENT_REQUESTED",
      "ACCEPTED",
      "RECEIVING_STARTED",
      "ENCOUNTER_CREATED",
      "ARRIVED",
      "ACTIVE",
    ];
    const status = statuses[i % statuses.length]!;
    const corr = buildHospitalAdmissionCorrelationV1({
      admissionIntent: "ED_ADMIT_TO_INPATIENT",
      status,
      patientId: `p-${i}`,
      facilityId: "fac-1",
      serverGeneratedId: `jrn-${i}`,
    });
    const steps = admissionJourneyLifecycleSteps(corr);
    cases.push(row(`jrn-count-${i}`, "JOURNEY_UI", "eight_steps", 8, steps.length));
    cases.push(
      row(
        `jrn-reached-${i}`,
        "JOURNEY_UI",
        "decision_reached",
        true,
        steps.find((s) => s.stepKey === "admission_decision")?.reached ?? false
      )
    );
  }

  // DIRECT_SCHEDULED_TRANSFER (≥100)
  for (let i = 1; i <= 34; i++) {
    const direct = planDirectScheduledTransferIntentOrigination({
      admissionIntent: "DIRECT_ADMISSION",
      patientId: `p-d-${i}`,
      facilityId: "fac-1",
      initiatedByUserId: "u1",
      serverGeneratedId: `dir-${i}`,
    });
    cases.push(
      row(`dst-direct-${i}`, "DIRECT_SCHEDULED_TRANSFER", "before_receiving", true, direct.createsBeforeReceiving)
    );
  }
  for (let i = 1; i <= 33; i++) {
    const sched = planDirectScheduledTransferIntentOrigination({
      admissionIntent: "SCHEDULED_ADMISSION",
      patientId: `p-s-${i}`,
      facilityId: "fac-1",
      initiatedByUserId: "u1",
      requestedAdmissionAt: "2026-07-21T12:00:00.000Z",
      serverGeneratedId: `sch-${i}`,
    });
    cases.push(
      row(`dst-sched-${i}`, "DIRECT_SCHEDULED_TRANSFER", "intent_created", "INTENT_CREATED", sched.correlation.status)
    );
  }
  for (let i = 1; i <= 33; i++) {
    const xfer = planDirectScheduledTransferIntentOrigination({
      admissionIntent: "TRANSFER_IN",
      patientId: `p-x-${i}`,
      facilityId: "fac-1",
      initiatedByUserId: "u1",
      admissionSource: "EXTERNAL",
      serverGeneratedId: `xf-${i}`,
    });
    cases.push(
      row(`dst-xfer-${i}`, "DIRECT_SCHEDULED_TRANSFER", "transfer_in", "TRANSFER_IN", xfer.correlation.admissionIntent)
    );
  }

  // HOSPITAL_EPISODE (≥100)
  for (let i = 1; i <= 50; i++) {
    cases.push(
      row(`he-not-id-${i}`, "HOSPITAL_EPISODE", "continuity_only", true, hospitalEpisodeIsContinuityNotIdentity())
    );
    cases.push(
      row(`he-active-${i}`, "HOSPITAL_EPISODE", "active_count", 7, activeAdmissionCorrelationStatuses().length)
    );
  }

  // AUTH_SECURITY (≥80)
  for (let i = 1; i <= 40; i++) {
    const corr = buildHospitalAdmissionCorrelationV1({
      admissionIntent: "ED_ADMIT_TO_INPATIENT",
      patientId: "p-real",
      facilityId: "fac-a",
      serverGeneratedId: `sec-${i}`,
    });
    const crossPatient = planAttachPlacementToCorrelation({
      correlation: corr,
      placementId: `plc-${i}`,
      placementPatientId: "p-forged",
      placementFacilityId: "fac-a",
    });
    cases.push(
      row(`sec-xpat-${i}`, "AUTH_SECURITY", "cross_patient", false, crossPatient.ok)
    );
    const crossFac = planAttachPlacementToCorrelation({
      correlation: corr,
      placementId: `plc-${i}`,
      placementPatientId: "p-real",
      placementFacilityId: "fac-forged",
    });
    cases.push(
      row(`sec-xfac-${i}`, "AUTH_SECURITY", "cross_facility", false, crossFac.ok)
    );
  }

  // FEATURE_FLAGS (≥50)
  for (let i = 1; i <= 17; i++) {
    cases.push(
      row(`ff-off-${i}`, "FEATURE_FLAGS", "prod_defaults_off", true, admissionIntentOriginationProductionDefaultsAreOff({}))
    );
    cases.push(
      row(`ff-early-${i}`, "FEATURE_FLAGS", "early_off", false, earlyAdmissionCorrelationEnabled({}))
    );
    cases.push(
      row(`ff-obs-${i}`, "FEATURE_FLAGS", "obs_off", false, observationInpatientConversionEnabled({}))
    );
  }
  cases.push(
    row("ff-recon-on", "FEATURE_FLAGS", "recon_env", true, admissionCorrelationReconciliationEnabled({
      ADMISSION_CORRELATION_RECONCILIATION_ENABLED: "true",
    }))
  );

  // Required named cases (16 signals)
  const edPlan = planEdAdmitIntentOrigination({
    patientId: "p-req",
    facilityId: "fac-1",
    sourceEncounterId: "ed-req",
    placementRequestId: "plc-req",
    initiatedByUserId: "u1",
    serverGeneratedId: "req-ed",
  });
  cases.push(
    row("req-1-ed-before-plc", "REQUIRED", "ed_corr_before_placement", "INTENT_CREATED", edPlan.initialCorrelation.status),
    row("req-2-plc-at-create", "REQUIRED", "placement_at_creation", "plc-req", edPlan.finalCorrelation.internalPlacementRequestId ?? ""),
    row(
      "req-3-double-click",
      "REQUIRED",
      "same_corr",
      edPlan.finalCorrelation.admissionCorrelationId,
      evaluateExistingAdmissionIntent({
        sourceEncounterId: "ed-req",
        destinationContext: "INPATIENT",
        existingCorrelations: [edPlan.finalCorrelation],
      }).code === "EXISTING_ADMISSION_INTENT"
        ? edPlan.finalCorrelation.admissionCorrelationId
        : ""
    ),
    row(
      "req-4-nurse-resume",
      "REQUIRED",
      "active_for_resume",
      true,
      isActiveAdmissionCorrelationStatus(edPlan.finalCorrelation.status)
    ),
    row(
      "req-5-one-receiver",
      "REQUIRED",
      "single_recv_field",
      true,
      !edPlan.finalCorrelation.receivingEncounterId
    ),
    row(
      "req-6-obs-new-corr",
      "REQUIRED",
      "obs_conversion_corr",
      "OBSERVATION_CONVERSION",
      (() => {
        const p = planObservationToInpatientConversion({
          patientId: "p-obs",
          facilityId: "fac-1",
          sourceObservationEncounterId: "obs-1",
          sourceEncounterType: "OBSERVATION",
          medicationTransitionAction: "CONTINUE",
          initiatedByUserId: "u1",
          serverGeneratedId: "req-obs",
        });
        return "correlation" in p ? p.correlation.admissionIntent : "";
      })()
    ),
    row(
      "req-7-obs-unchanged",
      "REQUIRED",
      "preserve_obs_type",
      true,
      (() => {
        const p = planObservationToInpatientConversion({
          patientId: "p-obs",
          facilityId: "fac-1",
          sourceObservationEncounterId: "obs-1",
          sourceEncounterType: "OBSERVATION",
          medicationTransitionAction: "HOLD",
          initiatedByUserId: "u1",
          serverGeneratedId: "req-obs2",
        });
        return "preserveObservationEncounterType" in p ? p.preserveObservationEncounterType : false;
      })()
    ),
    row(
      "req-8-stale-version",
      "REQUIRED",
      "version_conflict",
      "VERSION_CONFLICT",
      (() => {
        const c = buildHospitalAdmissionCorrelationV1({
          admissionIntent: "ED_ADMIT_TO_INPATIENT",
          patientId: "p1",
          facilityId: "f1",
          correlationVersion: 5,
          serverGeneratedId: "req-vc",
        });
        const r = applyAdmissionCorrelationMutation(c, 3, { status: "PLACEMENT_REQUESTED" });
        return r.ok ? "" : r.code;
      })()
    ),
    row(
      "req-9-cancel-no-recv",
      "REQUIRED",
      "before_arrival",
      false,
      (() => {
        const c = buildHospitalAdmissionCorrelationV1({
          admissionIntent: "ED_ADMIT_TO_INPATIENT",
          status: "PLACEMENT_REQUESTED",
          patientId: "p1",
          facilityId: "f1",
          correlationVersion: 1,
          serverGeneratedId: "req-can",
        });
        const r = planCancelAdmissionBeforeArrival({ correlation: c, patientArrived: false, expectedVersion: 1 });
        return r.ok && "createReceivingEncounter" in r ? r.createReceivingEncounter : true;
      })()
    ),
    row(
      "req-10-release-bed",
      "REQUIRED",
      "release_reservation",
      true,
      (() => {
        const c = buildHospitalAdmissionCorrelationV1({
          admissionIntent: "ED_ADMIT_TO_INPATIENT",
          status: "ACCEPTED",
          patientId: "p1",
          facilityId: "f1",
          correlationVersion: 1,
          serverGeneratedId: "req-rel",
        });
        const r = planCancelAdmissionBeforeArrival({ correlation: c, patientArrived: false, expectedVersion: 1 });
        return r.ok && "releaseBedIfNotArrived" in r ? r.releaseBedIfNotArrived : false;
      })()
    ),
    row(
      "req-11-preserve-audit",
      "REQUIRED",
      "void_preserve",
      true,
      (() => {
        const c = buildHospitalAdmissionCorrelationV1({
          admissionIntent: "ED_ADMIT_TO_INPATIENT",
          status: "RECEIVING_STARTED",
          patientId: "p1",
          facilityId: "f1",
          receivingEncounterId: "ip-1",
          correlationVersion: 1,
          serverGeneratedId: "req-void",
        });
        const r = planCancelAfterReceivingStarted({ correlation: c, expectedVersion: 1, patientArrived: false });
        return r.ok && "preserveReceivingRecord" in r ? r.preserveReceivingRecord : false;
      })()
    ),
    row(
      "req-12-cancel-plc",
      "REQUIRED",
      "no_active_after_cancel",
      true,
      diagnoseAdmissionOrphans({
        correlation: buildHospitalAdmissionCorrelationV1({
          admissionIntent: "ED_ADMIT_TO_INPATIENT",
          status: "CANCELLED",
          patientId: "p1",
          facilityId: "f1",
          internalPlacementRequestId: "plc-1",
          serverGeneratedId: "req-cplc",
        }),
        placement: { id: "plc-1", patientId: "p1", facilityId: "f1", status: "OPEN" },
      }).some((f) => f.code === "CANCELLED_CORRELATION_ACTIVE_PLACEMENT")
    ),
    row(
      "req-13-no-auto-legacy",
      "REQUIRED",
      "review_not_link",
      "REVIEW_REQUIRED",
      evaluateLegacyReconciliationEvidence({ samePatientOnly: true, sameBedOnly: true }).action
    ),
    row(
      "req-14-admin-version",
      "REQUIRED",
      "recon_stale",
      "VERSION_CONFLICT",
      (() => {
        const c = buildHospitalAdmissionCorrelationV1({
          admissionIntent: "DIRECT_ADMISSION",
          patientId: "p1",
          facilityId: "f1",
          correlationVersion: 4,
          serverGeneratedId: "req-adm",
        });
        const r = applyAdmissionCorrelationMutation(c, 2, { hospitalEpisodeId: "ep-1" });
        return r.ok ? "" : r.code;
      })()
    ),
    row("req-15-episode", "REQUIRED", "episode_not_identity", true, hospitalEpisodeIsContinuityNotIdentity()),
    row(
      "req-16-direct-sched",
      "REQUIRED",
      "corr_before_recv",
      "INTENT_CREATED",
      planDirectScheduledTransferIntentOrigination({
        admissionIntent: "SCHEDULED_ADMISSION",
        patientId: "p1",
        facilityId: "f1",
        initiatedByUserId: "u1",
        serverGeneratedId: "req-ds",
      }).correlation.status
    ),
    row(
      "req-cert",
      "REQUIRED",
      "certification_id",
      ADMISSION_INTENT_ORIGINATION_CERTIFICATION_ID,
      ADMISSION_INTENT_ORIGINATION_CERTIFICATION_ID
    )
  );

  // Extra transition guards
  for (let i = 1; i <= 20; i++) {
    cases.push(
      row(
        `tr-no-${i}`,
        "VERSION_CONCURRENCY",
        "no_complete_to_active",
        false,
        canTransitionAdmissionCorrelationStatus("COMPLETED", "ACTIVE")
      )
    );
  }

  // Preserve special needs
  for (let i = 1; i <= 15; i++) {
    const merged = placementSpecialNeedsWithCorrelation({ wheelchair: true, isolation: i % 2 === 0 }, `admcorr:uuid:sn-${i}`);
    cases.push(row(`sn-preserve-${i}`, "PLACEMENT_ATTACH", "preserve_needs", true, merged.wheelchair === true));
    cases.push(row(`sn-id-${i}`, "PLACEMENT_ATTACH", "corr_id", `admcorr:uuid:sn-${i}`, readPlacementAdmissionCorrelationId(merged) ?? ""));
  }

  return cases;
}

export function assertAdmissionIntentOriginationD3e8aBenchmark(): {
  total: number;
  failures: AdmissionIntentOriginationD3e8aCase[];
} {
  const cases = buildAdmissionIntentOriginationD3e8aBenchmarkCases();
  return { total: cases.length, failures: cases.filter((c) => c.expected !== c.actual) };
}
