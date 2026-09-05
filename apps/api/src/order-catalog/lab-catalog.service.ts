import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { CatalogSearchItemDto } from "./dto/catalog-search-item.dto";
import {
  compareOrderCatalogRows,
  orderCatalogMatchTierForQuery,
  truncateSearchText,
  type OrderCatalogRankableRow,
} from "./catalog-search-rank.util";
import { mapLabRowToCatalogSearchItem } from "./catalog-search.mapper";
import { isTerminologyReadClassifierEnabled, isTerminologySearchClassifierEnabled } from "../terminology/terminology-flags.util";
import { labClassifierSearchOr } from "../terminology/terminology-classifier-search.util";

const LAB_ALIAS_CODE_MAP: Record<string, string[]> = {
  cbc: ["CBC", "ER_CBC"],
  cmp: ["CMP", "ER_CMP"],
  bmp: ["BMP", "ER_BMP"],
  trop: ["TROPONIN", "TROP", "ER_TROP"],
  troponina: ["TROPONIN", "TROP", "ER_TROP"],
  hcg: ["URINE_HCG", "SERUM_HCG", "HCG_URINE", "HCG_BETA", "ER_UHCG"],
  "type screen": ["TYPE_SCREEN", "ER_BLOOD_TYPE"],
  orina: ["UA"],
  "análisis de orina": ["UA"],
  hemograma: ["CBC", "ER_CBC"],
  "hemograma completo": ["CBC", "ER_CBC"],
  glucosa: ["GLU", "GLUCOSE_POC"],
  creatinina: ["CREAT"],
};

const labClassifierInclude = {
  labCategoryClassifier: { include: { labels: { select: { locale: true, displayName: true } } } },
};

@Injectable()
export class LabCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: { q: string; limit: number }): Promise<{ items: CatalogSearchItemDto[] }> {
    const q = query.q.trim().toLowerCase();
    const limit = Math.min(query.limit, 50);
    if (!q) return { items: [] };

    const legacyOr = [
      { code: { contains: q, mode: "insensitive" as const } },
      { name: { contains: q, mode: "insensitive" as const } },
      { displayNameEn: { contains: q, mode: "insensitive" as const } },
      { displayNameFr: { contains: q, mode: "insensitive" as const } },
      { searchText: { contains: q, mode: "insensitive" as const } },
    ];

    const includeClassifiers = isTerminologyReadClassifierEnabled();
    const classifierSearch = isTerminologySearchClassifierEnabled();

    const byCatalog = await this.prisma.catalogLabTest.findMany({
      where: {
        isActive: true,
        OR: classifierSearch ? [...legacyOr, ...labClassifierSearchOr(q)] : legacyOr,
      },
      include: includeClassifiers ? labClassifierInclude : undefined,
      orderBy: [{ isEssential: "desc" }, { sortPriority: "asc" }, { name: "asc" }],
      take: limit * 3,
    });

    const aliasCodes = LAB_ALIAS_CODE_MAP[q] ?? [];
    const byKnownAliasCatalog =
      aliasCodes.length > 0
        ? await this.prisma.catalogLabTest.findMany({
            where: { code: { in: aliasCodes }, isActive: true },
            include: includeClassifiers ? labClassifierInclude : undefined,
          })
        : [];

    const byAlias = await this.prisma.labTestAlias.findMany({
      where: { alias: { contains: q, mode: "insensitive" } },
      select: { catalogLabTestId: true, alias: true },
    });
    const aliasIds = [...new Set(byAlias.map((a) => a.catalogLabTestId))];
    const byAliasCatalog =
      aliasIds.length > 0
        ? await this.prisma.catalogLabTest.findMany({
            where: { id: { in: aliasIds }, isActive: true },
            include: includeClassifiers ? labClassifierInclude : undefined,
            orderBy: [{ isEssential: "desc" }, { sortPriority: "asc" }, { name: "asc" }],
          })
        : [];

    type Row = (typeof byCatalog)[number];
    const rowsById = new Map<string, Row>();
    const aliasesById = new Map<string, string[]>();

    for (const row of [...byCatalog, ...byKnownAliasCatalog, ...byAliasCatalog]) {
      rowsById.set(row.id, row);
    }

    for (const alias of byAlias) {
      const aliases = aliasesById.get(alias.catalogLabTestId) ?? [];
      aliases.push(alias.alias);
      aliasesById.set(alias.catalogLabTestId, aliases);
    }
    for (const row of byKnownAliasCatalog) {
      const aliases = aliasesById.get(row.id) ?? [];
      aliases.push(q);
      aliasesById.set(row.id, aliases);
    }

