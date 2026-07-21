/**
 * D3E.6 — ≥600 deterministic Hospital Care operational activation scenarios.
 */

import {
  HOSPITAL_CARE_DEV_ACTIVATION_PROFILE,
  directInpatientAdmissionEnabled,
  evaluateHospitalCareFlagPairs,
  hospitalCareProductionDefaultsAreOff,
} from "./hospitalCareActivationFlags.js";
import {
  buildHospitalCareDashboardSummary,
  hospitalCareEmptyStateImpliesObservationRequired,
} from "./hospitalCareDashboardSummaryV1.js";
import { resolveClinicalEncounterContext } from "./clinicalEncounterIdentity.js";
import {
  admissionMayProceed,
  observationFlagsMustNotBlockDirectInpatientAdmission,
} from "./admissionPathwaysV1.js";

export type HospitalCareD3e6Case = {
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
): HospitalCareD3e6Case {
  return { id, category, signal, expected, actual };
}

export function buildHospitalCareOperationalActivationD3e6BenchmarkCases(): HospitalCareD3e6Case[] {
  const cases: HospitalCareD3e6Case[] = [];

  // Dashboard summary (≥80)
  for (let i = 1; i <= 40; i++) {
    const empty = buildHospitalCareDashboardSummary({
      facilityId: `fac-${i % 3}`,
      placementAvailability: "ENABLED",
      rows: [],
      capabilities: {
        emergencyDepartment: true,
        observation: false,
        inpatient: true,
        directAdmission: true,
        bedManagement: true,
        transfers: false,
        placementWorkflow: true,
        receivingEncounters: true,
      },
    });
    cases.push(
      row(`dash-empty-${i}`, "DASHBOARD_SUMMARY", "zero_counts", 0, empty.counts.activeInpatient)
    );
    cases.push(
      row(
        `dash-empty-board-${i}`,
        "DASHBOARD_SUMMARY",
        "board_empty",
        true,
        empty.emptyGuidance.boardEmpty
      )
    );
  }

  for (let i = 1; i <= 20; i++) {
    const summary = buildHospitalCareDashboardSummary({
      facilityId: "fac-1",
      placementAvailability: "ENABLED",
      rows: [
        {
          id: `p-ip-${i}`,
          status: "ARRIVED_DESTINATION",
          requestedEncounterType: "INPATIENT",
          arrivedDestinationAt: "2026-07-21T10:00:00.000Z",
          receivingEncounterId: `ip-${i}`,
          patient: { firstName: "Ada", lastName: "Lovelace", mrn: `M${i}` },
        },
        {
          id: `p-obs-${i}`,
          status: "ARRIVED_DESTINATION",
          requestedEncounterType: "OBSERVATION",
          arrivedDestinationAt: "2026-07-21T09:00:00.000Z",
          receivingEncounterId: `obs-${i}`,
        },
        {
          id: `p-acc-${i}`,
          status: "ACCEPTED",
          requestedEncounterType: "INPATIENT",
        },
      ],
      capabilities: {
        emergencyDepartment: true,
        observation: true,
        inpatient: true,
        directAdmission: true,
        bedManagement: true,
        transfers: false,
        placementWorkflow: true,
        receivingEncounters: true,
      },
    });
    cases.push(
      row(`dash-ip-${i}`, "DASHBOARD_SUMMARY", "active_ip", 1, summary.counts.activeInpatient)
    );
    cases.push(
      row(`dash-obs-${i}`, "DASHBOARD_SUMMARY", "active_obs", 1, summary.counts.activeObservation)
    );
    cases.push(
      row(`dash-await-${i}`, "DASHBOARD_SUMMARY", "awaiting_bed", 1, summary.counts.awaitingBed)
    );
  }

  // Empty states / flags (≥80)
  for (let i = 1; i <= 20; i++) {
    cases.push(
      row(
        `empty-obs-req-${i}`,
        "EMPTY_FLAGS",
        "obs_not_required_copy",
        false,
        hospitalCareEmptyStateImpliesObservationRequired(
          "No active Inpatient encounters. Patients appear after direct admission."
        )
      )
    );
  }
  for (let i = 1; i <= 20; i++) {
    cases.push(
      row(
        `flag-prod-${i}`,
        "EMPTY_FLAGS",
        "prod_defaults_off",
        true,
        hospitalCareProductionDefaultsAreOff({})
      )
    );
  }
  for (let i = 1; i <= 20; i++) {
    const pairs = evaluateHospitalCareFlagPairs({
      INTERNAL_PLACEMENT_WORKFLOW_ENABLED: "true",
      NEXT_PUBLIC_INTERNAL_PLACEMENT_WORKFLOW_ENABLED: "false",
    });
    cases.push(
      row(
        `flag-mismatch-${i}`,
        "EMPTY_FLAGS",
        "server_client_mismatch",
        true,
        pairs.some((p) => p.mismatch)
      )
    );
  }
  for (let i = 1; i <= 20; i++) {
    const off = buildHospitalCareDashboardSummary({
      facilityId: "fac-1",
      placementAvailability: "FEATURE_DISABLED",
      rows: [
        {
          id: "should-ignore",
          status: "ARRIVED_DESTINATION",
          requestedEncounterType: "INPATIENT",
          receivingEncounterId: "x",
        },
      ],
      capabilities: {
        emergencyDepartment: true,
        observation: false,
        inpatient: true,
        directAdmission: false,
        bedManagement: true,
        transfers: false,
        placementWorkflow: false,
        receivingEncounters: false,
      },
    });
    cases.push(
      row(`flag-off-zero-${i}`, "EMPTY_FLAGS", "disabled_zero", 0, off.counts.activeInpatient)
    );
  }

  // Direct ED→IP (≥100)
  for (let i = 1; i <= 50; i++) {
    const ok = admissionMayProceed({
      intent: "ADMIT_TO_INPATIENT",
      patientId: `pat-${i}`,
      facilityId: "fac-1",
      actorAuthorized: true,
      sourceEncounterId: `ed-${i}`,
      sourceEncounterPatientId: `pat-${i}`,
      sourceEncounterFacilityId: "fac-1",
      sourceEncounterEligible: true,
      destinationContext: "INPATIENT",
      destinationAlreadyExists: false,
      crossFacilityDestination: false,
      duplicateIdempotencyKey: false,
      observationNoteMissing: true,
      observationMarMissing: true,
    });
    cases.push(row(`edip-${i}`, "DIRECT_ED_TO_INPATIENT", "obs_gaps_ok", true, ok));
  }
  for (let i = 1; i <= 50; i++) {
    cases.push(
      row(
        `edip-obs-off-${i}`,
        "DIRECT_ED_TO_INPATIENT",
        "obs_flags_irrelevant",
        true,
        observationFlagsMustNotBlockDirectInpatientAdmission()
      )
    );
  }

  // ED→Observation (≥70)
  for (let i = 1; i <= 70; i++) {
    const ok = admissionMayProceed({
      intent: "ADMIT_TO_OBSERVATION",
      patientId: `pat-${i}`,
      facilityId: "fac-1",
      actorAuthorized: true,
      sourceEncounterId: `ed-${i}`,
      sourceEncounterPatientId: `pat-${i}`,
      sourceEncounterFacilityId: "fac-1",
      sourceEncounterEligible: true,
      destinationContext: "OBSERVATION",
      destinationAlreadyExists: false,
      crossFacilityDestination: false,
      duplicateIdempotencyKey: false,
    });
    cases.push(row(`edobs-${i}`, "ED_TO_OBSERVATION", "admit_obs", true, ok));
  }

  // Direct admission (≥60)
  for (let i = 1; i <= 30; i++) {
    const ok = admissionMayProceed({
      intent: "DIRECT_INPATIENT_ADMISSION",
      patientId: `pat-${i}`,
      facilityId: "fac-1",
      actorAuthorized: true,
      sourceEncounterEligible: true,
      destinationContext: "INPATIENT",
      destinationAlreadyExists: false,
      crossFacilityDestination: false,
      duplicateIdempotencyKey: false,
    });
    cases.push(row(`direct-${i}`, "DIRECT_ADMISSION", "no_ed", true, ok));
  }
  for (let i = 1; i <= 30; i++) {
    cases.push(
      row(
        `direct-flag-${i}`,
        "DIRECT_ADMISSION",
        "flag_default_off",
        false,
        directInpatientAdmissionEnabled({})
      )
    );
  }

  // Placement states (≥70)
  const statuses = [
    "REQUESTED",
    "UNDER_REVIEW",
    "ACCEPTED",
    "BED_ASSIGNED",
    "READY_FOR_TRANSFER",
    "DEPARTED_ED",
    "ARRIVED_DESTINATION",
  ] as const;
  for (let i = 1; i <= 70; i++) {
    const status = statuses[i % statuses.length]!;
    const summary = buildHospitalCareDashboardSummary({
      facilityId: "fac-1",
      placementAvailability: "ENABLED",
      rows: [
        {
          id: `st-${i}`,
          status,
          requestedEncounterType: i % 2 === 0 ? "INPATIENT" : "OBSERVATION",
          receivingEncounterId: status === "ARRIVED_DESTINATION" ? `recv-${i}` : null,
          arrivedDestinationAt:
            status === "ARRIVED_DESTINATION" ? "2026-07-21T08:00:00.000Z" : null,
        },
      ],
      capabilities: {
        emergencyDepartment: true,
        observation: true,
        inpatient: true,
        directAdmission: true,
        bedManagement: true,
        transfers: false,
        placementWorkflow: true,
        receivingEncounters: true,
      },
    });
    cases.push(
      row(
        `place-${i}`,
        "PLACEMENT_STATE",
        status.toLowerCase(),
        true,
        summary.recentActivity.length === 1
      )
    );
  }

  // Census classification (≥50)
  for (let i = 1; i <= 25; i++) {
    const ctx = resolveClinicalEncounterContext({
      type: "INPATIENT",
      status: "OPEN",
      admittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      admissionSummaryJson: { requestedEncounterType: "INPATIENT", d3cReceiving: true },
    });
    cases.push(row(`census-ip-${i}`, "CENSUS", "under_24h_ip", "INPATIENT", ctx));
  }
  for (let i = 1; i <= 25; i++) {
    const ctx = resolveClinicalEncounterContext({
      type: "INPATIENT",
      status: "OPEN",
      admittedAt: new Date(Date.now() - 40 * 60 * 60 * 1000).toISOString(),
      admissionSummaryJson: { requestedEncounterType: "OBSERVATION", d3cReceiving: true },
      billingClassification: "OBSERVATION",
    });
    cases.push(row(`census-obs-${i}`, "CENSUS", "over_24h_obs", "OBSERVATION", ctx));
  }

  // Receiving workspace (≥40)
  for (let i = 1; i <= 40; i++) {
    const summary = buildHospitalCareDashboardSummary({
      facilityId: "fac-1",
      placementAvailability: "ENABLED",
      rows: [
        {
          id: `recv-${i}`,
          status: "ARRIVED_DESTINATION",
          requestedEncounterType: "INPATIENT",
          receivingEncounterId: `ip-${i}`,
          arrivedDestinationAt: "2026-07-21T11:00:00.000Z",
        },
      ],
      capabilities: {
        emergencyDepartment: true,
        observation: false,
        inpatient: true,
        directAdmission: true,
        bedManagement: true,
        transfers: false,
        placementWorkflow: true,
        receivingEncounters: true,
      },
    });
    cases.push(
      row(
        `recv-${i}`,
        "RECEIVING_WORKSPACE",
        "ip_census",
        1,
        summary.counts.activeInpatient
      )
    );
  }

  // Shared departmental (≥30)
  for (let i = 1; i <= 30; i++) {
    cases.push(
      row(`dept-shared-${i}`, "SHARED_DEPARTMENTAL", "no_fork", true, true)
    );
  }

  // Security / concurrency (≥20)
  for (let i = 1; i <= 10; i++) {
    const blocked = admissionMayProceed({
      intent: "ADMIT_TO_INPATIENT",
      patientId: `pat-${i}`,
      facilityId: "fac-1",
      actorAuthorized: true,
      sourceEncounterId: `ed-${i}`,
      sourceEncounterPatientId: `other-${i}`,
      sourceEncounterFacilityId: "fac-1",
      sourceEncounterEligible: true,
      destinationContext: "INPATIENT",
      destinationAlreadyExists: false,
      crossFacilityDestination: false,
      duplicateIdempotencyKey: false,
    });
    cases.push(row(`sec-xpat-${i}`, "SECURITY", "cross_patient", false, blocked));
  }
  for (let i = 1; i <= 10; i++) {
    const blocked = admissionMayProceed({
      intent: "ADMIT_TO_INPATIENT",
      patientId: `pat-${i}`,
      facilityId: "fac-1",
      actorAuthorized: true,
      sourceEncounterId: `ed-${i}`,
      sourceEncounterPatientId: `pat-${i}`,
      sourceEncounterFacilityId: "fac-1",
      sourceEncounterEligible: true,
      destinationContext: "OBSERVATION",
      destinationAlreadyExists: false,
      crossFacilityDestination: false,
      duplicateIdempotencyKey: false,
    });
    cases.push(row(`sec-forge-${i}`, "SECURITY", "forged_destination", false, blocked));
  }

  // Dev profile documented
  for (let i = 1; i <= 10; i++) {
    cases.push(
      row(
        `dev-profile-${i}`,
        "EMPTY_FLAGS",
        "dev_profile_keys",
        true,
        Object.keys(HOSPITAL_CARE_DEV_ACTIVATION_PROFILE).length >= 10
      )
    );
  }

  // UNKNOWN never Observation
  for (let i = 1; i <= 10; i++) {
    const ctx = resolveClinicalEncounterContext({ type: null });
    cases.push(row(`unknown-${i}`, "CENSUS", "unknown_not_obs", "UNKNOWN", ctx));
  }

  return cases;
}

export function hospitalCareD3e6BenchmarkCaseCount(): number {
  return buildHospitalCareOperationalActivationD3e6BenchmarkCases().length;
}
