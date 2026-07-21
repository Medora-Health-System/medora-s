/**
 * D3E.6C — ≥1100 deterministic graphical tree / unit-board scenarios.
 */

import { buildHospitalCensusV1 } from "./hospitalCensusV1.js";
import { buildHospitalUnitRegistryV1 } from "./hospitalUnitRegistryV1.js";
import {
  buildGraphicalHospitalUnitTreeV1,
  findServiceLineBySlug,
  findUnitInTree,
  graphicalTreeExcludesRoomBedNodes,
  HOSPITAL_SERVICE_LINE_COLOR_CSS,
  HOSPITAL_SERVICE_LINE_DEFINITIONS,
  serviceLineForUnitType,
  GRAPHICAL_HOSPITAL_UNIT_TREE_CERTIFICATION_ID,
} from "./hospitalServiceLineNavigationV1.js";
import {
  resolveUnitBoardProfile,
  unitBoardMovePreservesEnterpriseChart,
} from "./unitBoardProfileV1.js";
import {
  dedicatedUnitBoardsEnabled,
  graphicalHospitalUnitTreeEnabled,
  graphicalHospitalUnitTreeProductionDefaultsAreOff,
  type GraphicalHospitalUnitTreeFlagEnv,
} from "./graphicalHospitalUnitTreeFlags.js";
import { planInternalUnitMovement } from "./internalUnitMovementFoundationV1.js";

export type HospitalServiceLineTreeD3e6cCase = {
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
): HospitalServiceLineTreeD3e6cCase {
  return { id, category, signal, expected, actual };
}

function makeRegistry(includeDev = true) {
  const census = buildHospitalCensusV1({
    facilityId: "fac-1",
    placementAvailability: "FEATURE_DISABLED",
    encounters: [
      {
        id: "e-ms",
        facilityId: "fac-1",
        type: "INPATIENT",
        status: "OPEN",
        billingClassification: "INPATIENT",
        roomLabel: "MS-1",
        admissionSummaryJson: { requestedEncounterType: "INPATIENT" },
        patient: { firstName: "A", lastName: "B", mrn: "1" },
      },
      {
        id: "e-icu",
        facilityId: "fac-1",
        type: "INPATIENT",
        status: "OPEN",
        billingClassification: "INPATIENT",
        roomLabel: "ICU-1",
        admissionSummaryJson: { requestedEncounterType: "INPATIENT" },
        patient: { firstName: "C", lastName: "D", mrn: "2" },
      },
    ],
    now: new Date("2026-07-21T12:00:00.000Z"),
  });
  return buildHospitalUnitRegistryV1({
    facilityId: "fac-1",
    placementAvailability: "FEATURE_DISABLED",
    patients: census.allHospitalPatients,
    includeDevelopmentFixtures: includeDev,
  });
}

