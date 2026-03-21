"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/apiClient";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { PharmacyAlertsCard } from "@/components/pharmacy/PharmacyAlertsCard";
import { PharmacyFavorites } from "@/components/pharmacy/PharmacyFavorites";
import { getOrderItemStatusLabel } from "@/constants/orderStatusLabels";
import { getOrderPriorityLabelFr, ui } from "@/lib/uiLabels";
import { getCachedRecord, setCachedRecord } from "@/lib/offline/offlineCache";
import { useConnectivityStatus } from "@/lib/offline/useConnectivityStatus";

const linkStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "12px 20px",
  backgroundColor: "#1a1a1a",
  color: "white",
  borderRadius: 4,
  textDecoration: "none",
  fontSize: 14,
  marginRight: 12,
  marginBottom: 8,
};

export default function PharmacyPage() {
  const { facilityId: facilityIdFromHook, ready, canViewPharmacy } =
    useFacilityAndRoles();
  const { isOffline } = useConnectivityStatus();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [queue, setQueue] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("medora_facility_id="))
      ?.split("=")[1];
    setFacilityId(cookieValue || null);
  }, []);

  const effectiveFacilityId = facilityId || facilityIdFromHook || "";

  useEffect(() => {
    if (!ready || !facilityId) return;
    loadQueue();
  }, [ready, facilityId]);

  const loadQueue = async () => {
    if (!facilityId) return;
    setLoading(true);
    const cacheKey = `pharmacy-queue:${facilityId}`;
    try {
      const data = await apiFetch("/pharmacy/queue", { facilityId });
      setQueue(Array.isArray(data) ? data : []);
      void setCachedRecord("encounter_summaries", cacheKey, Array.isArray(data) ? data : [], { facilityId });
    } catch (error) {
      console.error("Failed to load pharmacy queue:", error);
      const cached = await getCachedRecord<unknown[]>("encounter_summaries", cacheKey);
      setQueue(cached?.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (itemId: string, status: string) => {
    if (!facilityId) return;
    try {
      await apiFetch(`/orders/items/${itemId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        facilityId,
      });
      loadQueue();
    } catch {
      alert("Impossible de mettre à jour le statut");
    }
  };

  return (
    <div>
      {ready && canViewPharmacy && effectiveFacilityId && (
        <PharmacyAlertsCard facilityId={effectiveFacilityId} />
      )}

      <h1 style={{ marginTop: 0 }}>File pharmacie</h1>
      <p style={{ marginBottom: 16, color: "#555", fontSize: 14 }}>
        Raccourcis :
      </p>
      {isOffline && (
        <p style={{ marginTop: -8, marginBottom: 14, fontSize: 12, color: "#8a4b08" }}>
          Hors ligne : liste pharmacie affichée depuis le cache.
        </p>
      )}
      <div style={{ marginBottom: 24 }}>
        <Link href="/app/pharmacy/inventory" style={linkStyle}>
          Inventaire
        </Link>
        <Link href="/app/pharmacy/dispense" style={linkStyle}>
          Dispensation
        </Link>
        <Link href="/app/pharmacy/low-stock" style={linkStyle}>
          Stock faible
        </Link>
        <Link href="/app/pharmacy/expiring" style={linkStyle}>
          Expire bientôt
        </Link>
        <Link href="/app/pharmacy-worklist" style={linkStyle}>
          Liste pharmacie (détails)
        </Link>
      </div>

      {effectiveFacilityId && canViewPharmacy && (
        <div style={{ marginBottom: 24 }}>
          <PharmacyFavorites
            facilityId={effectiveFacilityId}
            compact
            maxItems={8}
          />
        </div>
      )}

      <p>Ordres de médicaments à vérifier et dispenser.</p>
      {loading ? (
        <p>Chargement…</p>
      ) : queue.length === 0 ? (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            backgroundColor: "white",
            borderRadius: 8,
            border: "1px solid #eee",
          }}
        >
          <p>Aucun ordre de médicament en file.</p>
        </div>
      ) : (
        <div style={{ marginTop: 24 }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              backgroundColor: "white",
              border: "1px solid #eee",
              borderRadius: 8,
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.patient}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.nir}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.medication}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.priority}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.status}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {(queue as { items?: { id: string; status: string; catalogItemId: string }[]; encounterId: string; priority: string; encounter?: { patient?: { id?: string; firstName: string; lastName: string; mrn?: string } } }[]).map(
                (order) =>
                  order.items?.map(
                    (item: {
                      id: string;
                      status: string;
                      catalogItemId: string;
                    }) => (
                      <tr
                        key={item.id}
                        style={{ borderBottom: "1px solid #eee" }}
                      >
                        <td style={{ padding: 12 }}>
                          {order.encounter?.patient?.firstName}{" "}
                          {order.encounter?.patient?.lastName}
                        </td>
                        <td style={{ padding: 12 }}>
                          {order.encounter?.patient?.mrn ?? "—"}
                        </td>
                        <td style={{ padding: 12 }}>{item.catalogItemId}</td>
                        <td style={{ padding: 12 }}>{getOrderPriorityLabelFr(order.priority)}</td>
                        <td style={{ padding: 12 }}>
                          {getOrderItemStatusLabel(item.status)}
                        </td>
                        <td style={{ padding: 12 }}>
                          {item.status === "PENDING" && (
                            <button
                              onClick={() =>
                                handleUpdateStatus(item.id, "IN_PROGRESS")
                              }
                              style={{
                                marginRight: 8,
                                padding: "4px 8px",
                                cursor: "pointer",
                              }}
                            >
                              Vérifier
                            </button>
                          )}
                          {item.status === "IN_PROGRESS" && (
                            <button
                              onClick={() =>
                                handleUpdateStatus(item.id, "COMPLETED")
                              }
                              style={{
                                marginRight: 8,
                                padding: "4px 8px",
                                cursor: "pointer",
                              }}
                            >
                              Dispenser
                            </button>
                          )}
                          <Link
                            href={
                              order.encounter?.patient?.id
                                ? `/app/pharmacy/dispense?patientId=${order.encounter.patient.id}&encounterId=${order.encounterId}`
                                : "/app/pharmacy/dispense"
                            }
                            style={{ fontSize: 13 }}
                          >
                            Contexte de dispensation
                          </Link>
                        </td>
                      </tr>
                    )
                  )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}