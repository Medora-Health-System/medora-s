"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/apiClient";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { getOrderItemStatusLabel } from "@/constants/orderStatusLabels";
import { getOrderPriorityLabelFr, ui } from "@/lib/uiLabels";

const L = ui.lab;

export default function LabPage() {
  const { facilityId: facilityIdFromHook, ready } = useFacilityAndRoles();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("medora_facility_id="))
      ?.split("=")[1];
    setFacilityId(cookieValue || facilityIdFromHook || null);
  }, [facilityIdFromHook]);

  useEffect(() => {
    if (!ready || !facilityId) return;
    loadQueue();
  }, [ready, facilityId]);

  const loadQueue = async () => {
    if (!facilityId) return;
    setLoading(true);
    try {
      const data = await apiFetch("/worklists/lab", { facilityId });
      setQueue(data || []);
    } catch (error) {
      console.error("Failed to load lab worklist:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (itemId: string) => {
    if (!facilityId) return;
    try {
      await apiFetch(`/orders/items/${itemId}/acknowledge`, {
        method: "POST",
        facilityId,
      });
      loadQueue();
    } catch {
      alert(L.alertAckFailed);
    }
  };

  const handleStart = async (itemId: string) => {
    if (!facilityId) return;
    try {
      await apiFetch(`/orders/items/${itemId}/start`, {
        method: "POST",
        facilityId,
      });
      loadQueue();
    } catch {
      alert(L.alertStartFailed);
    }
  };

  const handleComplete = async (itemId: string) => {
    if (!facilityId) return;
    try {
      await apiFetch(`/orders/items/${itemId}/complete`, {
        method: "POST",
        facilityId,
      });
      loadQueue();
    } catch {
      alert(L.alertCompleteFailed);
    }
  };

  return (
    <div>
      <h1>{L.title}</h1>
      <p>{L.subtitle}</p>
      {loading ? (
        <p>{ui.common.loading}</p>
      ) : queue.length === 0 ? (
        <div style={{ marginTop: 24, padding: 16, backgroundColor: "white", borderRadius: 4 }}>
          <p>{L.empty}</p>
        </div>
      ) : (
        <div style={{ marginTop: 24 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.patient}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.nir}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.test}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.priority}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.status}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((order) =>
                order.items?.map((item: any) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 12 }}>
                      {order.encounter?.patient?.firstName} {order.encounter?.patient?.lastName}
                    </td>
                    <td style={{ padding: 12 }}>{order.encounter?.patient?.mrn ?? ui.common.dash}</td>
                    <td style={{ padding: 12 }}>{item.catalogItemId}</td>
                    <td style={{ padding: 12 }}>{getOrderPriorityLabelFr(order.priority)}</td>
                    <td style={{ padding: 12 }}>{getOrderItemStatusLabel(item.status)}</td>
                    <td style={{ padding: 12 }}>
                      {item.status === "SIGNED" && (
                        <button
                          type="button"
                          onClick={() => handleAcknowledge(item.id)}
                          style={{ marginRight: 8, padding: "4px 8px", cursor: "pointer" }}
                        >
                          {L.acknowledge}
                        </button>
                      )}
                      {item.status === "ACKNOWLEDGED" && (
                        <button
                          type="button"
                          onClick={() => handleStart(item.id)}
                          style={{ marginRight: 8, padding: "4px 8px", cursor: "pointer" }}
                        >
                          {L.start}
                        </button>
                      )}
                      {item.status === "IN_PROGRESS" && (
                        <button
                          type="button"
                          onClick={() => handleComplete(item.id)}
                          style={{ marginRight: 8, padding: "4px 8px", cursor: "pointer" }}
                        >
                          {L.complete}
                        </button>
                      )}
                      <Link href={`/app/encounters/${order.encounterId}`}>{L.viewEncounter}</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
