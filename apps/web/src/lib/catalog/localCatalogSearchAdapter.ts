/**
 * Adaptateur pour une future recherche catalogue en local (Sprint 8 / OFFLINE_PREP.md).
 * L’API en ligne reste la source de vérité ; ce module sert de contrat TypeScript.
 */

import type { CatalogSearchItem, CatalogSearchItemType } from "@/lib/catalogSearchTypes";

export type LocalCatalogSnapshot = {
  version: string;
  generatedAt: string;
  items: CatalogSearchItem[];
};

function normalize(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Recherche naïve sur libellés + searchText + code (suffisante pour MVP offline sur petits catalogues).
 */
export function searchLocalCatalog(
  snapshot: LocalCatalogSnapshot,
  query: string,
  opts?: { type?: CatalogSearchItemType; limit?: number }
): CatalogSearchItem[] {
  const nq = normalize(query);
  if (nq.length < 2) return [];
  const limit = opts?.limit ?? 25;
  const type = opts?.type;
  const scored: { item: CatalogSearchItem; score: number }[] = [];
  for (const item of snapshot.items) {
    if (type && item.type !== type) continue;
    const hay = normalize(
      [item.displayNameFr, item.secondaryText, item.searchText, item.code].filter(Boolean).join(" ")
    );
    if (!hay.includes(nq) && !item.code.toLowerCase().includes(nq)) continue;
    const score = hay.startsWith(nq) ? 0 : hay.indexOf(nq);
    scored.push({ item, score: score < 0 ? 999 : score });
  }
  scored.sort((a, b) => a.score - b.score || a.item.displayNameFr.localeCompare(b.item.displayNameFr, "fr"));
  return scored.slice(0, limit).map((s) => s.item);
}
