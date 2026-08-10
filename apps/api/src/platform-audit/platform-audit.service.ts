import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import { createHash } from "crypto";
import { resolvePlatformAuthority } from "../auth/platform-principal";
import { AuditService } from "../common/services/audit.service";
import { logSecurityAdminAudit } from "../common/services/security-admin-audit";
import { PrismaService } from "../prisma/prisma.service";
import type { PlatformAuditEventsQueryDto } from "./dto/platform-audit-events-query.dto";
import { projectEnterpriseAuditMetadata } from "./enterprise-audit-projection";

const ACCESS_EVENT = "ENTERPRISE_AUDIT_ACCESSED";
const DENIED_EVENT = "ENTERPRISE_AUDIT_ACCESS_DENIED";

type EffectiveQueryScope = {
  from: string;
  to: string;
  facilityId: string | null;
  actorUserId: string | null;
  action: AuditAction | null;
  entityType: string | null;
  entityId: string | null;
  outcome: "SUCCESS" | "DENIED" | null;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | null;
  limit: number;
};

function normalizeEffectiveScope(
  query: PlatformAuditEventsQueryDto,
  from: Date,
  to: Date,
): EffectiveQueryScope {
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    facilityId: query.facilityId ?? null,
    actorUserId: query.actorUserId ?? null,
    action: query.action ?? null,
    entityType: query.entityType ?? null,
    entityId: query.entityId ?? null,
    outcome: query.outcome ?? null,
    severity: query.severity ?? null,
    limit: query.limit,
  };
}

function queryFingerprint(scope: EffectiveQueryScope): string {
  return createHash("sha256").update(JSON.stringify(scope)).digest("base64url");
}

function encodeCursor(createdAt: Date, id: string, scope: EffectiveQueryScope): string {
  return Buffer.from(JSON.stringify([createdAt.toISOString(), id, scope, queryFingerprint(scope)])).toString("base64url");
}

function decodeCursor(raw: string): { createdAt: Date; id: string; scope: EffectiveQueryScope; fingerprint: string } {
  try {
    const decoded = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (!Array.isArray(decoded) || decoded.length !== 4 || !decoded[2] || typeof decoded[2] !== "object") throw new Error();
    const createdAt = new Date(decoded[0]);
    const scope = decoded[2] as EffectiveQueryScope;
    const fingerprint = decoded[3];
    if (
      Number.isNaN(createdAt.getTime()) || typeof decoded[1] !== "string" || !decoded[1]
      || typeof fingerprint !== "string" || queryFingerprint(scope) !== fingerprint
      || typeof scope.from !== "string" || Number.isNaN(new Date(scope.from).getTime())
      || typeof scope.to !== "string" || Number.isNaN(new Date(scope.to).getTime())
    ) throw new Error();
    return { createdAt, id: decoded[1], scope, fingerprint };
  } catch {
    throw new BadRequestException("Invalid or query-mismatched pagination cursor.");
  }
}

function displayName(user: { firstName: string; lastName: string } | null): string | null {
  if (!user) return null;
  return `${user.firstName} ${user.lastName}`.trim() || null;
}

@Injectable()
export class PlatformAuditService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async listEvents(actorUserId: string, query: PlatformAuditEventsQueryDto) {
    const authority = await resolvePlatformAuthority(this.prisma, actorUserId);
    if (!authority.granted) {
      await logSecurityAdminAudit(this.audit, AuditAction.VIEW, {
        event: DENIED_EVENT,
        actorUserId,
        entityType: "EnterpriseAuditReader",
        entityId: actorUserId,
        severity: "HIGH",
        outcome: "DENIED",
        sourceOperation: "GET /platform/audit/events",
        denialReason: authority.reason,
        evidence: { accessScope: "ENTERPRISE_GLOBAL" },
      });
      throw new ForbiddenException("Enterprise audit authority required.");
    }

