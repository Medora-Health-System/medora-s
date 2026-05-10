/**
 * Phase 5G hardening — controller-level coverage for `AdminRoiMonitoringController`.
 *
 * Confirms:
 *  - RBAC metadata: requires PLATFORM_OPERATOR_ROLES (MEDORA_SUPER_ADMIN), not facility ADMIN
 *  - Response shape is **aggregate-only**: only { byStatus, byFacility } with status / facilityId / count
 *  - Response never includes patientId, encounterId, snapshotId, recipientName, purpose, MRN, or clinical text
 *  - Audit log emits a single `VIEW` on entityType `ROI_MONITORING_SUMMARY` with PHI-safe metadata
 *    (`aggregate: true`, row counts only) and never copies the raw groupBy rows
 */

import "reflect-metadata";
import { AuditAction, ChartRoiRequestStatus, RoleCode } from "@prisma/client";
import { AdminRoiMonitoringController } from "./admin-roi-monitoring.controller";
import { PLATFORM_OPERATOR_ROLES } from "../common/auth/platform-operator-roles";

type AnyMock = jest.Mock;

function makeController() {
  const prisma = {
    chartRoiRequest: {
      groupBy: jest.fn(),
    },
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controller = new AdminRoiMonitoringController(prisma as any, audit as any);
  return { controller, prisma, audit };
}

describe("AdminRoiMonitoringController — RBAC metadata", () => {
  it("summary requires PLATFORM_OPERATOR_ROLES (MEDORA_SUPER_ADMIN)", () => {
    const handler = (AdminRoiMonitoringController.prototype as unknown as Record<string, unknown>)[
      "summary"
    ];
    const roles = Reflect.getMetadata("roles", handler as object) as RoleCode[];
    expect(roles).toEqual([...PLATFORM_OPERATOR_ROLES]);
    expect(roles).toEqual([RoleCode.MEDORA_SUPER_ADMIN]);
    expect(roles).not.toContain(RoleCode.ADMIN);
  });
});

describe("AdminRoiMonitoringController.summary — aggregate-only response", () => {
  it("returns only status/facilityId/count buckets and never patient/encounter/snapshot identifiers", async () => {
    const { controller, prisma, audit } = makeController();
    (prisma.chartRoiRequest.groupBy as AnyMock)
      .mockResolvedValueOnce([
        { status: ChartRoiRequestStatus.DRAFT, _count: { _all: 4 } },
        { status: ChartRoiRequestStatus.APPROVED, _count: { _all: 2 } },
        { status: ChartRoiRequestStatus.FULFILLED, _count: { _all: 1 } },
      ])
      .mockResolvedValueOnce([
        {
          facilityId: "fac-A",
          status: ChartRoiRequestStatus.DRAFT,
          _count: { _all: 3 },
        },
        {
          facilityId: "fac-B",
          status: ChartRoiRequestStatus.FULFILLED,
          _count: { _all: 1 },
        },
      ]);

    const req = {
      user: { userId: "u-super" },
      headers: { "user-agent": "ua" },
      ip: "10.0.0.5",
    };
    const out = (await controller.summary(req)) as {
      byStatus: { status: string; count: number }[];
      byFacility: { facilityId: string; status: string; count: number }[];
    };

    expect(out).toEqual({
      byStatus: [
        { status: ChartRoiRequestStatus.DRAFT, count: 4 },
        { status: ChartRoiRequestStatus.APPROVED, count: 2 },
        { status: ChartRoiRequestStatus.FULFILLED, count: 1 },
      ],
      byFacility: [
        { facilityId: "fac-A", status: ChartRoiRequestStatus.DRAFT, count: 3 },
        { facilityId: "fac-B", status: ChartRoiRequestStatus.FULFILLED, count: 1 },
      ],
    });

    expect(Object.keys(out).sort()).toEqual(["byFacility", "byStatus"]);
    for (const row of out.byStatus) {
      expect(Object.keys(row).sort()).toEqual(["count", "status"]);
    }
    for (const row of out.byFacility) {
      expect(Object.keys(row).sort()).toEqual(["count", "facilityId", "status"]);
    }

    const responseJson = JSON.stringify(out);
    for (const forbidden of [
      "patientId",
      "encounterId",
      "snapshotId",
      "encounterChartExportId",
      "recipientName",
      "recipientOrganization",
      "purpose",
      "denialReason",
      "cancelledReason",
      "MRN",
      "globalMrn",
      "dob",
      "firstName",
      "lastName",
      "diagnosis",
    ]) {
      expect(responseJson).not.toContain(forbidden);
    }

    expect(audit.log).toHaveBeenCalledTimes(1);
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.VIEW,
      "ROI_MONITORING_SUMMARY",
      expect.objectContaining({
        userId: "u-super",
        entityId: "aggregate",
        ip: "10.0.0.5",
        userAgent: "ua",
        metadata: {
          aggregate: true,
          rowCountByStatus: 3,
          rowCountByFacilityBucket: 2,
        },
      })
    );

    const auditMetaJson = JSON.stringify(
      (audit.log as AnyMock).mock.calls[0][2].metadata
    );
    for (const forbidden of [
      "patientId",
      "encounterId",
      "snapshotId",
      "recipientName",
      "purpose",
      "MRN",
      "fac-A",
      "fac-B",
    ]) {
      expect(auditMetaJson).not.toContain(forbidden);
    }
  });

  it("requests groupBy with the documented aggregations only (no row-level reads)", async () => {
    const { controller, prisma } = makeController();
    (prisma.chartRoiRequest.groupBy as AnyMock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const req = { user: { userId: "u-super" }, headers: {}, ip: "::1" };
    await controller.summary(req);

    expect(prisma.chartRoiRequest.groupBy).toHaveBeenCalledTimes(2);
    expect(prisma.chartRoiRequest.groupBy).toHaveBeenCalledWith({
      by: ["status"],
      _count: { _all: true },
    });
    expect(prisma.chartRoiRequest.groupBy).toHaveBeenCalledWith({
      by: ["facilityId", "status"],
      _count: { _all: true },
    });
  });

  it("handles empty data sets without leaking", async () => {
    const { controller, prisma } = makeController();
    (prisma.chartRoiRequest.groupBy as AnyMock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const out = await controller.summary({
      user: { userId: "u-super" },
      headers: {},
      ip: "::1",
    });
    expect(out).toEqual({ byStatus: [], byFacility: [] });
  });
});
