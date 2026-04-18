"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { fetchOpenEncounters } from "@/lib/clinicalWorklistApi";
import { encounterBcp47, tEncounterStatus, tEncounterType } from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";
import { DISPLAY_DASH } from "@/lib/patientDisplay";
import {
  MedoraCard,
  MedoraCardBadge,
  MedoraCardBadgeRow,
  MedoraCardInner,
  MedoraCompactPatientCardRow,
} from "@/components/medora-card";

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
  return `${(p?.firstName ?? "").trim()} ${(p?.lastName ?? "").trim()}`.trim() || DISPLAY_DASH;
}

function patientNirDisplay(patient: { mrn?: string | null; nationalId?: string | null } | null | undefined): string {
  const raw = (patient?.mrn ?? patient?.nationalId ?? "").trim();
  return raw || DISPLAY_DASH;
}

function physicianLabel(enc: {
  physicianAssigned?: { firstName?: string | null; lastName?: string | null } | null;
}): string {
  const p = enc.physicianAssigned;
  if (!p) return "";
  return `${(p.firstName ?? "").trim()} ${(p.lastName ?? "").trim()}`.trim();
}

function formatArrivalDateTime(iso: string | null | undefined, locale: string, emptyDash: string): string {
  if (!iso) return emptyDash;
  try {
    return new Date(iso).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return emptyDash;
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
  const { t, language } = useI18n();
  const dateLocale = encounterBcp47(language);
  const dash = t("common.dash");
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
      setFetchError(t("openEncountersTable.loadError"));
      setEncounters([]);
    } finally {
      setLoading(false);
    }
  }, [effectiveFacilityId, t]);

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
    return Array.from(s).sort((a, b) => a.localeCompare(b, dateLocale));
  }, [encounters, dateLocale]);

  const physicianOptions = useMemo(() => {
    const s = new Set<string>();
    for (const e of encounters) {
      const pl = physicianLabel(e);
      if (pl) s.add(pl);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, dateLocale));
  }, [encounters, dateLocale]);

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
        const typeSearch = (encounter.type ? tEncounterType(t, encounter.type) : "").toLowerCase();
        const blob = `${name} ${nir} ${room.toLowerCase()} ${phys.toLowerCase()} ${typeSearch}`;
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [encounters, search, filterStatus, filterType, filterRoom, filterPhysician, t]);

  if (!ready) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ margin: 0, color: "#64748b" }}>{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "calc(100vh - 48px)", backgroundColor: "#f8fafc", padding: "0 0 8px 0" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto" }}>
        <header style={{ marginBottom: 20 }}>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(1.35rem, 2.5vw, 1.65rem)",
              fontWeight: 600,
              color: "#0f172a",
            }}
          >
            {t("clinicalDashboard.providerTitle")}
          </h1>
          <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b", maxWidth: 720, lineHeight: 1.55 }}>
            {t("clinicalDashboard.providerSubtitle")}
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
            <span style={{ ...filterLabel, marginBottom: 3 }}>{t("common.search")}</span>
            <input
              type="search"
              aria-label={t("common.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("clinicalDashboard.searchPlaceholder")}
              style={{ ...inputBase, height: 40, fontSize: 14 }}
            />
          </div>

          <div style={{ flex: "0 0 auto", width: 120 }}>
            <span style={filterLabel}>{t("common.status")}</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ ...inputBase, cursor: "pointer", minWidth: 0 }}
            >
              <option value="">{t("clinicalDashboard.filterAll")}</option>
              {statusOptions.map((st) => (
                <option key={st} value={st}>
                  {tEncounterStatus(t, st)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: "0 0 auto", width: 132 }}>
            <span style={filterLabel}>{t("common.type")}</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ ...inputBase, cursor: "pointer", minWidth: 0 }}
            >
              <option value="">{t("clinicalDashboard.filterAll")}</option>
              {typeOptions.map((typ) => (
                <option key={typ} value={typ}>
                  {tEncounterType(t, typ)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: "0 1 140px", minWidth: 120 }}>
            <span style={filterLabel}>{t("common.room")}</span>
            <select
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              style={{ ...inputBase, cursor: "pointer", minWidth: 0 }}
            >
              <option value="">{t("clinicalDashboard.filterAllRooms")}</option>
              {roomOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: "0 1 160px", minWidth: 140 }}>
            <span style={filterLabel}>{t("clinicalDashboard.filterProvider")}</span>
            <select
              value={filterPhysician}
              onChange={(e) => setFilterPhysician(e.target.value)}
              style={{ ...inputBase, cursor: "pointer", minWidth: 0 }}
            >
              <option value="">{t("clinicalDashboard.filterAll")}</option>
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
              {loading ? t("common.loading") : t("common.refresh")}
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
            {t("clinicalDashboard.providerQuickPatients")}
          </Link>
          <Link href="/app/encounters" style={quickLink}>
            {t("clinicalDashboard.encounterList")}
          </Link>
          <Link href="/app/trackboard" style={quickLink}>
            {t("clinicalDashboard.trackboard")}
          </Link>
        </div>

        <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "#64748b", maxWidth: 720, lineHeight: 1.5 }}>
          {t("clinicalDashboard.providerListBlurb")}
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
            <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b" }}>{t("clinicalDashboard.errorRetryHint")}</p>
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
              {t("patientConsultationsTab.retry")}
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
                ? t("clinicalDashboard.providerEmptyNone")
                : t("clinicalDashboard.providerEmptyFiltered")}
            </p>
            <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b" }}>
              {encounters.length === 0 ? null : t("clinicalDashboard.adjustFiltersHint")}
            </p>
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {filteredEncounters.map((encounter) => {
              const patient = encounter.patient;
              const pid = patient?.id;
              const acuity = acuityFromEsi(encounter.triage?.esi);
              const borderLeft = ACUITY_BORDER[acuity];
              const nir = patientNirDisplay(patient);
              const phys = physicianLabel(encounter) || dash;
              const room = encounter.roomLabel?.trim() || dash;
              const typeLabel = encounter.type ? tEncounterType(t, encounter.type) : dash;
              const statusLabel = encounter.status ? tEncounterStatus(t, encounter.status) : dash;
              const soft = statusSoft(encounter.status ?? "");

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
                              <span style={{ fontWeight: 600, color: "#475569" }}>{t("common.nir")}</span> {nir}
                            </p>
                            <div style={{ margin: "4px 0 0 0" }}>
                              <MedoraCardBadgeRow marginTop={0}>
                                <MedoraCardBadge preset="neutral">
                                  {t("common.type")} · {typeLabel}
                                </MedoraCardBadge>
                                <MedoraCardBadge soft={soft}>{statusLabel}</MedoraCardBadge>
                              </MedoraCardBadgeRow>
                            </div>
                            <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.35 }}>
                              <span style={{ fontWeight: 600, color: "#475569" }}>{t("encounters.assignedProvider")}</span>{" "}
                              {phys}
                              {" · "}
                              <span style={{ fontWeight: 600, color: "#475569" }}>{t("common.arrival")}</span>{" "}
                              {formatArrivalDateTime(encounter.createdAt, dateLocale, dash)}
                            </p>
                          </>
                        }
                        right={
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "row",
                              flexWrap: "wrap",
                              gap: 6,
                              justifyContent: "flex-end",
                              alignItems: "center",
                            }}
                          >
                            {pid ? (
                              <Link
                                href={`/app/patients/${pid}`}
                                style={{
                                  display: "inline-flex",
                                  justifyContent: "center",
                                  padding: "4px 10px",
                                  borderRadius: 8,
                                  border: "1px solid #cbd5e1",
                                  backgroundColor: "#fff",
                                  color: "#334155",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  textDecoration: "none",
                                  textAlign: "center",
                                }}
                              >
                                {t("openEncountersTable.openPatientChart")}
                              </Link>
                            ) : null}
                            <Link
                              href={`/app/encounters/${encounter.id}`}
                              style={{
                                display: "inline-flex",
                                justifyContent: "center",
                                padding: "4px 10px",
                                borderRadius: 8,
                                border: "1px solid #bfdbfe",
                                backgroundColor: "#eff6ff",
                                color: "#1d4ed8",
                                fontSize: 12,
                                fontWeight: 600,
                                textDecoration: "none",
                                textAlign: "center",
                              }}
                            >
                              {t("openEncountersTable.openEncounter")}
                            </Link>
                          </div>
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
