import { apiFetch } from "@/lib/apiClient";

export function startContinuousFluid(
  orderItemId: string,
  facilityId: string,
  body?: { notes?: string; startedAt?: string; bagSizeMl?: number }
) {
  return apiFetch(`/orders/items/${orderItemId}/fluid/start`, {
    method: "POST",
    facilityId,
    body: JSON.stringify(body ?? {}),
  });
}

export function pauseContinuousFluid(
  orderItemId: string,
  facilityId: string,
  body?: { notes?: string; actionAt?: string }
) {
  return apiFetch(`/orders/items/${orderItemId}/fluid/pause`, {
    method: "POST",
    facilityId,
    body: JSON.stringify(body ?? {}),
  });
}

export function resumeContinuousFluid(
  orderItemId: string,
  facilityId: string,
  body?: { notes?: string; actionAt?: string }
) {
  return apiFetch(`/orders/items/${orderItemId}/fluid/resume`, {
    method: "POST",
    facilityId,
    body: JSON.stringify(body ?? {}),
  });
}

export function stopContinuousFluid(
  orderItemId: string,
  facilityId: string,
  body?: { notes?: string; stoppedAt?: string }
) {
  return apiFetch(`/orders/items/${orderItemId}/fluid/stop`, {
    method: "POST",
    facilityId,
    body: JSON.stringify(body ?? {}),
  });
}

export function startFluidBolus(
  orderItemId: string,
  facilityId: string,
  body?: { notes?: string; startedAt?: string; bolusVolumeMl?: number }
) {
  return apiFetch(`/orders/items/${orderItemId}/fluid/bolus/start`, {
    method: "POST",
    facilityId,
    body: JSON.stringify(body ?? {}),
  });
}

export function completeFluidBolus(
  orderItemId: string,
  facilityId: string,
  body?: { notes?: string; completedAt?: string }
) {
  return apiFetch(`/orders/items/${orderItemId}/fluid/bolus/complete`, {
    method: "POST",
    facilityId,
    body: JSON.stringify(body ?? {}),
  });
}
