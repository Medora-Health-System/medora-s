import { PatientDashboardService } from "./patient-dashboard.service";

describe("PatientDashboardService", () => {
  const access = {
    portalAccountId: "account-a",
    sessionId: "session-a",
    patientId: "patient-a",
    facilityId: "facility-a",
  };

  it("scopes appointments, visits and results to the authorized patient + facility", async () => {
    const prisma = {
      facility: { findFirst: jest.fn().mockResolvedValue(null) },
      appointment: { findFirst: jest.fn().mockResolvedValue(null) },
      encounter: { findFirst: jest.fn().mockResolvedValue(null) },
      order: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new PatientDashboardService(prisma, audit);

    await service.get(access, {});

    expect(prisma.appointment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          facilityId: "facility-a",
          patientId: "patient-a",
        }),
      })
    );
    expect(prisma.encounter.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { facilityId: "facility-a", patientId: "patient-a" },
      })
    );
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { facilityId: "facility-a", patientId: "patient-a", cancelledAt: null },
      })
    );
  });

  it("does not surface unverified diagnostic results", async () => {
    const prisma = {
      facility: { findFirst: jest.fn().mockResolvedValue(null) },
      appointment: { findFirst: jest.fn().mockResolvedValue(null) },
      encounter: { findFirst: jest.fn().mockResolvedValue(null) },
      order: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "order-a",
            encounterId: "enc-a",
            createdAt: new Date(),
            items: [
              {
                id: "lab-a",
                catalogItemType: "LAB_TEST",
                manualLabel: "CBC",
                result: {
                  verifiedAt: null,
                  criticalValue: true,
                  effectiveResultedAt: null,
                  effectiveFinalizedAt: null,
                },
              },
            ],
          },
        ]),
      },
    } as any;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new PatientDashboardService(prisma, audit);

    const result = await service.get(access, {});
    expect(result.recentResults).toEqual([]);
  });
});
