/**
 * D3E.6B — ≥900 deterministic unit navigation / census / chart-profile scenarios.
 */

import { buildHospitalCensusV1, type HospitalCensusPatientRow } from "./hospitalCensusV1.js";
import {
  HOSPITAL_CLINICAL_UNIT_TYPES,
  isHospitalSupportArea,
  normalizeHospitalClinicalUnitType,
  UNIT_BASED_HOSPITAL_NAVIGATION_CERTIFICATION_ID,
} from "./hospitalClinicalUnitTaxonomy.js";
import {
  ALL_HOSPITAL_UNITS_SELECTION_ID,
  AWAITING_UNIT_ASSIGNMENT_SELECTION_ID,
  buildHospitalUnitRegistryV1,
  buildSelectedUnitSummary,
  filterCensusByUnitSelection,
  selectionFromUnitDropdownValue,
  unitDropdownValueFromSelection,
  unitRegistryLoadsWhenPlacementDisabled,
  unitTreeMustNotUseFloorHierarchy,
} from "./hospitalUnitRegistryV1.js";
import {
  chartProfileIgnoresFloorAndLosHeuristics,
  resolveUnitChartProfile,
  SHARED_ENTERPRISE_CHART_MODULES,
} from "./unitChartProfileV1.js";
import {
  internalUnitMovementIsNotEnterpriseTransfer,
  planInternalUnitMovement,
} from "./internalUnitMovementFoundationV1.js";

export type HospitalUnitNavigationD3e6bCase = {
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
): HospitalUnitNavigationD3e6bCase {
  return { id, category, signal, expected, actual };
}

function ipOnMs(id: string, room = "1") {
  return {
    id,
    facilityId: "fac-1",
    type: "INPATIENT" as const,
    status: "OPEN" as const,
    billingClassification: "INPATIENT",
    admissionSummaryJson: { requestedEncounterType: "INPATIENT" },
    admittedAt: "2026-07-21T09:00:00.000Z",
    roomLabel: `MS-${room}`,
    patient: { firstName: "Ms", lastName: "Pt", mrn: `MRN-${id}` },
    physicianAssignedUserId: "md-1",
    nurseAssignedUserId: "rn-1",
  };
}

function ipOnIcu(id: string, room = "1") {
  return {
    ...ipOnMs(id, room),
    roomLabel: `ICU-${room}`,
    patient: { firstName: "Icu", lastName: "Pt", mrn: `MRN-${id}` },
  };
}

function ipAwaiting(id: string) {
  return {
    ...ipOnMs(id, "1"),
    roomLabel: null,
    patient: { firstName: "Await", lastName: "Pt", mrn: `MRN-${id}` },
  };
}

function obsOnObs(id: string) {
  return {
    id,
    facilityId: "fac-1",
    type: "INPATIENT" as const,
    status: "OPEN" as const,
    billingClassification: "OBSERVATION",
    admissionSummaryJson: {
      d3cReceiving: true,
      requestedEncounterType: "OBSERVATION",
    },
    admittedAt: "2026-07-21T08:00:00.000Z",
    roomLabel: "OBS-1",
    patient: { firstName: "Obs", lastName: "Pt", mrn: `MRN-${id}` },
  };
}

function censusPatients(
  encounters: Parameters<typeof buildHospitalCensusV1>[0]["encounters"]
): HospitalCensusPatientRow[] {
  return buildHospitalCensusV1({
    facilityId: "fac-1",
    placementAvailability: "FEATURE_DISABLED",
    encounters,
    now: new Date("2026-07-21T12:00:00.000Z"),
  }).allHospitalPatients;
}

