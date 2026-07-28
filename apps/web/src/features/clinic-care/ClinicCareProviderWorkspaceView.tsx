/**
 * MEDUI.D4C.5 — Ambulatory provider worklist inside Clinic Care shell.
 * Functional queue immediately (no Open card). Groups from canonical clinic stages.
 * Chart → enterprise `/app/encounters/:id` with ambulatory adapter query.
 */

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  clinicCareAmbulatoryProviderChartPath,
  clinicCareAmbulatoryResultsChartPath,
  clinicCareRowMatchesView,
  facilityLocalDayUtcBounds,
  projectClinicCareProviderQueueGroup,
  sortClinicCareProviderQueueGroups,
  type ClinicCareProviderQueueGroup,
  type ClinicCareStageId,
} from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { assignProviderSelf } from "@/lib/clinicalWorklistApi";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { clinicCareStageToken, CLINIC_CARE_SHELL } from "./clinicCareTokens";

type ClinicCareRow = {
  encounterId: string;
  patientId: string;
  patientName: string;
  mrn: string | null;
  status: string;
  workflowState: string | null;
  stageId: ClinicCareStageId;
  createdAt: string;
  roomLabel: string | null;
  chiefComplaint: string | null;
  providerName: string | null;
  resultsPendingCount: number;
  arrivedAt?: string | null;
};

type ClinicCareProjection = {
  facilityTimeZone: string;
  rows: ClinicCareRow[];
};

const compactBtn: React.CSSProperties = {
  display: "inline-flex",
  height: 26,
  alignItems: "center",
  padding: "0 10px",
  borderRadius: 6,
  border: `1px solid ${CLINIC_CARE_SHELL.border}`,
  background: "#fff",
  color: "#0f172a",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
  textDecoration: "none",
};

function groupLabelKey(group: ClinicCareProviderQueueGroup): string {
  switch (group) {
    case "IN_PROGRESS":
      return "clinicCareD4c5.groupInProgress";
    case "RESULTS_PENDING":
      return "clinicCareD4c5.groupResultsPending";
    case "DISCHARGE_PENDING":
      return "clinicCareD4c5.groupDischargePending";
    default:
      return "clinicCareD4c5.groupInProgress";
  }
}

