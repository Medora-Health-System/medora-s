/**
 * Phase 5G hardening — controller-level coverage for `ChartRoiController`.
 *
 * Exercises the controller class directly (no Nest TestingModule, no HTTP runtime, no DB)
 * with a mocked `ChartRoiService`. Covers:
 *  - RBAC metadata: every route requires exactly `[RoleCode.ADMIN]`
 *  - Facility ID resolution from `req.user.facilityId` then `x-facility-id` header
 *  - Missing facility → 400 BadRequestException, no service call
 *  - Service delegation (facilityId, userId, ip, user-agent) for create/list/get/approve/deny/cancel/fulfill
 *  - Status filter validation on `GET /roi-requests?status=...`
 *  - `snapshot-document` route: default JSON, explicit `?format=html` sets text/html, invalid format → 400
 *  - Service `NotFoundException` / `ConflictException` propagate
 */

import "reflect-metadata";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { ChartRoiRequestStatus, ChartRoiRequestType, RoleCode } from "@prisma/client";
import { ChartRoiController } from "./chart-roi.controller";

type AnyMock = jest.Mock;

function makeController(overrides?: Partial<Record<string, AnyMock>>) {
  const service = {
    create: jest.fn().mockResolvedValue({ id: "roi-new" }),
    list: jest.fn().mockResolvedValue({ items: [] }),
    getOne: jest.fn().mockResolvedValue({ id: "roi-1" }),
    approve: jest.fn().mockResolvedValue({ id: "roi-1", status: ChartRoiRequestStatus.APPROVED }),
    deny: jest.fn().mockResolvedValue({ id: "roi-1", status: ChartRoiRequestStatus.DENIED }),
    cancel: jest.fn().mockResolvedValue({ id: "roi-1", status: ChartRoiRequestStatus.CANCELLED }),
    fulfill: jest.fn().mockResolvedValue({
      request: { id: "roi-1", status: ChartRoiRequestStatus.FULFILLED },
      snapshotId: "snap-1",
      encounterId: "enc-1",
    }),
    getFulfilledSnapshotDocument: jest.fn().mockResolvedValue({
      manifest: { ok: true },
      row: { id: "snap-1" },
      html: "<!doctype html><html/>",
    }),
    ...(overrides ?? {}),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controller = new ChartRoiController(service as any);
  return { controller, service };
}

function makeReq(opts: {
  facilityIdHeader?: string | null;
  facilityIdJwt?: string | null;
  userId?: string;
  userAgent?: string;
  ip?: string;
} = {}) {
  const headers: Record<string, string> = {};
  if (opts.facilityIdHeader) headers["x-facility-id"] = opts.facilityIdHeader;
  if (opts.userAgent) headers["user-agent"] = opts.userAgent;
  const user: Record<string, unknown> = {};
  if (opts.userId) user.userId = opts.userId;
  if (opts.facilityIdJwt) user.facilityId = opts.facilityIdJwt;
  return {
    headers,
    user: Object.keys(user).length ? user : undefined,
    ip: opts.ip ?? "127.0.0.1",
  };
}

function makeRes() {
  const setHeader = jest.fn();
  return {
    res: { setHeader } as unknown as import("express").Response,
    setHeader,
  };
}

const handler = (name: keyof ChartRoiController) =>
  (ChartRoiController.prototype as unknown as Record<string, unknown>)[name as string];

describe("ChartRoiController — RBAC metadata", () => {
  it.each([
    ["create"],
    ["list"],
    ["getOne"],
    ["approve"],
    ["deny"],
    ["cancel"],
    ["fulfill"],
    ["getSnapshotDocument"],
  ] as const)("%s requires exactly [ADMIN]", (name) => {
    const roles = Reflect.getMetadata("roles", handler(name) as object) as RoleCode[];
    expect(roles).toEqual([RoleCode.ADMIN]);
  });
});

describe("ChartRoiController.create", () => {
  it("400s when neither x-facility-id nor jwt facilityId is present, no service call", async () => {
    const { controller, service } = makeController();
    const req = makeReq({ userId: "u-admin" });
    await expect(
      controller.create(
        {
          patientId: "11111111-1111-1111-1111-111111111111",
          requestType: ChartRoiRequestType.PATIENT_REQUEST,
          purpose: "p",
        },
        req
      )
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.create).not.toHaveBeenCalled();
  });

  it("400s on invalid payload (no patientId), no service call", async () => {
    const { controller, service } = makeController();
    const req = makeReq({ facilityIdHeader: "fac-1", userId: "u-admin" });
    await expect(controller.create({ purpose: "x" }, req)).rejects.toBeInstanceOf(
      BadRequestException
    );
    expect(service.create).not.toHaveBeenCalled();
  });

  it("delegates to service.create with facility from header, userId, ip, user-agent", async () => {
    const { controller, service } = makeController();
    const req = makeReq({
      facilityIdHeader: "fac-1",
      userId: "u-admin",
      userAgent: "ua-test",
      ip: "10.0.0.1",
    });
    const dto = {
      patientId: "11111111-1111-1111-1111-111111111111",
      requestType: ChartRoiRequestType.PATIENT_REQUEST,
      purpose: "patient asked for chart",
    };
    await controller.create(dto, req);
    expect(service.create).toHaveBeenCalledTimes(1);
    expect(service.create).toHaveBeenCalledWith(
      "fac-1",
      expect.objectContaining({
        patientId: dto.patientId,
        requestType: ChartRoiRequestType.PATIENT_REQUEST,
        purpose: "patient asked for chart",
      }),
      "u-admin",
      "10.0.0.1",
      "ua-test"
    );
  });

  it("prefers req.user.facilityId over x-facility-id header", async () => {
    const { controller, service } = makeController();
    const req = makeReq({
      facilityIdJwt: "fac-jwt",
      facilityIdHeader: "fac-header",
      userId: "u-admin",
    });
    await controller.create(
      {
        patientId: "11111111-1111-1111-1111-111111111111",
        requestType: ChartRoiRequestType.LEGAL,
        purpose: "court order",
      },
      req
    );
    expect((service.create as AnyMock).mock.calls[0][0]).toBe("fac-jwt");
  });
});

describe("ChartRoiController.list", () => {
  it("rejects unknown status filter with 400, no service call", async () => {
    const { controller, service } = makeController();
    const req = makeReq({ facilityIdHeader: "fac-1", userId: "u-admin" });
    await expect(controller.list("BOGUS", req)).rejects.toBeInstanceOf(BadRequestException);
    expect(service.list).not.toHaveBeenCalled();
  });

  it("normalises status to uppercase enum value", async () => {
    const { controller, service } = makeController();
    const req = makeReq({ facilityIdHeader: "fac-1", userId: "u-admin" });
    await controller.list("approved", req);
    expect(service.list).toHaveBeenCalledWith("fac-1", ChartRoiRequestStatus.APPROVED);
  });

  it("passes undefined when no status filter", async () => {
    const { controller, service } = makeController();
    const req = makeReq({ facilityIdHeader: "fac-1", userId: "u-admin" });
    await controller.list(undefined, req);
    expect(service.list).toHaveBeenCalledWith("fac-1", undefined);
  });

  it("400s when no facility context", async () => {
    const { controller, service } = makeController();
    const req = makeReq({ userId: "u-admin" });
    await expect(controller.list(undefined, req)).rejects.toBeInstanceOf(BadRequestException);
    expect(service.list).not.toHaveBeenCalled();
  });
});

describe("ChartRoiController.getOne", () => {
  it("400s when no facility context", async () => {
    const { controller, service } = makeController();
    const req = makeReq({ userId: "u-admin" });
    await expect(controller.getOne("roi-1", req)).rejects.toBeInstanceOf(BadRequestException);
    expect(service.getOne).not.toHaveBeenCalled();
  });

  it("delegates to service.getOne", async () => {
    const { controller, service } = makeController();
    const req = makeReq({ facilityIdHeader: "fac-1", userId: "u-admin" });
    await controller.getOne("roi-1", req);
    expect(service.getOne).toHaveBeenCalledWith("fac-1", "roi-1");
  });

  it("propagates NotFoundException from service", async () => {
    const { controller } = makeController({
      getOne: jest.fn().mockRejectedValue(new NotFoundException("ROI request not found")),
    });
    const req = makeReq({ facilityIdHeader: "fac-1", userId: "u-admin" });
    await expect(controller.getOne("missing", req)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("ChartRoiController.approve / deny / cancel / fulfill", () => {
  it("approve delegates with facility/user/ip/userAgent", async () => {
    const { controller, service } = makeController();
    const req = makeReq({
      facilityIdHeader: "fac-1",
      userId: "u-admin",
      userAgent: "ua",
      ip: "1.2.3.4",
    });
    await controller.approve("roi-1", req);
    expect(service.approve).toHaveBeenCalledWith("fac-1", "roi-1", "u-admin", "1.2.3.4", "ua");
  });

  it("deny delegates with parsed denialReason and trims whitespace via DTO", async () => {
    const { controller, service } = makeController();
    const req = makeReq({ facilityIdHeader: "fac-1", userId: "u-admin" });
    await controller.deny("roi-1", { denialReason: "  not authorised  " }, req);
    expect(service.deny).toHaveBeenCalledWith(
      "fac-1",
      "roi-1",
      "u-admin",
      "not authorised",
      "127.0.0.1",
      undefined
    );
  });

  it("deny accepts empty body (denialReason undefined)", async () => {
    const { controller, service } = makeController();
    const req = makeReq({ facilityIdHeader: "fac-1", userId: "u-admin" });
    await controller.deny("roi-1", {}, req);
    expect(service.deny).toHaveBeenCalledWith(
      "fac-1",
      "roi-1",
      "u-admin",
      undefined,
      "127.0.0.1",
      undefined
    );
  });

  it("deny 400s on schema violation (non-string denialReason), no service call", async () => {
    const { controller, service } = makeController();
    const req = makeReq({ facilityIdHeader: "fac-1", userId: "u-admin" });
    await expect(
      controller.deny("roi-1", { denialReason: 42 }, req)
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.deny).not.toHaveBeenCalled();
  });

  it("cancel delegates with parsed cancelledReason", async () => {
    const { controller, service } = makeController();
    const req = makeReq({ facilityIdHeader: "fac-1", userId: "u-admin" });
    await controller.cancel("roi-1", { cancelledReason: "patient withdrew" }, req);
    expect(service.cancel).toHaveBeenCalledWith(
      "fac-1",
      "roi-1",
      "u-admin",
      "patient withdrew",
      "127.0.0.1",
      undefined
    );
  });

  it("fulfill forwards raw body to service (service applies its own zod schema)", async () => {
    const { controller, service } = makeController();
    const req = makeReq({ facilityIdHeader: "fac-1", userId: "u-admin" });
    const body = { snapshotId: "11111111-1111-1111-1111-111111111111" };
    await controller.fulfill("roi-1", body, req);
    expect(service.fulfill).toHaveBeenCalledWith(
      "fac-1",
      "roi-1",
      "u-admin",
      body,
      "127.0.0.1",
      undefined
    );
  });

  it("approve propagates ConflictException from service", async () => {
    const { controller } = makeController({
      approve: jest.fn().mockRejectedValue(new ConflictException("Only DRAFT can be approved")),
    });
    const req = makeReq({ facilityIdHeader: "fac-1", userId: "u-admin" });
    await expect(controller.approve("roi-1", req)).rejects.toBeInstanceOf(ConflictException);
  });

  it("fulfill propagates NotFoundException from service", async () => {
    const { controller } = makeController({
      fulfill: jest.fn().mockRejectedValue(new NotFoundException("Snapshot not found")),
    });
    const req = makeReq({ facilityIdHeader: "fac-1", userId: "u-admin" });
    await expect(
      controller.fulfill("roi-1", { snapshotId: "11111111-1111-1111-1111-111111111111" }, req)
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("ChartRoiController.getSnapshotDocument", () => {
  it("returns { snapshot, manifest } and never sets text/html for default JSON", async () => {
    const { controller, service } = makeController();
    const { res, setHeader } = makeRes();
    const req = makeReq({ facilityIdHeader: "fac-1", userId: "u-admin" });

    const out = (await controller.getSnapshotDocument("roi-1", undefined, req, res)) as {
      snapshot: unknown;
      manifest: unknown;
    };

    expect(out).toEqual({ snapshot: { id: "snap-1" }, manifest: { ok: true } });
    expect(setHeader).not.toHaveBeenCalled();
    expect(service.getFulfilledSnapshotDocument).toHaveBeenCalledWith(
      "fac-1",
      "roi-1",
      "json",
      "u-admin",
      "127.0.0.1",
      undefined
    );
  });

  it("returns html string and sets Content-Type: text/html for ?format=html", async () => {
    const { controller, service } = makeController();
    const { res, setHeader } = makeRes();
    const req = makeReq({ facilityIdHeader: "fac-1", userId: "u-admin" });

    const out = await controller.getSnapshotDocument("roi-1", "HTML", req, res);

    expect(out).toBe("<!doctype html><html/>");
    expect(setHeader).toHaveBeenCalledWith("Content-Type", "text/html; charset=utf-8");
    expect(service.getFulfilledSnapshotDocument).toHaveBeenCalledWith(
      "fac-1",
      "roi-1",
      "html",
      "u-admin",
      "127.0.0.1",
      undefined
    );
  });

  it("rejects unsupported format with 400 and never calls service", async () => {
    const { controller, service } = makeController();
    const { res } = makeRes();
    const req = makeReq({ facilityIdHeader: "fac-1", userId: "u-admin" });
    await expect(
      controller.getSnapshotDocument("roi-1", "pdf", req, res)
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      controller.getSnapshotDocument("roi-1", "xml", req, res)
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.getFulfilledSnapshotDocument).not.toHaveBeenCalled();
  });

  it("400s without facility context and never calls service", async () => {
    const { controller, service } = makeController();
    const { res } = makeRes();
    const req = makeReq({ userId: "u-admin" });
    await expect(
      controller.getSnapshotDocument("roi-1", "json", req, res)
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.getFulfilledSnapshotDocument).not.toHaveBeenCalled();
  });

  it("propagates ConflictException for non-FULFILLED requests", async () => {
    const { controller } = makeController({
      getFulfilledSnapshotDocument: jest
        .fn()
        .mockRejectedValue(new ConflictException("ROI request is not fulfilled")),
    });
    const { res } = makeRes();
    const req = makeReq({ facilityIdHeader: "fac-1", userId: "u-admin" });
    await expect(
      controller.getSnapshotDocument("roi-1", "json", req, res)
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
