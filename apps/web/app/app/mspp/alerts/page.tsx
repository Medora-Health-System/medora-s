"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import {
  fetchMsppAlertEscalations,
  type MsppAlertEscalationRow,
  type MsppAlertEscalationsResponse,
} from "@/lib/msppApi";
import { formatMsppEscalationGeo } from "@/features/mspp/msppEscalationFormatters";
import {
  MSPP_EMPTY_STATE,
  MSPP_ERROR_CALLOUT,
  MSPP_KPI_GRID,
  MSPP_KPI_LABEL,
  MSPP_KPI_TILE,
  MSPP_KPI_VALUE,
  MSPP_NAV_LINK,
  MSPP_NAV_ROW,
  MSPP_PAGE_SHELL,
  MSPP_PAGE_SUBTITLE,
  MSPP_PAGE_TITLE,
  MSPP_SECTION_CARD,
  MSPP_SECTION_SUBTITLE,
  MSPP_SECTION_TITLE,
  MSPP_TABLE,
  MSPP_TABLE_CELL,
  MSPP_TABLE_HEAD_CELL,
} from "@/features/mspp/msppUiChrome";

function signalLevelBadgeStyle(level: MsppAlertEscalationRow["signalLevel"]): React.CSSProperties {
  if (level === "HIGH") {
    return {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 9999,
      fontSize: 12,
      fontWeight: 600,
      background: "rgba(234, 179, 8, 0.2)",
      color: "#a16207",
    };
  }
  if (level === "MEDIUM") {
    return {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 9999,
      fontSize: 12,
      fontWeight: 600,
      background: "rgba(59, 130, 246, 0.14)",
      color: "#1d4ed8",
    };
  }
  return {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 9999,
    fontSize: 12,
    fontWeight: 600,
    background: "rgba(100, 116, 139, 0.12)",
    color: "#475569",
  };
}

function formatWindowLine(t: (key: string) => string, win: MsppAlertEscalationsResponse["window"]): string {
  try {
    const curS = new Date(win.currentStart);
    const curE = new Date(win.currentEnd);
    const prevS = new Date(win.previousStart);
    const prevE = new Date(win.previousEnd);
    if ([curS, curE, prevS, prevE].some((d) => Number.isNaN(d.getTime()))) {
      return "";
    }
    const fmt = (a: Date, b: Date) =>
      `${a.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} — ${b.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}`;
    return t("msppSanitarySignals.windowHint")
      .replace("{prev}", fmt(prevS, prevE))
      .replace("{cur}", fmt(curS, curE));
  } catch {
    return "";
  }
}

