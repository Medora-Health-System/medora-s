"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/apiClient";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { getOrderItemStatusLabel } from "@/constants/orderStatusLabels";
import { getOrderPriorityLabelFr, ui } from "@/lib/uiLabels";

const R = ui.radiology;

export default function RadiologyPage() {
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
      const data = await apiFetch("/radiology/queue", { facilityId });
      setQueue(data || []);
    } catch (error) {
      console.error("Failed to load radiology queue:", error);
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
      alert(R.updateStatusFailed);
    }
  };

  return (
    <div>
      <h1>{R.title}</h1>
      <p>{R.subtitle}</p>
      {loading ? (
        <p>{ui.common.loading}</p>
      ) : queue.length === 0 ? (
        <div style={{ marginTop: 24, padding: 16, backgroundColor: "white", borderRadius: 4 }}>
          <p>{R.empty}</p>
        </div>
      ) : (
        <div style={{ marginTop: 24 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.patient}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.nir}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.study}</th>
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
                      {item.status === "PENDING" && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(item.id, "IN_PROGRESS")}
                          style={{ marginRight: 8, padding: "4px 8px", cursor: "pointer" }}
                        >
                          {R.start}
                        </button>
                      )}
                      {item.status === "IN_PROGRESS" && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(item.id, "COMPLETED")}
                          style={{ marginRight: 8, padding: "4px 8px", cursor: "pointer" }}
                        >
                          {R.complete}
                        </button>
                      )}
                      <Link href={`/app/encounters/${order.encounterId}`}>{R.viewEncounter}</Link>
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
