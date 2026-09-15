import { apiFetch } from "@/lib/apiClient";

export type PatientPortalStaffRequestStatus =
  | "PENDING"
  | "IN_REVIEW"
  | "ACCEPTED"
  | "DECLINED"
  | "COMPLETED"
  | "CANCELLED";

export type PatientPortalStaffRequest = {
  id: string;
  patientId: string;
  type: "APPOINTMENT_NEW" | "APPOINTMENT_CHANGE" | "APPOINTMENT_CANCEL" | "MEDICATION_REFILL";
  status: PatientPortalStaffRequestStatus;
  appointmentId: string | null;
  medicationOrderItemId: string | null;
  preferredStartAt: string | null;
  reason: string | null;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  resolutionCode: string | null;
  createdAt: string;
  updatedAt: string;
  authoritativeRecordChanged: false;
};

export type PatientPortalRequestDecision =
  | { status: "IN_REVIEW"; resolutionCode: "REVIEWING" | "ACTION_REQUIRED_OUTSIDE_PORTAL" | "PATIENT_CONTACT_REQUIRED" }
  | { status: "ACCEPTED"; resolutionCode: "REQUEST_ACCEPTED" }
  | { status: "DECLINED"; resolutionCode: "REQUEST_DECLINED" }
  | { status: "COMPLETED"; resolutionCode: "REQUEST_COMPLETED" };

function asRequests(data: unknown): PatientPortalStaffRequest[] {
  if (!data || typeof data !== "object" || !Array.isArray((data as { requests?: unknown }).requests)) return [];
  return (data as { requests: PatientPortalStaffRequest[] }).requests;
}

export async function fetchPatientPortalStaffRequests(facilityId: string): Promise<PatientPortalStaffRequest[]> {
  return asRequests(await apiFetch("/patient-portal/v1/staff/requests", { facilityId }));
}

export async function decidePatientPortalStaffRequest(
  facilityId: string,
  requestId: string,
  decision: PatientPortalRequestDecision,
): Promise<PatientPortalStaffRequest> {
  return (await apiFetch(`/patient-portal/v1/staff/requests/${encodeURIComponent(requestId)}/decision`, {
    method: "POST",
    facilityId,
    body: JSON.stringify(decision),
  })) as PatientPortalStaffRequest;
}
