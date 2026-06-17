import { apiFetch } from "@/lib/apiClient";

export type MedicationInfusionStartPayload = {
  notes?: string;
  startedAt?: string;
  medicationDoseInstanceId?: string;
  highAlertVerifierUserId?: string;
  highAlertVerifierDisplayName?: string;
};

export type MedicationInfusionStopPayload = {
  stopReasonCode?: string;
  reasonDetail?: string;
  notes?: string;
  stoppedAt?: string;
  medicationDoseInstanceId?: string;
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
          ...(payload?.startedAt?.trim() ? { startedAt: payload.startedAt.trim() } : {}),
          ...(payload?.medicationDoseInstanceId?.trim()
            ? { medicationDoseInstanceId: payload.medicationDoseInstanceId.trim() }
            : {}),
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
export function stopMedicationInfusion(
  orderItemId: string,
  facilityId: string,
  payload?: MedicationInfusionStopPayload | string
): Promise<unknown> {
  const body =
    typeof payload === "string"
      ? {
          stopReasonCode: "COMPLETED" as const,
          ...(payload.trim() ? { notes: payload.trim() } : {}),
        }
      : {
          stopReasonCode: payload?.stopReasonCode?.trim() || "COMPLETED",
          ...(payload?.reasonDetail?.trim() ? { reasonDetail: payload.reasonDetail.trim() } : {}),
          ...(payload?.notes?.trim() ? { notes: payload.notes.trim() } : {}),
          ...(payload?.stoppedAt?.trim() ? { stoppedAt: payload.stoppedAt.trim() } : {}),
          ...(payload?.medicationDoseInstanceId?.trim()
            ? { medicationDoseInstanceId: payload.medicationDoseInstanceId.trim() }
            : {}),
        };
  return apiFetch(`/orders/items/${orderItemId}/infusion/stop`, {
    method: "POST",
    facilityId,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
