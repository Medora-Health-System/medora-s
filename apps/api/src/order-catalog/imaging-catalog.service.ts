import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { CatalogSearchItemDto } from "./dto/catalog-search-item.dto";
import {
  compareCatalogRows,
  matchTierForQuery,
  truncateSearchText,
  type CatalogRankableRow,
} from "./catalog-search-rank.util";
import { mapImagingRowToCatalogSearchItem } from "./catalog-search.mapper";

@Injectable()
export class ImagingCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: { q: string; limit: number }): Promise<{ items: CatalogSearchItemDto[] }> {
    const q = query.q.trim().toLowerCase();
    const limit = Math.min(query.limit, 50);
    if (!q) return { items: [] };

    const byCatalog = await this.prisma.catalogImagingStudy.findMany({
      where: {
        isActive: true,
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          { displayNameFr: { contains: q, mode: "insensitive" } },
          { searchText: { contains: q, mode: "insensitive" } },
          { modality: { contains: q, mode: "insensitive" } },
          { bodyRegion: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: [{ isEssential: "desc" }, { sortPriority: "asc" }, { name: "asc" }],
      take: limit * 3,
    });

    const byAlias = await this.prisma.imagingStudyAlias.findMany({
      where: { alias: { contains: q, mode: "insensitive" } },
      select: { catalogImagingStudyId: true },
      distinct: ["catalogImagingStudyId"],
    });
    const aliasIds = byAlias.map((a) => a.catalogImagingStudyId);
    const byAliasCatalog =
      aliasIds.length > 0
        ? await this.prisma.catalogImagingStudy.findMany({
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
      mapImagingRowToCatalogSearchItem(
        {
          id: row.id,
          code: row.code,
          name: row.name,
          displayNameFr: row.displayNameFr,
          modality: row.modality,
          bodyRegion: row.bodyRegion,
          searchText: row.searchText,
        },
        truncateSearchText(row.searchText)
      )
    );

    return { items };
  }
}
