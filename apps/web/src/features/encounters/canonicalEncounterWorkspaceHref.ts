/**
 * ED.HOSP.1G.2 — Map shared workspace kinds to Medora routes.
 * One href builder for landing pages, patient chart, and legacy /app/encounters redirects.
 */

import {
  CanonicalEncounterWorkspaceKind,
  resolveCanonicalEncounterWorkspace,
  workspaceRoleFromRoleCodes,
  type CanonicalEncounterWorkspaceInput,
  type CanonicalEncounterWorkspaceKind as WorkspaceKind,
  type CanonicalEncounterWorkspaceResult,
} from "@medora/shared";
import {
  emergencyActiveWorkspacePath,
  emergencyChartPath,
  genericEncounterPath,
} from "@/features/emergency/emergencyRoutes";
import {
  parseErWorkspaceSection,
  type ErWorkspaceSection,
} from "@/features/emergency/erWorkspaceSections";
import {
  observationActiveWorkspacePath,
  observationNursingWorkspacePath,
  observationProviderWorkspacePath,
} from "@/features/observation-workspace/observationWorkspacePaths";
import {
  inpatientActiveWorkspacePath,
  inpatientNursingWorkspacePath,
  inpatientProviderWorkspacePath,
} from "@/features/inpatient-workspace/inpatientWorkspacePaths";
import { hospitalPlacementWorkspacePath } from "@/features/hospital-care/hospitalCarePaths";

export { resolveCanonicalEncounterWorkspace, workspaceRoleFromRoleCodes };

export type CanonicalEncounterHrefInput = CanonicalEncounterWorkspaceInput & {
  /** Encounter tab from legacy URLs (`tab=mar`) or ED section. */
  tab?: string | null;
};

function withEdSection(encounterId: string, tab?: string | null): string {
  const section = parseErWorkspaceSection(tab) ?? (tab === "mar" ? "mar" : null);
  if (section) return emergencyActiveWorkspacePath(encounterId, { section: section as ErWorkspaceSection });
  return emergencyActiveWorkspacePath(encounterId);
}

function genericWithTab(encounterId: string, tab?: string | null): string {
  const base = genericEncounterPath(encounterId);
  const t = String(tab ?? "").trim();
  if (!t) return base;
  return `${base}?tab=${encodeURIComponent(t)}`;
}

export function canonicalEncounterWorkspaceHrefFromResult(
  result: CanonicalEncounterWorkspaceResult,
  options?: { tab?: string | null }
): string {
  const id = result.encounterId;
  const tab = options?.tab;
  switch (result.kind) {
    case CanonicalEncounterWorkspaceKind.PLACEMENT:
      return hospitalPlacementWorkspacePath(result.placementId || id);
    case CanonicalEncounterWorkspaceKind.ED_ACTIVE:
      return withEdSection(id, tab);
    case CanonicalEncounterWorkspaceKind.ED_CHART:
      return emergencyChartPath(id);
    case CanonicalEncounterWorkspaceKind.OBSERVATION_PROVIDER:
      return observationProviderWorkspacePath(id);
    case CanonicalEncounterWorkspaceKind.OBSERVATION_NURSING:
      return observationNursingWorkspacePath(id);
    case CanonicalEncounterWorkspaceKind.OBSERVATION_ACTIVE:
      return observationActiveWorkspacePath(id);
    case CanonicalEncounterWorkspaceKind.INPATIENT_PROVIDER:
      return inpatientProviderWorkspacePath(id);
    case CanonicalEncounterWorkspaceKind.INPATIENT_NURSING:
      return inpatientNursingWorkspacePath(id);
    case CanonicalEncounterWorkspaceKind.INPATIENT_ACTIVE:
      return inpatientActiveWorkspacePath(id);
    case CanonicalEncounterWorkspaceKind.CLOSED_RECORD:
    case CanonicalEncounterWorkspaceKind.GENERIC:
    default:
      return genericWithTab(id, tab);
  }
}

export function canonicalEncounterWorkspaceHref(input: CanonicalEncounterHrefInput): string {
  const result = resolveCanonicalEncounterWorkspace(input);
  return canonicalEncounterWorkspaceHrefFromResult(result, { tab: input.tab });
}

export function legacyGenericEncounterRedirectHref(input: CanonicalEncounterHrefInput): string | null {
  const result = resolveCanonicalEncounterWorkspace({ ...input, source: input.source ?? "LEGACY_URL" });
  if (!result.redirectFromLegacy) return null;
  const href = canonicalEncounterWorkspaceHrefFromResult(result, { tab: input.tab });
  const generic = genericEncounterPath(result.encounterId);
  if (href === generic || href.startsWith(`${generic}?`)) return null;
  return href;
}

export type WorkspaceKindName = WorkspaceKind;
