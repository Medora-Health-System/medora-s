/**
 * Phase 6 — ROI workflow terminal-state guarantee.
 *
 * Confirms that a FULFILLED ChartRoiRequest cannot be mutated by any of the
 * lifecycle methods. The strict status guards in `ChartRoiService` already
 * implement this; these tests make the contract explicit so future refactors
 * cannot quietly relax it.
 */

import { ConflictException } from "@nestjs/common";
import {
  ChartRoiDeliveryMethod,
  ChartRoiRequestStatus,
  ChartRoiRequestType,
} from "@prisma/client";
import { ChartRoiService } from "./chart-roi.service";

function fulfilledRow() {
  return {
    id: "roi-1",
    facilityId: "fac-1",
    patientId: "pat-1",
    encounterId: "enc-1",
    requestedByUserId: "u-req",
    approvedByUserId: "u-admin",
    fulfilledByUserId: "u-admin",
    encounterChartExportId: "snap-1",
    requestType: ChartRoiRequestType.LEGAL,
    status: ChartRoiRequestStatus.FULFILLED,
    recipientName: null,
    recipientOrganization: null,
    deliveryMethod: ChartRoiDeliveryMethod.IN_PERSON_PICKUP,
    purpose: "court order",
    authorizationReference: null,
    denialReason: null,
    cancelledReason: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    approvedAt: new Date("2026-01-01T01:00:00.000Z"),
    fulfilledAt: new Date("2026-01-01T02:00:00.000Z"),
    cancelledAt: null,
    deniedAt: null,
  };
}

function makeService() {
  const row = fulfilledRow();
  const prisma = {
    chartRoiRequest: {
      findFirst: jest.fn().mockResolvedValue(row),
      update: jest.fn(),
    },
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const chartExport = {
    createSnapshot: jest.fn(),
    getSnapshot: jest.fn(),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = new ChartRoiService(prisma as any, audit as any, chartExport as any);
  return { service, prisma, audit, chartExport };
}

describe("ChartRoiService — FULFILLED is terminal", () => {
  it("approve on FULFILLED throws ConflictException and does not write or audit", async () => {
    const { service, prisma, audit } = makeService();
    await expect(service.approve("fac-1", "roi-1", "u-admin")).rejects.toBeInstanceOf(
      ConflictException
    );
    expect(prisma.chartRoiRequest.update).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it("deny on FULFILLED throws ConflictException and does not write or audit", async () => {
    const { service, prisma, audit } = makeService();
    await expect(service.deny("fac-1", "roi-1", "u-admin", "no")).rejects.toBeInstanceOf(
      ConflictException
    );
    expect(prisma.chartRoiRequest.update).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it("cancel on FULFILLED throws ConflictException and does not write or audit", async () => {
    const { service, prisma, audit } = makeService();
    await expect(
      service.cancel("fac-1", "roi-1", "u-admin", "withdrawn")
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.chartRoiRequest.update).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it("fulfill on FULFILLED throws ConflictException and does not call chart export service", async () => {
    const { service, prisma, audit, chartExport } = makeService();
    await expect(
      service.fulfill("fac-1", "roi-1", "u-admin", { snapshotId: "00000000-0000-0000-0000-000000000000" })
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.chartRoiRequest.update).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
    expect(chartExport.createSnapshot).not.toHaveBeenCalled();
  });
});

describe("ChartRoiService — DENIED is terminal", () => {
  function deniedRow() {
    return { ...fulfilledRow(), status: ChartRoiRequestStatus.DENIED };
  }
  function svc() {
    const row = deniedRow();
    const prisma = {
      chartRoiRequest: {
        findFirst: jest.fn().mockResolvedValue(row),
        update: jest.fn(),
      },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const chartExport = { createSnapshot: jest.fn(), getSnapshot: jest.fn() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new ChartRoiService(prisma as any, audit as any, chartExport as any);
    return { service, prisma, audit };
  }

  it("approve / deny / cancel / fulfill all throw ConflictException", async () => {
    {
      const { service, prisma } = svc();
      await expect(service.approve("fac-1", "roi-1", "u")).rejects.toBeInstanceOf(
        ConflictException
      );
      expect(prisma.chartRoiRequest.update).not.toHaveBeenCalled();
    }
    {
      const { service, prisma } = svc();
      await expect(service.deny("fac-1", "roi-1", "u", null)).rejects.toBeInstanceOf(
        ConflictException
      );
      expect(prisma.chartRoiRequest.update).not.toHaveBeenCalled();
    }
    {
      const { service, prisma } = svc();
      await expect(service.cancel("fac-1", "roi-1", "u", null)).rejects.toBeInstanceOf(
        ConflictException
      );
      expect(prisma.chartRoiRequest.update).not.toHaveBeenCalled();
    }
    {
      const { service, prisma } = svc();
      await expect(
        service.fulfill("fac-1", "roi-1", "u", { createSnapshotIfMissing: true })
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.chartRoiRequest.update).not.toHaveBeenCalled();
    }
  });
});

describe("ChartRoiService — CANCELLED is terminal", () => {
  function cancelledRow() {
    return { ...fulfilledRow(), status: ChartRoiRequestStatus.CANCELLED };
  }
  it("approve / deny / cancel / fulfill all throw ConflictException", async () => {
    const row = cancelledRow();
    const prisma = {
      chartRoiRequest: {
        findFirst: jest.fn().mockResolvedValue(row),
        update: jest.fn(),
      },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const chartExport = { createSnapshot: jest.fn(), getSnapshot: jest.fn() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new ChartRoiService(prisma as any, audit as any, chartExport as any);
    await expect(service.approve("fac-1", "roi-1", "u")).rejects.toBeInstanceOf(
      ConflictException
    );
    await expect(service.deny("fac-1", "roi-1", "u", null)).rejects.toBeInstanceOf(
      ConflictException
    );
    await expect(service.cancel("fac-1", "roi-1", "u", null)).rejects.toBeInstanceOf(
      ConflictException
    );
    await expect(
      service.fulfill("fac-1", "roi-1", "u", { createSnapshotIfMissing: true })
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.chartRoiRequest.update).not.toHaveBeenCalled();
  });
});
