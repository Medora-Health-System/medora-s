import { listQueueItems } from "./offlineQueue";
import type { OfflineQueueItem } from "./offlineTypes";

/** Lignes encore éligibles au replay / affichage « en attente » — exclut `synced` (succès serveur, nettoyage local). */
function queueRowPendingForUi(item: OfflineQueueItem): boolean {
  return item.status === "pending" || item.status === "failed" || item.status === "syncing";
}

function payloadRecord(q: OfflineQueueItem): Record<string, unknown> {
  return q.payload && typeof q.payload === "object" && !Array.isArray(q.payload)
    ? (q.payload as Record<string, unknown>)
    : {};
}

/** Shape compatible with `/app/patients` list rows. */
export type PendingPatientListRow = {
  id: string;
  mrn: string | null;
  firstName: string;
  lastName: string;
  dob: string | null;
  sexAtBirth?: string | null;
  sex?: string | null;
  phone: string | null;
  nationalId?: string | null;
  pendingSync: true;
};

export async function getPendingCreatePatientsForFacility(facilityId: string): Promise<PendingPatientListRow[]> {
  const all = await listQueueItems();
  const out: PendingPatientListRow[] = [];
  for (const item of all) {
    if (!queueRowPendingForUi(item) || item.type !== "create_patient" || item.facilityId !== facilityId) continue;
    const p = payloadRecord(item);
    const clientTempId = p.clientTempId;
    const id =
      typeof clientTempId === "string" && clientTempId.trim()
        ? `temp-${clientTempId.trim()}`
        : `local:${item.id}`;
    const fn = typeof p.firstName === "string" ? p.firstName.trim() : "";
    const ln = typeof p.lastName === "string" ? p.lastName.trim() : "";
    const dateOfBirth = typeof p.dateOfBirth === "string" ? p.dateOfBirth : null;
    const sex = typeof p.sex === "string" ? p.sex : undefined;
    const phoneRaw = p.phone;
    const phone =
      typeof phoneRaw === "string" && phoneRaw.trim() ? phoneRaw.trim() : null;
    const nidRaw = p.nationalId;
    const nationalId =
      typeof nidRaw === "string" && nidRaw.trim() ? nidRaw.trim() : undefined;
    out.push({
      id,
      mrn: null,
      firstName: fn || "Patient",
      lastName: ln || "local",
      dob: dateOfBirth,
      sex,
      phone,
      nationalId,
      pendingSync: true,
    });
  }
  return out;
}

export function mergePatients<T extends { id: string }>(serverRows: T[], pendingRows: T[]): T[] {
  const server = Array.isArray(serverRows) ? serverRows : [];
  const pending = Array.isArray(pendingRows) ? pendingRows : [];
  const seen = new Set<string>();
  for (const s of server) {
    if (s?.id != null) seen.add(String(s.id));
  }
  const out: T[] = [...server];
  for (const p of pending) {
    if (p?.id == null) continue;
    const sid = String(p.id);
    if (!seen.has(sid)) {
      seen.add(sid);
      out.push(p);
    }
  }
  return out;
}
