import { apiFetch } from "@/lib/apiClient";
import type { MedicationPassQueueBucket } from "@medora/shared";

export type MedicationPassQueueHighAlertSummary = {
  isHighAlert?: boolean | null;
  highAlertClass?: string | null;
  requiresDoubleSign?: boolean | null;
  requiresWitness?: boolean | null;
  isControlled?: boolean | null;
};

export type MedicationPassQueueDoseSnapshot = {
  doseValue: string | null;
  doseUnit: string | null;
  route: string | null;
  quantity: string | null;
  quantityUnit: string | null;
  medicationLabel: string | null;
  snapshottedAt: string;
};

export type MedicationPassQueueItem = {
  medicationDoseInstanceId: string;
  orderItemId: string;
  orderId: string;
  encounterId: string;
  patientId: string;
  patientFirstName: string | null;
  patientLastName: string | null;
  patientMrn: string | null;
  roomLabel: string | null;
  bedLabel: null;
  medicationLabel: string | null;
  scheduledAt: string;
  dueWindowStartAt: string;
  dueWindowEndAt: string;
  doseStatus: string;
  queueBucket: MedicationPassQueueBucket;
  route: string | null;
  doseSnapshot: MedicationPassQueueDoseSnapshot | null;
  highAlertSummary: MedicationPassQueueHighAlertSummary | null;
  responseDueAt: string | null;
  nurseAssignedUserId: string | null;
};

export type MedicationPassQueueResponse = {
  enabled: boolean;
  at: string;
  count: number;
  items: MedicationPassQueueItem[];
};

export type FetchMedicationPassQueueQuery = {
  encounterId?: string;
  assignedToUserId?: string;
  shiftStart?: string;
  shiftEnd?: string;
  bucket?: MedicationPassQueueBucket;
  includeUpcoming?: boolean;
};

function buildPassQueueSearchParams(query: FetchMedicationPassQueueQuery): string {
  const params = new URLSearchParams();
  if (query.encounterId?.trim()) params.set("encounterId", query.encounterId.trim());
  if (query.assignedToUserId?.trim()) params.set("assignedToUserId", query.assignedToUserId.trim());
  if (query.shiftStart?.trim()) params.set("shiftStart", query.shiftStart.trim());
  if (query.shiftEnd?.trim()) params.set("shiftEnd", query.shiftEnd.trim());
  if (query.bucket) params.set("bucket", query.bucket);
  if (query.includeUpcoming === true) params.set("includeUpcoming", "true");
  if (query.includeUpcoming === false) params.set("includeUpcoming", "false");
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** GET /facilities/:facilityId/medication-pass-queue (M1.8B.7I.4). */
export async function fetchMedicationPassQueue(
  facilityId: string,
  query: FetchMedicationPassQueueQuery = {}
): Promise<MedicationPassQueueResponse> {
  try {
    const res = await apiFetch(
      `/facilities/${encodeURIComponent(facilityId)}/medication-pass-queue${buildPassQueueSearchParams(query)}`,
      { facilityId }
    );
    if (!res || typeof res !== "object" || Array.isArray(res)) {
      return { enabled: false, at: new Date().toISOString(), count: 0, items: [] };
    }
    const row = res as Partial<MedicationPassQueueResponse>;
    return {
      enabled: row.enabled === true,
      at: typeof row.at === "string" ? row.at : new Date().toISOString(),
      count: typeof row.count === "number" ? row.count : 0,
      items: Array.isArray(row.items) ? (row.items as MedicationPassQueueItem[]) : [],
    };
  } catch {
    return { enabled: false, at: new Date().toISOString(), count: 0, items: [] };
  }
}
