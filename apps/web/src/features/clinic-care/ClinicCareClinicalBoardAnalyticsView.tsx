/**
 * MEDUI.D4C.5A — Clinic Clinical Board operational analytics landing.
 * Matches reference layout: KPI row (5) → Visits by Day + AI panel → lower cards.
 */

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CLINIC_CARE_ANALYTICS_KPI_IDS,
  clinicCareEncountersDrillDownHref,
  type ClinicCareAnalyticsKpiId,
  type ClinicCareAnalyticsKpiValue,
  type ClinicCareDashboardPeriod,
  type ClinicCareDeterministicInsight,
  type ClinicCareMissedAppointmentsSummary,
  type ClinicCarePatientFlowSlice,
  type ClinicCareProviderProductivityRow,
  type ClinicCareVisitTypeSlice,
  type ClinicCareVisitsByDayPoint,
  type ClinicCareWaitTrendPoint,
} from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { CLINIC_CARE_SHELL } from "./clinicCareTokens";

type DashboardPayload = {
  facilityTimeZone: string;
  localDateKey: string;
  period: ClinicCareDashboardPeriod;
  kpis: ClinicCareAnalyticsKpiValue[];
  visitsByDay: ClinicCareVisitsByDayPoint[];
  visitTypes: ClinicCareVisitTypeSlice[];
  patientFlow: ClinicCarePatientFlowSlice[];
  waitTrend: ClinicCareWaitTrendPoint[];
  missedAppointments: ClinicCareMissedAppointmentsSummary;
  providerProductivity: ClinicCareProviderProductivityRow[] | null;
  insights: ClinicCareDeterministicInsight[];
  access: {
    canViewDashboard: boolean;
    canViewProviderProductivity: boolean;
    canViewFinancialInsights: boolean;
  };
};


