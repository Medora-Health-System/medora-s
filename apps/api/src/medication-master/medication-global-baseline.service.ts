/**
 * Phase 19H — Global baseline medication master (Priority ER inventory).
 * Canonical products are facility-independent; formulary/runtime activation stays per-facility.
 */

import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MEDICATION_BASELINE_SOURCE_PRIORITY_ER } from "./medication-baseline.constants";
import { PriorityErInventoryPromotionService } from "./priority-er-inventory-promotion.service";
import type { PromotePriorityErStagingRowBody } from "./dto/priority-er-promote-staging.dto";
import { parsePriorityErSourceTrace } from "./priority-er-inventory-staging-source.util";
import { parseProductRuntimeActivation } from "./medication-product-runtime-activation.util";

export type GlobalBaselineProductRowDto = {
  productId: string;
  conceptId: string;
  productCode: string;
  governanceStatus: string;
  baselineSource: string;
  baselineSourceRowId: string | null;
  exactSourceText: string | null;
  exactSourceMedication: string | null;
  exactSourceDose: string | null;
  exactSourceFormRoute: string | null;
  medicationDisplayName: string | null;
  productIsActive: boolean;
  runtimeOrderSearchEnabled: boolean;
  runtimeMarEnabled: boolean;
  runtimeBillingEnabled: boolean;
};

export type GlobalBaselineListQuery = {
  q?: string;
  limit?: number;
  offset?: number;
};

@Injectable()
export class MedicationGlobalBaselineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promotion: PriorityErInventoryPromotionService
  ) {}

  async promotePriorityErStagingToGlobalBaseline(
    stagingRowId: string,
    body: PromotePriorityErStagingRowBody,
    userId: string,
    auditMeta?: { ip?: string; userAgent?: string }
  ) {
    return this.promotion.promoteStagingRowAsGlobalBaseline(
      stagingRowId,
      body,
      userId,
      auditMeta
    );
  }

  async listGlobalBaselineProducts(
    query: GlobalBaselineListQuery
  ): Promise<{ items: GlobalBaselineProductRowDto[]; total: number }> {
    const limit = Math.min(query.limit ?? 100, 200);
    const offset = query.offset ?? 0;
    const q = query.q?.trim().toLowerCase();

    const products = await this.prisma.medicationProduct.findMany({
      where: {
        baselineAvailable: true,
        baselineSource: MEDICATION_BASELINE_SOURCE_PRIORITY_ER,
        ...(q
          ? {
              OR: [
                { code: { contains: q, mode: "insensitive" } },
                { strengthDisplay: { contains: q, mode: "insensitive" } },
                { dosageForm: { contains: q, mode: "insensitive" } },
                { concept: { genericName: { contains: q, mode: "insensitive" } } },
                { searchAliases: { some: { alias: { contains: q, mode: "insensitive" } } } },
              ],
            }
          : {}),
      },
      include: {
        concept: { select: { id: true, genericName: true, displayName: true } },
        searchAliases: { where: { aliasType: "INVENTORY_SOURCE" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
      take: limit + offset,
    });

    const stagingByRowId = await this.loadStagingTraceBySourceRowIds(
      products.map((p) => p.baselineSourceRowId).filter((id): id is string => Boolean(id))
    );

    let items: GlobalBaselineProductRowDto[] = products.map((p) => {
      const trace = p.baselineSourceRowId
        ? stagingByRowId.get(p.baselineSourceRowId)
        : null;
      const sourceName = trace?.sourceNameExact ?? p.concept.genericName;
      const sourceDose = trace?.sourceStrengthExact ?? p.strengthDisplay;
      const sourceForm = trace?.sourceRouteExact ?? p.dosageForm;
      const runtime = parseProductRuntimeActivation(p.governanceNotes);
      return {
        productId: p.id,
        conceptId: p.conceptId,
        productCode: p.code,
        governanceStatus: p.governanceStatus,
        baselineSource: p.baselineSource ?? MEDICATION_BASELINE_SOURCE_PRIORITY_ER,
        baselineSourceRowId: p.baselineSourceRowId,
        exactSourceText:
          trace?.exactSourceText ??
          [sourceName, sourceDose, sourceForm].filter(Boolean).join(" ") ??
          null,
        exactSourceMedication: sourceName,
        exactSourceDose: sourceDose,
        exactSourceFormRoute: sourceForm,
        medicationDisplayName: sourceName ?? p.concept.displayName,
        productIsActive: p.isActive,
        runtimeOrderSearchEnabled: runtime.orderSearchEnabled,
        runtimeMarEnabled: runtime.marEnabled,
        runtimeBillingEnabled: runtime.billingEnabled,
      };
    });

    const total = items.length;
    items = items.slice(offset, offset + limit);
    return { items, total };
  }

  async countGlobalBaselineProducts(): Promise<number> {
    return this.prisma.medicationProduct.count({
      where: {
        baselineAvailable: true,
        baselineSource: MEDICATION_BASELINE_SOURCE_PRIORITY_ER,
      },
    });
  }

  async countFacilityBaselineWithFormulary(facilityId: string): Promise<number> {
    return this.prisma.medicationProduct.count({
      where: {
        baselineAvailable: true,
        baselineSource: MEDICATION_BASELINE_SOURCE_PRIORITY_ER,
        packages: {
          some: { facilityFormularyItems: { some: { facilityId } } },
        },
      },
    });
  }

  private async loadStagingTraceBySourceRowIds(sourceRowIds: string[]) {
    const map = new Map<string, ReturnType<typeof parsePriorityErSourceTrace>>();
    if (sourceRowIds.length === 0) return map;

    const rows = await this.prisma.medicationFormularyImportStaging.findMany({
      where: { sourceRowId: { in: sourceRowIds } },
      select: { sourceRowId: true, rawJson: true },
      take: 500,
    });

    for (const row of rows) {
      if (!map.has(row.sourceRowId)) {
        map.set(row.sourceRowId, parsePriorityErSourceTrace(row.rawJson));
      }
    }
    return map;
  }
}
