"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/apiClient";
import Link from "next/link";

export default function LabPage() {
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
    } catch (error) {
      alert("Failed to acknowledge");
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
    } catch (error) {
      alert("Failed to start");
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
    } catch (error) {
      alert("Failed to complete");
    }
  };

  return (
    <div>
      <h1>Lab Queue</h1>
      <p>Laboratory orders requiring attention.</p>
      {loading ? (
        <p>Loading...</p>
      ) : queue.length === 0 ? (
        <div style={{ marginTop: 24, padding: 16, backgroundColor: "white", borderRadius: 4 }}>
          <p>No lab orders in queue.</p>
        </div>
      ) : (
        <div style={{ marginTop: 24 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: 12, textAlign: "left" }}>Patient</th>
                <th style={{ padding: 12, textAlign: "left" }}>MRN</th>
                <th style={{ padding: 12, textAlign: "left" }}>Test</th>
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
                      {item.status === "SIGNED" && (
                        <button
                          onClick={() => handleAcknowledge(item.id)}
                          style={{ marginRight: 8, padding: "4px 8px" }}
                        >
                          Acknowledge
                        </button>
                      )}
                      {item.status === "ACKNOWLEDGED" && (
                        <button
                          onClick={() => handleStart(item.id)}
                          style={{ marginRight: 8, padding: "4px 8px" }}
                        >
                          Start
                        </button>
                      )}
                      {item.status === "IN_PROGRESS" && (
                        <button
                          onClick={() => handleComplete(item.id)}
                          style={{ marginRight: 8, padding: "4px 8px" }}
                        >
                          Complete
                        </button>
                      )}
                      <Link href={`/app/encounters/${order.encounterId}`}>View</Link>
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

