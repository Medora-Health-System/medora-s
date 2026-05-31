"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { formatPatientAgeSexLine } from "@/lib/encounterChromeI18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { DEFAULT_ENCOUNTER_ROOM_LABEL, ENCOUNTER_ROOM_OPTIONS, formatEncounterRoomDisplay } from "@/lib/encounterRoomOptions";
import {
  buildEdRoomOccupancyConfirmPayload,
  checkEdRoomAssignmentConflict,
  parseEdRoomOccupiedApiError,
} from "@/lib/edRoomAssignment";
import { EdRoomOccupancyConfirmModal } from "@/components/encounters/EdRoomOccupancyConfirmModal";
import type { EdRoomOccupancyConflict } from "@medora/shared";
import { getCachedRecord, setCachedRecord } from "@/lib/offline/offlineCache";
import {
  MEDORA_CARD_SHELL,
  MedoraCard,
  MedoraCardActions,
  MedoraCardActionsMediaStyle,
  MedoraCardBadge,
  MedoraCardBadgeRow,
  MedoraCardIdentity,
  MedoraCardInner,
  MedoraCardRoomBlock,
  MedoraCardTitle,
} from "@/components/medora-card";

type PatientRow = {
  id: string;
  mrn: string | null;
  firstName: string;
  lastName: string;
  dob: string | null;
  sexAtBirth?: string | null;
  sex?: string | null;
  phone: string | null;
  nationalId?: string | null;
};

function patientSearchList(data: unknown): PatientRow[] {
  if (Array.isArray(data)) return data as PatientRow[];
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: PatientRow[] }).items;
  }
  return [];
}

function patientInitials(p: PatientRow): string {
  const f = (p?.firstName ?? "").trim();
  const l = (p?.lastName ?? "").trim();
  const a = f.charAt(0) || "";
  const b = l.charAt(0) || f.charAt(1) || "";
  return (a + b).toUpperCase() || "?";
}

const inputBase: React.CSSProperties = {
  height: 40,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  backgroundColor: "#fff",
  padding: "0 12px",
  fontSize: 14,
  color: "#0f172a",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
  width: "100%",
  boxSizing: "border-box" as const,
};

