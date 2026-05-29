import { NotFoundException } from "@nestjs/common";
import { EncounterClinicalEventType } from "@prisma/client";
import { FORBIDDEN_PROCEDURE_BILLING_READINESS_KEYS } from "@medora/shared";
import { ProcedureBillingReadinessService } from "./procedure-billing-readiness.service";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ordersControllerSource = readFileSync(join(__dirname, "orders.controller.ts"), "utf8");

const hybridFacility = {
  billingLegalName: "Hospital Cardinale",
  billingAddressLine1: "1 Rue Main",
  billingCity: "Port-au-Prince",
  billingStateProvince: "Ouest",
  billingPostalCode: "6110",
  billingCountry: "Haiti",
  billingNpi: "1234567890",
  taxIdEin: "12-3456789",
};

const careOrderItem = {
  id: "oi1",
  status: "COMPLETED",
  enterpriseProcedureId: "endotracheal_intubation" as string | null,
  catalogItemType: "CARE",
  order: {
    type: "CARE",
    encounterId: "e1",
    encounter: {
      billingClassification: "EMERGENCY_DEPARTMENT",
      facility: hybridFacility,
    },
  },
};

describe("ProcedureBillingReadinessService (MEDPROC.5)", () => {
  function buildService(overrides?: {
    orderItem?: typeof careOrderItem | null;
    billingCatalogRow?: { id: string } | null;
    clinicalEvents?: Array<{ payloadJson: unknown }>;
  }) {
    const prisma = {
      orderItem: {
        findFirst: jest.fn().mockResolvedValue(
          overrides?.orderItem === null ? null : overrides?.orderItem ?? careOrderItem
        ),
        update: jest.fn(),
      },
      billingCatalog: {
        findFirst: jest.fn().mockResolvedValue(overrides?.billingCatalogRow ?? null),
        create: jest.fn(),
      },
      encounterClinicalEvent: {
        findMany: jest
          .fn()
          .mockResolvedValue(overrides?.clinicalEvents ?? [{ payloadJson: { procedureType: "INTUBATION" } }]),
        create: jest.fn(),
      },
      billingEvent: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    return { svc: new ProcedureBillingReadinessService(prisma as never), prisma };
  }

  it("readiness endpoint returns safe payload", async () => {
    const { svc } = buildService({
      billingCatalogRow: { id: "bc1" },
    });
    const result = await svc.getForOrderItem("f1", "oi1");
    expect(result.previewOnly).toBe(true);
    expect(result.enterpriseProcedureId).toBe("endotracheal_intubation");
    expect(result.defaultCodeCandidates[0]?.code).toBe("31500");
    expect(result.readinessStatus).toBe("REVIEW_REQUIRED");
  });

  it("missing order item returns 404", async () => {
    const { svc } = buildService({ orderItem: null });
    await expect(svc.getForOrderItem("f1", "missing")).rejects.toThrow(NotFoundException);
  });

  it("custom care order without enterpriseProcedureId returns NOT_APPLICABLE", async () => {
    const { svc } = buildService({
      orderItem: {
        ...careOrderItem,
        enterpriseProcedureId: null,
      },
    });
    const result = await svc.getForOrderItem("f1", "oi1");
    expect(result.readinessStatus).toBe("NOT_APPLICABLE");
    expect(result.reasons).toContain("MISSING_ENTERPRISE_PROCEDURE_ID");
  });

  it("no BillingEvent is created", async () => {
    const { svc, prisma } = buildService();
    await svc.getForOrderItem("f1", "oi1");
    expect(prisma.billingEvent.create).not.toHaveBeenCalled();
    expect(prisma.billingEvent.update).not.toHaveBeenCalled();
    expect(prisma.billingEvent.delete).not.toHaveBeenCalled();
  });

  it("no order status mutation occurs", async () => {
    const { svc, prisma } = buildService();
    await svc.getForOrderItem("f1", "oi1");
    expect(prisma.orderItem.update).not.toHaveBeenCalled();
  });

  it("no documentation event created", async () => {
    const { svc, prisma } = buildService();
    await svc.getForOrderItem("f1", "oi1");
    expect(prisma.encounterClinicalEvent.create).not.toHaveBeenCalled();
    expect(prisma.encounterClinicalEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          eventType: EncounterClinicalEventType.PROCEDURE_DOCUMENTED,
        }),
      })
    );
  });

  it("excludes PHI-heavy fields from payload", async () => {
    const { svc } = buildService();
    const result = await svc.getForOrderItem("f1", "oi1");
    for (const forbidden of FORBIDDEN_PROCEDURE_BILLING_READINESS_KEYS) {
      expect(result).not.toHaveProperty(forbidden);
    }
  });

  it("unauthorized roles are rejected at controller RBAC", () => {
    expect(ordersControllerSource).toContain("orders/items/:id/procedure-billing-readiness");
    const endpointBlock = ordersControllerSource.match(
      /@Get\("orders\/items\/:id\/procedure-billing-readiness"\)[\s\S]*?async getProcedureBillingReadiness/
    )?.[0];
    expect(endpointBlock).toBeTruthy();
    expect(endpointBlock).toContain("RoleCode.BILLING");
    expect(endpointBlock).toContain("RoleCode.ADMIN");
    expect(endpointBlock).toContain("RoleCode.PROVIDER");
    expect(endpointBlock).not.toContain("RoleCode.LAB");
    expect(endpointBlock).not.toContain("RoleCode.RN");
  });
});
