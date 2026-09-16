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
