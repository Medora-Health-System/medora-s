import { listQueueItems } from "./offlineQueue";
import type { OfflineQueueItem } from "./offlineTypes";

/** Lignes encore éligibles au replay / affichage « en attente » — exclut `synced` (succès serveur, nettoyage local). */
function queueRowPendingForUi(item: OfflineQueueItem): boolean {
  return item.status === "pending" || item.status === "failed" || item.status === "syncing";
}

const CREATE_ENCOUNTER_PATH_RE = /^\/patients\/([^/]+)\/encounters(?:\/outpatient)?$/;

function patientIdFromCreateEncounterEndpoint(endpoint: string): string | null {
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

function resolvePatientStub(
  patientId: string | null,
  facilityId: string,
  all: OfflineQueueItem[]
): {
  firstName: string;
  lastName: string;
  dob: string | null;
  sex: string | null;
  sexAtBirth: string | null;
} {
  if (!patientId || !patientId.startsWith("temp-")) {
    return { ...LOCAL_PATIENT_FALLBACK };
  }
  const clientTempIdFromPath = patientId.slice("temp-".length);
  for (const item of all) {
    if (!queueRowPendingForUi(item) || item.type !== "create_patient" || item.facilityId !== facilityId) continue;
    const p = payloadRecord(item);
    const cid = p.clientTempId;
    if (typeof cid !== "string" || cid.trim() !== clientTempIdFromPath) continue;
    const firstName = typeof p.firstName === "string" ? p.firstName : "";
    const lastName = typeof p.lastName === "string" ? p.lastName : "";
    const dateOfBirth = typeof p.dateOfBirth === "string" ? p.dateOfBirth : null;
    const sex = typeof p.sex === "string" ? p.sex : null;
    return {
      firstName: firstName || LOCAL_PATIENT_FALLBACK.firstName,
      lastName: lastName || LOCAL_PATIENT_FALLBACK.lastName,
      dob: dateOfBirth,
      sex,
      sexAtBirth: null,
    };
  }
  return { ...LOCAL_PATIENT_FALLBACK };
}

export async function getPendingCreateEncountersForFacility(facilityId: string): Promise<Record<string, unknown>[]> {
  const all = await listQueueItems();
  const out: Record<string, unknown>[] = [];
  for (const item of all) {
    if (!queueRowPendingForUi(item) || item.type !== "create_encounter" || item.facilityId !== facilityId) continue;
    const patientId = patientIdFromCreateEncounterEndpoint(item.endpoint);
    const payload = payloadRecord(item);
    const roomRaw = payload.roomLabel;
    const visitRaw = payload.visitReason;
    const roomLabel = typeof roomRaw === "string" && roomRaw.trim() ? roomRaw.trim() : null;
    const visitReason = typeof visitRaw === "string" && visitRaw.trim() ? visitRaw.trim() : null;
    out.push({
      id: `local:${item.id}`,
      status: "OPEN",
      createdAt: item.createdAt,
      roomLabel,
      chiefComplaint: visitReason,
      triage: null,
      physicianAssigned: null,
      patient: resolvePatientStub(patientId, facilityId, all),
      pendingSync: true,
    });
  }
  return out;
}

export function mergeEncounters(serverRows: unknown[], pendingRows: unknown[]): unknown[] {
  const server = Array.isArray(serverRows) ? serverRows : [];
  const pending = Array.isArray(pendingRows) ? pendingRows : [];
  return [...server, ...pending];
}
