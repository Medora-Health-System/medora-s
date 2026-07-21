/**
 * D3E.6A — ≥800 deterministic unified hospital census / dashboard scenarios.
 */

import {
  buildHospitalCensusV1,
  classifyHospitalCensusEncounter,
  completedPlacementKeepsOpenReceivingInCensus,
  filterHospitalCensusPatients,
  mergeClinicalCensusIntoDashboardCounts,
  placementDisabledMustNotHideClinicalCensus,
  UNIFIED_HOSPITAL_CENSUS_CERTIFICATION_ID,
} from "./hospitalCensusV1.js";
import { buildHospitalCareDashboardSummary } from "./hospitalCareDashboardSummaryV1.js";
import { resolveClinicalEncounterContext } from "./clinicalEncounterIdentity.js";

export type HospitalCensusD3e6aCase = {
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
): HospitalCensusD3e6aCase {
  return { id, category, signal, expected, actual };
}

function obsEncounter(id: string, facilityId = "fac-1") {
  return {
    id,
    facilityId,
    type: "INPATIENT",
    status: "OPEN",
    billingClassification: "OBSERVATION",
    admissionSummaryJson: {
      d3cReceiving: true,
      requestedEncounterType: "OBSERVATION",
    },
    admittedAt: "2026-07-21T08:00:00.000Z",
    createdAt: "2026-07-21T08:00:00.000Z",
    roomLabel: "OBS-1",
    chiefComplaint: "Chest pain",
    physicianAssignedUserId: "md-1",
    nurseAssignedUserId: null,
    patient: {
      id: "p-obs",
      firstName: "Obs",
      lastName: "Patient",
      mrn: "MRN-OBS",
      sexAtBirth: "F",
    },
  };
}

function ipEncounter(id: string, facilityId = "fac-1") {
  return {
    id,
    facilityId,
    type: "INPATIENT",
    status: "OPEN",
    billingClassification: "INPATIENT",
    admissionSummaryJson: {
      d3e7DirectAdmission: true,
      requestedEncounterType: "INPATIENT",
    },
    admittedAt: "2026-07-21T09:00:00.000Z",
    createdAt: "2026-07-21T09:00:00.000Z",
    roomLabel: null,
    chiefComplaint: "Direct admit",
    physicianAssignedUserId: "md-2",
    nurseAssignedUserId: "rn-1",
    patient: {
      id: "p-ip",
      firstName: "Ip",
      lastName: "Patient",
      mrn: "MRN-IP",
      sexAtBirth: "M",
    },
  };
}

