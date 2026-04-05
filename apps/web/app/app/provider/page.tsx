"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { fetchOpenEncounters } from "@/lib/clinicalWorklistApi";
import { getEncounterStatusLabelFr, getEncounterTypeLabelFr, ui } from "@/lib/uiLabels";

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
  return (a + b).toUpperCase() || "?";
}

function fullPatientName(p: { firstName?: string | null; lastName?: string | null } | null | undefined): string {
  return `${(p?.firstName ?? "").trim()} ${(p?.lastName ?? "").trim()}`.trim() || ui.common.dash;
}

function patientNirDisplay(patient: { mrn?: string | null; nationalId?: string | null } | null | undefined): string {
  const raw = (patient?.mrn ?? patient?.nationalId ?? "").trim();
  return raw || ui.common.dash;
}

function physicianLabel(enc: {
  physicianAssigned?: { firstName?: string | null; lastName?: string | null } | null;
}): string {
  const p = enc.physicianAssigned;
  if (!p) return "";
  return `${(p.firstName ?? "").trim()} ${(p.lastName ?? "").trim()}`.trim();
}

function formatArrivalDateTime(iso: string | null | undefined): string {
  if (!iso) return ui.common.dash;
  try {
    return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return ui.common.dash;
  }
}

function statusSoft(status: string) {
  return STATUS_BADGE_SOFT[status] ?? { bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" };
}

type EncounterRow = {
  id: string;
  type?: string;
  status?: string;
  createdAt?: string;
  roomLabel?: string | null;
  triage?: { esi?: number | null } | null;
  physicianAssigned?: { firstName?: string | null; lastName?: string | null } | null;
  patient?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    mrn?: string | null;
    nationalId?: string | null;
  };
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

const quickLink: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 14px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  backgroundColor: "#fff",
  color: "#334155",
  fontSize: 13,
  fontWeight: 500,
  textDecoration: "none",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
};

