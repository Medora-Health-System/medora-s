/**
 * D3E.6B — Unit-aware chart profile routing (foundation).
 * Chart type is resolved from explicit clinical unit identity — never from
 * room name, bed code, physical floor, or stay duration.
 * Full ICU / OR / PACU / L&D / Behavioral engines are out of scope.
 */

import {
  levelOfCareForUnitType,
  normalizeHospitalClinicalUnitType,
  type HospitalClinicalUnitType,
} from "./hospitalClinicalUnitTaxonomy.js";
import { resolvePatientClinicalUnitCode } from "./hospitalUnitRegistryV1.js";

export type UnitChartWorkspaceProfile =
  | "INPATIENT_GENERAL"
  | "INPATIENT_CRITICAL_CARE"
  | "INPATIENT_INTERMEDIATE"
  | "INPATIENT_PEDIATRIC"
  | "INPATIENT_WOMENS_HEALTH"
  | "INPATIENT_PERIOPERATIVE"
  | "INPATIENT_BEHAVIORAL"
  | "INPATIENT_REHAB"
  | "OBSERVATION"
  | "SHARED_ENTERPRISE";

export type UnitChartProfileV1 = {
  unitType: HospitalClinicalUnitType;
  unitCode: string | null;
  workspaceProfile: UnitChartWorkspaceProfile;
  enabledTabs: string[];
  requiredAssessments: string[];
  availableOrderSets: string[];
  certificationProfile: string;
  /** Shared enterprise modules — always available; not duplicated per unit. */
  sharedEnterpriseModules: readonly string[];
  /** Future capability shells — not full clinical engines. */
  unitSpecificShells: readonly string[];
};

export const SHARED_ENTERPRISE_CHART_MODULES = [
  "PATIENT_IDENTITY",
  "HOSPITAL_EPISODE",
  "ENCOUNTER_IDENTITY",
  "ALLERGIES",
  "MEDICATION_HISTORY",
  "ORDERS",
  "LABORATORY",
  "RADIOLOGY",
  "PHARMACY",
  "RESULTS",
  "MAR",
  "MEDICATION_INTELLIGENCE",
  "TIMELINE",
  "DIAGNOSES",
  "PROBLEM_LIST",
  "CARE_TEAM",
  "DISCHARGE_PLANNING",
  "CHART_ARCHIVE",
] as const;

const BASE_INPATIENT_TABS = [
  "overview",
  "notes",
  "orders",
  "results",
  "mar",
  "timeline",
  "discharge",
] as const;

function workspaceForUnitType(unitType: HospitalClinicalUnitType): UnitChartWorkspaceProfile {
  if (unitType === "OBSERVATION" || unitType === "CLINICAL_DECISION") return "OBSERVATION";
  if (unitType.startsWith("ICU_")) return "INPATIENT_CRITICAL_CARE";
  if (
    unitType === "PROGRESSIVE_CARE" ||
    unitType === "STEP_DOWN" ||
    unitType === "INTERMEDIATE_CARE" ||
    unitType === "TELEMETRY" ||
    unitType === "CARDIAC_TELEMETRY"
  ) {
    return "INPATIENT_INTERMEDIATE";
  }
  if (unitType.startsWith("PEDIATRIC_") || unitType === "ICU_PEDIATRIC" || unitType === "ICU_NEONATAL") {
    return "INPATIENT_PEDIATRIC";
  }
  if (
    unitType === "LABOR_DELIVERY" ||
    unitType === "ANTEPARTUM" ||
    unitType === "POSTPARTUM" ||
    unitType === "MOTHER_BABY" ||
    unitType === "HIGH_RISK_OBSTETRICS"
  ) {
    return "INPATIENT_WOMENS_HEALTH";
  }
  if (
    unitType === "OPERATING_ROOM" ||
    unitType === "PACU" ||
    unitType === "PREOPERATIVE" ||
    unitType === "SURGICAL_RECOVERY" ||
    unitType === "AMBULATORY_SURGERY" ||
    unitType === "SAME_DAY_SURGERY"
  ) {
    return "INPATIENT_PERIOPERATIVE";
  }
  if (unitType.startsWith("BEHAVIORAL_") || unitType === "MEDICAL_PSYCHIATRY" || unitType === "DETOXIFICATION") {
    return "INPATIENT_BEHAVIORAL";
  }
  if (unitType.includes("REHABILITATION")) return "INPATIENT_REHAB";
  return "INPATIENT_GENERAL";
}

