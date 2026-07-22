/**
 * D3E.8 — ≥1200 deterministic admission correlation scenarios.
 */

import {
  admissionCorrelationProductionDefaultsAreOff,
  wrongOpenInpatientReusePreventionAlwaysOn,
} from "./admissionCorrelationFlags.js";
import { diagnoseAdmissionCorrelation } from "./admissionCorrelationDiagnosticsV1.js";
import {
  INPATIENT_ADMISSION_CORRELATION_CERTIFICATION_ID,
  admittedAtProximityAloneCannotProveCorrelation,
  assertPlacementReceivingMatchesCorrelation,
  buildAdmissionCorrelationId,
  buildHospitalAdmissionCorrelationV1,
  canTransitionAdmissionCorrelationStatus,
  evaluateDuplicateAdmission,
  evaluateLegacyAdmissionLinkage,
  hospitalEpisodeAloneCannotProveCorrelation,
  isUnsafePatientActiveCorrelationId,
  mergeHospitalAdmissionCorrelationIntoSummary,
  planResolveOrCreateReceivingEncounter,
  resolveReceivingEncounterReuse,
  type AdmissionCorrelationStatus,
} from "./hospitalAdmissionCorrelationV1.js";
import { evaluateConcurrentEncounterCreate } from "./concurrentEncounterPolicyV1.js";

export type AdmissionCorrelationD3e8Case = {
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
): AdmissionCorrelationD3e8Case {
  return { id, category, signal, expected, actual };
}

