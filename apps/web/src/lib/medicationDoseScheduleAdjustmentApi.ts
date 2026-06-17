import { apiFetch } from "@/lib/apiClient";

export type AdjustMedicationDoseSchedulePayload = {
  newScheduledAt: string;
  reasonCode: string;
  reasonDetail?: string;
};

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
  return apiFetch(
    `/facilities/${facilityId}/encounters/${encounterId}/medication-doses/${doseInstanceId}/scheduled-at`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}
