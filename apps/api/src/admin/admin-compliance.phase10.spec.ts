import { AuditAction } from "@prisma/client";
import { AdminComplianceService } from "./admin-compliance.service";

describe("Administration Phase 10 compliance integrity", () => {
  it("uses Prisma relation predicates for MAR audit completeness and exact facility export evidence", async () => {
    const medicationAdministration = { count: jest.fn().mockResolvedValueOnce(4).mockResolvedValueOnce(3) };
    const order = { count: jest.fn().mockResolvedValueOnce(5).mockResolvedValueOnce(5) };
    const auditLog = {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    };
    const prisma = { medicationAdministration, order, auditLog };
    const service = new AdminComplianceService(prisma as never);

    const result = await service.getDashboard("facility-a");

    expect(medicationAdministration.count).toHaveBeenNthCalledWith(2, {
      where: {
        facilityId: "facility-a",
        createdAt: expect.any(Object),
        auditLogs: {
          some: {
            action: AuditAction.CREATE,
            entityType: "MEDICATION_ADMINISTRATION",
            facilityId: "facility-a",
          },
        },
      },
    });
    expect(result.auditCoverage.mar).toEqual({ total: 4, audited: 3, percent: 75 });

    const exportCountCall = auditLog.count.mock.calls[0][0];
    expect(exportCountCall.where.facilityId).toBe("facility-a");
    expect(exportCountCall.where.OR).toBeUndefined();

    const exportScanCall = auditLog.findMany.mock.calls[0][0];
    expect(exportScanCall.where.facilityId).toBe("facility-a");
    expect(exportScanCall.where.OR).toBeUndefined();
  });
});
