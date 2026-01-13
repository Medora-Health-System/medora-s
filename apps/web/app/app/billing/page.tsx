"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/apiClient";
import Link from "next/link";

export default function BillingPage() {
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
      const data = await apiFetch("/billing/queue", { facilityId });
      setQueue(data || []);
    } catch (error) {
      console.error("Failed to load billing queue:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async (encounterId: string) => {
    if (!facilityId) return;
    try {
      // Placeholder - would call billing finalize endpoint
      alert("Billing finalized (placeholder)");
      loadQueue();
    } catch (error) {
      alert("Failed to finalize billing");
    }
  };

  return (
    <div>
      <h1>Billing Queue</h1>
      <p>Closed encounters requiring billing and coding.</p>
      {loading ? (
        <p>Loading...</p>
      ) : queue.length === 0 ? (
        <div style={{ marginTop: 24, padding: 16, backgroundColor: "white", borderRadius: 4 }}>
          <p>No encounters in billing queue.</p>
        </div>
      ) : (
        <div style={{ marginTop: 24 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: 12, textAlign: "left" }}>Patient</th>
                <th style={{ padding: 12, textAlign: "left" }}>MRN</th>
                <th style={{ padding: 12, textAlign: "left" }}>Encounter Type</th>
                <th style={{ padding: 12, textAlign: "left" }}>Discharged</th>
                <th style={{ padding: 12, textAlign: "left" }}>Orders</th>
                <th style={{ padding: 12, textAlign: "left" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((encounter) => (
                <tr key={encounter.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 12 }}>
                    {encounter.patient?.firstName} {encounter.patient?.lastName}
                  </td>
                  <td style={{ padding: 12 }}>{encounter.patient?.mrn}</td>
                  <td style={{ padding: 12 }}>{encounter.type}</td>
                  <td style={{ padding: 12 }}>
                    {encounter.dischargedAt
                      ? new Date(encounter.dischargedAt).toLocaleDateString()
                      : "-"}
                  </td>
                  <td style={{ padding: 12 }}>{encounter.orders?.length || 0}</td>
                  <td style={{ padding: 12 }}>
                    <button
                      onClick={() => handleFinalize(encounter.id)}
                      style={{ marginRight: 8, padding: "4px 8px" }}
                    >
                      Finalize
                    </button>
                    <Link href={`/app/encounters/${encounter.id}`}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

