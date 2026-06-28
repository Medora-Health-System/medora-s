import { BadRequestException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { EnterpriseOrderSetAnalyticsService } from "./enterprise-order-set-analytics.service";

describe("EnterpriseOrderSetAnalyticsService (MEDUI.ORDERSETS.ENTERPRISE_PHASE_3)", () => {
  const facilityId = "fac-1";
  const provenanceMeta = {
    enterpriseOrderSetCode: "ed_sepsis_v1",
    enterpriseOrderSetVersion: "1.0.0",
    enterpriseOrderSetCategory: "INFECTION",
    enterpriseOrderSetClinicalDomain: "sepsis",
    enterpriseOrderSetSelectedItemCount: 3,
    enterpriseOrderSetSkippedItemCount: 1,
    enterpriseOrderSetStructuredParameterSkippedCount: 0,
    enterpriseOrderSetPlacedItemKeys: ["lactate"],
    enterpriseOrderSetAppliedSurface: "CREATE_ORDER_MODAL",
    enterpriseOrderSetAppliedAt: "2026-06-23T12:00:00.000Z",
    type: "LAB",
  };

  const manualMeta = { type: "LAB", itemCount: 1 };

  function buildService(rows: Array<{
    id: string;
    createdAt: Date;
    userId: string | null;
    encounterId: string | null;
    orderId: string | null;
    metadata: unknown;
  }>) {
    const prisma = {
      auditLog: {
        findMany: jest.fn(async ({ take }: { take?: number }) => {
          if (take && take > 100) return rows;
          return rows.slice(0, (take ?? rows.length) - (take && rows.length >= take ? 0 : 0));
        }),
      },
      encounter: {
        findMany: jest.fn(async () => [{ id: "enc-1", type: "EMERGENCY" }]),
      },
      userRole: {
        findMany: jest.fn(async () => [{ userId: "usr-1", departmentId: "dept-1" }]),
      },
    };
    return new EnterpriseOrderSetAnalyticsService(prisma as never);
  }

  it("includes provenance-bearing audit events and excludes manual orders", async () => {
    const rows = [
      {
        id: "a1",
        createdAt: new Date("2026-06-23T12:00:00.000Z"),
        userId: "usr-1",
        encounterId: "enc-1",
        orderId: "ord-1",
        metadata: provenanceMeta,
      },
      {
        id: "a2",
        createdAt: new Date("2026-06-23T11:00:00.000Z"),
        userId: "usr-1",
        encounterId: "enc-1",
        orderId: "ord-2",
        metadata: manualMeta,
      },
    ];
    const service = buildService(rows);
    const res = await service.getAnalytics(facilityId, {
      from: "2026-06-23",
      to: "2026-06-23",
      limit: 50,
    });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]?.orderSetCode).toBe("ed_sepsis_v1");
    expect(res.summary.totalProvenanceOrders).toBe(1);
  });

  it("rejects invalid date range", async () => {
    const service = buildService([]);
    await expect(
      service.getAnalytics(facilityId, { from: "2026-06-24", to: "2026-06-23", limit: 50 })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns empty result safely", async () => {
    const service = buildService([]);
    const res = await service.getAnalytics(facilityId, { from: "2026-06-23", to: "2026-06-23", limit: 50 });
    expect(res.rows).toEqual([]);
    expect(res.summary.totalProvenanceOrders).toBe(0);
    expect(res.summary.totalApplications).toBe(0);
  });

  it("queries ORDER_CREATE audit action only via prisma where", async () => {
    const prisma = {
      auditLog: {
        findMany: jest.fn(async () => []),
      },
      encounter: { findMany: jest.fn(async () => []) },
      userRole: { findMany: jest.fn(async () => []) },
    };
    const service = new EnterpriseOrderSetAnalyticsService(prisma as never);
    await service.getAnalytics(facilityId, { from: "2026-06-23", to: "2026-06-23", limit: 10 });
    const findManyMock = prisma.auditLog.findMany as jest.Mock;
    const firstCall = findManyMock.mock.calls[0]?.[0] as
      | { where?: { action?: string; facilityId?: string } }
      | undefined;
    expect(firstCall?.where?.action).toBe(AuditAction.ORDER_CREATE);
    expect(firstCall?.where?.facilityId).toBe(facilityId);
  });
});
