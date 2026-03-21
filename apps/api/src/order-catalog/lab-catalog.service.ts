import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { CatalogSearchItemDto } from "./dto/catalog-search-item.dto";
import {
  compareCatalogRows,
  matchTierForQuery,
  truncateSearchText,
  type CatalogRankableRow,
} from "./catalog-search-rank.util";
import { mapLabRowToCatalogSearchItem } from "./catalog-search.mapper";

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
          { displayNameFr: { contains: q, mode: "insensitive" } },
          { searchText: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: [{ isEssential: "desc" }, { sortPriority: "asc" }, { name: "asc" }],
      take: limit * 3,
    });

    const byAlias = await this.prisma.labTestAlias.findMany({
      where: { alias: { contains: q, mode: "insensitive" } },
      select: { catalogLabTestId: true },
      distinct: ["catalogLabTestId"],
    });
    const aliasIds = byAlias.map((a) => a.catalogLabTestId);
    const byAliasCatalog =
      aliasIds.length > 0
        ? await this.prisma.catalogLabTest.findMany({
            where: { id: { in: aliasIds }, isActive: true },
            orderBy: [{ isEssential: "desc" }, { sortPriority: "asc" }, { name: "asc" }],
          })
        : [];

    const directIds = new Set(byCatalog.map((r) => r.id));
    type Row = (typeof byCatalog)[number];
    const scored: Array<{ row: Row; tier: number }> = [];

    for (const row of byCatalog) {
      const rankable: CatalogRankableRow = {
        code: row.code,
        name: row.name,
        displayNameFr: row.displayNameFr,
        searchText: row.searchText,
        isEssential: row.isEssential,
        sortPriority: row.sortPriority,
      };
      const tier = matchTierForQuery(q, rankable, { aliasOnlyMatch: false });
      scored.push({ row, tier });
    }
    for (const row of byAliasCatalog) {
      if (directIds.has(row.id)) continue;
      const rankable: CatalogRankableRow = {
        code: row.code,
        name: row.name,
        displayNameFr: row.displayNameFr,
        searchText: row.searchText,
        isEssential: row.isEssential,
        sortPriority: row.sortPriority,
      };
      const tier = matchTierForQuery(q, rankable, { aliasOnlyMatch: true });
      scored.push({ row, tier });
    }

    scored.sort((a, b) =>
      compareCatalogRows(
        { row: a.row as CatalogRankableRow, tier: a.tier },
        { row: b.row as CatalogRankableRow, tier: b.tier }
      )
    );

    const items: CatalogSearchItemDto[] = scored.slice(0, limit).map(({ row }) =>
      mapLabRowToCatalogSearchItem(
        {
          id: row.id,
          code: row.code,
          name: row.name,
          displayNameFr: row.displayNameFr,
          description: row.description,
          searchText: row.searchText,
        },
        truncateSearchText(row.searchText)
      )
    );

    return { items };
  }
}
