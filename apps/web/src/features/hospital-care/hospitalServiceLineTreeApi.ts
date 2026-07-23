import { apiFetch } from "@/lib/apiClient";
import type { GraphicalHospitalUnitTreeV1 } from "@medora/shared";

export type GraphicalHospitalUnitTreeResponse = GraphicalHospitalUnitTreeV1;

export async function fetchHospitalServiceLineTree(options?: {
  facilityId?: string | null;
}): Promise<GraphicalHospitalUnitTreeResponse> {
  const facilityId = options?.facilityId?.trim() || undefined;
  return apiFetch("/hospital-care/units/tree", { facilityId }) as Promise<GraphicalHospitalUnitTreeResponse>;
}
