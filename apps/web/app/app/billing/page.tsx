"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/apiClient";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { getEncounterTypeLabelFr, ui } from "@/lib/uiLabels";

export default function BillingPage() {
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

  const effectiveFacilityId = facilityId || facilityIdFromHook;

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

  const handleFinalize = async (_encounterId: string) => {
    if (!effectiveFacilityId) return;
    try {
      // Placeholder - would call billing finalize endpoint
      alert("Facturation enregistrée (fonctionnalité à finaliser).");
      loadQueue();
    } catch (error) {
      alert("Impossible de finaliser la facturation");
    }
  };

  if (!ready) {
    return (
      <div>
        <h1>File facturation</h1>
        <p>Consultations clôturées en attente de facturation et codification.</p>
        <p>{ui.common.loading}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>File facturation</h1>
      <p>Consultations clôturées en attente de facturation et codification.</p>
      {loading ? (
        <p>{ui.common.loading}</p>
      ) : queue.length === 0 ? (
        <div style={{ marginTop: 24, padding: 16, backgroundColor: "white", borderRadius: 4 }}>
          <p>Aucune consultation dans la file facturation.</p>
        </div>
      ) : (
        <div style={{ marginTop: 24 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.patient}</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.nir}</th>
                <th style={{ padding: 12, textAlign: "left" }}>Type de consultation</th>
                <th style={{ padding: 12, textAlign: "left" }}>Sortie</th>
                <th style={{ padding: 12, textAlign: "left" }}>Ordres</th>
                <th style={{ padding: 12, textAlign: "left" }}>{ui.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((encounter) => (
                <tr key={encounter.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 12 }}>
                    {encounter.patient?.firstName} {encounter.patient?.lastName}
                  </td>
                  <td style={{ padding: 12 }}>{encounter.patient?.mrn}</td>
                  <td style={{ padding: 12 }}>{getEncounterTypeLabelFr(encounter.type)}</td>
                  <td style={{ padding: 12 }}>
                    {encounter.dischargedAt
                      ? new Date(encounter.dischargedAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td style={{ padding: 12 }}>{encounter.orders?.length || 0}</td>
                  <td style={{ padding: 12 }}>
                    <button
                      onClick={() => handleFinalize(encounter.id)}
                      style={{ marginRight: 8, padding: "4px 8px" }}
                    >
                      Finaliser
                    </button>
                    <Link href={`/app/encounters/${encounter.id}`}>Voir</Link>
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

