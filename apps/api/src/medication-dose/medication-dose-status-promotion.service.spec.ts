/**
 * M1.8B.7I.3 — MedicationDoseInstance status promotion service tests.
 */
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { randomBytes } from "crypto";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";
import { OrdersService } from "../orders/orders.service";
import { EncounterStatus, EncounterType } from "@prisma/client";
import type { MedicationFrequencyCode, MedicationRoute, OrderCreateDto } from "@medora/shared";
import { MedicationDoseStatusPromotionService } from "./medication-dose-status-promotion.service";

describe("MedicationDoseStatusPromotionService (M1.8B.7I.3)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ordersService: OrdersService;
  let promotionService: MedicationDoseStatusPromotionService;

  const suffix = randomBytes(4).toString("hex");
  let facilityId: string;
  let userId: string;
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
    promotionService = moduleFixture.get<MedicationDoseStatusPromotionService>(
      MedicationDoseStatusPromotionService
    );

    const facility = await prisma.facility.create({
      data: {
        code: `MDSP-${suffix}`,
        name: "Dose status promotion test",
        country: "Test",
        timezone: "UTC",
      },
    });
    facilityId = facility.id;

    const user = await prisma.user.create({
      data: {
        email: `mdsp-${suffix}@test.local`,
        firstName: "Test",
        lastName: "Provider",
        passwordHash: "hash",
      },
    });
    userId = user.id;

    const generic = await prisma.catalogMedication.create({
      data: {
        code: `GENERIC_MDSP_${suffix}`,
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

  function setSchedulingFlags(on: boolean) {
    for (const key of ["MEDICATION_SCHEDULING_V1", "MEDICATION_DOSE_INSTANCES"]) {
      if (!(key in savedEnv)) savedEnv[key] = process.env[key];
      process.env[key] = on ? "true" : "false";
    }
  }

  async function createOpenEncounter() {
    const patient = await prisma.patient.create({
      data: {
        facilityId,
        registeredAtFacilityId: facilityId,
        firstName: "Promo",
        lastName: `Case-${randomBytes(2).toString("hex")}`,
        mrn: `MRN-MDSP-${randomBytes(3).toString("hex")}`,
        globalMrn: `GM-MDSP-${randomBytes(3).toString("hex")}`,
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

  async function createBidOrderWithDose() {
    const encounter = await createOpenEncounter();
    const payload: OrderCreateDto = {
      type: "MEDICATION",
      items: [
        {
          catalogItemId: genericCatalogId,
          catalogItemType: "MEDICATION",
          medicationFulfillmentIntent: "ADMINISTER_CHART",
          route: "IVP" as MedicationRoute,
          frequencyCode: "BID" as MedicationFrequencyCode,
        },
      ],
    };
    const order = await ordersService.create(encounter.id, facilityId, payload, userId);
    const dose = await prisma.medicationDoseInstance.findFirstOrThrow({
      where: { orderId: order.id },
      orderBy: { doseSequenceNumber: "asc" },
    });
    return { encounter, dose };
  }

  async function seedDoseWithWindow(input: {
    doseStatus: string;
    windowStart: Date;
    windowEnd: Date;
  }) {
    const { encounter, dose } = await createBidOrderWithDose();
    const updated = await prisma.medicationDoseInstance.update({
      where: { id: dose.id },
      data: {
        doseStatus: input.doseStatus,
        dueWindowStartAt: input.windowStart,
        dueWindowEndAt: input.windowEnd,
        scheduledAt: input.windowStart,
      },
    });
    return { encounter, dose: updated };
  }

  beforeEach(() => {
    setSchedulingFlags(true);
  });

  it("PLANNED before due window remains PLANNED", async () => {
    const windowStart = new Date("2026-06-10T09:00:00.000Z");
    const windowEnd = new Date("2026-06-10T10:00:00.000Z");
    const now = new Date("2026-06-10T08:30:00.000Z");
    const { encounter, dose } = await seedDoseWithWindow({
      doseStatus: "PLANNED",
      windowStart,
      windowEnd,
    });

    const snap = await promotionService.runOnce({ now, encounterId: encounter.id });
    expect(snap.promotedToDue).toBe(0);
    expect(snap.promotedToOverdue).toBe(0);

    const row = await prisma.medicationDoseInstance.findUniqueOrThrow({ where: { id: dose.id } });
    expect(row.doseStatus).toBe("PLANNED");
  });

  it("PLANNED inside due window becomes DUE", async () => {
    const windowStart = new Date("2026-06-10T09:00:00.000Z");
    const windowEnd = new Date("2026-06-10T10:00:00.000Z");
    const now = new Date("2026-06-10T09:30:00.000Z");
    const { encounter, dose } = await seedDoseWithWindow({
      doseStatus: "PLANNED",
      windowStart,
      windowEnd,
    });

    const snap = await promotionService.runOnce({ now, encounterId: encounter.id });
    expect(snap.promotedToDue).toBe(1);
    expect(snap.promotedToOverdue).toBe(0);

    const row = await prisma.medicationDoseInstance.findUniqueOrThrow({ where: { id: dose.id } });
    expect(row.doseStatus).toBe("DUE");
  });

  it("DUE past dueWindowEndAt becomes OVERDUE", async () => {
    const windowStart = new Date("2026-06-10T09:00:00.000Z");
    const windowEnd = new Date("2026-06-10T10:00:00.000Z");
    const now = new Date("2026-06-10T10:30:00.000Z");
    const { encounter, dose } = await seedDoseWithWindow({
      doseStatus: "DUE",
      windowStart,
      windowEnd,
    });

    const snap = await promotionService.runOnce({ now, encounterId: encounter.id });
    expect(snap.promotedToDue).toBe(0);
    expect(snap.promotedToOverdue).toBe(1);

    const row = await prisma.medicationDoseInstance.findUniqueOrThrow({ where: { id: dose.id } });
    expect(row.doseStatus).toBe("OVERDUE");
  });

  it("COMPLETED unchanged", async () => {
    const windowStart = new Date("2026-06-10T09:00:00.000Z");
    const windowEnd = new Date("2026-06-10T10:00:00.000Z");
    const now = new Date("2026-06-10T12:00:00.000Z");
    const { encounter, dose } = await seedDoseWithWindow({
      doseStatus: "COMPLETED",
      windowStart,
      windowEnd,
    });

    const snap = await promotionService.runOnce({ now, encounterId: encounter.id });
    expect(snap.promotedToDue).toBe(0);
    expect(snap.promotedToOverdue).toBe(0);

    const row = await prisma.medicationDoseInstance.findUniqueOrThrow({ where: { id: dose.id } });
    expect(row.doseStatus).toBe("COMPLETED");
  });

  it("HELD unchanged", async () => {
    const windowStart = new Date("2026-06-10T09:00:00.000Z");
    const windowEnd = new Date("2026-06-10T10:00:00.000Z");
    const now = new Date("2026-06-10T12:00:00.000Z");
    const { encounter, dose } = await seedDoseWithWindow({
      doseStatus: "HELD",
      windowStart,
      windowEnd,
    });

    await promotionService.runOnce({ now, encounterId: encounter.id });
    const row = await prisma.medicationDoseInstance.findUniqueOrThrow({ where: { id: dose.id } });
    expect(row.doseStatus).toBe("HELD");
  });

  it("CANCELLED unchanged", async () => {
    const windowStart = new Date("2026-06-10T09:00:00.000Z");
    const windowEnd = new Date("2026-06-10T10:00:00.000Z");
    const now = new Date("2026-06-10T12:00:00.000Z");
    const { encounter, dose } = await seedDoseWithWindow({
      doseStatus: "CANCELLED",
      windowStart,
      windowEnd,
    });

    await promotionService.runOnce({ now, encounterId: encounter.id });
    const row = await prisma.medicationDoseInstance.findUniqueOrThrow({ where: { id: dose.id } });
    expect(row.doseStatus).toBe("CANCELLED");
  });

  it("repeated runs are idempotent", async () => {
    const windowStart = new Date("2026-06-10T09:00:00.000Z");
    const windowEnd = new Date("2026-06-10T10:00:00.000Z");
    const now = new Date("2026-06-10T09:30:00.000Z");
    const { encounter, dose } = await seedDoseWithWindow({
      doseStatus: "PLANNED",
      windowStart,
      windowEnd,
    });

    const first = await promotionService.runOnce({ now, encounterId: encounter.id });
    expect(first.promotedToDue).toBe(1);

    const second = await promotionService.runOnce({ now, encounterId: encounter.id });
    expect(second.promotedToDue).toBe(0);
    expect(second.promotedToOverdue).toBe(0);

    const row = await prisma.medicationDoseInstance.findUniqueOrThrow({ where: { id: dose.id } });
    expect(row.doseStatus).toBe("DUE");
  });

  it("PLANNED past window end promotes to OVERDUE in one run (PLANNED→DUE→OVERDUE)", async () => {
    const windowStart = new Date("2026-06-10T09:00:00.000Z");
    const windowEnd = new Date("2026-06-10T10:00:00.000Z");
    const now = new Date("2026-06-10T11:00:00.000Z");
    const { encounter, dose } = await seedDoseWithWindow({
      doseStatus: "PLANNED",
      windowStart,
      windowEnd,
    });

    const snap = await promotionService.runOnce({ now, encounterId: encounter.id });
    expect(snap.promotedToDue).toBe(1);
    expect(snap.promotedToOverdue).toBe(1);

    const row = await prisma.medicationDoseInstance.findUniqueOrThrow({ where: { id: dose.id } });
    expect(row.doseStatus).toBe("OVERDUE");
  });

  it("flags OFF → no promotions", async () => {
    const windowStart = new Date("2026-06-10T09:00:00.000Z");
    const windowEnd = new Date("2026-06-10T10:00:00.000Z");
    const now = new Date("2026-06-10T09:30:00.000Z");
    const { encounter, dose } = await seedDoseWithWindow({
      doseStatus: "PLANNED",
      windowStart,
      windowEnd,
    });

    setSchedulingFlags(false);

    const snap = await promotionService.runOnce({ now, encounterId: encounter.id });
    expect(snap.status).toBe("disabled");

    const row = await prisma.medicationDoseInstance.findUniqueOrThrow({ where: { id: dose.id } });
    expect(row.doseStatus).toBe("PLANNED");

    setSchedulingFlags(true);
  });
});
