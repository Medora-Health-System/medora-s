"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { fetchOpenEncounters } from "@/lib/clinicalWorklistApi";
import { OpenEncountersTable } from "@/components/clinical/OpenEncountersTable";
import { ui } from "@/lib/uiLabels";

export default function EncountersPage() {
  const { facilityId, ready } = useFacilityAndRoles();
  const [encounters, setEncounters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
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
    if (ready && facilityId) load();
  }, [ready, facilityId, load]);

  if (!ready) return <p>{ui.common.loading}</p>;

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Consultations</h1>
      <p style={{ color: "#555", maxWidth: 720 }}>
        Liste partagée infirmier / médecin : chaque ligne mène au dossier patient ou à la consultation pour documenter et
        agir.
      </p>
      <p style={{ marginTop: 12 }}>
        <Link href="/app/patients" style={{ color: "#1565c0", fontWeight: 500 }}>
          ← Retour aux patients
        </Link>
      </p>

      <h2 style={{ marginTop: 24, fontSize: 18 }}>Consultations ouvertes</h2>
      <OpenEncountersTable
        encounters={encounters}
        loading={loading}
        emptyMessage="Aucune consultation ouverte. Créez une consultation depuis la fiche d&apos;un patient."
      />
    </div>
  );
}
