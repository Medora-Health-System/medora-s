/**
 * M1.8B.7H.1 — MedicationDoseInstance expansion service tests.
 */
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { randomBytes } from "crypto";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";
import { OrdersService } from "../orders/orders.service";
import { EncounterStatus, EncounterType } from "@prisma/client";
import {
  MEDICATION_DOSE_EXPANSION_HORIZON_MS,
  type MedicationFrequencyCode,
  type MedicationRoute,
  type OrderCreateDto,
} from "@medora/shared";
import {
  MEDICATION_DOSE_INSTANCE_STATUS_PLANNED,
  MEDICATION_DOSE_KIND_FIXED_ADMINISTRATION,
  MedicationDoseExpansionService,
} from "./medication-dose-expansion.service";

describe("MedicationDoseExpansionService (M1.8B.7H.1)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ordersService: OrdersService;
  let expansionService: MedicationDoseExpansionService;

  const suffix = randomBytes(4).toString("hex");
  let facilityId: string;
  let userId: string;
  let genericCatalogId: string;
  let prbcCatalogId: string;
  let vancomycinCatalogId: string;

  const savedEnv: Record<string, string | undefined> = {};
  const fixedAnchor = new Date("2026-06-10T10:00:00.000Z");
  const fixedHorizonEnd = new Date(fixedAnchor.getTime() + MEDICATION_DOSE_EXPANSION_HORIZON_MS);

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
    expansionService = moduleFixture.get<MedicationDoseExpansionService>(MedicationDoseExpansionService);

    const facility = await prisma.facility.create({
      data: {
        code: `MDE-${suffix}`,
        name: "Dose expansion test",
        country: "Test",
        timezone: "UTC",
      },
    });
    facilityId = facility.id;

    const user = await prisma.user.create({
      data: {
        email: `mde-${suffix}@test.local`,
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
        firstName: "Dose",
        lastName: `Case-${randomBytes(2).toString("hex")}`,
        mrn: `MRN-MDE-${randomBytes(3).toString("hex")}`,
        globalMrn: `GM-MDE-${randomBytes(3).toString("hex")}`,
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
        },
      ],
    };
    return ordersService.create(encounter.id, facilityId, payload, userId);
  }

  async function dosesForOrder(orderId: string) {
    return prisma.medicationDoseInstance.findMany({
      where: { orderId },
      orderBy: { doseSequenceNumber: "asc" },
    });
  }

  beforeEach(() => {
    setSchedulingFlags(true);
  });

  it("flags OFF → zero dose writes", async () => {
    setSchedulingFlags(false);
    const order = await createMedicationOrder({ catalogItemId: genericCatalogId, frequencyCode: "BID" });
    expect(await prisma.medicationOrderSchedule.count({ where: { orderId: order.id } })).toBe(0);
    expect(await dosesForOrder(order.id)).toHaveLength(0);

    setSchedulingFlags(true);
    const order2 = await createMedicationOrder({ catalogItemId: genericCatalogId, frequencyCode: "BID" });
    const schedule2 = await prisma.medicationOrderSchedule.findFirst({ where: { orderId: order2.id } });
    await prisma.medicationDoseInstance.deleteMany({ where: { medicationOrderScheduleId: schedule2!.id } });
    setSchedulingFlags(false);
    const result = await expansionService.expandForSchedule(schedule2!.id);
    expect(result.createdCount).toBe(0);
    expect(result.reason).toBe("SCHEDULING_FLAGS_OFF");
    expect(await dosesForOrder(order2.id)).toHaveLength(0);
  });

  async function resetScheduleDosesForManualExpansion(orderId: string) {
    const schedule = await prisma.medicationOrderSchedule.findFirst({ where: { orderId } });
    expect(schedule).toBeTruthy();
    await prisma.medicationDoseInstance.deleteMany({
      where: { medicationOrderScheduleId: schedule!.id },
    });
    return schedule!;
  }

  it("Q6H expansion creates interval doses through 72h horizon", async () => {
    const order = await createMedicationOrder({ catalogItemId: genericCatalogId, frequencyCode: "Q6H" });
    const schedule = await resetScheduleDosesForManualExpansion(order.id);
    const result = await expansionService.expandForSchedule(schedule.id, {
      anchorAt: fixedAnchor,
      horizonEndAt: fixedHorizonEnd,
    });
    expect(result.createdCount).toBe(13);
    const doses = await dosesForOrder(order.id);
    expect(doses).toHaveLength(13);
    expect(doses[0]!.scheduledAt.toISOString()).toBe("2026-06-10T10:00:00.000Z");
    expect(doses.at(-1)!.scheduledAt.toISOString()).toBe("2026-06-13T10:00:00.000Z");
  });

  it("BID expansion creates 6 doses in 72h", async () => {
    const order = await createMedicationOrder({ catalogItemId: genericCatalogId, frequencyCode: "BID" });
    const schedule = await resetScheduleDosesForManualExpansion(order.id);
    const result = await expansionService.expandForSchedule(schedule.id, {
      anchorAt: fixedAnchor,
      horizonEndAt: fixedHorizonEnd,
    });
    expect(result.createdCount).toBe(6);
    expect(await dosesForOrder(order.id)).toHaveLength(6);
  });

  it("TID expansion creates 9 doses in 72h", async () => {
    const order = await createMedicationOrder({ catalogItemId: genericCatalogId, frequencyCode: "TID" });
    const schedule = await resetScheduleDosesForManualExpansion(order.id);
    const result = await expansionService.expandForSchedule(schedule.id, {
      anchorAt: fixedAnchor,
      horizonEndAt: fixedHorizonEnd,
    });
    expect(result.createdCount).toBe(9);
    expect(await dosesForOrder(order.id)).toHaveLength(9);
  });

  it("QID expansion creates 12 doses in 72h", async () => {
    const order = await createMedicationOrder({ catalogItemId: genericCatalogId, frequencyCode: "QID" });
    const schedule = await resetScheduleDosesForManualExpansion(order.id);
    const result = await expansionService.expandForSchedule(schedule.id, {
      anchorAt: fixedAnchor,
      horizonEndAt: fixedHorizonEnd,
    });
    expect(result.createdCount).toBe(12);
    expect(await dosesForOrder(order.id)).toHaveLength(12);
  });

  it("idempotent rerun creates no duplicates", async () => {
    const order = await createMedicationOrder({ catalogItemId: genericCatalogId, frequencyCode: "Q6H" });
    const schedule = await resetScheduleDosesForManualExpansion(order.id);
    const first = await expansionService.expandForSchedule(schedule.id, {
      anchorAt: fixedAnchor,
      horizonEndAt: fixedHorizonEnd,
    });
    const second = await expansionService.expandForSchedule(schedule.id, {
      anchorAt: fixedAnchor,
      horizonEndAt: fixedHorizonEnd,
    });
    expect(first.createdCount).toBe(13);
    expect(second.createdCount).toBe(0);
    expect(second.reason).toBe("ALREADY_MATERIALIZED");
    expect(await dosesForOrder(order.id)).toHaveLength(13);
  });

  it("creates PLANNED FIXED_ADMINISTRATION doses only", async () => {
    const order = await createMedicationOrder({ catalogItemId: genericCatalogId, frequencyCode: "BID" });
    const doses = await dosesForOrder(order.id);
    expect(doses.every((d) => d.doseStatus === MEDICATION_DOSE_INSTANCE_STATUS_PLANNED)).toBe(true);
    expect(doses.every((d) => d.doseKind === MEDICATION_DOSE_KIND_FIXED_ADMINISTRATION)).toBe(true);
  });

  it.each(["NOW", "STAT", "ONCE"] as const)(
    "DIRECT_MAR %s → no schedule and no doses",
    async (frequencyCode) => {
      const order = await createMedicationOrder({ catalogItemId: genericCatalogId, frequencyCode });
      expect(await prisma.medicationOrderSchedule.count({ where: { orderId: order.id } })).toBe(0);
      expect(await dosesForOrder(order.id)).toHaveLength(0);
    }
  );

  it("PRN ON_DEMAND schedule does not expand", async () => {
    const order = await createMedicationOrder({ catalogItemId: genericCatalogId, frequencyCode: "PRN" });
    const schedule = await prisma.medicationOrderSchedule.findFirst({ where: { orderId: order.id } });
    expect(schedule!.scheduleClassification).toBe("ON_DEMAND");
    const result = await expansionService.expandForSchedule(schedule!.id);
    expect(result.createdCount).toBe(0);
    expect(result.reason).toBe("NOT_RECURRING");
    expect(await dosesForOrder(order.id)).toHaveLength(0);
  });

  it("CONTINUOUS infusion → no schedule and no doses", async () => {
    const order = await createMedicationOrder({
      catalogItemId: genericCatalogId,
      frequencyCode: "CONTINUOUS",
    });
    expect(await prisma.medicationOrderSchedule.count({ where: { orderId: order.id } })).toBe(0);
    expect(await dosesForOrder(order.id)).toHaveLength(0);
  });

  it("blood product does not expand", async () => {
    const order = await createMedicationOrder({
      catalogItemId: prbcCatalogId,
      frequencyCode: "ONCE",
      route: "IVPB",
    });
    expect(await prisma.medicationOrderSchedule.count({ where: { orderId: order.id } })).toBe(0);
    expect(await dosesForOrder(order.id)).toHaveLength(0);
  });

  it("IVPB route recurring order does not expand", async () => {
    const order = await createMedicationOrder({
      catalogItemId: vancomycinCatalogId,
      frequencyCode: "Q12H",
      route: "IVPB",
    });
    expect(await prisma.medicationOrderSchedule.count({ where: { orderId: order.id } })).toBe(0);
    expect(await dosesForOrder(order.id)).toHaveLength(0);
  });

  it("snapshot immutability — catalog update does not alter existing dose rows", async () => {
    const order = await createMedicationOrder({ catalogItemId: genericCatalogId, frequencyCode: "BID" });
    const before = await dosesForOrder(order.id);
    const originalCatalogSnapshot = before[0]!.medicationCatalogSnapshotJson;

    await prisma.catalogMedication.update({
      where: { id: genericCatalogId },
      data: { displayNameEn: "Changed Generic Name" },
    });

    const after = await dosesForOrder(order.id);
    expect(after[0]!.medicationCatalogSnapshotJson).toEqual(originalCatalogSnapshot);
    expect(after[0]!.frequencySnapshotJson).toEqual(before[0]!.frequencySnapshotJson);
    expect(after[0]!.scheduleClassificationSnapshot).toBe("RECURRING");
  });

  it("assigns monotonic doseSequenceNumber without gaps", async () => {
    const order = await createMedicationOrder({ catalogItemId: genericCatalogId, frequencyCode: "TID" });
    const doses = await dosesForOrder(order.id);
    expect(doses.map((d) => d.doseSequenceNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