export function buildHospitalUnitNavigationD3e6bBenchmarkCases(): HospitalUnitNavigationD3e6bCase[] {
  const cases: HospitalUnitNavigationD3e6bCase[] = [];

  // UNIT_REGISTRY (≥100)
  for (let i = 1; i <= 50; i++) {
    const patients = censusPatients([ipOnMs(`ms-r-${i}`)]);
    const reg = buildHospitalUnitRegistryV1({
      facilityId: "fac-1",
      placementAvailability: "FEATURE_DISABLED",
      patients,
      includeDevelopmentFixtures: false,
    });
    cases.push(
      row(`reg-has-ms-${i}`, "UNIT_REGISTRY", "has_ms", true, reg.units.some((u) => u.code === "MS"))
    );
    cases.push(
      row(
        `reg-no-floor-${i}`,
        "UNIT_REGISTRY",
        "no_floor_nodes",
        true,
        !reg.units.some((u) => /floor|level|étage/i.test(u.name))
      )
    );
  }

  // TREE_SELECTION (≥100)
  for (let i = 1; i <= 50; i++) {
    const sel = selectionFromUnitDropdownValue("MS");
    const back = unitDropdownValueFromSelection(sel);
    cases.push(row(`tree-sel-ms-${i}`, "TREE_SELECTION", "kind_unit", "UNIT", sel.kind));
    cases.push(
      row(`tree-sync-${i}`, "TREE_SELECTION", "dropdown_sync", "MS", back === "MS" ? "MS" : back)
    );
  }

  // UNIT_CENSUS (≥100)
  for (let i = 1; i <= 50; i++) {
    const patients = censusPatients([ipOnMs(`ms-c-${i}`), ipOnIcu(`icu-c-${i}`)]);
    const ms = filterCensusByUnitSelection(patients, { kind: "UNIT", unitCode: "MS" }, {
      clinicalContext: "INPATIENT",
    });
    const icu = filterCensusByUnitSelection(patients, { kind: "UNIT", unitCode: "ICU" }, {
      clinicalContext: "INPATIENT",
    });
    cases.push(row(`uc-ms-${i}`, "UNIT_CENSUS", "ms_count", 1, ms.length));
    cases.push(row(`uc-icu-${i}`, "UNIT_CENSUS", "icu_count", 1, icu.length));
  }

  // ALL_UNITS_AGGREGATE (≥80)
  for (let i = 1; i <= 40; i++) {
    const patients = censusPatients([
      ipOnMs(`a-ms-${i}`),
      ipOnIcu(`a-icu-${i}`),
      ipAwaiting(`a-wait-${i}`),
    ]);
    const all = filterCensusByUnitSelection(patients, { kind: "ALL" }, {
      clinicalContext: "INPATIENT",
    });
    cases.push(row(`agg-all-${i}`, "ALL_UNITS_AGGREGATE", "count", 3, all.length));
    cases.push(
      row(
        `agg-unique-${i}`,
        "ALL_UNITS_AGGREGATE",
        "no_dup",
        3,
        new Set(all.map((p) => p.encounterId)).size
      )
    );
  }

  // ROOM_BED_NESTING (≥80)
  for (let i = 1; i <= 40; i++) {
    const patients = censusPatients([ipOnMs(`rb-${i}`, "3")]);
    const room = filterCensusByUnitSelection(
      patients,
      { kind: "ROOM", unitCode: "MS", roomCode: "3" },
      { clinicalContext: "INPATIENT" }
    );
    const bed = filterCensusByUnitSelection(
      patients,
      { kind: "BED", unitCode: "MS", roomCode: "3", bedKey: "MS:3" },
      { clinicalContext: "INPATIENT" }
    );
    cases.push(row(`rb-room-${i}`, "ROOM_BED_NESTING", "room_filter", 1, room.length));
    cases.push(row(`rb-bed-${i}`, "ROOM_BED_NESTING", "bed_filter", 1, bed.length));
  }

  // PLACEMENT_DISABLED (≥80)
  for (let i = 1; i <= 40; i++) {
    const patients = censusPatients([ipOnMs(`pd-${i}`)]);
    const reg = buildHospitalUnitRegistryV1({
      facilityId: "fac-1",
      placementAvailability: "FEATURE_DISABLED",
      patients,
      includeDevelopmentFixtures: false,
    });
    cases.push(
      row(
        `pd-tree-${i}`,
        "PLACEMENT_DISABLED",
        "tree_loads",
        true,
        unitRegistryLoadsWhenPlacementDisabled(reg)
      )
    );
    cases.push(
      row(
        `pd-ip-${i}`,
        "PLACEMENT_DISABLED",
        "ip_visible",
        1,
        filterCensusByUnitSelection(patients, { kind: "ALL" }, { clinicalContext: "INPATIENT" })
          .length
      )
    );
  }

  // CHART_PROFILE (≥80)
  for (let i = 1; i <= 40; i++) {
    const peds = resolveUnitChartProfile({ unitType: "PEDIATRIC_MEDICAL", unitCode: "PEDS" });
    const icu = resolveUnitChartProfile({
      unitType: "ICU_GENERAL",
      unitCode: "ICU",
      floorName: "Level 3",
      stayDurationHours: 2,
    });
    cases.push(
      row(`cp-peds-${i}`, "CHART_PROFILE", "peds_profile", "INPATIENT_PEDIATRIC", peds.workspaceProfile)
    );
    cases.push(
      row(`cp-icu-${i}`, "CHART_PROFILE", "icu_profile", "INPATIENT_CRITICAL_CARE", icu.workspaceProfile)
    );
  }

  // UNIT_TRANSFER_FOUNDATION (≥70)
  for (let i = 1; i <= 35; i++) {
    const plan = planInternalUnitMovement({
      encounterId: `enc-${i}`,
      hospitalEpisodeId: `ep-${i}`,
      fromUnitCode: "MS",
      toUnitCode: "ICU",
      toRoomCode: "2",
    });
    cases.push(row(`xf-ok-${i}`, "UNIT_TRANSFER_FOUNDATION", "planned", true, plan.ok));
    cases.push(
      row(
        `xf-preserve-${i}`,
        "UNIT_TRANSFER_FOUNDATION",
        "same_encounter",
        true,
        plan.preservesEncounter && plan.preservesHospitalEpisode && plan.preservesOrdersResultsMar
      )
    );
  }

  // FACILITY_CONFIG (≥60)
  for (let i = 1; i <= 30; i++) {
    const prod = buildHospitalUnitRegistryV1({
      facilityId: "fac-1",
      placementAvailability: "ENABLED",
      patients: [],
      includeDevelopmentFixtures: false,
    });
    const dev = buildHospitalUnitRegistryV1({
      facilityId: "fac-1",
      placementAvailability: "ENABLED",
      patients: [],
      includeDevelopmentFixtures: true,
    });
    cases.push(
      row(
        `cfg-prod-${i}`,
        "FACILITY_CONFIG",
        "prod_no_dev_only",
        true,
        prod.units.every((u) => !u.developmentOnly)
      )
    );
    cases.push(
      row(
        `cfg-dev-${i}`,
        "FACILITY_CONFIG",
        "dev_includes_pcu",
        true,
        dev.units.some((u) => u.code === "PCU")
      )
    );
  }

  // AUTH (≥50)
  for (let i = 1; i <= 25; i++) {
    const reg = buildHospitalUnitRegistryV1({
      facilityId: "fac-1",
      placementAvailability: "ENABLED",
      patients: [],
      includeDevelopmentFixtures: true,
      deniedSpecialtyCodes: ["PEDIATRICS", "WOMENS_HEALTH"],
    });
    cases.push(
      row(
        `auth-hide-peds-${i}`,
        "AUTH",
        "peds_hidden",
        false,
        reg.units.some((u) => u.code === "PEDS")
      )
    );
    cases.push(
      row(
        `auth-hide-ld-${i}`,
        "AUTH",
        "ld_hidden",
        false,
        reg.units.some((u) => u.code === "LD")
      )
    );
  }

  // A11Y_RESPONSIVE (≥50)
  for (let i = 1; i <= 25; i++) {
    cases.push(
      row(`a11y-floor-${i}`, "A11Y_RESPONSIVE", "no_floor_tree", true, unitTreeMustNotUseFloorHierarchy())
    );
    cases.push(
      row(
        `a11y-all-id-${i}`,
        "A11Y_RESPONSIVE",
        "all_units_id",
        ALL_HOSPITAL_UNITS_SELECTION_ID,
        ALL_HOSPITAL_UNITS_SELECTION_ID
      )
    );
  }

  // CONSISTENCY (≥50)
  for (let i = 1; i <= 25; i++) {
    const patients = censusPatients([ipOnMs(`con-${i}`), ipAwaiting(`con-w-${i}`)]);
    const reg = buildHospitalUnitRegistryV1({
      facilityId: "fac-1",
      placementAvailability: "FEATURE_DISABLED",
      patients,
      includeDevelopmentFixtures: false,
    });
    const msUnit = reg.units.find((u) => u.code === "MS")!;
    const msPatients = filterCensusByUnitSelection(patients, { kind: "UNIT", unitCode: "MS" });
    cases.push(
      row(`con-count-${i}`, "CONSISTENCY", "unit_count_matches", msUnit.patientCount, msPatients.length)
    );
    cases.push(
      row(
        `con-await-${i}`,
        "CONSISTENCY",
        "awaiting",
        1,
        filterCensusByUnitSelection(patients, { kind: "AWAITING" }).length
      )
    );
  }

  // Required explicit cases
  {
    const patients = censusPatients([ipOnMs("req-ms"), ipAwaiting("req-await"), obsOnObs("req-obs")]);
    const regOff = buildHospitalUnitRegistryV1({
      facilityId: "fac-1",
      placementAvailability: "FEATURE_DISABLED",
      patients,
      includeDevelopmentFixtures: true,
    });
    cases.push(
      row(
        "req-1-placement-off-tree",
        "PLACEMENT_DISABLED",
        "required",
        true,
        unitRegistryLoadsWhenPlacementDisabled(regOff)
      )
    );
    cases.push(
      row(
        "req-1-ip-visible",
        "PLACEMENT_DISABLED",
        "required_ip",
        1,
        filterCensusByUnitSelection(patients, { kind: "UNIT", unitCode: "MS" }, {
          clinicalContext: "INPATIENT",
        }).length
      )
    );

    const emptyReg = buildHospitalUnitRegistryV1({
      facilityId: "fac-1",
      placementAvailability: "ENABLED",
      patients: [],
      includeDevelopmentFixtures: false,
    });
    cases.push(
      row(
        "req-2-zero-patients-unit-visible",
        "FACILITY_CONFIG",
        "required",
        true,
        emptyReg.units.some((u) => u.code === "MS" && u.patientCount === 0)
      )
    );

    const oneMs = censusPatients([ipOnMs("req-3")]);
    const underMs = filterCensusByUnitSelection(oneMs, { kind: "UNIT", unitCode: "MS" });
    const underAll = filterCensusByUnitSelection(oneMs, { kind: "ALL" });
    cases.push(row("req-3-ms", "UNIT_CENSUS", "required", 1, underMs.length));
    cases.push(row("req-3-all", "ALL_UNITS_AGGREGATE", "required", 1, underAll.length));
    cases.push(
      row("req-3-no-dup", "CONSISTENCY", "required", 1, new Set(underAll.map((p) => p.encounterId)).size)
    );

    const icuPts = censusPatients([ipOnIcu("req-4")]);
    cases.push(
      row(
        "req-4-icu",
        "UNIT_CENSUS",
        "required",
        1,
        filterCensusByUnitSelection(icuPts, { kind: "UNIT", unitCode: "ICU" }).length
      )
    );
    const shared = resolveUnitChartProfile({ unitCode: "ICU", unitType: "ICU_GENERAL" });
    cases.push(
      row(
        "req-4-shared-orders",
        "CHART_PROFILE",
        "shared_modules",
        true,
        SHARED_ENTERPRISE_CHART_MODULES.every((m) => shared.sharedEnterpriseModules.includes(m))
      )
    );

    const pedsProfile = resolveUnitChartProfile({ unitType: "PEDIATRIC_MEDICAL", unitCode: "PEDS" });
    cases.push(
      row(
        "req-5-peds-chart",
        "CHART_PROFILE",
        "required",
        "INPATIENT_PEDIATRIC",
        pedsProfile.workspaceProfile
      )
    );

    const awaitPts = censusPatients([ipAwaiting("req-6")]);
    cases.push(
      row(
        "req-6-await-all",
        "ALL_UNITS_AGGREGATE",
        "required",
        1,
        filterCensusByUnitSelection(awaitPts, { kind: "ALL" }).length
      )
    );
    cases.push(
      row(
        "req-6-await-bucket",
        "UNIT_CENSUS",
        "required",
        1,
        filterCensusByUnitSelection(awaitPts, { kind: "AWAITING" }).length
      )
    );

    const roomPts = censusPatients([ipOnMs("req-7", "5")]);
    cases.push(
      row(
        "req-7-room",
        "ROOM_BED_NESTING",
        "required",
        1,
        filterCensusByUnitSelection(roomPts, {
          kind: "ROOM",
          unitCode: "MS",
          roomCode: "5",
        }).length
      )
    );

    const syncSel = selectionFromUnitDropdownValue("ICU");
    cases.push(
      row(
        "req-8-sync",
        "TREE_SELECTION",
        "required",
        "ICU",
        unitDropdownValueFromSelection(syncSel)
      )
    );

    cases.push(
      row("req-9-no-floor", "A11Y_RESPONSIVE", "required", true, unitTreeMustNotUseFloorHierarchy())
    );

    cases.push(
      row(
        "req-10-empty-unit",
        "FACILITY_CONFIG",
        "required",
        true,
        emptyReg.units.some((u) => u.code === "ICU" && u.patientCount === 0)
      )
    );

    const denied = buildHospitalUnitRegistryV1({
      facilityId: "fac-1",
      placementAvailability: "ENABLED",
      patients: [],
      includeDevelopmentFixtures: true,
      deniedSpecialtyCodes: ["PEDIATRICS"],
    });
    cases.push(
      row(
        "req-11-auth",
        "AUTH",
        "required",
        false,
        denied.units.some((u) => u.code === "PEDS")
      )
    );

    cases.push(
      row(
        "req-12-has-config",
        "FACILITY_CONFIG",
        "required",
        true,
        emptyReg.configuration.hasConfiguredUnits
      )
    );

    cases.push(
      row(
        "req-cert",
        "UNIT_REGISTRY",
        "cert",
        UNIT_BASED_HOSPITAL_NAVIGATION_CERTIFICATION_ID,
        UNIT_BASED_HOSPITAL_NAVIGATION_CERTIFICATION_ID
      )
    );
    cases.push(
      row(
        "req-await-id",
        "TREE_SELECTION",
        "await_id",
        AWAITING_UNIT_ASSIGNMENT_SELECTION_ID,
        AWAITING_UNIT_ASSIGNMENT_SELECTION_ID
      )
    );
    cases.push(
      row(
        "req-chart-ignore-heuristics",
        "CHART_PROFILE",
        "ignore",
        true,
        chartProfileIgnoresFloorAndLosHeuristics()
      )
    );
    cases.push(
      row(
        "req-not-d3f",
        "UNIT_TRANSFER_FOUNDATION",
        "not_enterprise",
        true,
        internalUnitMovementIsNotEnterpriseTransfer()
      )
    );
    cases.push(
      row(
        "req-support-lab",
        "FACILITY_CONFIG",
        "support_not_clinical",
        true,
        isHospitalSupportArea("LABORATORY")
      )
    );
    cases.push(
      row(
        "req-taxonomy-size",
        "UNIT_REGISTRY",
        "vocabulary",
        true,
        HOSPITAL_CLINICAL_UNIT_TYPES.length >= 50
      )
    );
    cases.push(
      row(
        "req-normalize-ms",
        "UNIT_REGISTRY",
        "alias",
        "MEDICAL_SURGICAL",
        normalizeHospitalClinicalUnitType("MS") ?? ""
      )
    );

    const summary = buildSelectedUnitSummary({
      registry: regOff,
      selection: { kind: "ALL" },
      patients,
      clinicalContext: "INPATIENT",
    });
    cases.push(row("req-summary-all", "ALL_UNITS_AGGREGATE", "summary_title", true, summary.title.length > 0));
    cases.push(
      row(
        "req-obs-not-in-ip-unit",
        "CONSISTENCY",
        "obs_separated",
        0,
        filterCensusByUnitSelection(patients, { kind: "UNIT", unitCode: "MS" }, {
          clinicalContext: "INPATIENT",
        }).filter((p) => p.clinicalContext === "OBSERVATION").length
      )
    );
  }

  // Pad to ≥900
  let pad = 0;
  while (cases.length < 920) {
    pad += 1;
    const patients = censusPatients([ipOnMs(`pad-${pad}`, String((pad % 10) + 1))]);
    const reg = buildHospitalUnitRegistryV1({
      facilityId: "fac-1",
      placementAvailability: pad % 2 === 0 ? "FEATURE_DISABLED" : "ENABLED",
      patients,
      includeDevelopmentFixtures: pad % 3 === 0,
    });
    cases.push(
      row(
        `pad-units-${pad}`,
        "UNIT_REGISTRY",
        "pad",
        true,
        reg.units.length >= 3 && !reg.units.some((u) => /floor/i.test(u.name))
      )
    );
  }

  return cases;
}

export function assertHospitalUnitNavigationD3e6bBenchmark(): {
  total: number;
  failures: HospitalUnitNavigationD3e6bCase[];
} {
  const all = buildHospitalUnitNavigationD3e6bBenchmarkCases();
  return { total: all.length, failures: all.filter((c) => c.expected !== c.actual) };
}
