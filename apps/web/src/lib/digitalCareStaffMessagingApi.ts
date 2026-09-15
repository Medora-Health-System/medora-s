import { apiFetch } from "@/lib/apiClient";

export type DigitalCareStaffThreadSummary = {
  id: string;
  patientId: string;
  category: "GENERAL" | "CLINICAL" | "MEDICATION" | "APPOINTMENT" | string;
  subject: string;
  status: "OPEN" | "CLOSED" | string;
  lastMessageAt: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DigitalCareStaffMessage = {
  id: string;
  senderType: "PATIENT" | "STAFF";
  senderUserId: string | null;
  body: string;
  createdAt: string;
};

export type DigitalCareStaffThread = DigitalCareStaffThreadSummary & {
  messages: DigitalCareStaffMessage[];
  messagesTruncated: boolean;
};

function asThreadList(data: unknown): DigitalCareStaffThreadSummary[] {
  return Array.isArray(data) ? (data as DigitalCareStaffThreadSummary[]) : [];
}

export async function fetchDigitalCareStaffThreads(facilityId: string): Promise<DigitalCareStaffThreadSummary[]> {
  const data = await apiFetch("/patient-portal/v1/staff/messages/threads", { facilityId });
  return asThreadList(data);
}

export async function fetchDigitalCareStaffThread(
  facilityId: string,
  threadId: string,
): Promise<DigitalCareStaffThread> {
  return apiFetch(`/patient-portal/v1/staff/messages/threads/${encodeURIComponent(threadId)}`, {
    facilityId,
  }) as Promise<DigitalCareStaffThread>;
}

export async function replyDigitalCareStaffThread(
  facilityId: string,
  threadId: string,
  message: string,
): Promise<DigitalCareStaffMessage> {
  return apiFetch(`/patient-portal/v1/staff/messages/threads/${encodeURIComponent(threadId)}/messages`, {
    facilityId,
    method: "POST",
    body: JSON.stringify({ message }),
  }) as Promise<DigitalCareStaffMessage>;
}

export async function closeDigitalCareStaffThread(
  facilityId: string,
  threadId: string,
): Promise<DigitalCareStaffThreadSummary> {
  return apiFetch(`/patient-portal/v1/staff/messages/threads/${encodeURIComponent(threadId)}/close`, {
    facilityId,
    method: "POST",
  }) as Promise<DigitalCareStaffThreadSummary>;
}
