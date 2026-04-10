"use client";

import React from "react";
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

/** Formate une clé mois `YYYY-MM` (UTC) pour l’axe — libellés en français. */
export function formatMsppMonthLabelFr(isoMonth: string): string {
  const parts = isoMonth.split("-");
  const y = parts[0];
  const m = parts[1];
  if (!y || !m) return isoMonth;
  const d = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
  return d.toLocaleDateString("fr-FR", { month: "short", year: "numeric", timeZone: "UTC" });
}

export type MsppTrendPoint = { month: string; count: number; label: string };

export function buildTrendChartData(buckets: Array<{ month: string; count: number }>): MsppTrendPoint[] {
  return buckets.map((b) => ({
    month: b.month,
    count: b.count,
    label: formatMsppMonthLabelFr(b.month),
  }));
}

const chartBox: React.CSSProperties = { width: "100%", height: 280 };

const axisStyle = { fontSize: 12, fill: "#64748b" };

export function MsppTrendLineChart({ data }: { data: MsppTrendPoint[] }) {
  if (data.length === 0) {
    return <p style={{ ...MSPP_EMPTY_STATE, margin: 0 }}>Aucune donnée pour la courbe temporelle.</p>;
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
              formatter={(value) => [value ?? "—", "Cas approuvés"]}
              labelFormatter={(label) => String(label)}
              contentStyle={{ fontSize: 13 }}
            />
            <Line type="monotone" dataKey="count" name="Cas approuvés" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 3 }} />
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
  if (data.length === 0) {
    return <p style={{ ...MSPP_EMPTY_STATE, margin: 0 }}>Aucune donnée pour la répartition par maladie.</p>;
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
              formatter={(value) => [value ?? "—", "Cas"]}
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as MsppDiseaseBarRow | undefined;
                if (!row) return "";
                return `${row.diseaseName} (${row.diseaseCode})`;
              }}
              contentStyle={{ fontSize: 13 }}
            />
            <Bar dataKey="count" name="Cas" fill="#0f766e" radius={[0, 4, 4, 0]} />
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
  if (data.length === 0) {
    return <p style={{ ...MSPP_EMPTY_STATE, margin: 0 }}>Aucune donnée pour la répartition par département.</p>;
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
              formatter={(value) => [value ?? "—", "Cas approuvés"]}
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as MsppDeptBarRow | undefined;
                if (!row) return "";
                const code = row.departmentCode ? ` — ${row.departmentCode}` : "";
                return `${row.departmentName ?? "—"}${code}`;
              }}
              contentStyle={{ fontSize: 13 }}
            />
            <Bar dataKey="count" name="Cas approuvés" fill="#7c3aed" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
