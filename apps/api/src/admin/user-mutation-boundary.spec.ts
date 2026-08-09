import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { assertFacilityAdminMayMutateUser } from "./user-mutation-boundary";

const facilityId = "facility-a";
const actorUserId = "admin-a";
const targetUserId = "shared-user";

function ordinary(id: string) {
  return { id, isActive: true, canCreateFacilities: false, userRoles: [] };
}

function platform(id: string) {
  return { id, isActive: true, canCreateFacilities: true, userRoles: [{ id: "msa" }] };
}

function store(options: {
  platformActor?: boolean;
  platformTarget?: boolean;
  actorMembership?: boolean;
  targetMembership?: boolean;
} = {}) {
  const prisma = {
    user: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(
          (options.platformActor && where.id === actorUserId) ||
          (options.platformTarget && where.id === targetUserId)
            ? platform(where.id)
            : ordinary(where.id)
        )
      ),
    },
    userRole: {
      findFirst: jest
        .fn()
        .mockResolvedValueOnce(options.actorMembership === false ? null : { id: "actor-membership" })
        .mockResolvedValueOnce(options.targetMembership === false ? null : { id: "target-membership" }),
    },
  };
  return prisma;
}

describe("D4SEC.1C.1 user mutation boundary", () => {
  it.each(["GLOBAL_IDENTITY", "GLOBAL_SECURITY", "GLOBAL_BILLING"] as const)(
    "denies facility-admin %s mutation even for a shared local user",
    async (mutationClass) => {
      const prisma = store();
      await expect(assertFacilityAdminMayMutateUser({
        prisma: prisma as never,
        actorUserId,
        targetUserId,
        facilityId,
        mutationClass,
      })).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.userRole.findFirst).not.toHaveBeenCalled();
    }
  );

  it("allows ordinary facility-local membership administration at the exact facility", async () => {
    const prisma = store();
    await expect(assertFacilityAdminMayMutateUser({
      prisma: prisma as never,
      actorUserId,
      targetUserId,
      facilityId,
      mutationClass: "FACILITY_MEMBERSHIP",
    })).resolves.toBeUndefined();
    expect(prisma.userRole.findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        userId: targetUserId,
        facilityId,
        isActive: true,
        facility: { isActive: true },
      },
      select: { id: true },
    });
  });

  it("rejects an inactive target membership with tenant-scoped not-found behavior", async () => {
    await expect(assertFacilityAdminMayMutateUser({
      prisma: store({ targetMembership: false }) as never,
      actorUserId,
      targetUserId,
      facilityId,
      mutationClass: "FACILITY_MEMBERSHIP",
    })).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects a target membership at an inactive facility with tenant-scoped not-found behavior", async () => {
    const prisma = store({ targetMembership: false });
    await expect(assertFacilityAdminMayMutateUser({
      prisma: prisma as never,
      actorUserId,
      targetUserId,
      facilityId,
      mutationClass: "FACILITY_MEMBERSHIP",
    })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.userRole.findFirst).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({ facility: { isActive: true } }),
    }));
  });

  it("fails closed without an authoritative actor membership", async () => {
    await expect(assertFacilityAdminMayMutateUser({
      prisma: store({ actorMembership: false }) as never,
      actorUserId,
      targetUserId,
      facilityId: "substituted-facility",
      mutationClass: "FACILITY_MEMBERSHIP",
    })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("does not enumerate a target outside the authorized facility", async () => {
    await expect(assertFacilityAdminMayMutateUser({
      prisma: store({ targetMembership: false }) as never,
      actorUserId,
      targetUserId,
      facilityId,
      mutationClass: "FACILITY_MEMBERSHIP",
    })).rejects.toBeInstanceOf(NotFoundException);
  });

  it("denies self membership changes", async () => {
    await expect(assertFacilityAdminMayMutateUser({
      prisma: store() as never,
      actorUserId,
      targetUserId: actorUserId,
      facilityId,
      mutationClass: "FACILITY_MEMBERSHIP",
    })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("permits authoritative platform administration", async () => {
    await expect(assertFacilityAdminMayMutateUser({
      prisma: store({ platformActor: true }) as never,
      actorUserId,
      targetUserId,
      facilityId,
      mutationClass: "GLOBAL_SECURITY",
    })).resolves.toBeUndefined();
  });

  it("continues to deny facility-local mutation of a platform principal", async () => {
    await expect(assertFacilityAdminMayMutateUser({
      prisma: store({ platformTarget: true }) as never,
      actorUserId,
      targetUserId,
      facilityId,
      mutationClass: "FACILITY_MEMBERSHIP",
    })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
