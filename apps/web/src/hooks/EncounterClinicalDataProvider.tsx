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
  type EncounterClinicalDataValue,
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

export function EncounterClinicalDataProvider({
  encounterId,
  facilityId,
  canFetchOrders,
  canFetchMarData,
  prefetchPassQueue,
  refreshKey = "",
  pendingSyncFirstName,
  pendingSyncLastName,
  children,
}: EncounterClinicalDataProviderProps) {
  const countersRef = useRef(createEncounterClinicalDataPerfCounters());
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

  const setLoadingFlag = useCallback((scope: EncounterClinicalRefreshScope, value: boolean) => {
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
    async (scope: EncounterClinicalRefreshScope = "all") => {
      if (!encounterId.trim() || !facilityId.trim()) return;
      const scopes = scopesForRefresh(scope).filter((s) => {
        if (s === "orders") return canFetchOrders;
        if (s === "mar" || s === "orderEvents") return canFetchMarData || canFetchOrders;
        if (s === "passQueue") return canFetchMarData && prefetchPassQueue;
        return false;
      });
      if (scopes.length === 0) return;

      setIsRefreshing(true);
      for (const s of scopes) setLoadingFlag(s, true);

      const tasks: Promise<void>[] = [];

      if (scopes.includes("orders") && canFetchOrders) {
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
            .finally(() => setLoadingFlag("orders", false))
        );
      }

      if (scopes.includes("mar") && canFetchMarData) {
        tasks.push(
          fetchEncounterMarBundle({
            facilityId,
            encounterId,
            pendingSyncFirstName,
            pendingSyncLastName,
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
            .finally(() => setLoadingFlag("mar", false))
        );
      }

      if (scopes.includes("orderEvents") && (canFetchMarData || canFetchOrders)) {
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
            .finally(() => setLoadingFlag("orderEvents", false))
        );
      }

      if (scopes.includes("passQueue") && canFetchMarData && prefetchPassQueue) {
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
            .finally(() => setLoadingFlag("passQueue", false))
        );
      }

      await Promise.all(tasks);
      setIsRefreshing(false);
    },
    [
      canFetchMarData,
      canFetchOrders,
      encounterId,
      facilityId,
      pendingSyncFirstName,
      pendingSyncLastName,
      prefetchPassQueue,
      setLoadingFlag,
    ]
  );

  useEffect(() => {
    setOrders([]);
    setMedicationAdministrations([]);
    setOrderEvents([]);
    setPassQueue(EMPTY_PASS_QUEUE);
  }, [encounterId, facilityId]);

  useEffect(() => {
    if (!encounterId.trim() || !facilityId.trim()) return;
    if (!canFetchOrders && !canFetchMarData) return;

    perfClinicalDataLog("encounter clinical data fetch started", {
      encounterId,
      prefetchPassQueue,
    });

    void refresh("all");
  }, [encounterId, facilityId, canFetchOrders, canFetchMarData, refresh]);

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
