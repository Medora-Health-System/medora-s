import { AdminExportMonitoringService } from "./admin-export-monitoring.service";
import { SystemHealthService } from "./system-health.service";

describe("Administration Phase 9 facility-local observability", () => {
  it("scopes every export-monitoring audit query to the selected facility", async () => {
    const auditLog = {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    };
    const prisma = { auditLog, user: { findMany: jest.fn().mockResolvedValue([]) } };
    const service = new AdminExportMonitoringService(prisma as never);
    await service.getExportMonitoring("facility-a", { filter: "all" } as never);

    for (const call of auditLog.findMany.mock.calls) {
      expect(call[0].where.facilityId).toBe("facility-a");
      expect(call[0].where.OR).toBeUndefined();
    }
  });

  it("scopes system-health export evidence to the selected facility", async () => {
    const auditLog = {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    };
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ "?column?": 1 }]),
      auditLog,
    };
    const httpMetrics = { countRecent: jest.fn().mockReturnValue(0) };
    const backup = { getSnapshot: jest.fn().mockReturnValue({ status: "ready", generatedAt: new Date().toISOString() }) };
    const service = new SystemHealthService(prisma as never, httpMetrics as never, backup as never);

    await service.getSnapshot("facility-a");

    expect(auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ facilityId: "facility-a" }),
      }),
    );
    const exportWhere = auditLog.findMany.mock.calls[0][0].where;
    expect(exportWhere.OR).toBeUndefined();
  });
});
