"use client";

import { useEffect, useRef } from "react";
import { perfClinicalDataLog } from "./encounterClinicalDataPerf";
import { useEncounterClinicalData } from "./EncounterClinicalDataProvider";
import type {
  EncounterClinicalRefreshOptions,
  EncounterClinicalRefreshScope,
} from "./encounterClinicalDataTypes";

/** Registers shared clinical refresh for parent callbacks (outside hook tree timing). */
export function EncounterClinicalDataRefreshRegistrar({
  refreshRef,
}: {
  refreshRef: React.MutableRefObject<
    ((
      scope?: EncounterClinicalRefreshScope,
      options?: EncounterClinicalRefreshOptions
    ) => Promise<void>) | null
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

/**
 * Observes refresh-key bumps for dev logging only — does not refetch clinical bundles.
 * Summary hooks recompute from shared cache when the key or clinical data changes.
 */
export function EncounterClinicalDataRefreshKeyBridge({ refreshKey }: { refreshKey: string }) {
  const prevKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevKeyRef.current === null) {
      prevKeyRef.current = refreshKey;
      return;
    }
    if (prevKeyRef.current === refreshKey) return;
    prevKeyRef.current = refreshKey;
    perfClinicalDataLog("encounter clinical data refresh key changed (no network refetch)");
  }, [refreshKey]);

  return null;
}

/** Loads pass queue once when MAR tab becomes active for this encounter. */
export function EncounterPassQueuePrefetchBridge({ active }: { active: boolean }) {
  const { refresh, passQueue, loading, encounterId, facilityId } = useEncounterClinicalData();
  const prefetchedEncounterKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!active || !encounterId.trim() || !facilityId.trim()) return;

    const encounterKey = `${facilityId}:${encounterId}`;
    if (prefetchedEncounterKeyRef.current === encounterKey) return;
    if (loading.passQueue) return;
    if (passQueue.enabled && passQueue.at !== "1970-01-01T00:00:00.000Z") {
      prefetchedEncounterKeyRef.current = encounterKey;
      return;
    }

    prefetchedEncounterKeyRef.current = encounterKey;
    void refresh("passQueue", { reason: "mar-tab-active", force: true });
  }, [active, encounterId, facilityId, refresh, loading.passQueue, passQueue.enabled, passQueue.at]);

  useEffect(() => {
    prefetchedEncounterKeyRef.current = null;
  }, [encounterId, facilityId]);

  return null;
}
