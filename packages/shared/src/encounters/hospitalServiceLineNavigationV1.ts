/**
 * D3E.6C — Graphical hospital service-line navigation contract.
 * Derived from canonical unit registry. No rooms/beds in the tree.
 * Not a separate EMR — dedicated boards are unit-scoped workspaces.
 */

import type { HospitalClinicalUnitType } from "./hospitalClinicalUnitTaxonomy.js";
import type { HospitalUnitRegistryUnit, HospitalUnitRegistryV1 } from "./hospitalUnitRegistryV1.js";
import { ALL_HOSPITAL_UNITS_SELECTION_ID } from "./hospitalUnitRegistryV1.js";

export const GRAPHICAL_HOSPITAL_UNIT_TREE_CERTIFICATION_ID =
  "MEDUI.GRAPHICAL_HOSPITAL_UNIT_TREE.D3E6C" as const;

export const HOSPITAL_SERVICE_LINE_CODES = [
  "MEDICAL_SERVICES",
  "CRITICAL_CARE",
  "SURGICAL_SERVICES",
  "WOMEN_NEWBORN",
  "PEDIATRICS",
  "NEURO_SPECIALTY",
  "ONCOLOGY_HEMATOLOGY",
  "BEHAVIORAL_HEALTH",
  "REHABILITATION",
  "OTHER_SPECIALTY",
] as const;

export type HospitalServiceLineCode = (typeof HOSPITAL_SERVICE_LINE_CODES)[number];

/** Restrained design tokens — not arbitrary hex in domain logic. */
export type HospitalServiceLineColorToken =
  | "service.medical"
  | "service.critical"
  | "service.surgical"
  | "service.women"
  | "service.pediatrics"
  | "service.neuro"
  | "service.oncology"
  | "service.behavioral"
  | "service.rehab"
  | "service.other";

export type HospitalServiceLineDefinition = {
  code: HospitalServiceLineCode;
  name: string;
  slug: string;
  colorToken: HospitalServiceLineColorToken;
  icon: string;
  route: string;
};

export const HOSPITAL_SERVICE_LINE_DEFINITIONS: readonly HospitalServiceLineDefinition[] =
  Object.freeze([
    {
      code: "MEDICAL_SERVICES",
      name: "Medical Services",
      slug: "medical-services",
      colorToken: "service.medical",
      icon: "bed",
      route: "/app/hospitalisation/inpatient/medical-services",
    },
    {
      code: "CRITICAL_CARE",
      name: "Critical Care",
      slug: "critical-care",
      colorToken: "service.critical",
      icon: "pulse",
      route: "/app/hospitalisation/inpatient/critical-care",
    },
    {
      code: "SURGICAL_SERVICES",
      name: "Surgical Services",
      slug: "surgical-services",
      colorToken: "service.surgical",
      icon: "scalpel",
      route: "/app/hospitalisation/inpatient/surgical-services",
    },
    {
      code: "WOMEN_NEWBORN",
      name: "Women & Newborn",
      slug: "women-newborn",
      colorToken: "service.women",
      icon: "mother",
      route: "/app/hospitalisation/inpatient/women-newborn",
    },
    {
      code: "PEDIATRICS",
      name: "Pediatrics",
      slug: "pediatrics",
      colorToken: "service.pediatrics",
      icon: "child",
      route: "/app/hospitalisation/inpatient/pediatrics",
    },
    {
      code: "NEURO_SPECIALTY",
      name: "Neurology & Specialized",
      slug: "neuro-specialty",
      colorToken: "service.neuro",
      icon: "brain",
      route: "/app/hospitalisation/inpatient/neuro-specialty",
    },
    {
      code: "ONCOLOGY_HEMATOLOGY",
      name: "Oncology & Hematology",
      slug: "oncology-hematology",
      colorToken: "service.oncology",
      icon: "ribbon",
      route: "/app/hospitalisation/inpatient/oncology-hematology",
    },
    {
      code: "BEHAVIORAL_HEALTH",
      name: "Behavioral Health",
      slug: "behavioral-health",
      colorToken: "service.behavioral",
      icon: "person",
      route: "/app/hospitalisation/inpatient/behavioral-health",
    },
    {
      code: "REHABILITATION",
      name: "Rehabilitation",
      slug: "rehabilitation",
      colorToken: "service.rehab",
      icon: "mobility",
      route: "/app/hospitalisation/inpatient/rehabilitation",
    },
    {
      code: "OTHER_SPECIALTY",
      name: "Other Specialty",
      slug: "other-specialty",
      colorToken: "service.other",
      icon: "ellipsis",
      route: "/app/hospitalisation/inpatient/other-specialty",
    },
  ]);

