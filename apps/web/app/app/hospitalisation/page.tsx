"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { PharmacyAlertsCard } from "@/components/pharmacy/PharmacyAlertsCard";
import { formatAgeYearsSexFr } from "@/lib/patientDisplay";
import { ui } from "@/lib/uiLabels";
import { fetchHospitalisationEncounters } from "@/lib/clinicalWorklistApi";
import type { HospitalisationBoardEncounterRow } from "@/lib/hospitalisationBoardTypes";

type AcuityTier = "critical" | "monitoring" | "stable";

const ACUITY_LABEL_FR: Record<AcuityTier, string> = {
  critical: "Critique",
  monitoring: "Surveillance",
  stable: "Stable",
};

const ACUITY_BORDER: Record<AcuityTier, string> = {
  critical: "#ef4444",
  monitoring: "#fbbf24",
  stable: "#10b981",
};

const ACUITY_BADGE_BG: Record<AcuityTier, string> = {
  critical: "#fef2f2",
  monitoring: "#fffbeb",
  stable: "#ecfdf5",
};

const ACUITY_BADGE_TEXT: Record<AcuityTier, string> = {
  critical: "#991b1b",
  monitoring: "#92400e",
  stable: "#065f46",
};

function acuityFromEsi(esi: number | null | undefined): AcuityTier {
  if (esi == null || Number.isNaN(esi)) return "stable";
  if (esi <= 1) return "critical";
  if (esi <= 3) return "monitoring";
  return "stable";
}

function patientInitials(p: HospitalisationBoardEncounterRow["patient"]): string {
  const f = (p?.firstName ?? "").trim();
  const l = (p?.lastName ?? "").trim();
  const a = f.charAt(0) || "";
  const b = l.charAt(0) || f.charAt(1) || "";
  const s = (a + b).toUpperCase();
  return s || "?";
}

function fullPatientName(p: HospitalisationBoardEncounterRow["patient"]): string {
  return `${(p?.firstName ?? "").trim()} ${(p?.lastName ?? "").trim()}`.trim() || ui.common.dash;
}

function physicianLabel(enc: HospitalisationBoardEncounterRow): string {
  const p = enc.physicianAssigned;
  if (!p) return "";
  return `${(p.firstName ?? "").trim()} ${(p.lastName ?? "").trim()}`.trim();
}

/** Heuristic « unité » from room label when API has no separate unit field. */
function unitFromRoomLabel(roomLabel: string | null | undefined): string {
  const r = (roomLabel ?? "").trim();
  if (!r) return "";
  const part = r.split(/[-–/]/)[0]?.trim() ?? "";
  return part || r;
}

