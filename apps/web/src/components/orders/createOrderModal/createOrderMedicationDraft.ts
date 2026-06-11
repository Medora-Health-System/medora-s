import type { CreateOrderLineItem, MedicationRoute } from "./types";

export type OrderDraftTypeKey = "LAB" | "IMAGING" | "MEDICATION" | "CARE";

/** Fallback when route is unset or unrecognized (M1.8B.7J.6). */
export const MEDICATION_DIRECTION_QUICK_PICKS_GENERIC = [
  "now",
  "once",
  "give now",
  "take as directed",
] as const;

export const MEDICATION_DIRECTION_QUICK_PICKS_PO = [
  "1 tablet now",
  "1 tab PO now",
  "1 tab PO daily",
  "1 tab PO BID",
  "1 tab PO TID",
  "1 tab PO QID",
  "1 tab PO q6h PRN",
  "1 tab PO q8h PRN",
  "take as directed",
] as const;

export const MEDICATION_DIRECTION_QUICK_PICKS_IVPB = [
  "1 g IVPB q24h",
  "1 g IVPB q12h",
  "1 g IVPB q8h",
  "1 g IVPB q6h",
  "500 mg IVPB q12h",
  "500 mg IVPB q8h",
  "Vancomycin 1 g IVPB q12h",
  "Cefepime 2 g IVPB q8h",
  "Ceftriaxone 1 g IVPB q24h",
  "Piperacillin-tazobactam 4.5 g IVPB q6h",
  "take as directed",
] as const;

export const MEDICATION_DIRECTION_QUICK_PICKS_IVP = [
  "1 mL IVP now",
  "give IVP now",
  "IVP once",
  "take as directed",
] as const;

export const MEDICATION_DIRECTION_QUICK_PICKS_IM = [
  "IM now",
  "IM once",
  "take as directed",
] as const;

export const MEDICATION_DIRECTION_QUICK_PICKS_SQ = [
  "SQ now",
  "SQ daily",
  "SQ BID",
  "take as directed",
] as const;

/** @deprecated Use {@link medicationDirectionQuickPicksForRoute} — generic fallback only. */
export const MEDICATION_DIRECTION_QUICK_PICKS = MEDICATION_DIRECTION_QUICK_PICKS_GENERIC;

/**
 * Route-aware direction datalist suggestions for medication order entry (M1.8B.7J.6).
 * Does not mutate user-entered directions; suggestions only.
 */
export function medicationDirectionQuickPicksForRoute(
  route?: MedicationRoute | string | null
): readonly string[] {
  const normalized = typeof route === "string" ? route.trim().toUpperCase() : "";
  switch (normalized) {
    case "PO":
      return MEDICATION_DIRECTION_QUICK_PICKS_PO;
    case "IVPB":
      return MEDICATION_DIRECTION_QUICK_PICKS_IVPB;
    case "IVP":
      return MEDICATION_DIRECTION_QUICK_PICKS_IVP;
    case "IM":
      return MEDICATION_DIRECTION_QUICK_PICKS_IM;
    case "SQ":
      return MEDICATION_DIRECTION_QUICK_PICKS_SQ;
    default:
      return MEDICATION_DIRECTION_QUICK_PICKS_GENERIC;
  }
}

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
