/**
 * D3C — safe placement request projection (no clinical narrative dumps to logs).
 */

import {
  InternalPlacementStatus,
  projectInternalPlacementTrackboardLabel,
  ReceivingEncounterLifecycle,
  type InternalPlacementRequestedEncounterType,
} from "./internalPlacementStatusMachine.js";

export type InternalPlacementStateProjection = {
  id: string;
  facilityId: string;
  patientId: string;
  hospitalEpisodeId: string | null;
  originatingEncounterId: string;
  receivingEncounterId: string | null;
  receivingEncounterLifecycle: string;
  requestedEncounterType: InternalPlacementRequestedEncounterType | string;
  requestedLevelOfCare: string | null;
  requestedService: string | null;
  status: string;
  clinicalPriority: string | null;
  admissionDiagnosisSummary: string | null;
  reasonForPlacement: string | null;
  isolationType: string | null;
  acceptingProviderNameSnapshot: string | null;
  telemetryRequired: boolean;
  isolationRequired: boolean;
  assignedUnitCode: string | null;
  assignedRoomKey: string | null;
  assignedBedKey: string | null;
  readyForTransferAt: string | null;
  departedEdAt: string | null;
  arrivedDestinationAt: string | null;
  version: number;
  revision: number;
  trackboardLabel: string | null;
  /** Explicit: ED roomLabel is not bed assignment. */
  bedAssignedImpliesEdRoomLabel: false;
  /** Explicit: handoff alone is not arrival. */
  arrivalImpliesHandoffOnly: false;
};

export type InternalPlacementRowForProjection = {
  id: string;
  facilityId: string;
  patientId: string;
  hospitalEpisodeId: string | null;
  originatingEncounterId: string;
  receivingEncounterId: string | null;
  receivingEncounterLifecycle: string;
  requestedEncounterType: string;
  requestedLevelOfCare: string | null;
  requestedService: string | null;
  status: string;
  clinicalPriority: string | null;
  admissionDiagnosisSummary?: string | null;
  reasonForPlacement?: string | null;
  isolationType?: string | null;
  acceptingProviderNameSnapshot?: string | null;
  telemetryRequired: boolean;
  isolationRequired: boolean;
  assignedUnitCode: string | null;
  assignedRoomKey: string | null;
  assignedBedKey: string | null;
  readyForTransferAt: Date | string | null;
  departedEdAt: Date | string | null;
  arrivedDestinationAt: Date | string | null;
  version: number;
  revision: number;
};

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function projectInternalPlacementState(
  row: InternalPlacementRowForProjection | null | undefined
): InternalPlacementStateProjection | null {
  if (!row?.id) return null;
  return {
    id: row.id,
    facilityId: row.facilityId,
    patientId: row.patientId,
    hospitalEpisodeId: row.hospitalEpisodeId,
    originatingEncounterId: row.originatingEncounterId,
    receivingEncounterId: row.receivingEncounterId,
    receivingEncounterLifecycle: row.receivingEncounterLifecycle || ReceivingEncounterLifecycle.NONE,
    requestedEncounterType: row.requestedEncounterType,
    requestedLevelOfCare: row.requestedLevelOfCare,
    requestedService: row.requestedService,
    status: row.status,
    clinicalPriority: row.clinicalPriority,
    admissionDiagnosisSummary: row.admissionDiagnosisSummary ?? null,
    reasonForPlacement: row.reasonForPlacement ?? null,
    isolationType: row.isolationType ?? null,
    acceptingProviderNameSnapshot: row.acceptingProviderNameSnapshot ?? null,
    telemetryRequired: Boolean(row.telemetryRequired),
    isolationRequired: Boolean(row.isolationRequired),
    assignedUnitCode: row.assignedUnitCode,
    assignedRoomKey: row.assignedRoomKey,
    assignedBedKey: row.assignedBedKey,
    readyForTransferAt: toIso(row.readyForTransferAt),
    departedEdAt: toIso(row.departedEdAt),
    arrivedDestinationAt: toIso(row.arrivedDestinationAt),
    version: typeof row.version === "number" ? row.version : 1,
    revision: typeof row.revision === "number" ? row.revision : 1,
    trackboardLabel: projectInternalPlacementTrackboardLabel(row.status),
    bedAssignedImpliesEdRoomLabel: false,
    arrivalImpliesHandoffOnly: false,
  };
}

export type LegacyAdmissionCompatibilityClass =
  | "LEGACY_ADMISSION"
  | "LEGACY_OBSERVATION"
  | "LEGACY_TYPE_PROMOTION"
  | "LEGACY_CANCEL_CONFLICT"
  | "STRUCTURED_D3C";

/**
 * Read-compatible classification for pre-D3C records. Does not rewrite data.
 */
export function classifyLegacyAdmissionCompatibility(input: {
  encounterType?: string | null;
  admissionSummaryJson?: unknown;
  admissionCleared?: boolean;
  hasActivePlacementRequest?: boolean;
  careLevel?: string | null;
}): LegacyAdmissionCompatibilityClass {
  if (input.hasActivePlacementRequest) return "STRUCTURED_D3C";
  const type = (input.encounterType ?? "").toUpperCase();
  const care =
    input.careLevel ??
    (input.admissionSummaryJson &&
    typeof input.admissionSummaryJson === "object" &&
    !Array.isArray(input.admissionSummaryJson)
      ? String((input.admissionSummaryJson as Record<string, unknown>).careLevel ?? "")
      : "");
  if (input.admissionCleared && type === "INPATIENT") return "LEGACY_CANCEL_CONFLICT";
  if (type === "INPATIENT" && /obs/i.test(care)) return "LEGACY_OBSERVATION";
  if (type === "INPATIENT") return "LEGACY_TYPE_PROMOTION";
  if (input.admissionSummaryJson) return "LEGACY_ADMISSION";
  return "LEGACY_ADMISSION";
}

export function isPlacementStatusBedAssigned(status: string): boolean {
  return status === InternalPlacementStatus.BED_ASSIGNED ||
    status === InternalPlacementStatus.READY_FOR_TRANSFER ||
    status === InternalPlacementStatus.DEPARTED_ED ||
    status === InternalPlacementStatus.ARRIVED_DESTINATION ||
    status === InternalPlacementStatus.COMPLETED;
}

export function isPlacementStatusArrived(status: string): boolean {
  return (
    status === InternalPlacementStatus.ARRIVED_DESTINATION ||
    status === InternalPlacementStatus.COMPLETED
  );
}
