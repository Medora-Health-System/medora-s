"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { fetchOpenEncounters } from "@/lib/clinicalWorklistApi";
import { formatAgeYearsSexFr } from "@/lib/patientDisplay";
import {
  getEncounterStatusBoardLabelFr,
  getEncounterTypeLabelFr,
  ui,
} from "@/lib/uiLabels";
import {
  esiDisplayChar,
  esiLevelFromUnknown,
  esiUnderAvatarNumberStyle,
} from "@/features/emergency/emergencyEsiDisplay";
import {
  MedoraCard,
  MedoraCardBadge,
  MedoraCardInner,
  MedoraCompactPatientCardRow,
  type PriorityBadgeSoft,
} from "@/components/medora-card";

const EMERGENCY_TYPE = "EMERGENCY" as const;

type AcuityTier = "critical" | "monitoring" | "stable";

const ACUITY_BORDER: Record<AcuityTier, string> = {
  critical: "#ef4444",
  monitoring: "#fbbf24",
  stable: "#10b981",
};

const ACUITY_SOFT: Record<AcuityTier, PriorityBadgeSoft> = {
  critical: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
  monitoring: { bg: "#fffbeb", text: "#92400e", border: "#fde68a" },
  stable: { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" },
};

const ACUITY_LABEL_FR: Record<AcuityTier, string> = {
  critical: "Critique",
  monitoring: "Surveillance",
  stable: "Stable",
};

const STATUS_BADGE_SOFT: Record<string, PriorityBadgeSoft> = {
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

function physicianLabel(enc: {
  physicianAssigned?: { firstName?: string | null; lastName?: string | null } | null;
}): string {
  const p = enc.physicianAssigned;
  if (!p) return "";
  return `${(p.firstName ?? "").trim()} ${(p.lastName ?? "").trim()}`.trim();
}

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

type OpenEncounterRow = {
  id: string;
  type?: string | null;
  status?: string | null;
  createdAt?: string | null;
  roomLabel?: string | null;
  chiefComplaint?: string | null;
  patient?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    dob?: string | null;
    sexAtBirth?: string | null;
    sex?: string | null;
    mrn?: string | null;
    nationalId?: string | null;
  } | null;
  triage?: { esi?: number | null; chiefComplaint?: string | null } | null;
  physicianAssigned?: { firstName?: string | null; lastName?: string | null } | null;
};

export function EmergencyTrackboardView() {
  const { facilityId: facilityIdFromHook, ready } = useFacilityAndRoles();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [rows, setRows] = useState<OpenEncounterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("medora_facility_id="))
      ?.split("=")[1];
    setFacilityId(cookieValue || facilityIdFromHook || null);
  }, [facilityIdFromHook]);

  const loadEncounters = async () => {
    if (!facilityId) return;
    setLoading(true);
    setFetchError(null);
    try {
      const data = await fetchOpenEncounters(facilityId);
      const arr = Array.isArray(data) ? data : [];
      setRows(arr as OpenEncounterRow[]);
    } catch (e) {
      console.error("Failed to load emergency trackboard:", e);
      setFetchError("Impossible de charger le tableau des urgences.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ready || !facilityId) return;
    void loadEncounters();
    const interval = window.setInterval(() => {
      void loadEncounters();
    }, 10000);
    return () => clearInterval(interval);
  }, [ready, facilityId]);

  const emergencyOnly = useMemo(
    () => rows.filter((e) => (e.type ?? "").trim() === EMERGENCY_TYPE),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return emergencyOnly;
    return emergencyOnly.filter((encounter) => {
      const name = fullPatientName(encounter.patient).toLowerCase();
      const nir = String(encounter.patient?.mrn ?? encounter.patient?.nationalId ?? "")
        .trim()
        .toLowerCase();
      const cc = (encounter.triage?.chiefComplaint || encounter.chiefComplaint || "").toLowerCase();
      const room = (encounter.roomLabel ?? "").toLowerCase();
      const phys = physicianLabel(encounter).toLowerCase();
      const blob = `${name} ${nir} ${cc} ${room} ${phys}`;
      return blob.includes(q);
    });
  }, [emergencyOnly, search]);

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

  const statusSoft = (status: string): PriorityBadgeSoft =>
    STATUS_BADGE_SOFT[status] ?? { bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" };

  return (
    <div style={{ minHeight: "calc(100vh - 48px)", backgroundColor: "#f8fafc", padding: "0 0 8px 0" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto" }}>
        <header style={{ marginBottom: 24 }}>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(1.35rem, 2.5vw, 1.65rem)",
              fontWeight: 600,
              color: "#0f172a",
            }}
          >
            Urgences
          </h1>
          <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b" }}>
            Consultations d&apos;urgence ouvertes
          </p>
          <p style={{ margin: "10px 0 0 0", fontSize: 13 }}>
            <Link href="/app/emergency/triage" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
              Accueil urgences — nouvelle consultation
            </Link>
          </p>
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
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginLeft: "auto" }}>
            <button
              type="button"
              onClick={() => void loadEncounters()}
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
        ) : loading && rows.length === 0 ? (
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
        ) : filtered.length === 0 ? (
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
              {emergencyOnly.length === 0
                ? "Aucune consultation d'urgence ouverte."
                : "Aucun résultat pour cette recherche."}
            </p>
            <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b" }}>
              {emergencyOnly.length === 0
                ? "Les dossiers d'urgence ouverts apparaîtront ici."
                : "Ajustez la recherche."}
            </p>
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.map((encounter) => {
              const acuity = acuityFromEsi(encounter.triage?.esi);
              const borderLeft = ACUITY_BORDER[acuity];
              const patient = encounter.patient;
              const cc =
                encounter.triage?.chiefComplaint || encounter.chiefComplaint || ui.common.dash;
              const esiLevel = esiLevelFromUnknown(encounter.triage?.esi ?? null);
              const room = encounter.roomLabel?.trim() || ui.common.dash;
              const phys = physicianLabel(encounter);
              const nirLine = patientNirDisplay(patient);
              const arrivalDisplay = formatArrivalDateTime(encounter.createdAt ?? null);
              const statusKey = (encounter.status ?? "").trim() || "OPEN";

              return (
                <li key={encounter.id}>
                  <MedoraCard leftAccentColor={borderLeft} variant="default">
                    <MedoraCardInner>
                      <MedoraCompactPatientCardRow
                        avatarInitials={patientInitials(patient)}
                        avatarFooter={
                          <span style={esiUnderAvatarNumberStyle(esiLevel)}>{esiDisplayChar(esiLevel)}</span>
                        }
                        roomLabel={ui.common.room}
                        roomValue={room}
                        identity={
                          <>
                            <h2
                              style={{
                                margin: 0,
                                fontSize: 14,
                                fontWeight: 600,
                                color: "#0f172a",
                                lineHeight: 1.2,
                              }}
                            >
                              {fullPatientName(patient)}
                            </h2>
                            <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.3 }}>
                              <span style={{ fontWeight: 600, color: "#475569" }}>{ui.common.nir}</span> {nirLine}
                              {" · "}
                              <span style={{ fontWeight: 600, color: "#475569" }}>{ui.common.ageSex}</span>{" "}
                              {formatAgeYearsSexFr(
                                patient?.dob ?? null,
                                patient?.sexAtBirth ?? null,
                                patient?.sex ?? null
                              )}
                            </p>
                            <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "#334155", lineHeight: 1.3 }}>
                              <span style={{ fontWeight: 600, color: "#64748b", fontSize: 11 }}>
                                {ui.common.chiefComplaintShort}
                              </span>
                              {" — "}
                              {cc}
                            </p>
                            <p style={{ margin: "2px 0 0 0", fontSize: 11, color: "#64748b", lineHeight: 1.3 }}>
                              <span style={{ fontWeight: 600, color: "#475569" }}>{ui.common.arrival}</span>{" "}
                              {arrivalDisplay}
                            </p>
                          </>
                        }
                        right={
                          <>
                            {phys ? (
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: 10,
                                  fontWeight: 500,
                                  color: "#64748b",
                                  textAlign: "right",
                                  lineHeight: 1.2,
                                  maxWidth: 220,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={phys}
                              >
                                <span style={{ color: "#94a3b8" }}>{ui.common.physician}</span> {phys}
                              </p>
                            ) : null}
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "row",
                                flexWrap: "wrap",
                                gap: 4,
                                justifyContent: "flex-end",
                              }}
                            >
                              <MedoraCardBadge soft={statusSoft(statusKey)}>
                                {getEncounterStatusBoardLabelFr(statusKey)}
                              </MedoraCardBadge>
                              <MedoraCardBadge soft={{ bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" }}>
                                {getEncounterTypeLabelFr(EMERGENCY_TYPE)}
                              </MedoraCardBadge>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "row",
                                flexWrap: "wrap",
                                gap: 4,
                                alignItems: "center",
                                justifyContent: "flex-end",
                              }}
                            >
                              <MedoraCardBadge soft={ACUITY_SOFT[acuity]}>{ACUITY_LABEL_FR[acuity]}</MedoraCardBadge>
                              <Link
                                href={`/app/emergency/active/${encounter.id}`}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  padding: "4px 10px",
                                  borderRadius: 8,
                                  border: "1px solid #bfdbfe",
                                  backgroundColor: "#eff6ff",
                                  color: "#1d4ed8",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  textDecoration: "none",
                                }}
                              >
                                {ui.common.view}
                              </Link>
                            </div>
                          </>
                        }
                      />
                    </MedoraCardInner>
                  </MedoraCard>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
