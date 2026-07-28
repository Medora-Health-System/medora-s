/**
 * MEDUI.D4C.5 — Ambulatory encounters list inside Clinic Care shell.
 * Direct content (no Open card); enterprise encounter authority + AMBULATORY filter.
 */

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CLINIC_CARE_AMBULATORY_ENCOUNTER_TYPES,
  bucketClinicCareVisitType,
  clinicCareAmbulatoryOpenWorkspacePathForRole,
  isClinicCareAmbulatoryEncounterType,
  localDateKeyForInstant,
  projectClinicCarePatientFlowStage,
  type ClinicCarePatientFlowStage,
  type ClinicCareVisitTypeBucket,
} from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { tEncounterStatus, tEncounterType } from "@/lib/encounterChromeI18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { CLINIC_CARE_SHELL } from "./clinicCareTokens";

type EncounterRow = {
  id: string;
  encounterId?: string;
  type?: string;
  encounterType?: string;
  status?: string;
  createdAt?: string;
  workflowState?: string | null;
  visitOrigin?: string | null;
  roomLabel?: string | null;
  patientName?: string | null;
  mrn?: string | null;
  patient?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    mrn?: string | null;
  };
};

type ClinicCareProjection = {
  facilityTimeZone?: string;
  rows: Array<{
    encounterId: string;
    patientId: string;
    patientName: string;
    mrn: string | null;
    encounterType: string;
    status: string;
    createdAt?: string;
    workflowState?: string | null;
    visitOrigin?: string | null;
    roomLabel: string | null;
  }>;
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

function normalizeRow(raw: EncounterRow): EncounterRow {
  const id = raw.encounterId || raw.id;
  return { ...raw, id };
}

export function ClinicCareAmbulatoryEncountersView() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const dateFilter = searchParams?.get("date")?.trim() || null;
  const flowFilter = (searchParams?.get("flow")?.trim().toUpperCase() ||
    null) as ClinicCarePatientFlowStage | null;
  const visitTypeFilter = (searchParams?.get("visitType")?.trim().toUpperCase() ||
    null) as ClinicCareVisitTypeBucket | null;
  const { facilityId, ready, facilityTimeZone, roles } = useFacilityAndRoles();
  const [rows, setRows] = useState<EncounterRow[]>([]);
  const [boardTz, setBoardTz] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [ambulatoryOnly, setAmbulatoryOnly] = useState(true);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      // Always use Clinic Care ambulatory trackboard — never ED-gated /trackboard.
      const payload = (await apiFetch("/clinic-care/trackboard", {
        facilityId,
      })) as ClinicCareProjection;
      setBoardTz(payload.facilityTimeZone ?? null);
      let next = (payload.rows ?? []).map((r) =>
        normalizeRow({
          id: r.encounterId,
          encounterId: r.encounterId,
          type: r.encounterType,
          encounterType: r.encounterType,
          status: r.status,
          createdAt: r.createdAt,
          workflowState: r.workflowState,
          visitOrigin: r.visitOrigin,
          roomLabel: r.roomLabel,
          patientName: r.patientName,
          mrn: r.mrn,
        })
      );
      if (ambulatoryOnly) {
        next = next.filter((r) =>
          isClinicCareAmbulatoryEncounterType(r.type || r.encounterType)
        );
      }
      setRows(next);
    } catch (err) {
      setError(
        err instanceof Error && err.message.trim()
          ? err.message
          : t("clinicCareD4c5.encountersLoadError")
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [facilityId, t, ambulatoryOnly]);

  useEffect(() => {
    if (!ready || !facilityId) return;
    void load();
  }, [ready, facilityId, load]);

  const tz = boardTz || facilityTimeZone || undefined;

  const filtered = useMemo(() => {
    let list = rows;
    if (dateFilter) {
      list = list.filter((r) => {
        if (!r.createdAt) return false;
        return localDateKeyForInstant(r.createdAt, tz) === dateFilter;
      });
    }
    if (flowFilter) {
      list = list.filter((r) => {
        const stage = projectClinicCarePatientFlowStage({
          encounterStatus: r.status,
          workflowState: r.workflowState,
        });
        return stage === flowFilter;
      });
    }
    if (visitTypeFilter) {
      list = list.filter(
        (r) =>
          bucketClinicCareVisitType({
            visitOrigin: r.visitOrigin,
            encounterType: r.type || r.encounterType,
          }) === visitTypeFilter
      );
    }
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => {
      const name =
        (r.patientName ?? `${r.patient?.firstName ?? ""} ${r.patient?.lastName ?? ""}`).toLowerCase();
      const mrn = (r.mrn ?? r.patient?.mrn ?? "").toLowerCase();
      return name.includes(q) || mrn.includes(q) || r.id.toLowerCase().includes(q);
    });
  }, [rows, query, dateFilter, flowFilter, visitTypeFilter, tz]);

  if (!ready) {
    return <p style={{ margin: 0, color: "#64748b" }}>{t("clinicCareD4c2.loading")}</p>;
  }

  return (
    <div data-testid="clinic-care-ambulatory-encounters">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{t("clinicCareD4c5.encountersTitle")}</h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
            {t("clinicCareD4c5.encountersSubtitle")}
            {dateFilter ? ` · ${dateFilter}` : ""}
          </p>
        </div>
        <button type="button" onClick={() => void load()} style={compactBtn}>
          {t("clinicCareD4c2.refresh")}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("clinicCareD4c5.encountersSearchPlaceholder")}
          aria-label={t("clinicCareD4c5.encountersSearchPlaceholder")}
          style={{
            flex: "1 1 200px",
            minWidth: 160,
            height: 30,
            padding: "0 10px",
            borderRadius: 6,
            border: `1px solid ${CLINIC_CARE_SHELL.border}`,
            fontSize: 12,
          }}
        />
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#334155" }}>
          <input
            type="checkbox"
            checked={ambulatoryOnly}
            onChange={(e) => setAmbulatoryOnly(e.target.checked)}
            data-testid="clinic-care-encounters-ambulatory-filter"
          />
          {t("clinicCareD4c5.ambulatoryFilter")}
        </label>
      </div>

      {error ? (
        <div role="alert" style={{ marginBottom: 10 }}>
          <p style={{ color: "#991b1b", fontSize: 13, margin: "0 0 8px" }}>{error}</p>
          <button type="button" onClick={() => void load()} style={compactBtn}>
            {t("clinicCareD4c5.encountersRetry")}
          </button>
        </div>
      ) : null}

      <section style={{ ...MEDORA_CARD_SHELL, padding: 0, overflow: "auto" }}>
        {loading && rows.length === 0 ? (
          <p style={{ padding: 12, margin: 0, color: "#64748b" }}>{t("clinicCareD4c2.loading")}</p>
        ) : filtered.length === 0 ? (
          <p style={{ padding: 12, margin: 0, color: "#64748b" }} data-testid="clinic-care-encounters-empty">
            {t("clinicCareD4c5.encountersEmpty")}
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={th}>{t("clinicCareD4c2.columns.patient")}</th>
                <th style={th}>{t("common.type")}</th>
                <th style={th}>{t("clinicCareD4c2.columns.status")}</th>
                <th style={th}>{t("clinicCareD4c2.columns.room")}</th>
                <th style={th}>{t("clinicCareD4c2.columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const name =
                  (row.patientName ??
                    `${row.patient?.firstName ?? ""} ${row.patient?.lastName ?? ""}`.trim()) ||
                  t("common.dash");
                const encType = row.type || row.encounterType;
                const href = isClinicCareAmbulatoryEncounterType(encType)
                  ? clinicCareAmbulatoryOpenWorkspacePathForRole(row.id, {
                      roleCodes: roles,
                      from: "consultations",
                    })
                  : `/app/encounters/${encodeURIComponent(row.id)}`;
                return (
                  <tr
                    key={row.id}
                    data-testid={`clinic-care-encounter-row-${row.id}`}
                    style={{ borderTop: `1px solid ${CLINIC_CARE_SHELL.border}` }}
                  >
                    <td style={td}>
                      <Link href={href} style={{ fontWeight: 650, color: "#0f766e" }}>
                        {name}
                      </Link>
                      <div style={{ fontSize: 10, color: "#64748b" }}>
                        {row.mrn || row.patient?.mrn || t("common.dash")}
                      </div>
                    </td>
                    <td style={td}>{encType ? tEncounterType(t, encType) : t("common.dash")}</td>
                    <td style={td}>{row.status ? tEncounterStatus(t, row.status) : t("common.dash")}</td>
                    <td style={td}>{row.roomLabel || t("common.dash")}</td>
                    <td style={td}>
                      <Link href={href} style={compactBtn}>
                        {t("clinicCareD4c4.openChart")}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
      <p style={{ marginTop: 8, fontSize: 11, color: "#94a3b8" }}>
        {t("clinicCareD4c5.encountersFilterHint").replace(
          "{types}",
          CLINIC_CARE_AMBULATORY_ENCOUNTER_TYPES.join(", ")
        )}
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
