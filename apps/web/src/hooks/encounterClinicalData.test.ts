import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/apiClient";
import {
  fetchEncounterMarBundle,
  fetchEncounterOrderEventsBundle,
  fetchEncounterOrdersBundle,
  fetchEncounterPassQueueBundle,
  resetEncounterClinicalDataLoaderForTests,
} from "@/hooks/encounterClinicalDataLoader";
import { createEncounterClinicalDataPerfCounters } from "@/hooks/encounterClinicalDataPerf";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("@/lib/apiClient", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/lib/offline/pendingEncounterOrders", () => ({
  getPendingCreateOrdersForEncounter: vi.fn(async () => []),
  mergeOrders: (server: unknown[], pending: unknown[]) => [...server, ...pending],
}));

vi.mock("@/lib/pendingMedicationAdminsFromQueue", () => ({
  getPendingMedicationAdminsFromQueue: vi.fn(async () => []),
}));

vi.mock("@/lib/medicationPassQueueApi", () => ({
  fetchMedicationPassQueue: vi.fn(async () => ({
    enabled: false,
    at: "2026-01-01T00:00:00.000Z",
    count: 0,
    items: [],
  })),
}));

const webRoot = join(import.meta.dirname, "../..");

function readWebSource(relPath: string): string {
  return readFileSync(join(webRoot, relPath), "utf8");
}

describe("encounterClinicalDataLoader", () => {
  beforeEach(() => {
    resetEncounterClinicalDataLoaderForTests();
    vi.clearAllMocks();
  });

  it("fetchEncounterOrdersBundle calls /orders only once for concurrent requests", async () => {
    let resolveFetch!: (value: unknown) => void;
    vi.mocked(apiFetch).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );
    const counters = createEncounterClinicalDataPerfCounters();
    const first = fetchEncounterOrdersBundle({
      facilityId: "fac-1",
      encounterId: "enc-1",
      counters,
    });
    const second = fetchEncounterOrdersBundle({
      facilityId: "fac-1",
      encounterId: "enc-1",
      counters,
    });
    expect(counters.ordersFetchStarted).toBe(1);
    expect(counters.ordersFetchReused).toBe(1);
    resolveFetch([{ id: "order-1" }]);
    const [a, b] = await Promise.all([first, second]);
    expect(a.orders).toEqual([{ id: "order-1" }]);
    expect(b.orders).toEqual([{ id: "order-1" }]);
    expect(vi.mocked(apiFetch)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(apiFetch)).toHaveBeenCalledWith("/encounters/enc-1/orders", {
      facilityId: "fac-1",
    });
  });

  it("manual refresh after in-flight completion starts a new orders fetch", async () => {
    vi.mocked(apiFetch).mockResolvedValue([{ id: "order-1" }]);
    const counters = createEncounterClinicalDataPerfCounters();
    await fetchEncounterOrdersBundle({ facilityId: "fac-1", encounterId: "enc-1", counters });
    await fetchEncounterOrdersBundle({ facilityId: "fac-1", encounterId: "enc-1", counters });
    expect(counters.ordersFetchStarted).toBe(2);
    expect(counters.ordersFetchReused).toBe(0);
    expect(vi.mocked(apiFetch)).toHaveBeenCalledTimes(2);
  });

  it("dedupes medication-administrations and order-events in parallel scopes", async () => {
    vi.mocked(apiFetch).mockImplementation(async (path: string) => {
      if (path.endsWith("/medication-administrations")) return [{ id: "mar-1" }];
      if (path.endsWith("/order-events")) return [{ id: "ev-1" }];
      return [];
    });
    const counters = createEncounterClinicalDataPerfCounters();
    await Promise.all([
      fetchEncounterMarBundle({
        facilityId: "fac-1",
        encounterId: "enc-1",
        pendingSyncFirstName: "Pending",
        pendingSyncLastName: "Sync",
        counters,
      }),
      fetchEncounterMarBundle({
        facilityId: "fac-1",
        encounterId: "enc-1",
        pendingSyncFirstName: "Pending",
        pendingSyncLastName: "Sync",
        counters,
      }),
      fetchEncounterOrderEventsBundle({
        facilityId: "fac-1",
        encounterId: "enc-1",
        counters,
      }),
      fetchEncounterOrderEventsBundle({
        facilityId: "fac-1",
        encounterId: "enc-1",
        counters,
      }),
    ]);
    expect(counters.marFetchStarted).toBe(1);
    expect(counters.marFetchReused).toBe(1);
    expect(counters.orderEventsFetchStarted).toBe(1);
    expect(counters.orderEventsFetchReused).toBe(1);
  });

  it("pass queue fetch is deduped while in flight", async () => {
    const { fetchMedicationPassQueue } = await import("@/lib/medicationPassQueueApi");
    let resolvePass!: (value: Awaited<ReturnType<typeof fetchMedicationPassQueue>>) => void;
    vi.mocked(fetchMedicationPassQueue).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePass = resolve;
        })
    );
    const counters = createEncounterClinicalDataPerfCounters();
    const first = fetchEncounterPassQueueBundle({
      facilityId: "fac-1",
      encounterId: "enc-1",
      counters,
    });
    const second = fetchEncounterPassQueueBundle({
      facilityId: "fac-1",
      encounterId: "enc-1",
      counters,
    });
    expect(counters.passQueueFetchStarted).toBe(1);
    expect(counters.passQueueFetchReused).toBe(1);
    resolvePass({ enabled: true, at: "2026-01-01T00:00:00.000Z", count: 0, items: [] });
    await Promise.all([first, second]);
    expect(vi.mocked(fetchMedicationPassQueue)).toHaveBeenCalledTimes(1);
  });
});

