/**
 * D3E / D4A.2.7B — Inpatient clinical workspace routes and browser flags.
 *
 * Browser flags must use static `process.env.NEXT_PUBLIC_*` references so Next.js
 * inlines them at build time. Server-side `INPATIENT_*` controls remain authoritative.
 */

import { isTruthyNextPublicFlag } from "@/lib/nextPublicFlag";
import {
  resolveHospitalChartPathKind,
  type InpatientWorkspaceRole,
} from "@medora/shared";
import { emergencyActiveWorkspacePath } from "@/features/emergency/emergencyRoutes";
import { observationActiveWorkspacePath } from "@/features/observation-workspace/observationWorkspacePaths";

export const INPATIENT_CENSUS_PATH = "/app/hospitalisation/inpatient";

export function inpatientActiveWorkspacePath(encounterId: string): string {
  return `/app/hospitalisation/inpatient/active/${encodeURIComponent(encounterId)}`;
}

export function inpatientProviderWorkspacePath(encounterId: string): string {
  return `/app/hospitalisation/inpatient/active/${encodeURIComponent(encounterId)}/provider`;
}

export function inpatientNursingWorkspacePath(encounterId: string): string {
  return `/app/hospitalisation/inpatient/active/${encodeURIComponent(encounterId)}/nursing`;
}

export function inpatientTechnicianWorkspacePath(encounterId: string): string {
  return `/app/hospitalisation/inpatient/active/${encodeURIComponent(encounterId)}/technician`;
}

export function inpatientSharedChartPath(encounterId: string): string {
  return `/app/hospitalisation/inpatient/active/${encodeURIComponent(encounterId)}/chart`;
}

export function inpatientRoleWorkspacePath(
  encounterId: string,
  role: InpatientWorkspaceRole
): string {
  switch (role) {
    case "PROVIDER":
      return inpatientProviderWorkspacePath(encounterId);
    case "NURSING":
      return inpatientNursingWorkspacePath(encounterId);
    case "TECHNICIAN":
      return inpatientTechnicianWorkspacePath(encounterId);
    case "CHART":
    default:
      return inpatientSharedChartPath(encounterId);
  }
}

/** Route bed-board occupants by unit/type — never send ED to Inpatient workspace. */
export function hospitalOccupantChartPath(input: {
  encounterId: string;
  unitCode?: string | null;
  encounterType?: string | null;
}): string {
  const kind = resolveHospitalChartPathKind({
    unitCode: input.unitCode,
    encounterType: input.encounterType,
  });
  if (kind === "EMERGENCY") return emergencyActiveWorkspacePath(input.encounterId);
  if (kind === "OBSERVATION") return observationActiveWorkspacePath(input.encounterId);
  return inpatientActiveWorkspacePath(input.encounterId);
}

export function isInpatientWorkspaceEnabledInBrowser(): boolean {
  return isTruthyNextPublicFlag(process.env.NEXT_PUBLIC_INPATIENT_WORKSPACE_ENABLED);
}

export function isInpatientDepartmentalOrdersEnabledInBrowser(): boolean {
  return isTruthyNextPublicFlag(process.env.NEXT_PUBLIC_INPATIENT_DEPARTMENTAL_ORDERS_ENABLED);
}

export function isInpatientMarEnabledInBrowser(): boolean {
  return isTruthyNextPublicFlag(process.env.NEXT_PUBLIC_INPATIENT_MAR_ENABLED);
}

export function isInpatientDocumentationEnabledInBrowser(): boolean {
  return isTruthyNextPublicFlag(process.env.NEXT_PUBLIC_INPATIENT_DOCUMENTATION_ENABLED);
}

export function isInpatientNursingEnabledInBrowser(): boolean {
  return isTruthyNextPublicFlag(process.env.NEXT_PUBLIC_INPATIENT_NURSING_ENABLED);
}

export function isInpatientConsultsEnabledInBrowser(): boolean {
  return isTruthyNextPublicFlag(process.env.NEXT_PUBLIC_INPATIENT_CONSULTS_ENABLED);
}

export function isInpatientCarePlanEnabledInBrowser(): boolean {
  return isTruthyNextPublicFlag(process.env.NEXT_PUBLIC_INPATIENT_CARE_PLAN_ENABLED);
}

export function isInpatientDischargePlanningEnabledInBrowser(): boolean {
  return isTruthyNextPublicFlag(process.env.NEXT_PUBLIC_INPATIENT_DISCHARGE_PLANNING_ENABLED);
}
