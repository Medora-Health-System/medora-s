/**
 * Surveillance / alert signals derived only from existing MSPP API payloads.
 * No thresholds beyond strict ordering and count comparison (last vs previous trend bucket).
 */

import type { MsppDiseasesResponse, MsppGeographyResponse, MsppTrendsResponse } from "@/lib/msppApi";
import { classifyMonthOverMonthTrend } from "./msppNarrativeLogic";

/** Default depth for department / disease watchlists (ranking only). */
export const DEFAULT_WATCHLIST_TOP_N = 5;

/** National activity label from month-over-month buckets (same rule as narrative). */
export type NationalSurveillanceKind = "hausse" | "baisse" | "stable" | "sous_surveillance";

/**
 * Maps narrative trend classification to surveillance vocabulary:
 * insufficient data → sous_surveillance (no hausse/baisse/stable claim).
 */
export function deriveNationalSurveillanceKind(
  buckets: MsppTrendsResponse["buckets"]
): NationalSurveillanceKind {
  const t = classifyMonthOverMonthTrend(buckets);
  if (t.kind === "insufficient") return "sous_surveillance";
  if (t.kind === "hausse") return "hausse";
  if (t.kind === "baisse") return "baisse";
  return "stable";
}

export type GeographyHotspotRow = {
  departmentId: string;
  departmentCode: string | null;
  departmentName: string | null;
  approvedCount: number;
};

/** Top N departments by approved count (ranking only; no epidemic threshold). */
export function topGeographyHotspots(
  regions: MsppGeographyResponse["regions"],
  n: number
): GeographyHotspotRow[] {
  const sorted = [...regions].sort((a, b) => b.approvedCount - a.approvedCount);
  return sorted.slice(0, Math.max(0, n)).map((r) => ({
    departmentId: r.departmentId,
    departmentCode: r.departmentCode,
    departmentName: r.departmentName,
    approvedCount: r.approvedCount,
  }));
}

export type DiseaseWatchRow = {
  diseaseCode: string;
  diseaseName: string;
  count: number;
};

/**
 * Top N diseases by count. API already returns diseases sorted descending;
 * we re-sort defensively for transparency.
 */
export function topDiseaseWatchlist(
  diseases: MsppDiseasesResponse["diseases"],
  n: number
): DiseaseWatchRow[] {
  const sorted = [...diseases].sort((a, b) => b.count - a.count);
  return sorted.slice(0, Math.max(0, n)).map((d) => ({
    diseaseCode: d.diseaseCode,
    diseaseName: d.diseaseName,
    count: d.count,
  }));
}
