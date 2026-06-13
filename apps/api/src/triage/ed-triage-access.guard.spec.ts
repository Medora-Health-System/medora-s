import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { EdTriageAccessGuard } from "./ed-triage-access.guard";

describe("EdTriageAccessGuard (MEDUI.ED.ROLE.1A)", () => {
  const prisma = {
    userRole: { findMany: jest.fn() },
    encounter: { findFirst: jest.fn() },
  };

  const guard = new EdTriageAccessGuard(prisma as never);

  function mockContext(params: { id?: string }, userId = "user-1", facilityId = "fac-1") {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { userId },
          headers: { "x-facility-id": facilityId },
          params,
        }),
      }),
    } as never;
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows LAB user on EMERGENCY encounter", async () => {
    prisma.userRole.findMany.mockResolvedValue([{ role: { code: "LAB" } }]);
    prisma.encounter.findFirst.mockResolvedValue({ type: "EMERGENCY" });

    await expect(guard.canActivate(mockContext({ id: "enc-1" }))).resolves.toBe(true);
  });

  it("allows RADIOLOGY user on EMERGENCY encounter", async () => {
    prisma.userRole.findMany.mockResolvedValue([{ role: { code: "RADIOLOGY" } }]);
    prisma.encounter.findFirst.mockResolvedValue({ type: "EMERGENCY" });

    await expect(guard.canActivate(mockContext({ id: "enc-1" }))).resolves.toBe(true);
  });

  it("denies LAB user on INPATIENT encounter", async () => {
    prisma.userRole.findMany.mockResolvedValue([{ role: { code: "LAB" } }]);
    prisma.encounter.findFirst.mockResolvedValue({ type: "INPATIENT" });

    await expect(guard.canActivate(mockContext({ id: "enc-1" }))).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });

  it("denies RADIOLOGY user on OUTPATIENT encounter", async () => {
    prisma.userRole.findMany.mockResolvedValue([{ role: { code: "RADIOLOGY" } }]);
    prisma.encounter.findFirst.mockResolvedValue({ type: "OUTPATIENT" });

    await expect(guard.canActivate(mockContext({ id: "enc-1" }))).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });

  it("allows RN/provider/admin unchanged", async () => {
    for (const code of ["RN", "PROVIDER", "ADMIN"] as const) {
      prisma.userRole.findMany.mockResolvedValue([{ role: { code } }]);
      prisma.encounter.findFirst.mockResolvedValue({ type: "INPATIENT" });
      await expect(guard.canActivate(mockContext({ id: "enc-1" }))).resolves.toBe(true);
    }
  });

  it("denies billing and front desk on EMERGENCY", async () => {
    for (const code of ["BILLING", "FRONT_DESK"] as const) {
      prisma.userRole.findMany.mockResolvedValue([{ role: { code } }]);
      prisma.encounter.findFirst.mockResolvedValue({ type: "EMERGENCY" });
      await expect(guard.canActivate(mockContext({ id: "enc-1" }))).rejects.toBeInstanceOf(
        ForbiddenException
      );
    }
  });

  it("returns not found when encounter missing", async () => {
    prisma.userRole.findMany.mockResolvedValue([{ role: { code: "RN" } }]);
    prisma.encounter.findFirst.mockResolvedValue(null);

    await expect(guard.canActivate(mockContext({ id: "enc-missing" }))).rejects.toBeInstanceOf(
      NotFoundException
    );
  });
});
