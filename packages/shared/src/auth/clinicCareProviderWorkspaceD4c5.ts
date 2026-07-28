/**
 * MEDUI.D4C.5 — Ambulatory provider workspace projection helpers.
 * Presentation / routing contracts only — no ClinicPatientChart / ClinicHpi /
 * ClinicROS / ClinicPhysicalExam / parallel signing engines.
 */

import {
  isClinicCareAmbulatoryEncounterType,
  type ClinicCareStageId,
} from "./clinicCareTrackboardProjectionD4c2.js";

export const CLINIC_CARE_PROVIDER_WORKSPACE_CERTIFICATION_ID =
  "MEDUI.D4C.5" as const;

/** Provider worklist group buckets (canonical clinic stages). */
export const CLINIC_CARE_PROVIDER_QUEUE_GROUPS = [
  "IN_PROGRESS",
  "RESULTS_PENDING",
  "DISCHARGE_PENDING",
] as const;

export type ClinicCareProviderQueueGroup = (typeof CLINIC_CARE_PROVIDER_QUEUE_GROUPS)[number];

/**
 * Generic encounter chart tabs kept for ambulatory provider documentation-first layout.
 * ED-heavy / observation-only tabs are omitted (MAR, observation summary, pathways).
 */
export const CLINIC_CARE_AMBULATORY_PROVIDER_TAB_IDS = [
  "summary",
  "triage",
  "nursing",
  "clinic",
  "diagnostics",
  "orders",
  "results",
  "notes",
  "history",
  "command_timeline",
] as const;

export type ClinicCareAmbulatoryProviderTabId =
  (typeof CLINIC_CARE_AMBULATORY_PROVIDER_TAB_IDS)[number];

/** Query flag that thin ambulatory adapters honor on the enterprise encounter chart. */
export const CLINIC_CARE_AMBULATORY_WORKSPACE_QUERY = "ambulatory" as const;

/**
 * Resolve provider-documentation encounter mode for ambulatory vs ED / observation.
 * Durable document type remains INITIAL_PROVIDER_NOTE (no new Prisma document enum).
 */
export function resolveClinicCareProviderDocumentationMode(input: {
  encounterType?: string | null;
  observationWorkflowActive?: boolean;
}): "AMBULATORY" | "ED" | "OBSERVATION" {
  if (input.observationWorkflowActive) return "OBSERVATION";
  if (isClinicCareAmbulatoryEncounterType(input.encounterType)) return "AMBULATORY";
  return "ED";
}

/** Map clinic stage → provider worklist group (null = not in provider queue). */
export function projectClinicCareProviderQueueGroup(
  stageId: ClinicCareStageId | string | null | undefined
): ClinicCareProviderQueueGroup | null {
  const s = String(stageId ?? "")
    .trim()
    .toUpperCase();
  if (s === "IN_PROGRESS") return "IN_PROGRESS";
  if (s === "RESULTS_PENDING") return "RESULTS_PENDING";
  if (s === "DISCHARGE_PENDING") return "DISCHARGE_PENDING";
  return null;
}

/** Sort groups for display: ready evaluation → results → discharge. */
export function sortClinicCareProviderQueueGroups(
  groups: readonly ClinicCareProviderQueueGroup[]
): ClinicCareProviderQueueGroup[] {
  const order: Record<ClinicCareProviderQueueGroup, number> = {
    IN_PROGRESS: 0,
    RESULTS_PENDING: 1,
    DISCHARGE_PENDING: 2,
  };
  return [...groups].sort((a, b) => order[a] - order[b]);
}

/**
 * Enterprise encounter chart path with ambulatory documentation-first hints.
 * Does not fork a ClinicPatientChart route.
 */
export function clinicCareAmbulatoryProviderChartPath(encounterId: string): string {
  const id = encodeURIComponent(encounterId);
  return `/app/encounters/${id}?tab=clinic&workspace=${CLINIC_CARE_AMBULATORY_WORKSPACE_QUERY}`;
}

/**
 * Patient longitudinal chart — enterprise patient engine only.
 */
export function clinicCareAmbulatoryPatientChartPath(patientId: string): string {
  return `/app/patients/${encodeURIComponent(patientId)}`;
}

/** Whether a generic encounter tab id is shown in ambulatory provider adapter mode. */
export function isClinicCareAmbulatoryProviderTabVisible(tabId: string): boolean {
  return (CLINIC_CARE_AMBULATORY_PROVIDER_TAB_IDS as readonly string[]).includes(tabId);
}

/** Client filter: keep ambulatory encounter types (enterprise list authority). */
export function filterAmbulatoryEncounterRows<T extends { type?: string | null }>(
  rows: readonly T[]
): T[] {
  return rows.filter((r) => isClinicCareAmbulatoryEncounterType(r.type));
}

/**
 * Provider-doc write authority for ambulatory — mirrors D4C.1 PROVIDER/ADMIN only.
 * Used by chart adapters so RN/MA/Front Desk cannot escalate via URL.
 */
export function canAuthorAmbulatoryProviderDocumentation(roleCodes: readonly string[]): boolean {
  return roleCodes.includes("PROVIDER") || roleCodes.includes("ADMIN");
}
