import { apiFetch } from "./apiClient";

export type CalendarAppointment = {
  id: string; patientId: string; patientName: string | null; mrn: string | null;
  scheduledStartAt: string; reason: string | null; providerId: string | null;
  providerName: string | null; status: string; encounterId: string | null;
};
export type CalendarResponse = {
  items: CalendarAppointment[]; total: number; timezone: string;
  dailyCounts: Record<string, number>; hasMore: boolean; nextOffset: number | null;
  from: string; to: string;
};
export async function fetchAppointmentCalendar(
  facilityId: string, from: string, to: string, offset = 0
): Promise<CalendarResponse> {
  const q = new URLSearchParams({ from, to, offset: String(offset) });
  return apiFetch(`/appointments/calendar?${q}`, { facilityId }) as Promise<CalendarResponse>;
}