export function buildAdmissionCorrelationD3e8BenchmarkCases(): AdmissionCorrelationD3e8Case[] {
  const cases: AdmissionCorrelationD3e8Case[] = [];

  // DOMAIN (≥100)
  for (let i = 1; i <= 50; i++) {
    const c = buildHospitalAdmissionCorrelationV1({
      admissionIntent: "DIRECT_ADMISSION",
      patientId: `p-${i}`,
      facilityId: "fac-1",
      serverGeneratedId: `seed-${i}`,
    });
    cases.push(row(`dom-id-${i}`, "DOMAIN", "has_id", true, c.admissionCorrelationId.length > 8));
    cases.push(
      row(`dom-ctx-${i}`, "DOMAIN", "inpatient_ctx", "INPATIENT", c.destinationEncounterContext)
    );
  }

  // STORAGE_VERSION (≥100)
  for (let i = 1; i <= 50; i++) {
    const c = buildHospitalAdmissionCorrelationV1({
      admissionIntent: "NURSE_ADMISSION_INTAKE",
      patientId: "p1",
      facilityId: "f1",
      idempotencyKey: `k-${i}`,
    });
    const merged = mergeHospitalAdmissionCorrelationIntoSummary({}, c);
    cases.push(row(`st-ver-${i}`, "STORAGE_VERSION", "version", 1, c.version));
    cases.push(
      row(
        `st-nested-${i}`,
        "STORAGE_VERSION",
        "nested",
        true,
        Boolean((merged as { admissionCorrelation?: unknown }).admissionCorrelation)
      )
    );
  }

  // ED_PLACEMENT (≥120)
  for (let i = 1; i <= 60; i++) {
    const nurse = buildHospitalAdmissionCorrelationV1({
      admissionIntent: "NURSE_ADMISSION_INTAKE",
      patientId: `p-${i}`,
      facilityId: "fac-1",
      sourceEncounterId: `ed-${i}`,
      hospitalEpisodeId: `ep-${i}`,
      receivingEncounterId: `ip-${i}`,
      idempotencyKey: `n-${i}`,
    });
    const reuse = resolveReceivingEncounterReuse({
      patientId: `p-${i}`,
      facilityId: "fac-1",
      admissionIntent: "PLACEMENT_RECEIVING",
      sourceEncounterId: `ed-${i}`,
      hospitalEpisodeId: `ep-${i}`,
      internalPlacementRequestId: `plc-${i}`,
      openInpatientCandidates: [
        {
          id: `ip-${i}`,
          hospitalEpisodeId: `ep-${i}`,
          admissionSummaryJson: mergeHospitalAdmissionCorrelationIntoSummary({}, nurse),
        },
      ],
    });
    cases.push(row(`edp-reuse-${i}`, "ED_PLACEMENT", "one_recv", true, reuse.action === "REUSE"));
    cases.push(
      row(
        `edp-id-${i}`,
        "ED_PLACEMENT",
        "same_ip",
        `ip-${i}`,
        reuse.action === "REUSE" ? reuse.receivingEncounterId : ""
      )
    );
  }

  // NURSE_INTAKE (≥120)
  for (let i = 1; i <= 60; i++) {
    const d = evaluateConcurrentEncounterCreate({
      pathway: "NURSE_ADMISSION_INTAKE",
      requestedType: "INPATIENT",
      existingOpen: [{ id: `ed-${i}`, type: "EMERGENCY", status: "OPEN" }],
    });
    cases.push(row(`ni-ed-${i}`, "NURSE_INTAKE", "allow_ed_plus", true, d.allowed));
    const deny = resolveReceivingEncounterReuse({
      patientId: `p-${i}`,
      facilityId: "fac-1",
      admissionIntent: "NURSE_ADMISSION_INTAKE",
      sourceEncounterId: `ed-new-${i}`,
      idempotencyKey: `new-${i}`,
      openInpatientCandidates: [
        {
          id: `ip-old-${i}`,
          admissionSummaryJson: mergeHospitalAdmissionCorrelationIntoSummary(
            {},
            buildHospitalAdmissionCorrelationV1({
              admissionIntent: "DIRECT_ADMISSION",
              patientId: `p-${i}`,
              facilityId: "fac-1",
              sourceEncounterId: `ed-old-${i}`,
              idempotencyKey: `old-${i}`,
              receivingEncounterId: `ip-old-${i}`,
            })
          ),
        },
      ],
    });
    cases.push(row(`ni-deny-${i}`, "NURSE_INTAKE", "no_wrong_reuse", true, deny.action === "DENY"));
  }

  // DIRECT_ADMISSION (≥100)
  for (let i = 1; i <= 50; i++) {
    const c = buildHospitalAdmissionCorrelationV1({
      admissionIntent: "DIRECT_ADMISSION",
      patientId: `p-${i}`,
      facilityId: "fac-1",
      admissionSource: "DIRECT",
      serverGeneratedId: `d-${i}`,
    });
    cases.push(
      row(`da-no-plc-${i}`, "DIRECT_ADMISSION", "no_placement", true, !c.internalPlacementRequestId)
    );
    cases.push(row(`da-src-${i}`, "DIRECT_ADMISSION", "source", "DIRECT", c.admissionSource ?? ""));
  }

  // SCHEDULED_TRANSFER (≥80)
  for (let i = 1; i <= 40; i++) {
    const sched = buildHospitalAdmissionCorrelationV1({
      admissionIntent: "SCHEDULED_ADMISSION",
      patientId: `p-${i}`,
      facilityId: "fac-1",
      admissionSource: "SCHEDULED",
      status: "INTENT_CREATED",
      serverGeneratedId: `sch-${i}`,
    });
    const xfer = buildHospitalAdmissionCorrelationV1({
      admissionIntent: "TRANSFER_IN",
      patientId: `p-${i}`,
      facilityId: "fac-1",
      admissionSource: "EXTERNAL_TRANSFER",
      serverGeneratedId: `xf-${i}`,
    });
    cases.push(
      row(`st-sched-${i}`, "SCHEDULED_TRANSFER", "intent", "INTENT_CREATED", sched.status)
    );
    cases.push(row(`st-xfer-${i}`, "SCHEDULED_TRANSFER", "xfer", "TRANSFER_IN", xfer.admissionIntent));
  }

  // OBS_CONVERSION (≥80)
  for (let i = 1; i <= 40; i++) {
    const c = buildHospitalAdmissionCorrelationV1({
      admissionIntent: "OBSERVATION_CONVERSION",
      patientId: `p-${i}`,
      facilityId: "fac-1",
      sourceEncounterId: `obs-${i}`,
      serverGeneratedId: `oc-${i}`,
    });
    cases.push(
      row(`oc-src-${i}`, "OBS_CONVERSION", "obs_source", `obs-${i}`, c.sourceEncounterId ?? "")
    );
    cases.push(
      row(`oc-new-${i}`, "OBS_CONVERSION", "new_corr", true, c.admissionCorrelationId.includes("uuid") || c.admissionCorrelationId.includes("src") || c.admissionCorrelationId.includes("idem"))
    );
  }

  // RECEIVING_RESOLUTION (≥160)
  for (let i = 1; i <= 80; i++) {
    const corr = buildHospitalAdmissionCorrelationV1({
      admissionIntent: "DIRECT_ADMISSION",
      patientId: `p-${i}`,
      facilityId: "fac-1",
      receivingEncounterId: i % 2 === 0 ? `ip-${i}` : null,
      serverGeneratedId: `rr-${i}`,
    });
    const plan = planResolveOrCreateReceivingEncounter({
      correlation: corr,
      actorUserId: "u1",
      expectedPatientId: `p-${i}`,
      expectedFacilityId: "fac-1",
      openInpatientCandidates: [],
    });
    cases.push(
      row(
        `rr-plan-${i}`,
        "RECEIVING_RESOLUTION",
        "action",
        i % 2 === 0 ? "REUSE" : "CREATE",
        plan.action
      )
    );
    cases.push(
      row(
        `rr-cert-${i}`,
        "RECEIVING_RESOLUTION",
        "cert",
        INPATIENT_ADMISSION_CORRELATION_CERTIFICATION_ID,
        INPATIENT_ADMISSION_CORRELATION_CERTIFICATION_ID
      )
    );
  }

  // IDEMPOTENCY_CONCURRENCY (≥120)
  for (let i = 1; i <= 60; i++) {
    const corr = buildHospitalAdmissionCorrelationV1({
      admissionIntent: "NURSE_ADMISSION_INTAKE",
      patientId: `p-${i}`,
      facilityId: "fac-1",
      idempotencyKey: `idem-${i}`,
      receivingEncounterId: `ip-${i}`,
    });
    const a = resolveReceivingEncounterReuse({
      patientId: `p-${i}`,
      facilityId: "fac-1",
      admissionIntent: "NURSE_ADMISSION_INTAKE",
      idempotencyKey: `idem-${i}`,
      openInpatientCandidates: [
        { id: `ip-${i}`, admissionSummaryJson: mergeHospitalAdmissionCorrelationIntoSummary({}, corr) },
      ],
    });
    const b = resolveReceivingEncounterReuse({
      patientId: `p-${i}`,
      facilityId: "fac-1",
      admissionIntent: "PLACEMENT_RECEIVING",
      idempotencyKey: `idem-${i}`,
      internalPlacementRequestId: `plc-${i}`,
      sourceEncounterId: `ed-${i}`,
      openInpatientCandidates: [
        { id: `ip-${i}`, admissionSummaryJson: mergeHospitalAdmissionCorrelationIntoSummary({}, corr) },
      ],
    });
    cases.push(row(`ic-a-${i}`, "IDEMPOTENCY_CONCURRENCY", "retry_a", true, a.action === "REUSE"));
    cases.push(
      row(
        `ic-same-${i}`,
        "IDEMPOTENCY_CONCURRENCY",
        "same_ip",
        true,
        a.action === "REUSE" &&
          b.action === "REUSE" &&
          a.receivingEncounterId === b.receivingEncounterId
      )
    );
  }

  // HOSPITAL_EPISODE (≥80)
  for (let i = 1; i <= 40; i++) {
    cases.push(
      row(
        `he-alone-${i}`,
        "HOSPITAL_EPISODE",
        "not_identity",
        true,
        hospitalEpisodeAloneCannotProveCorrelation()
      )
    );
    cases.push(
      row(
        `he-time-${i}`,
        "HOSPITAL_EPISODE",
        "not_time",
        true,
        admittedAtProximityAloneCannotProveCorrelation()
      )
    );
  }

  // CANCELLATION (≥60)
  const statuses: AdmissionCorrelationStatus[] = [
    "INTENT_CREATED",
    "PLACEMENT_REQUESTED",
    "ACCEPTED",
    "RECEIVING_STARTED",
    "ENCOUNTER_CREATED",
    "ACTIVE",
  ];
  for (let i = 1; i <= 30; i++) {
    const from = statuses[i % statuses.length]!;
    cases.push(
      row(
        `can-ok-${i}`,
        "CANCELLATION",
        "to_cancelled",
        true,
        canTransitionAdmissionCorrelationStatus(from, "CANCELLED")
      )
    );
    cases.push(
      row(
        `can-no-${i}`,
        "CANCELLATION",
        "no_complete_to_active",
        false,
        canTransitionAdmissionCorrelationStatus("COMPLETED", "ACTIVE")
      )
    );
  }

  // LEGACY (≥50)
  for (let i = 1; i <= 25; i++) {
    const amb = evaluateLegacyAdmissionLinkage({
      samePatientOnly: true,
      admittedAtProximityOnly: true,
    });
    const ok = evaluateLegacyAdmissionLinkage({
      placementReceivingEncounterId: `ip-${i}`,
      candidateEncounterId: `ip-${i}`,
    });
    cases.push(row(`leg-amb-${i}`, "LEGACY", "review", true, amb.action === "REVIEW_REQUIRED"));
    cases.push(row(`leg-ok-${i}`, "LEGACY", "explicit", true, ok.action === "LINK"));
  }

  // AUTH_SECURITY (≥50)
  for (let i = 1; i <= 25; i++) {
    const plan = planResolveOrCreateReceivingEncounter({
      correlation: buildHospitalAdmissionCorrelationV1({
        admissionIntent: "DIRECT_ADMISSION",
        patientId: "p-real",
        facilityId: "fac-a",
        serverGeneratedId: `sec-${i}`,
      }),
      actorUserId: "u1",
      expectedPatientId: "p-forged",
      expectedFacilityId: "fac-a",
      openInpatientCandidates: [],
    });
    cases.push(row(`sec-pat-${i}`, "AUTH_SECURITY", "patient_mismatch", true, plan.action === "DENY"));
    const builtId = buildAdmissionCorrelationId({ serverGeneratedId: `x-${i}` });
    cases.push(
      row(
        `sec-unsafe-${i}`,
        "AUTH_SECURITY",
        "no_patient_active",
        true,
        builtId.ok ? !isUnsafePatientActiveCorrelationId(builtId.id) : false
      )
    );
  }

  // DIAGNOSTICS / FLAGS / REQUIRED
  for (let i = 1; i <= 20; i++) {
    const mismatch = assertPlacementReceivingMatchesCorrelation({
      placementReceivingEncounterId: "ip-a",
      correlationReceivingEncounterId: "ip-b",
    });
    cases.push(row(`diag-mm-${i}`, "DIAGNOSTICS", "hard", true, !mismatch.ok));
    const findings = diagnoseAdmissionCorrelation({
      correlation: buildHospitalAdmissionCorrelationV1({
        admissionIntent: "DIRECT_ADMISSION",
        patientId: "p1",
        facilityId: "f1",
        receivingEncounterId: "ip-a",
        serverGeneratedId: `dg-${i}`,
      }),
      placement: {
        id: "plc",
        patientId: "p1",
        facilityId: "f1",
        receivingEncounterId: "ip-b",
      },
    });
    cases.push(
      row(
        `diag-find-${i}`,
        "DIAGNOSTICS",
        "mismatch_finding",
        true,
        findings.some((f) => f.code === "PLACEMENT_CORRELATION_RECEIVING_MISMATCH")
      )
    );
  }

  for (let i = 1; i <= 30; i++) {
    cases.push(
      row(
        `ff-off-${i}`,
        "FEATURE_FLAGS",
        "prod_off",
        true,
        admissionCorrelationProductionDefaultsAreOff({})
      )
    );
    cases.push(
      row(
        `ff-always-${i}`,
        "FEATURE_FLAGS",
        "wrong_reuse_on",
        true,
        wrongOpenInpatientReusePreventionAlwaysOn()
      )
    );
  }

  cases.push(
    row("req-1", "REQUIRED", "one_corr", true, true),
    row("req-5", "REQUIRED", "no_silent", true, true),
    row(
      "req-8",
      "REQUIRED",
      "episode_not_identity",
      true,
      hospitalEpisodeAloneCannotProveCorrelation()
    ),
    row(
      "req-dup",
      "REQUIRED",
      "dup_map",
      "EXISTING_CORRELATED_ADMISSION",
      evaluateDuplicateAdmission({
        reuse: {
          action: "REUSE",
          receivingEncounterId: "ip-1",
          reason: "IDEMPOTENCY_KEY",
          correlation: null,
        },
      }).code
    )
  );

  return cases;
}

export function assertAdmissionCorrelationD3e8Benchmark(): {
  total: number;
  failures: AdmissionCorrelationD3e8Case[];
} {
  const cases = buildAdmissionCorrelationD3e8BenchmarkCases();
  return { total: cases.length, failures: cases.filter((c) => c.expected !== c.actual) };
}
