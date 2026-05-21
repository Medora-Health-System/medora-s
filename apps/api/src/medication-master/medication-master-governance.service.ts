import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { logError } from "../common/logging/medoraLogger";
import { PrismaService } from "../prisma/prisma.service";
import type {
  MedicationMasterGovernanceDuplicatesQuery,
  MedicationMasterGovernanceUnmappedQuery,
  MedicationMasterGovernanceWarningsQuery,
} from "./dto/medication-master-governance.dto";
import { MedicationMasterExplorerService } from "./medication-master-explorer.service";
import {
  PENDING_REVIEW_GOVERNANCE_STATUSES,
} from "./medication-product-governance.constants";
import { MEDICATION_BASELINE_SOURCE_PRIORITY_ER } from "./medication-baseline.constants";
import {
  aggregateGovernanceFromConcepts,
  readinessPercent,
  type GovernanceConceptRow,
  type GovernanceWarningItem,
} from "./medication-master-governance.util";

const GOVERNANCE_CONCEPT_INCLUDE = {
  safetyProfile: { select: { isHighAlert: true, isControlled: true } },
  searchAliases: { select: { alias: true } },
  products: {
    where: { isActive: true },
    select: {
      id: true,
      code: true,
      governanceStatus: true,
      administrationType: true,
      administrationProfile: { select: { requiresInfusionSession: true } },
      infusionProfile: { select: { id: true } },
      searchAliases: { select: { alias: true } },
      packages: {
        where: { isActive: true },
        select: {
          id: true,
          code: true,
          ndc11: true,
          billingProfiles: { select: { requiresManualReview: true } },
        },
      },
    },
  },
} satisfies Prisma.MedicationConceptInclude;

type LoadedConcept = Prisma.MedicationConceptGetPayload<{
  include: typeof GOVERNANCE_CONCEPT_INCLUDE;
}>;

export type MedicationMasterGovernanceSummaryDto = {
  readOnly: true;
  facilityId: string | null;
  generatedAt: string;
  promotion: {
    activeConcepts: number;
    activeProducts: number;
    activePackages: number;
    stagingByOverallStatus: Record<string, number>;
    stagingByImportGateStatus: Record<string, number>;
    latestBatchId: string | null;
    promotedStagingRows: number;
    pendingStagingRows: number;
  };
  readiness: {
    conceptsReadyPercent: number;
    packagesWithNdcPercent: number;
    packagesOnFormularyPercent: number;
    legacyCatalogMappedPercent: number;
  };
  counts: {
    missingNdc: number;
    missingBillingProfile: number;
    missingSafetyProfile: number;
    missingInfusionProfile: number;
    duplicateNdcGroups: number;
    highAlertConcepts: number;
    controlledConcepts: number;
    edFormularyPackages: number;
    packagesMissingFormulary: number;
    infusionCapableProducts: number;
    legacyCatalogActive: number;
    legacyCatalogMapped: number;
    legacyCatalogUnmapped: number;
  };
  warningCountsByCode: Record<string, number>;
  warningCountsBySeverity: Record<string, number>;
  activation: {
    byStatus: Record<string, number>;
    activationApproved: number;
    blocked: number;
    retired: number;
    pendingReview: number;
    readyForActivation: number;
  };
  globalBaseline: {
    priorityErAvailable: number;
    facilityFormularyLinked: number;
  };
};

export type MedicationMasterGovernanceWarningRowDto = GovernanceWarningItem;

export type MedicationMasterGovernanceUnmappedRowDto = {
  catalogMedicationId: string;
  catalogCode: string;
  name: string;
  genericName: string | null;
  strength: string | null;
  dosageForm: string | null;
  route: string | null;
  ndc11: string | null;
  /** Confident unmapped only — no legacyCatalogMedicationId link exists. */
  matchConfidence: "UNMAPPED";
};

export type MedicationMasterGovernanceDuplicateGroupDto = {
  kind: "ndc11" | "genericName" | "strengthDisplay" | "stagingCode";
  matchKey: string;
  severity: "critical" | "warning" | "info";
  entries: Array<{
    conceptId?: string;
    productId?: string;
    packageId?: string;
    catalogMedicationId?: string;
    stagingRowId?: string;
    code: string;
    label: string;
  }>;
};

