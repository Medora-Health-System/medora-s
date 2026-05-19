import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { MedicationMasterSearchQuery } from "./dto/medication-master-explorer.dto";
import {
  deriveMedicationMasterBadges,
  type MedicationMasterExplorerBadges,
} from "./medication-master-badge.util";
import { normalizeMedicationAlias } from "./promotion-alias.util";
import {
  buildMedicationMasterValidationWarnings,
  type MedicationMasterValidationWarning,
} from "./medication-master-validation.util";

const CONCEPT_LIST_INCLUDE = {
  therapeuticClass: { select: { code: true, name: true } },
  safetyProfile: true,
  products: {
    where: { isActive: true },
    include: {
      defaultRoute: { select: { code: true, label: true } },
      administrationProfile: true,
      infusionProfile: true,
      searchAliases: { select: { alias: true, normalizedAlias: true } },
      packages: {
        where: { isActive: true },
        include: {
          billingProfiles: { select: { requiresManualReview: true } },
        },
      },
    },
  },
  searchAliases: { select: { alias: true, normalizedAlias: true } },
} satisfies Prisma.MedicationConceptInclude;

export type MedicationMasterSearchHitDto = {
  conceptId: string;
  conceptCode: string;
  displayName: string;
  genericName: string;
  productId: string | null;
  productCode: string | null;
  strengthDisplay: string | null;
  packageId: string | null;
  packageCode: string | null;
  packageDescription: string | null;
  ndc11: string | null;
  administrationType: string | null;
  badges: MedicationMasterExplorerBadges;
  matchKind: "concept" | "product" | "package" | "alias";
};

export type MedicationMasterConceptDetailDto = {
  /** Phase 19C.3 — pharmacy validation view is read-only only. */
  readOnly: true;
  validationWarnings: MedicationMasterValidationWarning[];
  concept: {
    id: string;
    code: string;
    genericName: string;
    displayName: string;
    isActive: boolean;
    rxNormConceptId: string | null;
    therapeuticClass: { code: string; name: string } | null;
    safetyProfile: {
      isHighAlert: boolean;
      isControlled: boolean;
      controlledSchedule: string | null;
      requiresWitness: boolean;
      requiresDoubleSign: boolean;
      lasaGroupId: string | null;
    } | null;
    conceptAliases: Array<{ alias: string; aliasType: string | null }>;
    /** Merged concept + product aliases (explorer compat). */
    aliases: Array<{ alias: string; aliasType: string | null }>;
  };
  products: Array<{
    id: string;
    code: string;
    strengthDisplay: string;
    dosageForm: string;
    administrationType: string;
    billingClass: string;
    isActive: boolean;
    legacyCatalogMedicationId: string | null;
    defaultRoute: { code: string; label: string } | null;
    productAliases: Array<{ alias: string; aliasType: string | null }>;
    administrationProfile: {
      defaultMarWorkflow: string;
      requiresInfusionSession: boolean;
      hydrationFluid: boolean;
      allowsPartialDose: boolean;
      allowsWasteDocumentation: boolean;
    } | null;
    infusionProfile: {
      infusionType: string;
      rateRequired: boolean;
      requiresStopMarForBilling: boolean;
      minDocumentedDurationMinutes: number | null;
    } | null;
    packages: Array<{
      id: string;
      code: string;
      packageDescription: string;
      packageType: string;
      ndc11: string | null;
      ndcDisplay: string | null;
      isDefaultForProduct: boolean;
      badges: MedicationMasterExplorerBadges;
      billingProfiles: Array<{
        requiresManualReview: boolean;
        hcpcsCodeSuggested: string | null;
        hcpcsUnitType: string | null;
        revenueCodeSuggested: string | null;
        billableUnitRule: string | null;
        companionProcedureCptSuggested: string | null;
        wastageBillable: boolean;
      }>;
      facilityFormulary: {
        id: string;
        isOnFormulary: boolean;
        isEDFormulary: boolean;
        favoriteTier: string | null;
        sortPriority: number | null;
      } | null;
    }>;
  }>;
};

export type MedicationMasterFormularyItemDto = {
  formularyItemId: string;
  facilityId: string;
  packageId: string;
  isOnFormulary: boolean;
  isEDFormulary: boolean;
  favoriteTier: string | null;
  sortPriority: number | null;
  conceptId: string;
  conceptCode: string;
  displayName: string;
  genericName: string;
  productId: string;
  productCode: string;
  strengthDisplay: string;
  administrationType: string;
  packageCode: string;
  packageDescription: string;
  ndc11: string | null;
  badges: MedicationMasterExplorerBadges;
};

