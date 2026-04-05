"use client";

import React, { useMemo, useState, useEffect } from "react";
import { apiFetch } from "@/lib/apiClient";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { PharmacyAlertsCard } from "@/components/pharmacy/PharmacyAlertsCard";
import { formatAgeYearsSexFr } from "@/lib/patientDisplay";
import { getEncounterStatusBoardLabelFr, ui } from "@/lib/uiLabels";

type AcuityTier = "critical" | "monitoring" | "stable";

const ACUITY_BORDER: Record<AcuityTier, string> = {
  critical: "#ef4444",
  monitoring: "#fbbf24",
  stable: "#10b981",
};

const STATUS_BADGE_SOFT: Record<string, { bg: string; text: string; border: string }> = {
  OPEN: { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" },
  CLOSED: { bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" },
  CANCELLED: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
};

function acuityFromEsi(esi: number | null | undefined): AcuityTier {
  if (esi == null || Number.isNaN(esi)) return "stable";
  if (esi <= 1) return "critical";
  if (esi <= 3) return "monitoring";
  return "stable";
}

function patientInitials(p: { firstName?: string | null; lastName?: string | null } | null | undefined): string {
  const f = (p?.firstName ?? "").trim();
  const l = (p?.lastName ?? "").trim();
  const a = f.charAt(0) || "";
  const b = l.charAt(0) || f.charAt(1) || "";
  const s = (a + b).toUpperCase();
  return s || "?";
}

function fullPatientName(p: { firstName?: string | null; lastName?: string | null } | null | undefined): string {
  return `${(p?.firstName ?? "").trim()} ${(p?.lastName ?? "").trim()}`.trim() || ui.common.dash;
}

function physicianLabel(enc: {
  physicianAssigned?: { firstName?: string | null; lastName?: string | null } | null;
}): string {
  const p = enc.physicianAssigned;
  if (!p) return "";
  return `${(p.firstName ?? "").trim()} ${(p.lastName ?? "").trim()}`.trim();
}

function unitFromRoomLabel(roomLabel: string | null | undefined): string {
  const r = (roomLabel ?? "").trim();
  if (!r) return "";
  const part = r.split(/[-–/]/)[0]?.trim() ?? "";
  return part || r;
}

/** Trackboard API exposes `patient.mrn`; tolerate `nationalId` if present at runtime. */
function patientNirDisplay(patient: { mrn?: string | null; nationalId?: string | null } | null | undefined): string {
  const raw = (patient?.mrn ?? patient?.nationalId ?? "").trim();
  return raw || ui.common.dash;
}

function formatArrivalDateTime(iso: string | null | undefined): string {
  if (!iso) return ui.common.dash;
  try {
    return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return ui.common.dash;
  }
}

export default function TrackBoardPage() {
  const { facilityId: facilityIdFromHook, ready, canManagePharmacy } = useFacilityAndRoles();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [encounters, setEncounters] = useState<any[]>([]);
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
      const data = await apiFetch("/trackboard?status=OPEN", { facilityId });
      setEncounters(data || []);
    } catch (error) {
      console.error("Failed to load track board:", error);
      setFetchError("Impossible de charger le tableau de bord.");
    } finally {
      setLoading(false);
    }
  };

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
    return encounters.filter((encounter: any) => {
      const acuity = acuityFromEsi(encounter.triage?.esi);
      if (filterAcuity && acuity !== filterAcuity) return false;

      const unit = unitFromRoomLabel(encounter.roomLabel);
      if (filterUnit && unit !== filterUnit) return false;

      const phys = physicianLabel(encounter);
      if (filterPhysician && phys !== filterPhysician) return false;

      if (q) {
        const name = fullPatientName(encounter.patient).toLowerCase();
        const nir = String(encounter.patient?.mrn ?? encounter.patient?.nationalId ?? "")
          .trim()
          .toLowerCase();
        const cc = (encounter.triage?.chiefComplaint || encounter.chiefComplaint || "").toLowerCase();
        const room = (encounter.roomLabel ?? "").toLowerCase();
        const blob = `${name} ${nir} ${cc} ${room} ${phys.toLowerCase()}`;
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [encounters, search, filterAcuity, filterUnit, filterPhysician]);

  const effectiveFacilityId = facilityId || facilityIdFromHook || null;

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

  const statusSoft = (status: string) =>
    STATUS_BADGE_SOFT[status] ?? { bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" };

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
            .track-meta-block { border-top: none !important; padding-top: 0 !important; align-items: flex-end !important; text-align: right !important; width: auto !important; }
          }
        `,
          }}
        />

        <header style={{ marginBottom: 24 }}>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(1.35rem, 2.5vw, 1.65rem)",
              fontWeight: 600,
              color: "#0f172a",
            }}
          >
            Tableau de bord
          </h1>
          <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b" }}>Vue des consultations ouvertes</p>
        </header>

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
              type="search"
              aria-label="Recherche"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Patient, motif, salle…"
              style={{ ...inputBase, height: 40, fontSize: 14 }}
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
            <span style={filterLabel}>Statut (ESI)</span>
            <select
              value={filterAcuity}
              onChange={(e) => setFilterAcuity(e.target.value as "" | AcuityTier)}
              style={{ ...inputBase, cursor: "pointer", minWidth: 0 }}
            >
              <option value="">Tous</option>
              <option value="critical">Critique</option>
              <option value="monitoring">Surveillance</option>
              <option value="stable">Stable</option>
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
              {encounters.length === 0 ? "Aucune consultation en cours" : "Aucun résultat pour ces filtres"}
            </p>
            <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b" }}>
              {encounters.length === 0
                ? "Les consultations ouvertes apparaîtront ici."
                : "Ajustez la recherche ou les filtres."}
            </p>
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            {filteredEncounters.map((encounter: any) => {
              const acuity = acuityFromEsi(encounter.triage?.esi);
              const borderLeft = ACUITY_BORDER[acuity];
              const patient = encounter.patient;
              const cc = encounter.triage?.chiefComplaint || encounter.chiefComplaint || ui.common.dash;
              const esiDisplay = encounter.triage?.esi != null ? `ESI ${encounter.triage.esi}` : ui.common.dash;
              const room = encounter.roomLabel?.trim() || ui.common.dash;
              const phys = physicianLabel(encounter) || ui.common.dash;
              const soft = statusSoft(encounter.status);
              const nirLine = patientNirDisplay(patient);
              const arrivalDisplay = formatArrivalDateTime(encounter.createdAt ?? null);

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
                          <h2
                            style={{
                              margin: 0,
                              fontSize: 16,
                              fontWeight: 600,
                              color: "#0f172a",
                              lineHeight: 1.25,
                            }}
                          >
                            {fullPatientName(patient)}
                          </h2>
                          <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
                            <span style={{ fontWeight: 600, color: "#475569" }}>{ui.common.nir}</span> {nirLine}
                            {" · "}
                            <span style={{ fontWeight: 600, color: "#475569" }}>{ui.common.ageSex}</span>{" "}
                            {formatAgeYearsSexFr(
                              patient?.dob ?? null,
                              patient?.sexAtBirth ?? null,
                              patient?.sex ?? null
                            )}
                          </p>
                          <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#334155", lineHeight: 1.45 }}>
                            <span style={{ fontWeight: 600, color: "#64748b", fontSize: 12 }}>
                              {ui.common.chiefComplaintShort}
                            </span>
                            {" — "}
                            {cc}
                          </p>
                          <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                            <span style={{ fontWeight: 600, color: "#475569" }}>{ui.common.esiIndex}</span> {esiDisplay}
                            {" · "}
                            <span style={{ fontWeight: 600, color: "#475569" }}>{ui.common.arrival}</span> {arrivalDisplay}
                          </p>
                        </div>
                      </div>

                      {/* Room block — same pattern as Soins infirmiers */}
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
                        className="track-meta-block"
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
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                          <span style={{ fontWeight: 500, color: "#64748b", fontSize: 12 }}>{ui.common.physician} · </span>
                          {phys}
                        </p>
                        <p style={{ margin: 0, fontSize: 14, color: "#94a3b8" }}>
                          <span style={{ color: "#cbd5e1" }}>{ui.common.nurseAbbr}</span> {ui.common.dash}
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: 9999,
                              fontSize: 12,
                              fontWeight: 600,
                              backgroundColor: soft.bg,
                              color: soft.text,
                              border: `1px solid ${soft.border}`,
                            }}
                          >
                            {getEncounterStatusBoardLabelFr(encounter.status)}
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
