/**
 * D4A.3.0 / D4A.3.0-H1 — Hospital My Patients / Incomplete Charts / Unassigned filters.
 */

import {
  filterMyIncompleteChartsEncountersEnterprise,
  filterMyPatientsEncountersEnterprise,
  filterUnassignedHospitalEncountersEnterprise,
  isHospitalPatientCareTechMembership,
  projectHospitalBoardAssignments,
  readHospitalAssignmentBag,
  type EnterpriseHospitalBoardAssignmentRole,
  type EnterpriseMyPatientsFilterContext,
  type HospitalBoardAssignmentProjection,
  type HospitalCensusPatientRow,
} from "@medora/shared";

export type HospitalBoardViewTab =
  | "myPatients"
  | "allPatients"
  | "incompleteCharts"
  | "unassignedPatients";

export const HOSPITAL_BOARD_VIEW_TABS: readonly HospitalBoardViewTab[] = [
  "myPatients",
  "allPatients",
  "incompleteCharts",
  "unassignedPatients",
] as const;

export type HospitalAssignableRow = {
  encounterId?: string;
  id?: string;
  providerUserId?: string | null;
  nurseUserId?: string | null;
  technicianUserId?: string | null;
  coveringProviderUserId?: string | null;
  breakNurseUserId?: string | null;
  chargeNurseUserId?: string | null;
  attendingName?: string | null;
  nurseName?: string | null;
  technicianName?: string | null;
  admissionSummaryJson?: unknown;
  alerts?: Array<{ code: string }>;
};

export function hospitalAssignmentProjectionFromSummary(
  admissionSummaryJson: unknown
): HospitalBoardAssignmentProjection {
  return projectHospitalBoardAssignments(readHospitalAssignmentBag(admissionSummaryJson));
}

/** Prefer census bag fields; fall back to projecting admissionSummaryJson. */
export function resolveHospitalAssignableIds(row: HospitalAssignableRow): {
  providerUserId: string | null;
  nurseUserId: string | null;
  technicianUserId: string | null;
  coveringProviderUserId: string | null;
  providerName: string | null;
  nurseName: string | null;
  technicianName: string | null;
} {
  if (
    row.providerUserId != null ||
    row.nurseUserId != null ||
    row.technicianUserId != null ||
    row.attendingName != null ||
    row.nurseName != null ||
    row.technicianName != null
  ) {
    return {
      providerUserId: row.providerUserId?.trim() || null,
      nurseUserId: row.nurseUserId?.trim() || null,
      technicianUserId: row.technicianUserId?.trim() || null,
      coveringProviderUserId: row.coveringProviderUserId?.trim() || null,
      providerName: row.attendingName?.trim() || null,
      nurseName: row.nurseName?.trim() || null,
      technicianName: row.technicianName?.trim() || null,
    };
  }
  const p = hospitalAssignmentProjectionFromSummary(row.admissionSummaryJson);
  return {
    providerUserId: p.providerUserId,
    nurseUserId: p.nurseUserId,
    technicianUserId: p.technicianUserId,
    coveringProviderUserId: p.coveringProviderUserId,
    providerName: p.providerName,
    nurseName: p.nurseName,
    technicianName: p.technicianName,
  };
}

export function toEnterpriseAssignable(row: HospitalAssignableRow) {
  const ids = resolveHospitalAssignableIds(row);
  return {
    providerUserId: ids.providerUserId,
    nurseUserId: ids.nurseUserId,
    technicianUserId: ids.technicianUserId,
    coveringProviderUserId: ids.coveringProviderUserId ?? row.coveringProviderUserId ?? null,
    breakNurseUserId: row.breakNurseUserId ?? null,
    chargeNurseUserId: row.chargeNurseUserId ?? null,
    alerts: row.alerts,
  };
}

export function resolveHospitalUnassignedBoardRole(
  roles: readonly string[]
): EnterpriseHospitalBoardAssignmentRole {
  const normalized = roles.map((r) => String(r ?? "").trim().toUpperCase());
  const isProvider = normalized.includes("PROVIDER") || normalized.includes("ADMIN");
  const isNurse = normalized.includes("RN") || normalized.includes("ADMIN");
  const isTech =
    isHospitalPatientCareTechMembership(normalized) || normalized.includes("ADMIN");
  if (isNurse && !isProvider) return "NURSE";
  if (isTech && !isProvider && !isNurse) return "TECHNICIAN";
  return "PROVIDER";
}

export function filterHospitalBoardRows<T extends HospitalAssignableRow>(
  rows: readonly T[],
  tab: HospitalBoardViewTab,
  ctx: EnterpriseMyPatientsFilterContext,
  unassignedRole: EnterpriseHospitalBoardAssignmentRole = "PROVIDER"
): T[] {
  if (tab === "allPatients") return [...rows];
  if (tab === "myPatients") {
    return filterMyPatientsEncountersEnterprise(
      rows.map((r) => ({ row: r, ...toEnterpriseAssignable(r) })),
      ctx
    ).map((x) => x.row);
  }
  if (tab === "unassignedPatients") {
    return filterUnassignedHospitalEncountersEnterprise(
      rows.map((r) => ({ row: r, ...toEnterpriseAssignable(r) })),
      unassignedRole
    ).map((x) => x.row);
  }
  // incompleteCharts — authoritative completion resolver (not My Patients alias).
  return filterMyIncompleteChartsEncountersEnterprise(
    rows.map((r) => ({ row: r, ...toEnterpriseAssignable(r) })),
    ctx
  ).map((x) => x.row);
}

export function censusRowToAssignable(row: HospitalCensusPatientRow): HospitalAssignableRow {
  return {
    encounterId: row.encounterId,
    providerUserId: row.providerUserId,
    nurseUserId: row.nurseUserId,
    technicianUserId: row.technicianUserId,
    attendingName: row.attendingName,
    nurseName: row.nurseName,
    technicianName: row.technicianName,
    alerts: row.alerts,
  };
}

/** UI: hospital care-tech assignment actions — PATIENT_CARE_TECH only (not LAB/RAD). */
export function isHospitalCareTechAssigner(roles: readonly string[]): boolean {
  const normalized = roles.map((r) => String(r ?? "").trim().toUpperCase());
  return (
    isHospitalPatientCareTechMembership(normalized) ||
    normalized.includes("ADMIN") ||
    normalized.includes("MEDORA_SUPER_ADMIN")
  );
}
