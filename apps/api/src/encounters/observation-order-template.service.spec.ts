/**
 * Phase 13E / 14D — observation order template apply service (provider/admin, INPATIENT OPEN,
 * delegates to OrdersService.create; supplementary ORDERS_CREATED audit metadata PHI-safe).
 */

import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { AuditAction, RoleCode } from "@prisma/client";
import { OBSERVATION_ORDER_TEMPLATE_ITEMS } from "@medora/shared";
import { ObservationOrderTemplateService } from "./observation-order-template.service";

type AnyMock = jest.Mock;

function buildPrismaMock(opts: {
  encounter?: Record<string, unknown> | null;
  userRoles?: Array<{ role: { code: RoleCode } | null }>;
  user?: { firstName: string; lastName: string; billingNameOverride: string | null; billingNpi: string | null } | null;
  existingObservationTemplateOrders?: Array<{
    id: string;
    items: Array<{ manualLabel: string | null; status: string; lifecycleState: string }>;
  }>;
}) {
  const encounter =
    opts.encounter === null
      ? null
      : {
          id: "enc-1",
          facilityId: "fac-1",
          patientId: "pat-1",
          type: "INPATIENT",
          status: "OPEN",
          workflowState: "IN_TREATMENT",
          providerDocumentationStatus: null,
          ...(opts.encounter ?? {}),
        };

  return {
    encounter: { findFirst: jest.fn().mockResolvedValue(encounter) },
    order: {
      findMany: jest.fn().mockResolvedValue(opts.existingObservationTemplateOrders ?? []),
    },
    userRole: {
      findMany: jest.fn().mockResolvedValue(opts.userRoles ?? [{ role: { code: RoleCode.PROVIDER } }]),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(
        opts.user ?? {
          firstName: "A",
          lastName: "B",
          billingNameOverride: null,
          billingNpi: null,
        }
      ),
    },
  } as unknown;
}

function buildOrdersMock() {
  return {
    create: jest.fn().mockResolvedValue({ id: "order-new-1", type: "CARE", items: [] }),
  };
}

