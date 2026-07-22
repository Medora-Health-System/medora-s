/**
 * D3E — Inpatient clinical workspace routes and browser flags.
 *
 * Browser flags must use static `process.env.NEXT_PUBLIC_*` references so Next.js
 * inlines them at build time. Server-side `INPATIENT_*` controls remain authoritative.
 */

import { isTruthyNextPublicFlag } from "@/lib/nextPublicFlag";

export const INPATIENT_CENSUS_PATH = "/app/hospitalisation/inpatient";

export function inpatientActiveWorkspacePath(encounterId: string): string {
  return `/app/hospitalisation/inpatient/active/${encodeURIComponent(encounterId)}`;
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
