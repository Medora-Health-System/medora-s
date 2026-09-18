import { ForbiddenException } from "@nestjs/common";
import { AdminGoLiveController } from "./admin-go-live.controller";

const facilityA = "facility-a";
const facilityB = "facility-b";
const adminA = "admin-a";

function setup(hasMembership: boolean) {
  const goLive = { getSnapshot: jest.fn().mockResolvedValue({ status: "ready", facilityId: facilityA }) };
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: adminA,
        isActive: true,
        canCreateFacilities: false,
        userRoles: [],
      }),
    },
    userRole: {
      findFirst: jest.fn().mockResolvedValue(hasMembership ? { id: "membership-a" } : null),
    },
  };
  return {
    goLive,
    prisma,
    controller: new AdminGoLiveController(goLive as never, prisma as never),
  };
}

describe("Administration Phase 4 go-live facility authority", () => {
  it("authorizes the exact active facility before computing readiness", async () => {
    const { controller, goLive, prisma } = setup(true);
    await controller.getGoLiveReadiness({
      user: { userId: adminA, facilityId: facilityA },
      headers: {},
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
    expect(goLive.getSnapshot).toHaveBeenCalledWith(facilityA);
  });

  it("does not allow a selected facility header to become authority", async () => {
    const { controller, goLive } = setup(false);
    await expect(
      controller.getGoLiveReadiness({
        user: { userId: adminA },
        headers: { "x-facility-id": facilityB },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(goLive.getSnapshot).not.toHaveBeenCalled();
  });

  it("denies a foreign facility before any readiness dependency runs", async () => {
    const { controller, goLive } = setup(false);
    await expect(
      controller.getGoLiveReadiness({
        user: { userId: adminA, facilityId: facilityB },
        headers: {},
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(goLive.getSnapshot).not.toHaveBeenCalled();
  });
});
