import type { RevenueClaimAuditDto } from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";

export async function fetchRevenueClaimAudit(
  facilityId: string,
  claimId: string
): Promise<RevenueClaimAuditDto> {
  const path = `/billing/revenue-cycle/claims/${encodeURIComponent(claimId)}/audit`;
  return (await apiFetch(path, { facilityId })) as RevenueClaimAuditDto;
}
