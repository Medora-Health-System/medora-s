import { apiFetch } from "@/lib/apiClient";

export type AdjustMedicationDoseSchedulePayload = {
  newScheduledAt: string;
  reasonCode: string;
  reasonDetail?: string;
};

export const MEDICATION_DOSE_SCHEDULE_ADJUSTMENT_PATH =
  "/facilities/:facilityId/encounters/:encounterId/medication-doses/:doseInstanceId/scheduled-at";

export function buildMedicationDoseScheduleAdjustmentPath(
  facilityId: string,
  encounterId: string,
  doseInstanceId: string
): string {
  return `/facilities/${facilityId}/encounters/${encounterId}/medication-doses/${doseInstanceId}/scheduled-at`;
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