@Injectable()
export class MedicationMasterGovernanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly explorer: MedicationMasterExplorerService
  ) {}

  assertFacilityScope(requestedFacilityId: string, callerFacilityId: string | undefined): void {
    this.explorer.assertFacilityScope(requestedFacilityId, callerFacilityId);
  }

  async getSummary(facilityId?: string): Promise<MedicationMasterGovernanceSummaryDto> {
    const [aggregate, legacy, duplicateNdcGroups, staging, activation, globalBaseline] =
      await Promise.all([
      this.loadAggregate(facilityId),
      this.legacyMappingCounts(),
      this.countDuplicateNdcGroups(),
      this.stagingPromotionOverview(facilityId),
      this.activationStatusCounts(),
      this.globalBaselineCounts(facilityId),
    ]);

    const conceptsReady = aggregate.activeConcepts - aggregate.conceptsWithCriticalWarnings;
    const packagesWithNdc = aggregate.activePackages - aggregate.missingNdc;

    return {
      readOnly: true,
      facilityId: facilityId ?? null,
      generatedAt: new Date().toISOString(),
      promotion: {
        activeConcepts: aggregate.activeConcepts,
        activeProducts: aggregate.activeProducts,
        activePackages: aggregate.activePackages,
        ...staging,
      },
      readiness: {
        conceptsReadyPercent: readinessPercent(conceptsReady, aggregate.activeConcepts),
        packagesWithNdcPercent: readinessPercent(packagesWithNdc, aggregate.activePackages),
        packagesOnFormularyPercent: readinessPercent(
          aggregate.packagesOnFormulary,
          aggregate.activePackages
        ),
        legacyCatalogMappedPercent: readinessPercent(legacy.mapped, legacy.active),
      },
      counts: {
        missingNdc: aggregate.missingNdc,
        missingBillingProfile: aggregate.missingBillingProfile,
        missingSafetyProfile: aggregate.missingSafetyProfile,
        missingInfusionProfile: aggregate.missingInfusionProfile,
        duplicateNdcGroups,
        highAlertConcepts: aggregate.highAlertConcepts,
        controlledConcepts: aggregate.controlledConcepts,
        edFormularyPackages: aggregate.edFormularyPackages,
        packagesMissingFormulary: aggregate.packagesMissingFormulary,
        infusionCapableProducts: aggregate.infusionCapableProducts,
        legacyCatalogActive: legacy.active,
        legacyCatalogMapped: legacy.mapped,
        legacyCatalogUnmapped: legacy.unmapped,
      },
      warningCountsByCode: aggregate.warningCountsByCode,
      warningCountsBySeverity: aggregate.warningCountsBySeverity,
      activation,
      globalBaseline,
    };
  }

  private static readonly GLOBAL_BASELINE_COUNT_FALLBACK: MedicationMasterGovernanceSummaryDto["globalBaseline"] =
    {
      priorityErAvailable: 0,
      facilityFormularyLinked: 0,
    };

  /**
   * Phase 19H baseline metrics — uses columns added in 20260810120000_medication_global_baseline_phase_19h.
   * On unmigrated production DBs (Prisma P2022), returns zero counts so the dashboard summary still loads.
   */
  private async globalBaselineCounts(
    facilityId?: string
  ): Promise<MedicationMasterGovernanceSummaryDto["globalBaseline"]> {
    try {
      const priorityErAvailable = await this.prisma.medicationProduct.count({
        where: {
          baselineAvailable: true,
          baselineSource: MEDICATION_BASELINE_SOURCE_PRIORITY_ER,
        },
      });

      let facilityFormularyLinked = 0;
      if (facilityId) {
        facilityFormularyLinked = await this.prisma.medicationProduct.count({
          where: {
            baselineAvailable: true,
            baselineSource: MEDICATION_BASELINE_SOURCE_PRIORITY_ER,
            packages: {
              some: { facilityFormularyItems: { some: { facilityId } } },
            },
          },
        });
      }

      return { priorityErAvailable, facilityFormularyLinked };
    } catch (e) {
      if (this.shouldUseGlobalBaselineFallback(e)) {
        logError("medication_governance_summary_baseline_fallback", {
          facilityId: facilityId ?? null,
          endpoint: "governance/summary",
          action: "global_baseline_counts",
          prismaCode:
            e instanceof Prisma.PrismaClientKnownRequestError ? e.code : undefined,
          fallbackApplied: true,
          errorName: e instanceof Error ? e.name : "unknown",
        });
        return MedicationMasterGovernanceService.GLOBAL_BASELINE_COUNT_FALLBACK;
      }
      throw e;
    }
  }

  private shouldUseGlobalBaselineFallback(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
    return error.code === "P2022" || error.code === "P2021";
  }

  private async activationStatusCounts(): Promise<MedicationMasterGovernanceSummaryDto["activation"]> {
    const groups = await this.prisma.medicationProduct.groupBy({
      by: ["governanceStatus"],
      where: { isActive: true },
      _count: { _all: true },
    });

    const byStatus: Record<string, number> = {};
    let activationApproved = 0;
    let blocked = 0;
    let retired = 0;
    let pendingReview = 0;
    let readyForActivation = 0;

    for (const g of groups) {
      byStatus[g.governanceStatus] = g._count._all;
      if (g.governanceStatus === "ACTIVATION_APPROVED") activationApproved = g._count._all;
      if (g.governanceStatus === "BLOCKED") blocked = g._count._all;
      if (g.governanceStatus === "RETIRED") retired = g._count._all;
      if (g.governanceStatus === "READY_FOR_ACTIVATION") readyForActivation = g._count._all;
      if (PENDING_REVIEW_GOVERNANCE_STATUSES.includes(g.governanceStatus as never)) {
        pendingReview += g._count._all;
      }
    }

    // Phase 19J.3E — promoted Priority ER baseline rows are inactive (isActive=false) but still await governance.
    try {
      const inactiveBaselinePending = await this.prisma.medicationProduct.count({
        where: {
          isActive: false,
          baselineAvailable: true,
          baselineSource: MEDICATION_BASELINE_SOURCE_PRIORITY_ER,
          governanceStatus: { in: PENDING_REVIEW_GOVERNANCE_STATUSES },
        },
      });
      pendingReview += inactiveBaselinePending;
    } catch (e) {
      if (!this.shouldUseGlobalBaselineFallback(e)) throw e;
    }

    return {
      byStatus,
      activationApproved,
      blocked,
      retired,
      pendingReview,
      readyForActivation,
    };
  }

  async getWarnings(
    query: MedicationMasterGovernanceWarningsQuery
  ): Promise<{ items: MedicationMasterGovernanceWarningRowDto[]; total: number }> {
    const aggregate = await this.loadAggregate(query.facilityId);
    let items = aggregate.warningItems;

    if (query.code) {
      items = items.filter((w) => w.code === query.code);
    }
    if (query.severity) {
      items = items.filter((w) => w.severity === query.severity);
    }

    const total = items.length;
    const slice = items.slice(query.offset ?? 0, (query.offset ?? 0) + (query.limit ?? 100));
    return { items: slice, total };
  }

  async getUnmapped(
    query: MedicationMasterGovernanceUnmappedQuery
  ): Promise<{ items: MedicationMasterGovernanceUnmappedRowDto[]; total: number }> {
    const mappedRows = await this.prisma.medicationProduct.findMany({
      where: { legacyCatalogMedicationId: { not: null }, isActive: true },
      select: { legacyCatalogMedicationId: true },
    });
    const mappedIds = [
      ...new Set(
        mappedRows
          .map((r) => r.legacyCatalogMedicationId)
          .filter((id): id is string => typeof id === "string")
      ),
    ];

    const where: Prisma.CatalogMedicationWhereInput = {
      isActive: true,
      id: mappedIds.length > 0 ? { notIn: mappedIds } : undefined,
    };

    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { code: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { genericName: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.catalogMedication.count({ where }),
      this.prisma.catalogMedication.findMany({
        where,
        select: {
          id: true,
          code: true,
          name: true,
          genericName: true,
          strength: true,
          dosageForm: true,
          route: true,
          ndc11: true,
        },
        orderBy: { code: "asc" },
        skip: query.offset ?? 0,
        take: query.limit ?? 100,
      }),
    ]);

    return {
      total,
      items: rows.map((r) => ({
        catalogMedicationId: r.id,
        catalogCode: r.code,
        name: r.name,
        genericName: r.genericName,
        strength: r.strength,
        dosageForm: r.dosageForm,
        route: r.route,
        ndc11: r.ndc11,
        matchConfidence: "UNMAPPED" as const,
      })),
    };
  }

  async getDuplicates(
    query: MedicationMasterGovernanceDuplicatesQuery
  ): Promise<{ items: MedicationMasterGovernanceDuplicateGroupDto[]; total: number }> {
    const groups: MedicationMasterGovernanceDuplicateGroupDto[] = [];

    if (!query.kind || query.kind === "ndc11") {
      groups.push(...(await this.ndcDuplicateGroups()));
    }
    if (!query.kind || query.kind === "genericName") {
      groups.push(...(await this.genericNameDuplicateGroups()));
    }
    if (!query.kind || query.kind === "strengthDisplay") {
      groups.push(...(await this.strengthDisplayDuplicateGroups()));
    }
    if (!query.kind || query.kind === "stagingCode") {
      groups.push(...(await this.stagingCodeDuplicateGroups(query.facilityId)));
    }

    const total = groups.length;
    const items = groups.slice(query.offset ?? 0, (query.offset ?? 0) + (query.limit ?? 50));
    return { items, total };
  }

  private async loadAggregate(facilityId?: string) {
    const concepts = await this.loadConcepts(facilityId);
    return aggregateGovernanceFromConcepts(concepts, facilityId);
  }

  private async loadConcepts(facilityId?: string): Promise<GovernanceConceptRow[]> {
    const rows = await this.prisma.medicationConcept.findMany({
      where: { isActive: true },
      include: GOVERNANCE_CONCEPT_INCLUDE,
      orderBy: { displayName: "asc" },
    });

    if (!facilityId) {
      return rows.map((c) => this.toGovernanceRow(c, new Map()));
    }

    const packageIds = rows.flatMap((c) =>
      c.products.flatMap((p) => p.packages.map((pkg) => pkg.id))
    );
    const formularyByPackage = await this.loadFormularyByPackage(facilityId, packageIds);
    return rows.map((c) => this.toGovernanceRow(c, formularyByPackage));
  }

  private async loadFormularyByPackage(
    facilityId: string,
    packageIds: string[]
  ): Promise<Map<string, { isOnFormulary: boolean; isEDFormulary: boolean }>> {
    if (packageIds.length === 0) return new Map();

    const items = await this.prisma.facilityFormularyItem.findMany({
      where: { facilityId, packageId: { in: packageIds } },
      select: { packageId: true, isOnFormulary: true, isEDFormulary: true },
    });

    return new Map(
      items.map((i) => [
        i.packageId,
        { isOnFormulary: i.isOnFormulary, isEDFormulary: i.isEDFormulary },
      ])
    );
  }

  private toGovernanceRow(
    concept: LoadedConcept,
    formularyByPackage: Map<string, { isOnFormulary: boolean; isEDFormulary: boolean }>
  ): GovernanceConceptRow {
    return {
      id: concept.id,
      code: concept.code,
      genericName: concept.genericName,
      displayName: concept.displayName,
      safetyProfile: concept.safetyProfile,
      conceptAliases: concept.searchAliases.map((a) => ({ alias: a.alias })),
      products: concept.products.map((product) => ({
        id: product.id,
        code: product.code,
        governanceStatus: product.governanceStatus,
        administrationType: product.administrationType,
        administrationProfile: product.administrationProfile,
        infusionProfile: product.infusionProfile,
        productAliases: product.searchAliases.map((a) => ({ alias: a.alias })),
        packages: product.packages.map((pkg) => ({
          id: pkg.id,
          code: pkg.code,
          ndc11: pkg.ndc11,
          billingProfiles: pkg.billingProfiles,
          facilityFormulary: formularyByPackage.get(pkg.id) ?? null,
        })),
      })),
    };
  }

  private async legacyMappingCounts(): Promise<{ active: number; mapped: number; unmapped: number }> {
    const active = await this.prisma.catalogMedication.count({ where: { isActive: true } });
    const mappedRows = await this.prisma.medicationProduct.findMany({
      where: { legacyCatalogMedicationId: { not: null }, isActive: true },
      select: { legacyCatalogMedicationId: true },
      distinct: ["legacyCatalogMedicationId"],
    });
    const mapped = mappedRows.length;
    return { active, mapped, unmapped: Math.max(0, active - mapped) };
  }

  private async countDuplicateNdcGroups(): Promise<number> {
    const dupes = await this.prisma.medicationPackage.groupBy({
      by: ["ndc11"],
      where: { isActive: true, ndc11: { not: null } },
      _count: { id: true },
      having: { id: { _count: { gt: 1 } } },
    });
    return dupes.length;
  }

  private async stagingPromotionOverview(facilityId?: string): Promise<{
    stagingByOverallStatus: Record<string, number>;
    stagingByImportGateStatus: Record<string, number>;
    latestBatchId: string | null;
    promotedStagingRows: number;
    pendingStagingRows: number;
  }> {
    const where: Prisma.MedicationFormularyImportStagingWhereInput = facilityId
      ? { facilityId }
      : {};

    const [overallGroups, gateGroups, latest, promoted, pending] = await Promise.all([
      this.prisma.medicationFormularyImportStaging.groupBy({
        by: ["overallStatus"],
        where,
        _count: { _all: true },
      }),
      this.prisma.medicationFormularyImportStaging.groupBy({
        by: ["importGateStatus"],
        where,
        _count: { _all: true },
      }),
      this.prisma.medicationFormularyImportStaging.findFirst({
        where,
        orderBy: { createdAt: "desc" },
        select: { batchId: true },
      }),
      this.prisma.medicationFormularyImportStaging.count({
        where: { ...where, promotionResultJson: { not: Prisma.DbNull } },
      }),
      this.prisma.medicationFormularyImportStaging.count({
        where: { ...where, promotionResultJson: { equals: Prisma.DbNull } },
      }),
    ]);

    const stagingByOverallStatus: Record<string, number> = {};
    for (const g of overallGroups) {
      stagingByOverallStatus[g.overallStatus] = g._count._all;
    }

    const stagingByImportGateStatus: Record<string, number> = {};
    for (const g of gateGroups) {
      stagingByImportGateStatus[g.importGateStatus] = g._count._all;
    }

    return {
      stagingByOverallStatus,
      stagingByImportGateStatus,
      latestBatchId: latest?.batchId ?? null,
      promotedStagingRows: promoted,
      pendingStagingRows: pending,
    };
  }

  private async ndcDuplicateGroups(): Promise<MedicationMasterGovernanceDuplicateGroupDto[]> {
    const dupes = await this.prisma.medicationPackage.groupBy({
      by: ["ndc11"],
      where: { isActive: true, ndc11: { not: null } },
      _count: { id: true },
      having: { id: { _count: { gt: 1 } } },
    });

    const groups: MedicationMasterGovernanceDuplicateGroupDto[] = [];
    for (const d of dupes) {
      if (!d.ndc11) continue;
      const packages = await this.prisma.medicationPackage.findMany({
        where: { ndc11: d.ndc11, isActive: true },
        select: {
          id: true,
          code: true,
          packageDescription: true,
          product: {
            select: {
              id: true,
              code: true,
              conceptId: true,
              concept: { select: { code: true, displayName: true } },
            },
          },
        },
      });
      groups.push({
        kind: "ndc11",
        matchKey: d.ndc11,
        severity: "critical",
        entries: packages.map((pkg) => ({
          conceptId: pkg.product.conceptId,
          productId: pkg.product.id,
          packageId: pkg.id,
          code: pkg.code,
          label: `${pkg.product.concept.displayName} · ${pkg.packageDescription}`,
        })),
      });
    }
    return groups;
  }

  private async genericNameDuplicateGroups(): Promise<MedicationMasterGovernanceDuplicateGroupDto[]> {
    const concepts = await this.prisma.medicationConcept.findMany({
      where: { isActive: true },
      select: { id: true, code: true, genericName: true, displayName: true },
    });

    const byGeneric = new Map<string, typeof concepts>();
    for (const c of concepts) {
      const key = c.genericName.trim().toLowerCase();
      if (!key) continue;
      const list = byGeneric.get(key) ?? [];
      list.push(c);
      byGeneric.set(key, list);
    }

    const groups: MedicationMasterGovernanceDuplicateGroupDto[] = [];
    for (const [key, list] of byGeneric) {
      if (list.length < 2) continue;
      groups.push({
        kind: "genericName",
        matchKey: key,
        severity: "warning",
        entries: list.map((c) => ({
          conceptId: c.id,
          code: c.code,
          label: c.displayName,
        })),
      });
    }
    return groups.sort((a, b) => a.matchKey.localeCompare(b.matchKey));
  }

  private async strengthDisplayDuplicateGroups(): Promise<MedicationMasterGovernanceDuplicateGroupDto[]> {
    const products = await this.prisma.medicationProduct.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        strengthDisplay: true,
        conceptId: true,
        concept: { select: { code: true, displayName: true, genericName: true } },
      },
    });

    const byStrength = new Map<string, typeof products>();
    for (const p of products) {
      const key = p.strengthDisplay.trim().toLowerCase();
      if (!key) continue;
      const list = byStrength.get(key) ?? [];
      list.push(p);
      byStrength.set(key, list);
    }

    const groups: MedicationMasterGovernanceDuplicateGroupDto[] = [];
    for (const [key, list] of byStrength) {
      if (list.length < 2) continue;
      const conceptIds = new Set(list.map((p) => p.conceptId));
      if (conceptIds.size < 2) continue;
      groups.push({
        kind: "strengthDisplay",
        matchKey: key,
        severity: "info",
        entries: list.map((p) => ({
          conceptId: p.conceptId,
          productId: p.id,
          code: p.code,
          label: `${p.concept.genericName} · ${p.strengthDisplay}`,
        })),
      });
    }
    return groups.sort((a, b) => a.matchKey.localeCompare(b.matchKey));
  }

  private async stagingCodeDuplicateGroups(
    facilityId?: string
  ): Promise<MedicationMasterGovernanceDuplicateGroupDto[]> {
    const rows = await this.prisma.medicationFormularyImportStaging.findMany({
      where: facilityId ? { facilityId } : undefined,
      select: {
        id: true,
        batchId: true,
        proposedConceptCode: true,
        proposedProductCode: true,
        proposedPackageCode: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    const groups: MedicationMasterGovernanceDuplicateGroupDto[] = [];
    const codeKinds: Array<{
      field: "proposedConceptCode" | "proposedProductCode" | "proposedPackageCode";
      label: string;
    }> = [
      { field: "proposedConceptCode", label: "concept" },
      { field: "proposedProductCode", label: "product" },
      { field: "proposedPackageCode", label: "package" },
    ];

    for (const { field } of codeKinds) {
      const byCode = new Map<string, typeof rows>();
      for (const row of rows) {
        const code = row[field]?.trim();
        if (!code) continue;
        const list = byCode.get(code) ?? [];
        list.push(row);
        byCode.set(code, list);
      }
      for (const [code, list] of byCode) {
        if (list.length < 2) continue;
        groups.push({
          kind: "stagingCode",
          matchKey: `${field}:${code}`,
          severity: "warning",
          entries: list.map((r) => ({
            stagingRowId: r.id,
            code,
            label: `Batch ${r.batchId}`,
          })),
        });
      }
    }

    return groups;
  }
}