function formatMessage(template: string, params: Record<string, string | number>): string {
  let out = template;
  for (const [k, v] of Object.entries(params)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

const SEGMENT_COLORS = {
  completed: "#3b82f6",
  waiting: "#f59e0b",
  newVisits: "#22c55e",
  teleconsultations: "#8b5cf6",
  cancelled: "#ef4444",
} as const;

const VISIT_TYPE_COLORS = ["#3b82f6", "#0d9488", "#f59e0b", "#8b5cf6", "#94a3b8"];

const FLOW_COLORS: Record<string, string> = {
  ARRIVED: "#3b82f6",
  NURSING_MA: "#0d9488",
  WITH_PROVIDER: "#f59e0b",
  COMPLETED: "#22c55e",
};

const panelStyle: React.CSSProperties = {
  background: MEDORA_CARD_SHELL.background,
  border: MEDORA_CARD_SHELL.border,
  borderRadius: MEDORA_CARD_SHELL.radius,
  boxShadow: MEDORA_CARD_SHELL.boxShadow,
  padding: 12,
};

function kpiLabelKey(id: ClinicCareAnalyticsKpiId): string {
  const map: Record<ClinicCareAnalyticsKpiId, string> = {
    TODAYS_VISITS: "clinicCareD4c5a.kpis.todaysVisits",
    COMPLETED_VISITS: "clinicCareD4c5a.kpis.completedVisits",
    WAITING: "clinicCareD4c5a.kpis.waiting",
    AVERAGE_WAIT_MINUTES: "clinicCareD4c5a.kpis.averageWait",
    FOLLOW_UPS_TO_SCHEDULE: "clinicCareD4c5a.kpis.followUpsToSchedule",
  };
  return map[id];
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const w = 64;
  const h = 22;
  const pts = values
    .map((v, i) => {
      const x = values.length === 1 ? w / 2 : (i / (values.length - 1)) * w;
      const y = h - (v / max) * (h - 2) - 1;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} aria-hidden style={{ display: "block" }}>
      <polyline fill="none" stroke={color} strokeWidth={1.5} points={pts} />
    </svg>
  );
}

function VisitsByDayTooltip({
  active,
  payload,
  label,
  t,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number; color?: string; name?: string }>;
  label?: string;
  t: (k: string) => string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0] as unknown as { payload?: ClinicCareVisitsByDayPoint };
  const point = row?.payload;
  const total = point?.total ?? payload.reduce((s, p) => s + (Number(p.value) || 0), 0);
  return (
    <div
      role="tooltip"
      style={{
        background: "#0f172a",
        color: "#fff",
        borderRadius: 10,
        padding: "10px 12px",
        fontSize: 12,
        minWidth: 180,
        boxShadow: "0 8px 24px rgba(15,23,42,0.35)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{ marginBottom: 6 }}>
        {formatMessage(t("clinicCareD4c5a.chart.totalVisits"), { count: total })}
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {payload.map((p) => (
          <li key={String(p.dataKey)} style={{ display: "flex", gap: 8, marginBottom: 2 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: p.color, marginTop: 4 }} />
            <span>
              {p.name}: {p.value}
            </span>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 8, opacity: 0.85, fontSize: 11 }}>
        {t("clinicCareD4c5a.chart.clickToView")}
      </div>
    </div>
  );
}

export function ClinicCareClinicalBoardAnalyticsView() {
  const { t } = useI18n();
  const router = useRouter();
  const { facilityId, ready } = useFacilityAndRoles();
  const [period, setPeriod] = useState<ClinicCareDashboardPeriod>("WEEK");
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const payload = (await apiFetch(
        `/clinic-care/dashboard?period=${encodeURIComponent(period)}`,
        { facilityId }
      )) as DashboardPayload;
      setData(payload);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : t("clinicCareD4c5a.errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, period, t]);

  useEffect(() => {
    if (!ready || !facilityId) return;
    void load();
  }, [ready, facilityId, load]);

  const kpiMap = useMemo(() => {
    const map = new Map<ClinicCareAnalyticsKpiId, ClinicCareAnalyticsKpiValue>();
    for (const k of data?.kpis ?? []) map.set(k.id, k);
    return map;
  }, [data]);

  const chartData = useMemo(
    () =>
      (data?.visitsByDay ?? []).map((p) => ({
        ...p,
        label: `${p.labelParts.weekdayShort} ${p.labelParts.day}`,
      })),
    [data]
  );

  const visitTypeData = useMemo(
    () =>
      (data?.visitTypes ?? []).map((s) => ({
        ...s,
        name: t(`clinicCareD4c5a.visitTypes.${s.bucket}`),
      })),
    [data, t]
  );

  const waitChartData = useMemo(
    () =>
      (data?.waitTrend ?? []).map((p) => ({
        ...p,
        label: p.localDateKey.slice(5),
        value: p.averageWaitMinutes,
      })),
    [data]
  );

  const providerRows = data?.providerProductivity ?? null;
  const showProductivity = Boolean(data?.access.canViewProviderProductivity && providerRows);

  if (!ready) {
    return <p style={{ margin: 0, color: "#64748b" }}>{t("clinicCareD4c5a.loading")}</p>;
  }

  return (
    <div data-testid="clinic-care-clinical-board-analytics">
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{t("clinicCareD4c5a.title")}</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
            {t("clinicCareD4c5a.subtitle")}
            {data?.localDateKey ? ` · ${data.localDateKey}` : ""}
          </p>
        </div>
        <div
          role="group"
          aria-label={t("clinicCareD4c5a.periodLabel")}
          style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}
        >
          {(
            [
              ["TODAY", "clinicCareD4c5a.period.today"],
              ["WEEK", "clinicCareD4c5a.period.week"],
              ["MONTH", "clinicCareD4c5a.period.month"],
            ] as const
          ).map(([id, key]) => (
            <button
              key={id}
              type="button"
              data-testid={`clinic-care-period-${id}`}
              onClick={() => setPeriod(id)}
              aria-pressed={period === id}
              style={{
                height: 30,
                padding: "0 12px",
                borderRadius: 999,
                border: `1px solid ${period === id ? CLINIC_CARE_SHELL.accent : CLINIC_CARE_SHELL.border}`,
                background: period === id ? "rgba(13,148,136,0.12)" : "#fff",
                color: period === id ? "#0f766e" : "#334155",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {t(key)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void load()}
            style={{
              height: 30,
              padding: "0 12px",
              borderRadius: 8,
              border: `1px solid ${CLINIC_CARE_SHELL.border}`,
              background: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("clinicCareD4c2.refresh")}
          </button>
        </div>
      </div>

      {loading && !data ? (
        <p style={{ margin: 0, color: "#64748b" }}>{t("clinicCareD4c5a.loading")}</p>
      ) : null}

      {error ? (
        <div
          role="alert"
          style={{
            ...panelStyle,
            borderColor: "#fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      ) : null}

      {!loading && !error && data ? (
        <>
          {/* KPI row — five cards only */}
          <div
            data-testid="clinic-care-analytics-kpi-row"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 8,
              marginBottom: 12,
            }}
          >
            {CLINIC_CARE_ANALYTICS_KPI_IDS.map((id) => {
              const kpi = kpiMap.get(id);
              const accent =
                id === "FOLLOW_UPS_TO_SCHEDULE"
                  ? "#ef4444"
                  : id === "AVERAGE_WAIT_MINUTES"
                    ? "#8b5cf6"
                    : id === "WAITING"
                      ? "#f59e0b"
                      : id === "COMPLETED_VISITS"
                        ? "#22c55e"
                        : "#3b82f6";
              const display =
                kpi?.value == null
                  ? "—"
                  : id === "AVERAGE_WAIT_MINUTES"
                    ? formatMessage(t("clinicCareD4c5a.kpis.minutesValue"), { value: kpi.value })
                    : id === "FOLLOW_UPS_TO_SCHEDULE"
                      ? formatMessage(t("clinicCareD4c5a.kpis.patientsValue"), { value: kpi.value })
                      : String(kpi.value);
              return (
                <div
                  key={id}
                  data-testid={`clinic-care-analytics-kpi-${id}`}
                  style={{ ...panelStyle, padding: "10px 12px" }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>
                    {t(kpiLabelKey(id))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-end" }}>
                    <div>
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 800,
                          color: id === "FOLLOW_UPS_TO_SCHEDULE" ? "#dc2626" : "#0f172a",
                          lineHeight: 1.1,
                        }}
                      >
                        {display}
                      </div>
                      {kpi?.comparison ? (
                        <div
                          style={{
                            fontSize: 11,
                            marginTop: 4,
                            color:
                              kpi.comparison.direction === "down" && id === "AVERAGE_WAIT_MINUTES"
                                ? "#16a34a"
                                : kpi.comparison.direction === "up" && id !== "AVERAGE_WAIT_MINUTES"
                                  ? "#16a34a"
                                  : kpi.comparison.direction === "down"
                                    ? "#dc2626"
                                    : "#64748b",
                            fontWeight: 600,
                          }}
                        >
                          {id === "AVERAGE_WAIT_MINUTES"
                            ? formatMessage(
                                t(
                                  kpi.comparison.direction === "down"
                                    ? "clinicCareD4c5a.kpis.waitDown"
                                    : kpi.comparison.direction === "up"
                                      ? "clinicCareD4c5a.kpis.waitUp"
                                      : "clinicCareD4c5a.kpis.waitFlat"
                                ),
                                { minutes: kpi.comparison.delta }
                              )
                            : formatMessage(
                                t(
                                  kpi.comparison.direction === "up"
                                    ? "clinicCareD4c5a.kpis.pctUp"
                                    : kpi.comparison.direction === "down"
                                      ? "clinicCareD4c5a.kpis.pctDown"
                                      : "clinicCareD4c5a.kpis.pctFlat"
                                ),
                                { percent: kpi.comparison.delta }
                              )}
                        </div>
                      ) : id === "COMPLETED_VISITS" &&
                        kpi?.value != null &&
                        (kpiMap.get("TODAYS_VISITS")?.value ?? 0) > 0 ? (
                        <div style={{ fontSize: 11, marginTop: 4, color: "#64748b" }}>
                          {formatMessage(t("clinicCareD4c5a.kpis.completedShare"), {
                            percent: Math.round(
                              (kpi.value / (kpiMap.get("TODAYS_VISITS")?.value || 1)) * 100
                            ),
                          })}
                        </div>
                      ) : id === "WAITING" &&
                        kpi?.value != null &&
                        (kpiMap.get("TODAYS_VISITS")?.value ?? 0) > 0 ? (
                        <div style={{ fontSize: 11, marginTop: 4, color: "#64748b" }}>
                          {formatMessage(t("clinicCareD4c5a.kpis.waitingShare"), {
                            percent: Math.round(
                              (kpi.value / (kpiMap.get("TODAYS_VISITS")?.value || 1)) * 100
                            ),
                          })}
                        </div>
                      ) : kpi?.coverage && id === "AVERAGE_WAIT_MINUTES" ? (
                        <div style={{ fontSize: 10, marginTop: 4, color: "#94a3b8" }}>
                          {formatMessage(t("clinicCareD4c5a.kpis.waitCoverage"), {
                            included: kpi.coverage.included,
                            eligible: kpi.coverage.eligible,
                          })}
                        </div>
                      ) : null}
                    </div>
                    <Sparkline values={kpi?.sparkline ?? []} color={accent} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main: Visits by Day + AI Insights */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(240px, 300px)",
              gap: 12,
              marginBottom: 12,
            }}
            className="clinic-care-analytics-main"
          >
            <section style={panelStyle} aria-labelledby="visits-by-day-heading">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <h3 id="visits-by-day-heading" style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
                  {t("clinicCareD4c5a.chart.visitsByDay")}
                </h3>
              </div>
              <div
                style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 8, fontSize: 11 }}
                aria-hidden
              >
                {(
                  [
                    ["completed", "clinicCareD4c5a.segments.completed"],
                    ["waiting", "clinicCareD4c5a.segments.waiting"],
                    ["newVisits", "clinicCareD4c5a.segments.new"],
                    ["teleconsultations", "clinicCareD4c5a.segments.tele"],
                    ["cancelled", "clinicCareD4c5a.segments.cancelled"],
                  ] as const
                ).map(([key, labelKey]) => (
                  <span key={key} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 99,
                        background: SEGMENT_COLORS[key],
                      }}
                    />
                    {t(labelKey)}
                  </span>
                ))}
              </div>
              {chartData.length === 0 ? (
                <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>{t("clinicCareD4c5a.empty")}</p>
              ) : (
                <div style={{ width: "100%", height: 260 }} data-testid="clinic-care-visits-by-day-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                      onClick={(state) => {
                        const payload = state as {
                          activePayload?: Array<{ payload?: ClinicCareVisitsByDayPoint }>;
                        };
                        const key = payload?.activePayload?.[0]?.payload?.localDateKey;
                        if (key) {
                          router.push(clinicCareEncountersDrillDownHref({ localDateKey: key }));
                        }
                      }}
                    >
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                      <Tooltip
                        content={<VisitsByDayTooltip t={t} />}
                        cursor={{ fill: "rgba(148,163,184,0.15)" }}
                      />
                      <Bar
                        dataKey="completed"
                        name={t("clinicCareD4c5a.segments.completed")}
                        stackId="v"
                        fill={SEGMENT_COLORS.completed}
                        cursor="pointer"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="waiting"
                        name={t("clinicCareD4c5a.segments.waiting")}
                        stackId="v"
                        fill={SEGMENT_COLORS.waiting}
                        cursor="pointer"
                      />
                      <Bar
                        dataKey="newVisits"
                        name={t("clinicCareD4c5a.segments.new")}
                        stackId="v"
                        fill={SEGMENT_COLORS.newVisits}
                        cursor="pointer"
                      />
                      <Bar
                        dataKey="teleconsultations"
                        name={t("clinicCareD4c5a.segments.tele")}
                        stackId="v"
                        fill={SEGMENT_COLORS.teleconsultations}
                        cursor="pointer"
                      />
                      <Bar
                        dataKey="cancelled"
                        name={t("clinicCareD4c5a.segments.cancelled")}
                        stackId="v"
                        fill={SEGMENT_COLORS.cancelled}
                        cursor="pointer"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <aside
              style={{ ...panelStyle, display: "flex", flexDirection: "column", minHeight: 280 }}
              aria-labelledby="ai-insights-heading"
              data-testid="clinic-care-ai-insights-panel"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <h3 id="ai-insights-heading" style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
                  {t("clinicCareD4c5a.insights.title")}
                </h3>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: 0.4,
                    color: "#1d4ed8",
                    background: "#dbeafe",
                    borderRadius: 999,
                    padding: "2px 8px",
                  }}
                >
                  {t("clinicCareD4c5a.insights.beta")}
                </span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", flex: 1, overflow: "auto" }}>
                {(data.insights ?? []).length === 0 ? (
                  <li style={{ color: "#64748b", fontSize: 12 }}>{t("clinicCareD4c5a.insights.empty")}</li>
                ) : (
                  data.insights.map((insight) => {
                    const body = formatMessage(t(`clinicCareD4c5a.insights.${insight.messageKey}`), insight.params);
                    const content = (
                      <span style={{ fontSize: 12, color: "#334155", lineHeight: 1.35 }}>{body}</span>
                    );
                    return (
                      <li
                        key={insight.id}
                        style={{
                          display: "flex",
                          gap: 8,
                          padding: "8px 0",
                          borderBottom: `1px solid ${CLINIC_CARE_SHELL.border}`,
                        }}
                      >
                        <span
                          aria-hidden
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 99,
                            marginTop: 5,
                            flexShrink: 0,
                            background:
                              insight.severity === "attention"
                                ? "#f59e0b"
                                : insight.severity === "positive"
                                  ? "#22c55e"
                                  : "#3b82f6",
                          }}
                        />
                        {insight.href ? (
                          <Link href={insight.href} style={{ textDecoration: "none" }}>
                            {content}
                          </Link>
                        ) : (
                          content
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
              <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>
                {t("clinicCareD4c5a.insights.groundingNote")}
              </div>
            </aside>
          </div>

          {/* Lower analytics cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 10,
            }}
          >
            <section style={panelStyle} aria-labelledby="visit-types-heading">
              <h3 id="visit-types-heading" style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700 }}>
                {t("clinicCareD4c5a.cards.visitTypes")}
              </h3>
              {visitTypeData.length === 0 ? (
                <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{t("clinicCareD4c5a.empty")}</p>
              ) : (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ width: 110, height: 110 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={visitTypeData}
                          dataKey="count"
                          nameKey="name"
                          innerRadius={28}
                          outerRadius={48}
                          cursor="pointer"
                          onClick={(_, index) => {
                            const slice = visitTypeData[index];
                            if (!slice || !data.localDateKey) return;
                            router.push(
                              clinicCareEncountersDrillDownHref({
                                localDateKey: data.localDateKey,
                                visitType: slice.bucket,
                              })
                            );
                          }}
                        >
                          {visitTypeData.map((entry, i) => (
                            <Cell key={entry.bucket} fill={VISIT_TYPE_COLORS[i % VISIT_TYPE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 11, flex: 1 }}>
                    {visitTypeData.map((s, i) => (
                      <li key={s.bucket} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 99,
                            background: VISIT_TYPE_COLORS[i % VISIT_TYPE_COLORS.length],
                            marginTop: 3,
                          }}
                        />
                        <span>
                          {s.name} {s.percent}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {showProductivity ? (
              <section style={panelStyle} aria-labelledby="productivity-heading">
                <h3 id="productivity-heading" style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700 }}>
                  {t("clinicCareD4c5a.cards.providerProductivity")}
                </h3>
                {(providerRows ?? []).length === 0 ? (
                  <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{t("clinicCareD4c5a.empty")}</p>
                ) : (
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {(providerRows ?? []).slice(0, 5).map((row) => {
                      const max = providerRows![0]?.completedVisitCount || 1;
                      return (
                        <li key={row.providerUserId} style={{ marginBottom: 8 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: 11,
                              marginBottom: 3,
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>{row.providerDisplayName}</span>
                            <span>{row.completedVisitCount}</span>
                          </div>
                          <div
                            style={{
                              height: 8,
                              borderRadius: 99,
                              background: "#e2e8f0",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${Math.round((row.completedVisitCount / max) * 100)}%`,
                                background: "#3b82f6",
                                borderRadius: 99,
                              }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            ) : null}

            <section style={panelStyle} aria-labelledby="patient-flow-heading">
              <h3 id="patient-flow-heading" style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700 }}>
                {t("clinicCareD4c5a.cards.patientFlow")}
              </h3>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {(data.patientFlow ?? []).map((slice) => {
                  const max = Math.max(...data.patientFlow.map((s) => s.count), 1);
                  return (
                    <li key={slice.stage} style={{ marginBottom: 8 }}>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            clinicCareEncountersDrillDownHref({
                              localDateKey: data.localDateKey,
                              flowStage: slice.stage,
                            })
                          )
                        }
                        style={{
                          width: "100%",
                          border: "none",
                          background: "transparent",
                          padding: 0,
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 11,
                            marginBottom: 3,
                          }}
                        >
                          <span>{t(`clinicCareD4c5a.flow.${slice.stage}`)}</span>
                          <span style={{ fontWeight: 700 }}>{slice.count}</span>
                        </div>
                        <div style={{ height: 10, borderRadius: 6, background: "#e2e8f0", overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${Math.round((slice.count / max) * 100)}%`,
                              background: FLOW_COLORS[slice.stage] ?? "#64748b",
                              borderRadius: 6,
                            }}
                          />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section style={panelStyle} aria-labelledby="wait-trend-heading">
              <h3 id="wait-trend-heading" style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700 }}>
                {t("clinicCareD4c5a.cards.waitTrend")}
              </h3>
              <div style={{ width: "100%", height: 120 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={waitChartData}>
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
                    <Tooltip
                      formatter={(value) => {
                        if (value == null || value === "") {
                          return t("clinicCareD4c5a.kpis.unavailable");
                        }
                        return `${value} min`;
                      }}
                      labelFormatter={(label, payload) => {
                        const point = payload?.[0]?.payload as ClinicCareWaitTrendPoint | undefined;
                        if (!point) return String(label ?? "");
                        return `${label} · ${formatMessage(t("clinicCareD4c5a.kpis.waitCoverage"), {
                          included: point.included,
                          eligible: point.eligible,
                        })}`;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section style={panelStyle} aria-labelledby="missed-heading">
              <h3 id="missed-heading" style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700 }}>
                {t("clinicCareD4c5a.cards.missedAppointments")}
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div
                  style={{
                    background: "#fef2f2",
                    borderRadius: 10,
                    padding: 10,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#dc2626" }}>
                    {data.missedAppointments.today}
                  </div>
                  <div style={{ fontSize: 11, color: "#991b1b" }}>
                    {t("clinicCareD4c5a.missed.today")}
                  </div>
                </div>
                <div
                  style={{
                    background: "#fef2f2",
                    borderRadius: 10,
                    padding: 10,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#dc2626" }}>
                    {data.missedAppointments.week}
                  </div>
                  <div style={{ fontSize: 11, color: "#991b1b" }}>
                    {t("clinicCareD4c5a.missed.week")}
                  </div>
                </div>
              </div>
              <p style={{ margin: "8px 0 0", fontSize: 10, color: "#94a3b8" }}>
                {t("clinicCareD4c5a.missed.note")}
              </p>
            </section>
          </div>
        </>
      ) : null}

      <style>{`
        @media (max-width: 900px) {
          .clinic-care-analytics-main {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
