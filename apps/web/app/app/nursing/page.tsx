"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/apiClient";
import Link from "next/link";

export default function NursingPage() {
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [encounters, setEncounters] = useState<any[]>([]);
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
    // Load open encounters for nursing workflow
    loadEncounters();
  }, [facilityId]);

  const loadEncounters = async () => {
    if (!facilityId) return;
    setLoading(true);
    try {
      // For now, we'll need to add an endpoint for open encounters
      // For now, show a placeholder
      setEncounters([]);
    } catch (error) {
      console.error("Failed to load encounters:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Nursing</h1>
      <p>Nursing workflow and patient care management.</p>
      {loading ? (
        <p>Loading...</p>
      ) : encounters.length === 0 ? (
        <div style={{ marginTop: 24, padding: 16, backgroundColor: "white", borderRadius: 4 }}>
          <p>No open encounters requiring nursing attention.</p>
        </div>
      ) : (
        <div style={{ marginTop: 24 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: 12, textAlign: "left" }}>Patient</th>
                <th style={{ padding: 12, textAlign: "left" }}>MRN</th>
                <th style={{ padding: 12, textAlign: "left" }}>Type</th>
                <th style={{ padding: 12, textAlign: "left" }}>Status</th>
                <th style={{ padding: 12, textAlign: "left" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {encounters.map((encounter) => (
                <tr key={encounter.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 12 }}>
                    {encounter.patient?.firstName} {encounter.patient?.lastName}
                  </td>
                  <td style={{ padding: 12 }}>{encounter.patient?.mrn}</td>
                  <td style={{ padding: 12 }}>{encounter.type}</td>
                  <td style={{ padding: 12 }}>{encounter.status}</td>
                  <td style={{ padding: 12 }}>
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

