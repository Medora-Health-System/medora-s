/**
 * D3CA — Hospital Care workspace routes.
 * Primary landing remains `/app/hospitalisation` (sidebar + HOSPITAL nav area).
 */

export const HOSPITAL_CARE_HOME = "/app/hospitalisation";
export const HOSPITAL_CARE_PLACEMENT_QUEUE = "/app/hospitalisation/placement-queue";
export const HOSPITAL_CARE_OBSERVATION = "/app/hospitalisation/observation";
export const HOSPITAL_CARE_INPATIENT = "/app/hospitalisation/inpatient";
export const HOSPITAL_CARE_ADMISSIONS = "/app/hospitalisation/admissions";
export const HOSPITAL_CARE_BEDS = "/app/hospitalisation/beds";
export const HOSPITAL_CARE_TRANSFERS = "/app/hospitalisation/transfers";
/** Preserved operational floor board (pre-D3CA) — not clinical documentation. */
export const HOSPITAL_CARE_FLOOR_BOARD = "/app/hospitalisation/floor-board";

export type HospitalCareSectionId =
  | "home"
  | "placementQueue"
  | "observation"
  | "inpatient"
  | "admissions"
  | "beds"
  | "transfers";

export const HOSPITAL_CARE_SECTIONS: Array<{
  id: HospitalCareSectionId;
  href: string;
  labelKey: string;
}> = [
  { id: "home", href: HOSPITAL_CARE_HOME, labelKey: "hospitalCareD3ca.nav.home" },
  {
    id: "placementQueue",
    href: HOSPITAL_CARE_PLACEMENT_QUEUE,
    labelKey: "hospitalCareD3ca.nav.placementQueue",
  },
  {
    id: "observation",
    href: HOSPITAL_CARE_OBSERVATION,
    labelKey: "hospitalCareD3ca.nav.observation",
  },
  {
    id: "inpatient",
    href: HOSPITAL_CARE_INPATIENT,
    labelKey: "hospitalCareD3ca.nav.inpatient",
  },
  {
    id: "admissions",
    href: HOSPITAL_CARE_ADMISSIONS,
    labelKey: "hospitalCareD3ca.nav.admissions",
  },
  { id: "beds", href: HOSPITAL_CARE_BEDS, labelKey: "hospitalCareD3ca.nav.beds" },
  {
    id: "transfers",
    href: HOSPITAL_CARE_TRANSFERS,
    labelKey: "hospitalCareD3ca.nav.transfers",
  },
];