export default function ProviderPage() {
  const { facilityId: facilityIdFromHook, ready } = useFacilityAndRoles();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [encounters, setEncounters] = useState<EncounterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterRoom, setFilterRoom] = useState("");
  const [filterPhysician, setFilterPhysician] = useState("");

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("medora_facility_id="))
      ?.split("=")[1];
    setFacilityId(cookieValue || facilityIdFromHook || null);
  }, [facilityIdFromHook]);

  const effectiveFacilityId = facilityId || facilityIdFromHook || null;

  const loadEncounters = useCallback(async () => {
    if (!effectiveFacilityId) return;
    setLoading(true);
    setFetchError(null);
    try {
      const open = await fetchOpenEncounters(effectiveFacilityId);
      setEncounters(Array.isArray(open) ? open : []);
    } catch {
      setFetchError("Impossible de charger les consultations.");
      setEncounters([]);
    } finally {
      setLoading(false);
    }
  }, [effectiveFacilityId]);

  useEffect(() => {
    if (!ready || !effectiveFacilityId) return;
    void loadEncounters();
  }, [ready, effectiveFacilityId, loadEncounters]);

  const statusOptions = useMemo(() => {
    const s = new Set<string>();
    for (const e of encounters) {
      if (e.status) s.add(e.status);
    }
    return Array.from(s).sort();
  }, [encounters]);

  const typeOptions = useMemo(() => {
    const s = new Set<string>();
    for (const e of encounters) {
      if (e.type) s.add(e.type);
    }
    return Array.from(s).sort();
  }, [encounters]);

  const roomOptions = useMemo(() => {
    const s = new Set<string>();
    for (const e of encounters) {
      const r = e.roomLabel?.trim();
      if (r) s.add(r);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, "fr"));
  }, [encounters]);

  const physicianOptions = useMemo(() => {
    const s = new Set<string>();
    for (const e of encounters) {
      const pl = physicianLabel(e);
      if (pl) s.add(pl);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, "fr"));
  }, [encounters]);

  const filteredEncounters = useMemo(() => {
    const q = search.trim().toLowerCase();
    return encounters.filter((encounter) => {
      if (filterStatus && encounter.status !== filterStatus) return false;
      if (filterType && encounter.type !== filterType) return false;
      const room = encounter.roomLabel?.trim() || "";
      if (filterRoom && room !== filterRoom) return false;
      const phys = physicianLabel(encounter);
      if (filterPhysician && phys !== filterPhysician) return false;

      if (q) {
        const name = fullPatientName(encounter.patient).toLowerCase();
        const nir = String(encounter.patient?.mrn ?? encounter.patient?.nationalId ?? "")
          .trim()
          .toLowerCase();
        const typeFr = (encounter.type ? getEncounterTypeLabelFr(encounter.type) : "").toLowerCase();
        const blob = `${name} ${nir} ${room.toLowerCase()} ${phys.toLowerCase()} ${typeFr}`;
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [encounters, search, filterStatus, filterType, filterRoom, filterPhysician]);

  if (!ready) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ margin: 0, color: "#64748b" }}>{ui.common.loading}</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "calc(100vh - 48px)", backgroundColor: "#f8fafc", padding: "0 0 8px 0" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto" }}>
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @media (min-width: 640px) {
            .provider-meta-block { border-top: none !important; padding-top: 0 !important; align-items: flex-end !important; text-align: right !important; width: auto !important; }
          }
        `,
          }}
        />

        <header style={{ marginBottom: 20 }}>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(1.35rem, 2.5vw, 1.65rem)",
              fontWeight: 600,
              color: "#0f172a",
            }}
          >
            Médecin
          </h1>
          <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b", maxWidth: 720, lineHeight: 1.55 }}>
            Point d&apos;entrée vers le dossier partagé : évaluation médicale, diagnostics et ordonnances se font dans la
            même consultation que pour les soins infirmiers.
          </p>
        </header>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "flex-end",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            <span style={{ ...filterLabel, marginBottom: 3 }}>Recherche</span>
            <input
              type="search"
              aria-label="Recherche"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Patient, NIR, salle…"
              style={{ ...inputBase, height: 40, fontSize: 14 }}
            />
          </div>

          <div style={{ flex: "0 0 auto", width: 120 }}>
            <span style={filterLabel}>Statut</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ ...inputBase, cursor: "pointer", minWidth: 0 }}
            >
              <option value="">Tous</option>
              {statusOptions.map((st) => (
                <option key={st} value={st}>
                  {getEncounterStatusLabelFr(st)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: "0 0 auto", width: 132 }}>
            <span style={filterLabel}>Type</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ ...inputBase, cursor: "pointer", minWidth: 0 }}
            >
              <option value="">Tous</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {getEncounterTypeLabelFr(t)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: "0 1 140px", minWidth: 120 }}>
            <span style={filterLabel}>Salle</span>
            <select
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              style={{ ...inputBase, cursor: "pointer", minWidth: 0 }}
            >
              <option value="">Toutes</option>
              {roomOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
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
              onClick={() => void loadEncounters()}
              disabled={loading}
              style={{
                height: 40,
                padding: "0 18px",
                backgroundColor: "#0f172a",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: 14,
                fontWeight: 600,
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.12)",
                whiteSpace: "nowrap",
                opacity: loading ? 0.85 : 1,
              }}
            >
              {loading ? ui.common.loading : ui.common.refresh}
            </button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 24,
            alignItems: "center",
          }}
        >
          <Link href="/app/patients" style={quickLink}>
            Patients à évaluer
          </Link>
          <Link href="/app/encounters" style={quickLink}>
            Liste des consultations
          </Link>
          <Link href="/app/trackboard" style={quickLink}>
            Tableau de bord des consultations
          </Link>
        </div>

        <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "#64748b", maxWidth: 720, lineHeight: 1.5 }}>
          Consultations ouvertes — ouvrez le dossier patient pour le résumé et les suivis, ou la consultation pour
          l&apos;évaluation médicale et l&apos;ordonnance.
        </p>

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
                    <div style={{ height: 16, width: "45%", borderRadius: 4, backgroundColor: "#f1f5f9" }} />
                    <div style={{ height: 12, width: "30%", borderRadius: 4, backgroundColor: "#f1f5f9" }} />
                    <div style={{ height: 12, width: "75%", borderRadius: 4, backgroundColor: "#f1f5f9" }} />
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
                ? "Aucune consultation ouverte. Recherchez un patient pour ouvrir ou reprendre une consultation."
                : "Aucun résultat pour ces filtres."}
            </p>
            <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b" }}>
              {encounters.length === 0 ? null : "Ajustez la recherche ou les filtres."}
            </p>
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            {filteredEncounters.map((encounter) => {
              const patient = encounter.patient;
              const pid = patient?.id;
              const acuity = acuityFromEsi(encounter.triage?.esi);
              const borderLeft = ACUITY_BORDER[acuity];
              const nir = patientNirDisplay(patient);
              const phys = physicianLabel(encounter) || ui.common.dash;
              const room = encounter.roomLabel?.trim() || ui.common.dash;
              const typeLabel = encounter.type ? getEncounterTypeLabelFr(encounter.type) : ui.common.dash;
              const statusLabel = encounter.status ? getEncounterStatusLabelFr(encounter.status) : ui.common.dash;
              const soft = statusSoft(encounter.status ?? "");

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
                          <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#64748b" }}>
                            <span style={{ fontWeight: 600, color: "#475569" }}>{ui.common.nir}</span> {nir}
                          </p>
                          <div
                            style={{
                              marginTop: 10,
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 8,
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{
                                display: "inline-block",
                                padding: "4px 10px",
                                borderRadius: 9999,
                                fontSize: 12,
                                fontWeight: 600,
                                backgroundColor: "#f8fafc",
                                color: "#334155",
                                border: "1px solid #e2e8f0",
                              }}
                            >
                              {ui.common.type} · {typeLabel}
                            </span>
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
                              {statusLabel}
                            </span>
                          </div>
                          <p style={{ margin: "10px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.55 }}>
                            <span style={{ fontWeight: 600, color: "#475569" }}>Médecin attribué</span> {phys}
                            {" · "}
                            <span style={{ fontWeight: 600, color: "#475569" }}>{ui.common.arrival}</span>{" "}
                            {formatArrivalDateTime(encounter.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div
                        className="provider-meta-block"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                          alignItems: "stretch",
                          flexShrink: 0,
                          minWidth: 220,
                          flex: "1 1 260px",
                          maxWidth: 420,
                          borderTop: "1px solid #f1f5f9",
                          paddingTop: 12,
                          width: "100%",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "row",
                            flexWrap: "wrap",
                            gap: 12,
                            alignItems: "flex-start",
                            justifyContent: "flex-end",
                            width: "100%",
                          }}
                        >
                          <div
                            style={{
                              flex: "0 0 auto",
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
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 8,
                              alignItems: "stretch",
                              minWidth: 200,
                              flex: "1 1 180px",
                            }}
                          >
                          {pid ? (
                            <Link
                              href={`/app/patients/${pid}`}
                              style={{
                                display: "inline-flex",
                                justifyContent: "center",
                                padding: "8px 14px",
                                borderRadius: 10,
                                border: "1px solid #cbd5e1",
                                backgroundColor: "#fff",
                                color: "#334155",
                                fontSize: 13,
                                fontWeight: 600,
                                textDecoration: "none",
                                textAlign: "center",
                              }}
                            >
                              Ouvrir le dossier
                            </Link>
                          ) : null}
                          <Link
                            href={`/app/encounters/${encounter.id}`}
                            style={{
                              display: "inline-flex",
                              justifyContent: "center",
                              padding: "8px 14px",
                              borderRadius: 10,
                              border: "1px solid #bfdbfe",
                              backgroundColor: "#eff6ff",
                              color: "#1d4ed8",
                              fontSize: 13,
                              fontWeight: 600,
                              textDecoration: "none",
                              textAlign: "center",
                            }}
                          >
                            Ouvrir la consultation
                          </Link>
                          </div>
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
