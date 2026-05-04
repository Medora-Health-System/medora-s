import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  catalogAuditConflictFlagCount,
  computeCatalogClassificationAuditFlags,
  isMedicationInfusionCandidate,
  type CatalogClassificationAuditFlag,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";

export type AdminCatalogAuditSummary = {
  totalMedications: number;
  withAdministrationType: number;
  withBillingClass: number;
  unknownBillingClass: number;
  infusionCandidates: number;
  highRiskConflicts: number;
};

export type AdminCatalogAuditRow = {
  catalogMedicationId: string;
  label: string;
  route?: string | null;
  administrationType?: string | null;
  billingClass?: string | null;
  flags: string[];
  usageCount?: number;
};

export type AdminCatalogAuditPayload = {
  summary: AdminCatalogAuditSummary;
  rows: AdminCatalogAuditRow[];
};

function isUnknownBillingClass(billingClass: string | null | undefined): boolean {
  const t = billingClass?.trim();
  if (!t) return true;
  return t.toUpperCase() === "UNKNOWN";
}

function percentile80InclusiveThreshold(usages: number[]): number {
  const sorted = usages.filter((u) => u > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const idx = Math.floor(0.8 * (sorted.length - 1));
  return sorted[idx] ?? sorted[sorted.length - 1]!;
}

function buildCatalogLabelForDisplay(row: {
  displayNameFr: string | null;
  name: string;
  code: string;
}): string {
  return (row.displayNameFr?.trim() || row.name?.trim() || row.code || "").trim() || row.code;
}

function buildLabelLowerHaystack(row: {
  displayNameFr: string | null;
  displayNameEn: string | null;
  name: string;
  code: string;
  genericName: string | null;
}): string {
  return [row.displayNameFr, row.displayNameEn, row.name, row.code, row.genericName]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

@Injectable()
export class AdminCatalogAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(facilityId: string): Promise<AdminCatalogAuditPayload> {
    const meds = await this.prisma.catalogMedication.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        displayNameEn: true,
        displayNameFr: true,
        genericName: true,
        route: true,
        administrationType: true,
        billingClass: true,
      },
      orderBy: { code: "asc" },
    });

    const orderUsageRows = await this.prisma.$queryRaw<Array<{ cid: string; c: number | bigint }>>(
      Prisma.sql`
        SELECT oi."catalogItemId" AS cid, COUNT(*)::int AS c
        FROM "OrderItem" oi
        INNER JOIN "Order" o ON oi."orderId" = o.id
        WHERE o."facilityId" = ${facilityId}
          AND oi."catalogItemType" = 'MEDICATION'
          AND oi."catalogItemId" IS NOT NULL
        GROUP BY oi."catalogItemId"
      `
    );

    const marUsageRows = await this.prisma.$queryRaw<Array<{ cid: string; c: number | bigint }>>(
      Prisma.sql`
        SELECT oi."catalogItemId" AS cid, COUNT(ma.id)::int AS c
        FROM "MedicationAdministration" ma
        INNER JOIN "OrderItem" oi ON ma."orderItemId" = oi.id
        INNER JOIN "Order" o ON oi."orderId" = o.id
        WHERE ma."facilityId" = ${facilityId}
          AND oi."catalogItemType" = 'MEDICATION'
          AND oi."catalogItemId" IS NOT NULL
        GROUP BY oi."catalogItemId"
      `
    );

    const usageByCatalogId = new Map<string, number>();
    for (const r of orderUsageRows) {
      const n = typeof r.c === "bigint" ? Number(r.c) : r.c;
      usageByCatalogId.set(r.cid, (usageByCatalogId.get(r.cid) ?? 0) + n);
    }
    for (const r of marUsageRows) {
      const n = typeof r.c === "bigint" ? Number(r.c) : r.c;
      usageByCatalogId.set(r.cid, (usageByCatalogId.get(r.cid) ?? 0) + n);
    }

    const unknownUsagesForThreshold: number[] = [];
    for (const m of meds) {
      const u = usageByCatalogId.get(m.id) ?? 0;
      if (isUnknownBillingClass(m.billingClass)) unknownUsagesForThreshold.push(u);
    }
    const unknownHighUsageThreshold = percentile80InclusiveThreshold(unknownUsagesForThreshold);

    let withAdministrationType = 0;
    let withBillingClass = 0;
    let unknownBillingClass = 0;
    let infusionCandidates = 0;
    let highRiskConflicts = 0;

    const rows: AdminCatalogAuditRow[] = [];

    for (const m of meds) {
      if (m.administrationType?.trim()) withAdministrationType++;
      if (m.billingClass?.trim()) withBillingClass++;
      if (isUnknownBillingClass(m.billingClass)) unknownBillingClass++;

      const labelLower = buildLabelLowerHaystack(m);
      const usageCount = usageByCatalogId.get(m.id) ?? 0;

      if (
        isMedicationInfusionCandidate({
          route: m.route,
          medicationLabel: buildCatalogLabelForDisplay(m),
          code: m.code,
          genericName: m.genericName,
          catalogAdministrationType: m.administrationType,
        })
      ) {
        infusionCandidates++;
      }

      const flags = computeCatalogClassificationAuditFlags({
        route: m.route,
        administrationType: m.administrationType,
        billingClass: m.billingClass,
        labelLower,
        usageCount,
        unknownHighUsageThreshold,
      });

      if (catalogAuditConflictFlagCount(flags) > 0) highRiskConflicts++;

      rows.push({
        catalogMedicationId: m.id,
        label: buildCatalogLabelForDisplay(m),
        route: m.route,
        administrationType: m.administrationType,
        billingClass: m.billingClass,
        flags,
        usageCount,
      });
    }

    rows.sort((a, b) => {
      const ca = catalogAuditConflictFlagCount(a.flags as CatalogClassificationAuditFlag[]);
      const cb = catalogAuditConflictFlagCount(b.flags as CatalogClassificationAuditFlag[]);
      if (cb !== ca) return cb - ca;
      return (b.usageCount ?? 0) - (a.usageCount ?? 0);
    });

    const summary: AdminCatalogAuditSummary = {
      totalMedications: meds.length,
      withAdministrationType,
      withBillingClass,
      unknownBillingClass,
      infusionCandidates,
      highRiskConflicts,
    };

    return { summary, rows };
  }
}
