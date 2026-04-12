"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import {
  fetchMsppValidationAnalytics,
  type MsppValidationAnalyticsResponse,
  type MsppValidationDeptAnalyticsRow,
} from "@/lib/msppApi";
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

function formatDurationMs(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  const days = ms / 86400000;
  if (days >= 1) return `${days.toFixed(1)} j`;
  const hours = ms / 3600000;
  return `${hours.toFixed(1)} h`;
}

function reviewStatusLabel(t: (key: string) => string, status: string): string {
  const key = `msppValidation.reviewStatus.${status}`;
  const out = t(key);
  return out === key ? status : out;
}

type SortKey =
  | "departmentName"
  | "pendingSum"
  | "approvedCentral"
  | "requeueEvents"
  | "avgMsFullCycle";

export default function MsppValidationAnalyticsPage() {
  const { t } = useI18n();
  const { ready, msppRoles } = useFacilityAndRoles();
  const canMspp = msppRoles.length > 0;

  const [data, setData] = useState<MsppValidationAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("departmentName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const load = useCallback(async () => {
    if (!canMspp) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMsppValidationAnalytics();
      setData(res);
    } catch {
      setError(t("msppValidationAnalyticsPage.loadError"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [canMspp, t]);

  useEffect(() => {
    if (ready && canMspp) void load();
    else if (ready && !canMspp) setLoading(false);
  }, [ready, canMspp, load]);

  const sortedDepartments = useMemo(() => {
    const rows = [...(data?.departments ?? [])];
    const dir = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      if (sortKey === "departmentName") {
        const an = (a.departmentName ?? "").localeCompare(b.departmentName ?? "", "fr");
        return dir * an;
      }
      if (sortKey === "pendingSum") {
        const sa = a.pendingDepartment + a.pendingCentral;
        const sb = b.pendingDepartment + b.pendingCentral;
        return dir * (sa - sb);
      }
      if (sortKey === "approvedCentral") return dir * (a.approvedCentral - b.approvedCentral);
      if (sortKey === "requeueEvents") return dir * (a.requeueEvents - b.requeueEvents);
      const avga = a.avgMsFullCycle ?? -1;
      const avgb = b.avgMsFullCycle ?? -1;
      return dir * (avga - avgb);
    });
    return rows;
  }, [data?.departments, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "departmentName" ? "asc" : "desc");
    }
  }

  const statusEntries = useMemo(() => Object.entries(data?.statusCounts ?? {}).sort((a, b) => b[1] - a[1]), [data]);
  const reviewerEntries = useMemo(
    () => Object.entries(data?.reviewerLevelCounts ?? {}).sort((a, b) => b[1] - a[1]),
    [data]
  );

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
        <h1 style={MSPP_PAGE_TITLE}>{t("msppValidationAnalyticsPage.pageTitle")}</h1>
        <p style={{ color: "#64748b", marginTop: 0 }}>{t("common.unauthorizedRedirect")}</p>
      </div>
    );
  }

  const flow = data?.flow;
  const sharePct =
    flow?.requeueShareOfVolume != null ? (flow.requeueShareOfVolume * 100).toFixed(1) : "—";

  return (
    <div style={MSPP_PAGE_SHELL}>
      <h1 style={MSPP_PAGE_TITLE}>{t("msppValidationAnalyticsPage.pageTitle")}</h1>
      <p style={MSPP_PAGE_SUBTITLE}>{t("msppValidationAnalyticsPage.subtitle")}</p>
      <p style={{ fontSize: 13, color: "#64748b", marginTop: 8, marginBottom: 12 }}>
        {t("msppValidationAnalyticsPage.disclaimer")}
      </p>

      <div style={MSPP_NAV_ROW}>
        <Link href="/app/mspp/dashboard" style={MSPP_NAV_LINK}>
          {t("msppValidationAnalyticsPage.linkDashboard")}
        </Link>
        <Link href="/app/mspp/validation" style={MSPP_NAV_LINK}>
          {t("msppValidationAnalyticsPage.linkValidation")}
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
            <h2 style={MSPP_SECTION_TITLE}>{t("msppValidationAnalyticsPage.sectionScope")}</h2>
            <p style={{ ...MSPP_SECTION_SUBTITLE, margin: 0, fontSize: 13, lineHeight: 1.5 }}>{data.scopeNote}</p>
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 8, marginBottom: 0 }}>
              {t("msppValidationAnalyticsPage.timingLookback").replace("{days}", String(data.timingLookbackDays))}
            </p>
          </div>

          <div style={{ ...MSPP_SECTION_CARD, marginTop: 16 }}>
            <h2 style={MSPP_SECTION_TITLE}>{t("msppValidationAnalyticsPage.sectionKpi")}</h2>
            <div style={MSPP_KPI_GRID}>
              <div style={MSPP_KPI_TILE}>
                <div style={MSPP_KPI_LABEL}>{t("msppValidationAnalyticsPage.kpiPendingDept")}</div>
                <div style={MSPP_KPI_VALUE}>{data.summary.pendingDepartment}</div>
              </div>
              <div style={MSPP_KPI_TILE}>
                <div style={MSPP_KPI_LABEL}>{t("msppValidationAnalyticsPage.kpiPendingCentral")}</div>
                <div style={MSPP_KPI_VALUE}>{data.summary.pendingCentral}</div>
              </div>
              <div style={MSPP_KPI_TILE}>
                <div style={MSPP_KPI_LABEL}>{t("msppValidationAnalyticsPage.kpiApproved")}</div>
                <div style={MSPP_KPI_VALUE}>{data.summary.approvedCentral}</div>
              </div>
              <div style={MSPP_KPI_TILE}>
                <div style={MSPP_KPI_LABEL}>{t("msppValidationAnalyticsPage.kpiRejected")}</div>
                <div style={MSPP_KPI_VALUE}>{data.summary.rejectedTotal}</div>
              </div>
              <div style={MSPP_KPI_TILE}>
                <div style={MSPP_KPI_LABEL}>{t("msppValidationAnalyticsPage.kpiRequeue")}</div>
                <div style={MSPP_KPI_VALUE}>{data.summary.requeueEventsTotal}</div>
              </div>
            </div>
          </div>

          <div style={{ ...MSPP_SECTION_CARD, marginTop: 16 }}>
            <h2 style={MSPP_SECTION_TITLE}>{t("msppValidationAnalyticsPage.sectionStatus")}</h2>
            {statusEntries.length === 0 ? (
              <p style={MSPP_EMPTY_STATE}>—</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 20, color: "#334155" }}>
                {statusEntries.map(([st, c]) => (
                  <li key={st} style={{ marginBottom: 4 }}>
                    <strong>{reviewStatusLabel(t, st)}</strong> : {c}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ ...MSPP_SECTION_CARD, marginTop: 16 }}>
            <h2 style={MSPP_SECTION_TITLE}>{t("msppValidationAnalyticsPage.sectionReviewer")}</h2>
            {reviewerEntries.length === 0 ? (
              <p style={MSPP_EMPTY_STATE}>—</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 20, color: "#334155" }}>
                {reviewerEntries.map(([lv, c]) => (
                  <li key={lv} style={{ marginBottom: 4 }}>
                    <strong>{t(`msppValidation.reviewerLevel.${lv}`)}</strong> : {c}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ ...MSPP_SECTION_CARD, marginTop: 16 }}>
            <h2 style={MSPP_SECTION_TITLE}>{t("msppValidationAnalyticsPage.sectionFlow")}</h2>
            <p style={{ margin: "8px 0 0", color: "#334155" }}>
              {t("msppValidationAnalyticsPage.flowDecisions")} : <strong>{flow?.terminalDecisionEventsTotal ?? 0}</strong>
            </p>
            <p style={{ margin: "8px 0 0", color: "#334155" }}>
              {t("msppValidationAnalyticsPage.flowRequeueShare")} : <strong>{sharePct} %</strong>
            </p>
          </div>

          <div style={{ ...MSPP_SECTION_CARD, marginTop: 16 }}>
            <h2 style={MSPP_SECTION_TITLE}>{t("msppValidationAnalyticsPage.sectionTiming")}</h2>
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 0 }}>
              {t("msppValidationAnalyticsPage.timingSamplesSummary")
                .replace("{n1}", String(data.timing.sampleSizeReportToFirstDept))
                .replace("{n2}", String(data.timing.sampleSizeDeptApproveToCentral))
                .replace("{n3}", String(data.timing.sampleSizeFullCycle))}
            </p>
            <ul style={{ margin: "12px 0 0", paddingLeft: 20, color: "#334155", lineHeight: 1.6 }}>
              <li>
                {t("msppValidationAnalyticsPage.timingReportToDept")} :{" "}
                <strong>{formatDurationMs(data.timing.avgMsReportToFirstDeptDecision)}</strong> (
                {t("msppValidationAnalyticsPage.timingSample").replace("{n}", String(data.timing.sampleSizeReportToFirstDept))})
              </li>
              <li>
                {t("msppValidationAnalyticsPage.timingDeptToCentral")} :{" "}
                <strong>{formatDurationMs(data.timing.avgMsDepartmentApprovalToCentralDecision)}</strong> (
                {t("msppValidationAnalyticsPage.timingSample").replace("{n}", String(data.timing.sampleSizeDeptApproveToCentral))})
              </li>
              <li>
                {t("msppValidationAnalyticsPage.timingFull")} :{" "}
                <strong>{formatDurationMs(data.timing.avgMsReportToCentralFinal)}</strong> (
                {t("msppValidationAnalyticsPage.timingSample").replace("{n}", String(data.timing.sampleSizeFullCycle))})
              </li>
            </ul>
          </div>

          <div style={{ ...MSPP_SECTION_CARD, marginTop: 16, marginBottom: 0 }}>
            <h2 style={MSPP_SECTION_TITLE}>{t("msppValidationAnalyticsPage.sectionDepartments")}</h2>
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 0 }}>{t("msppValidationAnalyticsPage.sortHint")}</p>
            <div style={{ overflowX: "auto" }}>
              <table style={MSPP_TABLE}>
                <thead>
                  <tr>
                    <th style={MSPP_TABLE_HEAD_CELL}>
                      <button
                        type="button"
                        onClick={() => toggleSort("departmentName")}
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit", fontWeight: 700 }}
                      >
                        {t("msppValidationAnalyticsPage.colDept")}
                      </button>
                    </th>
                    <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidationAnalyticsPage.colCode")}</th>
                    <th style={{ ...MSPP_TABLE_HEAD_CELL, textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => toggleSort("pendingSum")}
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit", fontWeight: 700 }}
                      >
                        {t("msppValidationAnalyticsPage.colPendingDept")} + {t("msppValidationAnalyticsPage.colPendingCentral")}
                      </button>
                    </th>
                    <th style={{ ...MSPP_TABLE_HEAD_CELL, textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => toggleSort("approvedCentral")}
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit", fontWeight: 700 }}
                      >
                        {t("msppValidationAnalyticsPage.colApproved")}
                      </button>
                    </th>
                    <th style={{ ...MSPP_TABLE_HEAD_CELL, textAlign: "right" }}>{t("msppValidationAnalyticsPage.colRejDept")}</th>
                    <th style={{ ...MSPP_TABLE_HEAD_CELL, textAlign: "right" }}>{t("msppValidationAnalyticsPage.colRejCentral")}</th>
                    <th style={{ ...MSPP_TABLE_HEAD_CELL, textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => toggleSort("requeueEvents")}
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit", fontWeight: 700 }}
                      >
                        {t("msppValidationAnalyticsPage.colRequeue")}
                      </button>
                    </th>
                    <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidationAnalyticsPage.colBacklog")}</th>
                    <th style={{ ...MSPP_TABLE_HEAD_CELL, textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => toggleSort("avgMsFullCycle")}
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit", fontWeight: 700 }}
                      >
                        {t("msppValidationAnalyticsPage.colAvgCycle")}
                      </button>
                    </th>
                    <th style={{ ...MSPP_TABLE_HEAD_CELL, textAlign: "right" }}>{t("msppValidationAnalyticsPage.colSample")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDepartments.map((r: MsppValidationDeptAnalyticsRow) => (
                    <tr key={r.departmentId}>
                      <td style={MSPP_TABLE_CELL}>{r.departmentName ?? "—"}</td>
                      <td style={MSPP_TABLE_CELL}>{r.departmentCode ?? "—"}</td>
                      <td style={{ ...MSPP_TABLE_CELL, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        {r.pendingDepartment + r.pendingCentral}
                      </td>
                      <td style={{ ...MSPP_TABLE_CELL, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.approvedCentral}</td>
                      <td style={{ ...MSPP_TABLE_CELL, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.rejectedDepartment}</td>
                      <td style={{ ...MSPP_TABLE_CELL, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.rejectedCentral}</td>
                      <td style={{ ...MSPP_TABLE_CELL, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.requeueEvents}</td>
                      <td style={MSPP_TABLE_CELL}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: 9999,
                            fontSize: 12,
                            fontWeight: 600,
                            background: r.backlogRisk === "ELEVATED" ? "rgba(217,119,6,0.2)" : "rgba(100,116,139,0.12)",
                            color: r.backlogRisk === "ELEVATED" ? "#92400e" : "#475569",
                          }}
                        >
                          {r.backlogRisk === "ELEVATED"
                            ? t("msppValidationAnalyticsPage.backlogElevated")
                            : t("msppValidationAnalyticsPage.backlogLow")}
                        </span>
                      </td>
                      <td style={{ ...MSPP_TABLE_CELL, textAlign: "right" }}>{formatDurationMs(r.avgMsFullCycle)}</td>
                      <td style={{ ...MSPP_TABLE_CELL, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        {r.fullCycleSampleSize}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
