"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/apiClient";
import Link from "next/link";

export default function RadiologyPage() {
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("medora_facility_id="))
      ?.split("=")[1];
    setFacilityId(cookieValue || null);
  }, []);

  useEffect(() => {
    if (!facilityId) return;
    loadQueue();
  }, [facilityId]);

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
    } catch (error) {
      alert("Failed to update status");
    }
  };

  return (
    <div>
      <h1>Radiology Queue</h1>
      <p>Imaging orders requiring attention.</p>
      {loading ? (
        <p>Loading...</p>
      ) : queue.length === 0 ? (
        <div style={{ marginTop: 24, padding: 16, backgroundColor: "white", borderRadius: 4 }}>
          <p>No imaging orders in queue.</p>
        </div>
      ) : (
        <div style={{ marginTop: 24 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: 12, textAlign: "left" }}>Patient</th>
                <th style={{ padding: 12, textAlign: "left" }}>MRN</th>
                <th style={{ padding: 12, textAlign: "left" }}>Study</th>
                <th style={{ padding: 12, textAlign: "left" }}>Priority</th>
                <th style={{ padding: 12, textAlign: "left" }}>Status</th>
                <th style={{ padding: 12, textAlign: "left" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((order) =>
                order.items?.map((item: any) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 12 }}>
                      {order.encounter?.patient?.firstName} {order.encounter?.patient?.lastName}
                    </td>
                    <td style={{ padding: 12 }}>{order.encounter?.patient?.mrn}</td>
                    <td style={{ padding: 12 }}>{item.catalogItemId}</td>
                    <td style={{ padding: 12 }}>{order.priority}</td>
                    <td style={{ padding: 12 }}>{item.status}</td>
                    <td style={{ padding: 12 }}>
                      {item.status === "PENDING" && (
                        <button
                          onClick={() => handleUpdateStatus(item.id, "IN_PROGRESS")}
                          style={{ marginRight: 8, padding: "4px 8px" }}
                        >
                          Start
                        </button>
                      )}
                      {item.status === "IN_PROGRESS" && (
                        <button
                          onClick={() => handleUpdateStatus(item.id, "COMPLETED")}
                          style={{ marginRight: 8, padding: "4px 8px" }}
                        >
                          Complete
                        </button>
                      )}
                      <Link href={`/app/encounters/${order.encounterId}`}>View Encounter</Link>
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

