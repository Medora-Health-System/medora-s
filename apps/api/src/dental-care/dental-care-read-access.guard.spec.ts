import { ForbiddenException } from "@nestjs/common";
import { DentalCareReadAccessGuard } from "./dental-care-read-access.guard";

function prismaMock(opts: {
  roles: string[];
  serviceLinesJson?: unknown;
  facilityType?: string;
}) {
  return {
    userRole: {
      findMany: jest.fn().mockResolvedValue(
        opts.roles.map((code) => ({
          role: { code },
          facility: {
            facilityType: opts.facilityType ?? "CLINIC",
            serviceLinesJson: opts.serviceLinesJson ?? ["CLINIC", "DENTAL"],
            facilityCareProfileJson: {
              schemaVersion: 1,
              dentalSpecialties: ["GENERAL_DENTISTRY", "ORTHODONTICS"],
            },
            country: "HT",
          },
        }))
      ),
    },
  };
}

function context(userId: string | null, facilityId: string | null) {
  const request: Record<string, unknown> = {
    user: userId ? { userId, facilityId } : null,
    headers: facilityId ? { "x-facility-id": facilityId } : {},
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    request,
  } as never;
}

describe("DentalCareReadAccessGuard (MEDUI.D5A.2)", () => {
  it("allows PROVIDER when DENTAL service line is enabled", async () => {
    const prisma = prismaMock({ roles: ["PROVIDER"] });
    const guard = new DentalCareReadAccessGuard(prisma as never);
    const ctx = context("u1", "f1") as any;
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(ctx.switchToHttp().getRequest().dentalCareAccess.canAccessDentalShell).toBe(true);
  });

  it("denies when Dental is not enabled on the facility", async () => {
    const prisma = prismaMock({ roles: ["PROVIDER"], serviceLinesJson: ["CLINIC"] });
    const guard = new DentalCareReadAccessGuard(prisma as never);
    await expect(guard.canActivate(context("u1", "f1"))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("denies pharmacy-only role without dental view capability", async () => {
    const prisma = prismaMock({ roles: ["PHARMACY"] });
    const guard = new DentalCareReadAccessGuard(prisma as never);
    await expect(guard.canActivate(context("u1", "f1"))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("denies missing facility membership", async () => {
    const prisma = {
      userRole: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const guard = new DentalCareReadAccessGuard(prisma as never);
    await expect(guard.canActivate(context("u1", "f1"))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
