import { ConflictException } from "@nestjs/common";
import { ChartRoiRequestStatus } from "@prisma/client";
import { ChartRoiService } from "./chart-roi.service";

const baseRow = {
  id: "roi-1",
  facilityId: "facility-a",
  patientId: "patient-a",
  encounterId: "enc-a",
  requestedByUserId: "requester",
  approvedByUserId: null,
  fulfilledByUserId: null,
  encounterChartExportId: null,
  requestType: "PATIENT",
  status: ChartRoiRequestStatus.DRAFT,
  recipientName: null,
  recipientOrganization: null,
  deliveryMethod: null,
  purpose: "care",
  authorizationReference: null,
  denialReason: null,
  cancelledReason: null,
  createdAt: new Date(),
  approvedAt: null,
  fulfilledAt: null,
  cancelledAt: null,
  deniedAt: null,
};

describe("ROI transactional state integrity", () => {
  it("approves with an exact facility + expected-status compare-and-set", async () => {
    const prisma = {
      chartRoiRequest: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(baseRow)
          .mockResolvedValueOnce({ ...baseRow, status: ChartRoiRequestStatus.APPROVED }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new ChartRoiService(prisma as never, audit as never, {} as never);

    await service.approve("facility-a", "roi-1", "admin-a");

    expect(prisma.chartRoiRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "roi-1",
          facilityId: "facility-a",
          status: ChartRoiRequestStatus.DRAFT,
        },
      }),
    );
  });

  it("fails closed when another actor wins the ROI transition race", async () => {
    const prisma = {
      chartRoiRequest: {
        findFirst: jest.fn().mockResolvedValue(baseRow),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const audit = { log: jest.fn() };
    const service = new ChartRoiService(prisma as never, audit as never, {} as never);

    await expect(service.approve("facility-a", "roi-1", "admin-a")).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(audit.log).not.toHaveBeenCalled();
  });

  it("cannot cancel an ROI after a concurrent fulfillment changed APPROVED", async () => {
    const approved = { ...baseRow, status: ChartRoiRequestStatus.APPROVED };
    const prisma = {
      chartRoiRequest: {
        findFirst: jest.fn().mockResolvedValue(approved),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const audit = { log: jest.fn() };
    const service = new ChartRoiService(prisma as never, audit as never, {} as never);

    await expect(
      service.cancel("facility-a", "roi-1", "admin-a", "duplicate"),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(audit.log).not.toHaveBeenCalled();
  });
});
