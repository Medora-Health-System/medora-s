import { ForbiddenException } from "@nestjs/common";
import { ReportsController } from "./reports.controller";

const facilityA = "facility-a";
const facilityB = "facility-b";
const adminA = "admin-a";

function responseStub() {
  return {
    setHeader: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
    writableEnded: false,
  } as any;
}

function setup(membership = true) {
  const reports = {
    doorToEkgJson: jest.fn().mockResolvedValue({ rows: [] }),
    doorToProviderJson: jest.fn().mockResolvedValue({ rows: [] }),
    doorToDoorJson: jest.fn().mockResolvedValue({ rows: [] }),
    medicationAdministrationJson: jest.fn().mockResolvedValue({ rows: [] }),
  };
  const audit = { log: jest.fn() };
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
      findFirst: jest.fn().mockResolvedValue(membership ? { id: "membership-a" } : null),
    },
  };
  return {
    reports,
    prisma,
    controller: new ReportsController(reports as never, audit as never, prisma as never),
  };
}

describe("Administration Phase 3 ED report facility boundary", () => {
  it("authorizes the exact facility before a JSON report query", async () => {
    const { controller, reports, prisma } = setup(true);
    await controller.doorToEkg(
      { user: { userId: adminA, facilityId: facilityA }, headers: {} } as any,
      {},
      responseStub(),
    );
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
    expect(reports.doorToEkgJson).toHaveBeenCalledWith(facilityA, expect.any(Object));
  });

  it("treats x-facility-id as context, not authority", async () => {
    const { controller, reports } = setup(false);
    await expect(
      controller.doorToProvider(
        { user: { userId: adminA }, headers: { "x-facility-id": facilityB } } as any,
        {},
        responseStub(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(reports.doorToProviderJson).not.toHaveBeenCalled();
  });

  it("denies cross-facility report access before any report service call", async () => {
    const { controller, reports } = setup(false);
    await expect(
      controller.doorToDoor(
        { user: { userId: adminA, facilityId: facilityB }, headers: {} } as any,
        {},
        responseStub(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(reports.doorToDoorJson).not.toHaveBeenCalled();
  });
});
