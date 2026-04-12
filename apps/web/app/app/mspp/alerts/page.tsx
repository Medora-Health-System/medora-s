"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import {
  fetchMsppAlertTriageAssignees,
  fetchMsppAlertTriageSnapshot,
  postMsppAlertInvestigationsBatch,
  type MsppAlertInvestigationCompact,
  type MsppAlertTriageAssignee,
  type MsppAlertTriageSnapshotResponse,
} from "@/lib/msppApi";
import { MsppAlertTriageSection } from "@/features/mspp/MsppAlertTriageSection";
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
} from "@/features/mspp/msppUiChrome";

function formatWindowLine(t: (key: string) => string, win: MsppAlertTriageSnapshotResponse["window"]): string {
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

export default function MsppAlertsInboxPage() {
  const { t } = useI18n();
  const { ready, msppRoles } = useFacilityAndRoles();
  const canMspp = msppRoles.length > 0;

  const [data, setData] = useState<MsppAlertTriageSnapshotResponse | null>(null);
  const [assignees, setAssignees] = useState<MsppAlertTriageAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diseaseQuery, setDiseaseQuery] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [expandedAlertKey, setExpandedAlertKey] = useState<string | null>(null);
  const [investigationByAlertKey, setInvestigationByAlertKey] = useState<
    Record<string, MsppAlertInvestigationCompact | undefined>
  >({});

  const load = useCallback(async () => {
    if (!canMspp) return;
    setLoading(true);
    setError(null);
    try {
      const [snap, users] = await Promise.all([fetchMsppAlertTriageSnapshot(), fetchMsppAlertTriageAssignees()]);
      setData(snap);
      setAssignees(users);
    } catch {
      setError(t("msppAlertsInboxPage.loadError"));
      setData(null);
      setAssignees([]);
    } finally {
      setLoading(false);
    }
  }, [canMspp, t]);

  useEffect(() => {
    if (ready && canMspp) void load();
    else if (ready && !canMspp) setLoading(false);
  }, [ready, canMspp, load]);

  const onRefresh = useCallback(async () => {
    await load();
  }, [load]);

  const refreshInvestigations = useCallback(async () => {
    if (!data?.escalations?.length) return;
    try {
      const keys = data.escalations.map((e) => e.alertKey);
      const res = await postMsppAlertInvestigationsBatch({ alertKeys: keys });
      const m: Record<string, MsppAlertInvestigationCompact | undefined> = {};
      for (const inv of res.investigations) {
        m[inv.alertKey] = inv;
      }
      setInvestigationByAlertKey(m);
    } catch {
      /* conserver l’état affiché */
    }
  }, [data?.escalations]);

  useEffect(() => {
    if (data?.escalations?.length) void refreshInvestigations();
  }, [data?.generatedAt, refreshInvestigations]);

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

  function toggleExpand(alertKey: string) {
    setExpandedAlertKey((k) => (k === alertKey ? null : alertKey));
  }

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
      <p style={{ fontSize: 13, color: "#64748b", marginTop: 8, marginBottom: 4, fontWeight: 600 }}>
        {t("msppAlertsInboxPage.disclaimer")}
      </p>
      <p style={{ fontSize: 13, color: "#64748b", marginTop: 0, marginBottom: 12 }}>{t("msppAlertsInboxPage.subtitleTriage")}</p>

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
              <MsppAlertTriageSection
                title={t("msppEscalations.level.URGENT")}
                rows={urgentRows}
                window={data.window}
                assignees={assignees}
                expandedAlertKey={expandedAlertKey}
                onToggleExpand={toggleExpand}
                onRefresh={onRefresh}
                investigationByAlertKey={investigationByAlertKey}
                onRefreshInvestigations={refreshInvestigations}
              />
              <div style={{ marginTop: 16 }} />
              <MsppAlertTriageSection
                title={t("msppEscalations.level.PRIORITY")}
                rows={priorityRows}
                window={data.window}
                assignees={assignees}
                expandedAlertKey={expandedAlertKey}
                onToggleExpand={toggleExpand}
                onRefresh={onRefresh}
                investigationByAlertKey={investigationByAlertKey}
                onRefreshInvestigations={refreshInvestigations}
              />
              <div style={{ marginTop: 16 }} />
              <MsppAlertTriageSection
                title={t("msppEscalations.level.WATCH")}
                rows={watchRows}
                window={data.window}
                assignees={assignees}
                expandedAlertKey={expandedAlertKey}
                onToggleExpand={toggleExpand}
                onRefresh={onRefresh}
                investigationByAlertKey={investigationByAlertKey}
                onRefreshInvestigations={refreshInvestigations}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
