/**
 * Phase 5G — ChartRoiService unit tests (state machine + audit + snapshot linking).
 */

import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { AuditAction, ChartRoiRequestStatus, ChartRoiRequestType } from "@prisma/client";
import { ChartRoiService } from "./chart-roi.service";

type AnyMock = jest.Mock;

function makePrismaMock() {
  const row = {
    id: "roi-1",
    facilityId: "fac-1",
    patientId: "pat-1",
    encounterId: "enc-1",
    requestedByUserId: "u-req",
    approvedByUserId: null as string | null,
    fulfilledByUserId: null as string | null,
    encounterChartExportId: null as string | null,
    requestType: ChartRoiRequestType.PATIENT_REQUEST,
    status: ChartRoiRequestStatus.DRAFT,
    recipientName: null,
    recipientOrganization: null,
    deliveryMethod: null,
    purpose: "Copy of chart for patient",
    authorizationReference: null,
    denialReason: null,
    cancelledReason: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    approvedAt: null as Date | null,
    fulfilledAt: null as Date | null,
    cancelledAt: null as Date | null,
    deniedAt: null as Date | null,
  };

  return {
    patient: { findFirst: jest.fn().mockResolvedValue({ id: "pat-1" }) },
    encounter: { findFirst: jest.fn().mockResolvedValue({ id: "enc-1" }) },
    chartRoiRequest: {
      create: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ ...row, ...data, id: "roi-new", createdAt: new Date() })
      ),
      findMany: jest.fn().mockResolvedValue([row]),
      findFirst: jest.fn().mockImplementation(({ where }: { where: { id?: string } }) => {
        if (where.id === "missing") return Promise.resolve(null);
        return Promise.resolve({ ...row });
      }),
      update: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ ...row, ...data })
      ),
    },
    encounterChartExport: {
      findFirst: jest.fn().mockResolvedValue({ id: "snap-1", encounterId: "enc-1" }),
    },
  };
}

