"use client";

import { useEffect, useState } from "react";
import { useConnectivityStatus } from "@/lib/offline/useConnectivityStatus";
import { processOfflineQueueOnce } from "@/lib/offline/offlineSync";

function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch(() => {
    // no-op
  });
}

export function OfflineRuntime() {
  const [mounted, setMounted] = useState(false);
  const { status } = useConnectivityStatus();

  useEffect(() => {
    setMounted(true);
    registerServiceWorker();
    if (navigator.onLine) void processOfflineQueueOnce();
  }, []);

  /** Pas de bannière hors ligne / file d’attente pendant le SSR ou avant hydratation. */
  if (!mounted) return null;

  if (status !== "offline" && status !== "syncing") return null;

  const palette =
    status === "offline"
      ? { bg: "#fff3e0", fg: "#8a4b08", border: "#f3d19c", text: "Hors ligne" }
      : { bg: "#e3f2fd", fg: "#0d47a1", border: "#bbdefb", text: "Synchronisation en cours" };

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        top: 10,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 4000,
        background: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.border}`,
        borderRadius: 999,
        padding: "6px 12px",
        fontSize: 12,
        fontWeight: 600,
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
      }}
    >
      <span>{palette.text}</span>
    </div>
  );
}
