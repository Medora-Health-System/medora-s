import { apiFetch } from "./apiClient";

export type FollowUpRow = {
  id: string;
  patientId: string;
  facilityId: string;
  encounterId: string | null;
  dueDate: string;
  reason: string | null;
  status: string;
  notes: string | null;
  createdByUserId: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: { id: string; firstName: string; lastName: string; mrn: string | null };
  encounter?: { id: string; type: string; status: string; createdAt: string } | null;
  createdBy?: { id: string; firstName: string; lastName: string } | null;
};

export async function fetchPatientFollowUps(
  facilityId: string,
  patientId: string,
  params?: { status?: string; limit?: number; offset?: number }
): Promise<{ items: FollowUpRow[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const query = q.toString();
  return apiFetch(
    `/patients/${patientId}/follow-ups${query ? `?${query}` : ""}`,
    { facilityId }
  ) as Promise<{ items: FollowUpRow[]; total: number }>;
}

export async function fetchUpcomingFollowUps(
  facilityId: string,
  params?: { from?: string; to?: string; limit?: number }
): Promise<{ items: FollowUpRow[] }> {
  const q = new URLSearchParams();
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  if (params?.limit != null) q.set("limit", String(params.limit));
  const query = q.toString();
  return apiFetch(
    `/follow-ups/upcoming${query ? `?${query}` : ""}`,
    { facilityId }
  ) as Promise<{ items: FollowUpRow[] }>;
}

export async function createFollowUp(
  facilityId: string,
  body: {
    patientId: string;
    encounterId?: string | null;
    dueDate: string;
    reason: string;
    notes?: string | null;
  }
): Promise<FollowUpRow> {
  return apiFetch("/follow-ups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    facilityId,
  }) as Promise<FollowUpRow>;
}

export async function completeFollowUp(
  facilityId: string,
  followUpId: string
): Promise<FollowUpRow> {
  return apiFetch(`/follow-ups/${followUpId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    facilityId,
  }) as Promise<FollowUpRow>;
}

export async function cancelFollowUp(
  facilityId: string,
  followUpId: string
): Promise<FollowUpRow> {
  return apiFetch(`/follow-ups/${followUpId}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    facilityId,
  }) as Promise<FollowUpRow>;
}
