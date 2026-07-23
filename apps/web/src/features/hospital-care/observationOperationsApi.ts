/** D4A.2.7C — Observation operations client. */
import { apiFetch } from "@/lib/apiClient";

export async function fetchObservationWorkspaceBootstrap(
  encounterId: string,
  role?: string,
  options?: { facilityId?: string | null }
) {
  const qs = role ? `?role=${encodeURIComponent(role)}` : "";
  const facilityId = options?.facilityId?.trim() || undefined;
  return apiFetch(
    `/observation-operations/encounters/${encodeURIComponent(encounterId)}/workspace-bootstrap${qs}`,
    { facilityId }
  ) as Promise<import("@medora/shared").HospitalWorkspaceBootstrapV1>;
}
