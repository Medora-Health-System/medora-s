"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";
import type { SupportedLanguage } from "@/i18n/config";
import { MSPP_CHART_WELL, MSPP_EMPTY_STATE } from "@/features/mspp/msppUiChrome";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** Format a UTC month key `YYYY-MM` for chart axes. */
export function formatMsppMonthLabel(isoMonth: string, language: SupportedLanguage): string {
  const locale = language === "en" ? "en-US" : "fr-FR";
  const parts = isoMonth.split("-");
  const y = parts[0];
  const m = parts[1];
  if (!y || !m) return isoMonth;
  const d = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
  return d.toLocaleDateString(locale, { month: "short", year: "numeric", timeZone: "UTC" });
}

/** @deprecated Use {@link formatMsppMonthLabel} with active locale. */
export function formatMsppMonthLabelFr(isoMonth: string): string {
  return formatMsppMonthLabel(isoMonth, "fr");
}

export type MsppTrendPoint = { month: string; count: number; label: string };

export function buildTrendChartData(
  buckets: Array<{ month: string; count: number }>,
  language: SupportedLanguage = "fr"
): MsppTrendPoint[] {
  return buckets.map((b) => ({
    month: b.month,
    count: b.count,
    label: formatMsppMonthLabel(b.month, language),
  }));
}

const chartBox: React.CSSProperties = { width: "100%", height: 280 };

const axisStyle = { fontSize: 12, fill: "#64748b" };

function useMsppChartLabels() {
  const { t } = useI18n();
  return {
    emptyTrend: t("msppReportingCharts.emptyTrend"),
    emptyDisease: t("msppReportingCharts.emptyDisease"),
    emptyDepartment: t("msppReportingCharts.emptyDepartment"),
    seriesApprovedCases: t("msppReportingCharts.seriesApprovedCases"),
    seriesCases: t("msppReportingCharts.seriesCases"),
  };
}

