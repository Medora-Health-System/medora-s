"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  fetchEncounterMarBundle,
  fetchEncounterOrderEventsBundle,
  fetchEncounterOrdersBundle,
  fetchEncounterPassQueueBundle,
} from "./encounterClinicalDataLoader";
import { createEncounterClinicalDataPerfCounters, perfClinicalDataLog } from "./encounterClinicalDataPerf";
import {
  EMPTY_PASS_QUEUE,
  scopesForRefresh,
  type AtomicEncounterClinicalRefreshScope,
  type EncounterClinicalDataValue,
  type EncounterClinicalRefreshOptions,
  type EncounterClinicalRefreshScope,
} from "./encounterClinicalDataTypes";

const EncounterClinicalDataContext = createContext<EncounterClinicalDataValue | null>(null);

export type EncounterClinicalDataProviderProps = {
  encounterId: string;
  facilityId: string;
  canFetchOrders: boolean;
  canFetchMarData: boolean;
  /** Load pass queue when MAR tab active or after first MAR visit. */
  prefetchPassQueue: boolean;
  /** Bump to force refresh (e.g. encounter updatedAt). */
  refreshKey?: string;
  pendingSyncFirstName: string;
  pendingSyncLastName: string;
  children: React.ReactNode;
};

function scopeInFlightKey(
  facilityId: string,
  encounterId: string,
  scope: AtomicEncounterClinicalRefreshScope
): string {
  return `${facilityId}:${encounterId}:${scope}`;
}

