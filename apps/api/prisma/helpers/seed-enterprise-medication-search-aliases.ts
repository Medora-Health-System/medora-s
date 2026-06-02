import type { PrismaClient } from "@prisma/client";
import {
  ENTERPRISE_MEDICATION_ALIAS_MANIFEST,
  ENTERPRISE_MEDICATION_SEARCH_TYPOS,
} from "@medora/shared";

export type SeedEnterpriseMedicationSearchAliasesOptions = {
  dryRun?: boolean;
};

export type SeedEnterpriseMedicationSearchAliasesResult = {
  dryRun: boolean;
  manifestEntries: number;
  catalogsFound: number;
  catalogsMissing: number;
  aliasesUpserted: number;
  aliasesUnchanged: number;
  searchTextUpdated: number;
};

function normalizeAlias(alias: string): string {
  return alias.trim().toLowerCase();
}

function collectAliasTextsForEntry(entry: (typeof ENTERPRISE_MEDICATION_ALIAS_MANIFEST)[number]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (raw: string) => {
    const normalized = normalizeAlias(raw);
    if (normalized.length < 2 || seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  };

  push(entry.genericName);
  for (const line of entry.aliases) push(line.text);
  for (const typo of ENTERPRISE_MEDICATION_SEARCH_TYPOS) {
    if (typo.catalogCode !== entry.catalogCode) continue;
    push(typo.typo);
    push(typo.canonical);
  }
  return out;
}

function mergeSearchText(existing: string | null | undefined, tokens: string[]): string {
  const parts = (existing ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const seen = new Set(parts);
  for (const token of tokens) {
    const t = token.trim().toLowerCase();
    if (t.length < 2 || seen.has(t)) continue;
    seen.add(t);
    parts.push(t);
  }
  return parts.join(" ");
}

/**
 * M1.6C — Persist enterprise alias manifest to CatalogMedication (MedicationAlias + searchText).
 * Does not create medications, activate products, or change governance/billing.
 */
export async function seedEnterpriseMedicationSearchAliases(
  prisma: PrismaClient,
  options: SeedEnterpriseMedicationSearchAliasesOptions = {}
): Promise<SeedEnterpriseMedicationSearchAliasesResult> {
  const dryRun = options.dryRun === true;
  const result: SeedEnterpriseMedicationSearchAliasesResult = {
    dryRun,
    manifestEntries: ENTERPRISE_MEDICATION_ALIAS_MANIFEST.length,
    catalogsFound: 0,
    catalogsMissing: 0,
    aliasesUpserted: 0,
    aliasesUnchanged: 0,
    searchTextUpdated: 0,
  };

  for (const entry of ENTERPRISE_MEDICATION_ALIAS_MANIFEST) {
    const catalog = await prisma.catalogMedication.findUnique({
      where: { code: entry.catalogCode },
      select: { id: true, searchText: true },
    });
    if (!catalog) {
      result.catalogsMissing += 1;
      continue;
    }
    result.catalogsFound += 1;

    const aliasTexts = collectAliasTextsForEntry(entry);
    if (!dryRun) {
      for (const alias of aliasTexts) {
        const existing = await prisma.medicationAlias.findUnique({
          where: {
            catalogMedicationId_alias: { catalogMedicationId: catalog.id, alias },
          },
        });
        if (existing) {
          result.aliasesUnchanged += 1;
          continue;
        }
        await prisma.medicationAlias.create({
          data: {
            catalogMedicationId: catalog.id,
            alias,
            language: "en",
          },
        });
        result.aliasesUpserted += 1;
      }

      const mergedSearchText = mergeSearchText(catalog.searchText, aliasTexts);
      const prior = mergeSearchText(catalog.searchText, []);
      if (mergedSearchText !== prior) {
        await prisma.catalogMedication.update({
          where: { id: catalog.id },
          data: { searchText: mergedSearchText },
        });
        result.searchTextUpdated += 1;
      }
    }
  }

  return result;
}
