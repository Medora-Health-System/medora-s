import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { deriveMedicationMasterBadges } from "./medication-master-badge.util";
import { normalizeMedicationAlias } from "./promotion-alias.util";
import type { CatalogCanonicalReadMetadata } from "./catalog-canonical-read.types";

function packageBillingReview(
  profiles: Array<{ requiresManualReview: boolean }> | undefined
): boolean {
  return profiles?.some((p) => p.requiresManualReview) ?? false;
}

function mergeAliases(existing: string[] | undefined, extra: string[], max = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const a of [...(existing ?? []), ...extra]) {
    const t = a.trim();
    if (t.length < 2 || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

@Injectable()
export class CatalogCanonicalReadService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Confident matches only: `MedicationProduct.legacyCatalogMedicationId` (unique when set).
   * No name/route guessing — uncertain rows are omitted.
   */
  async getReadMetadataByCatalogIds(
    facilityId: string,
    catalogMedicationIds: string[]
  ): Promise<Map<string, CatalogCanonicalReadMetadata>> {
    const uniqueIds = [...new Set(catalogMedicationIds.filter(Boolean))];
    if (uniqueIds.length === 0) return new Map();

    const products = await this.prisma.medicationProduct.findMany({
      where: {
        legacyCatalogMedicationId: { in: uniqueIds },
        isActive: true,
        concept: { isActive: true },
      },
      include: {
        concept: {
          include: {
            safetyProfile: true,
            searchAliases: { select: { alias: true }, take: 6 },
          },
        },
        administrationProfile: true,
        infusionProfile: true,
        searchAliases: { select: { alias: true }, take: 6 },
        packages: {
          where: { isActive: true },
          orderBy: [{ isDefaultForProduct: "desc" }, { createdAt: "asc" }],
          take: 1,
          include: {
            billingProfiles: { select: { requiresManualReview: true } },
            facilityFormularyItems: { where: { facilityId }, take: 1 },
          },
        },
      },
    });

    const out = new Map<string, CatalogCanonicalReadMetadata>();

    for (const product of products) {
      const catalogId = product.legacyCatalogMedicationId;
      if (!catalogId || out.has(catalogId)) continue;

      const pkg = product.packages[0];
      const formulary = pkg?.facilityFormularyItems?.[0];
      const aliasParts = [
        ...product.searchAliases.map((a) => a.alias),
        ...product.concept.searchAliases.map((a) => a.alias),
      ];

      const badges = deriveMedicationMasterBadges({
        administrationType: product.administrationType,
        hasInfusionProfile: Boolean(product.infusionProfile),
        requiresInfusionSession: product.administrationProfile?.requiresInfusionSession,
        isControlled: product.concept.safetyProfile?.isControlled,
        isHighAlert: product.concept.safetyProfile?.isHighAlert,
        requiresManualReview: pkg ? packageBillingReview(pkg.billingProfiles) : false,
        ndc11: pkg?.ndc11 ?? null,
        isEDFormulary: formulary?.isEDFormulary,
        favoriteTier: formulary?.favoriteTier,
        isOnFormulary: formulary?.isOnFormulary,
      });

      out.set(catalogId, {
        matchConfidence: "LEGACY_LINK",
        badges,
        canonicalAliases: mergeAliases([], aliasParts),
      });
    }

    return out;
  }

  /** Supplemental catalog IDs reachable only via canonical aliases (legacy link required). */
  async findCatalogIdsViaCanonicalAlias(query: string): Promise<string[]> {
    const normalizedQ = normalizeMedicationAlias(query.trim());
    if (normalizedQ.length < 2) return [];

    const aliasRows = await this.prisma.medicationSearchAlias.findMany({
      where: { normalizedAlias: { contains: normalizedQ } },
      select: {
        productId: true,
        conceptId: true,
        product: {
          select: { legacyCatalogMedicationId: true, isActive: true },
        },
      },
      take: 50,
    });

    const ids = new Set<string>();

    for (const row of aliasRows) {
      const legacyId = row.product?.legacyCatalogMedicationId;
      if (legacyId && row.product?.isActive) ids.add(legacyId);
    }

    const conceptOnlyIds = [
      ...new Set(
        aliasRows
          .filter((r) => r.conceptId && !r.productId)
          .map((r) => r.conceptId as string)
      ),
    ];

    if (conceptOnlyIds.length > 0) {
      const conceptProducts = await this.prisma.medicationProduct.findMany({
        where: {
          conceptId: { in: conceptOnlyIds },
          isActive: true,
          legacyCatalogMedicationId: { not: null },
          concept: { isActive: true },
        },
        select: { conceptId: true, legacyCatalogMedicationId: true },
      });

      const byConcept = new Map<string, string[]>();
      for (const p of conceptProducts) {
        if (!p.legacyCatalogMedicationId) continue;
        const list = byConcept.get(p.conceptId) ?? [];
        list.push(p.legacyCatalogMedicationId);
        byConcept.set(p.conceptId, list);
      }

      for (const conceptId of conceptOnlyIds) {
        const linked = byConcept.get(conceptId) ?? [];
        if (linked.length === 1) ids.add(linked[0]!);
      }
    }

    return [...ids];
  }
}
