/**
 * M1.6C — Safe query expansion map (brand/generic/typo) for catalog medication search.
 */

import {
  ENTERPRISE_MEDICATION_ALIAS_MANIFEST,
  ENTERPRISE_MEDICATION_REQUIRED_SEARCH_PAIRS,
  ENTERPRISE_MEDICATION_SEARCH_TYPOS,
} from "./enterpriseMedicationAliasManifest.js";
import { buildIvFluidSearchQueryExpansions } from "./enterpriseIvFluidsSearchAliasManifest.js";
import { buildWave1SearchQueryExpansions } from "./enterpriseFormularyWave1SearchAliasManifest.js";
import { buildMkExpansionWave2SearchQueryExpansions } from "./medicationKnowledgeExpansionWave2.js";

export function normalizeEnterpriseSearchToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildEnterpriseMedicationSearchQueryExpansions(): Readonly<
  Record<string, readonly string[]>
> {
  const map = new Map<string, Set<string>>();

  const add = (key: string, ...extra: string[]) => {
    const k = normalizeEnterpriseSearchToken(key);
    if (k.length < 2) return;
    let set = map.get(k);
    if (!set) {
      set = new Set<string>();
      map.set(k, set);
    }
    set.add(k);
    for (const value of extra) {
      const t = normalizeEnterpriseSearchToken(value);
      if (t.length >= 2) set.add(t);
    }
  };

  for (const entry of ENTERPRISE_MEDICATION_ALIAS_MANIFEST) {
    const generic = entry.genericName;
    add(generic);
    for (const line of entry.aliases) {
      add(line.text, generic);
    }
  }

  for (const typo of ENTERPRISE_MEDICATION_SEARCH_TYPOS) {
    const entry = ENTERPRISE_MEDICATION_ALIAS_MANIFEST.find((e) => e.catalogCode === typo.catalogCode);
    add(typo.typo, typo.canonical, entry?.genericName ?? "");
  }

  for (const pair of ENTERPRISE_MEDICATION_REQUIRED_SEARCH_PAIRS) {
    add(pair.brand, pair.generic);
    add(pair.generic, pair.brand);
  }

  for (const [key, aliases] of Object.entries(buildIvFluidSearchQueryExpansions())) {
    add(key, ...aliases);
    for (const alias of aliases) add(alias, key);
  }

  for (const [key, aliases] of Object.entries(buildWave1SearchQueryExpansions())) {
    add(key, ...aliases);
    for (const alias of aliases) add(alias, key);
  }

  for (const [key, aliases] of Object.entries(
    buildMkExpansionWave2SearchQueryExpansions()
  )) {
    add(key, ...aliases);
    for (const alias of aliases) add(alias, key);
  }

  const out: Record<string, readonly string[]> = {};
  for (const [key, set] of map) {
    out[key] = [...set];
  }
  return out;
}
