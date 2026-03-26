import { getOrderItemDisplayLabelFr } from "@/lib/orderItemDisplayFr";
import { getCachedRecord } from "@/lib/offline/offlineCache";
import { listQueueItems } from "./offlineQueue";
import type { OfflineQueueItem } from "./offlineTypes";

function mapPayloadToOrderItems(payload: Record<string, unknown>, queueId: string): unknown[] {
  const raw = payload.items;
  if (!Array.isArray(raw)) return [];
  return raw.map((it, idx) => {
    const row = it && typeof it === "object" && !Array.isArray(it) ? (it as Record<string, unknown>) : {};
    return {
      ...row,
      id: `local:${queueId}:${idx}`,
      status: row.status ?? "PENDING",
    };
  });
}

function inferOrderTypeFromPayload(payload: Record<string, unknown>): string {
  const t = payload.type;
  if (typeof t === "string" && t.trim()) return t.trim();
  const raw = payload.items;
  if (!Array.isArray(raw) || raw.length === 0) return "LAB";
  const first = raw[0] as Record<string, unknown>;
  const ct = first?.catalogItemType;
  if (ct === "LAB_TEST") return "LAB";
  if (ct === "IMAGING_STUDY") return "IMAGING";
  if (ct === "MEDICATION") return "MEDICATION";
  if (ct === "CARE") return "CARE";
  return "LAB";
}

function syntheticOrderFromQueueItem(q: OfflineQueueItem): Record<string, unknown> {
  const payload =
    q.payload && typeof q.payload === "object" && !Array.isArray(q.payload)
      ? (q.payload as Record<string, unknown>)
      : {};
  return {
    id: `local:${q.id}`,
    pendingSync: true,
    type: inferOrderTypeFromPayload(payload),
    priority: payload.priority ?? "ROUTINE",
    status: "PENDING",
    createdAt: q.createdAt,
    items: mapPayloadToOrderItems(payload, q.id),
    notes: payload.notes,
    prescriberName: payload.prescriberName,
    prescriberLicense: payload.prescriberLicense,
    prescriberContact: payload.prescriberContact,
  };
}

export async function getPendingCreateOrdersForEncounter(
  facilityId: string,
  encounterId: string
): Promise<Record<string, unknown>[]> {
  const all = await listQueueItems();
  const endpoint = `/encounters/${encounterId}/orders`;
  return all
    .filter(
      (item) =>
        item.type === "create_order" &&
        item.facilityId === facilityId &&
        item.endpoint === endpoint
    )
    .map(syntheticOrderFromQueueItem);
}

export function mergeOrders(serverOrders: unknown[], pendingOrders: unknown[]): unknown[] {
  const server = Array.isArray(serverOrders) ? serverOrders : [];
  const pending = Array.isArray(pendingOrders) ? pendingOrders : [];
  const seen = new Set<string>();
  for (const o of server) {
    const id = (o as { id?: unknown })?.id;
    if (id != null) seen.add(String(id));
  }
  const out: unknown[] = [...server];
  for (const p of pending) {
    const id = (p as { id?: unknown })?.id;
    if (id == null) continue;
    const sid = String(id);
    if (!seen.has(sid)) {
      seen.add(sid);
      out.push(p);
    }
  }
  return out;
}

export type PendingFacilityQueueRow = {
  queueItemId: string;
  encounterId: string;
  facilityId: string;
  createdAt: string;
  priority: string;
  itemLabels: string[];
  pendingSync: true;
};

function encounterIdFromOrdersEndpoint(endpoint: string): string | null {
  const m = /^\/encounters\/([^/]+)\/orders$/.exec(endpoint);
  return m ? m[1] : null;
}

function payloadRecord(q: OfflineQueueItem): Record<string, unknown> {
  return q.payload && typeof q.payload === "object" && !Array.isArray(q.payload)
    ? (q.payload as Record<string, unknown>)
    : {};
}

function payloadItemRows(payload: Record<string, unknown>): Record<string, unknown>[] {
  const raw = payload.items;
  if (!Array.isArray(raw)) return [];
  return raw.map((it) =>
    it && typeof it === "object" && !Array.isArray(it) ? (it as Record<string, unknown>) : {}
  );
}

function isLabPayload(payload: Record<string, unknown>): boolean {
  if (payload.type === "LAB") return true;
  return payloadItemRows(payload).some((i) => i.catalogItemType === "LAB_TEST");
}

function isImagingPayload(payload: Record<string, unknown>): boolean {
  if (payload.type === "IMAGING") return true;
  return payloadItemRows(payload).some((i) => i.catalogItemType === "IMAGING_STUDY");
}

function isPharmacyMedicationPayload(payload: Record<string, unknown>): boolean {
  if (payload.type !== "MEDICATION") return false;
  return payloadItemRows(payload).some((i) => {
    if (i.catalogItemType !== "MEDICATION") return false;
    return i.medicationFulfillmentIntent === "PHARMACY_DISPENSE";
  });
}

async function pendingFacilityRowsForFilter(
  facilityId: string,
  include: (payload: Record<string, unknown>) => boolean
): Promise<PendingFacilityQueueRow[]> {
  const all = await listQueueItems();
  const out: PendingFacilityQueueRow[] = [];
  for (const item of all) {
    if (item.type !== "create_order" || item.facilityId !== facilityId) continue;
    const encId = encounterIdFromOrdersEndpoint(item.endpoint);
    if (!encId) continue;
    const payload = payloadRecord(item);
    if (!include(payload)) continue;
    const rows = payloadItemRows(payload);
    const itemLabels = rows.map((it) =>
      getOrderItemDisplayLabelFr(it as Parameters<typeof getOrderItemDisplayLabelFr>[0])
    );
    const pr = payload.priority;
    out.push({
      queueItemId: item.id,
      encounterId: encId,
      facilityId,
      createdAt: item.createdAt,
      priority: typeof pr === "string" ? pr : "ROUTINE",
      itemLabels,
      pendingSync: true,
    });
  }
  return out;
}

export async function getPendingLabOrderRowsForFacility(facilityId: string): Promise<PendingFacilityQueueRow[]> {
  return pendingFacilityRowsForFilter(facilityId, isLabPayload);
}

export async function getPendingImagingOrderRowsForFacility(facilityId: string): Promise<PendingFacilityQueueRow[]> {
  return pendingFacilityRowsForFilter(facilityId, isImagingPayload);
}

export async function getPendingPharmacyMedicationOrderRowsForFacility(
  facilityId: string
): Promise<PendingFacilityQueueRow[]> {
  return pendingFacilityRowsForFilter(facilityId, isPharmacyMedicationPayload);
}

export async function getEncounterPatientLabelFromCache(
  facilityId: string,
  encounterId: string
): Promise<{ label: string; mrn: string }> {
  const key = `encounter:${facilityId}:${encounterId}`;
  const row = await getCachedRecord<{ patient?: { firstName?: string; lastName?: string; mrn?: string | null } }>(
    "encounter_summaries",
    key
  );
  const p = row?.data?.patient;
  if (p && (p.firstName || p.lastName)) {
    return {
      label: `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim(),
      mrn: p.mrn != null && String(p.mrn).trim() !== "" ? String(p.mrn) : "—",
    };
  }
  return { label: "—", mrn: "—" };
}
