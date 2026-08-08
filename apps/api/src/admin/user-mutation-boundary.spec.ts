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

function store(options: { platformActor?: boolean; actorMembership?: boolean; targetMembership?: boolean } = {}) {
  const prisma = {
    user: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(options.platformActor && where.id === actorUserId ? platform(where.id) : ordinary(where.id))
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
    await expect(assertFacilityAdminMayMutateUser({
      prisma: store() as never,
      actorUserId,
      targetUserId,
      facilityId,
      mutationClass: "FACILITY_MEMBERSHIP",
    })).resolves.toBeUndefined();
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
});
