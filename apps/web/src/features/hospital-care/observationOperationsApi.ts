/** D4A.2.7C — Observation operations client. */
import { apiFetch } from "@/lib/apiClient";

export async function fetchObservationWorkspaceBootstrap(
  encounterId: string,
  role?: string
) {
  const qs = role ? `?role=${encodeURIComponent(role)}` : "";
  return apiFetch(
    `/observation-operations/encounters/${encodeURIComponent(encounterId)}/workspace-bootstrap${qs}`
  ) as Promise<import("@medora/shared").HospitalWorkspaceBootstrapV1>;
}