export function EmergencyTriageIntakeView() {
  const router = useRouter();
  const { t } = useI18n();
  const { facilityId: facilityIdFromHook, ready } = useFacilityAndRoles();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selected, setSelected] = useState<PatientRow | null>(null);
  const [visitReason, setVisitReason] = useState("");
  const [roomLabel, setRoomLabel] = useState<string>(DEFAULT_ENCOUNTER_ROOM_LABEL);
  const [physicianAssignedUserId, setPhysicianAssignedUserId] = useState("");
  const [providers, setProviders] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomOccupancyConflict, setRoomOccupancyConflict] = useState<EdRoomOccupancyConflict | null>(null);

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("medora_facility_id="))
      ?.split("=")[1];
    setFacilityId(cookieValue || facilityIdFromHook || null);
  }, [facilityIdFromHook]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fid = facilityId || facilityIdFromHook;
      if (!fid) return;
      try {
        const data = await apiFetch("/roster/providers", { facilityId: fid });
        if (!cancelled && Array.isArray(data)) setProviders(data);
      } catch {
        if (!cancelled) setProviders([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [facilityId, facilityIdFromHook]);

  const runSearch = useCallback(async () => {
    const fid = facilityId || facilityIdFromHook;
    if (!fid) return;
    setSearchLoading(true);
    const cacheKey = `patient-search-index:${fid}`;
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      const data = await apiFetch(`/patients/search?${params.toString()}`, { facilityId: fid });
      const list = patientSearchList(data);
      setPatients(list);
      void setCachedRecord("patient_summaries", cacheKey, list, { facilityId: fid });
    } catch (e) {
      console.error(e);
      const cached = await getCachedRecord<PatientRow[]>("patient_summaries", cacheKey);
      const base = cached?.data ?? [];
      const q = searchQuery.trim().toLowerCase();
      if (!q) setPatients(base);
      else
        setPatients(
          base.filter((p) =>
            `${p.firstName} ${p.lastName} ${p.mrn ?? ""} ${p.phone ?? ""}`.toLowerCase().includes(q)
          )
        );
    } finally {
      setSearchLoading(false);
    }
  }, [facilityId, facilityIdFromHook, searchQuery]);

  useEffect(() => {
    if (!ready || !(facilityId || facilityIdFromHook)) return;
    void runSearch();
  }, [ready, facilityId, facilityIdFromHook, runSearch]);

  const createEmergencyEncounter = async (
    resolvedRoomLabel?: string,
    occupancyConfirm?: EdRoomOccupancyConflict
  ) => {
    const fid = facilityId || facilityIdFromHook;
    if (!fid || !selected) return;
    const roomToAssign = (resolvedRoomLabel ?? roomLabel).trim() || DEFAULT_ENCOUNTER_ROOM_LABEL;
    setSubmitting(true);
    setError(null);
    try {
      const occupancyPayload = occupancyConfirm
        ? buildEdRoomOccupancyConfirmPayload(occupancyConfirm)
        : null;
      const res = await apiFetch(`/patients/${selected.id}/encounters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "EMERGENCY",
          visitReason: visitReason.trim() || undefined,
          roomLabel: occupancyPayload?.roomLabel ?? roomToAssign,
          physicianAssignedUserId: physicianAssignedUserId.trim() || undefined,
          ...(occupancyPayload
            ? {
                confirmOccupiedRoomAssignment: occupancyPayload.confirmOccupiedRoomAssignment,
                roomOccupancyOverride: occupancyPayload.roomOccupancyOverride,
              }
            : {}),
        }),
        facilityId: fid,
      });
      if (res && typeof res === "object" && (res as { queued?: boolean }).queued === true) {
        setError(t("emergencyTriageIntake.errOfflineQueued"));
        return;
      }
      const id = (res as { id?: string })?.id;
      if (id) {
        router.push(`/app/emergency/active/${id}`);
        return;
      }
      setError(t("emergencyTriageIntake.errUnexpectedResponse"));
    } catch (e) {
      const apiConflict = parseEdRoomOccupiedApiError(e);
      if (apiConflict) {
        setRoomOccupancyConflict(apiConflict);
        return;
      }
      setError(
        normalizeUserFacingError(e instanceof Error ? e.message : null, "fr") || t("emergencyTriageIntake.errCreateFailed")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const startEmergencyEncounter = async () => {
    const fid = facilityId || facilityIdFromHook;
    if (!fid || !selected) return;
    const trimmedRoom = roomLabel.trim() || DEFAULT_ENCOUNTER_ROOM_LABEL;
    setSubmitting(true);
    setError(null);
    try {
      const conflict = await checkEdRoomAssignmentConflict(fid, trimmedRoom);
      if (conflict) {
        setRoomOccupancyConflict(conflict);
        return;
      }
      await createEmergencyEncounter(trimmedRoom);
    } catch (e) {
      const apiConflict = parseEdRoomOccupiedApiError(e);
      if (apiConflict) {
        setRoomOccupancyConflict(apiConflict);
        return;
      }
      setError(
        normalizeUserFacingError(e instanceof Error ? e.message : null, "fr") || t("emergencyTriageIntake.errCreateFailed")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const shell = {
    backgroundColor: MEDORA_CARD_SHELL.background,
    border: MEDORA_CARD_SHELL.border,
    borderRadius: MEDORA_CARD_SHELL.radius,
    boxShadow: MEDORA_CARD_SHELL.boxShadow,
  };

  return (
    <div style={{ minHeight: "calc(100vh - 48px)", backgroundColor: "#f8fafc", padding: "0 0 24px 0" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto" }}>
        <MedoraCardActionsMediaStyle />

        <header style={{ marginBottom: 24 }}>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(1.35rem, 2.5vw, 1.65rem)",
              fontWeight: 600,
              color: "#0f172a",
            }}
          >
            {t("emergencyTriageIntake.pageTitle")}
          </h1>
          <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b", maxWidth: 640, lineHeight: 1.5 }}>
            {t("emergencyTriageIntake.pageSubtitle")}
          </p>
          <p style={{ margin: "10px 0 0 0", fontSize: 13 }}>
            <Link href="/app/emergency/trackboard" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
              {t("emergencyTriageIntake.linkTrackboard")}
            </Link>
            {" · "}
            <Link href="/app/patients" style={{ color: "#475569", fontWeight: 500, textDecoration: "none" }}>
              {t("emergencyTriageIntake.linkPatientList")}
            </Link>
          </p>
        </header>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <MedoraCard leftAccentColor="#64748b" variant="default">
            <MedoraCardInner>
              <MedoraCardIdentity initials="?">
                <MedoraCardTitle
                  title={t("emergencyTriageIntake.searchCardTitle")}
                  subline={
                    <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                      {t("emergencyTriageIntake.searchCardSubline")}
                    </p>
                  }
                />
              </MedoraCardIdentity>
              <div style={{ width: "100%", marginTop: 12 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                  <input
                    type="search"
                    aria-label={t("emergencyTriageIntake.searchAria")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void runSearch();
                    }}
                    placeholder={t("emergencyTriageIntake.searchPlaceholder")}
                    style={{ ...inputBase, flex: "1 1 220px", minWidth: 0 }}
                  />
                  <button
                    type="button"
                    onClick={() => void runSearch()}
                    disabled={searchLoading || !(facilityId || facilityIdFromHook)}
                    style={{
                      height: 40,
                      padding: "0 14px",
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      backgroundColor: "#fff",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#334155",
                      cursor: searchLoading ? "wait" : "pointer",
                      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
                    }}
                  >
                    {searchLoading ? t("common.loading") : t("emergencyTriageIntake.searchButton")}
                  </button>
                </div>
              </div>

              {patients.length > 0 && (
                <div style={{ marginTop: 16, overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#64748b", fontSize: 11 }}>
                        <th style={{ padding: "8px 10px" }}>{t("emergencyTriageIntake.colPatient")}</th>
                        <th style={{ padding: "8px 10px" }}>{t("emergencyTriageIntake.colMrn")}</th>
                        <th style={{ padding: "8px 10px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {patients.map((p) => (
                        <tr
                          key={p.id}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            backgroundColor: selected?.id === p.id ? "rgba(239,246,255,0.6)" : "transparent",
                          }}
                        >
                          <td style={{ padding: "10px 10px", color: "#0f172a" }}>
                            {p.firstName} {p.lastName}
                          </td>
                          <td style={{ padding: "10px 10px", color: "#64748b" }}>{p.mrn ?? t("common.dash")}</td>
                          <td style={{ padding: "10px 10px", textAlign: "right" }}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelected(p);
                                setError(null);
                              }}
                              style={{
                                padding: "6px 12px",
                                borderRadius: 10,
                                border: "1px solid #bfdbfe",
                                backgroundColor: "#eff6ff",
                                color: "#1d4ed8",
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              {t("emergencyTriageIntake.selectPatient")}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </MedoraCardInner>
          </MedoraCard>

          {selected && (
            <MedoraCard leftAccentColor="#2563eb" variant="default">
              <MedoraCardInner>
                <MedoraCardIdentity initials={patientInitials(selected)}>
                  <MedoraCardTitle
                    title={`${selected.firstName} ${selected.lastName}`}
                    subline={
                      <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                        {t("patientChartUi.ageSex")}{" "}
                        {formatPatientAgeSexLine(
                          selected.dob ?? null,
                          selected.sexAtBirth ?? null,
                          selected.sex ?? null,
                          t
                        )}
                      </p>
                    }
                  />
                </MedoraCardIdentity>

                <MedoraCardRoomBlock
                  label={t("patientChartUi.room")}
                  value={formatEncounterRoomDisplay(roomLabel, t)}
                />

                <div style={{ marginTop: 0, flex: "1 1 280px", minWidth: 0, ...shell, padding: "14px 16px" }}>
                  <p style={{ margin: "0 0 10px 0", fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                    {t("emergencyTriageIntake.encounterTypeLabel")}
                  </p>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600, color: "#475569" }}>
                    {t("emergencyTriageIntake.labelChangeRoom")}
                  </label>
                  <select
                    value={roomLabel}
                    onChange={(e) => setRoomLabel(e.target.value)}
                    style={{ ...inputBase, marginBottom: 12, cursor: "pointer" }}
                  >
                    {ENCOUNTER_ROOM_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {formatEncounterRoomDisplay(r, t, r)}
                      </option>
                    ))}
                  </select>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600, color: "#475569" }}>
                    {t("emergencyTriageIntake.labelAssignedProvider")}
                  </label>
                  <select
                    value={physicianAssignedUserId}
                    onChange={(e) => setPhysicianAssignedUserId(e.target.value)}
                    style={{ ...inputBase, marginBottom: 12, cursor: "pointer" }}
                  >
                    <option value="">—</option>
                    {providers.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.lastName} {pr.firstName}
                      </option>
                    ))}
                  </select>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600, color: "#475569" }}>
                    {t("emergencyTriageIntake.labelVisitReason")}
                  </label>
                  <textarea
                    value={visitReason}
                    onChange={(e) => setVisitReason(e.target.value)}
                    rows={3}
                    style={{
                      ...inputBase,
                      padding: "10px 12px",
                      minHeight: 72,
                      resize: "vertical",
                      marginBottom: 12,
                    }}
                  />
                  {error && (
                    <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#b91c1c" }}>{error}</p>
                  )}
                  <MedoraCardActions railBorderTopColor="#e2e8f0" gap={10} minWidth={0} alignItems="flex-start">
                    <MedoraCardBadgeRow marginTop={0}>
                      <MedoraCardBadge soft={{ bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" }}>EMERGENCY</MedoraCardBadge>
                    </MedoraCardBadgeRow>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void startEmergencyEncounter()}
                      style={{
                        padding: "10px 18px",
                        borderRadius: 12,
                        border: "none",
                        backgroundColor: "#0f172a",
                        color: "#fff",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: submitting ? "not-allowed" : "pointer",
                        opacity: submitting ? 0.75 : 1,
                      }}
                    >
                      {submitting ? t("emergencyTriageIntake.creating") : t("emergencyTriageIntake.openEncounter")}
                    </button>
                  </MedoraCardActions>
                </div>
              </MedoraCardInner>
            </MedoraCard>
          )}
        </div>
      </div>
      {roomOccupancyConflict ? (
        <EdRoomOccupancyConfirmModal
          requestedRoom={roomOccupancyConflict.requestedRoom}
          suggestedRoom={roomOccupancyConflict.suggestedRoom}
          saving={submitting}
          onCancel={() => {
            if (submitting) return;
            setRoomOccupancyConflict(null);
          }}
          onConfirm={() => {
            void createEmergencyEncounter(roomOccupancyConflict.requestedRoom, roomOccupancyConflict);
          }}
        />
      ) : null}
    </div>
  );
}
