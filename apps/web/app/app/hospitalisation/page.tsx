"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { PharmacyAlertsCard } from "@/components/pharmacy/PharmacyAlertsCard";
import { formatAgeYearsSexFr } from "@/lib/patientDisplay";
import { getEncounterStatusBoardLabelFr, ui } from "@/lib/uiLabels";
import { fetchHospitalisationEncounters } from "@/lib/clinicalWorklistApi";

export default function HospitalisationBoardPage() {
  const { facilityId: facilityIdFromHook, ready, canManagePharmacy } = useFacilityAndRoles();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [encounters, setEncounters] = useState<any[]>([]);
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
    loadEncounters();
    const interval = setInterval(() => {
      loadEncounters();
    }, 10000);
    return () => clearInterval(interval);
  }, [ready, facilityId]);

  const loadEncounters = async () => {
    if (!facilityId) return;
    setLoading(true);
    try {
      const data = await fetchHospitalisationEncounters(facilityId);
      setEncounters(data || []);
    } catch (error) {
      console.error("Failed to load hospitalisation board:", error);
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

  const formatTime = (date: string | null) => {
    if (!date) return ui.common.dash;
    return new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const effectiveFacilityId = facilityId || facilityIdFromHook || null;

  return (
    <div>
      {ready && canManagePharmacy && effectiveFacilityId && (
        <PharmacyAlertsCard facilityId={effectiveFacilityId} />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1>Hospitalisation</h1>
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
          {loading ? ui.common.loading : ui.common.refresh}
        </button>
      </div>

      {loading && encounters.length === 0 ? (
        <p>{ui.common.loadingEncounters}</p>
      ) : encounters.length === 0 ? (
        <div style={{ padding: 24, backgroundColor: "white", borderRadius: 4, textAlign: "center" }}>
          <p>Aucun patient hospitalisé avec une consultation ouverte.</p>
        </div>
      ) : (
        <div style={{ backgroundColor: "white", borderRadius: 4, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>{ui.common.name}</th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>{ui.common.ageSex}</th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>{ui.common.chiefComplaintShort}</th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>{ui.common.esiIndex}</th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>{ui.common.room}</th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>{ui.common.physician}</th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>{ui.common.nurseAbbr}</th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>{ui.common.status}</th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>{ui.common.arrival}</th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>{ui.common.actions}</th>
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
                    {formatAgeYearsSexFr(
                      encounter.patient?.dob ?? null,
                      encounter.patient?.sexAtBirth ?? null,
                      encounter.patient?.sex ?? null
                    )}
                  </td>
                  <td style={{ padding: 12 }}>
                    {encounter.triage?.chiefComplaint || encounter.chiefComplaint || ui.common.dash}
                  </td>
                  <td style={{ padding: 12 }}>
                    {encounter.triage?.esi ? `ESI ${encounter.triage.esi}` : ui.common.dash}
                  </td>
                  <td style={{ padding: 12 }}>{encounter.roomLabel?.trim() || ui.common.dash}</td>
                  <td style={{ padding: 12 }}>
                    {encounter.physicianAssigned
                      ? `${encounter.physicianAssigned.firstName} ${encounter.physicianAssigned.lastName}`.trim()
                      : ui.common.dash}
                  </td>
                  <td style={{ padding: 12 }}>{ui.common.dash}</td>
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
                      {getEncounterStatusBoardLabelFr(encounter.status)}
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>{formatTime(encounter.createdAt)}</td>
                  <td style={{ padding: 12 }}>
                    <Link
                      href={`/app/encounters/${encounter.id}`}
                      style={{ color: "#2563eb", textDecoration: "none" }}
                    >
                      {ui.common.view}
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