export function ClinicCareProviderWorkspaceView() {
  const { t, language } = useI18n();
  const locale = language === "en" ? "en-US" : "fr-FR";
  const searchParams = useSearchParams();
  const focusEncounterId = searchParams?.get("encounterId") ?? null;
  const { facilityId, roles, ready, facilityTimeZone } = useFacilityAndRoles();
  const isProvider = roles.includes("PROVIDER") || roles.includes("ADMIN");

  const [data, setData] = useState<ClinicCareProjection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const payload = (await apiFetch("/clinic-care/trackboard", { facilityId })) as ClinicCareProjection;
      setData(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const miss = /CLINIC_CARE_SCHEMA_MISS|503/i.test(message);
      setError(miss ? t("clinicCareD4c2.errors.schemaMiss") : t("clinicCareD4c2.errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, t]);

  useEffect(() => {
    if (!ready || !facilityId) return;
    void load();
  }, [ready, facilityId, load]);

  const dayBounds = useMemo(() => {
    const tz = data?.facilityTimeZone || facilityTimeZone || "America/Chicago";
    return facilityLocalDayUtcBounds(new Date(), tz);
  }, [data?.facilityTimeZone, facilityTimeZone]);

  const rows = useMemo(() => {
    return (data?.rows ?? []).filter((row) =>
      clinicCareRowMatchesView({
        view: "PROVIDER",
        stageId: row.stageId,
        createdAt: row.createdAt,
        dayStartUtc: dayBounds.startUtc,
        dayEndExclusiveUtc: dayBounds.endExclusiveUtc,
        hasOpenFollowUpDue: false,
      })
    );
  }, [data?.rows, dayBounds]);

  const grouped = useMemo(() => {
    const map = new Map<ClinicCareProviderQueueGroup, ClinicCareRow[]>();
    for (const row of rows) {
      const group = projectClinicCareProviderQueueGroup(row.stageId);
      if (!group) continue;
      const list = map.get(group) ?? [];
      list.push(row);
      map.set(group, list);
    }
    const groups = sortClinicCareProviderQueueGroups([...map.keys()]);
    return groups.map((g) => ({
      group: g,
      rows: (map.get(g) ?? []).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    }));
  }, [rows]);

  const claim = useCallback(
    async (encounterId: string) => {
      if (!facilityId || !isProvider) return;
      setAssigningId(encounterId);
      try {
        await assignProviderSelf(facilityId, encounterId);
        await load();
      } finally {
        setAssigningId(null);
      }
    },
    [facilityId, isProvider, load]
  );

  const dash = t("common.dash");

  if (!ready) {
    return <p style={{ margin: 0, color: "#64748b" }}>{t("clinicCareD4c2.loading")}</p>;
  }

  return (
    <div data-testid="clinic-care-provider-workspace">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{t("clinicCareD4c5.providerTitle")}</h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
            {t("clinicCareD4c5.providerSubtitle")}
          </p>
        </div>
        <button type="button" onClick={() => void load()} style={compactBtn}>
          {t("clinicCareD4c2.refresh")}
        </button>
      </div>

      {error ? (
        <p role="alert" style={{ color: "#991b1b", fontSize: 13 }}>
          {error}
        </p>
      ) : null}

      {loading && !data ? (
        <p style={{ padding: 12, margin: 0, color: "#64748b" }}>{t("clinicCareD4c2.loading")}</p>
      ) : rows.length === 0 ? (
        <section style={{ ...MEDORA_CARD_SHELL, padding: 12 }}>
          <p style={{ margin: 0, color: "#64748b" }} data-testid="clinic-care-provider-empty">
            {t("clinicCareD4c5.providerEmpty")}
          </p>
        </section>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {grouped.map(({ group, rows: groupRows }) => (
            <section
              key={group}
              data-testid={`clinic-care-provider-group-${group}`}
              style={{ ...MEDORA_CARD_SHELL, padding: 0, overflow: "auto" }}
            >
              <div
                style={{
                  padding: "6px 10px",
                  background: "#f8fafc",
                  borderBottom: `1px solid ${CLINIC_CARE_SHELL.border}`,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#475569",
                }}
              >
                {t(groupLabelKey(group))} · {groupRows.length}
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: "left" }}>
                    <th style={th}>{t("clinicCareD4c2.columns.patient")}</th>
                    <th style={th}>{t("clinicCareD4c2.columns.status")}</th>
                    <th style={th}>{t("clinicCareD4c2.columns.room")}</th>
                    <th style={th}>{t("clinicCareD4c2.columns.provider")}</th>
                    <th style={th}>{t("clinicCareD4c2.columns.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {groupRows.map((row) => {
                    const tok = clinicCareStageToken(row.stageId);
                    const href = clinicCareAmbulatoryProviderChartPath(row.encounterId);
                    const highlight = focusEncounterId === row.encounterId;
                    return (
                      <tr
                        key={row.encounterId}
                        data-testid={`clinic-care-provider-row-${row.encounterId}`}
                        style={{
                          borderTop: `1px solid ${CLINIC_CARE_SHELL.border}`,
                          background: highlight ? "#f0fdfa" : undefined,
                        }}
                      >
                        <td style={td}>
                          <Link href={href} style={{ fontWeight: 650, color: "#0f766e" }}>
                            {row.patientName}
                          </Link>
                          <div style={{ fontSize: 10, color: "#64748b" }}>
                            {row.chiefComplaint || dash}
                          </div>
                        </td>
                        <td style={td}>
                          <span
                            style={{
                              display: "inline-flex",
                              padding: "1px 8px",
                              borderRadius: 999,
                              fontSize: 10,
                              fontWeight: 700,
                              background: tok.bg,
                              color: tok.text,
                              border: `1px solid ${tok.border}`,
                            }}
                          >
                            {row.stageId}
                          </span>
                        </td>
                        <td style={td}>{row.roomLabel || dash}</td>
                        <td style={td}>
                          {row.providerName ||
                            (isProvider && row.status === "OPEN" ? (
                              <button
                                type="button"
                                style={compactBtn}
                                disabled={assigningId === row.encounterId}
                                onClick={() => void claim(row.encounterId)}
                              >
                                {t("clinicCareD4c4.assignMe")}
                              </button>
                            ) : (
                              dash
                            ))}
                        </td>
                        <td style={td}>
                          <div style={{ display: "inline-flex", flexWrap: "wrap", gap: 6 }}>
                            <Link href={href} style={compactBtn}>
                              {t("clinicCareD4c5.openDocumentation")}
                            </Link>
                            {group === "RESULTS_PENDING" || row.resultsPendingCount > 0 ? (
                              <Link
                                href={clinicCareAmbulatoryResultsChartPath(row.encounterId)}
                                style={compactBtn}
                                data-testid={`clinic-care-provider-results-${row.encounterId}`}
                              >
                                {t("clinicCareD4c6.openResultsShort")}
                                {row.resultsPendingCount > 0 ? ` (${row.resultsPendingCount})` : ""}
                              </Link>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}
      <p style={{ marginTop: 8, fontSize: 11, color: "#94a3b8" }}>{t("clinicCareD4c5.workflowHint")}</p>
      <p style={{ display: "none" }} aria-hidden>
        {locale}
      </p>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "6px 8px",
  fontSize: 10,
  fontWeight: 700,
  color: "#64748b",
  background: "#f8fafc",
};

const td: React.CSSProperties = {
  padding: "6px 8px",
  verticalAlign: "middle",
};
