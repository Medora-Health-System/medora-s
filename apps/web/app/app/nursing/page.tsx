"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { fetchOpenEncounters, fetchOrdersForEncounter } from "@/lib/clinicalWorklistApi";
import { countPendingNurseMedicationLines } from "@/lib/nurseMedicationWorkload";
import { OpenEncountersTable } from "@/components/clinical/OpenEncountersTable";
import { ui } from "@/lib/uiLabels";

const linkRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  marginBottom: 24,
};

const linkStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 18px",
  backgroundColor: "#1a1a1a",
  color: "white",
  borderRadius: 6,
  textDecoration: "none",
  fontSize: 14,
  fontWeight: 500,
};

export default function NursingPage() {
  const { facilityId, ready } = useFacilityAndRoles();
  const [encounters, setEncounters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEncounters = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    try {
      const open = await fetchOpenEncounters(facilityId);
      const withWorkload = await Promise.all(
        open.map(async (enc: { id: string }) => {
          try {
            const orders = await fetchOrdersForEncounter(facilityId, enc.id);
            return {
              ...enc,
              pendingMedicationCount: countPendingNurseMedicationLines(orders),
            };
          } catch {
            return { ...enc };
          }
        })
      );
      setEncounters(withWorkload);
    } catch {
      setEncounters([]);
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    if (!ready || !facilityId) return;
    void loadEncounters();
  }, [ready, facilityId, loadEncounters]);

  if (!ready) {
    return <p>{ui.common.loading}</p>;
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <h1 style={{ marginTop: 0 }}>Soins infirmiers</h1>
        <button
          type="button"
          onClick={() => void loadEncounters()}
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

      <p style={{ color: "#555", maxWidth: 720, lineHeight: 1.5, marginBottom: 20 }}>
        Accès rapide aux consultations ouvertes du jour pour la suite des soins au chevet du patient.
      </p>

      <div style={linkRow}>
        <Link href="/app/patients" style={linkStyle}>
          Patients à voir
        </Link>
        <Link href="/app/encounters" style={{ ...linkStyle, backgroundColor: "#37474f" }}>
          Liste des consultations
        </Link>
        <Link href="/app/trackboard" style={{ ...linkStyle, backgroundColor: "#455a64" }}>
          Tableau de bord des consultations
        </Link>
      </div>

      <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 18 }}>Consultations ouvertes</h2>
      <p style={{ color: "#666", fontSize: 14, marginTop: 0, marginBottom: 12 }}>
        Ouvrez le dossier patient ou la consultation depuis le tableau ci-dessous.
      </p>

      <OpenEncountersTable
        encounters={encounters}
        loading={loading}
        emptyMessage="Aucune consultation ouverte pour le moment. Utilisez le tableau clinique ou la liste des patients pour retrouver une consultation."
        showMarLink
      />
    </div>
  );
}
