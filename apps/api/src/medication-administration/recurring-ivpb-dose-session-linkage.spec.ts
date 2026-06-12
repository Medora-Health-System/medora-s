/**
 * M1.8B.7J.3 — Recurring IVPB START/STOP dose linkage integration tests.
 */
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { randomBytes } from "crypto";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";
import { OrdersService } from "../orders/orders.service";
import { EncounterStatus, EncounterType, RoleCode } from "@prisma/client";
import {
  type MedicationFrequencyCode,
  type MedicationRoute,
  type OrderCreateDto,
} from "@medora/shared";

describe("Recurring IVPB dose session linkage (M1.8B.7J.3)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ordersService: OrdersService;

  const suffix = randomBytes(4).toString("hex");
  let facilityId: string;
  let userId: string;
  let vancomycinCatalogId: string;

  const savedEnv: Record<string, string | undefined> = {};

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? "test_access_secret";
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "test_refresh_secret";
    process.env.JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? "15m";
    process.env.JWT_REFRESH_TTL = process.env.JWT_REFRESH_TTL ?? "14d";
    process.env.TOKEN_ISSUER = process.env.TOKEN_ISSUER ?? "medora-s";
    process.env.AUDIT_FAILURE_MODE = process.env.AUDIT_FAILURE_MODE ?? "best_effort";

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    ordersService = moduleFixture.get<OrdersService>(OrdersService);

    const facility = await prisma.facility.create({
      data: {
        code: `IVPB-LINK-${suffix}`,
        name: "IVPB linkage test",
        country: "Test",
        timezone: "UTC",
      },
    });
    facilityId = facility.id;

    const user = await prisma.user.create({
      data: {
        email: `ivpb-link-${suffix}@test.local`,
        firstName: "Test",
        lastName: "Nurse",
        passwordHash: "hash",
      },
    });
    userId = user.id;

    const vancomycin = await prisma.catalogMedication.create({
      data: {
        code: `VANCOMYCIN_LINK_${suffix}`,
        name: "Vancomycin",
        displayNameEn: "Vancomycin",
        displayNameFr: "Vancomycine",
        genericName: "Vancomycin",
        administrationType: "INFUSION",
        route: "IV",
      },
    });
    vancomycinCatalogId = vancomycin.id;
  });

  afterAll(async () => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await app.close();
  });

  function setIvpbSchedulingFlags(on: boolean) {
    for (const key of [
      "MEDICATION_SCHEDULING_V1",
      "MEDICATION_DOSE_INSTANCES",
      "MEDICATION_IVPB_DOSE_SCHEDULING",
    ]) {
      if (!(key in savedEnv)) savedEnv[key] = process.env[key];
      process.env[key] = on ? "true" : "false";
    }
  }

  async function createOpenEncounter() {
    const patient = await prisma.patient.create({
      data: {
        facilityId,
        registeredAtFacilityId: facilityId,
        firstName: "IVPB",
        lastName: `Link-${randomBytes(2).toString("hex")}`,
        mrn: `MRN-LINK-${randomBytes(3).toString("hex")}`,
        globalMrn: `GM-LINK-${randomBytes(3).toString("hex")}`,
      },
    });
    return prisma.encounter.create({
      data: {
        facilityId,
        patientId: patient.id,
        type: EncounterType.EMERGENCY,
        status: EncounterStatus.OPEN,
      },
    });
  }

  async function createRecurringIvpbOrder(input?: {
    frequencyCode?: MedicationFrequencyCode;
    route?: MedicationRoute;
  }) {
    const encounter = await createOpenEncounter();
    const payload: OrderCreateDto = {
      type: "MEDICATION",
      items: [
        {
          catalogItemId: vancomycinCatalogId,
          catalogItemType: "MEDICATION",
          medicationFulfillmentIntent: "ADMINISTER_CHART",
          route: input?.route ?? "IVPB",
          frequencyCode: input?.frequencyCode ?? "Q12H",
        },
      ],
    };
    return ordersService.create(encounter.id, facilityId, payload, userId);
  }

  async function makeFirstDoseStartable(orderId: string) {
    const dose = await prisma.medicationDoseInstance.findFirst({
      where: { orderId, doseSequenceNumber: 1 },
    });
    expect(dose).toBeTruthy();
    const now = new Date();
    await prisma.medicationDoseInstance.update({
      where: { id: dose!.id },
      data: {
        doseStatus: "DUE",
        dueWindowStartAt: new Date(now.getTime() - 60_000),
        dueWindowEndAt: new Date(now.getTime() + 3_600_000),
      },
    });
    return dose!;
  }

  it("START links InfusionSession + IVPB_SESSION dose when flags ON", async () => {
    setIvpbSchedulingFlags(true);
    const order = await createRecurringIvpbOrder();
    const orderItemId = order.items[0]!.id;
    const dose = await makeFirstDoseStartable(order.id);

    await ordersService.startMedicationInfusion(
      facilityId,
      orderItemId,
      {},
      [RoleCode.RN],
      userId
    );

    const updatedDose = await prisma.medicationDoseInstance.findUnique({
      where: { id: dose.id },
    });
    expect(updatedDose?.doseStatus).toBe("IN_PROGRESS");
    expect(updatedDose?.infusionSessionId).toBeTruthy();
    expect(updatedDose?.terminalMedicationAdministrationId).toBeNull();

    const session = await prisma.infusionSession.findUnique({
      where: { id: updatedDose!.infusionSessionId! },
    });
    expect(session?.status).toBe("IN_PROGRESS");
    expect(session?.orderItemId).toBe(orderItemId);
    expect(session?.legacyInfusionSessionKey).toBeTruthy();

    const startMar = await prisma.medicationAdministration.findFirst({
      where: {
        orderItemId,
        infusionPhase: "INFUSION_START",
      },
    });
    expect(startMar?.medicationDoseInstanceId).toBe(dose.id);
    expect(startMar?.infusionSessionId).toBe(updatedDose?.infusionSessionId);
  });

  it("STOP completes linked IVPB_SESSION dose and stops InfusionSession", async () => {
    setIvpbSchedulingFlags(true);
    const order = await createRecurringIvpbOrder();
    const orderItemId = order.items[0]!.id;
    const dose = await makeFirstDoseStartable(order.id);

    await ordersService.startMedicationInfusion(
      facilityId,
      orderItemId,
      {},
      [RoleCode.RN],
      userId
    );

    const stoppedAt = new Date();
    const result = await ordersService.stopMedicationInfusion(
      facilityId,
      orderItemId,
      { stoppedAt },
      [RoleCode.RN],
      userId
    );

    const updatedDose = await prisma.medicationDoseInstance.findUnique({
      where: { id: dose.id },
    });
    expect(updatedDose?.doseStatus).toBe("COMPLETED");
    expect(updatedDose?.terminalMedicationAdministrationId).toBe(
      result.medicationAdministration.id
    );

    const session = await prisma.infusionSession.findUnique({
      where: { id: updatedDose!.infusionSessionId! },
    });
    expect(session?.status).toBe("STOPPED");
    expect(session?.stoppedAt).toBeTruthy();

    const stopMar = await prisma.medicationAdministration.findFirst({
      where: {
        orderItemId,
        infusionPhase: "INFUSION_STOP",
      },
    });
    expect(stopMar?.medicationDoseInstanceId).toBe(dose.id);
    expect(stopMar?.id).toBe(updatedDose?.terminalMedicationAdministrationId);

    const orderItem = await prisma.orderItem.findUnique({ where: { id: orderItemId } });
    expect(orderItem?.status).not.toBe("COMPLETED");
  });

  it("legacy NOW IVPB with flags OFF creates InfusionSession without dose linkage (K.10)", async () => {
    setIvpbSchedulingFlags(false);
    const order = await createRecurringIvpbOrder({ frequencyCode: "NOW" });
    const orderItemId = order.items[0]!.id;

    await ordersService.startMedicationInfusion(
      facilityId,
      orderItemId,
      {},
      [RoleCode.RN],
      userId
    );

    expect(await prisma.infusionSession.count({ where: { orderItemId } })).toBe(1);
    expect(await prisma.medicationDoseInstance.count({ where: { orderItemId } })).toBe(0);

    await ordersService.stopMedicationInfusion(
      facilityId,
      orderItemId,
      {},
      [RoleCode.RN],
      userId
    );
  });

  it("START accepts explicit medicationDoseInstanceId for recurring IVPB", async () => {
    setIvpbSchedulingFlags(true);
    const order = await createRecurringIvpbOrder();
    const orderItemId = order.items[0]!.id;
    const dose = await makeFirstDoseStartable(order.id);

    await ordersService.startMedicationInfusion(
      facilityId,
      orderItemId,
      { medicationDoseInstanceId: dose.id },
      [RoleCode.RN],
      userId
    );

    const updatedDose = await prisma.medicationDoseInstance.findUnique({
      where: { id: dose.id },
    });
    expect(updatedDose?.doseStatus).toBe("IN_PROGRESS");
  });

  it("STOP accepts explicit medicationDoseInstanceId for recurring IVPB", async () => {
    setIvpbSchedulingFlags(true);
    const order = await createRecurringIvpbOrder();
    const orderItemId = order.items[0]!.id;
    const dose = await makeFirstDoseStartable(order.id);

    await ordersService.startMedicationInfusion(
      facilityId,
      orderItemId,
      { medicationDoseInstanceId: dose.id },
      [RoleCode.RN],
      userId
    );

    const result = await ordersService.stopMedicationInfusion(
      facilityId,
      orderItemId,
      { medicationDoseInstanceId: dose.id },
      [RoleCode.RN],
      userId
    );

    const updatedDose = await prisma.medicationDoseInstance.findUnique({
      where: { id: dose.id },
    });
    expect(updatedDose?.doseStatus).toBe("COMPLETED");
    expect(updatedDose?.terminalMedicationAdministrationId).toBe(
      result.medicationAdministration.id
    );
  });

  it("rejects START when no IVPB dose is startable", async () => {
    setIvpbSchedulingFlags(true);
    const order = await createRecurringIvpbOrder();
    const orderItemId = order.items[0]!.id;
    const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.medicationDoseInstance.updateMany({
      where: { orderId: order.id },
      data: {
        doseStatus: "PLANNED",
        dueWindowStartAt: futureStart,
        dueWindowEndAt: new Date(futureStart.getTime() + 3_600_000),
      },
    });

    await expect(
      ordersService.startMedicationInfusion(
        facilityId,
        orderItemId,
        {},
        [RoleCode.RN],
        userId
      )
    ).rejects.toThrow(/Aucune dose IVPB planifiée/);
  });
});
