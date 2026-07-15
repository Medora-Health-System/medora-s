/**
 * Ensures order creation and ORDER_CREATE audit are atomic: audit failure must not leave an Order row.
 */
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { randomBytes } from "crypto";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";
import { OrdersService } from "./orders.service";
import { AuditService } from "../common/services/audit.service";
import { EncounterStatus, EncounterType } from "@prisma/client";
import { applyE2eAuthTestEnv } from "../test-utils/e2e-auth-env";
import { closeE2eApp, createE2eApp } from "../test-utils/e2e-app";

describe("OrdersService create — audit atomicity (e2e)", () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let ordersService: OrdersService;

  const suffix = randomBytes(4).toString("hex");

  beforeAll(async () => {
    applyE2eAuthTestEnv();
    /** Default for CI: audit failures inside $transaction must propagate (see AuditService). */
    process.env.AUDIT_FAILURE_MODE = process.env.AUDIT_FAILURE_MODE ?? "best_effort";

    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = await createE2eApp(moduleRef);

    prisma = moduleRef.get<PrismaService>(PrismaService);
    ordersService = moduleRef.get<OrdersService>(OrdersService);
  });

  afterAll(async () => {
    await closeE2eApp({ app, moduleRef, prisma });
  });

  it("rolls back Order when audit.log rejects inside the same transaction", async () => {
    const facility = await prisma.facility.create({
      data: {
        code: `OA-${suffix}`,
        name: "Order atomicity test",
        country: "Test",
        timezone: "UTC",
      },
    });

    const patient = await prisma.patient.create({
      data: {
        facilityId: facility.id,
        registeredAtFacilityId: facility.id,
        firstName: "Atomic",
        lastName: "Patient",
        mrn: `MRN-OA-${suffix}`,
        globalMrn: `GM-OA-${suffix}`,
      },
    });

    const encounter = await prisma.encounter.create({
      data: {
        facilityId: facility.id,
        patientId: patient.id,
        type: EncounterType.OUTPATIENT,
        status: EncounterStatus.OPEN,
      },
    });

    /** Prototype spy: must hit the same `log` method `OrdersService` invokes on its injected `AuditService`. */
    const spy = jest
      .spyOn(AuditService.prototype, "log")
      .mockRejectedValueOnce(new Error("simulated audit failure"));

    await expect(
      ordersService.create(
        encounter.id,
        facility.id,
        {
          type: "LAB",
          priority: "ROUTINE",
          items: [
            {
              catalogItemType: "LAB_TEST",
              manualLabel: `Manual CBC ${suffix}`,
            },
          ],
        },
        undefined,
        undefined,
        undefined
      )
    ).rejects.toThrow("simulated audit failure");

    spy.mockRestore();

    const orderCount = await prisma.order.count({ where: { encounterId: encounter.id } });
    expect(orderCount).toBe(0);

    await prisma.encounter.delete({ where: { id: encounter.id } });
    await prisma.patient.delete({ where: { id: patient.id } });
    await prisma.facility.delete({ where: { id: facility.id } });
  });
});