export function EncounterClinicalDataProvider({
  encounterId,
  facilityId,
  canFetchOrders,
  canFetchMarData,
  prefetchPassQueue,
  refreshKey: _refreshKey = "",
  pendingSyncFirstName,
  pendingSyncLastName,
  children,
}: EncounterClinicalDataProviderProps) {
  const countersRef = useRef(createEncounterClinicalDataPerfCounters());
  const configRef = useRef({
    canFetchOrders,
    canFetchMarData,
    prefetchPassQueue,
    pendingSyncFirstName,
    pendingSyncLastName,
  });
  const refreshInFlightRef = useRef(new Set<string>());
  const initialLoadKeyRef = useRef<string | null>(null);

  const [orders, setOrders] = useState<unknown[]>([]);
  const [medicationAdministrations, setMedicationAdministrations] = useState<unknown[]>([]);
  const [orderEvents, setOrderEvents] = useState<unknown[]>([]);
  const [passQueue, setPassQueue] = useState(EMPTY_PASS_QUEUE);
  const [loading, setLoading] = useState({
    orders: false,
    mar: false,
    orderEvents: false,
    passQueue: false,
    any: false,
  });
  const [errors, setErrors] = useState({
    orders: null as string | null,
    mar: null as string | null,
    orderEvents: null as string | null,
    passQueue: null as string | null,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    configRef.current = {
      canFetchOrders,
      canFetchMarData,
      prefetchPassQueue,
      pendingSyncFirstName,
      pendingSyncLastName,
    };
  }, [canFetchOrders, canFetchMarData, prefetchPassQueue, pendingSyncFirstName, pendingSyncLastName]);

  const setLoadingFlag = useCallback((scope: AtomicEncounterClinicalRefreshScope, value: boolean) => {
    setLoading((prev) => {
      const next = { ...prev };
      if (scope === "orders") next.orders = value;
      if (scope === "mar") next.mar = value;
      if (scope === "orderEvents") next.orderEvents = value;
      if (scope === "passQueue") next.passQueue = value;
      next.any = next.orders || next.mar || next.orderEvents || next.passQueue;
      return next;
    });
  }, []);

  const refresh = useCallback(
    async (scope: EncounterClinicalRefreshScope = "all", options?: EncounterClinicalRefreshOptions) => {
      if (!encounterId.trim() || !facilityId.trim()) return;

      const cfg = configRef.current;
      const atomicScopes = scopesForRefresh(scope).filter((s) => {
        if (s === "orders") return cfg.canFetchOrders;
        if (s === "mar" || s === "orderEvents") return cfg.canFetchMarData || cfg.canFetchOrders;
        if (s === "passQueue") {
          if (!cfg.canFetchMarData) return false;
          if (scope === "all") return cfg.prefetchPassQueue;
          return true;
        }
        return false;
      });
      if (atomicScopes.length === 0) return;

      const scopesToFetch = atomicScopes.filter((s) => {
        const key = scopeInFlightKey(facilityId, encounterId, s);
        if (refreshInFlightRef.current.has(key) && !options?.force) {
          perfClinicalDataLog("refresh skipped: already loading", {
            scope: s,
            reason: options?.reason ?? "",
          });
          return false;
        }
        return true;
      });

      if (scopesToFetch.length === 0) return;

      perfClinicalDataLog(`refresh scope=${scope}`, { reason: options?.reason ?? "" });

      setIsRefreshing(true);
      for (const s of scopesToFetch) {
        const key = scopeInFlightKey(facilityId, encounterId, s);
        refreshInFlightRef.current.add(key);
        setLoadingFlag(s, true);
      }

      const tasks: Promise<void>[] = [];

      if (scopesToFetch.includes("orders") && cfg.canFetchOrders) {
        tasks.push(
          fetchEncounterOrdersBundle({
            facilityId,
            encounterId,
            counters: countersRef.current,
          })
            .then(({ orders: nextOrders }) => {
              setOrders(nextOrders);
              setErrors((e) => ({ ...e, orders: null }));
              perfClinicalDataLog("orders cache updated");
            })
            .catch((err) => {
              setErrors((e) => ({
                ...e,
                orders: err instanceof Error ? err.message : String(err),
              }));
            })
            .finally(() => {
              const key = scopeInFlightKey(facilityId, encounterId, "orders");
              refreshInFlightRef.current.delete(key);
              setLoadingFlag("orders", false);
            })
        );
      }

      if (scopesToFetch.includes("mar") && cfg.canFetchMarData) {
        tasks.push(
          fetchEncounterMarBundle({
            facilityId,
            encounterId,
            pendingSyncFirstName: cfg.pendingSyncFirstName,
            pendingSyncLastName: cfg.pendingSyncLastName,
            counters: countersRef.current,
          })
            .then(({ medicationAdministrations: nextAdmins }) => {
              setMedicationAdministrations(nextAdmins);
              setErrors((e) => ({ ...e, mar: null }));
            })
            .catch((err) => {
              setErrors((e) => ({
                ...e,
                mar: err instanceof Error ? err.message : String(err),
              }));
            })
            .finally(() => {
              const key = scopeInFlightKey(facilityId, encounterId, "mar");
              refreshInFlightRef.current.delete(key);
              setLoadingFlag("mar", false);
            })
        );
      }

      if (scopesToFetch.includes("orderEvents") && (cfg.canFetchMarData || cfg.canFetchOrders)) {
        tasks.push(
          fetchEncounterOrderEventsBundle({
            facilityId,
            encounterId,
            counters: countersRef.current,
          })
            .then(({ orderEvents: nextEvents }) => {
              setOrderEvents(nextEvents);
              setErrors((e) => ({ ...e, orderEvents: null }));
            })
            .catch((err) => {
              setErrors((e) => ({
                ...e,
                orderEvents: err instanceof Error ? err.message : String(err),
              }));
            })
            .finally(() => {
              const key = scopeInFlightKey(facilityId, encounterId, "orderEvents");
              refreshInFlightRef.current.delete(key);
              setLoadingFlag("orderEvents", false);
            })
        );
      }

      if (scopesToFetch.includes("passQueue") && cfg.canFetchMarData) {
        tasks.push(
          fetchEncounterPassQueueBundle({
            facilityId,
            encounterId,
            counters: countersRef.current,
          })
            .then((res) => {
              setPassQueue(res);
              setErrors((e) => ({ ...e, passQueue: null }));
            })
            .catch(() => {
              setPassQueue(EMPTY_PASS_QUEUE);
            })
            .finally(() => {
              const key = scopeInFlightKey(facilityId, encounterId, "passQueue");
              refreshInFlightRef.current.delete(key);
              setLoadingFlag("passQueue", false);
            })
        );
      }

      await Promise.all(tasks);
      setIsRefreshing(false);
    },
    [encounterId, facilityId, setLoadingFlag]
  );

  useEffect(() => {
    setOrders([]);
    setMedicationAdministrations([]);
    setOrderEvents([]);
    setPassQueue(EMPTY_PASS_QUEUE);
    initialLoadKeyRef.current = null;
    refreshInFlightRef.current.clear();
  }, [encounterId, facilityId]);

  useEffect(() => {
    if (!encounterId.trim() || !facilityId.trim()) return;
    if (!canFetchOrders && !canFetchMarData) return;

    const loadKey = `${facilityId}:${encounterId}`;
    if (initialLoadKeyRef.current === loadKey) {
      perfClinicalDataLog("refresh skipped: cache fresh", { reason: "initial-already-loaded" });
      return;
    }
    initialLoadKeyRef.current = loadKey;

    perfClinicalDataLog("encounter clinical data fetch started", {
      encounterId,
      prefetchPassQueue,
    });

    void refresh("all", { reason: "initial", force: true });
  }, [encounterId, facilityId, canFetchOrders, canFetchMarData, prefetchPassQueue, refresh]);

  const value = useMemo<EncounterClinicalDataValue>(
    () => ({
      encounterId,
      facilityId,
      orders,
      medicationAdministrations,
      orderEvents,
      passQueue,
      loading,
      errors,
      refresh,
      isRefreshing,
    }),
    [
      encounterId,
      facilityId,
      orders,
      medicationAdministrations,
      orderEvents,
      passQueue,
      loading,
      errors,
      refresh,
      isRefreshing,
    ]
  );

  return (
    <EncounterClinicalDataContext.Provider value={value}>{children}</EncounterClinicalDataContext.Provider>
  );
}

export function useEncounterClinicalData(): EncounterClinicalDataValue {
  const ctx = useContext(EncounterClinicalDataContext);
  if (!ctx) {
    throw new Error("useEncounterClinicalData must be used within EncounterClinicalDataProvider");
  }
  return ctx;
}

export function useEncounterClinicalDataOptional(): EncounterClinicalDataValue | null {
  return useContext(EncounterClinicalDataContext);
}