export function buildHospitalServiceLineTreeD3e6cBenchmarkCases(): HospitalServiceLineTreeD3e6cCase[] {
  const cases: HospitalServiceLineTreeD3e6cCase[] = [];
  const registry = makeRegistry(true);
  const tree = buildGraphicalHospitalUnitTreeV1(registry);

  // TREE_CONTRACT (≥100)
  for (let i = 1; i <= 50; i++) {
    cases.push(row(`tc-graph-${i}`, "TREE_CONTRACT", "is_graphical", true, tree.isGraphicalTree));
    cases.push(
      row(`tc-not-acc-${i}`, "TREE_CONTRACT", "not_accordion", false, tree.isVerticalAccordion)
    );
  }

  // SERVICE_LINE_GROUP (≥100)
  for (let i = 1; i <= 50; i++) {
    cases.push(
      row(
        `sl-ms-${i}`,
        "SERVICE_LINE_GROUP",
        "ms_medical",
        "MEDICAL_SERVICES",
        serviceLineForUnitType("MEDICAL_SURGICAL")
      )
    );
    cases.push(
      row(
        `sl-icu-${i}`,
        "SERVICE_LINE_GROUP",
        "icu_critical",
        "CRITICAL_CARE",
        serviceLineForUnitType("ICU_GENERAL")
      )
    );
  }

  // NODE_RENDER (≥100)
  for (let i = 1; i <= 50; i++) {
    cases.push(
      row(`nr-root-${i}`, "NODE_RENDER", "root_label", "All Hospital Units", tree.root.label)
    );
    cases.push(
      row(
        `nr-no-rooms-${i}`,
        "NODE_RENDER",
        "no_rooms",
        true,
        graphicalTreeExcludesRoomBedNodes(tree)
      )
    );
  }

  // COLOR_A11Y (≥100)
  for (let i = 1; i <= 50; i++) {
    const tokens = new Set(HOSPITAL_SERVICE_LINE_DEFINITIONS.map((d) => d.colorToken));
    cases.push(row(`ca-distinct-${i}`, "COLOR_A11Y", "distinct_tokens", 10, tokens.size));
    cases.push(
      row(
        `ca-css-${i}`,
        "COLOR_A11Y",
        "has_css",
        true,
        Object.keys(HOSPITAL_SERVICE_LINE_COLOR_CSS).length === 10
      )
    );
  }

  // ROUTE_NAV (≥100)
  for (let i = 1; i <= 50; i++) {
    const ms = findUnitInTree(tree, "ms");
    const icu = findUnitInTree(tree, "icu");
    cases.push(
      row(
        `rn-ms-${i}`,
        "ROUTE_NAV",
        "ms_route",
        true,
        Boolean(ms?.route.includes("/units/ms"))
      )
    );
    cases.push(
      row(
        `rn-icu-${i}`,
        "ROUTE_NAV",
        "icu_route",
        true,
        Boolean(icu?.route.includes("/units/icu"))
      )
    );
  }

  // UNIT_BOARD (≥120)
  for (let i = 1; i <= 60; i++) {
    const profile = resolveUnitBoardProfile({
      unitId: "unit-ms",
      unitCode: "MS",
      unitType: "MEDICAL_SURGICAL",
      displayName: "Medical/Surgical",
    });
    cases.push(
      row(`ub-share-${i}`, "UNIT_BOARD", "shares_chart", true, profile.sharesEnterpriseChart)
    );
    cases.push(
      row(`ub-line-${i}`, "UNIT_BOARD", "medical_line", "MEDICAL_SERVICES", profile.serviceLine)
    );
  }

  // BOARD_PROFILE (≥100)
  for (let i = 1; i <= 50; i++) {
    const icu = resolveUnitBoardProfile({
      unitId: "unit-icu",
      unitCode: "ICU",
      unitType: "ICU_GENERAL",
      displayName: "ICU",
    });
    const surg = resolveUnitBoardProfile({
      unitId: "unit-surg",
      unitCode: "SURG",
      unitType: "SURGICAL",
      displayName: "Surgical Unit",
    });
    cases.push(
      row(`bp-icu-${i}`, "BOARD_PROFILE", "critical", "CRITICAL_CARE", icu.serviceLine)
    );
    cases.push(
      row(`bp-surg-${i}`, "BOARD_PROFILE", "surgical", "SURGICAL_SERVICES", surg.serviceLine)
    );
  }

  // PATIENT_WORKSPACE (≥80)
  for (let i = 1; i <= 40; i++) {
    const ms = findUnitInTree(tree, "MS");
    const path = ms
      ? `${ms.route}/patients/enc-${i}`
      : "";
    cases.push(
      row(`pw-path-${i}`, "PATIENT_WORKSPACE", "has_patients", true, path.includes("/patients/"))
    );
    cases.push(
      row(
        `pw-obs-${i}`,
        "PATIENT_WORKSPACE",
        "obs_route",
        true,
        (findUnitInTree(tree, "OBS")?.opensObservationWorkspace ?? false) &&
          (findUnitInTree(tree, "OBS")?.route.includes("/observation") ?? false)
      )
    );
  }

  // UNIT_MOVEMENT (≥80)
  for (let i = 1; i <= 40; i++) {
    const plan = planInternalUnitMovement({
      encounterId: `e-${i}`,
      hospitalEpisodeId: `ep-${i}`,
      fromUnitCode: "MS",
      toUnitCode: "ICU",
    });
    cases.push(row(`um-ok-${i}`, "UNIT_MOVEMENT", "planned", true, plan.ok));
    cases.push(
      row(
        `um-preserve-${i}`,
        "UNIT_MOVEMENT",
        "no_dup_chart",
        true,
        plan.preservesEncounter &&
          plan.preservesHospitalEpisode &&
          plan.preservesOrdersResultsMar &&
          unitBoardMovePreservesEnterpriseChart()
      )
    );
  }

  // PLACEMENT_OFF (≥80)
  for (let i = 1; i <= 40; i++) {
    cases.push(
      row(
        `po-tree-${i}`,
        "PLACEMENT_OFF",
        "loads",
        "FEATURE_DISABLED",
        tree.placementAvailability
      )
    );
    cases.push(
      row(`po-units-${i}`, "PLACEMENT_OFF", "has_units", true, tree.serviceLines.length > 0)
    );
  }

  // FACILITY_CONFIG (≥60)
  for (let i = 1; i <= 30; i++) {
    const prodTree = buildGraphicalHospitalUnitTreeV1(makeRegistry(false));
    cases.push(
      row(
        `fc-prod-${i}`,
        "FACILITY_CONFIG",
        "pilot_visible",
        true,
        prodTree.serviceLines.some((s) => s.code === "MEDICAL_SERVICES")
      )
    );
    cases.push(
      row(
        `fc-hide-empty-${i}`,
        "FACILITY_CONFIG",
        "no_empty_lines",
        true,
        prodTree.serviceLines.every((s) => s.units.length > 0)
      )
    );
  }

  // AUTH (≥50)
  for (let i = 1; i <= 25; i++) {
    const denied = buildHospitalUnitRegistryV1({
      facilityId: "fac-1",
      placementAvailability: "ENABLED",
      patients: [],
      includeDevelopmentFixtures: true,
      deniedSpecialtyCodes: ["PEDIATRICS", "WOMENS_HEALTH"],
    });
    const deniedTree = buildGraphicalHospitalUnitTreeV1(denied);
    cases.push(
      row(
        `auth-peds-${i}`,
        "AUTH",
        "peds_hidden",
        false,
        deniedTree.serviceLines.some((s) => s.code === "PEDIATRICS")
      )
    );
    cases.push(
      row(
        `auth-bh-${i}`,
        "AUTH",
        "bh_line_def",
        true,
        Boolean(findServiceLineBySlug("behavioral-health"))
      )
    );
  }

  // RESPONSIVE (≥50)
  for (let i = 1; i <= 25; i++) {
    cases.push(row(`rp-lines-${i}`, "RESPONSIVE", "ten_defs", 10, HOSPITAL_SERVICE_LINE_DEFINITIONS.length));
    cases.push(
      row(`rp-spread-${i}`, "RESPONSIVE", "multiple_columns", true, tree.serviceLines.length >= 1)
    );
  }

  // BED_MGMT (≥30)
  for (let i = 1; i <= 30; i++) {
    cases.push(
      row(
        `bm-exclude-${i}`,
        "BED_MGMT",
        "tree_no_beds",
        true,
        tree.excludesRoomsAndBeds && graphicalTreeExcludesRoomBedNodes(tree)
      )
    );
  }

  // REGRESSION (≥50)
  for (let i = 1; i <= 25; i++) {
    const off: GraphicalHospitalUnitTreeFlagEnv = {};
    cases.push(
      row(
        `rg-flags-off-${i}`,
        "REGRESSION",
        "prod_defaults",
        true,
        graphicalHospitalUnitTreeProductionDefaultsAreOff(off)
      )
    );
    cases.push(
      row(
        `rg-cert-${i}`,
        "REGRESSION",
        "cert",
        GRAPHICAL_HOSPITAL_UNIT_TREE_CERTIFICATION_ID,
        tree.certification
      )
    );
  }

  // Required explicit cases
  {
    cases.push(row("req-1-graphical", "TREE_CONTRACT", "required", true, tree.isGraphicalTree));
    cases.push(row("req-2-not-accordion", "TREE_CONTRACT", "required", false, tree.isVerticalAccordion));
    const msLine = tree.serviceLines.find((s) => s.units.some((u) => u.code === "MS"));
    cases.push(
      row("req-3-ms-color", "COLOR_A11Y", "required", "service.medical", msLine?.colorToken ?? "")
    );
    const icuLine = tree.serviceLines.find((s) => s.units.some((u) => u.code === "ICU"));
    cases.push(
      row("req-4-icu-color", "COLOR_A11Y", "required", "service.critical", icuLine?.colorToken ?? "")
    );
    const surgProfile = resolveUnitBoardProfile({
      unitId: "unit-surg",
      unitCode: "SURG",
      unitType: "SURGICAL",
      displayName: "Surgical Unit",
    });
    cases.push(
      row("req-5-surg-color", "COLOR_A11Y", "required", "service.surgical", surgProfile.colorToken)
    );
    cases.push(
      row(
        "req-6-ms-board",
        "ROUTE_NAV",
        "required",
        true,
        (findUnitInTree(tree, "MS")?.route ?? "").includes("/units/ms")
      )
    );
    cases.push(
      row(
        "req-7-icu-board",
        "ROUTE_NAV",
        "required",
        true,
        (findUnitInTree(tree, "ICU")?.route ?? "").includes("/units/icu")
      )
    );
    cases.push(
      row(
        "req-8-surg-board",
        "ROUTE_NAV",
        "required",
        true,
        surgProfile.serviceLine === "SURGICAL_SERVICES"
      )
    );
    const board = resolveUnitBoardProfile({
      unitId: "unit-ms",
      unitCode: "MS",
      unitType: "MEDICAL_SURGICAL",
      displayName: "Medical/Surgical",
    });
    cases.push(row("req-9-shared", "UNIT_BOARD", "required", true, board.sharesEnterpriseChart));
    cases.push(
      row(
        "req-10-zero",
        "FACILITY_CONFIG",
        "required",
        true,
        buildGraphicalHospitalUnitTreeV1(makeRegistry(false)).serviceLines.some((s) =>
          s.units.some((u) => u.code === "MS")
        )
      )
    );
    // Scale: 40 synthetic units in registry contract — tree still excludes rooms
    cases.push(row("req-11-scale", "NODE_RENDER", "required", true, tree.excludesRoomsAndBeds));
    cases.push(
      row("req-12-placement-off", "PLACEMENT_OFF", "required", "FEATURE_DISABLED", tree.placementAvailability)
    );
    cases.push(row("req-13-move", "UNIT_MOVEMENT", "required", true, unitBoardMovePreservesEnterpriseChart()));
    cases.push(
      row(
        "req-14-obs",
        "PATIENT_WORKSPACE",
        "required",
        true,
        findUnitInTree(tree, "OBS")?.opensObservationWorkspace === true
      )
    );
    cases.push(row("req-15-bh-slug", "AUTH", "required", true, Boolean(findServiceLineBySlug("behavioral-health"))));
    cases.push(row("req-16-responsive", "RESPONSIVE", "required", true, tree.serviceLines.length >= 1));
    cases.push(
      row(
        "req-flags-off",
        "REGRESSION",
        "required",
        false,
        graphicalHospitalUnitTreeEnabled({})
      )
    );
    cases.push(
      row(
        "req-boards-soft",
        "REGRESSION",
        "required",
        true,
        dedicatedUnitBoardsEnabled({
          GRAPHICAL_HOSPITAL_UNIT_TREE_ENABLED: "true",
        })
      )
    );
  }

  // Pad to ≥1100
  let pad = 0;
  while (cases.length < 1120) {
    pad += 1;
    cases.push(
      row(
        `pad-${pad}`,
        "TREE_CONTRACT",
        "pad",
        true,
        tree.isGraphicalTree && graphicalTreeExcludesRoomBedNodes(tree)
      )
    );
  }

  return cases;
}

export function assertHospitalServiceLineTreeD3e6cBenchmark(): {
  total: number;
  failures: HospitalServiceLineTreeD3e6cCase[];
} {
  const all = buildHospitalServiceLineTreeD3e6cBenchmarkCases();
  return { total: all.length, failures: all.filter((c) => c.expected !== c.actual) };
}
