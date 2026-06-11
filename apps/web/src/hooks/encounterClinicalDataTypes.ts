import type { MedicationPassQueueResponse } from "@/lib/medicationPassQueueApi";

export type EncounterClinicalRefreshScope = "orders" | "mar" | "orderEvents" | "passQueue" | "all";

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
  refresh: (scope?: EncounterClinicalRefreshScope) => Promise<void>;
  /** True when any scoped fetch is in flight. */
  isRefreshing: boolean;
};

export const EMPTY_PASS_QUEUE: MedicationPassQueueResponse = {
  enabled: false,
  at: new Date(0).toISOString(),
  count: 0,
  items: [],
};

export function scopesForRefresh(scope: EncounterClinicalRefreshScope): EncounterClinicalRefreshScope[] {
  if (scope === "all") return ["orders", "mar", "orderEvents", "passQueue"];
  return [scope];
}