    const scored: Array<{ row: Row; tier: number }> = [];
    for (const row of rowsById.values()) {
      const rankable: OrderCatalogRankableRow = {
        code: row.code,
        name: row.name,
        displayNameEn: row.displayNameEn,
        displayNameFr: row.displayNameFr,
        searchText: row.searchText,
        isActive: row.isActive,
      };
      const tier = orderCatalogMatchTierForQuery(q, rankable, {
        aliases: aliasesById.get(row.id),
      });
      scored.push({ row, tier });
    }

    scored.sort((a, b) =>
      compareOrderCatalogRows(
        { row: a.row as OrderCatalogRankableRow, tier: a.tier },
        { row: b.row as OrderCatalogRankableRow, tier: b.tier }
      )
    );

    const items: CatalogSearchItemDto[] = scored.slice(0, limit).map(({ row }) =>
      mapLabRowToCatalogSearchItem(
        {
          id: row.id,
          code: row.code,
          name: row.name,
          displayNameEn: row.displayNameEn,
          displayNameFr: row.displayNameFr,
          description: row.description,
          searchText: row.searchText,
          billingCodeDefault: row.billingCodeDefault,
          labCategoryClassifier:
            includeClassifiers && "labCategoryClassifier" in row
              ? (row as { labCategoryClassifier: { labels: Array<{ locale: string; displayName: string }> } | null })
                  .labCategoryClassifier
              : null,
        },
        truncateSearchText(row.searchText)
      )
    );

    return { items };
  }

  /** Phase 2 — exact reference code resolution for enterprise order set apply (no full catalog preload). */
  async resolveByReferenceCodes(input: {
    referenceCodes: readonly string[];
    fallbackSearchQuery?: string;
  }): Promise<CatalogSearchItemDto[]> {
    const codes = [...new Set(input.referenceCodes.map((code) => code.trim().toUpperCase()).filter(Boolean))];
    if (codes.length === 0) return [];

    const includeClassifiers = isTerminologyReadClassifierEnabled();

    const byCode = await this.prisma.catalogLabTest.findMany({
      where: { isActive: true, code: { in: codes } },
      include: includeClassifiers ? labClassifierInclude : undefined,
    });

    if (byCode.length > 0) {
      return byCode.map((row) =>
        mapLabRowToCatalogSearchItem(
          {
            id: row.id,
            code: row.code,
            name: row.name,
            displayNameEn: row.displayNameEn,
            displayNameFr: row.displayNameFr,
            description: row.description,
            searchText: row.searchText,
            billingCodeDefault: row.billingCodeDefault,
            labCategoryClassifier:
              includeClassifiers && "labCategoryClassifier" in row
                ? (row as { labCategoryClassifier: { labels: Array<{ locale: string; displayName: string }> } | null })
                    .labCategoryClassifier
                : null,
          },
          truncateSearchText(row.searchText)
        )
      );
    }

    const aliasCandidates = [
      ...new Set([
        ...codes.map((code) => code.toLowerCase()),
        ...codes,
      ]),
    ];
    const aliasRows = await this.prisma.labTestAlias.findMany({
      where: {
        alias: { in: aliasCandidates, mode: "insensitive" },
        catalogLabTest: { isActive: true },
      },
      include: {
        catalogLabTest: includeClassifiers ? { include: labClassifierInclude } : true,
      },
    });
    const aliasMatches = aliasRows
      .map((row) => row.catalogLabTest)
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
    if (aliasMatches.length > 0) {
      const uniqueById = new Map(aliasMatches.map((row) => [row.id, row]));
      return [...uniqueById.values()].map((row) =>
        mapLabRowToCatalogSearchItem(
          {
            id: row.id,
            code: row.code,
            name: row.name,
            displayNameEn: row.displayNameEn,
            displayNameFr: row.displayNameFr,
            description: row.description,
            searchText: row.searchText,
            billingCodeDefault: row.billingCodeDefault,
            labCategoryClassifier:
              includeClassifiers && "labCategoryClassifier" in row
                ? (row as { labCategoryClassifier: { labels: Array<{ locale: string; displayName: string }> } | null })
                    .labCategoryClassifier
                : null,
          },
          truncateSearchText(row.searchText)
        )
      );
    }

    if (input.fallbackSearchQuery?.trim()) {
      const search = await this.search({ q: input.fallbackSearchQuery.trim(), limit: 5 });
      return search.items;
    }

    return [];
  }
}
