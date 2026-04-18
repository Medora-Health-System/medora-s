"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { PharmacyAlertsCard } from "@/components/pharmacy/PharmacyAlertsCard";
import { apiFetch } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { formatAgeYearsSexForLocale, DISPLAY_DASH } from "@/lib/patientDisplay";
import { encounterBcp47 } from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";
import { fetchHospitalisationEncounters } from "@/lib/clinicalWorklistApi";
import type { HospitalisationBoardEncounterRow } from "@/lib/hospitalisationBoardTypes";
import {
  MedoraCard,
  MedoraCardBadge,
  MedoraCardInner,
  MedoraCompactPatientCardRow,
  type PriorityBadgeSoft,
} from "@/components/medora-card";

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

const ACUITY_SOFT: Record<AcuityTier, PriorityBadgeSoft> = {
  critical: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
  monitoring: { bg: "#fffbeb", text: "#92400e", border: "#fde68a" },
  stable: { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" },
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
  return `${(p?.firstName ?? "").trim()} ${(p?.lastName ?? "").trim()}`.trim() || DISPLAY_DASH;
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

/**
 * Single implementation for `/app/hospitalisation` (and optional `?mock=error` | `?mock=empty` for demos/tests).
 */
export function HospitalizationBoardView() {
  const { t, language } = useI18n();
  const dateLocale = encounterBcp47(language);
  const searchParams = useSearchParams();
  const mockMode = searchParams.get("mock");

  const { facilityId: facilityIdFromHook, ready, canManagePharmacy } = useFacilityAndRoles();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [encounters, setEncounters] = useState<HospitalisationBoardEncounterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [dischargingId, setDischargingId] = useState<string | null>(null);

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
    if (mockMode === "error") {
      setLoading(false);
      setFetchError(t("hospitalizationBoard.loadListError"));
      setEncounters([]);
      return;
    }
    if (mockMode === "empty") {
      setLoading(false);
      setFetchError(null);
      setEncounters([]);
    }
  }, [mockMode]);

  const loadEncounters = async () => {
    if (mockMode === "error" || mockMode === "empty") return;
    if (!facilityId) return;
    setLoading(true);
    setFetchError(null);
    try {
      const data = await fetchHospitalisationEncounters(facilityId);
      setEncounters(data || []);
    } catch (error) {
      console.error("Failed to load hospitalisation board:", error);
      setFetchError(t("hospitalizationBoard.loadListError"));
    } finally {
      setLoading(false);
    }
  };

  const dischargeEncounter = async (encounter: HospitalisationBoardEncounterRow) => {
    const fid = effectiveFacilityId;
    if (!fid) return;
    const isClosable =
      encounter.status === "OPEN" && (encounter.type ?? "").trim() === "INPATIENT";
    if (!isClosable) return;
    setDischargingId(encounter.id);
    setFetchError(null);
    try {
      const check = await apiFetch(`/encounters/${encounter.id}/close-check`, {
        method: "POST",
        facilityId: fid,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dischargeStatus: "DISCHARGED" }),
      });
      const hasDeficiencies =
        Boolean(check) &&
        typeof check === "object" &&
        !Array.isArray(check) &&
        (check as { hasDeficiencies?: unknown }).hasDeficiencies === true;

      const payload: Record<string, unknown> = { dischargeStatus: "DISCHARGED" };
      if (hasDeficiencies) payload.acknowledgeDeficiencies = true;

      await apiFetch(`/encounters/${encounter.id}/close`, {
        method: "POST",
        facilityId: fid,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await loadEncounters();
    } catch (error) {
      console.error("Failed to discharge inpatient encounter:", error);
      setFetchError(
        normalizeUserFacingError(error instanceof Error ? error.message : null) ||
          "Impossible d'effectuer la sortie du patient."
      );
    } finally {
      setDischargingId(null);
    }
  };

  useEffect(() => {
    if (mockMode === "error" || mockMode === "empty") return;
    if (!ready || !facilityId) return;
    void loadEncounters();
    const interval = setInterval(() => {
      void loadEncounters();
    }, 10000);
    return () => clearInterval(interval);
  }, [ready, facilityId, mockMode]);

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

  const singleOpenInpatientRow = useMemo(() => {
    if (filteredEncounters.length !== 1) return null;
    const e = filteredEncounters[0];
    if (e.status !== "OPEN") return null;
    if ((e.type ?? "").trim() !== "INPATIENT") return null;
    return e;
  }, [filteredEncounters]);

  const formatTime = (date: string | null) => {
    if (!date) return t("common.dash");
    return new Date(date).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
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
              {loading ? t("common.loading") : t("common.refresh")}
            </button>
            <button
              type="button"
              disabled={
                mockMode === "error" ||
                mockMode === "empty" ||
                !effectiveFacilityId ||
                !singleOpenInpatientRow ||
                dischargingId !== null
              }
              title={
                mockMode === "error" || mockMode === "empty"
                  ? "Non disponible en mode démo."
                  : !effectiveFacilityId
                    ? "Établissement requis."
                    : !singleOpenInpatientRow
                      ? "Affinez les filtres pour n’afficher qu’un seul patient hospitalisé ouvert, ou utilisez « Sortie » sur la ligne."
                      : undefined
              }
              onClick={() => {
                if (singleOpenInpatientRow) void dischargeEncounter(singleOpenInpatientRow);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: 40,
                padding: "0 16px",
                backgroundColor:
                  mockMode === "error" ||
                  mockMode === "empty" ||
                  !effectiveFacilityId ||
                  !singleOpenInpatientRow ||
                  dischargingId !== null
                    ? "#f1f5f9"
                    : "#fff",
                color:
                  mockMode === "error" ||
                  mockMode === "empty" ||
                  !effectiveFacilityId ||
                  !singleOpenInpatientRow ||
                  dischargingId !== null
                    ? "#64748b"
                    : "#334155",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 600,
                cursor:
                  mockMode === "error" ||
                  mockMode === "empty" ||
                  !effectiveFacilityId ||
                  !singleOpenInpatientRow ||
                  dischargingId !== null
                    ? "not-allowed"
                    : "pointer",
                whiteSpace: "nowrap",
                boxShadow:
                  mockMode === "error" ||
                  mockMode === "empty" ||
                  !effectiveFacilityId ||
                  !singleOpenInpatientRow ||
                  dischargingId !== null
                    ? undefined
                    : "0 1px 2px rgba(15, 23, 42, 0.05)",
              }}
            >
              {singleOpenInpatientRow && dischargingId === singleOpenInpatientRow.id
                ? "Sortie…"
                : "Sortie patient"}
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
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {filteredEncounters.map((encounter) => {
              const acuity = acuityFromEsi(encounter.triage?.esi);
              const borderLeft = ACUITY_BORDER[acuity];
              const patient = encounter.patient;
              const cc =
                encounter.triage?.chiefComplaint || encounter.chiefComplaint || t("common.dash");
              const esiDisplay = encounter.triage?.esi != null ? `ESI ${encounter.triage.esi}` : t("common.dash");
              const room = encounter.roomLabel?.trim() || t("common.dash");
              const phys = physicianLabel(encounter) || t("common.dash");

              return (
                <li key={encounter.id}>
                  <MedoraCard leftAccentColor={borderLeft} variant="default">
                    <MedoraCardInner>
                      <MedoraCompactPatientCardRow
                        avatarInitials={patientInitials(patient)}
                        roomLabel={t("common.room")}
                        roomValue={room}
                        rightMaxWidth={320}
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
                              {formatAgeYearsSexForLocale(
                                patient?.dob ?? null,
                                patient?.sexAtBirth ?? null,
                                patient?.sex ?? null,
                                language
                              )}
                            </p>
                            <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "#334155", lineHeight: 1.3 }}>{cc}</p>
                            <p style={{ margin: "2px 0 0 0", fontSize: 11, color: "#64748b", lineHeight: 1.3 }}>
                              <span style={{ fontWeight: 600, color: "#475569" }}>{t("clinicalTrackboardPage.esiIndex")}</span>{" "}
                              {esiDisplay}
                              {" · "}
                              <span style={{ fontWeight: 600, color: "#475569" }}>{t("common.arrival")}</span>{" "}
                              {formatTime(encounter.createdAt ?? null)}
                            </p>
                          </>
                        }
                        right={
                          <>
                            <p
                              style={{
                                margin: 0,
                                fontSize: 11,
                                fontWeight: 600,
                                color: "#0f172a",
                                textAlign: "right",
                                lineHeight: 1.2,
                                maxWidth: 260,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={phys}
                            >
                              {phys}
                            </p>
                            <p style={{ margin: 0, fontSize: 10, color: "#94a3b8", textAlign: "right" }}>
                              <span style={{ color: "#cbd5e1" }}>{t("clinicalTrackboardPage.nurseAbbr")}</span> {t("common.dash")}
                            </p>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "row",
                                flexWrap: "wrap",
                                gap: 4,
                                justifyContent: "flex-end",
                              }}
                            >
                              <MedoraCardBadge soft={ACUITY_SOFT[acuity]}>{ACUITY_LABEL_FR[acuity]}</MedoraCardBadge>
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
                              <Link
                                href={`/app/encounters/${encounter.id}`}
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
                                {t("common.view")}
                              </Link>
                              <button
                                type="button"
                                onClick={() => void dischargeEncounter(encounter)}
                                disabled={
                                  dischargingId === encounter.id ||
                                  encounter.status !== "OPEN" ||
                                  (encounter.type ?? "").trim() !== "INPATIENT"
                                }
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  padding: "4px 10px",
                                  borderRadius: 8,
                                  border: "1px solid #cbd5e1",
                                  backgroundColor: "#fff",
                                  color: "#475569",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor:
                                    dischargingId === encounter.id ||
                                    encounter.status !== "OPEN" ||
                                    (encounter.type ?? "").trim() !== "INPATIENT"
                                      ? "not-allowed"
                                      : "pointer",
                                  opacity:
                                    dischargingId === encounter.id ||
                                    encounter.status !== "OPEN" ||
                                    (encounter.type ?? "").trim() !== "INPATIENT"
                                      ? 0.6
                                      : 1,
                                }}
                                aria-label="Sortie patient"
                              >
                                {dischargingId === encounter.id ? "Sortie..." : "Sortie"}
                              </button>
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
