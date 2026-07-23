/**
 * D3CA — Hospital Care workspace routes.
 * Primary landing remains `/app/hospitalisation` (sidebar + HOSPITAL nav area).
 */

export const HOSPITAL_CARE_HOME = "/app/hospitalisation";
export const HOSPITAL_CARE_PLACEMENT_QUEUE = "/app/hospitalisation/placement-queue";
export const HOSPITAL_CARE_OBSERVATION = "/app/hospitalisation/observation";
export const HOSPITAL_CARE_INPATIENT = "/app/hospitalisation/inpatient";
export const HOSPITAL_CARE_ADMISSIONS = "/app/hospitalisation/admissions";
/** D4A.2.3 — facility-scoped operational admission command center. */
export const HOSPITAL_CARE_ADMISSION_COMMAND_CENTER =
  "/app/hospitalisation/admissions/command-center";
export const HOSPITAL_CARE_BEDS = "/app/hospitalisation/beds";
export const HOSPITAL_CARE_TRANSFERS = "/app/hospitalisation/transfers";
/** Preserved operational floor board (pre-D3CA) — not clinical documentation. */
export const HOSPITAL_CARE_FLOOR_BOARD = "/app/hospitalisation/floor-board";
/** D4A.2.7 — Enterprise Clinical Command Layer (hospital operations platform). */
export const HOSPITAL_CARE_ENTERPRISE_COMMAND = "/app/hospitalisation/enterprise-command";
/** D4A.2.7A — Enterprise Operations Platform landing (ED vs Inpatient separated). */
export const HOSPITAL_CARE_ENTERPRISE_OPERATIONS =
  "/app/hospitalisation/enterprise-operations";
/** D4A.2.7A — Inpatient Operational Dashboard (no ED logic). */
export const HOSPITAL_CARE_INPATIENT_OPERATIONS =
  "/app/hospitalisation/inpatient-operations";
/** Existing ED operational dashboard — do not redesign from hospital-care. */
export const EMERGENCY_DEPARTMENT_OPERATIONAL_DASHBOARD = "/app/trackboard";

/** D4A.2.2 — post-SIGN admission package review (not census / placement board). */
export function hospitalAdmissionReviewPath(encounterId: string): string {
  return `/app/hospitalisation/admissions/review/${encodeURIComponent(encounterId)}`;
}

/** D4A.2.3 — deep-link a signed admission in the command center. */
export function hospitalAdmissionCommandCenterPath(encounterId?: string): string {
  if (!encounterId?.trim()) return HOSPITAL_CARE_ADMISSION_COMMAND_CENTER;
  return `${HOSPITAL_CARE_ADMISSION_COMMAND_CENTER}?encounterId=${encodeURIComponent(encounterId)}`;
}

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
