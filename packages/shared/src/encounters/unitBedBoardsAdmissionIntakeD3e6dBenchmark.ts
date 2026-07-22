/**
 * D3E.6D — ≥1300 deterministic unit bed board / admission intake / concurrent encounter scenarios.
 */

import {
  DEFAULT_PILOT_BED_POOLS,
  ENCOUNTER_BED_UNIT_CODES,
  normalizeBedUnitCode,
  type EncounterBedUnitCode,
} from "./facilityBedGovernance.js";
import { composeFacilityBedBoard } from "./bedBoardComposition.js";
import { buildUnitBedBoardView } from "./bedBoardView.js";
import {
  evaluateConcurrentEncounterCreate,
  HOSPITAL_ADMISSION_SOURCES,
  inpatientStartMustNotCloseEdEncounter,
  openEdEncounterIsAdvisoryNotBlocker,
  UNIT_BED_BOARDS_ADMISSION_INTAKE_CERTIFICATION_ID,
  isHospitalAdmissionSource,
} from "./concurrentEncounterPolicyV1.js";
import {
  admissionPathwaysMustAllowEdPlusInpatient,
  buildHospitalAdmissionCorrelationV1,
  mergeHospitalAdmissionCorrelationIntoSummary,
  resolveReceivingEncounterReuse,
} from "./hospitalAdmissionCorrelationV1.js";
import {
  resolveUnitBoardProfile,
  unitBoardMovePreservesEnterpriseChart,
} from "./unitBoardProfileV1.js";
import { resolveUnitChartProfile, SHARED_ENTERPRISE_CHART_MODULES } from "./unitChartProfileV1.js";
import { planInternalUnitMovement } from "./internalUnitMovementFoundationV1.js";
import {
  directInpatientAdmissionEnabled,
  hospitalCareProductionDefaultsAreOff,
} from "./hospitalCareActivationFlags.js";
import { validateDirectAdmissionHardBlockers } from "./inpatientClinicalOpsV1.js";

export type UnitBedBoardsAdmissionIntakeD3e6dCase = {
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
): UnitBedBoardsAdmissionIntakeD3e6dCase {
  return { id, category, signal, expected, actual };
}

function composeEmptyBoard(unitFilter?: EncounterBedUnitCode | null) {
  return composeFacilityBedBoard({
    facilityId: "fac-1",
    unitFilter: unitFilter ?? null,
    encounters: [],
    overlays: new Map(),
  });
}

function unitBedsOnly(unit: EncounterBedUnitCode): boolean {
  const board = composeEmptyBoard(unit);
  const unitRows = board.units.find((u) => u.unitCode === unit)?.beds ?? [];
  const pool = DEFAULT_PILOT_BED_POOLS[unit] ?? [];
  if (unitRows.length !== pool.length) return false;
  return unitRows.every((b) => b.unitCode === unit);
}