/** CSS token map for UI (readable dark text on tinted backgrounds). */
export const HOSPITAL_SERVICE_LINE_COLOR_CSS: Record<
  HospitalServiceLineColorToken,
  { bg: string; border: string; text: string; accent: string }
> = {
  "service.medical": { bg: "#eff6ff", border: "#3b82f6", text: "#1e3a8a", accent: "#2563eb" },
  "service.critical": { bg: "#ecfdf5", border: "#10b981", text: "#064e3b", accent: "#059669" },
  "service.surgical": { bg: "#f5f3ff", border: "#8b5cf6", text: "#4c1d95", accent: "#7c3aed" },
  "service.women": { bg: "#fff7ed", border: "#f97316", text: "#9a3412", accent: "#ea580c" },
  "service.pediatrics": { bg: "#ecfeff", border: "#06b6d4", text: "#164e63", accent: "#0891b2" },
  "service.neuro": { bg: "#fffbeb", border: "#f59e0b", text: "#92400e", accent: "#d97706" },
  "service.oncology": { bg: "#fff1f2", border: "#f43f5e", text: "#9f1239", accent: "#e11d48" },
  "service.behavioral": { bg: "#ecfdf5", border: "#34d399", text: "#065f46", accent: "#10b981" },
  "service.rehab": { bg: "#f8fafc", border: "#64748b", text: "#0f172a", accent: "#475569" },
  "service.other": { bg: "#fafaf9", border: "#d6d3d1", text: "#44403c", accent: "#a8a29e" },
};

export function serviceLineForUnitType(unitType: HospitalClinicalUnitType): HospitalServiceLineCode {
  if (
    unitType === "MEDICAL_SURGICAL" ||
    unitType === "MEDICAL" ||
    unitType === "GENERAL_MEDICINE" ||
    unitType === "HOSPITALIST" ||
    unitType === "TELEMETRY" ||
    unitType === "CARDIAC_TELEMETRY" ||
    unitType === "CARDIOLOGY" ||
    unitType === "PULMONOLOGY" ||
    unitType === "GASTROENTEROLOGY" ||
    unitType === "NEPHROLOGY" ||
    unitType === "DIALYSIS" ||
    unitType === "INFECTIOUS_DISEASE" ||
    unitType === "SHORT_STAY_INPATIENT" ||
    unitType === "EXTENDED_RECOVERY"
  ) {
    return "MEDICAL_SERVICES";
  }
  if (
    unitType.startsWith("ICU_") ||
    unitType === "PROGRESSIVE_CARE" ||
    unitType === "STEP_DOWN" ||
    unitType === "INTERMEDIATE_CARE"
  ) {
    return "CRITICAL_CARE";
  }
  if (
    unitType === "SURGICAL" ||
    unitType === "ORTHOPEDICS" ||
    unitType === "PREOPERATIVE" ||
    unitType === "OPERATING_ROOM" ||
    unitType === "PACU" ||
    unitType === "SURGICAL_RECOVERY" ||
    unitType === "AMBULATORY_SURGERY" ||
    unitType === "SAME_DAY_SURGERY" ||
    unitType === "ENDOSCOPY" ||
    unitType === "TRANSPLANT" ||
    unitType.includes("SURGERY")
  ) {
    return "SURGICAL_SERVICES";
  }
  if (
    unitType === "LABOR_DELIVERY" ||
    unitType === "ANTEPARTUM" ||
    unitType === "POSTPARTUM" ||
    unitType === "MOTHER_BABY" ||
    unitType === "GYNECOLOGY" ||
    unitType === "HIGH_RISK_OBSTETRICS" ||
    unitType === "NEWBORN_NURSERY" ||
    unitType === "ICU_NEONATAL"
  ) {
    return "WOMEN_NEWBORN";
  }
  if (
    unitType.startsWith("PEDIATRIC_") ||
    unitType === "ICU_PEDIATRIC"
  ) {
    return "PEDIATRICS";
  }
  if (
    unitType === "NEUROLOGY" ||
    unitType === "NEUROSURGERY" ||
    unitType === "STROKE" ||
    unitType === "SPINE" ||
    unitType === "TRAUMA" ||
    unitType === "BURN" ||
    unitType === "ISOLATION" ||
    unitType === "ICU_NEURO" ||
    unitType === "ICU_TRAUMA" ||
    unitType === "ICU_BURN"
  ) {
    return "NEURO_SPECIALTY";
  }
  if (
    unitType === "ONCOLOGY" ||
    unitType === "HEMATOLOGY" ||
    unitType === "BONE_MARROW_TRANSPLANT" ||
    unitType === "PALLIATIVE" ||
    unitType === "INFUSION"
  ) {
    return "ONCOLOGY_HEMATOLOGY";
  }
  if (
    unitType.startsWith("BEHAVIORAL_") ||
    unitType === "MEDICAL_PSYCHIATRY" ||
    unitType === "DETOXIFICATION"
  ) {
    return "BEHAVIORAL_HEALTH";
  }
  if (unitType.includes("REHABILITATION")) return "REHABILITATION";
  return "OTHER_SPECIALTY";
}

