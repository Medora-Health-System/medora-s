import { apiFetch } from "@/lib/apiClient";
import {
  closeDigitalCareStaffThread,
  fetchDigitalCareStaffThread,
  fetchDigitalCareStaffThreads,
  replyDigitalCareStaffThread,
  fetchDigitalCareStaffResults,
  releaseDigitalCareResult,
  revokeDigitalCareResult,
  type DigitalCareStaffThread,
  type DigitalCareStaffThreadSummary,
  type DigitalCareStaffResult,
} from "@/lib/digitalCareStaffMessagingApi";

export {
  closeDigitalCareStaffThread,
  fetchDigitalCareStaffThread,
  fetchDigitalCareStaffThreads,
  replyDigitalCareStaffThread,
  fetchDigitalCareStaffResults,
  releaseDigitalCareResult,
  revokeDigitalCareResult,
};
export type { DigitalCareStaffThread, DigitalCareStaffThreadSummary, DigitalCareStaffResult };

export type DigitalCareRosterPatient = {
  id: string;
  displayName: string;
  mrn: string | null;
  dob: string | null;
  ageYears: number | null;
  sex: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  visitType: "ED" | "INPATIENT" | "CLINIC" | "URGENT" | "OBSERVATION" | "OTHER";
  visitStatus: string | null;
  arrivedAt: string | null;
  dischargedAt: string | null;
  unit: string | null;
  attending: string | null;
  encounterId: string | null;
  portalActive: boolean;
  unreadCount: number;
};

export type DigitalCareWorkspaceResult = DigitalCareStaffResult & {
  collectedAt?: string | null;
  orderingProvider?: string | null;
  patientDisplayName?: string;
  patientMrn?: string | null;
  category?: string;
  flag?: string;
  rows?: Array<{ test: string; result: string; unit: string | null; reference: string | null; flag: string | null }>;
  imaging?: {
    indication: string | null;
    technique: string | null;
    comparison: string | null;
    findings: string | null;
    impression: string | null;
    recommendation: string | null;
  } | null;
};

export type DigitalCareWorkspaceMedication = {
  id: string;
  orderId: string;
  name: string;
  strength: string | null;
  route: string | null;
  frequency: string | null;
  instructions: string | null;
  itemStatus: string | null;
  lifecycle: string | null;
  fulfillment: string | null;
  orderStatus: string | null;
  cancelledAt: string | null;
  prescriberName: string | null;
  orderedAt: string;
  encounterType: string | null;
  bucket: string;
};

export type DigitalCareWorkspaceBundle = {
  identity: DigitalCareRosterPatient & { insurance: string | null };
  results: DigitalCareWorkspaceResult[];
  threads: Array<{ id: string; subject: string; status: string; category: string; lastMessageAt: string }>;
  medications: { ordered: DigitalCareWorkspaceMedication[]; homeSummary: string | null; reconComplete: boolean };
  discharge: {
    diagnoses: Array<{ id: string; code: string; description: string | null }>;
    summary: unknown;
    disposition: string | null;
    followUpDate: string | null;
    instructions: string | null;
    restrictions: string | null;
    schoolNote: string | null;
    workNote: string | null;
    followUp: string | null;
    acknowledgement: boolean;
    attending: string | null;
    status: string | null;
    portalActive: boolean;
  };
  timeline: Array<{ id: string; kind: string; at: string; title: string; detail: string | null }>;
  carePlans: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    activatedAt: string;
    components: Array<{
      id: string;
      title: string;
      text: string;
      status: string;
      componentType: string;
      targetOutcome: string | null;
      educationJson: unknown;
    }>;
  }>;
  followUps: Array<{ id: string; dueDate: string; reason: string | null; notes: string | null; status: string }>;
  appointments: Array<{ id: string; at: string; reason: string | null; status: string }>;
  activity: Array<{ id: string; at: string; action: string; entityType: string; metadata: unknown }>;
};

export type DigitalCareResultDetail = DigitalCareWorkspaceResult & {
  verifiedByName?: string | null;
  acknowledgedByName?: string | null;
  acknowledgedAt?: string | null;
  history?: Array<{ id: string; at: string; action: string; metadata: unknown }>;
  resultData?: unknown;
};

export async function fetchDigitalCareRoster(
  facilityId: string,
  query?: { q?: string; limit?: number; offset?: number },
) {
  const params = new URLSearchParams();
  if (query?.q) params.set("q", query.q);
  if (query?.limit) params.set("limit", String(query.limit));
  if (query?.offset) params.set("offset", String(query.offset));
  const suffix = params.toString() ? `?${params}` : "";
  return apiFetch(`/patient-portal/v1/staff/digital-care/roster${suffix}`, { facilityId }) as Promise<{
    patients: DigitalCareRosterPatient[];
    total: number;
    offset: number;
    limit: number;
  }>;
}

export async function fetchDigitalCareWorkspace(facilityId: string, patientId: string) {
  return apiFetch(`/patient-portal/v1/staff/digital-care/patients/${encodeURIComponent(patientId)}`, {
    facilityId,
  }) as Promise<DigitalCareWorkspaceBundle>;
}

export async function fetchDigitalCareResultDetail(
  facilityId: string,
  orderItemId: string,
  purpose: "VIEW" | "DOWNLOAD" | "PRINT" = "VIEW",
) {
  return apiFetch(
    `/patient-portal/v1/staff/results/${encodeURIComponent(orderItemId)}?purpose=${purpose}`,
    { facilityId },
  ) as Promise<DigitalCareResultDetail>;
}

export async function createDigitalCareStaffThread(
  facilityId: string,
  patientId: string,
  input: { category: "GENERAL" | "CLINICAL" | "MEDICATION" | "APPOINTMENT"; subject: string; message: string },
) {
  return apiFetch(`/patient-portal/v1/staff/messages/threads`, {
    facilityId,
    method: "POST",
    body: JSON.stringify({ patientId, ...input }),
  }) as Promise<DigitalCareStaffThread>;
}
