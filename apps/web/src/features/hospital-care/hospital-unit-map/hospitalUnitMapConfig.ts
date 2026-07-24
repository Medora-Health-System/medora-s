/**
 * MEDUI.D4A.3.1 — Hospital Unit Map display configuration (UI only).
 * Service lines are rendered from this config; census/routes still come from the API tree.
 * Rehabilitation is intentionally excluded from the map.
 */

import type { HospitalServiceLineCode, HospitalServiceLineColorToken } from "@medora/shared";

export const HOSPITAL_UNIT_MAP_CERTIFICATION_ID = "MEDUI.D4A.3.1" as const;

/** Fixed card sizing for visual hierarchy (not derived from N service lines). */
export const HOSPITAL_UNIT_MAP_CARD = {
  widthPx: 180,
  minWidthPx: 170,
  maxWidthPx: 190,
  minHeightPx: 70,
  maxHeightPx: 80,
  gapPx: 12,
} as const;

export type HospitalUnitMapServiceLineId =
  | "medical-surgical"
  | "critical-care"
  | "pediatric"
  | "obgyn"
  | "behavioral-health"
  | "other-specialty";

export type HospitalUnitMapServiceLineConfig = {
  id: HospitalUnitMapServiceLineId;
  /** Inline emoji shown before the title on the same line. */
  emoji: string;
  titleKey: string;
  primaryUnitTitleKey: string;
  colorToken: HospitalServiceLineColorToken;
  /**
   * API service-line codes aggregated into this map column.
   * REHABILITATION must never appear here.
   */
  sourceServiceLineCodes: readonly HospitalServiceLineCode[];
  /** Prefer this unit code when present in the API tree. */
  preferredUnitCode: string;
  /** Open-board fallback when the preferred unit is not yet configured. */
  fallbackRoute: string;
  /** data-testid suffix (stable for tests). */
  testId: string;
};

/**
 * Required display order (product spec). Do not insert Rehabilitation.
 */
export const HOSPITAL_UNIT_MAP_SERVICE_LINES: readonly HospitalUnitMapServiceLineConfig[] =
  Object.freeze([
    {
      id: "medical-surgical",
      emoji: "🩺",
      titleKey: "hospitalCareD3e6c.map.lines.medicalSurgical",
      primaryUnitTitleKey: "hospitalCareD3e6c.map.units.medicalSurgical",
      colorToken: "service.medical",
      sourceServiceLineCodes: ["MEDICAL_SERVICES", "SURGICAL_SERVICES"],
      preferredUnitCode: "MS",
      fallbackRoute: "/app/hospitalisation/inpatient/medical-services",
      testId: "medical-surgical",
    },
    {
      id: "critical-care",
      emoji: "🫀",
      titleKey: "hospitalCareD3e6c.map.lines.criticalCare",
      primaryUnitTitleKey: "hospitalCareD3e6c.map.units.intensiveCare",
      colorToken: "service.critical",
      sourceServiceLineCodes: ["CRITICAL_CARE"],
      preferredUnitCode: "ICU",
      fallbackRoute: "/app/hospitalisation/inpatient/critical-care",
      testId: "critical-care",
    },
    {
      id: "pediatric",
      emoji: "🧸",
      titleKey: "hospitalCareD3e6c.map.lines.pediatric",
      primaryUnitTitleKey: "hospitalCareD3e6c.map.units.pediatric",
      colorToken: "service.pediatrics",
      sourceServiceLineCodes: ["PEDIATRICS"],
      preferredUnitCode: "PEDS",
      fallbackRoute: "/app/hospitalisation/inpatient/pediatrics",
      testId: "pediatric",
    },
    {
      id: "obgyn",
      emoji: "🤰",
      titleKey: "hospitalCareD3e6c.map.lines.obgyn",
      primaryUnitTitleKey: "hospitalCareD3e6c.map.units.motherBaby",
      colorToken: "service.women",
      sourceServiceLineCodes: ["WOMEN_NEWBORN"],
      preferredUnitCode: "LD",
      fallbackRoute: "/app/hospitalisation/inpatient/women-newborn",
      testId: "obgyn",
    },
    {
      id: "behavioral-health",
      emoji: "🧠",
      titleKey: "hospitalCareD3e6c.map.lines.behavioralHealth",
      primaryUnitTitleKey: "hospitalCareD3e6c.map.units.behavioralHealth",
      colorToken: "service.neuro",
      sourceServiceLineCodes: ["BEHAVIORAL_HEALTH"],
      preferredUnitCode: "BH",
      fallbackRoute: "/app/hospitalisation/inpatient/behavioral-health",
      testId: "behavioral-health",
    },
    {
      id: "other-specialty",
      emoji: "•••",
      titleKey: "hospitalCareD3e6c.map.lines.otherSpecialty",
      primaryUnitTitleKey: "hospitalCareD3e6c.map.units.observation",
      colorToken: "service.other",
      sourceServiceLineCodes: ["OTHER_SPECIALTY", "NEURO_SPECIALTY", "ONCOLOGY_HEMATOLOGY"],
      preferredUnitCode: "OBS",
      fallbackRoute: "/app/hospitalisation/inpatient/other-specialty",
      testId: "other-specialty",
    },
  ]);

export function hospitalUnitMapExcludesRehabilitation(): boolean {
  return HOSPITAL_UNIT_MAP_SERVICE_LINES.every(
    (line) => !line.sourceServiceLineCodes.includes("REHABILITATION")
  );
}
