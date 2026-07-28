import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { FacilityType, RoleCode } from "@prisma/client";
import { ClinicCareReadAccessGuard } from "./clinic-care-read-access.guard";

describe("ClinicCareReadAccessGuard (MEDUI.D4C.2)", () => {
  const facilityId = "fac-clinic-1";
  const userId = "user-1";

  function buildContext(overrides?: {
    userId?: string | null;
    facilityId?: string | null;
    clearFacility?: boolean;
  }) {
    const effectiveFacilityId = overrides?.clearFacility
      ? ""
      : overrides?.facilityId === null
        ? ""
        : (overrides?.facilityId ?? facilityId);
    const request: {
      user: { userId?: string; facilityId?: string } | null;
      headers: Record<string, string>;
      facilityId?: string;
      clinicCareAccess?: unknown;
      clinicCareProfessionGroup?: string;
    } = {
      user:
        overrides?.userId === null
          ? null
          : {
              userId: overrides?.userId ?? userId,
              ...(overrides?.clearFacility ? {} : { facilityId: effectiveFacilityId || undefined }),
            },
      headers: {
        "x-facility-id": effectiveFacilityId,
      },
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

  const clinicFacility = {
    facilityType: FacilityType.CLINIC,
    serviceLinesJson: ["CLINIC", "LABORATORY"],
    facilityCareProfileJson: null,
    timezone: "America/Chicago",
    name: "Clinic A",
    country: "Haiti",
  };

  const clinicWithPharmacy = {
    ...clinicFacility,
    serviceLinesJson: ["CLINIC", "PHARMACY"],
    facilityCareProfileJson: {
      schemaVersion: 1,
      optionalModules: { pharmacy: true },
    },
  };

  const hospitalFacility = {
    facilityType: FacilityType.HOSPITAL,
    serviceLinesJson: ["EMERGENCY", "MEDSURG", "OBSERVATION"],
    facilityCareProfileJson: null,
    timezone: "America/Chicago",
    name: "Hospital A",
    country: "Haiti",
  };

  const freestandingEr = {
    facilityType: FacilityType.FREESTANDING_ER,
    serviceLinesJson: ["EMERGENCY", "OBSERVATION", "LABORATORY"],
    facilityCareProfileJson: null,
    timezone: "America/Chicago",
    name: "FSER A",
    country: "Haiti",
  };

  it("1. allows Provider at Clinic Care facility", async () => {
    const ctx = buildContext();
    const prisma = prismaMock([
      { role: { code: RoleCode.PROVIDER }, facility: clinicFacility },
    ]);
    const guard = new ClinicCareReadAccessGuard(prisma as never);
    await expect(guard.canActivate(ctx as never)).resolves.toBe(true);
    expect(ctx.request.clinicCareProfessionGroup).toBe("PROVIDER");
    expect((ctx.request.clinicCareAccess as { canAccessClinicCareShell: boolean }).canAccessClinicCareShell).toBe(
      true
    );
  });

  it("2. allows Nurse/MA (RN) at Clinic Care facility", async () => {
    const ctx = buildContext();
    const prisma = prismaMock([{ role: { code: RoleCode.RN }, facility: clinicFacility }]);
    const guard = new ClinicCareReadAccessGuard(prisma as never);
    await expect(guard.canActivate(ctx as never)).resolves.toBe(true);
    expect(ctx.request.clinicCareProfessionGroup).toBe("RN");
  });

  it("3. allows Technician-safe access at Clinic Care facility", async () => {
    const ctx = buildContext();
    const prisma = prismaMock([
      { role: { code: RoleCode.PATIENT_CARE_TECH }, facility: clinicFacility },
    ]);
    const guard = new ClinicCareReadAccessGuard(prisma as never);
    await expect(guard.canActivate(ctx as never)).resolves.toBe(true);
    const access = ctx.request.clinicCareAccess as {
      canAccessTechnicianSafeNursingMaProjection: boolean;
      canAuthorProviderDocumentation: boolean;
    };
    expect(access.canAccessTechnicianSafeNursingMaProjection).toBe(true);
    expect(access.canAuthorProviderDocumentation).toBe(false);
  });

  it("4. allows Front Desk at Clinic Care facility", async () => {
    const ctx = buildContext();
    const prisma = prismaMock([
      { role: { code: RoleCode.FRONT_DESK }, facility: clinicFacility },
    ]);
    const guard = new ClinicCareReadAccessGuard(prisma as never);
    await expect(guard.canActivate(ctx as never)).resolves.toBe(true);
    const access = ctx.request.clinicCareAccess as {
      canAccessClinicTrackboardProjection: boolean;
      canAuthorProviderDocumentation: boolean;
      canAccessRegistration: boolean;
    };
    expect(access.canAccessClinicTrackboardProjection).toBe(true);
    expect(access.canAuthorProviderDocumentation).toBe(false);
    expect(access.canAccessRegistration).toBe(true);
  });

  it("5. allows Billing at Clinic Care facility", async () => {
    const ctx = buildContext();
    const prisma = prismaMock([{ role: { code: RoleCode.BILLING }, facility: clinicFacility }]);
    const guard = new ClinicCareReadAccessGuard(prisma as never);
    await expect(guard.canActivate(ctx as never)).resolves.toBe(true);
    const access = ctx.request.clinicCareAccess as {
      canAccessBilling: boolean;
      canIssueProviderOrders: boolean;
    };
    expect(access.canAccessBilling).toBe(true);
    expect(access.canIssueProviderOrders).toBe(false);
  });

  it("6. denies unauthorized role without membership", async () => {
    const prisma = prismaMock([]);
    const guard = new ClinicCareReadAccessGuard(prisma as never);
    await expect(guard.canActivate(buildContext() as never)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("7. denies Clinic Care when facility clinic modules are off (hospital-only)", async () => {
    const prisma = prismaMock([
      { role: { code: RoleCode.FRONT_DESK }, facility: hospitalFacility },
    ]);
    const guard = new ClinicCareReadAccessGuard(prisma as never);
    await expect(guard.canActivate(buildContext() as never)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("8. denies when user has no facility id", async () => {
    const prisma = prismaMock([
      { role: { code: RoleCode.PROVIDER }, facility: clinicFacility },
    ]);
    const guard = new ClinicCareReadAccessGuard(prisma as never);
    await expect(
      guard.canActivate(buildContext({ clearFacility: true }) as never)
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("9. Clinic Care ≠ Emergency access — FSER provider without clinic lines denied", async () => {
    const prisma = prismaMock([
      { role: { code: RoleCode.PROVIDER }, facility: freestandingEr },
    ]);
    const guard = new ClinicCareReadAccessGuard(prisma as never);
    await expect(guard.canActivate(buildContext() as never)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("10. Clinic Care ≠ Hospital access — hospital RN denied clinic trackboard", async () => {
    const prisma = prismaMock([{ role: { code: RoleCode.RN }, facility: hospitalFacility }]);
    const guard = new ClinicCareReadAccessGuard(prisma as never);
    await expect(guard.canActivate(buildContext() as never)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("11. Pharmacy requires facility pharmacy module + Pharmacy role", async () => {
    const denied = new ClinicCareReadAccessGuard(
      prismaMock([{ role: { code: RoleCode.PHARMACY }, facility: clinicFacility }]) as never
    );
    await expect(denied.canActivate(buildContext() as never)).rejects.toBeInstanceOf(ForbiddenException);

    const ctx = buildContext();
    const allowed = new ClinicCareReadAccessGuard(
      prismaMock([{ role: { code: RoleCode.PHARMACY }, facility: clinicWithPharmacy }]) as never
    );
    await expect(allowed.canActivate(ctx as never)).resolves.toBe(true);
    expect(
      (ctx.request.clinicCareAccess as { canAccessPharmacy: boolean }).canAccessPharmacy
    ).toBe(true);
  });

  it("denies unauthenticated requests", async () => {
    const guard = new ClinicCareReadAccessGuard(prismaMock([]) as never);
    await expect(
      guard.canActivate(buildContext({ userId: null }) as never)
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