function buildAuditMock() {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

describe("ObservationOrderTemplateService", () => {
  it("applies template via OrdersService.create and audits ORDERS_CREATED with PHI-safe metadata", async () => {
    const prisma = buildPrismaMock({});
    const orders = buildOrdersMock();
    const audit = buildAuditMock();
    const svc = new ObservationOrderTemplateService(prisma as never, orders as never, audit as never);

    const out = await svc.apply(
      "enc-1",
      "fac-1",
      { selectedItemIds: ["mon_vitals_q2h", "com_diet_ad_lib"] },
      "user-1",
      "127.0.0.1",
      "jest"
    );

    expect(out.order).toBeTruthy();
    expect(out.summary?.createdCount).toBe(2);
    expect(orders.create).toHaveBeenCalledTimes(2);
    expect((prisma as { order: { findMany: AnyMock } }).order.findMany).toHaveBeenCalled();
    const createArgs = (orders.create as AnyMock).mock.calls[0]!;
    expect(createArgs[0]).toBe("enc-1");
    expect(createArgs[1]).toBe("fac-1");
    expect(createArgs[2].type).toBe("CARE");
    expect(createArgs[2].items.length).toBe(1);
    expect(createArgs[2].observationTemplateItemId).toBe("mon_vitals_q2h");
    expect(createArgs[2].items[0]?.manualLabel).toMatch(/Signes vitaux|Vital signs/i);
    expect(createArgs[3]).toBe("user-1");

    expect(audit.log).toHaveBeenCalled();
    const ordersCreated = (audit.log as AnyMock).mock.calls.find((c) => c[0] === AuditAction.ORDERS_CREATED);
    expect(ordersCreated).toBeTruthy();
    const meta = ordersCreated![2].metadata as Record<string, unknown>;
    expect(meta.source).toBe("OBSERVATION_ORDER_SET");
    expect(meta.createdCount).toBe(2);
    expect(Array.isArray(meta.selectedItemIds)).toBe(true);
    expect(meta.skippedDuplicateItemIds).toEqual([]);
    const blob = JSON.stringify(meta).toLowerCase();
    expect(blob).not.toContain("jean");
    expect(blob).not.toContain("mrn");
  });

  it("uses English CARE line labels when orderLabelLocale is en", async () => {
    const prisma = buildPrismaMock({});
    const orders = buildOrdersMock();
    const audit = buildAuditMock();
    const svc = new ObservationOrderTemplateService(prisma as never, orders as never, audit as never);

    await svc.apply(
      "enc-1",
      "fac-1",
      { selectedItemIds: ["mon_vitals_q2h"] },
      "user-1",
      "127.0.0.1",
      "jest",
      { orderLabelLocale: "en" }
    );

    const createArgs = (orders.create as AnyMock).mock.calls[0]!;
    expect(String(createArgs[2].items[0]?.manualLabel)).toContain("Vital signs every 2 hours");
  });

  it("uses English CARE line labels when orderLabelLocale is unsupported", async () => {
    const prisma = buildPrismaMock({});
    const orders = buildOrdersMock();
    const audit = buildAuditMock();
    const svc = new ObservationOrderTemplateService(prisma as never, orders as never, audit as never);

    await svc.apply(
      "enc-1",
      "fac-1",
      { selectedItemIds: ["mon_vitals_q2h"] },
      "user-1",
      "127.0.0.1",
      "jest",
      { orderLabelLocale: "es" }
    );

    const createArgs = (orders.create as AnyMock).mock.calls[0]!;
    expect(String(createArgs[2].items[0]?.manualLabel)).toContain("Vital signs every 2 hours");
    expect(String(createArgs[2].items[0]?.manualLabel)).not.toMatch(/Signes vitaux/);
  });

  it("partial second apply creates only missing template lines (Phase 14D)", async () => {
    const vitalsFr = OBSERVATION_ORDER_TEMPLATE_ITEMS.find((i) => i.id === "mon_vitals_q2h")!.manualLabelFr;
    const prisma = buildPrismaMock({
      existingObservationTemplateOrders: [
        {
          id: "ord-existing",
          items: [{ manualLabel: vitalsFr, status: "PENDING", lifecycleState: "ORDERED" }],
        },
      ],
    });
    const orders = buildOrdersMock();
    const audit = buildAuditMock();
    const svc = new ObservationOrderTemplateService(prisma as never, orders as never, audit as never);

    const out = await svc.apply(
      "enc-1",
      "fac-1",
      { selectedItemIds: ["mon_vitals_q2h", "com_diet_ad_lib"] },
      "user-1",
      "127.0.0.1",
      "jest"
    );

    expect(out.summary?.skippedDuplicateItemIds).toEqual(["mon_vitals_q2h"]);
    expect(out.summary?.createdCount).toBe(1);
    expect(orders.create).toHaveBeenCalledTimes(1);
    const createArgs = (orders.create as AnyMock).mock.calls[0]!;
    expect(createArgs[2].items).toHaveLength(1);
    expect(createArgs[2].observationTemplateItemId).toBe("com_diet_ad_lib");
    expect(createArgs[2].items[0]?.manualLabel).toMatch(/Régime alimentaire|Diet as tolerated/i);

    const ordersCreated = (audit.log as AnyMock).mock.calls.find((c) => c[0] === AuditAction.ORDERS_CREATED);
    const meta = ordersCreated![2].metadata as Record<string, unknown>;
    expect(meta.appliedItemIds).toEqual(["com_diet_ad_lib"]);
    expect(meta.skippedDuplicateItemIds).toEqual(["mon_vitals_q2h"]);
  });

  it("returns noop summary when all selected lines already exist (Phase 14D)", async () => {
    const vitalsFr = OBSERVATION_ORDER_TEMPLATE_ITEMS.find((i) => i.id === "mon_vitals_q2h")!.manualLabelFr;
    const dietFr = OBSERVATION_ORDER_TEMPLATE_ITEMS.find((i) => i.id === "com_diet_ad_lib")!.manualLabelFr;
    const prisma = buildPrismaMock({
      existingObservationTemplateOrders: [
        {
          id: "ord-existing",
          items: [
            { manualLabel: vitalsFr, status: "PENDING", lifecycleState: "ORDERED" },
            { manualLabel: dietFr, status: "PENDING", lifecycleState: "ORDERED" },
          ],
        },
      ],
    });
    const orders = buildOrdersMock();
    const audit = buildAuditMock();
    const svc = new ObservationOrderTemplateService(prisma as never, orders as never, audit as never);

    const out = await svc.apply(
      "enc-1",
      "fac-1",
      { selectedItemIds: ["mon_vitals_q2h", "com_diet_ad_lib"] },
      "user-1",
      "127.0.0.1",
      "jest"
    );

    expect(out.order).toBeNull();
    expect(out.summary?.allAlreadyPresent).toBe(true);
    expect(out.summary?.createdCount).toBe(0);
    expect(orders.create).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it("rejects unknown template ids", async () => {
    const prisma = buildPrismaMock({});
    const orders = buildOrdersMock();
    const audit = buildAuditMock();
    const svc = new ObservationOrderTemplateService(prisma as never, orders as never, audit as never);

    await expect(
      svc.apply("enc-1", "fac-1", { selectedItemIds: ["not_a_real_id"] }, "user-1")
    ).rejects.toThrow(/Unknown or unsupported template line ids/i);
    expect(orders.create).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it("rejects non-INPATIENT encounter", async () => {
    const prisma = buildPrismaMock({ encounter: { type: "EMERGENCY" } });
    const orders = buildOrdersMock();
    const audit = buildAuditMock();
    const svc = new ObservationOrderTemplateService(prisma as never, orders as never, audit as never);

    await expect(
      svc.apply("enc-1", "fac-1", { selectedItemIds: ["mon_vitals_q2h"] }, "user-1")
    ).rejects.toThrow(/applies only to inpatient/i);
    expect(orders.create).not.toHaveBeenCalled();
  });

  it("rejects closed encounter (status)", async () => {
    const prisma = buildPrismaMock({ encounter: { status: "CLOSED" } });
    const orders = buildOrdersMock();
    const audit = buildAuditMock();
    const svc = new ObservationOrderTemplateService(prisma as never, orders as never, audit as never);

    await expect(
      svc.apply("enc-1", "fac-1", { selectedItemIds: ["mon_vitals_q2h"] }, "user-1")
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(orders.create).not.toHaveBeenCalled();
  });

  it("rejects signed provider documentation", async () => {
    const prisma = buildPrismaMock({ encounter: { providerDocumentationStatus: "SIGNED" } });
    const orders = buildOrdersMock();
    const audit = buildAuditMock();
    const svc = new ObservationOrderTemplateService(prisma as never, orders as never, audit as never);

    await expect(
      svc.apply("enc-1", "fac-1", { selectedItemIds: ["mon_vitals_q2h"] }, "user-1")
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(orders.create).not.toHaveBeenCalled();
  });

  it("rejects RN-only caller", async () => {
    const prisma = buildPrismaMock({
      userRoles: [{ role: { code: RoleCode.RN } }],
    });
    const orders = buildOrdersMock();
    const audit = buildAuditMock();
    const svc = new ObservationOrderTemplateService(prisma as never, orders as never, audit as never);

    await expect(
      svc.apply("enc-1", "fac-1", { selectedItemIds: ["mon_vitals_q2h"] }, "user-1")
    ).rejects.toThrow(/Only physicians or administrators/i);
    expect(orders.create).not.toHaveBeenCalled();
  });

  it("returns NotFound when encounter missing", async () => {
    const prisma = buildPrismaMock({ encounter: null });
    const orders = buildOrdersMock();
    const audit = buildAuditMock();
    const svc = new ObservationOrderTemplateService(prisma as never, orders as never, audit as never);

    await expect(
      svc.apply("missing", "fac-1", { selectedItemIds: ["mon_vitals_q2h"] }, "user-1")
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(orders.create).not.toHaveBeenCalled();
  });
});
