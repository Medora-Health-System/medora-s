import { apiFetch } from "@/lib/apiClient";

export type MedicationInfusionStartPayload = {
  notes?: string;
  highAlertVerifierUserId?: string;
  highAlertVerifierDisplayName?: string;
};

/** POST /orders/items/:id/infusion/start — IVPB infusion START (M1.8B.7E.1 witness when required). */
export function startMedicationInfusion(
  orderItemId: string,
  facilityId: string,
  payload?: MedicationInfusionStartPayload | string
): Promise<unknown> {
  const body =
    typeof payload === "string"
      ? payload.trim()
        ? { notes: payload.trim() }
        : {}
      : {
          ...(payload?.notes?.trim() ? { notes: payload.notes.trim() } : {}),
          ...(payload?.highAlertVerifierUserId?.trim()
            ? { highAlertVerifierUserId: payload.highAlertVerifierUserId.trim() }
            : {}),
          ...(payload?.highAlertVerifierDisplayName?.trim()
            ? { highAlertVerifierDisplayName: payload.highAlertVerifierDisplayName.trim() }
            : {}),
        };
  return apiFetch(`/orders/items/${orderItemId}/infusion/start`, {
    method: "POST",
    facilityId,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** POST /orders/items/:id/infusion/stop — completes line via backend MAR path. */
export function stopMedicationInfusion(orderItemId: string, facilityId: string, note?: string): Promise<unknown> {
  return apiFetch(`/orders/items/${orderItemId}/infusion/stop`, {
    method: "POST",
    facilityId,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note?.trim() ? { notes: note.trim() } : {}),
  });
}
