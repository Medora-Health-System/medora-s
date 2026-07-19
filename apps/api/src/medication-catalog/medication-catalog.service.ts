import { Injectable } from "@nestjs/common";
import type { CatalogMedication } from "@prisma/client";
import { CatalogCanonicalReadService } from "../medication-master/catalog-canonical-read.service";
import { MedicationProductActivationGovernanceService } from "../medication-master/medication-product-activation-governance.service";
import { PrismaService } from "../prisma/prisma.service";
import type { CatalogSearchItemDto } from "../order-catalog/dto/catalog-search-item.dto";
import {
  compareCatalogRows,
  matchTierForQuery,
  resolveMatchedBrandAlias,
  truncateSearchText,
  type CatalogRankableRow,
} from "../order-catalog/catalog-search-rank.util";
import { mapMedicationToCatalogSearchItem } from "../order-catalog/catalog-search.mapper";
import { enrichMedicationSearchItemsWithCanonical } from "./medication-catalog-canonical-enrich.util";
import {
  listActiveTranche1PilotCatalogCodes,
  getActiveProviderOrderableCatalogCodes,
  isTranche1PilotScopeAllowed,
  dedupeMedicationSearchCatalogCodes,
  type PilotScopeInput,
} from "@medora/shared";
import {
  buildCatalogMedicationSearchWhere,
  buildCatalogMedicationAliasVisibilityWhere,
  buildCatalogMedicationVisibilityWhere,
  expandMedicationSearchQuery,
} from "./medication-catalog-search.util";

/** One medication row from DB with its match tier (direct search vs alias-only path). */
type ScoredMedicationRow = { row: CatalogMedication; tier: number };

function medicationToRankable(m: CatalogMedication): CatalogRankableRow {
  return {
    code: m.code,
    name: m.name,
    displayNameEn: m.displayNameEn,
    displayNameFr: m.displayNameFr,
    genericName: m.genericName,
    searchText: m.searchText,
    isEssential: m.isEssential,
    sortPriority: m.sortPriority,
  };
}

