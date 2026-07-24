/**
 * D4A.3.0 — Enterprise hospital assignment HTTP client.
 * Uses independent hospital bag — never ED self-assign endpoints.
 */

import { apiFetch } from "@/lib/apiClient";
import type {
  EnterpriseHospitalBoardAssignmentRole,
  HospitalBoardAssignmentProjection,
} from "@medora/shared";

export type HospitalAssignmentAction = "ASSIGN_ME" | "UNASSIGN" | "REASSIGN";

export type HospitalAssignmentProjectionResponse = {
  certification: string;
  encounterId: string;
  projection: HospitalBoardAssignmentProjection;
  bag?: unknown;
};

export type HospitalAssignmentMutateResponse = {
  certification: string;
  encounterId: string;
  role: EnterpriseHospitalBoardAssignmentRole;
  unchanged: boolean;
  projection: HospitalBoardAssignmentProjection;
};

export async function fetchHospitalAssignmentProjection(
  facilityId: string,
  encounterId: string
): Promise<HospitalAssignmentProjectionResponse> {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/hospital-assignment`,
    { facilityId }
  ) as Promise<HospitalAssignmentProjectionResponse>;
}

export async function mutateHospitalAssignment(
  facilityId: string,
  encounterId: string,
  input: {
    role: EnterpriseHospitalBoardAssignmentRole;
    action: HospitalAssignmentAction;
    targetUserId?: string | null;
  }
): Promise<HospitalAssignmentMutateResponse> {
  return apiFetch(
    `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/hospital-assignment`,
    {
      method: "POST",
      facilityId,
      body: JSON.stringify({
        role: input.role,
        action: input.action,
        targetUserId: input.targetUserId ?? null,
      }),
    }
  ) as Promise<HospitalAssignmentMutateResponse>;
}

export async function assignHospitalRoleToMe(
  facilityId: string,
  encounterId: string,
  role: EnterpriseHospitalBoardAssignmentRole
): Promise<HospitalAssignmentMutateResponse> {
  return mutateHospitalAssignment(facilityId, encounterId, { role, action: "ASSIGN_ME" });
}

export async function unassignHospitalRole(
  facilityId: string,
  encounterId: string,
  role: EnterpriseHospitalBoardAssignmentRole
): Promise<HospitalAssignmentMutateResponse> {
  return mutateHospitalAssignment(facilityId, encounterId, { role, action: "UNASSIGN" });
}

export async function reassignHospitalRole(
  facilityId: string,
  encounterId: string,
  role: EnterpriseHospitalBoardAssignmentRole,
  targetUserId?: string | null
): Promise<HospitalAssignmentMutateResponse> {
  return mutateHospitalAssignment(facilityId, encounterId, {
    role,
    action: "REASSIGN",
    targetUserId,
  });
}
