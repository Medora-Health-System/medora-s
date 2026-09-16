import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { defaultFacilityConfigurationSettings } from "@medora/shared";
import { FacilityConfigurationService } from "./facility-configuration.service";

jest.mock("../admin/facility-department-seed.util", () => ({
  ensureFacilityServiceLineDepartments: jest.fn().mockResolvedValue({ created: 0, existing: 1 }),
  FacilityServiceLineDepartmentMappingError: class extends Error {
    code = "FACILITY_SERVICE_LINE_DEPARTMENT_MAPPING_INVALID";
    serviceLine = "";
    invalidCode = "";
  },
}));

describe("FacilityConfigurationService", () => {
  const facilityA = "11111111-1111-4111-8111-111111111111";
  const facilityB = "22222222-2222-4222-8222-222222222222";
  const adminA = "admin-a";

  function build(options?: { platform?: boolean; adminFacility?: string | null }) {
    const settings = defaultFacilityConfigurationSettings();
    settings.branding.hospitalName = "Hospital A";
    const row = {
      id: "cfg-a",
      facilityId: facilityA,
      revision: 1,
      settingsJson: settings,
      updatedByUserId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const facility = {
      id: facilityA,
      name: "Hospital A",
      code: "FAC-A",
      timezone: "America/Port-au-Prince",
      country: "Haiti",
      defaultLanguage: "fr",
      facilityType: "CLINIC",
      serviceLinesJson: ["CLINIC"],
      facilityCareProfileJson: { optionalModules: { billing: true, laboratory: true, radiology: true, pharmacy: true, publicHealth: true } },
      isActive: true,
    };
    const prisma = {
      userRole: {
        findFirst: jest.fn().mockImplementation(async ({ where }: { where: { facilityId: string } }) => {
          if (options?.platform) return null;
          if (options?.adminFacility === null) return null;
          return where.facilityId === (options?.adminFacility ?? facilityA) ? { id: "role-a" } : null;
        }),
      },
      facility: {
        findUnique: jest.fn().mockImplementation(async ({ where }: { where: { id: string } }) => {
          if (where.id !== facilityA) return null;
          return facility;
        }),
        update: jest.fn().mockResolvedValue(facility),
      },
      facilityConfiguration: {
        findUnique: jest.fn().mockResolvedValue(row),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({ ...row, revision: 2 }),
      },
      facilityConfigurationRevision: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      user: { findUnique: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(prisma)),
    } as any;
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new FacilityConfigurationService(prisma, audit as any);
    jest.spyOn(service as any, "assertCanConfigure").mockImplementation(async (...args: unknown[]) => {
      const userId = String(args[0] ?? "");
      const facilityId = String(args[1] ?? "");
      if (options?.platform) return { platform: true };
      if (facilityId !== facilityA || userId !== adminA) {
        throw new ForbiddenException("Configuration de l’établissement : accès refusé.");
      }
      return { platform: false };
    });
    return { prisma, audit, service, settings };
  }

  it("returns the current facility document only", async () => {
    const { service } = build();
    const result = await service.getForAdmin({ userId: adminA, facilityId: facilityA });
    expect(result.facility.id).toBe(facilityA);
    expect(result.settings.branding.hospitalName).toBe("Hospital A");
    expect(result.revision).toBe(1);
  });

  it("rejects a facility-admin write against another hospital", async () => {
    const { service } = build();
    await expect(service.getForAdmin({ userId: adminA, facilityId: facilityB })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects an invalid patch body and does not write", async () => {
    const { service, prisma } = build();
    await expect(
      service.patchForAdmin({ userId: adminA, facilityId: facilityA }, { facilityId: facilityB, revision: 1 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.facilityConfiguration.update).not.toHaveBeenCalled();
  });

  it("conflicts on stale revision", async () => {
    const { service, settings } = build();
    await expect(
      service.patchForAdmin(
        { userId: adminA, facilityId: facilityA },
        { revision: 9, settings },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("writes, versions, and audits a configuration change", async () => {
    const { service, prisma, audit, settings } = build();
    const next = structuredClone(settings);
    next.digitalCare.secureMessaging = false;
    next.digitalCare.autoRelease = true;
    next.patientPortal.invoices = false;
    await service.patchForAdmin(
      { userId: adminA, facilityId: facilityA, ip: "10.0.0.8" },
      { revision: 1, reason: "Disable messaging for Hospital A", settings: next },
    );
    expect(prisma.facilityConfiguration.update).toHaveBeenCalled();
    expect(prisma.facilityConfigurationRevision.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          facilityId: facilityA,
          revision: 2,
          changedByUserId: adminA,
          reason: "Disable messaging for Hospital A",
          ip: "10.0.0.8",
        }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.FACILITY_CONFIGURATION_UPDATE,
      "FacilityConfiguration",
      expect.objectContaining({
        facilityId: facilityA,
        userId: adminA,
        metadata: expect.objectContaining({
          reason: "Disable messaging for Hospital A",
        }),
      }),
    );
  });

  it("lets a platform administrator read the switched facility only", async () => {
    const { service } = build({ platform: true });
    const result = await service.getForAdmin({ userId: "super-admin", facilityId: facilityA });
    expect(result.facility.id).toBe(facilityA);
  });
});
