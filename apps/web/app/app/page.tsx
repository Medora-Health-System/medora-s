"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import Link from "next/link";

export default function TrackBoardPage() {
  const router = useRouter();
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
    loadEncounters();
    const interval = setInterval(() => {
      loadEncounters();
    }, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [facilityId]);

  const loadEncounters = async () => {
    if (!facilityId) return;
    setLoading(true);
    try {
      const data = await apiFetch("/api/backend/trackboard?status=OPEN", { facilityId });
      setEncounters(data || []);
    } catch (error) {
      console.error("Failed to load track board:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "#22c55e";
      case "CLOSED":
        return "#6b7280";
      case "CANCELLED":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getAge = (dob: string | null) => {
    if (!dob) return "N/A";
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatTime = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1>Track Board</h1>
        <button
          onClick={loadEncounters}
          disabled={loading}
          style={{
            padding: "8px 16px",
            backgroundColor: "#1a1a1a",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 14,
          }}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {loading && encounters.length === 0 ? (
        <p>Loading encounters...</p>
      ) : encounters.length === 0 ? (
        <div style={{ padding: 24, backgroundColor: "white", borderRadius: 4, textAlign: "center" }}>
          <p>No active encounters</p>
        </div>
      ) : (
        <div style={{ backgroundColor: "white", borderRadius: 4, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Name</th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Age/Sex</th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Chief Complaint</th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>ESI</th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Room</th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Provider</th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>RN</th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Status</th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Arrived</th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {encounters.map((encounter) => (
                <tr
                  key={encounter.id}
                  style={{
                    borderBottom: "1px solid #eee",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "white";
                  }}
                >
                  <td style={{ padding: 12 }}>
                    {encounter.patient?.firstName} {encounter.patient?.lastName}
                  </td>
                  <td style={{ padding: 12 }}>
                    {getAge(encounter.patient?.dob)}/{encounter.patient?.sexAtBirth || "N/A"}
                  </td>
                  <td style={{ padding: 12 }}>
                    {encounter.triage?.chiefComplaint || encounter.chiefComplaint || "-"}
                  </td>
                  <td style={{ padding: 12 }}>
                    {encounter.triage?.esi ? `ESI ${encounter.triage.esi}` : "-"}
                  </td>
                  <td style={{ padding: 12 }}>-</td>
                  <td style={{ padding: 12 }}>{encounter.providerId ? "Assigned" : "-"}</td>
                  <td style={{ padding: 12 }}>-</td>
                  <td style={{ padding: 12 }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 500,
                        backgroundColor: getStatusColor(encounter.status),
                        color: "white",
                      }}
                    >
                      {encounter.status}
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>{formatTime(encounter.createdAt)}</td>
                  <td style={{ padding: 12 }}>
                    <Link
                      href={`/app/encounters/${encounter.id}`}
                      style={{ color: "#2563eb", textDecoration: "none" }}
                    >
                      View
                    </Link>
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
