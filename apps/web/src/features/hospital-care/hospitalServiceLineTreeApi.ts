import { apiFetch } from "@/lib/apiClient";
import type { GraphicalHospitalUnitTreeV1 } from "@medora/shared";

export type GraphicalHospitalUnitTreeResponse = GraphicalHospitalUnitTreeV1;

export async function fetchHospitalServiceLineTree(): Promise<GraphicalHospitalUnitTreeResponse> {
  return apiFetch("/hospital-care/units/tree") as Promise<GraphicalHospitalUnitTreeResponse>;
}
