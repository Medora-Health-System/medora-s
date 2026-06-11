/**
 * M1.8B.7I.4 — Medication pass queue read API tests.
 */
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { randomBytes } from "crypto";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";
import { OrdersService } from "../orders/orders.service";
import { EncounterStatus, EncounterType, RoleCode } from "@prisma/client";
import type { MedicationFrequencyCode, MedicationRoute, OrderCreateDto } from "@medora/shared";
import { MedicationPassQueueService } from "./medication-pass-queue.service";
import { MedicationDoseStatusPromotionService } from "./medication-dose-status-promotion.service";

describe("MedicationPassQueueService (M1.8B.7I.4)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ordersService: OrdersService;
  let passQueueService: MedicationPassQueueService;
  let promotionService: MedicationDoseStatusPromotionService;

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
    passQueueService = moduleFixture.get<MedicationPassQueueService>(MedicationPassQueueService);
    promotionService = moduleFixture.get<MedicationDoseStatusPromotionService>(
      MedicationDoseStatusPromotionService
    );

    const facility = await prisma.facility.create({
      data: {
        code: `MPQ-${suffix}`,
        name: "Pass queue test",
        country: "Test",
        timezone: "UTC",
      },
    });
    facilityId = facility.id;

    const nurse = await prisma.user.create({
      data: {
        email: `mpq-nurse-${suffix}@test.local`,
        firstName: "Nurse",
        lastName: "Queue",
        passwordHash: "hash",
      },
    });
    nurseUserId = nurse.id;

    const generic = await prisma.catalogMedication.create({
      data: {
        code: `GENERIC_MPQ_${suffix}`,
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

  async function createEncounterWithNurse(roomLabel = "12") {
    const patient = await prisma.patient.create({
      data: {
        facilityId,
        registeredAtFacilityId: facilityId,
        firstName: "Pass",
        lastName: `Patient-${randomBytes(2).toString("hex")}`,
        mrn: `MRN-MPQ-${randomBytes(3).toString("hex")}`,
        globalMrn: `GM-MPQ-${randomBytes(3).toString("hex")}`,
      },
    });
    return prisma.encounter.create({
      data: {
        facilityId,
        patientId: patient.id,
        type: EncounterType.EMERGENCY,
        status: EncounterStatus.OPEN,
        roomLabel,
        nurseAssignedUserId: nurseUserId,
      },
    });
  }

  async function createBidOrderForEncounter(encounterId: string) {
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
    const order = await ordersService.create(encounterId, facilityId, payload, nurseUserId);
    return prisma.medicationDoseInstance.findMany({
      where: { orderId: order.id },
      orderBy: { doseSequenceNumber: "asc" },
    });
  }

  async function seedDoseStatuses(input: {
    doseStatus: string;
    windowStart: Date;
    windowEnd: Date;
    responseDueAt?: Date | null;
  }) {
    const encounter = await createEncounterWithNurse();
    const doses = await createBidOrderForEncounter(encounter.id);
    const dose = doses[0]!;
    await prisma.medicationDoseInstance.update({
      where: { id: dose.id },
      data: {
        doseStatus: input.doseStatus,
        dueWindowStartAt: input.windowStart,
        dueWindowEndAt: input.windowEnd,
        scheduledAt: input.windowStart,
        responseDueAt: input.responseDueAt ?? null,
      },
    });
    return { encounter, dose: { ...dose, ...input } };
  }

  beforeEach(() => {
    setSchedulingFlags(true);
  });

  it("returns DUE doses", async () => {
    const windowStart = new Date("2026-06-10T09:00:00.000Z");
    const windowEnd = new Date("2026-06-10T10:00:00.000Z");
    const { encounter, dose } = await seedDoseStatuses({
      doseStatus: "DUE",
      windowStart,
      windowEnd,
    });

    const result = await passQueueService.getPassQueue(facilityId, {
      encounterId: encounter.id,
    });

    expect(result.enabled).toBe(true);
    expect(result.items.some((i) => i.medicationDoseInstanceId === dose.id)).toBe(true);
    expect(result.items.find((i) => i.medicationDoseInstanceId === dose.id)?.queueBucket).toBe(
      "DUE"
    );
  });

  it("returns OVERDUE doses", async () => {
    const windowStart = new Date("2026-06-10T09:00:00.000Z");
    const windowEnd = new Date("2026-06-10T10:00:00.000Z");
    const { encounter, dose } = await seedDoseStatuses({
      doseStatus: "OVERDUE",
      windowStart,
      windowEnd,
    });

    const result = await passQueueService.getPassQueue(facilityId, {
      encounterId: encounter.id,
    });

    expect(result.items.find((i) => i.medicationDoseInstanceId === dose.id)?.queueBucket).toBe(
      "OVERDUE"
    );
  });

  it("includes UPCOMING when requested", async () => {
    const windowStart = new Date("2026-06-10T14:00:00.000Z");
    const windowEnd = new Date("2026-06-10T15:00:00.000Z");
    const { encounter, dose } = await seedDoseStatuses({
      doseStatus: "PLANNED",
      windowStart,
      windowEnd,
    });

    const without = await passQueueService.getPassQueue(facilityId, {
      encounterId: encounter.id,
    });
    expect(without.items.some((i) => i.medicationDoseInstanceId === dose.id)).toBe(false);

    const withUpcoming = await passQueueService.getPassQueue(facilityId, {
      encounterId: encounter.id,
      includeUpcoming: true,
    });
    expect(withUpcoming.items.find((i) => i.medicationDoseInstanceId === dose.id)?.queueBucket).toBe(
      "UPCOMING"
    );
  });

  it("excludes terminal doses by default", async () => {
    const windowStart = new Date("2026-06-10T09:00:00.000Z");
    const windowEnd = new Date("2026-06-10T10:00:00.000Z");
    const { encounter, dose } = await seedDoseStatuses({
      doseStatus: "COMPLETED",
      windowStart,
      windowEnd,
    });

    const result = await passQueueService.getPassQueue(facilityId, {
      encounterId: encounter.id,
    });
    expect(result.items.some((i) => i.medicationDoseInstanceId === dose.id)).toBe(false);
  });

  it("filters by encounterId", async () => {
    const windowStart = new Date("2026-06-10T09:00:00.000Z");
    const windowEnd = new Date("2026-06-10T10:00:00.000Z");
    const first = await seedDoseStatuses({ doseStatus: "DUE", windowStart, windowEnd });
    const second = await seedDoseStatuses({ doseStatus: "DUE", windowStart, windowEnd });

    const result = await passQueueService.getPassQueue(facilityId, {
      encounterId: first.encounter.id,
    });

    expect(result.items.some((i) => i.medicationDoseInstanceId === first.dose.id)).toBe(true);
    expect(result.items.some((i) => i.medicationDoseInstanceId === second.dose.id)).toBe(false);
  });

  it("filters by shiftStart/shiftEnd using due window overlap", async () => {
    const windowStart = new Date("2026-06-10T09:00:00.000Z");
    const windowEnd = new Date("2026-06-10T10:00:00.000Z");
    const inside = await seedDoseStatuses({ doseStatus: "DUE", windowStart, windowEnd });
    const outside = await seedDoseStatuses({
      doseStatus: "DUE",
      windowStart: new Date("2026-06-11T09:00:00.000Z"),
      windowEnd: new Date("2026-06-11T10:00:00.000Z"),
    });

    const result = await passQueueService.getPassQueue(facilityId, {
      shiftStart: new Date("2026-06-10T08:00:00.000Z"),
      shiftEnd: new Date("2026-06-10T12:00:00.000Z"),
    });

    expect(result.items.some((i) => i.medicationDoseInstanceId === inside.dose.id)).toBe(true);
    expect(result.items.some((i) => i.medicationDoseInstanceId === outside.dose.id)).toBe(false);
  });

  it("maps queue buckets correctly after promotion", async () => {
    const windowStart = new Date("2026-06-10T09:00:00.000Z");
    const windowEnd = new Date("2026-06-10T10:00:00.000Z");
    const now = new Date("2026-06-10T09:30:00.000Z");
    const { encounter, dose } = await seedDoseStatuses({
      doseStatus: "PLANNED",
      windowStart,
      windowEnd,
    });

    await promotionService.runOnce({ now, encounterId: encounter.id });

    const result = await passQueueService.getPassQueue(facilityId, {
      encounterId: encounter.id,
    });

    const item = result.items.find((i) => i.medicationDoseInstanceId === dose.id);
    expect(item?.doseStatus).toBe("DUE");
    expect(item?.queueBucket).toBe("DUE");
  });

  it("flags OFF returns disabled empty response", async () => {
    const windowStart = new Date("2026-06-10T09:00:00.000Z");
    const windowEnd = new Date("2026-06-10T10:00:00.000Z");
    const { encounter } = await seedDoseStatuses({ doseStatus: "DUE", windowStart, windowEnd });

    setSchedulingFlags(false);

    const result = await passQueueService.getPassQueue(facilityId, {
      encounterId: encounter.id,
    });

    expect(result.enabled).toBe(false);
    expect(result.items).toHaveLength(0);

    setSchedulingFlags(true);
  });

  it("does not mutate dose statuses on read", async () => {
    const windowStart = new Date("2026-06-10T09:00:00.000Z");
    const windowEnd = new Date("2026-06-10T10:00:00.000Z");
    const { encounter, dose } = await seedDoseStatuses({
      doseStatus: "PLANNED",
      windowStart,
      windowEnd,
    });

    await passQueueService.getPassQueue(facilityId, {
      encounterId: encounter.id,
      includeUpcoming: true,
    });

    const row = await prisma.medicationDoseInstance.findUniqueOrThrow({ where: { id: dose.id } });
    expect(row.doseStatus).toBe("PLANNED");
  });

  it("filters by assignedToUserId", async () => {
    const windowStart = new Date("2026-06-10T09:00:00.000Z");
    const windowEnd = new Date("2026-06-10T10:00:00.000Z");
    const assigned = await seedDoseStatuses({ doseStatus: "DUE", windowStart, windowEnd });

    const otherNurse = await prisma.user.create({
      data: {
        email: `mpq-other-${randomBytes(2).toString("hex")}@test.local`,
        firstName: "Other",
        lastName: "Nurse",
        passwordHash: "hash",
      },
    });

    const unassignedEncounter = await prisma.encounter.create({
      data: {
        facilityId,
        patientId: (
          await prisma.patient.create({
            data: {
              facilityId,
              registeredAtFacilityId: facilityId,
              firstName: "Unassigned",
              lastName: "Patient",
              mrn: `MRN-U-${randomBytes(3).toString("hex")}`,
              globalMrn: `GM-U-${randomBytes(3).toString("hex")}`,
            },
          })
        ).id,
        type: EncounterType.EMERGENCY,
        status: EncounterStatus.OPEN,
        nurseAssignedUserId: otherNurse.id,
      },
    });
    const doses = await createBidOrderForEncounter(unassignedEncounter.id);
    await prisma.medicationDoseInstance.update({
      where: { id: doses[0]!.id },
      data: { doseStatus: "DUE", dueWindowStartAt: windowStart, dueWindowEndAt: windowEnd },
    });

    const result = await passQueueService.getPassQueue(facilityId, {
      assignedToUserId: nurseUserId,
      shiftStart: windowStart,
      shiftEnd: windowEnd,
    });

    expect(result.items.some((i) => i.medicationDoseInstanceId === assigned.dose.id)).toBe(true);
    expect(result.items.some((i) => i.medicationDoseInstanceId === doses[0]!.id)).toBe(false);
  });

  it("returns responseDueAt when present", async () => {
    const responseDueAt = new Date("2026-06-10T11:00:00.000Z");
    const windowStart = new Date("2026-06-10T09:00:00.000Z");
    const windowEnd = new Date("2026-06-10T10:00:00.000Z");
    const { encounter, dose } = await seedDoseStatuses({
      doseStatus: "DUE",
      windowStart,
      windowEnd,
      responseDueAt,
    });

    const result = await passQueueService.getPassQueue(facilityId, {
      encounterId: encounter.id,
    });

    expect(result.items.find((i) => i.medicationDoseInstanceId === dose.id)?.responseDueAt).toBe(
      responseDueAt.toISOString()
    );
  });
});

describe("MedicationPassQueueService IVPB_SESSION (M1.8B.7J.4)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ordersService: OrdersService;
  let passQueueService: MedicationPassQueueService;

  const suffix = randomBytes(4).toString("hex");
  let facilityId: string;
  let nurseUserId: string;
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
    passQueueService = moduleFixture.get<MedicationPassQueueService>(MedicationPassQueueService);

    const facility = await prisma.facility.create({
      data: {
        code: `MPQ-IVPB-${suffix}`,
        name: "IVPB pass queue test",
        country: "Test",
        timezone: "UTC",
      },
    });
    facilityId = facility.id;

    const nurse = await prisma.user.create({
      data: {
        email: `mpq-ivpb-${suffix}@test.local`,
        firstName: "IVPB",
        lastName: "Nurse",
        passwordHash: "hash",
      },
    });
    nurseUserId = nurse.id;

    const vancomycin = await prisma.catalogMedication.create({
      data: {
        code: `VANCO_MPQ_${suffix}`,
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

  async function createEncounter() {
    const patient = await prisma.patient.create({
      data: {
        facilityId,
        registeredAtFacilityId: facilityId,
        firstName: "IVPB",
        lastName: `Patient-${randomBytes(2).toString("hex")}`,
        mrn: `MRN-IVPB-${randomBytes(3).toString("hex")}`,
        globalMrn: `GM-IVPB-${randomBytes(3).toString("hex")}`,
      },
    });
    return prisma.encounter.create({
      data: {
        facilityId,
        patientId: patient.id,
        type: EncounterType.EMERGENCY,
        status: EncounterStatus.OPEN,
        nurseAssignedUserId: nurseUserId,
      },
    });
  }

  async function createRecurringIvpbOrder(encounterId: string) {
    const payload: OrderCreateDto = {
      type: "MEDICATION",
      items: [
        {
          catalogItemId: vancomycinCatalogId,
          catalogItemType: "MEDICATION",
          medicationFulfillmentIntent: "ADMINISTER_CHART",
          route: "IVPB" as MedicationRoute,
          frequencyCode: "Q12H" as MedicationFrequencyCode,
        },
      ],
    };
    const order = await ordersService.create(encounterId, facilityId, payload, nurseUserId);
    const doses = await prisma.medicationDoseInstance.findMany({
      where: { orderId: order.id },
      orderBy: { doseSequenceNumber: "asc" },
    });
    expect(doses.length).toBeGreaterThan(0);
    expect(doses.every((d) => d.doseKind === "IVPB_SESSION")).toBe(true);
    return { order, doses };
  }

  async function seedIvpbDose(input: {
    doseStatus: string;
    windowStart: Date;
    windowEnd: Date;
    infusionSessionId?: string | null;
    terminalMedicationAdministrationId?: string | null;
  }) {
    const encounter = await createEncounter();
    const { doses } = await createRecurringIvpbOrder(encounter.id);
    const dose = doses[0]!;
    await prisma.medicationDoseInstance.update({
      where: { id: dose.id },
      data: {
        doseStatus: input.doseStatus,
        dueWindowStartAt: input.windowStart,
        dueWindowEndAt: input.windowEnd,
        scheduledAt: input.windowStart,
        infusionSessionId: input.infusionSessionId ?? null,
        terminalMedicationAdministrationId: input.terminalMedicationAdministrationId ?? null,
      },
    });
    return { encounter, dose };
  }

  beforeEach(() => {
    setIvpbSchedulingFlags(true);
  });

  it("returns DUE IVPB_SESSION in DUE bucket with START_INFUSION action", async () => {
    const windowStart = new Date("2026-06-10T09:00:00.000Z");
    const windowEnd = new Date("2026-06-10T10:00:00.000Z");
    const { encounter, dose } = await seedIvpbDose({
      doseStatus: "DUE",
      windowStart,
      windowEnd,
    });

    const result = await passQueueService.getPassQueue(facilityId, {
      encounterId: encounter.id,
    });

    const item = result.items.find((i) => i.medicationDoseInstanceId === dose.id);
    expect(item?.doseKind).toBe("IVPB_SESSION");
    expect(item?.queueBucket).toBe("DUE");
    expect(item?.queueBadge).toBe("IVPB");
    expect(item?.clinicalAction).toBe("START_INFUSION");
    expect(item?.frequencyCode).toBe("Q12H");
    expect(item?.medicationOrderScheduleId).toBeTruthy();
  });

  it("returns OVERDUE IVPB_SESSION in OVERDUE bucket", async () => {
    const windowStart = new Date("2026-06-10T09:00:00.000Z");
    const windowEnd = new Date("2026-06-10T10:00:00.000Z");
    const { encounter, dose } = await seedIvpbDose({
      doseStatus: "OVERDUE",
      windowStart,
      windowEnd,
    });

    const result = await passQueueService.getPassQueue(facilityId, {
      encounterId: encounter.id,
    });

    expect(result.items.find((i) => i.medicationDoseInstanceId === dose.id)?.queueBucket).toBe(
      "OVERDUE"
    );
  });

  it("returns PLANNED IVPB_SESSION as UPCOMING only when includeUpcoming=true", async () => {
    const windowStart = new Date("2026-06-10T14:00:00.000Z");
    const windowEnd = new Date("2026-06-10T15:00:00.000Z");
    const { encounter, dose } = await seedIvpbDose({
      doseStatus: "PLANNED",
      windowStart,
      windowEnd,
    });

    const without = await passQueueService.getPassQueue(facilityId, {
      encounterId: encounter.id,
    });
    expect(without.items.some((i) => i.medicationDoseInstanceId === dose.id)).toBe(false);

    const withUpcoming = await passQueueService.getPassQueue(facilityId, {
      encounterId: encounter.id,
      includeUpcoming: true,
    });
    const item = withUpcoming.items.find((i) => i.medicationDoseInstanceId === dose.id);
    expect(item?.queueBucket).toBe("UPCOMING");
    expect(item?.clinicalAction).toBe("VIEW_UPCOMING");
  });

  it("returns IN_PROGRESS IVPB_SESSION as ACTIVE_INFUSION with STOP_INFUSION", async () => {
    const encounter = await createEncounter();
    const { order, doses } = await createRecurringIvpbOrder(encounter.id);
    const dose = doses[0]!;
    const now = new Date();
    await prisma.medicationDoseInstance.update({
      where: { id: dose.id },
      data: {
        doseStatus: "DUE",
        dueWindowStartAt: new Date(now.getTime() - 60_000),
        dueWindowEndAt: new Date(now.getTime() + 3_600_000),
        scheduledAt: new Date(now.getTime() - 60_000),
      },
    });

    await ordersService.startMedicationInfusion(
      facilityId,
      order.items[0]!.id,
      {},
      [RoleCode.RN],
      nurseUserId
    );

    const result = await passQueueService.getPassQueue(facilityId, {
      encounterId: encounter.id,
    });

    const item = result.items.find((i) => i.medicationDoseInstanceId === dose.id);
    expect(item?.queueBucket).toBe("ACTIVE_INFUSION");
    expect(item?.clinicalAction).toBe("STOP_INFUSION");
    expect(item?.infusionSessionId).toBeTruthy();
  });

  it("excludes COMPLETED IVPB_SESSION", async () => {
    const windowStart = new Date("2026-06-10T09:00:00.000Z");
    const windowEnd = new Date("2026-06-10T10:00:00.000Z");
    const { encounter, dose } = await seedIvpbDose({
      doseStatus: "COMPLETED",
      windowStart,
      windowEnd,
    });

    const result = await passQueueService.getPassQueue(facilityId, {
      encounterId: encounter.id,
    });
    expect(result.items.some((i) => i.medicationDoseInstanceId === dose.id)).toBe(false);
  });

  it("excludes IVPB_SESSION with terminalMedicationAdministrationId", async () => {
    const windowStart = new Date("2026-06-10T09:00:00.000Z");
    const windowEnd = new Date("2026-06-10T10:00:00.000Z");
    const { encounter, dose } = await seedIvpbDose({
      doseStatus: "DUE",
      windowStart,
      windowEnd,
    });

    const encounterRow = await prisma.encounter.findUniqueOrThrow({
      where: { id: encounter.id },
      select: { patientId: true },
    });
    const mar = await prisma.medicationAdministration.create({
      data: {
        facilityId,
        patientId: encounterRow.patientId,
        encounterId: encounter.id,
        orderItemId: dose.orderItemId,
        administeredByUserId: nurseUserId,
      },
    });
    await prisma.medicationDoseInstance.update({
      where: { id: dose.id },
      data: { terminalMedicationAdministrationId: mar.id },
    });

    const result = await passQueueService.getPassQueue(facilityId, {
      encounterId: encounter.id,
    });
    expect(result.items.some((i) => i.medicationDoseInstanceId === dose.id)).toBe(false);
  });

  it("hides IVPB_SESSION rows when MEDICATION_IVPB_DOSE_SCHEDULING is OFF", async () => {
    const windowStart = new Date("2026-06-10T09:00:00.000Z");
    const windowEnd = new Date("2026-06-10T10:00:00.000Z");
    const { encounter, dose } = await seedIvpbDose({
      doseStatus: "DUE",
      windowStart,
      windowEnd,
    });

    setIvpbSchedulingFlags(false);
    process.env.MEDICATION_SCHEDULING_V1 = "true";
    process.env.MEDICATION_DOSE_INSTANCES = "true";
    process.env.MEDICATION_IVPB_DOSE_SCHEDULING = "false";

    const result = await passQueueService.getPassQueue(facilityId, {
      encounterId: encounter.id,
    });
    expect(result.enabled).toBe(true);
    expect(result.items.some((i) => i.medicationDoseInstanceId === dose.id)).toBe(false);

    setIvpbSchedulingFlags(true);
  });

  it("does not mutate IVPB dose rows on read", async () => {
    const windowStart = new Date("2026-06-10T09:00:00.000Z");
    const windowEnd = new Date("2026-06-10T10:00:00.000Z");
    const { encounter, dose } = await seedIvpbDose({
      doseStatus: "PLANNED",
      windowStart,
      windowEnd,
    });

    await passQueueService.getPassQueue(facilityId, {
      encounterId: encounter.id,
      includeUpcoming: true,
    });

    const row = await prisma.medicationDoseInstance.findUniqueOrThrow({ where: { id: dose.id } });
    expect(row.doseStatus).toBe("PLANNED");
  });
});
