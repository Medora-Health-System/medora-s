/**
 * INP.DIS.1H — session-scoped discharge-order popup deduplication.
 * No durable ED ack engine exists; sessionStorage avoids repeat toasts on poll.
 * Popup dismiss ≠ discharge completion; board badges remain until encounter close.
 */

const STORAGE_PREFIX = "medora.inp.dis.1h.ack:";

/** In-memory fallback when sessionStorage is unavailable (SSR / private mode / tests). */
const memoryAck = new Set<string>();

export function inpatientDischargeOrderNotifyKey(
  encounterId: string,
  providerFinalizedAt: string | null | undefined
): string {
  const at = (providerFinalizedAt ?? "").trim() || "unknown";
  return `${STORAGE_PREFIX}${encounterId.trim()}:${at}`;
}

function readAck(key: string): boolean {
  if (memoryAck.has(key)) return true;
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch {
    return memoryAck.has(key);
  }
}

function writeAck(key: string): void {
  memoryAck.add(key);
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    /* ignore quota / private mode — memoryAck still holds */
  }
}

export function wasInpatientDischargeOrderNotified(key: string): boolean {
  return readAck(key);
}

export function markInpatientDischargeOrderNotified(key: string): void {
  writeAck(key);
}

/** Test helper — clears in-memory acks (sessionStorage cleared by test harness). */
export function clearInpatientDischargeOrderNotifyMemory(): void {
  memoryAck.clear();
}

export type InpatientDischargeOrderNotifyCandidate = {
  encounterId: string;
  patientName: string;
  unitRoomBed: string | null;
  attendingName?: string | null;
  dischargeAwareness?: {
    providerFinalized?: boolean;
    providerFinalizedAt?: string | null;
    dispositionCode?: string | null;
    destinationName?: string | null;
    tone?: string | null;
  } | null;
  nurseUserId?: string | null;
  technicianUserId?: string | null;
  providerUserId?: string | null;
};

/**
 * Recipients: assigned RN / PCT for the encounter, or hospital operational roles
 * viewing the board (caller filters to visible census rows). Facility-scoped via census.
 */
export function selectInpatientDischargeOrderNotifyCandidates(
  rows: InpatientDischargeOrderNotifyCandidate[],
  ctx: { currentUserId: string | null | undefined; roles: string[] }
): InpatientDischargeOrderNotifyCandidate[] {
  const uid = (ctx.currentUserId ?? "").trim();
  const roles = ctx.roles ?? [];
  const isOps =
    roles.includes("RN") ||
    roles.includes("TECH") ||
    roles.includes("PCT") ||
    roles.includes("PROVIDER") ||
    roles.includes("ADMIN");
  if (!isOps) return [];

  return rows.filter((row) => {
    if (!row.dischargeAwareness?.providerFinalized) return false;
    if (!uid) return true;
    const assigned =
      row.nurseUserId === uid ||
      row.technicianUserId === uid ||
      row.providerUserId === uid;
    if (assigned) return true;
    if (
      roles.includes("ADMIN") ||
      roles.includes("RN") ||
      roles.includes("TECH") ||
      roles.includes("PCT")
    ) {
      return true;
    }
    return false;
  });
}

export function nextUnackedInpatientDischargeOrder(
  rows: InpatientDischargeOrderNotifyCandidate[],
  ctx: { currentUserId: string | null | undefined; roles: string[] }
): InpatientDischargeOrderNotifyCandidate | null {
  const candidates = selectInpatientDischargeOrderNotifyCandidates(rows, ctx);
  for (const row of candidates) {
    const key = inpatientDischargeOrderNotifyKey(
      row.encounterId,
      row.dischargeAwareness?.providerFinalizedAt
    );
    if (!wasInpatientDischargeOrderNotified(key)) return row;
  }
  return null;
}
