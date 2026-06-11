import type { MedicationPassQueueResponse } from "@/lib/medicationPassQueueApi";

export type EncounterClinicalRefreshScope =
  | "orders"
  | "mar"
  | "orderEvents"
  | "passQueue"
  | "all"
  /** Observation timeline / order-line surfaces — no MAR or pass queue. */
  | "ordersAndEvents"
  /** After order create/cancel — orders + pass queue only. */
  | "orderMutation"
  /** After MAR record — MAR + pass queue only. */
  | "marMutation";

export type EncounterClinicalRefreshOptions = {
  reason?: string;
  force?: boolean;
};

export type EncounterClinicalDataLoadingState = {
  orders: boolean;
  mar: boolean;
  orderEvents: boolean;
  passQueue: boolean;
  any: boolean;
};

export type EncounterClinicalDataErrors = {
  orders: string | null;
  mar: string | null;
  orderEvents: string | null;
  passQueue: string | null;
};

export type EncounterClinicalDataValue = {
  encounterId: string;
  facilityId: string;
  orders: unknown[];
  medicationAdministrations: unknown[];
  orderEvents: unknown[];
  passQueue: MedicationPassQueueResponse;
  loading: EncounterClinicalDataLoadingState;
  errors: EncounterClinicalDataErrors;
  refresh: (
    scope?: EncounterClinicalRefreshScope,
    options?: EncounterClinicalRefreshOptions
  ) => Promise<void>;
  /** True when any scoped fetch is in flight. */
  isRefreshing: boolean;
};

export const EMPTY_PASS_QUEUE: MedicationPassQueueResponse = {
  enabled: false,
  at: new Date(0).toISOString(),
  count: 0,
  items: [],
};

const ATOMIC_REFRESH_SCOPES = ["orders", "mar", "orderEvents", "passQueue"] as const;

export type AtomicEncounterClinicalRefreshScope = (typeof ATOMIC_REFRESH_SCOPES)[number];

export function scopesForRefresh(
  scope: EncounterClinicalRefreshScope
): AtomicEncounterClinicalRefreshScope[] {
  switch (scope) {
    case "all":
      return [...ATOMIC_REFRESH_SCOPES];
    case "ordersAndEvents":
      return ["orders", "orderEvents"];
    case "orderMutation":
      return ["orders", "passQueue"];
    case "marMutation":
      return ["mar", "passQueue"];
    default:
      return [scope];
  }
}
