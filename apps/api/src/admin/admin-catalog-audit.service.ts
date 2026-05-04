import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import {
  catalogAuditConflictFlagCount,
  computeCatalogClassificationAuditFlags,
  isMedicationInfusionCandidate,
  type CatalogClassificationAuditFlag,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import type { PatchCatalogClassificationBody } from "./dto/admin-catalog-audit-classification.dto";

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

const CATALOG_AUDIT_SELECT = {
  id: true,
  code: true,
  name: true,
  displayNameEn: true,
  displayNameFr: true,
  genericName: true,
  route: true,
  administrationType: true,
  billingClass: true,
} as const;

type CatalogMedAuditRow = Prisma.CatalogMedicationGetPayload<{ select: typeof CATALOG_AUDIT_SELECT }>;

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

function normalizeDbEnumString(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t.length ? t : null;
}

@Injectable()
export class AdminCatalogAuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  private async loadUsageByCatalogForFacility(facilityId: string): Promise<Map<string, number>> {
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
    return usageByCatalogId;
  }

  private computeUnknownHighUsageThreshold(meds: CatalogMedAuditRow[], usageByCatalogId: Map<string, number>): number {
    const unknownUsagesForThreshold: number[] = [];
    for (const m of meds) {
      const u = usageByCatalogId.get(m.id) ?? 0;
      if (isUnknownBillingClass(m.billingClass)) unknownUsagesForThreshold.push(u);
    }
    return percentile80InclusiveThreshold(unknownUsagesForThreshold);
  }

  private toAuditRow(
    m: CatalogMedAuditRow,
    usageByCatalogId: Map<string, number>,
    unknownHighUsageThreshold: number
  ): AdminCatalogAuditRow {
    const labelLower = buildLabelLowerHaystack(m);
    const usageCount = usageByCatalogId.get(m.id) ?? 0;
    const flags = computeCatalogClassificationAuditFlags({
      route: m.route,
      administrationType: m.administrationType,
      billingClass: m.billingClass,
      labelLower,
      usageCount,
      unknownHighUsageThreshold,
    });
    return {
      catalogMedicationId: m.id,
      label: buildCatalogLabelForDisplay(m),
      route: m.route,
      administrationType: m.administrationType,
      billingClass: m.billingClass,
      flags,
      usageCount,
    };
  }

  async getDashboard(facilityId: string): Promise<AdminCatalogAuditPayload> {
    const meds = await this.prisma.catalogMedication.findMany({
      where: { isActive: true },
      select: CATALOG_AUDIT_SELECT,
      orderBy: { code: "asc" },
    });

    const usageByCatalogId = await this.loadUsageByCatalogForFacility(facilityId);
    const unknownHighUsageThreshold = this.computeUnknownHighUsageThreshold(meds, usageByCatalogId);

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

      const row = this.toAuditRow(m, usageByCatalogId, unknownHighUsageThreshold);
      if (catalogAuditConflictFlagCount(row.flags as CatalogClassificationAuditFlag[]) > 0) highRiskConflicts++;
      rows.push(row);
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

  /**
   * Phase 6C — one medication at a time; updates only classification fields; audit trail via AuditLog.
   */
  async patchClassification(
    facilityId: string,
    catalogMedicationId: string,
    body: PatchCatalogClassificationBody,
    userId: string,
    ip?: string,
    userAgent?: string
  ): Promise<AdminCatalogAuditRow> {
    const reviewNote = body.reviewNote;
    const notePresent = Boolean(reviewNote);
    const reviewNotePreview =
      reviewNote && reviewNote.length > 0 ? reviewNote.slice(0, 120) : undefined;

    let oldAdministrationType: string | null = null;
    let oldBillingClass: string | null = null;
    let newAdministrationType: string | null = null;
    let newBillingClass: string | null = null;

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.catalogMedication.findFirst({
        where: { id: catalogMedicationId, isActive: true },
        select: CATALOG_AUDIT_SELECT,
      });
      if (!existing) {
        throw new NotFoundException("Médicament catalogue introuvable ou inactif.");
      }

      oldAdministrationType = normalizeDbEnumString(existing.administrationType);
      oldBillingClass = normalizeDbEnumString(existing.billingClass);

      const data: Prisma.CatalogMedicationUpdateInput = {};
      if (body.administrationType !== undefined) {
        data.administrationType = body.administrationType;
      }
      if (body.billingClass !== undefined) {
        data.billingClass = body.billingClass;
      }

      await tx.catalogMedication.update({
        where: { id: catalogMedicationId },
        data,
      });

      const updated = await tx.catalogMedication.findFirstOrThrow({
        where: { id: catalogMedicationId },
        select: CATALOG_AUDIT_SELECT,
      });
      newAdministrationType = normalizeDbEnumString(updated.administrationType);
      newBillingClass = normalizeDbEnumString(updated.billingClass);

      await this.audit.log(AuditAction.UPDATE, "CATALOG_MEDICATION_CLASSIFICATION", {
        tx,
        userId,
        facilityId,
        entityId: catalogMedicationId,
        ip,
        userAgent,
        metadata: {
          catalogMedicationId,
          oldAdministrationType,
          newAdministrationType,
          oldBillingClass,
          newBillingClass,
          reviewNotePresent: notePresent,
          ...(reviewNotePreview ? { reviewNotePreview } : {}),
          source: "ADMIN_CATALOG_AUDIT",
        },
      });
    });

    const meds = await this.prisma.catalogMedication.findMany({
      where: { isActive: true },
      select: CATALOG_AUDIT_SELECT,
      orderBy: { code: "asc" },
    });
    const usageByCatalogId = await this.loadUsageByCatalogForFacility(facilityId);
    const unknownHighUsageThreshold = this.computeUnknownHighUsageThreshold(meds, usageByCatalogId);
    const updatedMed = meds.find((m) => m.id === catalogMedicationId);
    if (!updatedMed) {
      throw new NotFoundException("Médicament catalogue introuvable après mise à jour.");
    }
    return this.toAuditRow(updatedMed, usageByCatalogId, unknownHighUsageThreshold);
  }
}
