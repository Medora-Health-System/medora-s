import { apiFetch } from "@/lib/apiClient";

export type PatientPortalAccessStatus = {
  patientId: string;
  facilityId: string;
  accessStatus: "NOT_LINKED" | "PENDING" | "VERIFIED" | "REVOKED" | string;
  accountStatus: string | null;
  verifiedAt: string | null;
  revokedAt: string | null;
  latestActivation: {
    state: "NONE" | "PENDING" | "USED" | "EXPIRED" | "REVOKED" | string;
    createdAt: string | null;
    expiresAt: string | null;
  } | null;
};

export type PatientPortalActivationIssue = {
  activationCode: string;
  expiresAt: string;
  patientId: string;
  facilityId: string;
};

export async function fetchPatientPortalAccess(
  facilityId: string,
  patientId: string
): Promise<PatientPortalAccessStatus> {
  return apiFetch(
    `/patient-portal-admin/v1/patients/${encodeURIComponent(patientId)}/access`,
    { facilityId }
  ) as Promise<PatientPortalAccessStatus>;
}

export async function issuePatientPortalActivation(
  facilityId: string,
  patientId: string
): Promise<PatientPortalActivationIssue> {
  return apiFetch(
    `/patient-portal-admin/v1/patients/${encodeURIComponent(patientId)}/activation`,
    { method: "POST", facilityId }
  ) as Promise<PatientPortalActivationIssue>;
}

export async function revokePatientPortalAccess(
  facilityId: string,
  patientId: string
): Promise<{ revoked: true; revokedLinks: number; revokedActivations: number }> {
  return apiFetch(
    `/patient-portal-admin/v1/patients/${encodeURIComponent(patientId)}/access`,
    { method: "DELETE", facilityId }
  ) as Promise<{ revoked: true; revokedLinks: number; revokedActivations: number }>;
}
