import { listQueueItems } from "./offlineQueue";
import type { OfflineQueueItem } from "./offlineTypes";

export function isLocalEncounterId(id: string): boolean {
  return id.startsWith("local:");
}

function queueRowPendingForUi(item: OfflineQueueItem): boolean {
  return item.status === "pending" || item.status === "failed" || item.status === "syncing";
}

const CREATE_ENCOUNTER_PATH_RE = /^\/patients\/([^/]+)\/encounters(?:\/outpatient)?$/;

function patientSegmentFromCreateEncounterEndpoint(endpoint: string): string | null {
  const m = endpoint.match(CREATE_ENCOUNTER_PATH_RE);
  return m ? m[1] : null;
}

function payloadRecord(q: OfflineQueueItem): Record<string, unknown> {
  return q.payload && typeof q.payload === "object" && !Array.isArray(q.payload)
    ? (q.payload as Record<string, unknown>)
    : {};
}

const LOCAL_PATIENT_FALLBACK = {
  firstName: "Patient",
  lastName: "local",
  dob: null as string | null,
  sex: null as string | null,
  sexAtBirth: null as string | null,
};

function resolvePatientForLocalEncounter(
  patientSegment: string | null,
  facilityId: string,
  all: OfflineQueueItem[]
): { id: string; mrn: string | null; firstName: string; lastName: string; dob: string | null; sex?: string | null; sexAtBirth?: string | null } {
  if (!patientSegment || !patientSegment.startsWith("temp-")) {
    return {
      id: "local-unknown",
      mrn: null,
      ...LOCAL_PATIENT_FALLBACK,
    };
  }
  const clientTempIdFromPath = patientSegment.slice("temp-".length);
  for (const item of all) {
    if (!queueRowPendingForUi(item) || item.type !== "create_patient" || item.facilityId !== facilityId) continue;
    const p = payloadRecord(item);
    const cid = p.clientTempId;
    if (typeof cid !== "string" || cid.trim() !== clientTempIdFromPath) continue;
    const firstName = typeof p.firstName === "string" ? p.firstName.trim() : "";
    const lastName = typeof p.lastName === "string" ? p.lastName.trim() : "";
    const dateOfBirth = typeof p.dateOfBirth === "string" ? p.dateOfBirth : null;
    const sex = typeof p.sex === "string" ? p.sex : undefined;
    return {
      id: patientSegment,
      mrn: null,
      firstName: firstName || LOCAL_PATIENT_FALLBACK.firstName,
      lastName: lastName || LOCAL_PATIENT_FALLBACK.lastName,
      dob: dateOfBirth,
      sex: sex ?? null,
      sexAtBirth: null,
    };
  }
  return {
    id: patientSegment,
    mrn: null,
    ...LOCAL_PATIENT_FALLBACK,
  };
}

/**
 * Rebuilds a minimal encounter object from the offline queue (`create_encounter` row).
 * `encounterId` must be `local:${queueItem.id}` as produced by pending trackboard merge.
 */
export async function getLocalEncounterFromQueue(
  encounterId: string,
  facilityId: string
): Promise<Record<string, unknown> | null> {
  if (!isLocalEncounterId(encounterId)) return null;
  const queueItemId = encounterId.slice("local:".length);
  if (!queueItemId) return null;

  const all = await listQueueItems();
  const item = all.find((i) => i.id === queueItemId && i.type === "create_encounter" && i.facilityId === facilityId);
  if (!item || !queueRowPendingForUi(item)) return null;

  const payload = payloadRecord(item);
  const patientSegment = patientSegmentFromCreateEncounterEndpoint(item.endpoint);
  const patient = resolvePatientForLocalEncounter(patientSegment, facilityId, all);

  const roomRaw = payload.roomLabel;
  const visitRaw = payload.visitReason;
  const roomLabel = typeof roomRaw === "string" && roomRaw.trim() ? roomRaw.trim() : null;
  const visitReason = typeof visitRaw === "string" && visitRaw.trim() ? visitRaw.trim() : null;
  const encType = typeof payload.type === "string" ? payload.type : "OUTPATIENT";

  return {
    id: encounterId,
    status: "OPEN",
    createdAt: item.createdAt,
    type: encType,
    roomLabel,
    chiefComplaint: visitReason,
    patient,
    pendingSync: true,
  };
}
