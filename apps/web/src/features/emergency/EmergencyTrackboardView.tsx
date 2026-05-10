"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { assignNurseSelf, assignProviderSelf, fetchOpenEncounters } from "@/lib/clinicalWorklistApi";
import { useI18n } from "@/lib/i18n";
import {
  formatEncounterChromeDateTime,
  formatPatientAgeSexLine,
  tEncounterStatus,
  tEncounterType,
} from "@/lib/encounterChromeI18n";
import { erDispositionBadgeDisplayLabel } from "@/features/emergency/erDispositionBadgeI18n";
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
import {
  erDispositionBadgeFromEncounterJson,
  type ErDispositionBadgeVariant,
} from "@/features/emergency/erTrackboardDispositionBadge";
import { readDischargeSortieExecutionFromEncounter } from "@/features/emergency/emergencyDispositionV1";
import { emergencyActiveWorkspacePath, emergencyChartPath } from "@/features/emergency/emergencyRoutes";
import { erHandoffV1SatisfiesInpatientTransferConfirm } from "@medora/shared";
import {
  computeLos,
  LOS_TIER_SOFT,
  type LosResult,
} from "@/features/emergency/erLengthOfStay";

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

function fullPatientName(
  p: { firstName?: string | null; lastName?: string | null } | null | undefined,
  dash: string
): string {
  return `${(p?.firstName ?? "").trim()} ${(p?.lastName ?? "").trim()}`.trim() || dash;
}

function physicianLabel(enc: {
  physicianAssigned?: { firstName?: string | null; lastName?: string | null } | null;
}): string {
  const p = enc.physicianAssigned;
  if (!p) return "";
  return `${(p.firstName ?? "").trim()} ${(p.lastName ?? "").trim()}`.trim();
}

function nurseLabel(enc: {
  nurseAssigned?: { firstName?: string | null; lastName?: string | null } | null;
}): string {
  const n = enc.nurseAssigned;
  if (!n) return "";
  return `${(n.firstName ?? "").trim()} ${(n.lastName ?? "").trim()}`.trim();
}

function patientNirDisplay(
  patient: { mrn?: string | null; nationalId?: string | null } | null | undefined,
  dash: string
): string {
  const raw = (patient?.mrn ?? patient?.nationalId ?? "").trim();
  return raw || dash;
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
  physicianAssigned?: { id?: string; firstName?: string | null; lastName?: string | null } | null;
  /** Phase 10A — RN currently responsible for the encounter (operational ownership). */
  nurseAssigned?: { id?: string; firstName?: string | null; lastName?: string | null } | null;
  physicianAssignedAt?: string | null;
  nurseAssignedAt?: string | null;
  dischargeSummaryJson?: unknown;
  admissionSummaryJson?: unknown;
  nursingAssessment?: unknown;
};

