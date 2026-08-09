import { ForbiddenException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { AdminAuditService } from "./admin-audit.service";

const facilityA = "facility-a";
const facilityB = "facility-b";
const adminA = "admin-a";
const platformActor = "platform-actor";

function ordinaryUser(id: string) {
  return { id, isActive: true, canCreateFacilities: false, userRoles: [] };
}

function platformUser(id: string) {
  return { id, isActive: true, canCreateFacilities: true, userRoles: [{ id: "super-admin-role" }] };
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "audit-a",
    createdAt: new Date("2026-08-01T12:00:00.000Z"),
    action: AuditAction.UPDATE,
    entityType: "USER",
    entityId: "entity-a",
    userId: adminA,
    facilityId: facilityA,
    encounterId: null,
    metadata: {},
    user: { firstName: "Alice", lastName: "Admin" },
    ...overrides,
  };
}

function setup(options: {
  actorMembership?: boolean;
  actorPlatform?: boolean;
  activeFacility?: boolean;
  rows?: ReturnType<typeof row>[];
} = {}) {
  const prisma = {
    facility: {
      findFirst: jest.fn().mockResolvedValue(options.activeFacility === false ? null : { id: facilityA }),
    },
    user: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(
          (options.actorPlatform && where.id === adminA) || where.id === platformActor
            ? platformUser(where.id)
            : ordinaryUser(where.id)
        )
      ),
    },
    userRole: {
      findFirst: jest.fn().mockResolvedValue(options.actorMembership === false ? null : { id: "admin-membership" }),
      findMany: jest.fn().mockResolvedValue([{ userId: adminA, role: { code: "ADMIN" } }]),
    },
    auditLog: {
      findMany: jest.fn().mockResolvedValue(options.rows ?? [row()]),
    },
  };
  return { prisma, service: new AdminAuditService(prisma as never) };
}

describe("D4SEC.1C.2A customer audit read boundary", () => {
  it("allows an active facility ADMIN to read the exact active facility", async () => {
    const { prisma, service } = setup();
    await expect(service.listCustomerEvents(adminA, facilityA, { limit: 50 })).resolves.toMatchObject({
      events: [{ facilityId: facilityA, actor: { displayName: "Alice Admin", roleHint: "ADMIN" } }],
    });
    expect(prisma.userRole.findFirst).toHaveBeenCalledWith({
      where: {
        userId: adminA,
        facilityId: facilityA,
        isActive: true,
        role: { code: "ADMIN" },
        facility: { isActive: true },
      },
      select: { id: true },
    });
  });

  it.each([
    ["cross-tenant facility", facilityB],
    ["inactive ADMIN membership", facilityA],
    ["ordinary non-ADMIN role", facilityA],
  ])("fails closed for %s", async (_case, requestedFacility) => {
    const { service } = setup({ actorMembership: false });
    await expect(service.listCustomerEvents(adminA, requestedFacility, { limit: 50 })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("denies an inactive or nonexistent selected facility even to platform authority", async () => {
    const { service } = setup({ actorPlatform: true, activeFacility: false });
    await expect(service.listCustomerEvents(adminA, facilityA, { limit: 50 }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it("permits authoritative platform authority through the existing resolver", async () => {
    const { prisma, service } = setup({ actorPlatform: true });
    await expect(service.listCustomerEvents(adminA, facilityB, { limit: 50 })).resolves.toBeDefined();
    expect(prisma.userRole.findFirst).not.toHaveBeenCalled();
  });

  it("reapplies facility scope around cursor, actor, and entity filters", async () => {
    const { prisma, service } = setup({ rows: [] });
    const cursor = Buffer.from("2026-08-01T12:00:00.000Z\taudit-from-b").toString("base64url");
    await service.listCustomerEvents(adminA, facilityA, {
      cursor,
      actorUserId: platformActor,
      entity: "USER",
      encounterId: "8ad79eed-a07f-4810-82dc-769f7c83fb35",
      limit: 10,
    });
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        facilityId: facilityA,
        userId: platformActor,
        entityType: "USER",
        encounterId: "8ad79eed-a07f-4810-82dc-769f7c83fb35",
        OR: expect.any(Array),
      }),
    }));
  });

  it("redacts authoritative platform actors without changing the selected internal row", async () => {
    const internal = row({
      userId: platformActor,
      user: { firstName: "Medora", lastName: "Operator" },
      metadata: {
        passwordHash: "secret",
        refreshToken: "secret",
        authorization: "Bearer secret",
        actorRole: "MEDORA_SUPER_ADMIN",
      },
    });
    const { prisma, service } = setup({ rows: [internal] });
    const result = await service.listCustomerEvents(adminA, facilityA, { limit: 50 });
    expect(result.events[0]!.actor).toEqual({
      displayName: "Medora Platform Administration",
      roleHint: null,
    });
    expect(result.events[0]!.actor).not.toHaveProperty("userId");
    expect(JSON.stringify(result)).not.toContain("support@medoras.com");
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(prisma.auditLog.findMany.mock.results[0]).toBeDefined();
    // The authoritative source row and AuditLog.userId remain exact; redaction occurs only in output mapping.
    expect(internal.userId).toBe(platformActor);
  });

  it("uses neutral attribution for a system action", async () => {
    const { service } = setup({ rows: [row({ userId: null, user: null })] });
    const result = await service.listCustomerEvents(adminA, facilityA, { limit: 50 });
    expect(result.events[0]!.actor).toEqual({ displayName: "System", roleHint: null });
  });

  it("never selects actor email or authentication material", async () => {
    const { prisma, service } = setup();
    await service.listCustomerEvents(adminA, facilityA, { limit: 50 });
    const select = prisma.auditLog.findMany.mock.calls[0]![0].select;
    expect(select.user.select).toEqual({ firstName: true, lastName: true });
    expect(select).not.toHaveProperty("ip");
    expect(select).not.toHaveProperty("userAgent");
  });
});
