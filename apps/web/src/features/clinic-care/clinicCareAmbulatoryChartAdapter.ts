/**
 * MEDUI.D4C.5 — Thin ambulatory chart adapter helpers (no ClinicPatientChart fork).
 */

import {
  CLINIC_CARE_AMBULATORY_WORKSPACE_QUERY,
  clinicCareAmbulatoryProviderChartPath,
  isClinicCareAmbulatoryProviderTabVisible,
  resolveClinicCareProviderDocumentationMode,
  type ClinicCareAmbulatoryProviderTabId,
} from "@medora/shared";

export {
  clinicCareAmbulatoryProviderChartPath,
  clinicCareAmbulatoryPatientChartPath,
  isClinicCareAmbulatoryProviderTabVisible,
  resolveClinicCareProviderDocumentationMode,
  CLINIC_CARE_AMBULATORY_WORKSPACE_QUERY,
} from "@medora/shared";

/** Detect ambulatory workspace query on the enterprise encounter chart. */
export function isAmbulatoryWorkspaceQuery(search: string | null | undefined): boolean {
  if (!search) return false;
  try {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    return params.get("workspace") === CLINIC_CARE_AMBULATORY_WORKSPACE_QUERY;
  } catch {
    return false;
  }
}

/**
 * Filter generic encounter tab list for ambulatory documentation-first layout.
 * When not in ambulatory mode, returns tabs unchanged.
 */
export function filterEncounterTabsForAmbulatoryAdapter<T extends { id: string }>(
  tabs: readonly T[],
  ambulatoryMode: boolean
): T[] {
  if (!ambulatoryMode) return [...tabs];
  return tabs.filter((tab) => isClinicCareAmbulatoryProviderTabVisible(tab.id));
}

export function ambulatoryDefaultProviderTab(): ClinicCareAmbulatoryProviderTabId {
  return "clinic";
}

export function resolveAmbulatoryProviderDocumentationMode(input: {
  encounterType?: string | null;
  observationWorkflowActive?: boolean;
}) {
  return resolveClinicCareProviderDocumentationMode(input);
}