export function MsppTrendLineChart({ data }: { data: MsppTrendPoint[] }) {
  const labels = useMsppChartLabels();
  if (data.length === 0) {
    return <p style={{ ...MSPP_EMPTY_STATE, margin: 0 }}>{labels.emptyTrend}</p>;
  }
  return (
    <div style={MSPP_CHART_WELL}>
      <div style={chartBox}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={axisStyle} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} tick={axisStyle} width={40} />
            <Tooltip
              formatter={(value) => [value ?? "—", labels.seriesApprovedCases]}
              labelFormatter={(label) => String(label)}
              contentStyle={{ fontSize: 13 }}
            />
            <Line
              type="monotone"
              dataKey="count"
              name={labels.seriesApprovedCases}
              stroke="#1d4ed8"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export type MsppDiseaseBarRow = { diseaseCode: string; diseaseName: string; count: number; label: string };

export function buildDiseaseBarData(
  diseases: Array<{ diseaseCode: string; diseaseName: string; count: number }>,
  options?: { maxRows?: number }
): MsppDiseaseBarRow[] {
  const maxRows = options?.maxRows ?? 18;
  const sorted = [...diseases].sort((a, b) => b.count - a.count);
  const slice = sorted.slice(0, maxRows);
  return slice.map((d) => ({
    ...d,
    label: d.diseaseName.trim() || d.diseaseCode,
  }));
}

export function MsppDiseaseBarChart({ data }: { data: MsppDiseaseBarRow[] }) {
  const labels = useMsppChartLabels();
  if (data.length === 0) {
    return <p style={{ ...MSPP_EMPTY_STATE, margin: 0 }}>{labels.emptyDisease}</p>;
  }
  return (
    <div style={MSPP_CHART_WELL}>
      <div style={{ ...chartBox, height: Math.min(420, 40 + data.length * 28) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
            barCategoryGap={4}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={axisStyle} />
            <YAxis
              type="category"
              dataKey="label"
              width={160}
              tick={{ ...axisStyle, fontSize: 11 }}
              interval={0}
            />
            <Tooltip
              formatter={(value) => [value ?? "—", labels.seriesCases]}
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as MsppDiseaseBarRow | undefined;
                if (!row) return "";
                return `${row.diseaseName} (${row.diseaseCode})`;
              }}
              contentStyle={{ fontSize: 13 }}
            />
            <Bar dataKey="count" name={labels.seriesCases} fill="#0f766e" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export type MsppDeptBarRow = {
  departmentId: string;
  departmentCode: string | null;
  departmentName: string | null;
  count: number;
  label: string;
};

export function buildDepartmentBarDataFromGeo(
  regions: Array<{
    departmentId: string;
    departmentCode: string | null;
    departmentName: string | null;
    approvedCount: number;
  }>,
  options?: { maxRows?: number }
): MsppDeptBarRow[] {
  const maxRows = options?.maxRows ?? 18;
  const sorted = [...regions].sort((a, b) => b.approvedCount - a.approvedCount);
  return sorted.slice(0, maxRows).map((r) => ({
    departmentId: r.departmentId,
    departmentCode: r.departmentCode,
    departmentName: r.departmentName,
    count: r.approvedCount,
    label: (r.departmentName ?? r.departmentCode ?? r.departmentId).slice(0, 48),
  }));
}

export function MsppDepartmentBarChart({ data }: { data: MsppDeptBarRow[] }) {
  const labels = useMsppChartLabels();
  if (data.length === 0) {
    return <p style={{ ...MSPP_EMPTY_STATE, margin: 0 }}>{labels.emptyDepartment}</p>;
  }
  return (
    <div style={MSPP_CHART_WELL}>
      <div style={{ ...chartBox, height: Math.min(420, 40 + data.length * 28) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
            barCategoryGap={4}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={axisStyle} />
            <YAxis
              type="category"
              dataKey="label"
              width={160}
              tick={{ ...axisStyle, fontSize: 11 }}
              interval={0}
            />
            <Tooltip
              formatter={(value) => [value ?? "—", labels.seriesApprovedCases]}
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as MsppDeptBarRow | undefined;
                if (!row) return "";
                const code = row.departmentCode ? ` — ${row.departmentCode}` : "";
                return `${row.departmentName ?? "—"}${code}`;
              }}
              contentStyle={{ fontSize: 13 }}
            />
            <Bar dataKey="count" name={labels.seriesApprovedCases} fill="#7c3aed" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const RAPPORT_PRINT_CHART_WIDTH = 680;

function rapportPrintBarHeight(rowCount: number): number {
  return Math.min(420, 40 + rowCount * 28);
}

export function MsppTrendLineChartPrint({ data }: { data: MsppTrendPoint[] }) {
  const labels = useMsppChartLabels();
  if (data.length === 0) {
    return <p style={{ ...MSPP_EMPTY_STATE, margin: 0 }}>{labels.emptyTrend}</p>;
  }
  const h = 270;
  return (
    <div style={MSPP_CHART_WELL}>
      <LineChart
        width={RAPPORT_PRINT_CHART_WIDTH}
        height={h}
        data={data}
        margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={axisStyle} interval="preserveStartEnd" />
        <YAxis allowDecimals={false} tick={axisStyle} width={40} />
        <Tooltip
          formatter={(value) => [value ?? "—", labels.seriesApprovedCases]}
          labelFormatter={(label) => String(label)}
          contentStyle={{ fontSize: 13 }}
        />
        <Line
          type="monotone"
          dataKey="count"
          name={labels.seriesApprovedCases}
          stroke="#1d4ed8"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </div>
  );
}

export function MsppDiseaseBarChartPrint({ data }: { data: MsppDiseaseBarRow[] }) {
  const labels = useMsppChartLabels();
  if (data.length === 0) {
    return <p style={{ ...MSPP_EMPTY_STATE, margin: 0 }}>{labels.emptyDisease}</p>;
  }
  const h = rapportPrintBarHeight(data.length);
  return (
    <div style={MSPP_CHART_WELL}>
      <BarChart
        width={RAPPORT_PRINT_CHART_WIDTH}
        height={h}
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
        barCategoryGap={4}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={axisStyle} />
        <YAxis
          type="category"
          dataKey="label"
          width={160}
          tick={{ ...axisStyle, fontSize: 11 }}
          interval={0}
        />
        <Tooltip
          formatter={(value) => [value ?? "—", labels.seriesCases]}
          labelFormatter={(_, payload) => {
            const row = payload?.[0]?.payload as MsppDiseaseBarRow | undefined;
            if (!row) return "";
            return `${row.diseaseName} (${row.diseaseCode})`;
          }}
          contentStyle={{ fontSize: 13 }}
        />
        <Bar dataKey="count" name={labels.seriesCases} fill="#0f766e" radius={[0, 4, 4, 0]} />
      </BarChart>
    </div>
  );
}

export function MsppDepartmentBarChartPrint({ data }: { data: MsppDeptBarRow[] }) {
  const labels = useMsppChartLabels();
  if (data.length === 0) {
    return <p style={{ ...MSPP_EMPTY_STATE, margin: 0 }}>{labels.emptyDepartment}</p>;
  }
  const h = rapportPrintBarHeight(data.length);
  return (
    <div style={MSPP_CHART_WELL}>
      <BarChart
        width={RAPPORT_PRINT_CHART_WIDTH}
        height={h}
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
        barCategoryGap={4}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={axisStyle} />
        <YAxis
          type="category"
          dataKey="label"
          width={160}
          tick={{ ...axisStyle, fontSize: 11 }}
          interval={0}
        />
        <Tooltip
          formatter={(value) => [value ?? "—", labels.seriesApprovedCases]}
          labelFormatter={(_, payload) => {
            const row = payload?.[0]?.payload as MsppDeptBarRow | undefined;
            if (!row) return "";
            const code = row.departmentCode ? ` — ${row.departmentCode}` : "";
            return `${row.departmentName ?? "—"}${code}`;
          }}
          contentStyle={{ fontSize: 13 }}
        />
        <Bar dataKey="count" name={labels.seriesApprovedCases} fill="#7c3aed" radius={[0, 4, 4, 0]} />
      </BarChart>
    </div>
  );
}
