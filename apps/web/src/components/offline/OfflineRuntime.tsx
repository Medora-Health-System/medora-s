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
  const { status, pendingCount } = useConnectivityStatus();

  useEffect(() => {
    setMounted(true);
    registerServiceWorker();
    if (navigator.onLine) void processOfflineQueueOnce();
  }, []);

  /** Pas de bannière hors ligne / file d’attente pendant le SSR ou avant hydratation. */
  if (!mounted) return null;

  if (status === "online" && pendingCount === 0) return null;

  const palette =
    status === "offline"
      ? { bg: "#fff3e0", fg: "#8a4b08", border: "#f3d19c", text: "Hors ligne" }
      : status === "syncing"
      ? { bg: "#e3f2fd", fg: "#0d47a1", border: "#bbdefb", text: "Synchronisation en cours" }
      : { bg: "#fff8e1", fg: "#6d4c41", border: "#ffe082", text: "Connexion rétablie" };

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
      {pendingCount > 0 ? (
        <>
          <span>{` · Certaines données ne sont pas encore synchronisées (${pendingCount})`}</span>
          {status !== "syncing" && (
            <button
              type="button"
              onClick={() => void processOfflineQueueOnce()}
              style={{
                marginLeft: 8,
                border: "1px solid #bdbdbd",
                background: "#fff",
                borderRadius: 999,
                padding: "2px 8px",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Réessayer
            </button>
          )}
        </>
      ) : null}
    </div>
  );
}