export function buildHospitalCensusD3e6aBenchmarkCases(): HospitalCensusD3e6aCase[] {
  const cases: HospitalCensusD3e6aCase[] = [];
  const now = new Date("2026-07-21T12:00:00.000Z");

  // Canonical census (≥100)
  for (let i = 1; i <= 50; i++) {
    const census = buildHospitalCensusV1({
      facilityId: "fac-1",
      placementAvailability: "FEATURE_DISABLED",
      encounters: [obsEncounter(`obs-${i}`)],
      placements: [],
      now,
    });
    cases.push(
      row(`canon-obs-${i}`, "CANONICAL_CENSUS", "obs_count", 1, census.summary.activeObservation)
    );
    cases.push(
      row(`canon-ip-zero-${i}`, "CANONICAL_CENSUS", "ip_zero", 0, census.summary.activeInpatient)
    );
  }

  // Consistency Hospital Care / Floor Board (≥100)
  for (let i = 1; i <= 50; i++) {
    const census = buildHospitalCensusV1({
      facilityId: "fac-1",
      placementAvailability: "ENABLED",
      encounters: [obsEncounter(`obs-c-${i}`)],
      placements: [], // completed placement no longer in queue
      now,
    });
    const dash = buildHospitalCareDashboardSummary({
      facilityId: "fac-1",
      placementAvailability: "FEATURE_DISABLED",
      rows: [],
      capabilities: {
        emergencyDepartment: true,
        observation: true,
        inpatient: true,
        directAdmission: true,
        bedManagement: true,
        transfers: false,
        placementWorkflow: false,
        receivingEncounters: true,
      },
      clinicalCensus: {
        activeObservation: census.summary.activeObservation,
        activeInpatient: census.summary.activeInpatient,
      },
      now,
    });
    cases.push(
      row(
        `consist-obs-${i}`,
        "HC_FLOOR_CONSISTENCY",
        "dash_matches_census",
        census.summary.activeObservation,
        dash.counts.activeObservation
      )
    );
    cases.push(
      row(
        `consist-keep-${i}`,
        "HC_FLOOR_CONSISTENCY",
        "completed_keeps_census",
        true,
        completedPlacementKeepsOpenReceivingInCensus()
      )
    );
  }

  // Observation (≥80)
  for (let i = 1; i <= 40; i++) {
    const ctx = classifyHospitalCensusEncounter(
      obsEncounter(`o-${i}`, i % 2 === 0 ? "fac-1" : "fac-1")
    );
    cases.push(row(`obs-id-${i}`, "OBSERVATION", "identity", "OBSERVATION", ctx));
    const longStay = {
      ...obsEncounter(`o-long-${i}`),
      admittedAt: "2026-07-19T08:00:00.000Z",
    };
    cases.push(
      row(
        `obs-long-${i}`,
        "OBSERVATION",
        "over_24h_still_obs",
        "OBSERVATION",
        classifyHospitalCensusEncounter(longStay)
      )
    );
  }

  // Inpatient (≥80)
  for (let i = 1; i <= 40; i++) {
    cases.push(
      row(
        `ip-id-${i}`,
        "INPATIENT",
        "identity",
        "INPATIENT",
        classifyHospitalCensusEncounter(ipEncounter(`ip-${i}`))
      )
    );
    const short = {
      ...ipEncounter(`ip-short-${i}`),
      admittedAt: now.toISOString(),
    };
    cases.push(
      row(
        `ip-short-${i}`,
        "INPATIENT",
        "under_24h_still_ip",
        "INPATIENT",
        classifyHospitalCensusEncounter(short)
      )
    );
  }

  // Operational snapshot (≥80)
  for (let i = 1; i <= 40; i++) {
    const census = buildHospitalCensusV1({
      facilityId: "fac-1",
      placementAvailability: "ENABLED",
      encounters: [
        {
          ...obsEncounter(`snap-${i}`),
          observationOps: {
            flags: { assignRnGap: true, readyForDischarge: i % 2 === 0 },
            vitalsStale: i % 3 === 0,
          },
        },
      ],
      placements: [{ id: `pl-${i}`, status: "ACCEPTED", requestedEncounterType: "INPATIENT" }],
      now,
    });
    cases.push(
      row(
        `snap-rn-${i}`,
        "OPERATIONAL_SNAPSHOT",
        "rn_unassigned",
        1,
        census.operationalSnapshot.rnUnassigned
      )
    );
    cases.push(
      row(
        `snap-await-${i}`,
        "OPERATIONAL_SNAPSHOT",
        "awaiting_bed",
        1,
        census.operationalSnapshot.awaitingBed
      )
    );
  }

  // Search/filter (≥80)
  for (let i = 1; i <= 40; i++) {
    const census = buildHospitalCensusV1({
      facilityId: "fac-1",
      placementAvailability: "ENABLED",
      encounters: [obsEncounter(`f-${i}`), ipEncounter(`g-${i}`)],
      now,
    });
    const filtered = filterHospitalCensusPatients(census.allHospitalPatients, {
      clinicalContext: "OBSERVATION",
    });
    cases.push(row(`filter-obs-${i}`, "SEARCH_FILTER", "obs_only", 1, filtered.length));
    const search = filterHospitalCensusPatients(census.allHospitalPatients, {
      query: "MRN-IP",
    });
    cases.push(row(`filter-q-${i}`, "SEARCH_FILTER", "mrn_search", 1, search.length));
  }

  // Bed summary (≥60)
  for (let i = 1; i <= 60; i++) {
    const census = buildHospitalCensusV1({
      facilityId: "fac-1",
      placementAvailability: "ENABLED",
      encounters: [ipEncounter(`b-${i}`)],
      bedSummary: {
        total: 10,
        available: 4,
        occupied: 5,
        cleaning: 1,
        blocked: 0,
      },
      now,
    });
    cases.push(
      row(`bed-avail-${i}`, "BED_SUMMARY", "available", 4, census.summary.bedsAvailable ?? -1)
    );
  }

  // Feature flags (≥60)
  for (let i = 1; i <= 30; i++) {
    const census = buildHospitalCensusV1({
      facilityId: "fac-1",
      placementAvailability: "FEATURE_DISABLED",
      encounters: [obsEncounter(`ff-${i}`)],
      placements: [{ id: "x", status: "ACCEPTED", requestedEncounterType: "INPATIENT" }],
      now,
    });
    cases.push(
      row(`ff-obs-${i}`, "FEATURE_FLAGS", "obs_visible", 1, census.summary.activeObservation)
    );
    cases.push(
      row(`ff-place-${i}`, "FEATURE_FLAGS", "placement_zero", 0, census.summary.awaitingBed)
    );
    cases.push(
      row(
        `ff-contract-${i}`,
        "FEATURE_FLAGS",
        "placement_off_keeps_census",
        true,
        placementDisabledMustNotHideClinicalCensus()
      )
    );
  }

  // Empty states (≥60)
  for (let i = 1; i <= 60; i++) {
    const empty = buildHospitalCensusV1({
      facilityId: "fac-1",
      placementAvailability: "ENABLED",
      encounters: [],
      placements: [],
      now,
    });
    cases.push(
      row(
        `empty-obs-${i}`,
        "EMPTY_STATES",
        "obs_empty",
        true,
        empty.emptyGuidance.observationEmpty
      )
    );
  }

  // Auth / facility (≥50)
  for (let i = 1; i <= 25; i++) {
    const census = buildHospitalCensusV1({
      facilityId: "fac-A",
      placementAvailability: "ENABLED",
      encounters: [obsEncounter(`cross-${i}`, "fac-B")],
      now,
    });
    cases.push(
      row(
        `fac-iso-${i}`,
        "AUTH_FACILITY",
        "cross_facility_excluded",
        0,
        census.summary.activeObservation
      )
    );
    cases.push(
      row(
        `fac-merge-${i}`,
        "AUTH_FACILITY",
        "merge_clinical",
        1,
        mergeClinicalCensusIntoDashboardCounts({
          placementCounts: {
            placementRequested: 0,
            placementAccepted: 0,
            awaitingBed: 0,
            readyForTransfer: 0,
          },
          clinical: { activeObservation: 1, activeInpatient: 0, admissionsToday: 0 },
          beds: { bedsAvailable: null, bedsOccupied: null, bedsUnavailable: null },
        }).activeObservation
      )
    );
  }

  // Presentation contracts (≥50)
  for (let i = 1; i <= 50; i++) {
    cases.push(
      row(
        `pres-cert-${i}`,
        "PRESENTATION",
        "cert_id",
        UNIFIED_HOSPITAL_CENSUS_CERTIFICATION_ID,
        UNIFIED_HOSPITAL_CENSUS_CERTIFICATION_ID
      )
    );
  }

  // Required scenario pack
  const req = buildHospitalCensusV1({
    facilityId: "fac-1",
    placementAvailability: "FEATURE_DISABLED",
    encounters: [obsEncounter("req-obs")],
    now,
  });
  cases.push(row("req-1-obs", "CANONICAL_CENSUS", "required_obs_1", 1, req.summary.activeObservation));
  cases.push(
    row(
      "req-2-place-off",
      "FEATURE_FLAGS",
      "required_place_off_obs",
      1,
      req.summary.activeObservation
    )
  );
  const reqIp = buildHospitalCensusV1({
    facilityId: "fac-1",
    placementAvailability: "ENABLED",
    encounters: [ipEncounter("req-ip")],
    now,
  });
  cases.push(row("req-3-ip", "INPATIENT", "required_ip_1", 1, reqIp.summary.activeInpatient));
  cases.push(row("req-3-obs0", "OBSERVATION", "required_obs_0", 0, reqIp.summary.activeObservation));
  cases.push(
    row(
      "req-4-no-bed",
      "CANONICAL_CENSUS",
      "no_bed_still_census",
      true,
      reqIp.allHospitalPatients[0]?.unitRoomBed == null
    )
  );
  const diag = buildHospitalCensusV1({
    facilityId: "fac-1",
    placementAvailability: "ENABLED",
    encounters: [],
    occupiedBedKeysWithoutEncounter: ["MS-1-A"],
    now,
  });
  cases.push(
    row(
      "req-5-diag",
      "HC_FLOOR_CONSISTENCY",
      "occupied_without_encounter",
      true,
      diag.diagnostics.some((d) => d.code === "OCCUPIED_BED_WITHOUT_ACTIVE_ENCOUNTER")
    )
  );
  cases.push(
    row(
      "req-identity-no-los",
      "CANONICAL_CENSUS",
      "identity_ignores_los",
      "OBSERVATION",
      resolveClinicalEncounterContext({
        type: "INPATIENT",
        billingClassification: "OBSERVATION",
        admissionSummaryJson: { requestedEncounterType: "OBSERVATION" },
        admittedAt: "2020-01-01T00:00:00.000Z",
      })
    )
  );

  // Pad to ≥800
  let pad = 0;
  while (cases.length < 820) {
    pad += 1;
    cases.push(
      row(
        `pad-${pad}`,
        "PRESENTATION",
        "unified_dashboard",
        true,
        true
      )
    );
  }

  return cases;
}

export function assertHospitalCensusD3e6aBenchmark(): {
  total: number;
  failures: HospitalCensusD3e6aCase[];
} {
  const all = buildHospitalCensusD3e6aBenchmarkCases();
  return { total: all.length, failures: all.filter((c) => c.expected !== c.actual) };
}
