import { listQueueItems } from "@/lib/offline/offlineQueue";

export type PendingMedicationAdminQueueRow = {
  id: string;
  orderItemId: string | null;
  medicationLabelSnapshot: null;
  administeredAt: string;
  notes: string | null;
  marAction: string | null;
  administeredBy: { id: string; firstName: string; lastName: string };
  pendingSync: true;
  administeredQuantity: number | null;
};

/**
 * Offline-queue MAR rows not yet confirmed on the server — same filtering as the MAR tab.
 */
export async function getPendingMedicationAdminsFromQueue(
  facilityId: string,
  encounterId: string,
  pendingSyncFirstName: string,
  pendingSyncLastName: string
): Promise<PendingMedicationAdminQueueRow[]> {
  const endpoint = `/encounters/${encounterId}/medication-administrations`;
  const all = await listQueueItems();
  const out: PendingMedicationAdminQueueRow[] = [];
  for (const item of all) {
    if (item.status !== "pending" && item.status !== "failed" && item.status !== "syncing") continue;
    if (item.type !== "medication_administration") continue;
    if (item.facilityId !== facilityId) continue;
    if (item.endpoint !== endpoint) continue;
    const payload =
      item.payload && typeof item.payload === "object" && !Array.isArray(item.payload)
        ? (item.payload as Record<string, unknown>)
        : {};
    const rawOid = payload.orderItemId;
    const orderItemId =
      typeof rawOid === "string" ? rawOid : typeof rawOid === "number" ? String(rawOid) : null;
    const administeredAt =
      typeof payload.administeredAt === "string" ? payload.administeredAt : item.createdAt;
    const notes = typeof payload.notes === "string" ? payload.notes : null;
    const marAction = typeof payload.marAction === "string" ? payload.marAction : null;
    const administeredQuantityRaw = payload.administeredQuantity;
    const administeredQuantity =
      typeof administeredQuantityRaw === "number" && Number.isFinite(administeredQuantityRaw)
        ? administeredQuantityRaw
        : null;
    out.push({
      id: `local:${item.id}`,
      orderItemId,
      medicationLabelSnapshot: null,
      administeredAt,
      notes,
      marAction,
      administeredBy: { id: "pending-sync", firstName: pendingSyncFirstName, lastName: pendingSyncLastName },
      pendingSync: true,
      administeredQuantity,
    });
  }
  return out;
}
