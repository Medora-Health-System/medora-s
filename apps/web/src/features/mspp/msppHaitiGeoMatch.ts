/**
 * Correspondance entre les lignes de GET /mspp/geography et les entités du GeoJSON
 * `public/maps/haiti-departments.geojson` (Natural Earth 10m, codes ISO 3166-2 HT-XX).
 *
 * Priorité : code département (ISO ou forme courte), puis libellé normalisé.
 * Si la base utilise des codes différents des codes ISO, certaines entités peuvent rester grises :
 * aligner `GeoDepartment.code` côté données sur les codes du fichier (p. ex. HT-OU).
 */

import type { MsppGeographyResponse, MsppSanitarySignalRow } from "@/lib/msppApi";

export type HaitiDeptFeatureProps = {
  code: string;
  postal?: string;
  name_fr: string;
  name_alt?: string;
};

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function codesMatch(isoCode: string, departmentCode: string | null | undefined): boolean {
  if (!departmentCode?.trim()) return false;
  const d = departmentCode.trim().toUpperCase();
  const c = isoCode.trim().toUpperCase();
  if (d === c) return true;
  const cRest = c.replace(/^HT-?/, "");
  if (cRest && d === cRest) return true;
  if (cRest && d === `HT-${cRest}`) return true;
  return false;
}

export function findMsppRegionForHaitiFeature(
  regions: MsppGeographyResponse["regions"],
  props: HaitiDeptFeatureProps
): (typeof regions)[number] | null {
  for (const r of regions) {
    if (codesMatch(props.code, r.departmentCode)) return r;
  }
  if (props.postal) {
    const p = props.postal.toUpperCase();
    for (const r of regions) {
      const d = r.departmentCode?.trim().toUpperCase();
      if (!d) continue;
      if (d === p) return r;
      if (d === `HT-${p}`) return r;
    }
  }
  const names = [props.name_fr, props.name_alt ?? ""].filter(Boolean);
  for (const r of regions) {
    const n = r.departmentName?.trim();
    if (!n) continue;
    const a = norm(n);
    if (names.some((x) => norm(x) === a)) return r;
  }
  if (props.code === "HT-AR") {
    for (const r of regions) {
      const n = r.departmentName?.trim();
      if (n && norm(n).includes("artibonite")) return r;
    }
  }
  return null;
}

/** One department after merging signal rows (max level across diseases). */
export type DeptSanitarySignalAgg = {
  departmentId: string;
  departmentCode: string | null;
  departmentName: string | null;
  maxSignalLevel: "LOW" | "MEDIUM" | "HIGH";
  signalRowCount: number;
};

function signalLevelRank(l: "LOW" | "MEDIUM" | "HIGH"): number {
  if (l === "HIGH") return 2;
  if (l === "MEDIUM") return 1;
  return 0;
}

function maxSignalLevels(a: "LOW" | "MEDIUM" | "HIGH", b: "LOW" | "MEDIUM" | "HIGH"): "LOW" | "MEDIUM" | "HIGH" {
  return signalLevelRank(a) >= signalLevelRank(b) ? a : b;
}

/**
 * Agrège les signaux par département (niveau le plus élevé si plusieurs maladies).
 * Aligné sur les identifiants renvoyés par `GET /mspp/alerts/signals`.
 */
export function aggregateSanitarySignalsByDepartment(signals: MsppSanitarySignalRow[]): DeptSanitarySignalAgg[] {
  const byId = new Map<
    string,
    { max: "LOW" | "MEDIUM" | "HIGH"; code: string | null; name: string | null; n: number }
  >();
  for (const s of signals) {
    const cur = byId.get(s.departmentId);
    const level = s.signalLevel;
    const nextMax = cur ? maxSignalLevels(cur.max, level) : level;
    byId.set(s.departmentId, {
      max: nextMax,
      code: s.departmentCode ?? cur?.code ?? null,
      name: s.departmentName ?? cur?.name ?? null,
      n: (cur?.n ?? 0) + 1,
    });
  }
  return [...byId.entries()].map(([departmentId, v]) => ({
    departmentId,
    departmentCode: v.code,
    departmentName: v.name,
    maxSignalLevel: v.max,
    signalRowCount: v.n,
  }));
}

/**
 * Associe une entité GeoJSON à un agrégat de signaux (même logique que {@link findMsppRegionForHaitiFeature}).
 */
export function findDeptSignalAggForHaitiFeature(
  aggs: DeptSanitarySignalAgg[],
  props: HaitiDeptFeatureProps
): DeptSanitarySignalAgg | null {
  for (const a of aggs) {
    if (codesMatch(props.code, a.departmentCode)) return a;
  }
  if (props.postal) {
    const p = props.postal.toUpperCase();
    for (const a of aggs) {
      const d = a.departmentCode?.trim().toUpperCase();
      if (!d) continue;
      if (d === p || d === `HT-${p}`) return a;
    }
  }
  const names = [props.name_fr, props.name_alt ?? ""].filter(Boolean);
  for (const a of aggs) {
    const n = a.departmentName?.trim();
    if (!n) continue;
    const an = norm(n);
    if (names.some((x) => norm(x) === an)) return a;
  }
  if (props.code === "HT-AR") {
    for (const a of aggs) {
      const n = a.departmentName?.trim();
      if (n && norm(n).includes("artibonite")) return a;
    }
  }
  return null;
}