    const decodedCursor = query.cursor ? decodeCursor(query.cursor) : null;
    const now = new Date();
    const from = query.from
      ? new Date(query.from)
      : decodedCursor ? new Date(decodedCursor.scope.from) : new Date(now.getTime() - 7 * 86_400_000);
    const to = query.to ? new Date(query.to) : decodedCursor ? new Date(decodedCursor.scope.to) : now;
    if (from > to) throw new BadRequestException("Invalid date range.");
    if (to.getTime() - from.getTime() > 366 * 86_400_000) {
      throw new BadRequestException("Date range must not exceed 366 days.");
    }
    const effectiveScope = normalizeEffectiveScope(query, from, to);
    if (decodedCursor && queryFingerprint(effectiveScope) !== decodedCursor.fingerprint) {
      throw new BadRequestException("Invalid or query-mismatched pagination cursor.");
    }
    const cursor = decodedCursor;
    const metadataFilters: Prisma.AuditLogWhereInput[] = [];
    if (query.outcome) metadataFilters.push({ metadata: { path: ["outcome"], equals: query.outcome } });
    if (query.severity) metadataFilters.push({ metadata: { path: ["severity"], equals: query.severity } });
    const where: Prisma.AuditLogWhereInput = {
      createdAt: { gte: from, lte: to },
      ...(query.facilityId ? { facilityId: query.facilityId } : {}),
      ...(query.actorUserId ? { userId: query.actorUserId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(metadataFilters.length ? { AND: metadataFilters } : {}),
      ...(cursor ? { OR: [
        { createdAt: { lt: cursor.createdAt } },
        { AND: [{ createdAt: cursor.createdAt }, { id: { lt: cursor.id } }] },
      ] } : {}),
    };

    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.auditLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: query.limit + 1,
        select: {
          id: true, createdAt: true, action: true, entityType: true, entityId: true,
          userId: true, facilityId: true, metadata: true,
          user: { select: { firstName: true, lastName: true, isActive: true } },
          facility: { select: { name: true, isActive: true } },
        },
      });
      const hasNext = rows.length > query.limit;
      const page = hasNext ? rows.slice(0, query.limit) : rows;
      const events = page.map((row) => ({
        id: row.id,
        timestamp: row.createdAt.toISOString(),
        action: row.action,
        ...projectEnterpriseAuditMetadata(row.metadata),
        actor: row.userId ? {
          userId: row.userId,
          displayName: displayName(row.user),
          isActive: row.user?.isActive ?? null,
          attribution: row.facilityId ? "FACILITY_USER" : "PLATFORM_OR_GLOBAL_USER",
        } : { userId: null, displayName: "System", isActive: null, attribution: "SYSTEM" },
        facility: row.facilityId ? {
          facilityId: row.facilityId,
          displayName: row.facility?.name ?? null,
          isActive: row.facility?.isActive ?? null,
        } : { facilityId: null, displayName: "Global", isActive: null },
        entity: { type: row.entityType, id: row.entityId },
      }));
      const last = page[page.length - 1];
      const nextCursor = hasNext && last ? encodeCursor(last.createdAt, last.id, effectiveScope) : null;
      const filterClasses = ["from", "to", "facilityId", "actorUserId", "action", "entityType", "entityId", "outcome", "severity"]
        .filter((key) => query[key as keyof PlatformAuditEventsQueryDto] !== undefined);

      // The access row is appended after selecting the page, so it cannot appear in or recursively
      // trigger the page being audited. Transaction-bound writing makes successful reads fail closed.
      await logSecurityAdminAudit(this.audit, AuditAction.VIEW, {
        event: ACCESS_EVENT,
        actorUserId,
        entityType: "EnterpriseAuditReader",
        entityId: actorUserId,
        severity: "HIGH",
        outcome: "SUCCESS",
        sourceOperation: "GET /platform/audit/events",
        evidence: {
          accessScope: "ENTERPRISE_GLOBAL",
          filterClasses,
          facilityFilterUsed: Boolean(query.facilityId),
          cursorUsed: Boolean(query.cursor),
          resultCount: events.length,
        },
        tx,
      });
      return { events, nextCursor };
    });
  }
}
