/**
 * M1.8B.7H.1b — order-create wiring + horizon maintenance tests.
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
  MEDICATION_DOSE_HORIZON_REPLENISH_THRESHOLD_MS,
  type MedicationFrequencyCode,
  type MedicationRoute,
  type OrderCreateDto,
} from "@medora/shared";
import { MedicationDoseExpansionService } from "./medication-dose-expansion.service";
import { MedicationDoseHorizonMaintenanceService } from "./medication-dose-horizon-maintenance.service";

describe("MedicationDoseHorizonMaintenance (M1.8B.7H.1b)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ordersService: OrdersService;
  let expansionService: MedicationDoseExpansionService;
  let maintenanceService: MedicationDoseHorizonMaintenanceService;

  const suffix = randomBytes(4).toString("hex");
  let facilityId: string;
  let userId: string;
  let genericCatalogId: string;
  let prbcCatalogId: string;
  let vancomycinCatalogId: string;

  const savedEnv: Record<string, string | undefined> = {};

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? "test_access_secret";
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "test_refresh_secret";
    process.env.JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? "15m";
    process.env.JWT_REFRESH_TTL = process.env.JWT_REFRESH_TTL ?? "14d";
    process.env.TOKEN_ISSUER = process.env.TOKEN_ISSUER ?? "medora-s";
    process.env.AUDIT_FAILURE_MODE = process.env.AUDIT_FAILURE_MODE ?? "best_effort";
    process.env.MEDICATION_DOSE_HORIZON_MAINTENANCE_ENABLED = "true";

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    ordersService = moduleFixture.get<OrdersService>(OrdersService);
    expansionService = moduleFixture.get<MedicationDoseExpansionService>(MedicationDoseExpansionService);
    maintenanceService = moduleFixture.get<MedicationDoseHorizonMaintenanceService>(
      MedicationDoseHorizonMaintenanceService
    );

    const facility = await prisma.facility.create({
      data: {
        code: `MDH-${suffix}`,
        name: "Dose horizon maintenance test",
        country: "Test",
        timezone: "UTC",
      },
    });
    facilityId = facility.id;

    const user = await prisma.user.create({
      data: {
        email: `mdh-${suffix}@test.local`,
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

  function setIvpbSchedulingFlags(on: boolean) {
    setSchedulingFlags(on);
    const key = "MEDICATION_IVPB_DOSE_SCHEDULING";
    if (!(key in savedEnv)) savedEnv[key] = process.env[key];
    process.env[key] = on ? "true" : "false";
  }

  async function createOpenEncounter() {
    const patient = await prisma.patient.create({
      data: {
        facilityId,
        registeredAtFacilityId: facilityId,
        firstName: "Horizon",
        lastName: `Case-${randomBytes(2).toString("hex")}`,
        mrn: `MRN-MDH-${randomBytes(3).toString("hex")}`,
        globalMrn: `GM-MDH-${randomBytes(3).toString("hex")}`,
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

  it("order-create wiring expands RECURRING BID doses automatically", async () => {
    const order = await createMedicationOrder({ catalogItemId: genericCatalogId, frequencyCode: "BID" });
    const doses = await dosesForOrder(order.id);
    expect(doses.length).toBeGreaterThan(0);
    expect(doses.every((d) => d.doseStatus === "PLANNED")).toBe(true);
  });

  it("order-create wiring does not expand PRN ON_DEMAND schedules", async () => {
    const order = await createMedicationOrder({ catalogItemId: genericCatalogId, frequencyCode: "PRN" });
    expect(await prisma.medicationOrderSchedule.count({ where: { orderId: order.id } })).toBe(1);
    expect(await dosesForOrder(order.id)).toHaveLength(0);
  });

  it.each(["NOW", "STAT", "ONCE"] as const)(
    "order-create wiring does not expand DIRECT_MAR %s",
    async (frequencyCode) => {
      const order = await createMedicationOrder({ catalogItemId: genericCatalogId, frequencyCode });
      expect(await prisma.medicationOrderSchedule.count({ where: { orderId: order.id } })).toBe(0);
      expect(await dosesForOrder(order.id)).toHaveLength(0);
    }
  );

  it("order-create wiring does not expand CONTINUOUS INFUSION_LIFECYCLE", async () => {
    const order = await createMedicationOrder({
      catalogItemId: genericCatalogId,
      frequencyCode: "CONTINUOUS",
    });
    expect(await dosesForOrder(order.id)).toHaveLength(0);
  });

  it("order-create wiring does not expand IVPB route orders when IVPB flag OFF", async () => {
    setSchedulingFlags(true);
    process.env.MEDICATION_IVPB_DOSE_SCHEDULING = "false";
    const order = await createMedicationOrder({
      catalogItemId: vancomycinCatalogId,
      frequencyCode: "Q12H",
      route: "IVPB",
    });
    expect(await dosesForOrder(order.id)).toHaveLength(0);
  });

  it("horizon maintenance replenishes RECURRING_IVPB schedules", async () => {
    setIvpbSchedulingFlags(true);
    const now = new Date();
    const anchorAt = new Date(now.getTime() - 60 * 60 * 60 * 1000);
    const staleHorizonEnd = new Date(anchorAt.getTime() + MEDICATION_DOSE_EXPANSION_HORIZON_MS);

    const order = await createMedicationOrder({
      catalogItemId: vancomycinCatalogId,
      frequencyCode: "Q12H",
      route: "IVPB",
    });
    const schedule = await prisma.medicationOrderSchedule.findFirst({ where: { orderId: order.id } });
    expect(schedule?.scheduleClassification).toBe("RECURRING_IVPB");

    await prisma.medicationDoseInstance.deleteMany({ where: { medicationOrderScheduleId: schedule!.id } });
    await prisma.medicationOrderSchedule.update({
      where: { id: schedule!.id },
      data: { createdAt: anchorAt },
    });

    await expansionService.expandForSchedule(schedule!.id, {
      anchorAt,
      horizonEndAt: staleHorizonEnd,
    });

    const snap = await maintenanceService.runOnce(now);
    expect(snap.status).toBe("ok");
    expect(snap.dosesCreated).toBeGreaterThan(0);

    const doses = await dosesForOrder(order.id);
    expect(doses.some((d) => d.doseKind === "IVPB_SESSION")).toBe(true);
  });

  it("order-create wiring does not expand blood products", async () => {
    const order = await createMedicationOrder({
      catalogItemId: prbcCatalogId,
      frequencyCode: "ONCE",
      route: "IVPB",
    });
    expect(await dosesForOrder(order.id)).toHaveLength(0);
  });

  it("horizon maintenance replenishes when coverage falls below 48h", async () => {
    const now = new Date();
    const anchorAt = new Date(now.getTime() - 60 * 60 * 60 * 1000);
    const staleHorizonEnd = new Date(anchorAt.getTime() + MEDICATION_DOSE_EXPANSION_HORIZON_MS);

    const order = await createMedicationOrder({ catalogItemId: genericCatalogId, frequencyCode: "Q6H" });
    const schedule = await prisma.medicationOrderSchedule.findFirst({ where: { orderId: order.id } });
    expect(schedule).toBeTruthy();

    await prisma.medicationDoseInstance.deleteMany({ where: { medicationOrderScheduleId: schedule!.id } });
    await prisma.medicationOrderSchedule.update({
      where: { id: schedule!.id },
      data: { createdAt: anchorAt },
    });

    await expansionService.expandForSchedule(schedule!.id, {
      anchorAt,
      horizonEndAt: staleHorizonEnd,
    });

    const beforeMaintenance = await prisma.medicationDoseInstance.findFirst({
      where: {
        medicationOrderScheduleId: schedule!.id,
        scheduledAt: { gt: now },
        doseStatus: { notIn: ["CANCELLED", "SUPERSEDED"] },
      },
      orderBy: { scheduledAt: "desc" },
    });
    const coverageBefore = beforeMaintenance
      ? beforeMaintenance.scheduledAt.getTime() - now.getTime()
      : 0;
    expect(coverageBefore).toBeLessThan(MEDICATION_DOSE_HORIZON_REPLENISH_THRESHOLD_MS);

    const snap = await maintenanceService.runOnce(now);
    expect(snap.status).toBe("ok");
    expect(snap.dosesCreated).toBeGreaterThan(0);

    const afterMaintenance = await prisma.medicationDoseInstance.findFirst({
      where: {
        medicationOrderScheduleId: schedule!.id,
        scheduledAt: { gt: now },
        doseStatus: { notIn: ["CANCELLED", "SUPERSEDED"] },
      },
      orderBy: { scheduledAt: "desc" },
    });
    const coverageAfter = afterMaintenance
      ? afterMaintenance.scheduledAt.getTime() - now.getTime()
      : 0;
    expect(coverageAfter).toBeGreaterThanOrEqual(MEDICATION_DOSE_HORIZON_REPLENISH_THRESHOLD_MS);
  });

  it("maintenance idempotent rerun creates no duplicates", async () => {
    const order = await createMedicationOrder({ catalogItemId: genericCatalogId, frequencyCode: "BID" });
    const beforeCount = (await dosesForOrder(order.id)).length;
    expect(beforeCount).toBeGreaterThan(0);

    const first = await maintenanceService.runOnce();
    const second = await maintenanceService.runOnce();
    expect(first.dosesCreated).toBe(0);
    expect(second.dosesCreated).toBe(0);
    expect(await dosesForOrder(order.id)).toHaveLength(beforeCount);
  });

  it("maintenance preserves completed doses", async () => {
    const order = await createMedicationOrder({ catalogItemId: genericCatalogId, frequencyCode: "TID" });
    const doses = await dosesForOrder(order.id);
    const first = doses[0]!;
    const completedAt = new Date("2026-06-10T15:00:00.000Z");

    await prisma.medicationDoseInstance.update({
      where: { id: first.id },
      data: {
        doseStatus: "COMPLETED",
        updatedAt: completedAt,
      },
    });

    const before = await prisma.medicationDoseInstance.findUnique({ where: { id: first.id } });
    await maintenanceService.runOnce();
    await maintenanceService.runOnce();
    const after = await prisma.medicationDoseInstance.findUnique({ where: { id: first.id } });

    expect(after!.doseStatus).toBe("COMPLETED");
    expect(after!.scheduledAt.toISOString()).toBe(before!.scheduledAt.toISOString());
    expect(after!.frequencySnapshotJson).toEqual(before!.frequencySnapshotJson);
    expect(after!.doseSequenceNumber).toBe(1);
  });

  it("maintenance skips non-ACTIVE schedules", async () => {
    const order = await createMedicationOrder({ catalogItemId: genericCatalogId, frequencyCode: "BID" });
    const schedule = await prisma.medicationOrderSchedule.findFirst({ where: { orderId: order.id } });
    await prisma.medicationOrderSchedule.update({
      where: { id: schedule!.id },
      data: { scheduleStatus: "CANCELLED", cancelledAt: new Date() },
    });
    await prisma.medicationDoseInstance.deleteMany({ where: { medicationOrderScheduleId: schedule!.id } });

    const snap = await maintenanceService.runOnce();
    expect(snap.schedulesScanned).toBeGreaterThanOrEqual(0);
    expect(await prisma.medicationDoseInstance.count({ where: { medicationOrderScheduleId: schedule!.id } })).toBe(
      0
    );
  });

  it("maintenance preserves monotonic doseSequenceNumber without gaps after replenishment", async () => {
    const now = new Date();
    const anchorAt = new Date(now.getTime() - 60 * 60 * 60 * 1000);
    const order = await createMedicationOrder({ catalogItemId: genericCatalogId, frequencyCode: "Q6H" });
    const schedule = await prisma.medicationOrderSchedule.findFirst({ where: { orderId: order.id } });

    await prisma.medicationDoseInstance.deleteMany({ where: { medicationOrderScheduleId: schedule!.id } });
    await prisma.medicationOrderSchedule.update({
      where: { id: schedule!.id },
      data: { createdAt: anchorAt },
    });
    await expansionService.expandForSchedule(schedule!.id, {
      anchorAt,
      horizonEndAt: new Date(anchorAt.getTime() + MEDICATION_DOSE_EXPANSION_HORIZON_MS),
    });
    await maintenanceService.runOnce(now);

    const doses = await dosesForOrder(order.id);
    const seqs = doses.map((d) => d.doseSequenceNumber);
    expect(seqs).toEqual(Array.from({ length: seqs.length }, (_, i) => i + 1));
  });
});
