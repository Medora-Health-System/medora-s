import { AuditAction } from "@prisma/client";
import { DigitalCareStaffWorkspaceService } from "./digital-care-staff-workspace.service";

describe("DigitalCareStaffWorkspaceService", () => {
  const actor = { userId: "staff-a", facilityId: "facility-a" };

  it("scopes roster patients to the actor facility and does not query portal medications", async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      order: { findMany: jest.fn().mockResolvedValue([]) },
      encounter: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn() },
      patient: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn() },
    } as any;
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const releases = { list: jest.fn() };
    const service = new DigitalCareStaffWorkspaceService(prisma, audit as any, releases as any);
    const result = await service.roster(actor, { q: "marie" });
    expect(result.patients).toEqual([]);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ facilityId: "facility-a" }) }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.VIEW,
      "DIGITAL_CARE_ROSTER",
      expect.objectContaining({ facilityId: "facility-a", userId: "staff-a" }),
    );
    expect(releases.list).not.toHaveBeenCalled();
  });

  it("rejects workspace reads for a patient outside the facility", async () => {
    const prisma = {
      patient: { findFirst: jest.fn().mockResolvedValue(null) },
    } as any;
    const service = new DigitalCareStaffWorkspaceService(prisma, { log: jest.fn() } as any, { list: jest.fn() } as any);
    await expect(service.workspace(actor, "patient-b")).rejects.toThrow("Patient not found");
  });
});
