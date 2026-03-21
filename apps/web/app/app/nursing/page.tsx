"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { fetchOpenEncounters } from "@/lib/clinicalWorklistApi";
import { OpenEncountersTable } from "@/components/clinical/OpenEncountersTable";
import { ui } from "@/lib/uiLabels";

const btn: React.CSSProperties = {
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
      setEncounters(await fetchOpenEncounters(facilityId));
    } catch {
      setEncounters([]);
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    if (ready && facilityId) loadEncounters();
  }, [ready, facilityId, loadEncounters]);

  if (!ready) {
    return <p>{ui.common.loading}</p>;
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Soins infirmiers</h1>
      <p style={{ color: "#555", maxWidth: 720, lineHeight: 1.5 }}>
        Accédez aux mêmes dossiers et consultations que le reste de l&apos;équipe clinique : dossier patient, signes vitaux et
        actions dans la consultation ouverte.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 20, marginBottom: 8 }}>
        <Link href="/app/patients" style={btn}>
          Patients à voir
        </Link>
        <Link href="/app/encounters" style={{ ...btn, backgroundColor: "#37474f" }}>
          Liste des consultations
        </Link>
        <Link href="/app/trackboard" style={{ ...btn, backgroundColor: "#455a64" }}>
          Tableau de bord des consultations
        </Link>
      </div>

      <h2 style={{ marginTop: 28, fontSize: 18 }}>Consultations ouvertes</h2>
      <p style={{ color: "#666", fontSize: 14, marginTop: 0 }}>
        Ouvrez le dossier pour le contexte complet, ou la consultation pour les signes vitaux et la suite des soins.
      </p>
      <OpenEncountersTable
        encounters={encounters}
        loading={loading}
        emptyMessage="Aucune consultation ouverte pour le moment. Utilisez « Patients à voir » pour trouver un patient et ouvrir une consultation."
      />
    </div>
  );
}
