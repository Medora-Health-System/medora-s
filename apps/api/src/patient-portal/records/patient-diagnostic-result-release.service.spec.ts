import { NotFoundException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { PatientDiagnosticResultReleaseService } from "./patient-diagnostic-result-release.service";

describe("PatientDiagnosticResultReleaseService", () => {
  const actor = { userId: "staff-a", facilityId: "facility-a" };

  function build(item: { id: string; order: { patientId: string; facilityId: string } } | null = {
    id: "item-a",
    order: { patientId: "patient-a", facilityId: "facility-a" },
  }) {
    const tx = { $executeRaw: jest.fn().mockResolvedValue(1) };
    const prisma = {
      order: { findMany: jest.fn().mockResolvedValue([]) },
      $queryRaw: jest.fn().mockResolvedValue([]),
      orderItem: { findFirst: jest.fn().mockResolvedValue(item) },
      $transaction: jest.fn(async (callback: any) => callback(tx)),
    } as any;
    const audit = { log: jest.fn().mockResolvedValue(undefined) } as any;
    return {
      prisma,
      audit,
      service: new PatientDiagnosticResultReleaseService(prisma, audit),
    };
  }

  it("lists verified diagnostics only for the actor facility", async () => {
    const { prisma, service } = build();
    await service.list(actor);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { facilityId: "facility-a", cancelledAt: null },
      }),
    );
  });

  it("keeps listing verified results when optional release storage is missing", async () => {
    const { prisma, service } = build();
    prisma.order.findMany.mockResolvedValue([
      {
        id: "order-a",
        patientId: "patient-a",
        encounterId: "enc-a",
        prescriberName: "Dr A",
        orderedBy: "staff-a",
        items: [
          {
            id: "item-a",
            catalogItemType: "LAB_TEST",
            manualLabel: "CBC",
            documentedCollectedAt: null,
            effectiveCollectedAt: null,
            result: { criticalValue: false, resultText: "ok", verifiedAt: new Date(), effectiveResultedAt: new Date(), effectiveFinalizedAt: null },
          },
        ],
      },
    ]);
    prisma.$queryRaw.mockRejectedValue({ code: "P2010", message: 'relation "PatientDiagnosticResultRelease" does not exist' });
    const listed = await service.list(actor, "patient-a");
    expect(listed).toEqual([expect.objectContaining({ id: "item-a", patientId: "patient-a", released: false })]);
  });

  it("releases with an explicit audited RELEASE operation", async () => {
    const { audit, service } = build();
    const result = await service.release("item-a", actor);
    expect(result).toEqual(
      expect.objectContaining({ released: true, facilityId: "facility-a", orderItemId: "item-a" }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.UPDATE,
      "PATIENT_DIAGNOSTIC_RESULT_RELEASE",
      expect.objectContaining({
        critical: true,
        userId: "staff-a",
        facilityId: "facility-a",
        patientId: "patient-a",
        metadata: { operation: "RELEASE" },
      }),
    );
  });

  it("revokes with an explicit audited REVOKE operation", async () => {
    const { audit, service } = build();
    const result = await service.revoke("item-a", actor);
    expect(result).toEqual(
      expect.objectContaining({ released: false, facilityId: "facility-a", orderItemId: "item-a" }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.UPDATE,
      "PATIENT_DIAGNOSTIC_RESULT_RELEASE",
      expect.objectContaining({
        critical: true,
        userId: "staff-a",
        facilityId: "facility-a",
        patientId: "patient-a",
        metadata: { operation: "REVOKE" },
      }),
    );
  });

  it("audits VIEW, DOWNLOAD, and PRINT of a facility-scoped result", async () => {
    const { prisma, audit, service } = build();
    prisma.orderItem.findFirst.mockResolvedValue({
      id: "item-a",
      catalogItemType: "LAB_TEST",
      manualLabel: "CMP",
      documentedCollectedAt: new Date("2026-09-15T13:00:00.000Z"),
      effectiveCollectedAt: null,
      order: { id: "order-a", patientId: "patient-a", encounterId: null, facilityId: "facility-a", prescriberName: "Dr Jean" },
      result: {
        criticalValue: false,
        resultText: "Glucose 96",
        resultData: { schemaVersion: "medora.clinicalResult.v1", resultType: "LAB", observations: [] },
        verifiedAt: new Date("2026-09-15T13:54:00.000Z"),
        effectiveResultedAt: new Date("2026-09-15T13:54:00.000Z"),
        effectiveFinalizedAt: null,
        verifiedByUserId: null,
        acknowledgedByUserId: null,
        acknowledgedByProviderAt: null,
      },
    });
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.auditLog = { findMany: jest.fn().mockResolvedValue([]) };
    prisma.user = { findMany: jest.fn() };
    const viewed = await service.get("item-a", actor, "DOWNLOAD");
    expect(viewed.patientId).toBe("patient-a");
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.VIEW,
      "PATIENT_DIAGNOSTIC_RESULT_RELEASE",
      expect.objectContaining({
        facilityId: "facility-a",
        patientId: "patient-a",
        metadata: { operation: "DOWNLOAD" },
      }),
    );
  });

  it("does not release a result from another facility", async () => {
    const { prisma, audit, service } = build(null);
    await expect(service.release("foreign-item", actor)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.orderItem.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          order: expect.objectContaining({ facilityId: "facility-a" }),
        }),
      }),
    );
    expect(audit.log).not.toHaveBeenCalled();
  });
});