function boolFilter(flag: "true" | "false" | undefined): boolean {
  return flag === "true";
}

function packageBillingReview(
  profiles: Array<{ requiresManualReview: boolean }> | undefined
): boolean {
  return profiles?.some((p) => p.requiresManualReview) ?? false;
}

@Injectable()
export class MedicationMasterExplorerService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: MedicationMasterSearchQuery): Promise<{ items: MedicationMasterSearchHitDto[]; total: number }> {
    const q = query.q.trim();
    const normalizedQ = q.length >= 2 ? normalizeMedicationAlias(q) : "";
    const take = query.limit;
    const skip = query.offset;

    const activeOnly = query.activeOnly !== "false";

    const conceptWhere: Prisma.MedicationConceptWhereInput = {};
    if (activeOnly) {
      conceptWhere.isActive = true;
      conceptWhere.products = { some: { isActive: true } };
    }

    const orClauses: Prisma.MedicationConceptWhereInput[] = [];
    if (q.length >= 1) {
      orClauses.push(
        { code: { contains: q, mode: "insensitive" } },
        { genericName: { contains: q, mode: "insensitive" } },
        { displayName: { contains: q, mode: "insensitive" } },
        {
          products: {
            some: {
              OR: [
                { code: { contains: q, mode: "insensitive" } },
                { strengthDisplay: { contains: q, mode: "insensitive" } },
                {
                  packages: {
                    some: {
                      OR: [
                        { code: { contains: q, mode: "insensitive" } },
                        { packageDescription: { contains: q, mode: "insensitive" } },
                        { ndc11: { contains: q.replace(/\D/g, ""), mode: "insensitive" } },
                      ],
                    },
                  },
                },
              ],
            },
          },
        }
      );
    }
    if (normalizedQ.length >= 2) {
      orClauses.push({
        searchAliases: { some: { normalizedAlias: { contains: normalizedQ } } },
      });
      orClauses.push({
        products: { some: { searchAliases: { some: { normalizedAlias: { contains: normalizedQ } } } } },
      });
    }

    if (orClauses.length > 0) {
      conceptWhere.OR = orClauses;
    }

    if (query.administrationType?.trim()) {
      conceptWhere.products = {
        ...(typeof conceptWhere.products === "object" && conceptWhere.products !== null
          ? conceptWhere.products
          : {}),
        some: {
          ...(typeof conceptWhere.products === "object" &&
          conceptWhere.products !== null &&
          "some" in conceptWhere.products &&
          typeof conceptWhere.products.some === "object"
            ? conceptWhere.products.some
            : {}),
          administrationType: query.administrationType.trim().toUpperCase(),
          ...(activeOnly ? { isActive: true } : {}),
        },
      };
    }

    const concepts = await this.prisma.medicationConcept.findMany({
      where: conceptWhere,
      include: CONCEPT_LIST_INCLUDE,
      orderBy: [{ displayName: "asc" }],
      take: Math.min(take + skip + 80, 300),
    });

    const facilityFormularyByPackage = query.facilityId
      ? await this.loadFormularyMap(query.facilityId)
      : new Map<string, { isEDFormulary: boolean; favoriteTier: string | null; isOnFormulary: boolean }>();

    const hits: MedicationMasterSearchHitDto[] = [];

