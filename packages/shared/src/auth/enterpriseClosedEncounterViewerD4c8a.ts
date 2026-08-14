/**
 * MEDUI.D4C.8A — Enterprise Closed Encounter Viewer, Navigation & Reopen Integration.
 *
 * Projections only. Lifecycle mutations remain D4C.7K.
 * Closed state = Encounter.status === "CLOSED" only.
 * Provider documentation SIGNED ≠ encounter CLOSED.
 * dischargedAt ≠ CLOSED.
 */

import { canReopenEncounter } from "./enterpriseEncounterLifecycleAuthorityD4c7k.js";

export const D4C8A_CERTIFICATION_ID = "MEDUI.D4C.8A" as const;

export const EncounterDisplayMode = {
  ACTIVE: "ACTIVE",
  CLOSED_READ_ONLY: "CLOSED_READ_ONLY",
} as const;

export type EncounterDisplayMode =
  (typeof EncounterDisplayMode)[keyof typeof EncounterDisplayMode];

/** Authoritative closed predicate — status only. */
export function isEnterpriseEncounterClosed(status?: string | null): boolean {
  return String(status ?? "").trim().toUpperCase() === "CLOSED";
}

/**
 * True when the encounter should render the enterprise CLOSED_READ_ONLY shell.
 * CANCELLED is not CLOSED for ambulatory/generic shells (ED archive may handle CANCELLED separately).
 */
export function resolveEnterpriseEncounterDisplayMode(
  status?: string | null
): EncounterDisplayMode {
  return isEnterpriseEncounterClosed(status)
    ? EncounterDisplayMode.CLOSED_READ_ONLY
    : EncounterDisplayMode.ACTIVE;
}

/** Canonical encounter record route for OPEN and CLOSED. */
export function enterpriseEncounterRecordPath(
  encounterId: string,
  options?: { viewRecord?: boolean }
): string {
  const id = encodeURIComponent(String(encounterId ?? "").trim());
  const base = `/app/encounters/${id}`;
  if (options?.viewRecord) return `${base}?view=record`;
  return base;
}

export type EnterpriseEncounterListLifecycleInput = {
  id: string;
  status?: string | null;
  closedAt?: string | null;
  /** Ignored — must never imply CLOSED. */
  dischargedAt?: string | null;
  /** Ignored — document signature is not encounter closure. */
  providerDocumentationStatus?: string | null;
};

export type EnterpriseEncounterListLifecycleProjection = {
  isClosed: boolean;
  closedAt: string | null;
  href: string;
  displayMode: EncounterDisplayMode;
};

/** List-row lock + href projection (generalizes D4C.8.1). */
export function projectEnterpriseEncounterListLifecycle(
  encounter: EnterpriseEncounterListLifecycleInput
): EnterpriseEncounterListLifecycleProjection {
  const isClosed = isEnterpriseEncounterClosed(encounter.status);
  return {
    isClosed,
    closedAt: isClosed && encounter.closedAt ? encounter.closedAt : null,
    href: enterpriseEncounterRecordPath(encounter.id),
    displayMode: resolveEnterpriseEncounterDisplayMode(encounter.status),
  };
}

/** Reopen affordance on closed shell — delegates to D4C.7K. */
export function shouldShowEnterpriseReopenAction(input: {
  status?: string | null;
  roleCodes?: readonly string[] | null;
}): boolean {
  return isEnterpriseEncounterClosed(input.status) && canReopenEncounter(input.roleCodes);
}

export const D4C8A_LIFECYCLE_TRANSITION_LABEL_KEYS = {
  ENCOUNTER_OPENED: "enterpriseClosedEncounterD4c8a.lifecycle.opened",
  ENCOUNTER_CLOSED: "enterpriseClosedEncounterD4c8a.lifecycle.closed",
  ENCOUNTER_REOPENED: "enterpriseClosedEncounterD4c8a.lifecycle.reopened",
  ENCOUNTER_CLOSED_AGAIN: "enterpriseClosedEncounterD4c8a.lifecycle.closedAgain",
  ENCOUNTER_CANCELLED: "enterpriseClosedEncounterD4c8a.lifecycle.cancelled",
} as const;

export function lifecycleTransitionLabelKey(transitionType: string | null | undefined): string {
  const key = String(transitionType ?? "").trim().toUpperCase();
  if (key in D4C8A_LIFECYCLE_TRANSITION_LABEL_KEYS) {
    return D4C8A_LIFECYCLE_TRANSITION_LABEL_KEYS[key as keyof typeof D4C8A_LIFECYCLE_TRANSITION_LABEL_KEYS];
  }
  return "enterpriseClosedEncounterD4c8a.lifecycle.unknown";
}
