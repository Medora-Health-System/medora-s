import { ForbiddenException } from "@nestjs/common";
import { FacilityType, RoleCode } from "@prisma/client";
import { TrackboardReadAccessGuard } from "./trackboard-read-access.guard";

describe("TrackboardReadAccessGuard (MEDUI.ED.TECH.3)", () => {
  const facilityId = "fac-er-1";
  const userId = "user-lab-1";

  function buildContext(query: Record<string, string> = {}) {
    const request: {
      user: { userId: string; facilityId?: string };
      headers: { "x-facility-id": string };
      query: Record<string, string>;
      trackboardObservationPatientsOnly?: boolean;
    } = {
      user: { userId },
      headers: { "x-facility-id": facilityId },
      query,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      request,
    };
  }

  function prismaMock(memberships: Array<Record<string, unknown>>) {
    return {
      userRole: {
        findMany: jest.fn().mockResolvedValue(memberships),
      },
    };
  }

  const freestandingFacility = {
    facilityType: FacilityType.FREESTANDING_ER,
    serviceLinesJson: ["EMERGENCY", "OBSERVATION", "LABORATORY", "RADIOLOGY"],
  };

  const freestandingFacilityNullServiceLines = {
    facilityType: FacilityType.FREESTANDING_ER,
    serviceLinesJson: null,
  };

  it("allows LAB tech at FREESTANDING_ER for ED trackboard", async () => {
    const ctx = buildContext({ status: "OPEN" });
    const prisma = prismaMock([
      {
        role: { code: RoleCode.LAB },
        department: { code: "LABORATORY" },
        facility: freestandingFacility,
      },
    ]);
    const guard = new TrackboardReadAccessGuard(prisma as never);
    const ok = await guard.canActivate(ctx as never);
    expect(ok).toBe(true);
    expect(ctx.request.trackboardObservationPatientsOnly).toBe(false);
  });

  it("allows RAD tech at FREESTANDING_ER for observation inpatient board", async () => {
    const ctx = buildContext({ status: "OPEN", type: "INPATIENT" });
    const prisma = prismaMock([
      {
        role: { code: RoleCode.RADIOLOGY },
        department: { code: "RADIOLOGY" },
        facility: freestandingFacility,
      },
    ]);
    const guard = new TrackboardReadAccessGuard(prisma as never);
    const ok = await guard.canActivate(ctx as never);
    expect(ok).toBe(true);
    expect(ctx.request.trackboardObservationPatientsOnly).toBe(true);
  });

  it("allows LAB tech at FREESTANDING_ER with NULL serviceLinesJson (Wayne UC case)", async () => {
    const ctx = buildContext({ status: "OPEN", type: "INPATIENT" });
    const prisma = prismaMock([
      {
        role: { code: RoleCode.LAB },
        department: { code: "LABORATORY" },
        facility: freestandingFacilityNullServiceLines,
      },
    ]);
    const guard = new TrackboardReadAccessGuard(prisma as never);
    await expect(guard.canActivate(ctx as never)).resolves.toBe(true);
    expect(ctx.request.trackboardObservationPatientsOnly).toBe(true);
  });

  it("denies LAB tech at CLINIC", async () => {
    const prisma = prismaMock([
      {
        role: { code: RoleCode.LAB },
        department: { code: "LAB" },
        facility: {
          facilityType: FacilityType.CLINIC,
          serviceLinesJson: ["OBSERVATION", "LABORATORY"],
        },
      },
    ]);
    const guard = new TrackboardReadAccessGuard(prisma as never);
    await expect(guard.canActivate(buildContext({ status: "OPEN" }) as never)).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });

  it("still allows RN at any facility", async () => {
    const prisma = prismaMock([
      {
        role: { code: RoleCode.RN },
        department: null,
        facility: {
          facilityType: FacilityType.CLINIC,
          serviceLinesJson: ["OBSERVATION", "LABORATORY"],
        },
      },
    ]);
    const guard = new TrackboardReadAccessGuard(prisma as never);
    await expect(guard.canActivate(buildContext({ status: "OPEN" }) as never)).resolves.toBe(true);
  });

  it("denies LAB tech without facility membership", async () => {
    const prisma = prismaMock([]);
    const guard = new TrackboardReadAccessGuard(prisma as never);
    await expect(guard.canActivate(buildContext({ status: "OPEN" }) as never)).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });
});
