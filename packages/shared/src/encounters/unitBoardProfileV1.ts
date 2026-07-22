/**
 * D3E.6C — Smart unit board configuration (separate workspace, one EMR).
 */

import {
  serviceLineForUnitType,
  type HospitalServiceLineCode,
  type HospitalServiceLineColorToken,
  HOSPITAL_SERVICE_LINE_DEFINITIONS,
} from "./hospitalServiceLineNavigationV1.js";
import { resolveUnitChartProfile, type UnitChartProfileV1 } from "./unitChartProfileV1.js";
import type { HospitalClinicalUnitType } from "./hospitalClinicalUnitTaxonomy.js";

export type UnitBoardProfileV1 = {
  unitId: string;
  unitCode: string;
  unitType: HospitalClinicalUnitType;
  serviceLine: HospitalServiceLineCode;
  boardProfile: string;
  displayName: string;
  colorToken: HospitalServiceLineColorToken;
  icon: string;
  enabledMetrics: string[];
  enabledFilters: string[];
  enabledTabs: string[];
  requiredDocumentation: string[];
  enabledOrderSets: string[];
  certificationProfile: string;
  allowedRoles: string[];
  chartProfile: UnitChartProfileV1;
  /** Always true — boards never fork the enterprise chart. */
  sharesEnterpriseChart: true;
  sharesHospitalEpisode: true;
  sharesOrdersResultsMar: true;
};

const BASE_METRICS = [
  "activePatients",
  "occupiedBeds",
  "availableBeds",
  "rnUnassigned",
  "physicianUnassigned",
  "reassessmentOverdue",
  "vitalsStale",
  "criticalResults",
  "pendingResults",
  "readyDischarge",
];

const BASE_FILTERS = ["search", "status", "attending", "nurse", "room", "operational", "sort"];

const SHARED_TABS = [
  "overview",
  "admission",
  "notes",
  "orders",
  "results",
  "medications",
  "mar",
  "consults",
  "carePlan",
  "discharge",
  "timeline",
];

export function resolveUnitBoardProfile(input: {
  unitId: string;
  unitCode: string;
  unitType: HospitalClinicalUnitType | string;
  displayName: string;
}): UnitBoardProfileV1 {
  const chartProfile = resolveUnitChartProfile({
    unitType: input.unitType,
    unitCode: input.unitCode,
  });
  const serviceLine = serviceLineForUnitType(chartProfile.unitType);
  const lineDef = HOSPITAL_SERVICE_LINE_DEFINITIONS.find((d) => d.code === serviceLine)!;

  const metrics = [...BASE_METRICS];
  if (serviceLine === "CRITICAL_CARE") {
    metrics.push("highAcuityAlerts", "isolationStatus", "codeStatus");
  }
  if (serviceLine === "SURGICAL_SERVICES") {
    metrics.push("preopStatus", "postopStatus");
  }
  if (serviceLine === "PEDIATRICS") {
    metrics.push("guardianDisplay", "weightDisplay");
  }

  return {
    unitId: input.unitId,
    unitCode: input.unitCode,
    unitType: chartProfile.unitType,
    serviceLine,
    boardProfile: `BOARD.${serviceLine}.${chartProfile.unitType}`,
    displayName: input.displayName,
    colorToken: lineDef.colorToken,
    icon: lineDef.icon,
    enabledMetrics: metrics,
    enabledFilters: [...BASE_FILTERS],
    enabledTabs: [...SHARED_TABS, ...chartProfile.unitSpecificShells.slice(0, 3).map((s) => s.toLowerCase())],
    requiredDocumentation: chartProfile.requiredAssessments,
    enabledOrderSets: chartProfile.availableOrderSets,
    certificationProfile: chartProfile.certificationProfile,
    allowedRoles: ["PROVIDER", "RN", "ADMIN"],
    chartProfile,
    sharesEnterpriseChart: true,
    sharesHospitalEpisode: true,
    sharesOrdersResultsMar: true,
  };
}

/** Moving units changes board profile only — never duplicates chart ownership. */
export function unitBoardMovePreservesEnterpriseChart(): true {
  return true;
}
