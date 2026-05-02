import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { AdminAuditEventsQueryDto } from "./dto/admin-audit-events-query.dto";
import { auditHighlightTags, summarizeAuditMetadata } from "./audit-metadata-summary.util";

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

function actorDisplayName(u: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
} | null): string {
  if (!u) return "";
  const n = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  if (n) return n;
  return u.email?.trim() ?? "";
}

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async listEvents(facilityId: string, query: AdminAuditEventsQueryDto) {
    const now = new Date();
    const from = parseTimeBoundary(query.from, false) ?? new Date(now.getTime() - 7 * 86400_000);
    const to = parseTimeBoundary(query.to, true) ?? now;
    if (from.getTime() > to.getTime()) {
      throw new BadRequestException("La plage de dates est invalide.");
    }

    const take = query.limit ?? 50;
    const cursorDecoded = query.cursor ? decodeCursor(query.cursor) : null;

    const where = {
      facilityId,
      createdAt: { gte: from, lte: to },
      ...(query.actorUserId ? { userId: query.actorUserId } : {}),
      ...(query.entity ? { entityType: query.entity } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.encounterId ? { encounterId: query.encounterId } : {}),
      ...(cursorDecoded
        ? {
            OR: [
              { createdAt: { lt: cursorDecoded.createdAt } },
              { AND: [{ createdAt: cursorDecoded.createdAt }, { id: { lt: cursorDecoded.id } }] },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      select: {
        id: true,
        createdAt: true,
        action: true,
        entityType: true,
        entityId: true,
        userId: true,
        facilityId: true,
        encounterId: true,
        metadata: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    const hasNext = rows.length > take;
    const page = hasNext ? rows.slice(0, take) : rows;
    const userIds = [...new Set(page.map((r) => r.userId).filter((x): x is string => Boolean(x)))];
    const roleByUser = await this.loadRoleHints(facilityId, userIds);

    const events = page.map((r) => {
      const metaSummary = summarizeAuditMetadata(r.metadata);
      const highlightTags = auditHighlightTags({
        action: r.action,
        entityType: r.entityType,
        metadataRaw: r.metadata,
      });
      return {
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        action: r.action,
        entity: r.entityType,
        entityId: r.entityId,
        actor: {
          userId: r.userId,
          displayName: actorDisplayName(r.user),
          roleHint: r.userId ? roleByUser.get(r.userId) ?? null : null,
        },
        facilityId: r.facilityId,
        encounterId: r.encounterId,
        metadataSummary: metaSummary,
        highlightTags,
      };
    });

    const last = page[page.length - 1];
    const nextCursor = hasNext && last ? encodeCursor(last.createdAt, last.id) : null;

    return { events, nextCursor };
  }

  private async loadRoleHints(facilityId: string, userIds: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (userIds.length === 0) return map;
    const rows = await this.prisma.userRole.findMany({
      where: { facilityId, userId: { in: userIds }, isActive: true },
      select: { userId: true, role: { select: { code: true } } },
      orderBy: { role: { code: "asc" } },
    });
    for (const r of rows) {
      if (!map.has(r.userId)) map.set(r.userId, r.role.code);
    }
    return map;
  }
}
