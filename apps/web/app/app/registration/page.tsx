"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ui } from "@/lib/uiLabels";
import { fetchUpcomingFollowUps, type FollowUpRow } from "@/lib/followUpsApi";
import { CreateFollowUpModal } from "@/components/patient-chart";
import { useConnectivityStatus } from "@/lib/offline/useConnectivityStatus";

function formatDate(d: string | null | undefined) {
  return d ? new Date(d).toLocaleDateString("fr-FR") : "—";
}

export default function RegistrationPage() {
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpRow[]>([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(false);
  const [showAddFollowUp, setShowAddFollowUp] = useState(false);
  const { isOffline } = useConnectivityStatus();

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("medora_facility_id="))
      ?.split("=")[1];
    setFacilityId(cookieValue || null);
  }, []);

  const loadFollowUps = useCallback(async () => {
    if (!facilityId) return;
    setFollowUpsLoading(true);
    try {
      const from = new Date().toISOString().slice(0, 10);
      const to = new Date();
      to.setDate(to.getDate() + 14);
      const res = await fetchUpcomingFollowUps(facilityId, { from, to: to.toISOString().slice(0, 10), limit: 20 });
      setFollowUps(res.items ?? []);
    } catch {
      setFollowUps([]);
    } finally {
      setFollowUpsLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    loadFollowUps();
  }, [loadFollowUps]);

  const cardBase: React.CSSProperties = {
    padding: "18px 18px 18px 16px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.08)",
    textDecoration: "none",
    color: "#1a1a1a",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    boxShadow: "0 2px 8px rgba(21,101,192,0.08)",
    minHeight: 96,
  };

  return (
    <div>
      <h1 style={{ marginBottom: 8 }}>Accueil</h1>
      <p style={{ color: "#555", marginBottom: 20 }}>
        Inscription des patients, création de consultations et gestion des suivis à venir.
      </p>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ margin: "0 0 14px 0", fontSize: 17, color: "#37474f" }}>Actions rapides</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 14,
            maxWidth: 900,
          }}
        >
          <Link
            href="/app/patients?new=1"
            style={{
              ...cardBase,
              borderLeft: "4px solid #1565c0",
              background: "linear-gradient(145deg, #e3f2fd 0%, #fff 55%)",
            }}
          >
            <strong style={{ fontSize: 15 }}>Nouveau patient</strong>
            <span style={{ fontSize: 13, color: "#546e7a" }}>Créer une fiche patient</span>
          </Link>
          <Link
            href="/app/encounters"
            style={{
              ...cardBase,
              borderLeft: "4px solid #2e7d32",
              background: "linear-gradient(145deg, #e8f5e9 0%, #fff 55%)",
            }}
          >
            <strong style={{ fontSize: 15 }}>Nouvelle visite</strong>
            <span style={{ fontSize: 13, color: "#546e7a" }}>Liste des consultations ; création depuis la fiche patient</span>
          </Link>
          <Link
            href="/app/billing"
            style={{
              ...cardBase,
              borderLeft: "4px solid #ef6c00",
              background: "linear-gradient(145deg, #fff3e0 0%, #fff 55%)",
            }}
          >
            <strong style={{ fontSize: 15 }}>{ui.nav.billing}</strong>
            <span style={{ fontSize: 13, color: "#546e7a" }}>Facturation et dossiers financiers</span>
          </Link>
          <Link
            href="/app/fracture"
            style={{
              ...cardBase,
              borderLeft: "4px solid #ad1457",
              background: "linear-gradient(145deg, #fce4ec 0%, #fff 55%)",
            }}
          >
            <strong style={{ fontSize: 15 }}>{ui.nav.fracture}</strong>
            <span style={{ fontSize: 13, color: "#546e7a" }}>Module fracture (aperçu)</span>
          </Link>
        </div>
      </section>

      <div style={{ display: "grid", gap: 24, maxWidth: 720 }}>
        <section style={{ padding: 20, backgroundColor: "white", borderRadius: 8, border: "1px solid #ddd" }}>
          <h2 style={{ margin: "0 0 12px 0", fontSize: 18 }}>Patients et consultations</h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <Link
              href="/app/patients"
              style={{
                padding: "10px 20px",
                backgroundColor: "#1a1a1a",
                color: "white",
                borderRadius: 4,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Rechercher un patient
            </Link>
          </div>
        </section>

        <section style={{ padding: 20, backgroundColor: "white", borderRadius: 8, border: "1px solid #ddd" }}>
          <h2 style={{ margin: "0 0 12px 0", fontSize: 18 }}>Suivis à venir</h2>
          <p style={{ margin: "0 0 16px 0", fontSize: 14, color: "#333" }}>
            Consultez et gérez les rendez-vous de suivi par date.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <Link
              href="/app/follow-ups"
              style={{
                padding: "10px 20px",
                backgroundColor: "#1a1a1a",
                color: "white",
                borderRadius: 4,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 500,
                display: "inline-block",
              }}
            >
              Ouvrir les suivis
            </Link>
            {facilityId && (
              <button
                type="button"
                onClick={() => setShowAddFollowUp(true)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#fff",
                  color: "#1a1a1a",
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Ajouter un suivi
              </button>
            )}
          </div>
          {isOffline && (
            <p style={{ margin: "-6px 0 12px 0", fontSize: 12, color: "#8a4b08" }}>
              Données affichées depuis le cache local
            </p>
          )}
          {followUpsLoading ? (
            <p style={{ fontSize: 14, color: "#666" }}>Chargement…</p>
          ) : followUps.length === 0 ? (
            <p style={{ fontSize: 14, color: "#666" }}>Aucun suivi à venir sur les 14 prochains jours.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14 }}>
              {followUps.slice(0, 10).map((f) => (
                <li key={f.id} style={{ marginBottom: 6 }}>
                  <Link href={`/app/patients/${f.patientId}`} style={{ color: "#1a1a1a", fontWeight: 600 }}>
                    {f.patient?.firstName ?? ""} {f.patient?.lastName ?? ""}
                  </Link>
                  {" — "}
                  {formatDate(f.dueDate)}
                  {f.reason ? ` · ${f.reason}` : ""}
                  <Link href={`/app/patients/${f.patientId}`} style={{ marginLeft: 8, fontSize: 12 }}>
                    Voir le dossier
                  </Link>
                </li>
              ))}
              {followUps.length > 10 && (
                <li style={{ marginTop: 8 }}>
                  <Link href="/app/follow-ups">Voir tout ({followUps.length})</Link>
                </li>
              )}
            </ul>
          )}
        </section>
      </div>
      {showAddFollowUp && facilityId && (
        <CreateFollowUpModal
          facilityId={facilityId}
          onClose={() => setShowAddFollowUp(false)}
          onSuccess={() => {
            setShowAddFollowUp(false);
            void loadFollowUps();
          }}
        />
      )}
    </div>
  );
}

