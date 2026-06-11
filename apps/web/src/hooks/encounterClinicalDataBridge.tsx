"use client";

import { useEffect, useRef } from "react";
import { perfClinicalDataLog } from "./encounterClinicalDataPerf";
import { useEncounterClinicalData } from "./EncounterClinicalDataProvider";
import type { EncounterClinicalRefreshScope } from "./encounterClinicalDataTypes";

/** Registers shared clinical refresh for parent callbacks (outside hook tree timing). */
export function EncounterClinicalDataRefreshRegistrar({
  refreshRef,
}: {
  refreshRef: React.MutableRefObject<
    ((scope?: EncounterClinicalRefreshScope) => Promise<void>) | null
  >;
}) {
  const { refresh } = useEncounterClinicalData();
  useEffect(() => {
    refreshRef.current = refresh;
    return () => {
      refreshRef.current = null;
    };
  }, [refresh, refreshRef]);
  return null;
}

/** Syncs shared orders into encounter quick-context chrome. */
export function EncounterQuickOrdersBridge({
  canFetchOrders,
  setQuickOrders,
}: {
  canFetchOrders: boolean;
  setQuickOrders: React.Dispatch<React.SetStateAction<unknown[]>>;
}) {
  const { orders, loading, errors } = useEncounterClinicalData();

  useEffect(() => {
    if (!canFetchOrders) return;
    if (orders.length > 0 || (!loading.orders && !errors.orders)) {
      perfClinicalDataLog("quick context orders synced from shared cache", { count: orders.length });
      setQuickOrders(orders);
    }
  }, [canFetchOrders, orders, loading.orders, errors.orders, setQuickOrders]);

  return null;
}

/** Refreshes shared clinical bundles when encounter clinical refresh key changes. */
export function EncounterClinicalDataRefreshKeyBridge({ refreshKey }: { refreshKey: string }) {
  const { refresh } = useEncounterClinicalData();
  const prevKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevKeyRef.current === null) {
      prevKeyRef.current = refreshKey;
      return;
    }
    if (prevKeyRef.current === refreshKey) return;
    prevKeyRef.current = refreshKey;
    perfClinicalDataLog("encounter clinical data refresh key changed");
    void refresh("all");
  }, [refreshKey, refresh]);

  return null;
}

/** Loads pass queue when MAR tab becomes active. */
export function EncounterPassQueuePrefetchBridge({ active }: { active: boolean }) {
  const { refresh, passQueue, loading } = useEncounterClinicalData();
  const requestedRef = useRef(false);

  useEffect(() => {
    if (!active) {
      requestedRef.current = false;
      return;
    }
    if (requestedRef.current || loading.passQueue || passQueue.enabled) return;
    requestedRef.current = true;
    void refresh("passQueue");
  }, [active, refresh, loading.passQueue, passQueue.enabled]);

  return null;
}
