"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  patient?: { id?: string; firstName?: string | null; lastName?: string | null; mrn?: string | null };
  pendingMedicationCount?: number;
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

export default function EncountersPage() {
  const { t, language } = useI18n();
  const { facilityId, ready } = useFacilityAndRoles();
  const dateLocale = encounterBcp47(language);
  const dash = t("common.dash");
  const [encounters, setEncounters] = useState<EncounterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setFetchError(null);
    try {
      const data = await fetchOpenEncounters(facilityId);
      setEncounters(Array.isArray(data) ? (data as EncounterRow[]) : []);
    } catch {
      setFetchError(t("openEncountersTable.loadError"));
      setEncounters([]);
    } finally {
      setLoading(false);
    }
  }, [facilityId, t]);

  useEffect(() => {
    if (ready && facilityId) load();
  }, [ready, facilityId, load]);

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
            {t("encounters.title")}
          </h1>
          <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b", maxWidth: 720, lineHeight: 1.55 }}>
            {t("clinicalDashboard.encountersPageIntro")}
          </p>
          <p style={{ margin: "14px 0 0 0" }}>
            <Link href="/app/patients" style={quickLink}>
              {t("clinicalDashboard.backToPatients")}
            </Link>
          </p>
        </header>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <button
            type="button"
            onClick={() => void load()}
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

        <h2
          style={{
            margin: "0 0 8px 0",
            fontSize: 15,
            fontWeight: 600,
            color: "#334155",
          }}
        >
          {t("clinicalDashboard.openEncountersHeading")}
        </h2>
        <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "#64748b", maxWidth: 720, lineHeight: 1.5 }}>
          {t("clinicalDashboard.encountersSectionHint")}
        </p>

        {fetchError ? (
          <div
            style={{
              borderRadius: 16,
              border: "1px solid #fecaca",
              backgroundColor: "#fff",
              padding: 32,
              textAlign: "center",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
            }}
          >
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#0f172a" }}>{fetchError}</p>
            <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b" }}>{t("clinicalDashboard.errorRetryHint")}</p>
            <button
              type="button"
              onClick={() => void load()}
              style={{
                marginTop: 16,
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
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
        ) : encounters.length === 0 ? (
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
              {t("clinicalDashboard.encountersEmptyNone")}
            </p>
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {encounters.map((encounter) => {
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
              const medCount = encounter.pendingMedicationCount;
              const medDisplay =
                typeof medCount === "number" ? (
                  medCount > 0 ? (
                    <span style={{ fontWeight: 700, color: "#b91c1c" }}>{medCount}</span>
                  ) : (
                    <span style={{ color: "#64748b" }}>0</span>
                  )
                ) : (
                  dash
                );

              const linkBase: React.CSSProperties = {
                display: "inline-flex",
                justifyContent: "center",
                padding: "4px 10px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "none",
                textAlign: "center",
              };

              return (
                <li key={encounter.id}>
                  <MedoraCard leftAccentColor={borderLeft} variant="default">
                    <MedoraCardInner>
                      <MedoraCompactPatientCardRow
                        avatarInitials={patientInitials(patient)}
                        roomLabel={t("common.room")}
                        roomValue={room}
                        rightMaxWidth={280}
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
                              <span style={{ fontWeight: 600, color: "#475569" }}>{t("encounters.assignedProvider")}</span> {phys}
                              {" · "}
                              <span style={{ fontWeight: 600, color: "#475569" }}>{t("common.arrival")}</span>{" "}
                              {formatArrivalDateTime(encounter.createdAt, dateLocale, dash)}
                            </p>
                            <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "#334155", lineHeight: 1.35 }}>
                              <span style={{ fontWeight: 600, color: "#64748b", fontSize: 11 }}>{t("encounters.pendingMedications")}</span>{" "}
                              {medDisplay}
                            </p>
                          </>
                        }
                        right={
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "stretch", width: "100%" }}>
                            {pid ? (
                              <Link
                                href={`/app/patients/${pid}`}
                                style={{
                                  ...linkBase,
                                  border: "1px solid #cbd5e1",
                                  backgroundColor: "#fff",
                                  color: "#334155",
                                }}
                              >
                                {t("openEncountersTable.openPatientChart")}
                              </Link>
                            ) : null}
                            <Link
                              href={`/app/encounters/${encounter.id}`}
                              style={{
                                ...linkBase,
                                border: "1px solid #bfdbfe",
                                backgroundColor: "#eff6ff",
                                color: "#1d4ed8",
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
