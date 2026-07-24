/**
 * MEDUI.D4A.3.1 — Project API graphical tree onto the unit-map display model.
 * Presentation only: does not alter API routes, census math, or admission logic.
 */

import type {
  GraphicalHospitalUnitTreeV1,
  GraphicalTreeUnitNode,
  HospitalClinicalUnitType,
  HospitalServiceLineCode,
} from "@medora/shared";
import {
  HOSPITAL_UNIT_MAP_SERVICE_LINES,
  type HospitalUnitMapServiceLineConfig,
  type HospitalUnitMapServiceLineId,
} from "./hospitalUnitMapConfig";

export type HospitalUnitMapUnitNode = GraphicalTreeUnitNode & {
  /** When set, UI should prefer this i18n key over `name` for the primary card. */
  displayNameKey?: string;
  /** True when no configured unit exists yet — still opens the service-line board route. */
  isMapPlaceholder?: boolean;
};

export type HospitalUnitMapServiceLineNode = {
  id: HospitalUnitMapServiceLineId;
  config: HospitalUnitMapServiceLineConfig;
  patientCount: number;
  alertCount: number;
  /** Prefer first source line route that exists in the API tree; else config fallback. */
  route: string;
  units: HospitalUnitMapUnitNode[];
};

export type HospitalUnitMapModel = {
  root: GraphicalHospitalUnitTreeV1["root"];
  serviceLines: HospitalUnitMapServiceLineNode[];
};

const PLACEHOLDER_UNIT_TYPE: Record<string, HospitalClinicalUnitType> = {
  MS: "MEDICAL_SURGICAL",
  ICU: "ICU_GENERAL",
  PEDS: "PEDIATRIC_MEDICAL",
  LD: "MOTHER_BABY",
  BH: "BEHAVIORAL_HEALTH_ADULT",
  OBS: "OBSERVATION",
};

function unitsForCodes(
  tree: GraphicalHospitalUnitTreeV1,
  codes: readonly HospitalServiceLineCode[]
): GraphicalTreeUnitNode[] {
  const codeSet = new Set(codes);
  const out: GraphicalTreeUnitNode[] = [];
  for (const sl of tree.serviceLines) {
    if (!codeSet.has(sl.code)) continue;
    // Never surface Rehabilitation on the map.
    if (sl.code === "REHABILITATION") continue;
    for (const u of sl.units) out.push(u);
  }
  return out;
}

function sortUnitsPreferredFirst(
  units: GraphicalTreeUnitNode[],
  preferredUnitCode: string
): GraphicalTreeUnitNode[] {
  const preferred = preferredUnitCode.trim().toUpperCase();
  return [...units].sort((a, b) => {
    const aPref = a.code.trim().toUpperCase() === preferred ? 0 : 1;
    const bPref = b.code.trim().toUpperCase() === preferred ? 0 : 1;
    if (aPref !== bPref) return aPref - bPref;
    return a.name.localeCompare(b.name);
  });
}

function resolveLineRoute(
  tree: GraphicalHospitalUnitTreeV1,
  config: HospitalUnitMapServiceLineConfig
): string {
  for (const code of config.sourceServiceLineCodes) {
    const sl = tree.serviceLines.find((s) => s.code === code);
    if (sl?.route) return sl.route;
  }
  return config.fallbackRoute;
}

function makePlaceholderUnit(
  config: HospitalUnitMapServiceLineConfig,
  route: string
): HospitalUnitMapUnitNode {
  const code = config.preferredUnitCode.trim().toUpperCase();
  return {
    id: `map-placeholder-${config.id}`,
    code: config.preferredUnitCode,
    name: config.preferredUnitCode,
    unitType: PLACEHOLDER_UNIT_TYPE[code] ?? "MEDICAL_SURGICAL",
    patientCount: 0,
    occupiedBeds: null,
    availableBeds: null,
    alertCount: 0,
    route,
    enabled: true,
    developmentOnly: false,
    opensObservationWorkspace: code === "OBS",
    displayNameKey: config.primaryUnitTitleKey,
    isMapPlaceholder: true,
  };
}

export function projectHospitalUnitMap(tree: GraphicalHospitalUnitTreeV1): HospitalUnitMapModel {
  const serviceLines: HospitalUnitMapServiceLineNode[] = HOSPITAL_UNIT_MAP_SERVICE_LINES.map(
    (config) => {
      const apiUnits = sortUnitsPreferredFirst(
        unitsForCodes(tree, config.sourceServiceLineCodes),
        config.preferredUnitCode
      );
      const route = resolveLineRoute(tree, config);
      const preferred = config.preferredUnitCode.trim().toUpperCase();

      const units: HospitalUnitMapUnitNode[] =
        apiUnits.length === 0
          ? [makePlaceholderUnit(config, route)]
          : apiUnits.map((u) => ({
              ...u,
              displayNameKey:
                u.code.trim().toUpperCase() === preferred
                  ? config.primaryUnitTitleKey
                  : undefined,
            }));

      const patientCount = apiUnits.reduce((n, u) => n + u.patientCount, 0);
      const alertCount = apiUnits.reduce((n, u) => n + u.alertCount, 0);

      return {
        id: config.id,
        config,
        patientCount,
        alertCount,
        route,
        units,
      };
    }
  );

  return {
    root: tree.root,
    serviceLines,
  };
}

export function filterHospitalUnitMap(
  model: HospitalUnitMapModel,
  query: string
): HospitalUnitMapServiceLineNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return model.serviceLines;
  return model.serviceLines
    .map((sl) => ({
      ...sl,
      units: sl.units.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.code.toLowerCase().includes(q) ||
          sl.config.id.includes(q) ||
          sl.config.preferredUnitCode.toLowerCase().includes(q)
      ),
    }))
    .filter(
      (sl) =>
        sl.units.length > 0 ||
        sl.config.id.includes(q) ||
        sl.config.testId.includes(q)
    );
}