    for (const concept of concepts) {
      for (const product of concept.products) {
        for (const pkg of product.packages) {
          const formulary = facilityFormularyByPackage.get(pkg.id);
          const badges = deriveMedicationMasterBadges({
            administrationType: product.administrationType,
            hasInfusionProfile: Boolean(product.infusionProfile),
            requiresInfusionSession: product.administrationProfile?.requiresInfusionSession,
            isControlled: concept.safetyProfile?.isControlled,
            isHighAlert: concept.safetyProfile?.isHighAlert,
            requiresManualReview: packageBillingReview(pkg.billingProfiles),
            ndc11: pkg.ndc11,
            isEDFormulary: formulary?.isEDFormulary,
            favoriteTier: formulary?.favoriteTier,
            isOnFormulary: formulary?.isOnFormulary,
          });

          if (!this.passesExplorerFilters(query, badges, formulary)) continue;

          const matchKind = this.resolveMatchKind(q, normalizedQ, concept, product, pkg);
          if (q.length >= 2 && matchKind === null) continue;

          hits.push({
            conceptId: concept.id,
            conceptCode: concept.code,
            displayName: concept.displayName,
            genericName: concept.genericName,
            productId: product.id,
            productCode: product.code,
            strengthDisplay: product.strengthDisplay,
            packageId: pkg.id,
            packageCode: pkg.code,
            packageDescription: pkg.packageDescription,
            ndc11: pkg.ndc11,
            administrationType: product.administrationType,
            badges,
            matchKind: matchKind ?? "concept",
          });
        }

        if (product.packages.length === 0) {
          const badges = deriveMedicationMasterBadges({
            administrationType: product.administrationType,
            hasInfusionProfile: Boolean(product.infusionProfile),
            requiresInfusionSession: product.administrationProfile?.requiresInfusionSession,
            isControlled: concept.safetyProfile?.isControlled,
            isHighAlert: concept.safetyProfile?.isHighAlert,
            ndc11: null,
          });
          if (!this.passesExplorerFilters(query, badges, undefined)) continue;
          hits.push({
            conceptId: concept.id,
            conceptCode: concept.code,
            displayName: concept.displayName,
            genericName: concept.genericName,
            productId: product.id,
            productCode: product.code,
            strengthDisplay: product.strengthDisplay,
            packageId: null,
            packageCode: null,
            packageDescription: null,
            ndc11: null,
            administrationType: product.administrationType,
            badges,
            matchKind: "product",
          });
        }
      }
    }

