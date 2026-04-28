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

const LAB_ALIAS_CODE_MAP: Record<string, string[]> = {
  cbc: ["CBC", "ER_CBC"],
  cmp: ["ER_CMP"],
  bmp: ["BMP", "ER_BMP"],
  trop: ["TROP", "ER_TROP"],
};

@Injectable()
export class LabCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: { q: string; limit: number }): Promise<{ items: CatalogSearchItemDto[] }> {
    const q = query.q.trim().toLowerCase();
    const limit = Math.min(query.limit, 50);
    if (!q) return { items: [] };

    const byCatalog = await this.prisma.catalogLabTest.findMany({
      where: {
        isActive: true,
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          { displayNameEn: { contains: q, mode: "insensitive" } },
          { displayNameFr: { contains: q, mode: "insensitive" } },
          { searchText: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: [{ isEssential: "desc" }, { sortPriority: "asc" }, { name: "asc" }],
      take: limit * 3,
    });

    const aliasCodes = LAB_ALIAS_CODE_MAP[q] ?? [];
    const byKnownAliasCatalog =
      aliasCodes.length > 0
        ? await this.prisma.catalogLabTest.findMany({
            where: { code: { in: aliasCodes }, isActive: true },
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
        },
        truncateSearchText(row.searchText)
      )
    );

    return { items };
  }
}
