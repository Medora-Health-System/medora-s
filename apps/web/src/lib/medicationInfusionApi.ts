import { apiFetch } from "@/lib/apiClient";

/** POST /orders/items/:id/infusion/start — IVPB infusion (no MAR / no billing). */
export function startMedicationInfusion(orderItemId: string, facilityId: string): Promise<unknown> {
  return apiFetch(`/orders/items/${orderItemId}/infusion/start`, { method: "POST", facilityId });
}

/** POST /orders/items/:id/infusion/stop — completes line via backend MAR path. */
export function stopMedicationInfusion(orderItemId: string, facilityId: string): Promise<unknown> {
  return apiFetch(`/orders/items/${orderItemId}/infusion/stop`, {
    method: "POST",
    facilityId,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
}