function dispositionBadgeSoft(variant: ErDispositionBadgeVariant): PriorityBadgeSoft {
  switch (variant) {
    case "discharge":
      return { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" };
    case "admit":
      return { bg: "#eef2ff", text: "#3730a3", border: "#c7d2fe" };
    case "observe":
      return { bg: "#f5f3ff", text: "#5b21b6", border: "#ddd6fe" };
    case "transfer":
      return { bg: "#fffbeb", text: "#b45309", border: "#fde68a" };
    case "ama":
      return { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" };
    case "deceased":
      return { bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" };
    case "lwbs":
      return { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" };
    case "other":
    default:
      return { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" };
  }
}

function acuityLabelKey(tier: AcuityTier): "emergencyTrackboard.acuityCritical" | "emergencyTrackboard.acuityMonitoring" | "emergencyTrackboard.acuityStable" {
  if (tier === "critical") return "emergencyTrackboard.acuityCritical";
  if (tier === "monitoring") return "emergencyTrackboard.acuityMonitoring";
  return "emergencyTrackboard.acuityStable";
}

export function EmergencyTrackboardView() {
  const { t, language } = useI18n();
  const { facilityId: facilityIdFromHook, ready, roles, userId } = useFacilityAndRoles();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [rows, setRows] = useState<OpenEncounterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  /** Phase 10A — per-row assignment in-flight + per-row error (transient UI only). */
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<{ id: string; message: string } | null>(null);
  /**
   * Phase 10A — minute-tick driver for LOS updates. We only need to re-render
   * the LOS column once per minute; this avoids any extra network traffic.
   */
  const [losTick, setLosTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setLosTick((n) => (n + 1) % 1_000_000), 60_000);
    return () => clearInterval(id);
  }, []);
  void losTick;

  const isProvider = roles.includes("PROVIDER");
  const isNurse = roles.includes("RN");

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("medora_facility_id="))
      ?.split("=")[1];
    setFacilityId(cookieValue || facilityIdFromHook || null);
  }, [facilityIdFromHook]);

  const loadEncounters = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setFetchError(null);
    try {
      const data = await fetchOpenEncounters(facilityId);
      const arr = Array.isArray(data) ? data : [];
      setRows(arr as OpenEncounterRow[]);
    } catch (e) {
      console.error("Failed to load emergency trackboard:", e);
      setFetchError(t("emergencyTrackboard.loadError"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, t]);

  const claimSelf = useCallback(
    async (encounterId: string, kind: "provider" | "nurse") => {
      if (!facilityId) return;
      setAssigningId(encounterId);
      setAssignError(null);
      try {
        const updated =
          kind === "provider"
            ? await assignProviderSelf(facilityId, encounterId)
            : await assignNurseSelf(facilityId, encounterId);
        setRows((prev) =>
          prev.map((r) =>
            r.id === encounterId
              ? ({
                  ...r,
                  ...(updated && typeof updated === "object" ? (updated as Partial<OpenEncounterRow>) : {}),
                } as OpenEncounterRow)
              : r
          )
        );
      } catch (err) {
        const raw = err instanceof Error ? err.message : "";
        const lc = raw.toLowerCase();
        const message = lc.includes("ouverte") || lc.includes("open")
          ? t("emergencyTrackboard.assignErrorClosed")
          : lc.includes("rôle") || lc.includes("role") || lc.includes("infirm") || lc.includes("médecin")
            ? t("emergencyTrackboard.assignErrorRole")
            : t("emergencyTrackboard.assignErrorGeneric");
        setAssignError({ id: encounterId, message });
      } finally {
        setAssigningId(null);
      }
    },
    [facilityId, t]
  );

  useEffect(() => {
    if (!ready || !facilityId) return;
    void loadEncounters();
    const interval = window.setInterval(() => {
      void loadEncounters();
    }, 10000);
    return () => clearInterval(interval);
  }, [ready, facilityId, loadEncounters]);

  const emergencyOnly = useMemo(
    () => rows.filter((e) => (e.type ?? "").trim() === EMERGENCY_TYPE),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return emergencyOnly;
    return emergencyOnly.filter((encounter) => {
      const name = fullPatientName(encounter.patient, t("common.dash")).toLowerCase();
      const nir = String(encounter.patient?.mrn ?? encounter.patient?.nationalId ?? "")
        .trim()
        .toLowerCase();
      const cc = (encounter.triage?.chiefComplaint || encounter.chiefComplaint || "").toLowerCase();
      const room = (encounter.roomLabel ?? "").toLowerCase();
      const phys = physicianLabel(encounter).toLowerCase();
      const nurse = nurseLabel(encounter).toLowerCase();
      const blob = `${name} ${nir} ${cc} ${room} ${phys} ${nurse}`;
      return blob.includes(q);
    });
  }, [emergencyOnly, search, t]);

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
            {t("emergencyTrackboard.title")}
          </h1>
          <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b" }}>
            {t("emergencyTrackboard.subtitle")}
          </p>
          <p style={{ margin: "10px 0 0 0", fontSize: 13 }}>
            <Link href="/app/emergency/triage" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
              {t("emergencyTrackboard.triageLink")}
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
            <span style={{ ...filterLabel, marginBottom: 3 }}>{t("emergencyTrackboard.searchLabel")}</span>
            <input
              type="search"
              aria-label={t("emergencyTrackboard.searchAria")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("emergencyTrackboard.searchPlaceholder")}
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
              {loading ? t("common.loading") : t("common.refresh")}
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
            <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b" }}>{t("emergencyTrackboard.loadErrorHint")}</p>
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
              {t("emergencyTrackboard.retry")}
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
                ? t("emergencyTrackboard.emptyNoEncounters")
                : t("emergencyTrackboard.emptyNoSearch")}
            </p>
            <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b" }}>
              {emergencyOnly.length === 0
                ? t("emergencyTrackboard.emptyHintNoEncounters")
                : t("emergencyTrackboard.emptyHintSearch")}
            </p>
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.map((encounter) => {
              const acuity = acuityFromEsi(encounter.triage?.esi);
              const borderLeft = ACUITY_BORDER[acuity];
              const patient = encounter.patient;
              const dash = t("common.dash");
              const cc = encounter.triage?.chiefComplaint || encounter.chiefComplaint || dash;
              const esiLevel = esiLevelFromUnknown(encounter.triage?.esi ?? null);
              const room = encounter.roomLabel?.trim() || dash;
              const phys = physicianLabel(encounter);
              const nurse = nurseLabel(encounter);
              const physId = (encounter.physicianAssigned?.id ?? "").trim();
              const nurseId = (encounter.nurseAssigned?.id ?? "").trim();
              const isPhysMine = Boolean(userId && physId && physId === userId);
              const isNurseMine = Boolean(userId && nurseId && nurseId === userId);
              const nirLine = patientNirDisplay(patient, dash);
              const arrivalDisplay = encounter.createdAt
                ? formatEncounterChromeDateTime(encounter.createdAt, language)
                : dash;
              /** LOS source: `Encounter.createdAt` (see erLengthOfStay.ts header). */
              const los: LosResult | null = computeLos(encounter.createdAt);
              const losTooltip =
                los?.tier === "high"
                  ? t("emergencyTrackboard.losTierHighTooltip")
                  : los?.tier === "attention"
                    ? t("emergencyTrackboard.losTierAttentionTooltip")
                    : t("emergencyTrackboard.losTierNormalTooltip");
              const statusKey = (encounter.status ?? "").trim() || "OPEN";
              const encounterTypeKey = (encounter.type ?? "").trim();
              const dispositionBadge = erDispositionBadgeFromEncounterJson(encounter);
              const sortieInfirmierOk =
                dispositionBadge?.variant === "discharge" &&
                readDischargeSortieExecutionFromEncounter(encounter.nursingAssessment) != null;
              const primaryStatusSoft = dispositionBadge
                ? dispositionBadgeSoft(dispositionBadge.variant)
                : statusSoft(statusKey);
              const primaryStatusLabel = dispositionBadge
                ? dispositionBadge.variant === "admit" && encounterTypeKey === EMERGENCY_TYPE
                  ? t("emergencyTrackboard.disposition.admissionPending")
                  : erDispositionBadgeDisplayLabel(dispositionBadge, t)
                : tEncounterStatus(t, statusKey);
              const showTransferPendingChip =
                dispositionBadge?.variant === "admit" &&
                encounterTypeKey === EMERGENCY_TYPE &&
                !erHandoffV1SatisfiesInpatientTransferConfirm(encounter.nursingAssessment);

              return (
                <li key={encounter.id}>
                  <MedoraCard leftAccentColor={borderLeft} variant="default">
                    <MedoraCardInner>
                      <MedoraCompactPatientCardRow
                        avatarInitials={patientInitials(patient)}
                        avatarFooter={
                          <span style={esiUnderAvatarNumberStyle(esiLevel)}>{esiDisplayChar(esiLevel)}</span>
                        }
                        roomLabel={t("encounterChrome.labelRoom")}
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
                              {fullPatientName(patient, dash)}
                            </h2>
                            <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.3 }}>
                              <span style={{ fontWeight: 600, color: "#475569" }}>{t("encounterChrome.labelNirMrn")}</span>{" "}
                              {nirLine}
                              {" · "}
                              <span style={{ fontWeight: 600, color: "#475569" }}>{t("emergencyTrackboard.ageSexLabel")}</span>{" "}
                              {formatPatientAgeSexLine(
                                patient?.dob ?? null,
                                patient?.sexAtBirth ?? null,
                                patient?.sex ?? null,
                                t
                              )}
                            </p>
                            <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "#334155", lineHeight: 1.3 }}>
                              <span style={{ fontWeight: 600, color: "#64748b", fontSize: 11 }}>
                                {t("emergencyTrackboard.chiefComplaintShort")}
                              </span>
                              {" — "}
                              {cc}
                            </p>
                            <p style={{ margin: "2px 0 0 0", fontSize: 11, color: "#64748b", lineHeight: 1.3 }}>
                              <span style={{ fontWeight: 600, color: "#475569" }}>{t("emergencyTrackboard.arrivalLabel")}</span>{" "}
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
                                <span style={{ color: "#94a3b8" }}>{t("emergencyTrackboard.physicianShort")}</span> {phys}
                              </p>
                            ) : null}
                            {nurse ? (
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
                                title={nurse}
                              >
                                <span style={{ color: "#94a3b8" }}>{t("emergencyTrackboard.nurseShort")}</span> {nurse}
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
                              <span
                                title={dispositionBadge ? t("emergencyTrackboard.dispositionTooltip") : undefined}
                              >
                                <MedoraCardBadge soft={primaryStatusSoft}>{primaryStatusLabel}</MedoraCardBadge>
                              </span>
                              <MedoraCardBadge soft={{ bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" }}>
                                {tEncounterType(t, EMERGENCY_TYPE)}
                              </MedoraCardBadge>
                              {sortieInfirmierOk ? (
                                <span title={t("emergencyTrackboard.sortieExecTooltip")}>
                                  <MedoraCardBadge soft={{ bg: "#d1fae5", text: "#065f46", border: "#6ee7b7" }}>
                                    {t("emergencyTrackboard.executedBadge")}
                                  </MedoraCardBadge>
                                </span>
                              ) : null}
                              {showTransferPendingChip ? (
                                <span title={t("emergencyTrackboard.transferPendingTooltip")}>
                                  <MedoraCardBadge soft={{ bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" }}>
                                    {t("emergencyTrackboard.disposition.transferPending")}
                                  </MedoraCardBadge>
                                </span>
                              ) : null}
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
                              <MedoraCardBadge soft={ACUITY_SOFT[acuity]}>{t(acuityLabelKey(acuity))}</MedoraCardBadge>
                              {los ? (
                                <span title={`${t("emergencyTrackboard.losTooltip")} ${losTooltip}`}>
                                  <MedoraCardBadge soft={LOS_TIER_SOFT[los.tier]}>
                                    {t("emergencyTrackboard.losShort")} {los.label}
                                  </MedoraCardBadge>
                                </span>
                              ) : null}
                              <Link
                                href={emergencyChartPath(encounter.id)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  padding: "4px 10px",
                                  borderRadius: 8,
                                  border: "1px solid #93c5fd",
                                  backgroundColor: "#dbeafe",
                                  color: "#1e40af",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  textDecoration: "none",
                                }}
                              >
                                {t("emergencyTrackboard.chartLink")}
                              </Link>
                              <Link
                                href={emergencyActiveWorkspacePath(encounter.id)}
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
                              {isProvider ? (
                                <button
                                  type="button"
                                  onClick={() => void claimSelf(encounter.id, "provider")}
                                  disabled={assigningId === encounter.id || isPhysMine}
                                  title={
                                    isPhysMine
                                      ? t("emergencyTrackboard.assignProviderMine")
                                      : t("emergencyTrackboard.assignProviderMe")
                                  }
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: "4px 10px",
                                    borderRadius: 8,
                                    border: isPhysMine ? "1px solid #6ee7b7" : "1px solid #cbd5e1",
                                    backgroundColor: isPhysMine ? "#d1fae5" : "#fff",
                                    color: isPhysMine ? "#065f46" : "#0f172a",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: assigningId === encounter.id || isPhysMine ? "default" : "pointer",
                                  }}
                                >
                                  {isPhysMine
                                    ? t("emergencyTrackboard.assignProviderMine")
                                    : assigningId === encounter.id
                                      ? t("emergencyTrackboard.assignSubmitting")
                                      : t("emergencyTrackboard.assignProviderMeShort")}
                                </button>
                              ) : null}
                              {isNurse ? (
                                <button
                                  type="button"
                                  onClick={() => void claimSelf(encounter.id, "nurse")}
                                  disabled={assigningId === encounter.id || isNurseMine}
                                  title={
                                    isNurseMine
                                      ? t("emergencyTrackboard.assignNurseMine")
                                      : t("emergencyTrackboard.assignNurseMe")
                                  }
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: "4px 10px",
                                    borderRadius: 8,
                                    border: isNurseMine ? "1px solid #6ee7b7" : "1px solid #cbd5e1",
                                    backgroundColor: isNurseMine ? "#d1fae5" : "#fff",
                                    color: isNurseMine ? "#065f46" : "#0f172a",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: assigningId === encounter.id || isNurseMine ? "default" : "pointer",
                                  }}
                                >
                                  {isNurseMine
                                    ? t("emergencyTrackboard.assignNurseMine")
                                    : assigningId === encounter.id
                                      ? t("emergencyTrackboard.assignSubmitting")
                                      : t("emergencyTrackboard.assignNurseMeShort")}
                                </button>
                              ) : null}
                            </div>
                            {assignError && assignError.id === encounter.id ? (
                              <p
                                role="alert"
                                style={{
                                  margin: "4px 0 0 0",
                                  fontSize: 11,
                                  color: "#b91c1c",
                                  textAlign: "right",
                                }}
                              >
                                {assignError.message}
                              </p>
                            ) : null}
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