export function unitBoardSlug(unit: Pick<HospitalUnitRegistryUnit, "id" | "code" | "name">): string {
  const fromCode = unit.code.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  if (fromCode) return fromCode;
  return unit.id.replace(/^unit-/, "");
}

export function unitBoardRoute(unit: Pick<HospitalUnitRegistryUnit, "id" | "code" | "name">): string {
  return `/app/hospitalisation/inpatient/units/${encodeURIComponent(unitBoardSlug(unit))}`;
}

export function allHospitalUnitsBoardRoute(): string {
  return "/app/hospitalisation/inpatient/all";
}

export function observationBoardRoute(): string {
  return "/app/hospitalisation/observation";
}

export type GraphicalTreeUnitNode = {
  id: string;
  code: string;
  name: string;
  unitType: HospitalClinicalUnitType;
  patientCount: number;
  occupiedBeds: number | null;
  availableBeds: number | null;
  alertCount: number;
  route: string;
  enabled: boolean;
  developmentOnly: boolean;
  /** Observation opens Observation workspace, not Inpatient chart. */
  opensObservationWorkspace: boolean;
};

export type GraphicalTreeServiceLineNode = {
  id: string;
  code: HospitalServiceLineCode;
  name: string;
  colorToken: HospitalServiceLineColorToken;
  icon: string;
  patientCount: number;
  alertCount: number;
  route: string;
  units: GraphicalTreeUnitNode[];
};

export type GraphicalHospitalUnitTreeV1 = {
  certification: typeof GRAPHICAL_HOSPITAL_UNIT_TREE_CERTIFICATION_ID;
  facilityId: string;
  generatedAt: string;
  placementAvailability: "ENABLED" | "FEATURE_DISABLED";
  root: {
    id: typeof ALL_HOSPITAL_UNITS_SELECTION_ID;
    label: string;
    subtitle: string;
    totalPatients: number;
    alerts: number;
    route: string;
  };
  serviceLines: GraphicalTreeServiceLineNode[];
  /** Rooms/beds must never appear in this tree contract. */
  excludesRoomsAndBeds: true;
  isGraphicalTree: true;
  isVerticalAccordion: false;
};

