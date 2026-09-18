import { ForbiddenException } from "@nestjs/common";
import { EnterpriseWorkflowController } from "./enterprise-workflow.controller";

const facilityA = "facility-a";
const facilityB = "facility-b";
const adminA = "admin-a";

function setup(hasMembership: boolean) {
  const orchestration = {
    getAdminDashboard: jest.fn().mockResolvedValue({ facilityId: facilityA }),
  };
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
    orchestration,
    prisma,
    controller: new EnterpriseWorkflowController(orchestration as never, prisma as never),
  };
}

describe("Administration Phase 5 enterprise workflow authority", () => {
  it("revalidates exact active facility ADMIN authority before aggregation", async () => {
    const { controller, orchestration, prisma } = setup(true);
    await controller.adminDashboard({
      user: { userId: adminA, facilityId: facilityA },
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
    expect(orchestration.getAdminDashboard).toHaveBeenCalledWith(facilityA, adminA);
  });

  it("denies a foreign facility before workflow aggregation", async () => {
    const { controller, orchestration } = setup(false);
    await expect(
      controller.adminDashboard({
        user: { userId: adminA, facilityId: facilityB },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(orchestration.getAdminDashboard).not.toHaveBeenCalled();
  });
});
