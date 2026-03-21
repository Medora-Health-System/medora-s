"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { fetchPatientVaccinations } from "@/lib/publicHealthApi";

export function PatientVaccinationsTab({ patientId, facilityId }: { patientId: string; facilityId: string }) {
  const [vaccinations, setVaccinations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!facilityId) return;
    setLoading(true);
    fetchPatientVaccinations(facilityId, patientId)
      .then(setVaccinations)
      .catch(() => setVaccinations([]))
      .finally(() => setLoading(false));
  }, [facilityId, patientId]);

  const formatDate = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

  if (loading) return <div style={{ padding: 12, color: "#666" }}>Chargement des vaccinations…</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Vaccinations</h3>
        <Link href="/app/public-health/vaccinations" style={{ fontSize: 14, color: "#1a1a1a" }}>
          Enregistrer une vaccination →
        </Link>
      </div>
      {vaccinations.length === 0 ? (
        <div style={{ padding: 20, textAlign: "center", color: "#666" }}>
          Aucune vaccination enregistrée.{" "}
          <Link href="/app/public-health/vaccinations">Enregistrer une vaccination</Link>.
        </div>
      ) : (
        <div style={{ border: "1px solid #e0e0e0", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <th style={{ padding: 12, textAlign: "left" }}>Vaccin</th>
                <th style={{ padding: 12, textAlign: "left" }}>Dose</th>
                <th style={{ padding: 12, textAlign: "left" }}>Administré le</th>
                <th style={{ padding: 12, textAlign: "left" }}>Prochaine dose</th>
                <th style={{ padding: 12, textAlign: "left" }}>Lot</th>
              </tr>
            </thead>
            <tbody>
              {vaccinations.map((v) => (
                <tr key={v.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: 12 }}>{v.vaccineCatalog?.name ?? "—"}</td>
                  <td style={{ padding: 12 }}>{v.doseNumber ?? "—"}</td>
                  <td style={{ padding: 12 }}>{formatDate(v.administeredAt)}</td>
                  <td style={{ padding: 12 }}>{formatDate(v.nextDueAt)}</td>
                  <td style={{ padding: 12 }}>{v.lotNumber ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