export function buildGraphicalHospitalUnitTreeV1(
  registry: HospitalUnitRegistryV1
): GraphicalHospitalUnitTreeV1 {
  const byLine = new Map<HospitalServiceLineCode, HospitalUnitRegistryUnit[]>();
  for (const unit of registry.units) {
    const line = serviceLineForUnitType(unit.unitType);
    const list = byLine.get(line) ?? [];
    list.push(unit);
    byLine.set(line, list);
  }

  const serviceLines: GraphicalTreeServiceLineNode[] = [];
  for (const def of HOSPITAL_SERVICE_LINE_DEFINITIONS) {
    const units = byLine.get(def.code) ?? [];
    if (units.length === 0) continue; // hide empty service lines for normal users
    const patientCount = units.reduce((n, u) => n + u.patientCount, 0);
    const alertCount = units.reduce((n, u) => n + u.alertCount, 0);
    serviceLines.push({
      id: `sl-${def.slug}`,
      code: def.code,
      name: def.name,
      colorToken: def.colorToken,
      icon: def.icon,
      patientCount,
      alertCount,
      route: def.route,
      units: units.map((u) => ({
        id: u.id,
        code: u.code,
        name: u.name,
        unitType: u.unitType,
        patientCount: u.patientCount,
        occupiedBeds: u.occupiedBedCount,
        availableBeds: u.availableBedCount,
        alertCount: u.alertCount,
        route:
          u.unitType === "OBSERVATION" ? observationBoardRoute() : unitBoardRoute(u),
        enabled: u.active,
        developmentOnly: u.developmentOnly,
        opensObservationWorkspace: u.unitType === "OBSERVATION",
      })),
    });
  }

  const totalPatients = registry.units
    .filter((u) => u.acceptsInpatient || u.unitType === "OBSERVATION")
    .reduce((n, u) => n + u.patientCount, 0);
  const alerts = registry.units.reduce((n, u) => n + u.alertCount, 0);

  return {
    certification: GRAPHICAL_HOSPITAL_UNIT_TREE_CERTIFICATION_ID,
    facilityId: registry.facilityId,
    generatedAt: registry.generatedAt,
    placementAvailability: registry.placementAvailability,
    root: {
      id: ALL_HOSPITAL_UNITS_SELECTION_ID,
      label: "All Hospital Units",
      subtitle: "Entire Inpatient Census",
      totalPatients,
      alerts,
      route: allHospitalUnitsBoardRoute(),
    },
    serviceLines,
    excludesRoomsAndBeds: true,
    isGraphicalTree: true,
    isVerticalAccordion: false,
  };
}

/** Tree must not embed room/bed labels (MS-1, ICU-2, etc.). */
export function graphicalTreeExcludesRoomBedNodes(tree: GraphicalHospitalUnitTreeV1): boolean {
  if (!tree.excludesRoomsAndBeds || tree.isVerticalAccordion) return false;
  const roomLike = /^(MS|ICU|OBS|ED|PCU|LD)-\d+$/i;
  for (const sl of tree.serviceLines) {
    for (const u of sl.units) {
      if (roomLike.test(u.name) || roomLike.test(u.code)) {
        // codes like MS are ok; names like MS-1 are not
        if (/-/.test(u.name) && /\d/.test(u.name)) return false;
      }
    }
  }
  return true;
}

export function findServiceLineBySlug(slug: string): HospitalServiceLineDefinition | null {
  const s = slug.trim().toLowerCase();
  return HOSPITAL_SERVICE_LINE_DEFINITIONS.find((d) => d.slug === s) ?? null;
}

export function findUnitInTree(
  tree: GraphicalHospitalUnitTreeV1,
  unitIdOrSlug: string
): GraphicalTreeUnitNode | null {
  const key = decodeURIComponent(unitIdOrSlug).trim().toLowerCase();
  for (const sl of tree.serviceLines) {
    for (const u of sl.units) {
      if (
        u.id.toLowerCase() === key ||
        u.code.toLowerCase() === key ||
        unitBoardSlug(u) === key
      ) {
        return u;
      }
    }
  }
  return null;
}
