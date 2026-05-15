import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";

export type ActivePlatformAnnouncementDto = {
  id: string;
  title: string;
  body: string;
  severity: string | null;
  versionKey: string;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

@Injectable()
export class PlatformAnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  private static announcementDateWhere(now: Date): Prisma.PlatformAnnouncementWhereInput {
    return {
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
      ],
    };
  }

  private static toDto(row: {
    id: string;
    title: string;
    body: string;
    severity: string | null;
    versionKey: string;
    startsAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
  }): ActivePlatformAnnouncementDto {
    return {
      id: row.id,
      title: row.title,
      body: row.body,
      severity: row.severity,
      versionKey: row.versionKey,
      startsAt: row.startsAt ? row.startsAt.toISOString() : null,
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  /** Active window + not acknowledged by this user; newest first. */
  async findActiveUnacknowledged(userId: string): Promise<ActivePlatformAnnouncementDto[]> {
    const now = new Date();
    const rows = await this.prisma.platformAnnouncement.findMany({
      where: {
        isActive: true,
        ...PlatformAnnouncementsService.announcementDateWhere(now),
        acknowledgements: { none: { userId } },
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => PlatformAnnouncementsService.toDto(r));
  }

  private async loadAcknowledgeableOrThrow(
    announcementId: string,
    now: Date
  ): Promise<{ id: string; versionKey: string; severity: string | null }> {
    const ann = await this.prisma.platformAnnouncement.findFirst({
      where: {
        id: announcementId,
        isActive: true,
        ...PlatformAnnouncementsService.announcementDateWhere(now),
      },
      select: { id: true, versionKey: true, severity: true },
    });
    if (!ann) {
      throw new NotFoundException("Announcement not found or not active.");
    }
    return ann;
  }

  /**
   * Idempotent: duplicate ack returns success without duplicate audit rows.
   */
  async acknowledge(
    announcementId: string,
    userId: string,
    opts: { facilityId?: string; ip?: string; userAgent?: string }
  ): Promise<{ ok: true }> {
    const now = new Date();
    const ann = await this.loadAcknowledgeableOrThrow(announcementId, now);

    const existing = await this.prisma.platformAnnouncementAcknowledgement.findUnique({
      where: {
        announcementId_userId: { announcementId: ann.id, userId },
      },
    });
    if (existing) {
      return { ok: true };
    }

    try {
      await this.prisma.platformAnnouncementAcknowledgement.create({
        data: {
          announcementId: ann.id,
          userId,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return { ok: true };
      }
      throw e;
    }

    await this.audit.log(AuditAction.PLATFORM_ANNOUNCEMENT_ACKNOWLEDGED, "PLATFORM_ANNOUNCEMENT", {
      userId,
      facilityId: opts.facilityId?.trim() || undefined,
      entityId: ann.id,
      ip: opts.ip,
      userAgent: opts.userAgent,
      metadata: {
        announcementId: ann.id,
        versionKey: ann.versionKey,
        severity: ann.severity ?? null,
      },
    });

    return { ok: true };
  }
}