function normalizeGenericKey(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

@Injectable()
export class MedicationCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly canonicalRead: CatalogCanonicalReadService,
    private readonly activationGovernance: MedicationProductActivationGovernanceService
  ) {}

  /**
   * Search medications (min 2 chars on client). Ranking: exact / prefix / alias / contains + essential + sortPriority.
   */
  async search(
    facilityId: string,
    query: {
      q: string;
      limit: number;
      favoritesFirst?: boolean;
      specialtyPack?: string;
      purpose?: "order" | "documentation";
      pilotScope?: PilotScopeInput;
    }
  ): Promise<{ items: CatalogSearchItemDto[] }> {
    const q = query.q.trim().toLowerCase();
    const limit = Math.min(query.limit, 50);
    const purpose = query.purpose ?? "order";
    if (!q) return { items: [] };

    const searchTerms = expandMedicationSearchQuery(q);
    const packMarker = query.specialtyPack
      ? `EM_PACK:${query.specialtyPack.trim().toUpperCase()}`
      : null;
    const baseWhere = buildCatalogMedicationVisibilityWhere(searchTerms);
    const byCatalog = await this.prisma.catalogMedication.findMany({
      where: packMarker
        ? {
            AND: [
              baseWhere,
              {
                OR: [
                  { searchText: { contains: packMarker, mode: "insensitive" } },
                  {
                    therapeuticClass: {
                      contains: query.specialtyPack!,
                      mode: "insensitive",
                    },
                  },
                ],
              },
            ],
          }
        : baseWhere,
      orderBy: [{ isEssential: "desc" }, { sortPriority: "asc" }, { name: "asc" }],
      take: limit * 3,
    });

    const aliasOr = searchTerms.map((term) => ({ alias: { contains: term, mode: "insensitive" as const } }));
    const byAlias = await this.prisma.medicationAlias.findMany({
      where: { OR: aliasOr },
      select: { catalogMedicationId: true },
      distinct: ["catalogMedicationId"],
    });
    const aliasIds = byAlias.map((a) => a.catalogMedicationId);
    const byAliasCatalog =
      aliasIds.length > 0
        ? await this.prisma.catalogMedication.findMany({
            where: buildCatalogMedicationAliasVisibilityWhere(aliasIds),
            orderBy: [{ isEssential: "desc" }, { sortPriority: "asc" }, { name: "asc" }],
          })
        : [];

    const directIds = new Set(byCatalog.map((r) => r.id));
    const candidateRows = [...byCatalog];
    for (const row of byAliasCatalog) {
      if (!directIds.has(row.id)) {
        candidateRows.push(row);
        directIds.add(row.id);
      }
    }

    const canonicalAliasCatalogIds = (
      await Promise.all(searchTerms.map((term) => this.canonicalRead.findCatalogIdsViaCanonicalAlias(term)))
    ).flat();
    const missingCanonicalIds = canonicalAliasCatalogIds.filter((id) => !directIds.has(id));
    if (missingCanonicalIds.length > 0) {
      const extraRows = await this.prisma.catalogMedication.findMany({
        where: buildCatalogMedicationAliasVisibilityWhere(missingCanonicalIds),
      });
      for (const row of extraRows) {
        if (directIds.has(row.id)) continue;
        candidateRows.push(row);
        directIds.add(row.id);
      }
    }

    // Exact-family expansion: pull sibling strengths for top generic hits before truncation.
    const seedGenerics = [
      ...new Set(
        candidateRows
          .slice(0, Math.max(limit, 12))
          .map((r) => normalizeGenericKey(r.genericName))
          .filter(Boolean)
      ),
    ].slice(0, 8);
    if (seedGenerics.length > 0) {
      const siblings = await this.prisma.catalogMedication.findMany({
        where: {
          isActive: true,
          OR: seedGenerics.map((g) => ({
            genericName: { equals: g, mode: "insensitive" as const },
          })),
        },
        take: 120,
      });
      for (const row of siblings) {
        if (directIds.has(row.id)) continue;
        candidateRows.push(row);
        directIds.add(row.id);
      }
    }

    const aliasRows = await this.prisma.medicationAlias.findMany({
      where: { catalogMedicationId: { in: [...directIds] } },
      select: { catalogMedicationId: true, alias: true },
    });
    const aliasesByCatalogId = new Map<string, string[]>();
    for (const a of aliasRows) {
      const list = aliasesByCatalogId.get(a.catalogMedicationId) ?? [];
      list.push(a.alias);
      aliasesByCatalogId.set(a.catalogMedicationId, list);
    }

    const scored: ScoredMedicationRow[] = [];
    const aliasMatchedIds = new Set(byAliasCatalog.map((r) => r.id));
    for (const row of candidateRows) {
      const aliases = aliasesByCatalogId.get(row.id) ?? [];
      const aliasOnlyMatch = aliasMatchedIds.has(row.id) && !byCatalog.some((r) => r.id === row.id);
      const tier = matchTierForQuery(q, medicationToRankable(row), {
        aliasOnlyMatch,
        aliases,
      });
      if (tier >= 9) continue;
      scored.push({ row, tier });
    }

    scored.sort((a, b) =>
      compareCatalogRows(
        { row: medicationToRankable(a.row), tier: a.tier },
        { row: medicationToRankable(b.row), tier: b.tier }
      )
    );

    let sliced = scored.slice(0, limit).map((s) => s.row);
    if (purpose !== "documentation") {
      const eligibleCatalogIds = await this.activationGovernance.filterProviderSearchCatalogIds(
        facilityId,
        sliced.map((m) => m.id)
      );
      sliced = sliced.filter((m) => eligibleCatalogIds.has(m.id));
      if (query.pilotScope && isTranche1PilotScopeAllowed(query.pilotScope)) {
        const existingCodes = new Set(sliced.map((m) => m.code));
        const pilotCodes = listActiveTranche1PilotCatalogCodes().filter((code) => !existingCodes.has(code));
        if (pilotCodes.length > 0) {
          const pilotRows = await this.prisma.catalogMedication.findMany({
            where: {
              code: { in: pilotCodes },
              ...buildCatalogMedicationSearchWhere(searchTerms),
            },
            orderBy: [{ isEssential: "desc" }, { sortPriority: "asc" }, { name: "asc" }],
            take: Math.max(0, limit - sliced.length),
          });
          sliced = [...sliced, ...pilotRows.filter((row) => !existingCodes.has(row.code))].slice(0, limit);
        }
      }
      if (sliced.length < limit) {
        const activeProviderCodes = getActiveProviderOrderableCatalogCodes();
        const existingCodes = new Set(sliced.map((m) => m.code));
        const supplementalCodes = [...activeProviderCodes].filter((code) => !existingCodes.has(code));
        if (supplementalCodes.length > 0) {
          const providerOrderableRows = await this.prisma.catalogMedication.findMany({
            where: {
              code: { in: supplementalCodes },
              ...buildCatalogMedicationSearchWhere(searchTerms),
            },
            orderBy: [{ isEssential: "desc" }, { sortPriority: "asc" }, { name: "asc" }],
            take: Math.max(0, limit - sliced.length),
          });
          sliced = [
            ...sliced,
            ...providerOrderableRows.filter((row) => !existingCodes.has(row.code)),
          ].slice(0, limit);
        }
      }
    }

    sliced = dedupeMedicationSearchCatalogCodes(sliced, getActiveProviderOrderableCatalogCodes());

    const favoriteIds = query.favoritesFirst
      ? await this.getFavoriteCatalogIds(facilityId, sliced.map((m) => m.id))
      : new Set<string>();

    let items: CatalogSearchItemDto[] = sliced.map((m) => {
      const aliases = aliasesByCatalogId.get(m.id) ?? [];
      const matchedBrand = resolveMatchedBrandAlias(q, aliases, searchTerms);
      return mapMedicationToCatalogSearchItem(
        {
          ...m,
          isFavorite: favoriteIds.has(m.id),
        },
        truncateSearchText(m.searchText),
        { matchedBrandAlias: matchedBrand, commonAliases: aliases }
      );
    });

    if (query.favoritesFirst && items.length > 0) {
      items = [...items].sort((a, b) => {
        const fa = a.isFavorite ? 1 : 0;
        const fb = b.isFavorite ? 1 : 0;
        if (fa !== fb) return fb - fa;
        return 0;
      });
    }

    items = await this.attachCanonicalReadMetadata(facilityId, items);
    return { items };
  }

  private async attachCanonicalReadMetadata(
    facilityId: string,
    items: CatalogSearchItemDto[]
  ): Promise<CatalogSearchItemDto[]> {
    const catalogIds = items.filter((i) => i.type === "MEDICATION").map((i) => i.id);
    if (catalogIds.length === 0) return items;
    const meta = await this.canonicalRead.getReadMetadataByCatalogIds(facilityId, catalogIds);
    return enrichMedicationSearchItemsWithCanonical(items, meta);
  }

  private async getFavoriteCatalogIds(facilityId: string, catalogIds: string[]): Promise<Set<string>> {
    if (catalogIds.length === 0) return new Set();
    const items = await this.prisma.inventoryItem.findMany({
      where: { facilityId, catalogMedicationId: { in: catalogIds }, isFavorite: true },
      select: { catalogMedicationId: true },
    });
    return new Set(items.map((i) => i.catalogMedicationId));
  }

  async getFavorites(facilityId: string, limit = 20): Promise<CatalogSearchItemDto[]> {
    const items = await this.prisma.inventoryItem.findMany({
      where: { facilityId, isFavorite: true, isActive: true },
      include: { catalogMedication: true },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
    const mapped = items.map((i) =>
      mapMedicationToCatalogSearchItem(
        { ...i.catalogMedication, isFavorite: true },
        truncateSearchText(i.catalogMedication.searchText)
      )
    );
    return this.attachCanonicalReadMetadata(facilityId, mapped);
  }

  async getRecent(facilityId: string, limit = 20): Promise<CatalogSearchItemDto[]> {
    const usages = await this.prisma.facilityMedicationUsage.findMany({
      where: { facilityId },
      orderBy: { lastUsedAt: "desc" },
      take: limit,
      include: { catalogMedication: true },
    });
    const mapped = usages
      .filter((u) => u.catalogMedication.isActive)
      .map((u) =>
        mapMedicationToCatalogSearchItem(
          { ...u.catalogMedication, isFavorite: false },
          truncateSearchText(u.catalogMedication.searchText)
        )
      );
    return this.attachCanonicalReadMetadata(facilityId, mapped);
  }

  async recordInventoryAdd(facilityId: string, catalogMedicationId: string): Promise<void> {
    await this.prisma.facilityMedicationUsage.upsert({
      where: {
        facilityId_catalogMedicationId: { facilityId, catalogMedicationId },
      },
      create: {
        facilityId,
        catalogMedicationId,
        inventoryAddsCount: 1,
        lastUsedAt: new Date(),
      },
      update: {
        inventoryAddsCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });
  }

  async recordDispense(facilityId: string, catalogMedicationId: string): Promise<void> {
    if (!catalogMedicationId?.trim()) return;
    await this.prisma.facilityMedicationUsage.upsert({
      where: {
        facilityId_catalogMedicationId: { facilityId, catalogMedicationId },
      },
      create: {
        facilityId,
        catalogMedicationId,
        dispenseCount: 1,
        lastUsedAt: new Date(),
      },
      update: {
        dispenseCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });
  }
}