describe("encounter clinical data integration (source contracts)", () => {
  it("encounter page wraps content with EncounterClinicalDataProvider", () => {
    const page = readWebSource("app/app/encounters/[id]/page.tsx");
    expect(page).toContain("EncounterClinicalDataProvider");
    expect(page).toContain("EncounterQuickOrdersBridge");
    const loadQuickContextBlock =
      page.match(/const loadQuickContext = useCallback\(async \(\) => \{[\s\S]*?\n  \}, \[/)?.[0] ?? "";
    expect(loadQuickContextBlock).not.toContain("/orders");
  });

  it("MAR tab reuses shared clinical data cache", () => {
    const mar = readWebSource("src/components/encounters/MedicationAdministrationTab.tsx");
    expect(mar).toContain("useEncounterClinicalDataOptional");
    expect(mar).toContain("MAR tab using shared orders cache");
    expect(mar).toContain("encounterAllergySource");
    expect(mar).toContain("Promise.all([");
    expect(mar).toContain("/order-events");
  });

  it("Orders tab reuses shared orders cache and refreshes on mutation", () => {
    const page = readWebSource("app/app/encounters/[id]/page.tsx");
    expect(page).toContain('perfClinicalDataLog("Orders tab using shared orders cache")');
    expect(page).toContain("refreshOrdersAfterMutation");
    expect(page).toContain('clinicalData.refresh("orders")');
    expect(page).toContain('clinicalData.refresh("passQueue")');
  });

  it("observation MAR summary supports shared clinical data and tab-aware polling", () => {
    const hook = readWebSource("src/hooks/useObservationMarEncounterSummary.ts");
    expect(hook).toContain("clinicalData");
    expect(hook).toContain("pollingEnabled");
    expect(hook).toContain("observation MAR summary using shared clinical data");
    const page = readWebSource("app/app/encounters/[id]/page.tsx");
    expect(page).toContain('pollingEnabled: activeTab !== "mar" && activeTab !== "orders"');
  });

  it("pass queue disabled still uses legacy MAR standalone path outside provider", () => {
    const mar = readWebSource("src/components/encounters/MedicationAdministrationTab.tsx");
    expect(mar).toContain("loadAllStandalone");
    expect(mar).toContain("useSharedClinicalData");
  });
});
