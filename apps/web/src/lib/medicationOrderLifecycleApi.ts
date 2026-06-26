import { apiFetch } from "@/lib/apiClient";
import type {
  MedicationOrderDiscontinueAndReorderDto,
  MedicationOrderDiscontinueDto,
  MedicationOrderEditDto,
  MedicationOrderHoldDto,
} from "@medora/shared";

export async function discontinueMedicationOrderItem(
  orderItemId: string,
  dto: MedicationOrderDiscontinueDto,
  facilityId: string
) {
  return apiFetch(`/orders/items/${orderItemId}/discontinue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
    facilityId,
  });
}

export async function holdMedicationOrderItem(
  orderItemId: string,
  dto: MedicationOrderHoldDto,
  facilityId: string
) {
  return apiFetch(`/orders/items/${orderItemId}/hold`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
    facilityId,
  });
}

export async function resumeMedicationOrderItem(orderItemId: string, facilityId: string) {
  return apiFetch(`/orders/items/${orderItemId}/resume`, {
    method: "POST",
    facilityId,
  });
}

export async function editMedicationOrderItem(
  orderItemId: string,
  dto: MedicationOrderEditDto,
  facilityId: string
) {
  return apiFetch(`/orders/items/${orderItemId}/edit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
    facilityId,
  });
}

export async function discontinueAndReorderMedicationOrderItem(
  orderItemId: string,
  dto: MedicationOrderDiscontinueAndReorderDto,
  facilityId: string
) {
  return apiFetch(`/orders/items/${orderItemId}/discontinue-and-reorder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
    facilityId,
  });
}

export function medicationOrderLifecycleStatusLabelKey(
  status: string | null | undefined
): string {
  const normalized = (status ?? "ACTIVE").toUpperCase();
  return `medicationOrderLifecycle.status.${normalized}`;
}
