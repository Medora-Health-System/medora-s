/**
 * M1.8B.7A.1 — MedicationOrderSchedule dormant persistence tests.
 */
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { randomBytes } from "crypto";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";
import { OrdersService } from "../orders/orders.service";
import { EncounterStatus, EncounterType } from "@prisma/client";
import {
  MEDICATION_FREQUENCY_CATALOG_VERSION,
  type MedicationFrequencyCode,
  type MedicationRoute,
  type OrderCreateDto,
} from "@medora/shared";

describe("MedicationOrderSchedule persistence (M1.8B.7A.1)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ordersService: OrdersService;

  const suffix = randomBytes(4).toString("hex");
  let facilityId: string;
  let userId: string;
  let genericCatalogId: string;
  let prbcCatalogId: string;
  let vancomycinCatalogId: string;
  let insulinCatalogId: string;

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
        code: `MOS-${suffix}`,
        name: "Schedule persistence test",
        country: "Test",
        timezone: "UTC",
      },
    });
    facilityId = facility.id;

    const user = await prisma.user.create({
      data: {
        email: `mos-${suffix}@test.local`,
        firstName: "Test",
        lastName: "Provider",
        passwordHash: "hash",
      },
    });
    userId = user.id;

    const generic = await prisma.catalogMedication.create({
      data: {
        code: `GENERIC_MED_${suffix}`,
        name: "Generic Medication",
        displayNameEn: "Generic Medication",
        displayNameFr: "Médicament générique",
        administrationType: "PUSH",
        route: "IVP",
      },
    });
    genericCatalogId = generic.id;

    const prbc = await prisma.catalogMedication.create({
      data: {
        code: `PRBC_TRANSFUSION_${suffix}`,
        name: "PRBC",
        displayNameEn: "Packed Red Blood Cells",
        displayNameFr: "Globules rouges",
        therapeuticClass: "BLOOD_PRODUCT",
        administrationType: "INFUSION",
        route: "IV",
        requiresDoubleSign: true,
      },
    });
    prbcCatalogId = prbc.id;

    const vancomycin = await prisma.catalogMedication.create({
      data: {
        code: `VANCOMYCIN_${suffix}`,
        name: "Vancomycin",
        displayNameEn: "Vancomycin",
        displayNameFr: "Vancomycine",
        genericName: "Vancomycin",
        administrationType: "INFUSION",
        route: "IV",
      },
    });
    vancomycinCatalogId = vancomycin.id;

    const insulin = await prisma.catalogMedication.create({
      data: {
        code: `REGULAR_INSULIN_${suffix}`,
        name: "Regular Insulin",
        displayNameEn: "Regular Insulin",
        displayNameFr: "Insuline régulière",
        genericName: "Regular Insulin",
        administrationType: "SQ",
        route: "SQ",
      },
    });
    insulinCatalogId = insulin.id;
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
        firstName: "Schedule",
        lastName: `Case-${randomBytes(2).toString("hex")}`,
        mrn: `MRN-MOS-${randomBytes(3).toString("hex")}`,
        globalMrn: `GM-MOS-${randomBytes(3).toString("hex")}`,
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

  async function createMedicationOrder(input: {
    catalogItemId: string;
    frequencyCode?: MedicationFrequencyCode | null;
    route?: MedicationRoute;
    notes?: string;
  }) {
    const encounter = await createOpenEncounter();
    const payload: OrderCreateDto = {
      type: "MEDICATION",
      items: [
        {
          catalogItemId: input.catalogItemId,
          catalogItemType: "MEDICATION",
          medicationFulfillmentIntent: "ADMINISTER_CHART",
          route: input.route ?? "IVP",
          frequencyCode: input.frequencyCode ?? null,
          ...(input.notes ? { notes: input.notes } : {}),
        },
      ],
    };
    return ordersService.create(encounter.id, facilityId, payload, userId);
  }

  async function schedulesForOrder(orderId: string) {
    return prisma.medicationOrderSchedule.findMany({
      where: { orderId },
      orderBy: { createdAt: "asc" },
    });
  }

  it("flags OFF + BID → no schedule row", async () => {
    setSchedulingFlags(false);
    const order = await createMedicationOrder({ catalogItemId: genericCatalogId, frequencyCode: "BID" });
    const schedules = await schedulesForOrder(order.id);
    expect(schedules).toHaveLength(0);
  });

  it("flags ON + BID → creates ACTIVE schedule with snapshots", async () => {
    setSchedulingFlags(true);
    const order = await createMedicationOrder({ catalogItemId: genericCatalogId, frequencyCode: "BID" });
    const schedules = await schedulesForOrder(order.id);
    expect(schedules).toHaveLength(1);
    const schedule = schedules[0]!;
    expect(schedule.scheduleStatus).toBe("ACTIVE");
    expect(schedule.catalogVersion).toBe(MEDICATION_FREQUENCY_CATALOG_VERSION);
    expect(schedule.scheduleClassification).toBe("RECURRING");

    const freqSnapshot = schedule.frequencySnapshotJson as Record<string, unknown>;
    expect(freqSnapshot.intervalMinutes).toBeNull();
    expect(freqSnapshot.scheduleClassification).toBe("RECURRING");
    expect(schedule.scheduleClassification).toBe(freqSnapshot.scheduleClassification);
    expect(freqSnapshot.frequencyCode).toBe("BID");
  });

  it("flags ON + Q6H stores intervalMinutes in snapshot", async () => {
    setSchedulingFlags(true);
    const order = await createMedicationOrder({ catalogItemId: genericCatalogId, frequencyCode: "Q6H" });
    const schedule = (await schedulesForOrder(order.id))[0]!;
    const freqSnapshot = schedule.frequencySnapshotJson as Record<string, unknown>;
    expect(freqSnapshot.intervalMinutes).toBe(360);
  });

  it.each(["NOW", "STAT", "ONCE"] as const)(
    "flags ON + %s → no schedule row",
    async (frequencyCode) => {
      setSchedulingFlags(true);
      const order = await createMedicationOrder({
        catalogItemId: genericCatalogId,
        frequencyCode,
      });
      expect(await schedulesForOrder(order.id)).toHaveLength(0);
    }
  );

  it("legacy null frequencyCode → no schedule row", async () => {
    setSchedulingFlags(true);
    const order = await createMedicationOrder({ catalogItemId: genericCatalogId, frequencyCode: null });
    expect(await schedulesForOrder(order.id)).toHaveLength(0);
  });

  it("CONTINUOUS → no schedule row", async () => {
    setSchedulingFlags(true);
    const order = await createMedicationOrder({ catalogItemId: genericCatalogId, frequencyCode: "CONTINUOUS" });
    expect(await schedulesForOrder(order.id)).toHaveLength(0);
  });

  it("PRBC blood + ONCE → no schedule row", async () => {
    setSchedulingFlags(true);
    const order = await createMedicationOrder({
      catalogItemId: prbcCatalogId,
      frequencyCode: "ONCE",
      route: "IVPB",
    });
    expect(await schedulesForOrder(order.id)).toHaveLength(0);
  });

  it("vancomycin infusion + Q12H → no schedule row", async () => {
    setSchedulingFlags(true);
    const order = await createMedicationOrder({
      catalogItemId: vancomycinCatalogId,
      frequencyCode: "Q12H",
      route: "IVPB",
    });
    expect(await schedulesForOrder(order.id)).toHaveLength(0);
  });

  it("PRN + flags ON → ON_DEMAND schedule (no dose instances)", async () => {
    setSchedulingFlags(true);
    const order = await createMedicationOrder({ catalogItemId: genericCatalogId, frequencyCode: "PRN" });
    const schedules = await schedulesForOrder(order.id);
    expect(schedules).toHaveLength(1);
    expect(schedules[0]!.scheduleClassification).toBe("ON_DEMAND");
    const doseInstanceCount = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'MedicationDoseInstance'
    `;
    expect(Number(doseInstanceCount[0]?.count ?? 0)).toBe(0);
  });

  it("TAPER → no schedule row", async () => {
    setSchedulingFlags(true);
    const order = await createMedicationOrder({ catalogItemId: genericCatalogId, frequencyCode: "TAPER" });
    expect(await schedulesForOrder(order.id)).toHaveLength(0);
  });

  it("insulin SQ + ACHS + flags ON → RECURRING schedule", async () => {
    setSchedulingFlags(true);
    const order = await createMedicationOrder({
      catalogItemId: insulinCatalogId,
      frequencyCode: "ACHS",
      route: "SQ",
    });
    const schedules = await schedulesForOrder(order.id);
    expect(schedules).toHaveLength(1);
    expect(schedules[0]!.scheduleClassification).toBe("RECURRING");
  });

  it("flags ON + sig-only BID in notes → persists frequencyCode and RECURRING schedule", async () => {
    setSchedulingFlags(true);
    const order = await createMedicationOrder({
      catalogItemId: genericCatalogId,
      route: "PO",
      notes: "1 tab PO BID",
    });
    const persisted = await prisma.orderItem.findUnique({ where: { id: order.items[0]!.id } });
    expect(persisted?.frequencyCode).toBe("BID");
    const schedules = await schedulesForOrder(order.id);
    expect(schedules).toHaveLength(1);
    expect(schedules[0]!.scheduleClassification).toBe("RECURRING");
  });

  it("flags ON + sig-only Q12H in notes → persists frequencyCode", async () => {
    setSchedulingFlags(true);
    const order = await createMedicationOrder({
      catalogItemId: genericCatalogId,
      route: "IVP",
      notes: "500 mg IV q12h",
    });
    const persisted = await prisma.orderItem.findUnique({ where: { id: order.items[0]!.id } });
    expect(persisted?.frequencyCode).toBe("Q12H");
  });

  it("flags ON + ambiguous directions → no frequencyCode and no schedule", async () => {
    setSchedulingFlags(true);
    const order = await createMedicationOrder({
      catalogItemId: genericCatalogId,
      route: "PO",
      notes: "take as directed",
    });
    const persisted = await prisma.orderItem.findUnique({ where: { id: order.items[0]!.id } });
    expect(persisted?.frequencyCode).toBeNull();
    expect(await schedulesForOrder(order.id)).toHaveLength(0);
  });

  it("enforces one ACTIVE schedule per OrderItem", async () => {
    setSchedulingFlags(true);
    const order = await createMedicationOrder({ catalogItemId: genericCatalogId, frequencyCode: "TID" });
    const orderItemId = order.items[0]!.id;
    await expect(
      prisma.medicationOrderSchedule.create({
        data: {
          facilityId,
          encounterId: order.encounterId,
          orderId: order.id,
          orderItemId,
          frequencyCode: "TID",
          catalogVersion: MEDICATION_FREQUENCY_CATALOG_VERSION,
          frequencySnapshotJson: { scheduleClassification: "RECURRING" },
          medicationCatalogSnapshotJson: {},
          scheduleClassification: "RECURRING",
          scheduleStatus: "ACTIVE",
        },
      })
    ).rejects.toMatchObject({ code: "P2002" });
  });
});
