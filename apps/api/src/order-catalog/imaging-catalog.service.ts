import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { CatalogSearchItemDto } from "./dto/catalog-search-item.dto";
import {
  compareOrderCatalogRows,
  orderCatalogMatchTierForQuery,
  truncateSearchText,
  type OrderCatalogRankableRow,
} from "./catalog-search-rank.util";
import { mapImagingRowToCatalogSearchItem } from "./catalog-search.mapper";

const IMAGING_ALIAS_CODE_MAP: Record<string, string[]> = {
  cxr: ["XR_CHEST"],
  "ct head": ["CT_HEAD"],
  "ct cervical": ["CT_CERVICAL_SPINE"],
  "ct abdomen": ["CT_ABDOMEN_PELVIS", "CT_ABD"],
  "cta chest": ["CTA_CHEST", "CT_CHEST_CTA"],
  "ultrasound abdomen": ["US_ABDOMEN", "US_ABD"],
  "doppler leg": ["US_VENOUS_DOPPLER_LE", "DOPPLER_VEIN"],
  "xray ankle": ["XR_ANKLE"],
  "mri brain": ["MRI_BRAIN"],
};

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
          { displayNameEn: { contains: q, mode: "insensitive" } },
          { displayNameFr: { contains: q, mode: "insensitive" } },
          { searchText: { contains: q, mode: "insensitive" } },
          { modality: { contains: q, mode: "insensitive" } },
          { bodyRegion: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: [{ isEssential: "desc" }, { sortPriority: "asc" }, { name: "asc" }],
      take: limit * 3,
    });

    const aliasCodes = IMAGING_ALIAS_CODE_MAP[q] ?? [];
    const byKnownAliasCatalog =
      aliasCodes.length > 0
        ? await this.prisma.catalogImagingStudy.findMany({
            where: { code: { in: aliasCodes }, isActive: true },
          })
        : [];

    const byAlias = await this.prisma.imagingStudyAlias.findMany({
      where: { alias: { contains: q, mode: "insensitive" } },
      select: { catalogImagingStudyId: true, alias: true },
    });
    const aliasIds = [...new Set(byAlias.map((a) => a.catalogImagingStudyId))];
    const byAliasCatalog =
      aliasIds.length > 0
        ? await this.prisma.catalogImagingStudy.findMany({
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
      const aliases = aliasesById.get(alias.catalogImagingStudyId) ?? [];
      aliases.push(alias.alias);
      aliasesById.set(alias.catalogImagingStudyId, aliases);
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
      mapImagingRowToCatalogSearchItem(
        {
          id: row.id,
          code: row.code,
          name: row.name,
          displayNameEn: row.displayNameEn,
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
