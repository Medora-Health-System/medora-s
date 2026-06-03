import type { CreateOrderLineItem } from "./types";

export type OrderDraftTypeKey = "LAB" | "IMAGING" | "MEDICATION" | "CARE";

export const MEDICATION_DIRECTION_QUICK_PICKS = [
  "now",
  "once",
  "1 tablet now",
  "1 tab PO now",
  "1 tab PO daily",
  "1 tab PO BID",
  "1 tab PO TID",
  "1 tab PO QID",
  "1 tab PO q6h PRN",
  "1 tab PO q8h PRN",
  "1 mL IVP now",
  "give now",
  "take as directed",
] as const;

export function isAdministerToPatientIntent(
  intent: CreateOrderLineItem["medicationFulfillmentIntent"] | undefined
): boolean {
  return (intent ?? "PHARMACY_DISPENSE") === "ADMINISTER_CHART";
}

/** Browser-local datetime-local string (YYYY-MM-DDTHH:mm). */
export function toDatetimeLocalValue(d: Date): string {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return x.toISOString().slice(0, 16);
}

export function defaultPlannedAdministrationLocal(now = new Date()): string {
  return toDatetimeLocalValue(now);
}

export function applyDefaultPlannedAdministrationIfNeeded(
  item: CreateOrderLineItem,
  now = new Date()
): CreateOrderLineItem {
  if (!isAdministerToPatientIntent(item.medicationFulfillmentIntent)) return item;
  if (item._plannedAdminAtTouched) return item;
  if (item.intendedAdministrationAt?.trim()) return item;
  return { ...item, intendedAdministrationAt: defaultPlannedAdministrationLocal(now) };
}

export function patchMedicationLineWithPlannedAdminRules(
  item: CreateOrderLineItem,
  patch: Partial<CreateOrderLineItem>,
  now = new Date()
): CreateOrderLineItem {
  const merged: CreateOrderLineItem = { ...item, ...patch };

  if ("intendedAdministrationAt" in patch) {
    merged._plannedAdminAtTouched = true;
  }

  if ("medicationFulfillmentIntent" in patch) {
    if (patch.medicationFulfillmentIntent === "PHARMACY_DISPENSE") {
      return {
        ...merged,
        intendedAdministrationAt: undefined,
        _plannedAdminAtTouched: false,
      };
    }
    if (patch.medicationFulfillmentIntent === "ADMINISTER_CHART") {
      return applyDefaultPlannedAdministrationIfNeeded(
        { ...merged, _plannedAdminAtTouched: merged._plannedAdminAtTouched ?? false },
        now
      );
    }
  }

  return applyDefaultPlannedAdministrationIfNeeded(merged, now);
}

export type OrderDraftMedicationStrippable = {
  stagedItems: Record<OrderDraftTypeKey, CreateOrderLineItem[]>;
  formData: { type: OrderDraftTypeKey; items: CreateOrderLineItem[] };
};

/** M1.7B.6 — medication lines must not survive cross-session local draft restore. */
export function stripMedicationFromOrderDraftPayload<T extends OrderDraftMedicationStrippable>(
  payload: T
): T {
  return {
    ...payload,
    stagedItems: { ...payload.stagedItems, MEDICATION: [] },
    formData:
      payload.formData.type === "MEDICATION"
        ? { ...payload.formData, items: [] }
        : payload.formData,
  };
}

export function emptyMedicationStagedItems(): Record<OrderDraftTypeKey, CreateOrderLineItem[]> {
  return { LAB: [], IMAGING: [], MEDICATION: [], CARE: [] };
}