    const deduped = this.dedupeHits(hits);
    const total = deduped.length;
    const items = deduped.slice(skip, skip + take);
    return { items, total };
  }

  async getConceptDetail(conceptId: string, facilityId?: string): Promise<MedicationMasterConceptDetailDto> {
    const concept = await this.prisma.medicationConcept.findUnique({
      where: { id: conceptId },
      include: {
        therapeuticClass: { select: { code: true, name: true } },
        safetyProfile: true,
        searchAliases: { select: { alias: true, aliasType: true } },
        products: {
          orderBy: { strengthDisplay: "asc" },
          include: {
            defaultRoute: { select: { code: true, label: true } },
            administrationProfile: true,
            infusionProfile: true,
            packages: {
              orderBy: [{ isDefaultForProduct: "desc" }, { packageDescription: "asc" }],
              include: {
                billingProfiles: {
                  select: {
                    requiresManualReview: true,
                    hcpcsCodeSuggested: true,
                    hcpcsUnitType: true,
                    revenueCodeSuggested: true,
                    billableUnitRule: true,
                    companionProcedureCptSuggested: true,
                    wastageBillable: true,
                  },
                },
                ...(facilityId
                  ? { facilityFormularyItems: { where: { facilityId }, take: 1 } }
                  : {}),
              },
            },
            searchAliases: { select: { alias: true, aliasType: true } },
          },
        },
      },
    });

    if (!concept) throw new NotFoundException("Concept médicamenteux introuvable.");

    const conceptAliases = concept.searchAliases.map((a) => ({
      alias: a.alias,
      aliasType: a.aliasType,
    }));

    const products = concept.products.map((product) => {
      const productAliases = product.searchAliases.map((a) => ({
        alias: a.alias,
        aliasType: a.aliasType,
      }));

      return {
        id: product.id,
        code: product.code,
        strengthDisplay: product.strengthDisplay,
        dosageForm: product.dosageForm,
        administrationType: product.administrationType,
        billingClass: product.billingClass,
        isActive: product.isActive,
        legacyCatalogMedicationId: product.legacyCatalogMedicationId,
        defaultRoute: product.defaultRoute,
        productAliases,
        administrationProfile: product.administrationProfile
          ? {
              defaultMarWorkflow: product.administrationProfile.defaultMarWorkflow,
              requiresInfusionSession: product.administrationProfile.requiresInfusionSession,
              hydrationFluid: product.administrationProfile.hydrationFluid,
              allowsPartialDose: product.administrationProfile.allowsPartialDose,
              allowsWasteDocumentation: product.administrationProfile.allowsWasteDocumentation,
            }
          : null,
        infusionProfile: product.infusionProfile
          ? {
              infusionType: product.infusionProfile.infusionType,
              rateRequired: product.infusionProfile.rateRequired,
              requiresStopMarForBilling: product.infusionProfile.requiresStopMarForBilling,
              minDocumentedDurationMinutes: product.infusionProfile.minDocumentedDurationMinutes,
            }
          : null,
        packages: product.packages.map((pkg) => {
          const formulary = Array.isArray(pkg.facilityFormularyItems)
            ? pkg.facilityFormularyItems[0]
            : null;
          const badges = deriveMedicationMasterBadges({
            administrationType: product.administrationType,
            hasInfusionProfile: Boolean(product.infusionProfile),
            requiresInfusionSession: product.administrationProfile?.requiresInfusionSession,
            isControlled: concept.safetyProfile?.isControlled,
            isHighAlert: concept.safetyProfile?.isHighAlert,
            requiresManualReview: packageBillingReview(pkg.billingProfiles),
            ndc11: pkg.ndc11,
            isEDFormulary: formulary?.isEDFormulary,
            favoriteTier: formulary?.favoriteTier,
            isOnFormulary: formulary?.isOnFormulary,
          });
          return {
            id: pkg.id,
            code: pkg.code,
            packageDescription: pkg.packageDescription,
            packageType: pkg.packageType,
            ndc11: pkg.ndc11,
            ndcDisplay: pkg.ndcDisplay,
            isDefaultForProduct: pkg.isDefaultForProduct,
            badges,
            billingProfiles: pkg.billingProfiles.map((b) => ({
              requiresManualReview: b.requiresManualReview,
              hcpcsCodeSuggested: b.hcpcsCodeSuggested,
              hcpcsUnitType: b.hcpcsUnitType,
              revenueCodeSuggested: b.revenueCodeSuggested,
              billableUnitRule: b.billableUnitRule,
              companionProcedureCptSuggested: b.companionProcedureCptSuggested,
              wastageBillable: b.wastageBillable,
            })),
            facilityFormulary: formulary
              ? {
                  id: formulary.id,
                  isOnFormulary: formulary.isOnFormulary,
                  isEDFormulary: formulary.isEDFormulary,
                  favoriteTier: formulary.favoriteTier,
                  sortPriority: formulary.sortPriority,
                }
              : null,
          };
        }),
      };
    });

    const validationWarnings = buildMedicationMasterValidationWarnings({
      facilityId,
      concept: {
        code: concept.code,
        safetyProfile: concept.safetyProfile,
        conceptAliases,
      },
      products: products.map((p) => ({
        code: p.code,
        administrationType: p.administrationType,
        administrationProfile: p.administrationProfile,
        infusionProfile: p.infusionProfile,
        productAliases: p.productAliases,
        packages: p.packages.map((pkg) => ({
          code: pkg.code,
          ndc11: pkg.ndc11,
          billingProfiles: pkg.billingProfiles,
          facilityFormulary: pkg.facilityFormulary,
        })),
      })),
    });

    return {
      readOnly: true as const,
      validationWarnings,
      concept: {
        id: concept.id,
        code: concept.code,
        genericName: concept.genericName,
        displayName: concept.displayName,
        isActive: concept.isActive,
        rxNormConceptId: concept.rxNormConceptId,
        therapeuticClass: concept.therapeuticClass,
        safetyProfile: concept.safetyProfile
          ? {
              isHighAlert: concept.safetyProfile.isHighAlert,
              isControlled: concept.safetyProfile.isControlled,
              controlledSchedule: concept.safetyProfile.controlledSchedule,
              requiresWitness: concept.safetyProfile.requiresWitness,
              requiresDoubleSign: concept.safetyProfile.requiresDoubleSign,
              lasaGroupId: concept.safetyProfile.lasaGroupId,
            }
          : null,
        conceptAliases,
        aliases: [
          ...conceptAliases,
          ...products.flatMap((p) => p.productAliases),
        ],
      },
      products,
    };
  }

  async getFacilityFormulary(facilityId: string): Promise<{ items: MedicationMasterFormularyItemDto[]; total: number }> {
    const facility = await this.prisma.facility.findUnique({
      where: { id: facilityId },
      select: { id: true, name: true },
    });
    if (!facility) throw new NotFoundException("Établissement introuvable.");

    const rows = await this.prisma.facilityFormularyItem.findMany({
      where: { facilityId, isOnFormulary: true },
      include: {
        package: {
          include: {
            billingProfiles: { select: { requiresManualReview: true } },
            product: {
              include: {
                administrationProfile: true,
                infusionProfile: true,
                concept: { include: { safetyProfile: true } },
              },
            },
          },
        },
      },
      orderBy: [{ sortPriority: "asc" }, { package: { product: { concept: { displayName: "asc" } } } }],
    });

    const items: MedicationMasterFormularyItemDto[] = rows.map((row) => {
      const pkg = row.package;
      const product = pkg.product;
      const concept = product.concept;
      const badges = deriveMedicationMasterBadges({
        administrationType: product.administrationType,
        hasInfusionProfile: Boolean(product.infusionProfile),
        requiresInfusionSession: product.administrationProfile?.requiresInfusionSession,
        isControlled: concept.safetyProfile?.isControlled,
        isHighAlert: concept.safetyProfile?.isHighAlert,
        requiresManualReview: packageBillingReview(pkg.billingProfiles),
        ndc11: pkg.ndc11,
        isEDFormulary: row.isEDFormulary,
        favoriteTier: row.favoriteTier,
        isOnFormulary: row.isOnFormulary,
      });
      return {
        formularyItemId: row.id,
        facilityId: row.facilityId,
        packageId: pkg.id,
        isOnFormulary: row.isOnFormulary,
        isEDFormulary: row.isEDFormulary,
        favoriteTier: row.favoriteTier,
        sortPriority: row.sortPriority,
        conceptId: concept.id,
        conceptCode: concept.code,
        displayName: concept.displayName,
        genericName: concept.genericName,
        productId: product.id,
        productCode: product.code,
        strengthDisplay: product.strengthDisplay,
        administrationType: product.administrationType,
        packageCode: pkg.code,
        packageDescription: pkg.packageDescription,
        ndc11: pkg.ndc11,
        badges,
      };
    });

    return { items, total: items.length };
  }

  assertFacilityScope(requestedFacilityId: string, callerFacilityId: string | undefined): void {
    if (!callerFacilityId || callerFacilityId !== requestedFacilityId) {
      throw new ForbiddenException("Accès refusé pour cet établissement.");
    }
  }

  private async loadFormularyMap(facilityId: string) {
    const rows = await this.prisma.facilityFormularyItem.findMany({
      where: { facilityId },
      select: { packageId: true, isEDFormulary: true, favoriteTier: true, isOnFormulary: true },
    });
    return new Map(
      rows.map((r) => [
        r.packageId,
        { isEDFormulary: r.isEDFormulary, favoriteTier: r.favoriteTier, isOnFormulary: r.isOnFormulary },
      ])
    );
  }

  private passesExplorerFilters(
    query: MedicationMasterSearchQuery,
    badges: MedicationMasterExplorerBadges,
    formulary: { isOnFormulary: boolean } | undefined
  ): boolean {
    if (boolFilter(query.edFormularyOnly) && !badges.edFormulary) return false;
    if (boolFilter(query.controlledOnly) && !badges.controlled) return false;
    if (boolFilter(query.highAlertOnly) && !badges.highAlert) return false;
    if (boolFilter(query.infusionOnly) && !badges.infusion) return false;
    if (boolFilter(query.onFormularyOnly) && !formulary?.isOnFormulary) return false;
    if (query.ndcStatus === "present" && !badges.ndcPresent) return false;
    if (query.ndcStatus === "missing" && badges.ndcPresent) return false;
    return true;
  }

  private resolveMatchKind(
    q: string,
    normalizedQ: string,
    concept: { code: string; genericName: string; displayName: string; searchAliases: Array<{ normalizedAlias: string }> },
    product: { code: string; strengthDisplay: string; searchAliases: Array<{ normalizedAlias: string }> },
    pkg: { code: string; packageDescription: string; ndc11: string | null }
  ): MedicationMasterSearchHitDto["matchKind"] | null {
    if (!q) return "concept";
    const lower = q.toLowerCase();
    const digits = q.replace(/\D/g, "");

    if (
      concept.code.toLowerCase().includes(lower) ||
      concept.genericName.toLowerCase().includes(lower) ||
      concept.displayName.toLowerCase().includes(lower) ||
      concept.searchAliases.some((a) => a.normalizedAlias.includes(normalizedQ))
    ) {
      return "concept";
    }
    if (
      product.code.toLowerCase().includes(lower) ||
      product.strengthDisplay.toLowerCase().includes(lower) ||
      product.searchAliases.some((a) => a.normalizedAlias.includes(normalizedQ))
    ) {
      return "product";
    }
    if (
      pkg.code.toLowerCase().includes(lower) ||
      pkg.packageDescription.toLowerCase().includes(lower) ||
      (digits && pkg.ndc11?.includes(digits))
    ) {
      return "package";
    }
    if (normalizedQ.length >= 2) return "alias";
    return null;
  }

  private dedupeHits(hits: MedicationMasterSearchHitDto[]): MedicationMasterSearchHitDto[] {
    const seen = new Set<string>();
    const out: MedicationMasterSearchHitDto[] = [];
    for (const h of hits) {
      const key = `${h.conceptId}:${h.productId ?? ""}:${h.packageId ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(h);
    }
    return out;
  }
}
