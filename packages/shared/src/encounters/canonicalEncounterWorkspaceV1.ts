/**
 * ED.HOSP.1G.2 — Canonical encounter workspace resolver.
 *
 * Operational destinations for OPEN ED / Observation / Inpatient work.
 * Does not create engines. Legal closed records stay on the generic record path.
 */

import { isClinicCareAmbulatoryEncounterType } from "../auth/clinicCareTrackboardProjectionD4c2.js";
import { resolveClinicalEncounterContext } from "./clinicalEncounterIdentity.js";

export const CanonicalEncounterWorkspaceKind = {
  ED_ACTIVE: "ED_ACTIVE",
  ED_CHART: "ED_CHART",
  PLACEMENT: "PLACEMENT",
  OBSERVATION_PROVIDER: "OBSERVATION_PROVIDER",
  OBSERVATION_NURSING: "OBSERVATION_NURSING",
  OBSERVATION_ACTIVE: "OBSERVATION_ACTIVE",
  INPATIENT_PROVIDER: "INPATIENT_PROVIDER",
  INPATIENT_NURSING: "INPATIENT_NURSING",
  INPATIENT_ACTIVE: "INPATIENT_ACTIVE",
  CLOSED_RECORD: "CLOSED_RECORD",
  GENERIC: "GENERIC",
} as const;

export type CanonicalEncounterWorkspaceKind =
  (typeof CanonicalEncounterWorkspaceKind)[keyof typeof CanonicalEncounterWorkspaceKind];

export type CanonicalEncounterWorkspaceRole =
  | "PROVIDER"
  | "RN"
  | "ADMIN"
  | "TECHNICIAN"
  | "OTHER";

export type CanonicalEncounterWorkspaceSource =
  | "PLACEMENT_QUEUE"
  | "LANDING"
  | "PATIENT_CHART"
  | "LEGACY_URL"
  | "BOARD"
  | "MAR";

export type CanonicalEncounterWorkspaceInput = {
  encounterId: string;
  encounterType?: string | null;
  encounterStatus?: string | null;
  billingClassification?: string | null;
  admissionSummaryJson?: unknown;
  requestedEncounterType?: string | null;
  placementId?: string | null;
  placementStatus?: string | null;
  receivingEncounterId?: string | null;
  role?: CanonicalEncounterWorkspaceRole | null;
  source?: CanonicalEncounterWorkspaceSource | null;
  ambulatoryWorkspace?: boolean;
};

export type CanonicalEncounterWorkspaceResult = {
  kind: CanonicalEncounterWorkspaceKind;
  encounterId: string;
  placementId: string | null;
  /** True when /app/encounters/:id should replace() to a modern workspace. */
  redirectFromLegacy: boolean;
};

function trimId(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

export function isEncounterWorkspaceClosedStatus(status?: string | null): boolean {
  const s = String(status ?? "").trim().toUpperCase();
  return s === "CLOSED" || s === "CANCELLED";
}

export function isDentalEncounterType(type?: string | null): boolean {
  return String(type ?? "").trim().toUpperCase() === "DENTAL";
}

export function workspaceRoleFromRoleCodes(
  roleCodes: readonly string[] | null | undefined
): CanonicalEncounterWorkspaceRole {
  const roles = new Set(
    (roleCodes ?? []).map((r) => String(r ?? "").trim().toUpperCase()).filter(Boolean)
  );
  if (roles.has("PROVIDER")) return "PROVIDER";
  if (roles.has("RN")) return "RN";
  if (roles.has("ADMIN")) return "ADMIN";
  if (roles.has("LAB") || roles.has("RADIOLOGY") || roles.has("PATIENT_CARE_TECH")) {
    return "TECHNICIAN";
  }
  return "OTHER";
}

function observationKind(role: CanonicalEncounterWorkspaceRole): CanonicalEncounterWorkspaceKind {
  if (role === "PROVIDER") return CanonicalEncounterWorkspaceKind.OBSERVATION_PROVIDER;
  if (role === "RN") return CanonicalEncounterWorkspaceKind.OBSERVATION_NURSING;
  return CanonicalEncounterWorkspaceKind.OBSERVATION_ACTIVE;
}

function inpatientKind(role: CanonicalEncounterWorkspaceRole): CanonicalEncounterWorkspaceKind {
  if (role === "PROVIDER") return CanonicalEncounterWorkspaceKind.INPATIENT_PROVIDER;
  if (role === "RN") return CanonicalEncounterWorkspaceKind.INPATIENT_NURSING;
  return CanonicalEncounterWorkspaceKind.INPATIENT_ACTIVE;
}

/**
 * Given encounter + placement + role context, pick the canonical operational workspace.
 * Placement Queue clicks use source=PLACEMENT_QUEUE and must open the placement workspace.
 */
export function resolveCanonicalEncounterWorkspace(
  input: CanonicalEncounterWorkspaceInput
): CanonicalEncounterWorkspaceResult {
  const encounterId = trimId(input.encounterId);
  const placementId = trimId(input.placementId) || null;
  const source = input.source ?? "LANDING";
  const role = input.role ?? "OTHER";

  if (source === "PLACEMENT_QUEUE" && placementId) {
    return {
      kind: CanonicalEncounterWorkspaceKind.PLACEMENT,
      encounterId,
      placementId,
      redirectFromLegacy: false,
    };
  }

  if (
    input.ambulatoryWorkspace === true ||
    isClinicCareAmbulatoryEncounterType(input.encounterType) ||
    isDentalEncounterType(input.encounterType)
  ) {
    return {
      kind: CanonicalEncounterWorkspaceKind.GENERIC,
      encounterId,
      placementId,
      redirectFromLegacy: false,
    };
  }

  const type = String(input.encounterType ?? "").trim().toUpperCase();
  const closed = isEncounterWorkspaceClosedStatus(input.encounterStatus);

  if (closed) {
    return {
      kind:
        type === "EMERGENCY"
          ? CanonicalEncounterWorkspaceKind.ED_CHART
          : CanonicalEncounterWorkspaceKind.CLOSED_RECORD,
      encounterId,
      placementId,
      redirectFromLegacy: type === "EMERGENCY",
    };
  }

  if (type === "EMERGENCY") {
    return {
      kind: CanonicalEncounterWorkspaceKind.ED_ACTIVE,
      encounterId,
      placementId,
      redirectFromLegacy: true,
    };
  }

  const context = resolveClinicalEncounterContext({
    type: input.encounterType,
    status: input.encounterStatus,
    billingClassification: input.billingClassification,
    admissionSummaryJson: input.admissionSummaryJson,
    placementRequestedEncounterType: input.requestedEncounterType,
  });

  if (context === "OBSERVATION") {
    return {
      kind: observationKind(role),
      encounterId,
      placementId,
      redirectFromLegacy: true,
    };
  }

  if (context === "INPATIENT") {
    return {
      kind: inpatientKind(role),
      encounterId,
      placementId,
      redirectFromLegacy: true,
    };
  }

  return {
    kind: CanonicalEncounterWorkspaceKind.GENERIC,
    encounterId,
    placementId,
    redirectFromLegacy: false,
  };
}

export function placementWorkspaceMustUsePlacementId(result: CanonicalEncounterWorkspaceResult): boolean {
  return result.kind === CanonicalEncounterWorkspaceKind.PLACEMENT && Boolean(result.placementId);
}
