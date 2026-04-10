/**
 * Correspondance entre les lignes de GET /mspp/geography et les entités du GeoJSON
 * `public/maps/haiti-departments.geojson` (Natural Earth 10m, codes ISO 3166-2 HT-XX).
 *
 * Priorité : code département (ISO ou forme courte), puis libellé normalisé.
 * Si la base utilise des codes différents des codes ISO, certaines entités peuvent rester grises :
 * aligner `GeoDepartment.code` côté données sur les codes du fichier (p. ex. HT-OU).
 */

import type { MsppGeographyResponse } from "@/lib/msppApi";

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
