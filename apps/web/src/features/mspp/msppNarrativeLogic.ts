/**
 * Interprétations dérivées uniquement des réponses API MSPP existantes (pas d’appel réseau ici).
 */

import type {
  MsppDiseasesResponse,
  MsppGeographyResponse,
  MsppSummaryResponse,
  MsppTrendsResponse,
} from "@/lib/msppApi";

/** Tri chronologique des seaux (YYYY-MM, ordre lexicographique = ordre temporel). */
export function sortTrendBucketsChronologically(
  buckets: MsppTrendsResponse["buckets"]
): Array<{ month: string; count: number }> {
  return [...buckets].sort((a, b) => a.month.localeCompare(b.month, "en"));
}

export type MonthOverMonthTrend =
  | {
      kind: "insufficient";
      reason: "no_buckets" | "single_bucket";
    }
  | {
      kind: "hausse";
      previousMonth: string;
      previousCount: number;
      latestMonth: string;
      latestCount: number;
    }
  | {
      kind: "baisse";
      previousMonth: string;
      previousCount: number;
      latestMonth: string;
      latestCount: number;
    }
  | {
      kind: "stable";
      previousMonth: string;
      previousCount: number;
      latestMonth: string;
      latestCount: number;
    };

/**
 * Règle : comparer le dernier seau avec le précédent dans la série triée (ordre YYYY-MM).
 * Si moins de 2 seaux : données insuffisantes (aucune inférence).
 */
export function classifyMonthOverMonthTrend(
  buckets: MsppTrendsResponse["buckets"]
): MonthOverMonthTrend {
  const sorted = sortTrendBucketsChronologically(buckets);
  if (sorted.length < 2) {
    if (sorted.length === 0) {
      return { kind: "insufficient", reason: "no_buckets" };
    }
    return { kind: "insufficient", reason: "single_bucket" };
  }
  const previous = sorted[sorted.length - 2];
  const latest = sorted[sorted.length - 1];
  if (latest.count > previous.count) {
    return {
      kind: "hausse",
      previousMonth: previous.month,
      previousCount: previous.count,
      latestMonth: latest.month,
      latestCount: latest.count,
    };
  }
  if (latest.count < previous.count) {
    return {
      kind: "baisse",
      previousMonth: previous.month,
      previousCount: previous.count,
      latestMonth: latest.month,
      latestCount: latest.count,
    };
  }
  return {
    kind: "stable",
    previousMonth: previous.month,
    previousCount: previous.count,
    latestMonth: latest.month,
    latestCount: latest.count,
  };
}

function formatMonthFr(isoMonth: string): string {
  const parts = isoMonth.split("-");
  const y = parts[0];
  const m = parts[1];
  if (!y || !m) return isoMonth;
  const d = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** Replace `{key}` placeholders in a template string. */
export function interpolateNarrative(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}

export type MonthOverMonthTemplates = {
  insufficientNoBuckets: string;
  insufficientSingleBucket: string;
  hausse: string;
  baisse: string;
  stable: string;
};

export function formatMonthOverMonthSentence(t: MonthOverMonthTrend, templates: MonthOverMonthTemplates): string {
  if (t.kind === "insufficient") {
    return t.reason === "no_buckets" ? templates.insufficientNoBuckets : templates.insufficientSingleBucket;
  }
  const prevL = formatMonthFr(t.previousMonth);
  const lastL = formatMonthFr(t.latestMonth);
  const vars = {
    prevLabel: prevL,
    prevCount: t.previousCount,
    lastLabel: lastL,
    lastCount: t.latestCount,
  };
  if (t.kind === "hausse") {
    return interpolateNarrative(templates.hausse, vars);
  }
  if (t.kind === "baisse") {
    return interpolateNarrative(templates.baisse, vars);
  }
  return interpolateNarrative(templates.stable, vars);
}

export function topDiseaseLabels(diseases: MsppDiseasesResponse["diseases"], n: number): string[] {
  const sorted = [...diseases].sort((a, b) => b.count - a.count);
  return sorted.slice(0, n).map((d) => `${d.diseaseName} (${d.diseaseCode}) — ${d.count}`);
}

export function topDepartmentLabelsFromSummary(
  byDepartment: MsppSummaryResponse["byDepartment"],
  n: number
): string[] {
  const sorted = [...byDepartment].sort((a, b) => b.count - a.count);
  return sorted
    .slice(0, n)
    .map((r) => `${r.departmentName ?? r.departmentCode ?? "—"} — ${r.count}`);
}

export function topDepartmentLabelsFromGeo(
  regions: MsppGeographyResponse["regions"],
  n: number
): string[] {
  const sorted = [...regions].sort((a, b) => b.approvedCount - a.approvedCount);
  return sorted
    .slice(0, n)
    .map((r) => `${r.departmentName ?? r.departmentCode ?? "—"} — ${r.approvedCount}`);
}