function shellsForProfile(profile: UnitChartWorkspaceProfile): string[] {
  switch (profile) {
    case "INPATIENT_CRITICAL_CARE":
      return [
        "CRITICAL_CARE_ASSESSMENT",
        "VENTILATOR_DOCUMENTATION",
        "HEMODYNAMIC_MONITORING",
        "SEDATION",
        "VASOPRESSOR_MONITORING",
      ];
    case "INPATIENT_PEDIATRIC":
      return [
        "PEDIATRIC_ASSESSMENT",
        "GUARDIAN_INFORMATION",
        "DEVELOPMENTAL_STATUS",
        "PEDIATRIC_VITAL_RANGES",
      ];
    case "INPATIENT_WOMENS_HEALTH":
      return [
        "MATERNAL_ASSESSMENT",
        "FETAL_MONITORING",
        "LABOR_PROGRESS",
        "DELIVERY_RECORD",
        "POSTPARTUM_TRANSITION",
      ];
    case "INPATIENT_PERIOPERATIVE":
      return [
        "PREOPERATIVE_ASSESSMENT",
        "OPERATIVE_RECORD",
        "ANESTHESIA_RECORD",
        "POSTOPERATIVE_RECOVERY",
      ];
    case "INPATIENT_BEHAVIORAL":
      return [
        "BEHAVIORAL_ASSESSMENT",
        "SAFETY_PRECAUTIONS",
        "SUICIDE_RISK",
        "OBSERVATION_LEVEL",
        "THERAPEUTIC_PLAN",
      ];
    case "INPATIENT_REHAB":
      return [
        "FUNCTIONAL_ASSESSMENT",
        "THERAPY_GOALS",
        "MOBILITY_PROGRESS",
        "INTERDISCIPLINARY_REHAB_PLAN",
      ];
    case "INPATIENT_GENERAL":
    case "INPATIENT_INTERMEDIATE":
      return ["H_AND_P", "DAILY_PROGRESS", "FALL_RISK", "SKIN", "WOUNDS", "MOBILITY", "INTAKE_OUTPUT"];
    case "OBSERVATION":
      return ["OBSERVATION_ASSESSMENT", "REASSESSMENT", "DISPOSITION"];
    default:
      return [];
  }
}

/**
 * Resolve unit chart profile from explicit unit identity.
 * Never uses room name / bed / floor / LOS heuristics for chart type.
 */
export function resolveUnitChartProfile(input: {
  unitType?: string | null;
  unitCode?: string | null;
  roomLabel?: string | null;
  /** Ignored for chart type — accepted only to prove we do not use it. */
  stayDurationHours?: number | null;
  floorName?: string | null;
}): UnitChartProfileV1 {
  void input.stayDurationHours;
  void input.floorName;

  let unitType = normalizeHospitalClinicalUnitType(input.unitType);
  if (!unitType && input.unitCode) {
    unitType = normalizeHospitalClinicalUnitType(input.unitCode);
  }
  if (!unitType) {
    const code = resolvePatientClinicalUnitCode({
      roomLabel: input.roomLabel,
      unitCode: input.unitCode,
    });
    unitType = normalizeHospitalClinicalUnitType(code) ?? "MEDICAL_SURGICAL";
  }

  const workspaceProfile = workspaceForUnitType(unitType);
  const shells = shellsForProfile(workspaceProfile);

  return {
    unitType,
    unitCode: input.unitCode?.trim().toUpperCase() ?? null,
    workspaceProfile,
    enabledTabs: [...BASE_INPATIENT_TABS],
    requiredAssessments: shells.slice(0, 2),
    availableOrderSets: [],
    certificationProfile: `UNIT_CHART.${unitType}.${levelOfCareForUnitType(unitType)}`,
    sharedEnterpriseModules: SHARED_ENTERPRISE_CHART_MODULES,
    unitSpecificShells: shells,
  };
}

/** Chart routing must not invent type from room labels alone without unit context. */
export function chartProfileIgnoresFloorAndLosHeuristics(): true {
  return true;
}
