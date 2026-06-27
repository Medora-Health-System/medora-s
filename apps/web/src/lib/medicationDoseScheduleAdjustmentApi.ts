import { apiFetch } from "@/lib/apiClient";

export type AdjustMedicationDoseSchedulePayload = {
  newScheduledAt: string;
  reasonCode: string;
  reasonDetail?: string;
};

export const MEDICATION_DOSE_SCHEDULE_ADJUSTMENT_PATH =
  "/facilities/:facilityId/encounters/:encounterId/medication-doses/:doseInstanceId/scheduled-at";

export const MEDICATION_ORDER_ITEM_SCHEDULE_ADJUSTMENT_PATH =
  "/facilities/:facilityId/encounters/:encounterId/medication-doses/order-items/:orderItemId/scheduled-at";

export function buildMedicationDoseScheduleAdjustmentPath(
  facilityId: string,
  encounterId: string,
  doseInstanceId: string
): string {
  return `/facilities/${facilityId}/encounters/${encounterId}/medication-doses/${doseInstanceId}/scheduled-at`;
}

export function buildMedicationOrderItemScheduleAdjustmentPath(
  facilityId: string,
  encounterId: string,
  orderItemId: string
): string {
  return `/facilities/${facilityId}/encounters/${encounterId}/medication-doses/order-items/${orderItemId}/scheduled-at`;
}

export async function resolveMedicationScheduleAdjustmentTarget(
  facilityId: string,
  encounterId: string,
  input: {
    orderItemId: string;
    scheduledAt?: string | null;
    medicationDoseInstanceId?: string | null;
  }
): Promise<{ doseInstanceId: string | null; adjustTarget: "dose" | "order_item" }> {
  return apiFetch(
    `/facilities/${facilityId}/encounters/${encounterId}/medication-doses/resolve-for-schedule-adjustment`,
    {
      method: "POST",
      body: JSON.stringify({
        orderItemId: input.orderItemId,
        scheduledAt: input.scheduledAt ?? undefined,
        medicationDoseInstanceId: input.medicationDoseInstanceId ?? undefined,
      }),
    }
  );
}

export async function adjustMedicationDoseSchedule(
  facilityId: string,
  encounterId: string,
  doseInstanceId: string,
  payload: AdjustMedicationDoseSchedulePayload
): Promise<{
  doseInstanceId: string;
  scheduledAt: string;
  dueWindowStartAt: string;
  dueWindowEndAt: string;
  doseStatus: string;
}> {
  const normalizedDoseInstanceId = doseInstanceId?.trim();
  if (!normalizedDoseInstanceId) {
    throw new Error("Medication dose instance is required to adjust scheduled time.");
  }
  return apiFetch(buildMedicationDoseScheduleAdjustmentPath(facilityId, encounterId, normalizedDoseInstanceId), {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function adjustOrderItemMedicationSchedule(
  facilityId: string,
  encounterId: string,
  orderItemId: string,
  payload: AdjustMedicationDoseSchedulePayload & { currentScheduledAt: string }
): Promise<{
  orderItemId: string;
  scheduledAt: string;
  adjustTarget: "order_item";
  reasonCode: string;
}> {
  const normalizedOrderItemId = orderItemId?.trim();
  if (!normalizedOrderItemId) {
    throw new Error("Order item is required to adjust scheduled time.");
  }
  return apiFetch(
    buildMedicationOrderItemScheduleAdjustmentPath(facilityId, encounterId, normalizedOrderItemId),
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export async function adjustMarMedicationSchedule(
  facilityId: string,
  encounterId: string,
  input: {
    orderItemId: string;
    scheduledAt?: string | null;
    medicationDoseInstanceId?: string | null;
  },
  payload: AdjustMedicationDoseSchedulePayload
): Promise<void> {
  const target = await resolveMedicationScheduleAdjustmentTarget(facilityId, encounterId, input);
  if (target.adjustTarget === "dose" && target.doseInstanceId) {
    await adjustMedicationDoseSchedule(facilityId, encounterId, target.doseInstanceId, payload);
    return;
  }
  await adjustOrderItemMedicationSchedule(facilityId, encounterId, input.orderItemId, {
    ...payload,
    currentScheduledAt: input.scheduledAt?.trim() || payload.newScheduledAt,
  });
}
