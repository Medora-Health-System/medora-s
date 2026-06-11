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
import { scopesForRefresh } from "@/hooks/encounterClinicalDataTypes";
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

describe("scopesForRefresh", () => {
  it("maps composite scopes to atomic fetch targets", () => {
    expect(scopesForRefresh("all")).toEqual(["orders", "mar", "orderEvents", "passQueue"]);
    expect(scopesForRefresh("ordersAndEvents")).toEqual(["orders", "orderEvents"]);
    expect(scopesForRefresh("orderMutation")).toEqual(["orders", "passQueue"]);
    expect(scopesForRefresh("marMutation")).toEqual(["mar", "passQueue"]);
  });
});

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

  it("EncounterClinicalDataProvider initial refresh runs once per encounter scope", () => {
    const provider = readWebSource("src/hooks/EncounterClinicalDataProvider.tsx");
    expect(provider).toContain("initialLoadKeyRef");
    expect(provider).toContain('refresh("all", { reason: "initial", force: true })');
    expect(provider).toContain("if (initialLoadKeyRef.current === loadKey)");
    expect(provider).not.toMatch(/activeTab/);
  });

  it("bridge does not refresh all on rerender or refresh-key bumps", () => {
    const bridge = readWebSource("src/hooks/encounterClinicalDataBridge.tsx");
    expect(bridge).not.toContain('refresh("all")');
    expect(bridge).toContain("no network refetch");
    expect(bridge).toContain("prefetchedEncounterKeyRef");
    expect(bridge).not.toContain("requestedRef.current = false");
  });

  it("observation MAR summary does not poll refresh(all) when using shared cache", () => {
    const hook = readWebSource("src/hooks/useObservationMarEncounterSummary.ts");
    expect(hook).not.toContain('refresh("all")');
    expect(hook).toContain("observation MAR polling recompute from shared cache");
    expect(hook).toContain("if (!enabled || !pollingEnabled) return");
    const page = readWebSource("app/app/encounters/[id]/page.tsx");
    expect(page).toContain('pollingEnabled: activeTab !== "mar" && activeTab !== "orders"');
  });

  it("MAR tab mount reuses shared data without standalone reload", () => {
    const mar = readWebSource("src/components/encounters/MedicationAdministrationTab.tsx");
    expect(mar).toContain("useEncounterClinicalDataOptional");
    expect(mar).toContain("MAR tab using shared orders cache");
    expect(mar).toContain("if (useSharedClinicalData) return");
    expect(mar).toContain("void loadAllStandalone()");
  });

  it("MAR mutation refreshes only mar + passQueue via marMutation scope", () => {
    const mar = readWebSource("src/components/encounters/MedicationAdministrationTab.tsx");
    expect(mar).toContain('refresh("marMutation"');
    expect(mar).not.toContain('refresh("mar"), clinicalData.refresh("passQueue")');
  });

  it("order mutation refreshes only orders + passQueue via orderMutation scope", () => {
    const page = readWebSource("app/app/encounters/[id]/page.tsx");
    expect(page).toContain('refresh("orderMutation"');
    expect(page).toContain("refreshAfterOrderCreated");
    expect(page).not.toContain('clinicalData.refresh("orders"), clinicalData.refresh("passQueue")');
    expect(page).toContain("refreshObservationEncounterMetadata");
  });

  it("infusion clock tick does not trigger network fetch", () => {
    const mar = readWebSource("src/components/encounters/MedicationAdministrationTab.tsx");
    const clockBlock =
      mar.match(
        /Re-render periodically so infusion elapsed time[\s\S]*?useEffect\(\(\) => \{[\s\S]*?\}, \[[^\]]*\]\);/
      )?.[0] ?? "";
    expect(clockBlock).toContain("setInfusionClockTick");
    expect(clockBlock).not.toContain("apiFetch");
    expect(clockBlock).not.toContain("refresh(");
    expect(clockBlock).not.toContain("loadAllStandalone");
  });

  it("observation surfaces refresh orders+events not full clinical bundle", () => {
    const page = readWebSource("app/app/encounters/[id]/page.tsx");
    expect(page).toContain('"ordersAndEvents"');
    expect(page).not.toMatch(/clinicalDataRefreshRef\.current\("all"\)/);
  });

  it("pass queue disabled still uses legacy MAR standalone path outside provider", () => {
    const mar = readWebSource("src/components/encounters/MedicationAdministrationTab.tsx");
    expect(mar).toContain("loadAllStandalone");
    expect(mar).toContain("useSharedClinicalData");
  });
});