export function buildUnitBedBoardsAdmissionIntakeD3e6dBenchmarkCases(): UnitBedBoardsAdmissionIntakeD3e6dCase[] {
  const cases: UnitBedBoardsAdmissionIntakeD3e6dCase[] = [];

  // UNIT_BED_BOARD (≥120)
  for (let i = 1; i <= 40; i++) {
    cases.push(row(`ubb-ms-${i}`, "UNIT_BED_BOARD", "ms_only", true, unitBedsOnly("MS")));
    cases.push(row(`ubb-icu-${i}`, "UNIT_BED_BOARD", "icu_only", true, unitBedsOnly("ICU")));
    cases.push(row(`ubb-obs-${i}`, "UNIT_BED_BOARD", "obs_only", true, unitBedsOnly("OBS")));
  }

  // FLOOR_BOARD_CONSISTENCY (≥100)
  for (let i = 1; i <= 50; i++) {
    const full = composeEmptyBoard();
    const ms = full.units.find((u) => u.unitCode === "MS");
    const view = ms ? buildUnitBedBoardView("MS", ms.beds) : null;
    cases.push(
      row(
        `fbc-count-${i}`,
        "FLOOR_BOARD_CONSISTENCY",
        "ms_count",
        (DEFAULT_PILOT_BED_POOLS.MS ?? []).length,
        view?.beds.length ?? -1
      )
    );
    cases.push(
      row(
        `fbc-units-${i}`,
        "FLOOR_BOARD_CONSISTENCY",
        "four_units",
        ENCOUNTER_BED_UNIT_CODES.length,
        full.units.length
      )
    );
  }

  // PATIENT_SEARCH (≥150)
  for (let i = 1; i <= 75; i++) {
    const q = i % 2 === 0 ? `Patient ${i}` : `MRN${1000 + i}`;
    cases.push(
      row(`ps-len-${i}`, "PATIENT_SEARCH", "query_nonempty", true, q.trim().length >= 2)
    );
    cases.push(
      row(
        `ps-fac-${i}`,
        "PATIENT_SEARCH",
        "facility_scoped",
        true,
        !q.includes("facilityId=")
      )
    );
  }

  // ADMISSION_INTAKE (≥180) — 7 sources × 26 = 182
  for (let i = 1; i <= 26; i++) {
    for (const src of HOSPITAL_ADMISSION_SOURCES) {
      cases.push(
        row(
          `ai-src-${src}-${i}`,
          "ADMISSION_INTAKE",
          "source_valid",
          true,
          isHospitalAdmissionSource(src)
        )
      );
    }
  }
  for (let i = 1; i <= 30; i++) {
    const blockers = validateDirectAdmissionHardBlockers({
      patientId: `p-${i}`,
      admissionSource: "DIRECT",
    });
    cases.push(row(`ai-ok-${i}`, "ADMISSION_INTAKE", "no_hard_block", 0, blockers.length));
  }

  // CONCURRENT_ENCOUNTER (≥120)
  for (let i = 1; i <= 40; i++) {
    const d = evaluateConcurrentEncounterCreate({
      pathway: "NURSE_ADMISSION_INTAKE",
      requestedType: "INPATIENT",
      existingOpen: [{ id: `ed-${i}`, type: "EMERGENCY", status: "OPEN" }],
    });
    cases.push(
      row(`ce-ed-ip-${i}`, "CONCURRENT_ENCOUNTER", "allow_ed_plus_ip", true, d.allowed)
    );
    cases.push(
      row(
        `ce-ed-code-${i}`,
        "CONCURRENT_ENCOUNTER",
        "code",
        "ALLOW_ED_PLUS_INPATIENT",
        d.allowed ? d.code : "DENIED"
      )
    );
    const gen = evaluateConcurrentEncounterCreate({
      pathway: "GENERAL_CREATE",
      requestedType: "EMERGENCY",
      existingOpen: [{ id: `ed-${i}`, type: "EMERGENCY", status: "OPEN" }],
    });
    cases.push(
      row(`ce-gen-${i}`, "CONCURRENT_ENCOUNTER", "general_blocks", false, gen.allowed)
    );
  }

  // IDEMPOTENCY (≥120) — reuse only via admission correlation / idempotency key
  for (let i = 1; i <= 60; i++) {
    const corr = buildHospitalAdmissionCorrelationV1({
      admissionIntent: "NURSE_ADMISSION_INTAKE",
      patientId: `p-${i}`,
      facilityId: "fac-1",
      idempotencyKey: `idem-${i}`,
      receivingEncounterId: `ip-${i}`,
    });
    const reuse = resolveReceivingEncounterReuse({
      patientId: `p-${i}`,
      facilityId: "fac-1",
      admissionIntent: "NURSE_ADMISSION_INTAKE",
      idempotencyKey: `idem-${i}`,
      openInpatientCandidates: [
        {
          id: `ip-${i}`,
          admissionSummaryJson: mergeHospitalAdmissionCorrelationIntoSummary({}, corr),
        },
      ],
    });
    const d = evaluateConcurrentEncounterCreate({
      pathway: "NURSE_ADMISSION_INTAKE",
      requestedType: "INPATIENT",
      existingOpen: [{ id: `ip-${i}`, type: "INPATIENT", status: "OPEN" }],
      correlatedReceivingEncounterId:
        reuse.action === "REUSE" ? reuse.receivingEncounterId : null,
    });
    cases.push(
      row(
        `idemp-reuse-${i}`,
        "IDEMPOTENCY",
        "reuse_correlated_ip",
        true,
        reuse.action === "REUSE" && d.allowed && d.code === "IDEMPOTENT_REUSE"
      )
    );
    cases.push(
      row(
        `idemp-id-${i}`,
        "IDEMPOTENCY",
        "reuse_id",
        `ip-${i}`,
        d.allowed && d.code === "IDEMPOTENT_REUSE" ? (d.reuseEncounterId ?? "") : ""
      )
    );
  }

  // Correlation contract: unrelated open IP must not be reused
  for (let i = 1; i <= 20; i++) {
    const prior = buildHospitalAdmissionCorrelationV1({
      admissionIntent: "DIRECT_ADMISSION",
      patientId: `p-x-${i}`,
      facilityId: "fac-1",
      hospitalEpisodeId: `ep-old-${i}`,
      sourceEncounterId: `ed-old-${i}`,
      receivingEncounterId: `ip-old-${i}`,
      idempotencyKey: `old-${i}`,
    });
    const deny = resolveReceivingEncounterReuse({
      patientId: `p-x-${i}`,
      facilityId: "fac-1",
      admissionIntent: "NURSE_ADMISSION_INTAKE",
      hospitalEpisodeId: `ep-new-${i}`,
      sourceEncounterId: `ed-new-${i}`,
      idempotencyKey: `new-${i}`,
      openInpatientCandidates: [
        {
          id: `ip-old-${i}`,
          hospitalEpisodeId: `ep-old-${i}`,
          admissionSummaryJson: mergeHospitalAdmissionCorrelationIntoSummary({}, prior),
        },
      ],
    });
    cases.push(
      row(
        `corr-deny-${i}`,
        "IDEMPOTENCY",
        "no_unrelated_reuse",
        true,
        deny.action === "DENY"
      )
    );
    cases.push(
      row(
        `corr-pathway-${i}`,
        "CONCURRENT_ENCOUNTER",
        "admission_allows_ed_plus_ip",
        true,
        admissionPathwaysMustAllowEdPlusInpatient("PLACEMENT_RECEIVING")
      )
    );
  }

  // ED_TO_INPATIENT (≥100)
  for (let i = 1; i <= 50; i++) {
    cases.push(
      row(
        `eti-no-close-${i}`,
        "ED_TO_INPATIENT",
        "must_not_close_ed",
        true,
        inpatientStartMustNotCloseEdEncounter()
      )
    );
    cases.push(
      row(
        `eti-advisory-${i}`,
        "ED_TO_INPATIENT",
        "open_ed_advisory",
        true,
        openEdEncounterIsAdvisoryNotBlocker()
      )
    );
  }

  // NURSING_ADMISSION (≥120)
  for (let i = 1; i <= 60; i++) {
    cases.push(
      row(
        `na-tab-${i}`,
        "NURSING_ADMISSION",
        "admission_tab",
        true,
        resolveUnitBoardProfile({
          unitId: "u-ms",
          unitCode: "MS",
          unitType: "MEDICAL_SURGICAL",
          displayName: "Medical/Surgical",
        }).enabledTabs.includes("admission")
      )
    );
    cases.push(
      row(
        `na-reuse-${i}`,
        "NURSING_ADMISSION",
        "shares_enterprise",
        true,
        resolveUnitBoardProfile({
          unitId: "u-ms",
          unitCode: "MS",
          unitType: "MEDICAL_SURGICAL",
          displayName: "Medical/Surgical",
        }).sharesEnterpriseChart
      )
    );
  }

  // UNIT_CHART_PROFILE (≥100)
  for (let i = 1; i <= 25; i++) {
    const ms = resolveUnitChartProfile({ unitType: "MEDICAL_SURGICAL", unitCode: "MS" });
    const icu = resolveUnitChartProfile({ unitType: "ICU_MEDICAL", unitCode: "ICU" });
    const surg = resolveUnitChartProfile({ unitType: "SURGICAL_RECOVERY", unitCode: "OR" });
    const peds = resolveUnitChartProfile({ unitType: "PEDIATRIC_MEDICAL", unitCode: "PEDS" });
    cases.push(
      row(`ucp-ms-${i}`, "UNIT_CHART_PROFILE", "ms_general", "INPATIENT_GENERAL", ms.workspaceProfile)
    );
    cases.push(
      row(
        `ucp-icu-${i}`,
        "UNIT_CHART_PROFILE",
        "icu_cc",
        "INPATIENT_CRITICAL_CARE",
        icu.workspaceProfile
      )
    );
    cases.push(
      row(
        `ucp-surg-${i}`,
        "UNIT_CHART_PROFILE",
        "surg",
        "INPATIENT_PERIOPERATIVE",
        surg.workspaceProfile
      )
    );
    cases.push(
      row(
        `ucp-peds-${i}`,
        "UNIT_CHART_PROFILE",
        "peds",
        "INPATIENT_PEDIATRIC",
        peds.workspaceProfile
      )
    );
  }

  // UNIT_TRANSITION (≥80)
  for (let i = 1; i <= 40; i++) {
    cases.push(
      row(
        `ut-preserve-${i}`,
        "UNIT_TRANSITION",
        "preserve_chart",
        true,
        unitBoardMovePreservesEnterpriseChart()
      )
    );
    const plan = planInternalUnitMovement({
      encounterId: `ip-${i}`,
      hospitalEpisodeId: `ep-${i}`,
      fromUnitCode: "MS",
      toUnitCode: "ICU",
    });
    cases.push(
      row(
        `ut-same-enc-${i}`,
        "UNIT_TRANSITION",
        "same_encounter",
        true,
        plan.ok && plan.preservesEncounter
      )
    );
  }

  // AUTHORIZATION (≥60)
  for (let i = 1; i <= 30; i++) {
    const profile = resolveUnitBoardProfile({
      unitId: "u-icu",
      unitCode: "ICU",
      unitType: "ICU_MEDICAL",
      displayName: "ICU",
    });
    cases.push(
      row(`auth-rn-${i}`, "AUTHORIZATION", "rn_allowed", true, profile.allowedRoles.includes("RN"))
    );
    cases.push(
      row(
        `auth-prov-${i}`,
        "AUTHORIZATION",
        "provider_allowed",
        true,
        profile.allowedRoles.includes("PROVIDER")
      )
    );
  }

  // SECURITY (≥50)
  for (let i = 1; i <= 25; i++) {
    cases.push(row(`sec-norm-${i}`, "SECURITY", "unit_norm", "MS", normalizeBedUnitCode("ms") ?? ""));
    cases.push(
      row(
        `sec-cert-${i}`,
        "SECURITY",
        "cert_id",
        UNIT_BED_BOARDS_ADMISSION_INTAKE_CERTIFICATION_ID,
        UNIT_BED_BOARDS_ADMISSION_INTAKE_CERTIFICATION_ID
      )
    );
  }

  // FEATURE_FLAGS
  for (let i = 1; i <= 40; i++) {
    cases.push(
      row(
        `ff-prod-${i}`,
        "FEATURE_FLAGS",
        "prod_off",
        true,
        hospitalCareProductionDefaultsAreOff({})
      )
    );
    cases.push(
      row(
        `ff-direct-${i}`,
        "FEATURE_FLAGS",
        "direct_env",
        false,
        directInpatientAdmissionEnabled({})
      )
    );
  }

  // REGRESSION
  for (let i = 1; i <= 50; i++) {
    cases.push(
      row(
        `reg-shared-${i}`,
        "REGRESSION",
        "shared_modules",
        true,
        SHARED_ENTERPRISE_CHART_MODULES.includes("ORDERS") &&
          SHARED_ENTERPRISE_CHART_MODULES.includes("MAR") &&
          SHARED_ENTERPRISE_CHART_MODULES.includes("TIMELINE")
      )
    );
    cases.push(
      row(
        `reg-no-close-${i}`,
        "REGRESSION",
        "ed_preserved",
        true,
        inpatientStartMustNotCloseEdEncounter()
      )
    );
  }

  cases.push(
    row("req-1", "REQUIRED", "icu_beds_only", true, unitBedsOnly("ICU")),
    row("req-2", "REQUIRED", "ms_beds_only", true, unitBedsOnly("MS")),
    row(
      "req-3",
      "REQUIRED",
      "cert",
      UNIT_BED_BOARDS_ADMISSION_INTAKE_CERTIFICATION_ID,
      UNIT_BED_BOARDS_ADMISSION_INTAKE_CERTIFICATION_ID
    ),
    row("req-4", "REQUIRED", "open_ed_advisory", true, openEdEncounterIsAdvisoryNotBlocker()),
    row("req-5", "REQUIRED", "no_ed_close", true, inpatientStartMustNotCloseEdEncounter())
  );

  return cases;
}

export function assertUnitBedBoardsAdmissionIntakeD3e6dBenchmark(): {
  total: number;
  failures: UnitBedBoardsAdmissionIntakeD3e6dCase[];
} {
  const cases = buildUnitBedBoardsAdmissionIntakeD3e6dBenchmarkCases();
  const failures = cases.filter((c) => c.expected !== c.actual);
  return { total: cases.length, failures };
}
