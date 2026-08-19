/**
 * M1.8B.7I.2 — Dose-gated MAR service wiring integration tests.
 */
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { randomBytes } from "crypto";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";
import { OrdersService } from "../orders/orders.service";
import { MedicationAdministrationService } from "./medication-administration.service";
import { EncounterStatus, EncounterType, OrderStatus } from "@prisma/client";
import type { OrderCreateDto } from "@medora/shared";

describe("MedicationAdministrationService dose-gated MAR (M1.8B.7I.2)", () => {
  jest.setTimeout(120_000);
  let app: INestApplication;
  let prisma: PrismaService;
  let ordersService: OrdersService;
  let marService: MedicationAdministrationService;

  const suffix = randomBytes(4).toString("hex");
  let facilityId: string;
  let nurseUserId: string;
  let genericCatalogId: string;

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
    marService = moduleFixture.get<MedicationAdministrationService>(MedicationAdministrationService);

    const facility = await prisma.facility.create({
      data: {
        code: `MDGM-${suffix}`,
        name: "Dose-gated MAR test",
        country: "Test",
        timezone: "UTC",
      },
    });
    facilityId = facility.id;

    const nurse = await prisma.user.create({
      data: {
        email: `mdgm-nurse-${suffix}@test.local`,
        firstName: "Nurse",
        lastName: "Test",
        passwordHash: "hash",
      },
    });
    nurseUserId = nurse.id;

    const generic = await prisma.catalogMedication.create({
      data: {
        code: `GENERIC_MDGM_${suffix}`,
        name: "Generic Medication",
        displayNameEn: "Generic Medication",
        displayNameFr: "Médicament générique",
        administrationType: "PUSH",
        route: "IVP",
      },
    });
    genericCatalogId = generic.id;
  });

  afterAll(async () => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await app.close();
  });

  function setSchedulingFlags(input: {
    schedulingV1?: boolean;
    doseInstances?: boolean;
    doseGatedMar?: boolean;
  }) {
    const entries: Record<string, boolean> = {
      MEDICATION_SCHEDULING_V1: input.schedulingV1 ?? false,
      MEDICATION_DOSE_INSTANCES: input.doseInstances ?? false,
      MEDICATION_DOSE_GATED_MAR: input.doseGatedMar ?? false,
    };
    for (const [key, on] of Object.entries(entries)) {
      if (!(key in savedEnv)) savedEnv[key] = process.env[key];
      process.env[key] = on ? "true" : "false";
    }
  }

  async function createOpenEncounter() {
    const patient = await prisma.patient.create({
      data: {
        facilityId,
        registeredAtFacilityId: facilityId,
        firstName: "Dose",
        lastName: `Mar-${randomBytes(2).toString("hex")}`,
        mrn: `MRN-MDGM-${randomBytes(3).toString("hex")}`,
        globalMrn: `GM-MDGM-${randomBytes(3).toString("hex")}`,
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

  async function createBidMedicationOrder() {
    const encounter = await createOpenEncounter();
    const payload: OrderCreateDto = {
      type: "MEDICATION",
      items: [
        {
          catalogItemId: genericCatalogId,
          catalogItemType: "MEDICATION",
          medicationFulfillmentIntent: "ADMINISTER_CHART",
          route: "IVP",
          frequencyCode: "BID",
        },
      ],
    };
    const order = await ordersService.create(encounter.id, facilityId, payload, nurseUserId);
    const orderItem = await prisma.orderItem.findFirstOrThrow({ where: { orderId: order.id } });
    const dose = await prisma.medicationDoseInstance.findFirstOrThrow({
      where: { orderItemId: orderItem.id },
      orderBy: { doseSequenceNumber: "asc" },
    });
    return { encounter, order, orderItem, dose };
  }

  beforeEach(() => {
    setSchedulingFlags({ schedulingV1: true, doseInstances: true, doseGatedMar: true });
  });

  it("BID recurring dose MAR links administration, completes dose, keeps order line active", async () => {
    const { encounter, orderItem, dose } = await createBidMedicationOrder();

    await prisma.medicationDoseInstance.update({
      where: { id: dose.id },
      data: { doseStatus: "DUE" },
    });

    const mar = await marService.create(encounter.id, facilityId, nurseUserId, {
      orderItemId: orderItem.id,
      medicationDoseInstanceId: dose.id,
      marAction: "administered",
      administeredQuantity: 1,
      administeredAt: dose.scheduledAt,
    });

    expect(mar.medicationDoseInstanceId).toBe(dose.id);

    const updatedDose = await prisma.medicationDoseInstance.findUniqueOrThrow({
      where: { id: dose.id },
    });
    expect(updatedDose.doseStatus).toBe("COMPLETED");
    expect(updatedDose.terminalMedicationAdministrationId).toBe(mar.id);

    const updatedLine = await prisma.orderItem.findUniqueOrThrow({ where: { id: orderItem.id } });
    expect(updatedLine.status).not.toBe(OrderStatus.COMPLETED);
  });

  it("rejects duplicate MAR on the same dose", async () => {
    const { encounter, orderItem, dose } = await createBidMedicationOrder();

    await prisma.medicationDoseInstance.update({
      where: { id: dose.id },
      data: { doseStatus: "DUE" },
    });

    await marService.create(encounter.id, facilityId, nurseUserId, {
      orderItemId: orderItem.id,
      medicationDoseInstanceId: dose.id,
      marAction: "administered",
      administeredQuantity: 1,
      administeredAt: dose.scheduledAt,
    });

    await expect(
      marService.create(encounter.id, facilityId, nurseUserId, {
        orderItemId: orderItem.id,
        medicationDoseInstanceId: dose.id,
        marAction: "administered",
        administeredQuantity: 1,
        administeredAt: dose.scheduledAt,
      })
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: expect.stringMatching(/DOSE_ALREADY/),
      }),
    });
  });

  it("MAR without medicationDoseInstanceId still works when dose-gated flag OFF", async () => {
    setSchedulingFlags({ schedulingV1: true, doseInstances: true, doseGatedMar: false });
    const { encounter, orderItem } = await createBidMedicationOrder();

    const mar = await marService.create(encounter.id, facilityId, nurseUserId, {
      orderItemId: orderItem.id,
      marAction: "administered",
      administeredQuantity: 1,
    });

    expect(mar.medicationDoseInstanceId).toBeNull();
    const updatedLine = await prisma.orderItem.findUniqueOrThrow({ where: { id: orderItem.id } });
    expect(updatedLine.status).toBe(OrderStatus.COMPLETED);
  });

  it("persists explicit medicationDoseInstanceId when dose-gated flag is OFF", async () => {
    setSchedulingFlags({ schedulingV1: true, doseInstances: true, doseGatedMar: false });
    const { encounter, orderItem, dose } = await createBidMedicationOrder();

    const mar = await marService.create(encounter.id, facilityId, nurseUserId, {
      orderItemId: orderItem.id,
      medicationDoseInstanceId: dose.id,
      marAction: "administered",
      administeredQuantity: 1,
      administeredAt: dose.scheduledAt,
    });

    expect(mar.medicationDoseInstanceId).toBe(dose.id);
  });

  it("NOW order completes line when flags ON but no dose instance id", async () => {
    const encounter = await createOpenEncounter();
    const payload: OrderCreateDto = {
      type: "MEDICATION",
      items: [
        {
          catalogItemId: genericCatalogId,
          catalogItemType: "MEDICATION",
          medicationFulfillmentIntent: "ADMINISTER_CHART",
          route: "IVP",
          frequencyCode: "NOW",
        },
      ],
    };
    const order = await ordersService.create(encounter.id, facilityId, payload, nurseUserId);
    const orderItem = await prisma.orderItem.findFirstOrThrow({ where: { orderId: order.id } });

    await marService.create(encounter.id, facilityId, nurseUserId, {
      orderItemId: orderItem.id,
      marAction: "administered",
      administeredQuantity: 1,
    });

    const updatedLine = await prisma.orderItem.findUniqueOrThrow({ where: { id: orderItem.id } });
    expect(updatedLine.status).toBe(OrderStatus.COMPLETED);
  });
});