export default function HospitalisationBoardPage() {
  const { facilityId: facilityIdFromHook, ready, canManagePharmacy } = useFacilityAndRoles();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [encounters, setEncounters] = useState<HospitalisationBoardEncounterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [filterAcuity, setFilterAcuity] = useState<"" | AcuityTier>("");
  const [filterPhysician, setFilterPhysician] = useState("");

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
    setFetchError(null);
    try {
      const data = await fetchHospitalisationEncounters(facilityId);
      setEncounters(data || []);
    } catch (error) {
      console.error("Failed to load hospitalisation board:", error);
      setFetchError("Impossible de charger la liste.");
    } finally {
      setLoading(false);
    }
  };

  const effectiveFacilityId = facilityId || facilityIdFromHook || null;

  const unitOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of encounters) {
      const u = unitFromRoomLabel(e.roomLabel);
      if (u) set.add(u);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [encounters]);

  const physicianOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of encounters) {
      const pl = physicianLabel(e);
      if (pl) set.add(pl);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [encounters]);

  const filteredEncounters = useMemo(() => {
    const q = search.trim().toLowerCase();
    return encounters.filter((encounter) => {
      const acuity = acuityFromEsi(encounter.triage?.esi);
      if (filterAcuity && acuity !== filterAcuity) return false;

      const unit = unitFromRoomLabel(encounter.roomLabel);
      if (filterUnit && unit !== filterUnit) return false;

      const phys = physicianLabel(encounter);
      if (filterPhysician && phys !== filterPhysician) return false;

      if (q) {
        const name = fullPatientName(encounter.patient).toLowerCase();
        const cc = (
          encounter.triage?.chiefComplaint ||
          encounter.chiefComplaint ||
          ""
        ).toLowerCase();
        const room = (encounter.roomLabel ?? "").toLowerCase();
        const blob = `${name} ${cc} ${room} ${phys.toLowerCase()}`;
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [encounters, search, filterAcuity, filterUnit, filterPhysician]);

  const formatTime = (date: string | null) => {
    if (!date) return ui.common.dash;
    return new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const inputBase: React.CSSProperties = {
    height: 40,
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    backgroundColor: "#fff",
    padding: "0 12px",
    fontSize: 13,
    color: "#0f172a",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
    width: "100%",
    boxSizing: "border-box" as const,
  };

  const filterLabel: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: "#64748b",
    marginBottom: 3,
    letterSpacing: "0.01em",
  };

  return (
    <div style={{ minHeight: "calc(100vh - 48px)", backgroundColor: "#f8fafc", padding: "0 0 8px 0" }}>
      {ready && canManagePharmacy && effectiveFacilityId && (
        <div style={{ marginBottom: 16 }}>
          <PharmacyAlertsCard facilityId={effectiveFacilityId} />
        </div>
      )}

      <div style={{ maxWidth: 1152, margin: "0 auto" }}>
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @media (min-width: 640px) {
            .hosp-meta-block { border-top: none !important; padding-top: 0 !important; align-items: flex-end !important; text-align: right !important; width: auto !important; }
          }
        `,
          }}
        />
        <header
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: "clamp(1.35rem, 2.5vw, 1.65rem)", fontWeight: 600, color: "#0f172a" }}>
              Hospitalisation
            </h1>
            <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b" }}>Vue des patients hospitalisés</p>
          </div>
        </header>

        {/* Barre unique : recherche à gauche, filtres compacts, actions à droite (V0) */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "flex-end",
            gap: 10,
            marginBottom: 28,
          }}
        >
          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            <span style={{ ...filterLabel, marginBottom: 3 }}>Recherche</span>
            <input
              id="hosp-board-search"
              type="search"
              aria-label="Recherche"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Patient, motif, salle…"
              style={{
                ...inputBase,
                height: 40,
                fontSize: 14,
              }}
            />
          </div>

          <div style={{ flex: "0 0 auto", width: 124 }}>
            <span style={filterLabel}>Unité</span>
            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              style={{ ...inputBase, cursor: "pointer", minWidth: 0 }}
            >
              <option value="">Toutes</option>
              {unitOptions.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: "0 0 auto", width: 128 }}>
            <span style={filterLabel}>Statut</span>
            <select
              value={filterAcuity}
              onChange={(e) => setFilterAcuity(e.target.value as "" | AcuityTier)}
              style={{ ...inputBase, cursor: "pointer", minWidth: 0 }}
            >
              <option value="">Tous</option>
              <option value="critical">{ACUITY_LABEL_FR.critical}</option>
              <option value="monitoring">{ACUITY_LABEL_FR.monitoring}</option>
              <option value="stable">{ACUITY_LABEL_FR.stable}</option>
            </select>
          </div>

          <div style={{ flex: "0 1 160px", minWidth: 140 }}>
            <span style={filterLabel}>Médecin</span>
            <select
              value={filterPhysician}
              onChange={(e) => setFilterPhysician(e.target.value)}
              style={{ ...inputBase, cursor: "pointer", minWidth: 0 }}
            >
              <option value="">Tous</option>
              {physicianOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 8, marginLeft: "auto" }}>
            <button
              type="button"
              onClick={loadEncounters}
              disabled={loading}
              style={{
                height: 40,
                padding: "0 14px",
                backgroundColor: "#fff",
                color: "#334155",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: 13,
                fontWeight: 500,
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
                whiteSpace: "nowrap",
              }}
            >
              {loading ? ui.common.loading : ui.common.refresh}
            </button>
            <button
              type="button"
              disabled
              title="À utiliser depuis la fiche consultation du patient (pas depuis le tableau)."
              aria-disabled="true"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: 40,
                padding: "0 16px",
                backgroundColor: "#f1f5f9",
                color: "#64748b",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 600,
                cursor: "not-allowed",
                whiteSpace: "nowrap",
              }}
            >
              Sortie patient
            </button>
          </div>
        </div>

        {fetchError ? (
          <div
            style={{
              borderRadius: 16,
              border: "1px solid #fecaca",
              backgroundColor: "#fff",
              padding: 40,
              textAlign: "center",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
            }}
          >
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#0f172a" }}>{fetchError}</p>
            <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b" }}>Vérifiez la connexion et réessayez.</p>
            <button
              type="button"
              onClick={() => void loadEncounters()}
              style={{
                marginTop: 24,
                padding: "10px 18px",
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                backgroundColor: "#fff",
                fontSize: 14,
                fontWeight: 500,
                color: "#0f172a",
                cursor: "pointer",
              }}
            >
              Réessayer
            </button>
          </div>
        ) : loading && encounters.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  borderRadius: 16,
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#fff",
                  padding: 16,
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
                }}
              >
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", backgroundColor: "#f1f5f9" }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ height: 16, width: "40%", borderRadius: 4, backgroundColor: "#f1f5f9" }} />
                    <div style={{ height: 12, width: "25%", borderRadius: 4, backgroundColor: "#f1f5f9" }} />
                    <div style={{ height: 12, width: "70%", borderRadius: 4, backgroundColor: "#f1f5f9" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredEncounters.length === 0 ? (
          <div
            style={{
              borderRadius: 16,
              border: "1px dashed #cbd5e1",
              backgroundColor: "rgba(255,255,255,0.9)",
              padding: "48px 24px",
              textAlign: "center",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
            }}
          >
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#334155" }}>
              {encounters.length === 0
                ? "Aucun patient hospitalisé avec une consultation ouverte."
                : "Aucun patient ne correspond aux filtres."}
            </p>
            <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b" }}>
              {encounters.length === 0
                ? "Les admissions ouvertes apparaîtront ici."
                : "Ajustez la recherche ou les filtres."}
            </p>
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            {filteredEncounters.map((encounter) => {
              const acuity = acuityFromEsi(encounter.triage?.esi);
              const borderLeft = ACUITY_BORDER[acuity];
              const patient = encounter.patient;
              const cc =
                encounter.triage?.chiefComplaint || encounter.chiefComplaint || ui.common.dash;
              const esiDisplay = encounter.triage?.esi != null ? `ESI ${encounter.triage.esi}` : ui.common.dash;
              const room = encounter.roomLabel?.trim() || ui.common.dash;
              const phys = physicianLabel(encounter) || ui.common.dash;

              return (
                <li key={encounter.id}>
                  <article
                    style={{
                      overflow: "hidden",
                      borderRadius: 16,
                      border: "1px solid #e2e8f0",
                      backgroundColor: "#fff",
                      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
                      borderLeftWidth: 4,
                      borderLeftStyle: "solid",
                      borderLeftColor: borderLeft,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 16,
                        padding: 16,
                        alignItems: "stretch",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ display: "flex", minWidth: 0, flex: "1 1 220px", gap: 16 }}>
                        <div
                          aria-hidden
                          style={{
                            flexShrink: 0,
                            width: 44,
                            height: 44,
                            borderRadius: "50%",
                            backgroundColor: "#f1f5f9",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#334155",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          {patientInitials(patient)}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#0f172a", lineHeight: 1.25 }}>
                            {fullPatientName(patient)}
                          </h2>
                          <p style={{ margin: "4px 0 0 0", fontSize: 14, color: "#64748b" }}>
                            {formatAgeYearsSexFr(
                              patient?.dob ?? null,
                              patient?.sexAtBirth ?? null,
                              patient?.sex ?? null
                            )}
                          </p>
                          <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#334155", lineHeight: 1.45 }}>{cc}</p>
                          <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#64748b" }}>
                            <span style={{ fontWeight: 600, color: "#475569" }}>{ui.common.esiIndex}</span> {esiDisplay}
                            {" · "}
                            <span style={{ fontWeight: 600, color: "#475569" }}>{ui.common.arrival}</span>{" "}
                            {formatTime(encounter.createdAt ?? null)}
                          </p>
                        </div>
                      </div>

                      {/* Bloc salle — même motif que Soins infirmiers / Tableau de bord */}
                      <div
                        style={{
                          flex: "0 0 auto",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: 104,
                          alignSelf: "center",
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            minWidth: 96,
                            maxWidth: 140,
                            padding: "12px 14px",
                            borderRadius: 14,
                            border: "1px solid #bae6fd",
                            backgroundColor: "#f0f9ff",
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                              color: "#0369a1",
                              marginBottom: 4,
                            }}
                          >
                            {ui.common.room}
                          </div>
                          <div
                            style={{
                              fontSize: 22,
                              fontWeight: 700,
                              lineHeight: 1.15,
                              color: "#0c4a6e",
                              fontVariantNumeric: "tabular-nums",
                              wordBreak: "break-word",
                            }}
                          >
                            {room}
                          </div>
                        </div>
                      </div>

                      <div
                        className="hosp-meta-block"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          alignItems: "flex-start",
                          flexShrink: 0,
                          minWidth: 200,
                          borderTop: "1px solid #f1f5f9",
                          paddingTop: 12,
                          width: "100%",
                        }}
                      >
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{phys}</p>
                        <p style={{ margin: 0, fontSize: 14, color: "#94a3b8" }}>
                          <span style={{ color: "#cbd5e1" }}>Inf.</span> {ui.common.dash}
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: 9999,
                              fontSize: 12,
                              fontWeight: 600,
                              backgroundColor: ACUITY_BADGE_BG[acuity],
                              color: ACUITY_BADGE_TEXT[acuity],
                              border: `1px solid ${acuity === "critical" ? "#fecaca" : acuity === "monitoring" ? "#fde68a" : "#a7f3d0"}`,
                            }}
                          >
                            {ACUITY_LABEL_FR[acuity]}
                          </span>
                          <Link
                            href={`/app/encounters/${encounter.id}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "6px 14px",
                              borderRadius: 10,
                              border: "1px solid #bfdbfe",
                              backgroundColor: "#eff6ff",
                              color: "#1d4ed8",
                              fontSize: 14,
                              fontWeight: 600,
                              textDecoration: "none",
                            }}
                          >
                            {ui.common.view}
                          </Link>
                          <Link
                            href={`/app/encounters/${encounter.id}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "6px 14px",
                              borderRadius: 10,
                              border: "1px solid #cbd5e1",
                              backgroundColor: "#fff",
                              color: "#475569",
                              fontSize: 14,
                              fontWeight: 600,
                              textDecoration: "none",
                            }}
                            aria-label="Ouvrir la consultation pour accéder au dossier de sortie"
                          >
                            Sortie
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