function EscalationSection({
  title,
  rows,
  t,
}: {
  title: string;
  rows: MsppAlertEscalationRow[];
  t: (key: string) => string;
}) {
  if (rows.length === 0) {
    return (
      <div style={MSPP_SECTION_CARD}>
        <h2 style={MSPP_SECTION_TITLE}>{title}</h2>
        <p style={MSPP_EMPTY_STATE}>{t("msppAlertsInboxPage.sectionEmpty")}</p>
      </div>
    );
  }

  return (
    <div style={MSPP_SECTION_CARD}>
      <h2 style={MSPP_SECTION_TITLE}>{title}</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={MSPP_TABLE}>
          <thead>
            <tr>
              <th style={MSPP_TABLE_HEAD_CELL}>{t("msppEscalations.colDisease")}</th>
              <th style={MSPP_TABLE_HEAD_CELL}>{t("msppEscalations.colGeo")}</th>
              <th style={MSPP_TABLE_HEAD_CELL}>{t("msppEscalations.colSignalLevel")}</th>
              <th style={{ ...MSPP_TABLE_HEAD_CELL, textAlign: "right" }}>{t("msppAlertsInboxPage.colDelta")}</th>
              <th style={MSPP_TABLE_HEAD_CELL}>{t("msppEscalations.colReason")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const sigLabel = t(`msppSanitarySignals.level.${row.signalLevel}`);
              const reason = t(`msppEscalations.reason.${row.escalationReasonCode}`);
              const key = `${row.escalationLevel}-${row.scope}-${row.diseaseCode}-${row.departmentId}-${row.geoCommuneId ?? "dept"}-${idx}`;
              return (
                <tr key={key}>
                  <td style={MSPP_TABLE_CELL}>
                    <div style={{ fontWeight: 600 }}>{row.diseaseName?.trim() || row.diseaseCode}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{row.diseaseCode}</div>
                  </td>
                  <td style={MSPP_TABLE_CELL}>{formatMsppEscalationGeo(row)}</td>
                  <td style={MSPP_TABLE_CELL}>
                    <span style={signalLevelBadgeStyle(row.signalLevel)}>{sigLabel}</span>
                  </td>
                  <td style={{ ...MSPP_TABLE_CELL, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    +{row.delta}
                  </td>
                  <td style={{ ...MSPP_TABLE_CELL, fontSize: 13, color: "#475569" }}>{reason}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MsppAlertsInboxPage() {
  const { t } = useI18n();
  const { ready, msppRoles } = useFacilityAndRoles();
  const canMspp = msppRoles.length > 0;

  const [data, setData] = useState<MsppAlertEscalationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diseaseQuery, setDiseaseQuery] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const load = useCallback(async () => {
    if (!canMspp) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMsppAlertEscalations();
      setData(res);
    } catch {
      setError(t("msppAlertsInboxPage.loadError"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [canMspp, t]);

  useEffect(() => {
    if (ready && canMspp) void load();
    else if (ready && !canMspp) setLoading(false);
  }, [ready, canMspp, load]);

  const departmentOptions = useMemo(() => {
    const rows = data?.escalations ?? [];
    const m = new Map<string, string>();
    for (const r of rows) {
      const name = r.departmentName?.trim() || r.departmentCode?.trim() || r.departmentId;
      m.set(r.departmentId, name);
    }
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], "fr"));
  }, [data?.escalations]);

  const filteredRows = useMemo(() => {
    const rows = data?.escalations ?? [];
    const q = diseaseQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (departmentId && r.departmentId !== departmentId) return false;
      if (!q) return true;
      const name = (r.diseaseName ?? "").toLowerCase();
      const code = (r.diseaseCode ?? "").toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [data?.escalations, diseaseQuery, departmentId]);

  const urgentRows = useMemo(
    () => filteredRows.filter((r) => r.escalationLevel === "URGENT"),
    [filteredRows]
  );
  const priorityRows = useMemo(
    () => filteredRows.filter((r) => r.escalationLevel === "PRIORITY"),
    [filteredRows]
  );
  const watchRows = useMemo(
    () => filteredRows.filter((r) => r.escalationLevel === "WATCH"),
    [filteredRows]
  );

  const counts = useMemo(
    () => ({
      urgent: urgentRows.length,
      priority: priorityRows.length,
      watch: watchRows.length,
      total: filteredRows.length,
    }),
    [urgentRows.length, priorityRows.length, watchRows.length, filteredRows.length]
  );

  const winLine = data ? formatWindowLine(t, data.window) : "";
  const generatedLine = data
    ? t("msppAlertsInboxPage.generatedAt").replace(
        "{time}",
        new Date(data.generatedAt).toLocaleString("fr-FR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      )
    : "";

  if (!ready) {
    return (
      <div style={MSPP_PAGE_SHELL}>
        <p style={{ color: "#64748b", marginTop: 0 }}>{t("common.loading")}</p>
      </div>
    );
  }

  if (!canMspp) {
    return (
      <div style={MSPP_PAGE_SHELL}>
        <h1 style={MSPP_PAGE_TITLE}>{t("msppAlertsInboxPage.pageTitle")}</h1>
        <p style={{ color: "#64748b", marginTop: 0 }}>{t("common.unauthorizedRedirect")}</p>
      </div>
    );
  }

  return (
    <div style={MSPP_PAGE_SHELL}>
      <h1 style={MSPP_PAGE_TITLE}>{t("msppAlertsInboxPage.pageTitle")}</h1>
      <p style={MSPP_PAGE_SUBTITLE}>{t("msppAlertsInboxPage.subtitle")}</p>
      <p style={{ fontSize: 13, color: "#64748b", marginTop: 8, marginBottom: 12, fontWeight: 600 }}>
        {t("msppAlertsInboxPage.disclaimer")}
      </p>

      <div style={MSPP_NAV_ROW}>
        <Link href="/app/mspp/dashboard" style={MSPP_NAV_LINK}>
          {t("msppAlertsInboxPage.linkDashboard")}
        </Link>
        <Link href="/app/mspp/validation" style={MSPP_NAV_LINK}>
          {t("msppAlertsInboxPage.linkValidation")}
        </Link>
      </div>

      {error && (
        <div style={MSPP_ERROR_CALLOUT} role="alert">
          <p style={{ color: "#991b1b", margin: 0, fontWeight: 600 }}>{error}</p>
        </div>
      )}

      {loading ? (
        <p style={{ color: "#64748b", marginTop: 16 }}>{t("common.loading")}</p>
      ) : !data ? null : (
        <>
          <div style={{ ...MSPP_SECTION_CARD, marginTop: 16 }}>
            <p style={{ ...MSPP_SECTION_SUBTITLE, margin: 0, fontSize: 13 }}>{generatedLine}</p>
            {winLine ? (
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 8, marginBottom: 0 }}>{winLine}</p>
            ) : null}
            {data.truncated ? (
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 8, marginBottom: 0 }}>
                {t("msppEscalations.truncated")
                  .replace("{shown}", String(data.escalations.length))
                  .replace("{total}", String(data.totalMatchedBeforeCap))}
              </p>
            ) : null}
          </div>

          <div style={{ ...MSPP_SECTION_CARD, marginTop: 16 }}>
            <h2 style={MSPP_SECTION_TITLE}>{t("msppAlertsInboxPage.sectionSummary")}</h2>
            <div style={MSPP_KPI_GRID}>
              <div style={MSPP_KPI_TILE}>
                <div style={MSPP_KPI_LABEL}>{t("msppEscalations.level.URGENT")}</div>
                <div style={MSPP_KPI_VALUE}>{counts.urgent}</div>
              </div>
              <div style={MSPP_KPI_TILE}>
                <div style={MSPP_KPI_LABEL}>{t("msppEscalations.level.PRIORITY")}</div>
                <div style={MSPP_KPI_VALUE}>{counts.priority}</div>
              </div>
              <div style={MSPP_KPI_TILE}>
                <div style={MSPP_KPI_LABEL}>{t("msppEscalations.level.WATCH")}</div>
                <div style={MSPP_KPI_VALUE}>{counts.watch}</div>
              </div>
              <div style={MSPP_KPI_TILE}>
                <div style={MSPP_KPI_LABEL}>{t("msppAlertsInboxPage.kpiFilteredTotal")}</div>
                <div style={MSPP_KPI_VALUE}>{counts.total}</div>
              </div>
            </div>
          </div>

          <div
            style={{
              ...MSPP_SECTION_CARD,
              marginTop: 16,
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "flex-end",
            }}
          >
            <div style={{ flex: "1 1 200px" }}>
              <label htmlFor="mspp-alerts-disease" style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                {t("msppAlertsInboxPage.filterDisease")}
              </label>
              <input
                id="mspp-alerts-disease"
                type="search"
                value={diseaseQuery}
                onChange={(e) => setDiseaseQuery(e.target.value)}
                placeholder={t("msppAlertsInboxPage.filterDiseasePlaceholder")}
                style={{
                  width: "100%",
                  maxWidth: 320,
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  fontSize: 14,
                }}
                autoComplete="off"
              />
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label htmlFor="mspp-alerts-dept" style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                {t("msppAlertsInboxPage.filterDepartment")}
              </label>
              <select
                id="mspp-alerts-dept"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: 280,
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  fontSize: 14,
                  background: "#fff",
                }}
              >
                <option value="">{t("msppAlertsInboxPage.filterDepartmentAll")}</option>
                {departmentOptions.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <div style={{ ...MSPP_SECTION_CARD, marginTop: 16 }}>
              <p style={MSPP_EMPTY_STATE}>
                {data.escalations.length === 0 && !diseaseQuery.trim() && !departmentId
                  ? t("msppAlertsInboxPage.emptyAll")
                  : t("msppAlertsInboxPage.emptyFiltered")}
              </p>
            </div>
          ) : (
            <>
              <div style={{ marginTop: 20 }} />
              <EscalationSection title={t("msppEscalations.level.URGENT")} rows={urgentRows} t={t} />
              <div style={{ marginTop: 16 }} />
              <EscalationSection title={t("msppEscalations.level.PRIORITY")} rows={priorityRows} t={t} />
              <div style={{ marginTop: 16 }} />
              <EscalationSection title={t("msppEscalations.level.WATCH")} rows={watchRows} t={t} />
            </>
          )}
        </>
      )}
    </div>
  );
}