function makeService(prisma: ReturnType<typeof makePrismaMock>) {
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const chartExport = {
    createSnapshot: jest.fn().mockResolvedValue({ id: "snap-created" }),
    getSnapshot: jest.fn().mockResolvedValue({
      manifest: { ok: true },
      row: { id: "snap-1" },
      html: "<html/>",
    }),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = new ChartRoiService(prisma as any, audit as any, chartExport as any);
  return { service, prisma, audit, chartExport };
}

describe("ChartRoiService", () => {
  it("create validates patient and encounter scope then audits ROI_REQUEST_CREATE", async () => {
    const prisma = makePrismaMock();
    const { service, audit } = makeService(prisma);

    const out = await service.create(
      "fac-1",
      {
        patientId: "pat-1",
        encounterId: "enc-1",
        requestType: ChartRoiRequestType.PATIENT_REQUEST,
        purpose: "Patient asked for records",
        recipientName: null,
        recipientOrganization: null,
        deliveryMethod: null,
        authorizationReference: null,
      },
      "u-req"
    );

    expect(out.id).toBe("roi-new");
    expect(prisma.patient.findFirst).toHaveBeenCalled();
    expect(prisma.encounter.findFirst).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.ROI_REQUEST_CREATE,
      "CHART_ROI_REQUEST",
      expect.objectContaining({
        metadata: expect.objectContaining({
          roiRequestId: "roi-new",
          patientId: "pat-1",
          encounterId: "enc-1",
          requestType: ChartRoiRequestType.PATIENT_REQUEST,
          status: ChartRoiRequestStatus.DRAFT,
        }),
      })
    );
    const metaJson = JSON.stringify((audit.log as AnyMock).mock.calls[0][2].metadata);
    expect(metaJson).not.toMatch(/Patient asked|MRN|John/);
  });

  it("approve transitions DRAFT to APPROVED and audits", async () => {
    const prisma = makePrismaMock();
    const draftRow = {
      id: "roi-1",
      facilityId: "fac-1",
      patientId: "pat-1",
      encounterId: "enc-1",
      requestedByUserId: "u-req",
      approvedByUserId: null,
      fulfilledByUserId: null,
      encounterChartExportId: null,
      requestType: ChartRoiRequestType.PATIENT_REQUEST,
      status: ChartRoiRequestStatus.DRAFT,
      recipientName: null,
      recipientOrganization: null,
      deliveryMethod: null,
      purpose: "p",
      authorizationReference: null,
      denialReason: null,
      cancelledReason: null,
      createdAt: new Date(),
      approvedAt: null,
      fulfilledAt: null,
      cancelledAt: null,
      deniedAt: null,
    };
    prisma.chartRoiRequest.findFirst = jest.fn().mockResolvedValue(draftRow);
    prisma.chartRoiRequest.update = jest.fn().mockResolvedValue({
      ...draftRow,
      status: ChartRoiRequestStatus.APPROVED,
      approvedByUserId: "u-admin",
      approvedAt: new Date(),
    });
    const { service, audit } = makeService(prisma);

    await service.approve("fac-1", "roi-1", "u-admin");

    expect(prisma.chartRoiRequest.update).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.ROI_REQUEST_APPROVE,
      "CHART_ROI_REQUEST",
      expect.any(Object)
    );
  });

  it("deny rejects non-DRAFT", async () => {
    const prisma = makePrismaMock();
    prisma.chartRoiRequest.findFirst = jest.fn().mockResolvedValue({
      id: "roi-1",
      facilityId: "fac-1",
      patientId: "pat-1",
      encounterId: null,
      requestedByUserId: "u",
      approvedByUserId: null,
      fulfilledByUserId: null,
      encounterChartExportId: null,
      requestType: ChartRoiRequestType.LEGAL,
      status: ChartRoiRequestStatus.APPROVED,
      recipientName: null,
      recipientOrganization: null,
      deliveryMethod: null,
      purpose: "x",
      authorizationReference: null,
      denialReason: null,
      cancelledReason: null,
      createdAt: new Date(),
      approvedAt: new Date(),
      fulfilledAt: null,
      cancelledAt: null,
      deniedAt: null,
    });
    const { service } = makeService(prisma);
    await expect(service.deny("fac-1", "roi-1", "u", null)).rejects.toBeInstanceOf(ConflictException);
  });

  it("fulfill links snapshot and calls createSnapshot when requested", async () => {
    const prisma = makePrismaMock();
    const approvedRow = {
      id: "roi-1",
      facilityId: "fac-1",
      patientId: "pat-1",
      encounterId: "enc-1",
      requestedByUserId: "u",
      approvedByUserId: "u2",
      fulfilledByUserId: null,
      encounterChartExportId: null,
      requestType: ChartRoiRequestType.INTERNAL_AUDIT,
      status: ChartRoiRequestStatus.APPROVED,
      recipientName: null,
      recipientOrganization: null,
      deliveryMethod: null,
      purpose: "audit",
      authorizationReference: null,
      denialReason: null,
      cancelledReason: null,
      createdAt: new Date(),
      approvedAt: new Date(),
      fulfilledAt: null,
      cancelledAt: null,
      deniedAt: null,
    };
    prisma.chartRoiRequest.findFirst = jest.fn().mockResolvedValue(approvedRow);
    prisma.chartRoiRequest.update = jest.fn().mockResolvedValue({
      ...approvedRow,
      status: ChartRoiRequestStatus.FULFILLED,
      encounterChartExportId: "snap-created",
      fulfilledByUserId: "u-admin",
      fulfilledAt: new Date(),
    });
    const { service, chartExport, audit } = makeService(prisma);

    const out = await service.fulfill("fac-1", "roi-1", "u-admin", {
      createSnapshotIfMissing: true,
    });

    expect(out.snapshotId).toBe("snap-created");
    expect(chartExport.createSnapshot).toHaveBeenCalledWith("fac-1", "enc-1", "u-admin", undefined, undefined);
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.ROI_REQUEST_FULFILL,
      "CHART_ROI_REQUEST",
      expect.objectContaining({ critical: true })
    );
  });

  it("fulfill with snapshotId verifies patient and optional encounter match", async () => {
    const prisma = makePrismaMock();
    prisma.chartRoiRequest.findFirst = jest.fn().mockResolvedValue({
      id: "roi-1",
      facilityId: "fac-1",
      patientId: "pat-1",
      encounterId: "enc-1",
      requestedByUserId: "u",
      approvedByUserId: "u2",
      fulfilledByUserId: null,
      encounterChartExportId: null,
      requestType: ChartRoiRequestType.INSURANCE,
      status: ChartRoiRequestStatus.APPROVED,
      recipientName: null,
      recipientOrganization: null,
      deliveryMethod: null,
      purpose: "insurance",
      authorizationReference: null,
      denialReason: null,
      cancelledReason: null,
      createdAt: new Date(),
      approvedAt: new Date(),
      fulfilledAt: null,
      cancelledAt: null,
      deniedAt: null,
    });
    prisma.encounterChartExport.findFirst = jest.fn().mockResolvedValue({
      id: "snap-1",
      encounterId: "enc-other",
    });
    const { service } = makeService(prisma);

    await expect(
      service.fulfill("fac-1", "roi-1", "u-admin", { snapshotId: "snap-1" })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("getFulfilledSnapshotDocument skips RECORD_EXPORT_VIEW and audits ROI_EXPORT_VIEW", async () => {
    const prisma = makePrismaMock();
    prisma.chartRoiRequest.findFirst = jest.fn().mockResolvedValue({
      id: "roi-1",
      facilityId: "fac-1",
      patientId: "pat-1",
      encounterId: "enc-1",
      requestedByUserId: "u",
      approvedByUserId: "u2",
      fulfilledByUserId: "u-admin",
      encounterChartExportId: "snap-1",
      requestType: ChartRoiRequestType.REGULATOR,
      status: ChartRoiRequestStatus.FULFILLED,
      recipientName: null,
      recipientOrganization: null,
      deliveryMethod: null,
      purpose: "reg",
      authorizationReference: null,
      denialReason: null,
      cancelledReason: null,
      createdAt: new Date(),
      approvedAt: new Date(),
      fulfilledAt: new Date(),
      cancelledAt: null,
      deniedAt: null,
    });
    prisma.encounterChartExport.findFirst = jest.fn().mockResolvedValue({
      encounterId: "enc-1",
    });
    const { service, chartExport, audit } = makeService(prisma);

    await service.getFulfilledSnapshotDocument("fac-1", "roi-1", "html", "u-admin");

    expect(chartExport.getSnapshot).toHaveBeenCalledWith(
      "fac-1",
      "enc-1",
      "snap-1",
      "html",
      "u-admin",
      undefined,
      undefined,
      { skipRecordExportViewAudit: true }
    );
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.ROI_EXPORT_VIEW,
      "CHART_ROI_REQUEST",
      expect.objectContaining({
        metadata: expect.objectContaining({
          roiRequestId: "roi-1",
          snapshotId: "snap-1",
          format: "html",
        }),
      })
    );
  });

  it("getOne returns 404 for wrong facility", async () => {
    const prisma = makePrismaMock();
    prisma.chartRoiRequest.findFirst = jest.fn().mockResolvedValue(null);
    const { service } = makeService(prisma);
    await expect(service.getOne("fac-1", "missing")).rejects.toBeInstanceOf(NotFoundException);
  });
});
