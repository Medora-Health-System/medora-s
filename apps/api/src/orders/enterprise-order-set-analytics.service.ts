import { BadRequestException, Injectable } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import {
  ENTERPRISE_ORDER_SET_ANALYTICS_MAX_LOOKBACK_DAYS,
  ENTERPRISE_ORDER_SET_ANALYTICS_SUMMARY_SCAN_CAP,
  aggregateEnterpriseOrderSetAnalytics,
  parseEnterpriseOrderSetAuditMetadata,
  type EnterpriseOrderSetAnalyticsFilters,
  type EnterpriseOrderSetAnalyticsResponse,
  type EnterpriseOrderSetAuditMetadataRow,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";

function parseTimeBoundary(raw: string | undefined, endOfDay: boolean): Date | undefined {
  if (!raw?.trim()) return undefined;
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    return endOfDay ? new Date(`${t}T23:59:59.999Z`) : new Date(`${t}T00:00:00.000Z`);
  }
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}\t${id}`, "utf8").toString("base64url");
}

function decodeCursor(raw: string): { createdAt: Date; id: string } {
  let decoded: string;
  try {
    decoded = Buffer.from(raw, "base64url").toString("utf8");
  } catch {
    throw new BadRequestException("Jeton de pagination invalide.");
  }
  const tab = decoded.indexOf("\t");
  if (tab < 0) throw new BadRequestException("Jeton de pagination invalide.");
  const iso = decoded.slice(0, tab);
  const id = decoded.slice(tab + 1);
  const createdAt = new Date(iso);
  if (Number.isNaN(createdAt.getTime()) || !id) throw new BadRequestException("Jeton de pagination invalide.");
  return { createdAt, id };
}

@Injectable()
export class EnterpriseOrderSetAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics(
    facilityId: string,
    filters: EnterpriseOrderSetAnalyticsFilters
  ): Promise<EnterpriseOrderSetAnalyticsResponse> {
    const now = new Date();
    const from =
      parseTimeBoundary(filters.from, false) ??
      new Date(now.getTime() - 7 * 86400_000);
    const to = parseTimeBoundary(filters.to, true) ?? now;
    if (from.getTime() > to.getTime()) {
      throw new BadRequestException("La plage de dates est invalide.");
    }
    const maxLookbackMs = ENTERPRISE_ORDER_SET_ANALYTICS_MAX_LOOKBACK_DAYS * 86400_000;
    if (to.getTime() - from.getTime() > maxLookbackMs) {
      throw new BadRequestException(
        `La plage de dates ne peut pas dépasser ${ENTERPRISE_ORDER_SET_ANALYTICS_MAX_LOOKBACK_DAYS} jours.`
      );
    }

    const take = filters.limit ?? 50;
    const cursorDecoded = filters.cursor ? decodeCursor(filters.cursor) : null;
    const where = this.buildWhere(facilityId, filters, from, to, cursorDecoded);

    const [summaryScanRows, pageRows] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: this.buildWhere(facilityId, filters, from, to, null),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: ENTERPRISE_ORDER_SET_ANALYTICS_SUMMARY_SCAN_CAP + 1,
        select: {
          id: true,
          createdAt: true,
          userId: true,
          encounterId: true,
          orderId: true,
          metadata: true,
        },
      }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: take + 1,
        select: {
          id: true,
          createdAt: true,
          userId: true,
          encounterId: true,
          orderId: true,
          metadata: true,
        },
      }),
    ]);

    const summaryIsPartial = summaryScanRows.length > ENTERPRISE_ORDER_SET_ANALYTICS_SUMMARY_SCAN_CAP;
    const summarySourceRows = summaryIsPartial
      ? summaryScanRows.slice(0, ENTERPRISE_ORDER_SET_ANALYTICS_SUMMARY_SCAN_CAP)
      : summaryScanRows;

    const enrichedSummaryRows = await this.enrichRows(facilityId, summarySourceRows);
    const parsedSummaryRows = enrichedSummaryRows.filter(
      (row): row is EnterpriseOrderSetAuditMetadataRow => row !== null
    );

    const hasNext = pageRows.length > take;
    const page = hasNext ? pageRows.slice(0, take) : pageRows;
    const enrichedPageRows = await this.enrichRows(facilityId, page);
    const rows = enrichedPageRows.filter(
      (row): row is EnterpriseOrderSetAuditMetadataRow => row !== null
    );

    const last = page[page.length - 1];
    const nextCursor = hasNext && last ? encodeCursor(last.createdAt, last.id) : null;

    return {
      summary: aggregateEnterpriseOrderSetAnalytics({
        rows: parsedSummaryRows,
        summaryScanCount: summarySourceRows.length,
        summaryIsPartial,
      }),
      rows,
      nextCursor,
      appliedFilters: { ...filters, from: from.toISOString(), to: to.toISOString() },
      generatedAt: now.toISOString(),
    };
  }

  private buildWhere(
    facilityId: string,
    filters: EnterpriseOrderSetAnalyticsFilters,
    from: Date,
    to: Date,
    cursor: { createdAt: Date; id: string } | null
  ): Prisma.AuditLogWhereInput {
    const metadataFilters: Prisma.AuditLogWhereInput[] = [
      {
        metadata: {
          path: ["enterpriseOrderSetCode"],
          not: Prisma.JsonNull,
        },
      },
    ];
    if (filters.orderSetCode) {
      metadataFilters.push({
        metadata: { path: ["enterpriseOrderSetCode"], equals: filters.orderSetCode },
      });
    }
    if (filters.category) {
      metadataFilters.push({
        metadata: { path: ["enterpriseOrderSetCategory"], equals: filters.category },
      });
    }
    if (filters.clinicalDomain) {
      metadataFilters.push({
        metadata: { path: ["enterpriseOrderSetClinicalDomain"], equals: filters.clinicalDomain },
      });
    }
    if (filters.orderSetAuthority) {
      metadataFilters.push({
        metadata: { path: ["enterpriseOrderSetAuthority"], equals: filters.orderSetAuthority },
      });
    }

    return {
      facilityId,
      action: AuditAction.ORDER_CREATE,
      createdAt: { gte: from, lte: to },
      ...(filters.providerId ? { userId: filters.providerId } : {}),
      ...(filters.encounterId ? { encounterId: filters.encounterId } : {}),
      AND: metadataFilters,
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              { AND: [{ createdAt: cursor.createdAt }, { id: { lt: cursor.id } }] },
            ],
          }
        : {}),
    };
  }

  private async enrichRows(
    facilityId: string,
    rows: Array<{
      id: string;
      createdAt: Date;
      userId: string | null;
      encounterId: string | null;
      orderId: string | null;
      metadata: unknown;
    }>
  ): Promise<Array<EnterpriseOrderSetAuditMetadataRow | null>> {
    const encounterIds = [...new Set(rows.map((r) => r.encounterId).filter((x): x is string => Boolean(x)))];
    const userIds = [...new Set(rows.map((r) => r.userId).filter((x): x is string => Boolean(x)))];

    const [encounters, userRoles] = await Promise.all([
      encounterIds.length
        ? this.prisma.encounter.findMany({
            where: { facilityId, id: { in: encounterIds } },
            select: { id: true, type: true },
          })
        : Promise.resolve([]),
      userIds.length
        ? this.prisma.userRole.findMany({
            where: { facilityId, userId: { in: userIds }, isActive: true },
            select: { userId: true, departmentId: true },
            orderBy: { role: { code: "asc" } },
          })
        : Promise.resolve([]),
    ]);

    const encounterTypeById = new Map(encounters.map((e) => [e.id, e.type]));
    const departmentByUserId = new Map<string, string | null>();
    for (const role of userRoles) {
      if (!departmentByUserId.has(role.userId)) {
        departmentByUserId.set(role.userId, role.departmentId);
      }
    }

    return rows.map((row) =>
      parseEnterpriseOrderSetAuditMetadata({
        auditLogId: row.id,
        createdAt: row.createdAt.toISOString(),
        metadata: row.metadata,
        encounterId: row.encounterId,
        orderId: row.orderId,
        userId: row.userId,
        encounterType: row.encounterId ? encounterTypeById.get(row.encounterId) ?? null : null,
        providerDepartmentId: row.userId ? departmentByUserId.get(row.userId) ?? null : null,
      })
    );
  }
}
