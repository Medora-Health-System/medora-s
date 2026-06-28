import { Injectable } from "@nestjs/common";
import {
  CANONICAL_CARE_PROCEDURE_CATEGORIES,
  canonicalCareProcedureCategoryLabel,
  type CanonicalCareProcedureCategory,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { CatalogSearchItemDto } from "./dto/catalog-search-item.dto";
import {
  compareOrderCatalogRows,
  orderCatalogMatchTierForQuery,
  type OrderCatalogRankableRow,
} from "./catalog-search-rank.util";

export type ProcedureCatalogSearchQuery = {
  q: string;
  limit: number;
  category?: CanonicalCareProcedureCategory;
};

@Injectable()
export class ProcedureCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: ProcedureCatalogSearchQuery): Promise<{ items: CatalogSearchItemDto[] }> {
    const q = query.q.trim().toLowerCase();
    const limit = Math.min(query.limit, 50);

    const where = {
      isActive: true,
      orderable: true,
      ...(query.category ? { category: query.category } : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: "insensitive" as const } },
              { name: { contains: q, mode: "insensitive" as const } },
              { displayNameEn: { contains: q, mode: "insensitive" as const } },
              { displayNameFr: { contains: q, mode: "insensitive" as const } },
              { searchText: { contains: q, mode: "insensitive" as const } },
              { aliases: { some: { alias: { contains: q, mode: "insensitive" as const } } } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.catalogProcedure.findMany({
      where,
      include: { aliases: true },
      orderBy: [{ sortPriority: "asc" }, { name: "asc" }],
      take: q ? limit * 3 : limit,
    });

    const scored = rows
      .map((row) => {
        const rankable: OrderCatalogRankableRow = {
          code: row.code,
          name: row.name,
          displayNameEn: row.displayNameEn,
          displayNameFr: row.displayNameFr,
          searchText: row.searchText,
          isActive: row.isActive,
        };
        const tier = q ? orderCatalogMatchTierForQuery(q, rankable, { aliases: row.aliases.map((a) => a.alias) }) : 0;
        return { row, tier };
      })
      .filter((entry) => (q ? entry.tier < 9 : true))
      .sort((a, b) =>
        compareOrderCatalogRows(
          {
            row: {
              code: a.row.code,
              name: a.row.name,
              displayNameEn: a.row.displayNameEn,
              displayNameFr: a.row.displayNameFr,
              searchText: a.row.searchText,
              isActive: a.row.isActive,
            },
            tier: a.tier,
          },
          {
            row: {
              code: b.row.code,
              name: b.row.name,
              displayNameEn: b.row.displayNameEn,
              displayNameFr: b.row.displayNameFr,
              searchText: b.row.searchText,
              isActive: b.row.isActive,
            },
            tier: b.tier,
          }
        )
      )
      .slice(0, limit);

    return {
      items: scored.map(({ row }) => ({
        id: row.id,
        code: row.code,
        type: "CARE_PROCEDURE" as const,
        displayNameFr: row.displayNameFr?.trim() || row.displayNameEn?.trim() || row.name,
        displayNameEn: row.displayNameEn?.trim() || row.name,
        name: row.name,
        searchText: row.searchText ?? undefined,
        metadata: {
          category: row.category,
          categoryLabelEn: canonicalCareProcedureCategoryLabel(
            row.category as CanonicalCareProcedureCategory,
            "en"
          ),
          categoryLabelFr: canonicalCareProcedureCategoryLabel(
            row.category as CanonicalCareProcedureCategory,
            "fr"
          ),
          executionRoleCategory: row.executionRoleCategory,
          documentationTemplateId: row.documentationTemplateId ?? undefined,
          requiresProviderOrder: row.requiresProviderOrder,
          nursingProtocolAllowed: row.nursingProtocolAllowed,
          requiresClinicalNote: row.requiresClinicalNote,
          commonAliases: row.aliases.map((alias) => alias.alias),
        },
      })),
    };
  }

  listCategories(locale: "en" | "fr" = "en"): Array<{ id: CanonicalCareProcedureCategory; label: string }> {
    return CANONICAL_CARE_PROCEDURE_CATEGORIES.map((id) => ({
      id,
      label: canonicalCareProcedureCategoryLabel(id, locale),
    }));
  }
}
