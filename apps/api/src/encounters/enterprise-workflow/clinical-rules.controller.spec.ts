import { ForbiddenException } from "@nestjs/common";
import { ClinicalRulesController } from "./clinical-rules.controller";

const facilityA = "facility-a";
const facilityB = "facility-b";
const adminA = "admin-a";

function setup(hasMembership: boolean) {
  const rules = {
    getCatalog: jest.fn().mockResolvedValue({ catalog: { facilityId: facilityA } }),
    getConflicts: jest.fn().mockResolvedValue({ conflicts: [] }),
    upsertRule: jest.fn(),
    activateRule: jest.fn(),
    setRuleStatus: jest.fn(),
    rollbackRule: jest.fn(),
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
    rules,
    prisma,
    controller: new ClinicalRulesController(rules as never, prisma as never),
  };
}

describe("Administration Phase 6 clinical rules authority", () => {
  it("revalidates exact facility ADMIN before reading the policy catalog", async () => {
    const { controller, rules, prisma } = setup(true);
    await controller.catalog({ user: { userId: adminA, facilityId: facilityA } });
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
    expect(rules.getCatalog).toHaveBeenCalledWith(facilityA);
  });

  it("denies a foreign facility before clinical policy is read", async () => {
    const { controller, rules } = setup(false);
    await expect(
      controller.catalog({ user: { userId: adminA, facilityId: facilityB } }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(rules.getCatalog).not.toHaveBeenCalled();
  });

  it("denies a foreign facility before a clinical rule mutation", async () => {
    const { controller, rules } = setup(false);
    await expect(
      controller.activate(
        "rule-a",
        { expectedVersion: 1 },
        { user: { userId: adminA, facilityId: facilityB } },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(rules.activateRule).not.toHaveBeenCalled();
  });
});
