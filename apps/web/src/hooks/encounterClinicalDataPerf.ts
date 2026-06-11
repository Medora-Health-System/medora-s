/** Dev-only perf counters — no PHI. */
const PREFIX = "[perf] encounter clinical data";

export function perfClinicalDataLog(message: string, detail?: Record<string, string | number | boolean>): void {
  if (process.env.NODE_ENV === "production") return;
  if (detail) {
    console.debug(`${PREFIX} ${message}`, detail);
  } else {
    console.debug(`${PREFIX} ${message}`);
  }
}

export type EncounterClinicalDataPerfCounters = {
  ordersFetchStarted: number;
  ordersFetchReused: number;
  marFetchStarted: number;
  marFetchReused: number;
  orderEventsFetchStarted: number;
  orderEventsFetchReused: number;
  passQueueFetchStarted: number;
  passQueueFetchReused: number;
};

export function createEncounterClinicalDataPerfCounters(): EncounterClinicalDataPerfCounters {
  return {
    ordersFetchStarted: 0,
    ordersFetchReused: 0,
    marFetchStarted: 0,
    marFetchReused: 0,
    orderEventsFetchStarted: 0,
    orderEventsFetchReused: 0,
    passQueueFetchStarted: 0,
    passQueueFetchReused: 0,
  };
}
