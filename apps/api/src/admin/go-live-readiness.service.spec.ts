import { GoLiveReadinessService } from "./go-live-readiness.service";

describe("Administration Phase 4 go-live query isolation", () => {
  it("constrains every AuditLog readiness dependency to the selected facility", async () => {
    const facilityId = "facility-a";
    const auditFindFirst = jest.fn().mockResolvedValue(null);
    const auditFindMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      encounter: { findMany: jest.fn().mockResolvedValue([]) },
      auditLog: { findFirst: auditFindFirst, findMany: auditFindMany },
    };
    const reports = {
      doorToProviderJson: jest.fn().mockResolvedValue({ rows: [] }),
      doorToDoorJson: jest.fn().mockResolvedValue({ rows: [] }),
      medicationAdministrationJson: jest.fn().mockResolvedValue({ rows: [] }),
    };
    const service = new GoLiveReadinessService(prisma as never, reports as never);

    const snapshot = await service.getSnapshot(facilityId);

    expect(snapshot.facilityId).toBe(facilityId);
    expect(auditFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ facilityId }) }),
    );
    expect(auditFindMany).toHaveBeenCalledTimes(2);
    for (const [args] of auditFindMany.mock.calls) {
      expect(args.where.facilityId).toBe(facilityId);
    }
    expect(reports.doorToProviderJson).toHaveBeenCalledWith(facilityId, expect.any(Object));
    expect(reports.doorToDoorJson).toHaveBeenCalledWith(facilityId, expect.any(Object));
    expect(reports.medicationAdministrationJson).toHaveBeenCalledWith(facilityId, expect.any(Object));
  });
});
