/**
 * ONLINE encounter order UI: whole-order cancel visibility and medication row status labels.
 * Align with backend cancel rules and clinical execution (MAR, dispense, nurse-complete).
 */

export type OrderLikeForCancelGate = {
  status?: string;
  pendingSync?: boolean;
  items?: Array<{
    status?: string;
    catalogItemType?: string;
    completedAt?: string | null;
    pharmacyDispenseRecord?: unknown | null;
    medicationAdministrations?: unknown[] | null;
  }>;
};

/** True when a medication line can no longer be treated as “not executed” for whole-order cancel. */
export function medicationLineClinicallyExecuted(it: {
  status?: string;
  catalogItemType?: string;
  completedAt?: string | null;
  pharmacyDispenseRecord?: unknown | null;
  medicationAdministrations?: unknown[] | null;
}): boolean {
  if (it.catalogItemType !== "MEDICATION") return false;
  const s = it.status ?? "";
  if (s === "COMPLETED" || s === "RESULTED" || s === "VERIFIED" || s === "CANCELLED") return true;
  if (it.completedAt) return true;
  if (it.pharmacyDispenseRecord) return true;
  if (Array.isArray(it.medicationAdministrations) && it.medicationAdministrations.length > 0) return true;
  return false;
}

/** Hide whole-order cancel when any line is terminal or a medication line has been executed. */
export function orderAllowsWholeCancelOnline(order: OrderLikeForCancelGate): boolean {
  for (const it of order.items ?? []) {
    const s = it.status ?? "";
    if (s === "COMPLETED" || s === "RESULTED" || s === "VERIFIED" || s === "CANCELLED") return false;
    if (medicationLineClinicallyExecuted(it)) return false;
  }
  return true;
}

/**
 * Encounter Orders tab — status key for badge + colors when MEDICATION lines are ahead of parent Order.status.
 */
export function medicationOrderStatusKeyForEncounterTab(order: {
  type?: string;
  status?: string;
  items?: OrderLikeForCancelGate["items"];
}): string {
  if (order.type !== "MEDICATION") return order.status ?? "";
  const st = order.status ?? "";
  if (st === "CANCELLED") return st;
  const items = (order.items ?? []).filter((it) => it?.catalogItemType === "MEDICATION");
  if (items.length === 0) return st;
  const allExec = items.every((it) => medicationLineClinicallyExecuted(it));
  const anyExec = items.some((it) => medicationLineClinicallyExecuted(it));
  if (allExec) return "COMPLETED";
  if (anyExec) return "IN_PROGRESS";
  return st;
}
