"use client";

import { useEffect, useState } from "react";
import { getOfflineSyncEventName, getQueuePendingCount, processOfflineQueueOnce } from "./offlineSync";
import type { ConnectivityStatus } from "./offlineTypes";

export function useConnectivityStatus() {
  /**
   * Même rendu serveur / premier rendu client : évite l’erreur d’hydratation
   * (le SSR ne voit pas `navigator` ; l’ancien code déduisait « hors ligne » côté serveur
   * et « en ligne » côté client).
   */
  const [status, setStatus] = useState<ConnectivityStatus>("online");
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setStatus(typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline");
    let mounted = true;
    const refreshPending = async () => {
      try {
        const n = await getQueuePendingCount();
        if (mounted) setPendingCount(n);
      } catch {
        // ignore
      }
    };
    const onOnline = () => {
      setStatus("online");
      void processOfflineQueueOnce();
      void refreshPending();
    };
    const onOffline = () => setStatus("offline");
    const onSync = (ev: Event) => {
      const e = ev as CustomEvent<{ status: ConnectivityStatus; pendingCount: number }>;
      if (e.detail?.status) setStatus(e.detail.status);
      if (typeof e.detail?.pendingCount === "number") setPendingCount(e.detail.pendingCount);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener(getOfflineSyncEventName(), onSync);
    void refreshPending();
    return () => {
      mounted = false;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener(getOfflineSyncEventName(), onSync);
    };
  }, []);

  return { status, pendingCount, isOffline: status === "offline" };
}
