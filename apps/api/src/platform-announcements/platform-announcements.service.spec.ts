/**
 * Phase 14G-A — platform announcements: active list + idempotent acknowledge + PHI-safe audit metadata.
 */

import { NotFoundException } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import { PlatformAnnouncementsService } from "./platform-announcements.service";

type AnyMock = jest.Mock;

describe("PlatformAnnouncementsService", () => {
  const now = new Date("2026-07-15T12:00:00.000Z");
  const past = new Date("2026-07-01T00:00:00.000Z");
  const future = new Date("2026-08-01T00:00:00.000Z");

  function buildPrismaMock(opts: {
    announcements?: Array<{
      id: string;
      title: string;
      body: string;
      severity: string | null;
      versionKey: string;
      startsAt: Date | null;
      expiresAt: Date | null;
      isActive: boolean;
      createdAt: Date;
    }>;
    ackUserIdsByAnnouncement?: Record<string, string[]>;
    findFirstResult?: { id: string; versionKey: string; severity: string | null } | null;
    createThrowsP2002?: boolean;
  }) {
    const announcements = opts.announcements ?? [];
    const acks: Array<{ announcementId: string; userId: string }> = [];
    const ackMap = opts.ackUserIdsByAnnouncement ?? {};

    const findMany = jest.fn().mockImplementation(async (args: { where: { acknowledgements?: { none: { userId: string } } } }) => {
      const userId = args.where?.acknowledgements?.none?.userId;
      if (!userId) return announcements;
      return announcements.filter((a) => {
        if (!a.isActive) return false;
        if (a.startsAt && a.startsAt > now) return false;
        if (a.expiresAt && a.expiresAt < now) return false;
        const acked = ackMap[a.id]?.includes(userId) ?? false;
        if (acked) return false;
        return true;
      });
    });

    const findFirst = jest.fn().mockImplementation(async () => opts.findFirstResult ?? null);

    const findUnique = jest.fn().mockImplementation(async (args: { where: { announcementId_userId: { announcementId: string; userId: string } } }) => {
      const { announcementId, userId } = args.where.announcementId_userId;
      const hit = acks.find((x) => x.announcementId === announcementId && x.userId === userId);
      return hit ?? null;
    });

    const create = jest.fn().mockImplementation(async (args: { data: { announcementId: string; userId: string } }) => {
      if (opts.createThrowsP2002) {
        throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
          clientVersion: "jest",
        });
      }
      acks.push({ ...args.data });
      return { id: "ack-1", ...args.data };
    });

    return {
      platformAnnouncement: { findMany, findFirst },
      platformAnnouncementAcknowledgement: { findUnique, create },
    } as unknown;
  }

  it("findActiveUnacknowledged returns only eligible rows for user", async () => {
    const prisma = buildPrismaMock({
      announcements: [
        {
          id: "a-inactive",
          title: "x",
          body: "b",
          severity: "info",
          versionKey: "v-inactive",
          startsAt: null,
          expiresAt: null,
          isActive: false,
          createdAt: past,
        },
        {
          id: "a-expired",
          title: "x",
          body: "b",
          severity: "info",
          versionKey: "v-expired",
          startsAt: null,
          expiresAt: new Date("2020-01-01T00:00:00.000Z"),
          isActive: true,
          createdAt: past,
        },
        {
          id: "a-future",
          title: "x",
          body: "b",
          severity: "info",
          versionKey: "v-future",
          startsAt: future,
          expiresAt: null,
          isActive: true,
          createdAt: past,
        },
        {
          id: "a-acked",
          title: "x",
          body: "b",
          severity: "info",
          versionKey: "v-acked",
          startsAt: null,
          expiresAt: null,
          isActive: true,
          createdAt: past,
        },
        {
          id: "a-good",
          title: "T",
          body: "Hello",
          severity: "release",
          versionKey: "v-good",
          startsAt: past,
          expiresAt: future,
          isActive: true,
          createdAt: new Date("2026-07-10T00:00:00.000Z"),
        },
      ],
      ackUserIdsByAnnouncement: { "a-acked": ["user-1"] },
    });

    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const svc = new PlatformAnnouncementsService(prisma as never, audit as never);

    jest.useFakeTimers();
    jest.setSystemTime(now);
    const out = await svc.findActiveUnacknowledged("user-1");
    jest.useRealTimers();

    expect(out.map((x) => x.id)).toEqual(["a-good"]);
    expect(out[0]?.body).toBe("Hello");
  });

  it("acknowledge creates row and audits with whitelist metadata only", async () => {
    const prisma = buildPrismaMock({
      findFirstResult: { id: "ann-1", versionKey: "rel-1.2.3", severity: "warning" },
    });
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const svc = new PlatformAnnouncementsService(prisma as never, audit as never);

    jest.useFakeTimers();
    jest.setSystemTime(now);
    await svc.acknowledge("ann-1", "user-1", { facilityId: "fac-x", ip: "1.1.1.1", userAgent: "jest" });
    jest.useRealTimers();

    const create = (prisma as { platformAnnouncementAcknowledgement: { create: AnyMock } }).platformAnnouncementAcknowledgement
      .create;
    expect(create).toHaveBeenCalledTimes(1);
    expect(audit.log).toHaveBeenCalledTimes(1);
    const call = (audit.log as AnyMock).mock.calls[0]!;
    expect(call[0]).toBe(AuditAction.PLATFORM_ANNOUNCEMENT_ACKNOWLEDGED);
    expect(call[1]).toBe("PLATFORM_ANNOUNCEMENT");
    const input = call[2] as { metadata: Record<string, unknown>; entityId?: string };
    expect(input.entityId).toBe("ann-1");
    expect(input.metadata).toEqual({
      announcementId: "ann-1",
      versionKey: "rel-1.2.3",
      severity: "warning",
    });
    const metaStr = JSON.stringify(input.metadata);
    expect(metaStr).not.toContain("Hello");
    expect(metaStr).not.toContain("Patient");
  });

  it("acknowledge is idempotent when row already exists", async () => {
    const prisma = buildPrismaMock({
      findFirstResult: { id: "ann-1", versionKey: "k", severity: null },
    });
    (prisma as { platformAnnouncementAcknowledgement: { findUnique: AnyMock } }).platformAnnouncementAcknowledgement.findUnique.mockResolvedValue({
      id: "existing",
    });
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const svc = new PlatformAnnouncementsService(prisma as never, audit as never);

    await svc.acknowledge("ann-1", "user-1", {});
    expect(
      (prisma as { platformAnnouncementAcknowledgement: { create: AnyMock } }).platformAnnouncementAcknowledgement.create
    ).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it("acknowledge throws when announcement not active in window", async () => {
    const prisma = buildPrismaMock({ findFirstResult: null });
    const audit = { log: jest.fn() };
    const svc = new PlatformAnnouncementsService(prisma as never, audit as never);
    await expect(svc.acknowledge("missing", "user-1", {})).rejects.toBeInstanceOf(NotFoundException);
    expect(audit.log).not.toHaveBeenCalled();
  });

  it("acknowledge is idempotent on P2002 race (no duplicate audit)", async () => {
    const prisma = buildPrismaMock({
      findFirstResult: { id: "ann-1", versionKey: "k", severity: "info" },
      createThrowsP2002: true,
    });
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const svc = new PlatformAnnouncementsService(prisma as never, audit as never);

    await expect(svc.acknowledge("ann-1", "user-1", {})).resolves.toEqual({ ok: true });
    expect(audit.log).not.toHaveBeenCalled();
  });
});
