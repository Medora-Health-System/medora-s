import { AuditAction } from "@prisma/client";
import { AdminComplianceService } from "./admin-compliance.service";

describe("Administration Phase 10 compliance integrity", () => {
  it("uses canonical facility-local AuditLog evidence for MAR and exports", async () => {
    const medicationAdministration = { count: jest.fn().mockResolvedValue(4) };
    const order = { count: jest.fn().mockResolvedValueOnce(5).mockResolvedValueOnce(5) };
    const auditLog = {
      count: jest
        .fn()
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0),
      findMany: jest.fn().mockResolvedValue([]),
    };
    const prisma = { medicationAdministration, order, auditLog };
    const service = new AdminComplianceService(prisma as never);

    const result = await service.getDashboard("facility-a");

    expect(auditLog.count).toHaveBeenNthCalledWith(1, {
      where: {
        facilityId: "facility-a",
        createdAt: expect.any(Object),
        action: AuditAction.CREATE,
        entityType: "MEDICATION_ADMINISTRATION",
        entityId: { not: null },
      },
    });
    expect(result.auditCoverage.mar).toEqual({ total: 4, audited: 3, percent: 75 });

    const exportCountCall = auditLog.count.mock.calls[1][0];
    expect(exportCountCall.where.facilityId).toBe("facility-a");
    expect(exportCountCall.where.OR).toBeUndefined();

    const exportScanCall = auditLog.findMany.mock.calls[0][0];
    expect(exportScanCall.where.facilityId).toBe("facility-a");
    expect(exportScanCall.where.OR).toBeUndefined();
  });

  it("caps audited MAR rows at the MAR population so duplicate audit rows cannot exceed 100 percent", async () => {
    const prisma = {
      medicationAdministration: { count: jest.fn().mockResolvedValue(2) },
      order: { count: jest.fn().mockResolvedValue(0) },
      auditLog: {
        count: jest
          .fn()
          .mockResolvedValueOnce(5)
          .mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new AdminComplianceService(prisma as never);
    const result = await service.getDashboard("facility-a");
    expect(result.auditCoverage.mar).toEqual({ total: 2, audited: 2, percent: 100 });
  });
});
