/**
 * D3D / D3DA — Observation clinical workspace routes and browser flags.
 *
 * Browser flags must use static `process.env.NEXT_PUBLIC_*` references so Next.js
 * inlines them at build time. Server-side observation flags remain authoritative.
 */

import { isTruthyNextPublicFlag } from "@/lib/nextPublicFlag";

export const OBSERVATION_CENSUS_PATH = "/app/hospitalisation/observation";

export function observationActiveWorkspacePath(encounterId: string): string {
  return `/app/hospitalisation/observation/active/${encodeURIComponent(encounterId)}`;
}

export function isObservationWorkspaceEnabledInBrowser(): boolean {
  return isTruthyNextPublicFlag(process.env.NEXT_PUBLIC_OBSERVATION_WORKSPACE_ENABLED);
}

export function isObservationDepartmentalOrdersEnabledInBrowser(): boolean {
  return isTruthyNextPublicFlag(process.env.NEXT_PUBLIC_OBSERVATION_DEPARTMENTAL_ORDERS_ENABLED);
}

export function isObservationMarEnabledInBrowser(): boolean {
  return isTruthyNextPublicFlag(process.env.NEXT_PUBLIC_OBSERVATION_MAR_ENABLED);
}

export function isObservationDocumentationEnabledInBrowser(): boolean {
  return isTruthyNextPublicFlag(process.env.NEXT_PUBLIC_OBSERVATION_DOCUMENTATION_ENABLED);
}
