/**
 * M1.8B.7K.1 — Facility MAR shift timeline read API tests.
 */
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { randomBytes } from "crypto";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";
import { OrdersService } from "../orders/orders.service";
import { EncounterStatus, EncounterType, RoleCode } from "@prisma/client";
import type { MedicationFrequencyCode, MedicationRoute, OrderCreateDto } from "@medora/shared";
import { MarShiftTimelineService } from "./mar-shift-timeline.service";

describe("MarShiftTimelineService (M1.8B.7K.1)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ordersService: OrdersService;
  let timelineService: MarShiftTimelineService;

  const suffix = randomBytes(4).toString("hex");
  let facilityId: string;
  let facilityName: string;
  let nurseUserId: string;
  let genericCatalogId: string;
  let kclCatalogId: string;
  let vancomycinCatalogId: string;

  const savedEnv: Record<string, string | undefined> = {};

  const viewer = {
    userId: "",
    displayName: "Nurse Queue RN",
    role: "RN",
  };

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
    timelineService = moduleFixture.get<MarShiftTimelineService>(MarShiftTimelineService);

    const facility = await prisma.facility.create({
      data: {
        code: `MST-${suffix}`,
        name: "St. Mary Hospital",
        country: "Test",
        timezone: "UTC",
      },
    });
    facilityId = facility.id;
    facilityName = facility.name;

    const nurse = await prisma.user.create({
      data: {
        email: `mst-nurse-${suffix}@test.local`,
        firstName: "Jessica",
        lastName: "Nurse",
        passwordHash: "hash",
      },
    });
    nurseUserId = nurse.id;
    viewer.userId = nurseUserId;

    const generic = await prisma.catalogMedication.create({
      data: {
        code: `GENERIC_MST_${suffix}`,
        name: "Generic Medication",
        displayNameEn: "Generic Medication",
        displayNameFr: "Médicament générique",
        administrationType: "PUSH",
        route: "IVP",
      },
    });
    genericCatalogId = generic.id;

    const kcl = await prisma.catalogMedication.create({
      data: {
        code: `KCL_MST_${suffix}`,
        name: "Potassium Chloride",
        displayNameEn: "Potassium Chloride",
        displayNameFr: "Chlorure de potassium",
        genericName: "Potassium Chloride",
        administrationType: "INFUSION",
        route: "IV",
        requiresWitness: true,
      },
    });
    kclCatalogId = kcl.id;

    const vancomycin = await prisma.catalogMedication.create({
      data: {
        code: `VANCO_MST_${suffix}`,
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

  function setSchedulingFlags(on: boolean, ivpb = false) {
    for (const key of [
      "MEDICATION_SCHEDULING_V1",
      "MEDICATION_DOSE_INSTANCES",
      "MEDICATION_IVPB_DOSE_SCHEDULING",
    ]) {
      if (!(key in savedEnv)) savedEnv[key] = process.env[key];
      if (key === "MEDICATION_IVPB_DOSE_SCHEDULING") {
        process.env[key] = ivpb ? "true" : "false";
      } else {
        process.env[key] = on ? "true" : "false";
      }
    }
  }

  async function createEncounterWithNurse(roomLabel = "04") {
    const patient = await prisma.patient.create({
      data: {
        facilityId,
        registeredAtFacilityId: facilityId,
        firstName: "John",
        lastName: `Smith-${randomBytes(2).toString("hex")}`,
        mrn: `MRN-MST-${randomBytes(3).toString("hex")}`,
        globalMrn: `GM-MST-${randomBytes(3).toString("hex")}`,
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

  async function createBidOrder(encounterId: string, catalogItemId = genericCatalogId) {
    const payload: OrderCreateDto = {
      type: "MEDICATION",
      items: [
        {
          catalogItemId,
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
    return prisma.medicationDoseInstance.findMany({
      where: { orderId: order.id },
      orderBy: { doseSequenceNumber: "asc" },
    });
  }

  function allTimelineItems(result: Awaited<ReturnType<MarShiftTimelineService["getMarShiftTimeline"]>>) {
    return result.rows.flatMap((row) => row.cells.flatMap((cell) => cell.items));
  }

  beforeEach(() => {
    setSchedulingFlags(true, true);
  });

  it("returns enabled=false when scheduling flags are OFF", async () => {
    setSchedulingFlags(false);
    const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
      shiftCode: "7A_7P",
    });
    expect(result.enabled).toBe(false);
    expect(result.rows).toEqual([]);
    setSchedulingFlags(true, true);
  });

  it("response title uses facility name MAR SHIFT TIMELINE", async () => {
    const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
      shiftCode: "7A_7P",
    });
    expect(result.title).toBe(`${facilityName} MAR SHIFT TIMELINE`);
    expect(result.title).not.toContain("Medora MAR");
    expect(result.facility.name).toBe(facilityName);
  });

  it("7A_7P creates correct hour columns 07A through 07P", async () => {
    const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
      shiftCode: "7A_7P",
      shiftStart: new Date("2026-06-11T07:00:00.000Z"),
      shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
    });
    expect(result.shift.columns.map((c) => c.label)).toEqual([
      "07A",
      "08A",
      "09A",
      "10A",
      "11A",
      "12P",
      "01P",
      "02P",
      "03P",
      "04P",
      "05P",
      "06P",
      "07P",
    ]);
  });

  it("7P_7A creates overnight columns 07P through 07A", async () => {
    const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
      shiftCode: "7P_7A",
      shiftStart: new Date("2026-06-11T19:00:00.000Z"),
      shiftEnd: new Date("2026-06-12T08:00:00.000Z"),
    });
    expect(result.shift.columns.map((c) => c.label)).toEqual([
      "07P",
      "08P",
      "09P",
      "10P",
      "11P",
      "12A",
      "01A",
      "02A",
      "03A",
      "04A",
      "05A",
      "06A",
      "07A",
    ]);
  });

  it("encounter-scoped query groups by patient/room rows", async () => {
    const encounter = await createEncounterWithNurse("Room 04");
    const doses = await createBidOrder(encounter.id);
    const dose = doses[0]!;
    await prisma.medicationDoseInstance.update({
      where: { id: dose.id },
      data: {
        doseStatus: "DUE",
        scheduledAt: new Date("2026-06-11T08:00:00.000Z"),
        dueWindowStartAt: new Date("2026-06-11T08:00:00.000Z"),
        dueWindowEndAt: new Date("2026-06-11T09:00:00.000Z"),
      },
    });

    const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
      shiftCode: "7A_7P",
      shiftStart: new Date("2026-06-11T07:00:00.000Z"),
      shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
      encounterId: encounter.id,
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.roomLabel).toBe("Room 04");
    expect(result.rows[0]?.patientDisplay).toContain("John");
    expect(result.rows[0]?.encounterId).toBe(encounter.id);
  });

  it("FIXED_ADMINISTRATION DUE appears under correct hour with ADMINISTER action", async () => {
    const encounter = await createEncounterWithNurse();
    const doses = await createBidOrder(encounter.id);
    const dose = doses[0]!;
    await prisma.medicationDoseInstance.update({
      where: { id: dose.id },
      data: {
        doseStatus: "DUE",
        scheduledAt: new Date("2026-06-11T10:00:00.000Z"),
        dueWindowStartAt: new Date("2026-06-11T10:00:00.000Z"),
        dueWindowEndAt: new Date("2026-06-11T11:00:00.000Z"),
      },
    });

    const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
      shiftCode: "7A_7P",
      shiftStart: new Date("2026-06-11T07:00:00.000Z"),
      shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
      encounterId: encounter.id,
    });

    const item = allTimelineItems(result).find(
      (i) => i.medicationDoseInstanceId === dose.id
    );
    expect(item?.clinicalAction).toBe("ADMINISTER");
    expect(item?.doseKind).toBe("FIXED_ADMINISTRATION");
    const column = result.shift.columns.find((c) => c.label === "10A");
    expect(result.rows[0]?.cells.some((cell) => cell.columnKey === column?.key)).toBe(true);
  });

  it("IVPB_SESSION DUE appears with START_INFUSION action", async () => {
    const encounter = await createEncounterWithNurse();
    const doses = await createRecurringIvpbOrder(encounter.id);
    const dose = doses[0]!;
    await prisma.medicationDoseInstance.update({
      where: { id: dose.id },
      data: {
        doseStatus: "DUE",
        scheduledAt: new Date("2026-06-11T08:00:00.000Z"),
        dueWindowStartAt: new Date("2026-06-11T08:00:00.000Z"),
        dueWindowEndAt: new Date("2026-06-11T09:00:00.000Z"),
      },
    });

    const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
      shiftCode: "7A_7P",
      shiftStart: new Date("2026-06-11T07:00:00.000Z"),
      shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
      encounterId: encounter.id,
    });

    const item = allTimelineItems(result).find(
      (i) => i.medicationDoseInstanceId === dose.id
    );
    expect(item?.doseKind).toBe("IVPB_SESSION");
    expect(item?.clinicalAction).toBe("START_INFUSION");
    expect(item?.secondaryText).toBe("START");
  });

  it("IVPB_SESSION IN_PROGRESS appears with STOP_INFUSION action", async () => {
    const encounter = await createEncounterWithNurse();
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
    const order = await ordersService.create(encounter.id, facilityId, payload, nurseUserId);
    const doses = await prisma.medicationDoseInstance.findMany({
      where: { orderId: order.id },
      orderBy: { doseSequenceNumber: "asc" },
    });
    const dose = doses[0]!;
    await prisma.medicationDoseInstance.update({
      where: { id: dose.id },
      data: {
        doseStatus: "DUE",
        scheduledAt: new Date("2026-06-11T08:00:00.000Z"),
        dueWindowStartAt: new Date("2026-06-11T07:00:00.000Z"),
        dueWindowEndAt: new Date("2026-06-11T20:00:00.000Z"),
      },
    });

    await ordersService.startMedicationInfusion(
      facilityId,
      order.items[0]!.id,
      {},
      [RoleCode.RN],
      nurseUserId
    );

    const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
      shiftCode: "7A_7P",
      shiftStart: new Date("2026-06-11T07:00:00.000Z"),
      shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
      encounterId: encounter.id,
    });

    const item = allTimelineItems(result).find(
      (i) => i.medicationDoseInstanceId === dose.id
    );
    expect(item?.clinicalAction).toBe("STOP_INFUSION");
  });

  it("includes COMPLETED dose when includeCompleted=true", async () => {
    const encounter = await createEncounterWithNurse();
    const doses = await createBidOrder(encounter.id);
    const dose = doses[0]!;
    await prisma.medicationDoseInstance.update({
      where: { id: dose.id },
      data: {
        doseStatus: "COMPLETED",
        scheduledAt: new Date("2026-06-11T09:00:00.000Z"),
        dueWindowStartAt: new Date("2026-06-11T09:00:00.000Z"),
        dueWindowEndAt: new Date("2026-06-11T10:00:00.000Z"),
      },
    });

    const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
      shiftCode: "7A_7P",
      shiftStart: new Date("2026-06-11T07:00:00.000Z"),
      shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
      encounterId: encounter.id,
      includeCompleted: true,
    });

    expect(allTimelineItems(result).some((i) => i.medicationDoseInstanceId === dose.id)).toBe(
      true
    );
  });

  it("excludes COMPLETED dose when includeCompleted=false", async () => {
    const encounter = await createEncounterWithNurse();
    const doses = await createBidOrder(encounter.id);
    const dose = doses[0]!;
    await prisma.medicationDoseInstance.update({
      where: { id: dose.id },
      data: {
        doseStatus: "COMPLETED",
        scheduledAt: new Date("2026-06-11T09:00:00.000Z"),
        dueWindowStartAt: new Date("2026-06-11T09:00:00.000Z"),
        dueWindowEndAt: new Date("2026-06-11T10:00:00.000Z"),
      },
    });

    const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
      shiftCode: "7A_7P",
      shiftStart: new Date("2026-06-11T07:00:00.000Z"),
      shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
      encounterId: encounter.id,
      includeCompleted: false,
    });

    expect(allTimelineItems(result).some((i) => i.medicationDoseInstanceId === dose.id)).toBe(
      false
    );
  });

  it("includes PLANNED dose when includeUpcoming=true", async () => {
    const encounter = await createEncounterWithNurse();
    const doses = await createBidOrder(encounter.id);
    const dose = doses[1] ?? doses[0]!;
    await prisma.medicationDoseInstance.update({
      where: { id: dose.id },
      data: {
        doseStatus: "PLANNED",
        scheduledAt: new Date("2026-06-11T11:00:00.000Z"),
        dueWindowStartAt: new Date("2026-06-11T11:00:00.000Z"),
        dueWindowEndAt: new Date("2026-06-11T12:00:00.000Z"),
      },
    });

    const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
      shiftCode: "7A_7P",
      shiftStart: new Date("2026-06-11T07:00:00.000Z"),
      shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
      encounterId: encounter.id,
      includeUpcoming: true,
    });

    expect(allTimelineItems(result).some((i) => i.medicationDoseInstanceId === dose.id)).toBe(
      true
    );
  });

  it("excludes PLANNED dose when includeUpcoming=false", async () => {
    const encounter = await createEncounterWithNurse();
    const doses = await createBidOrder(encounter.id);
    const dose = doses[1] ?? doses[0]!;
    await prisma.medicationDoseInstance.update({
      where: { id: dose.id },
      data: {
        doseStatus: "PLANNED",
        scheduledAt: new Date("2026-06-11T11:00:00.000Z"),
        dueWindowStartAt: new Date("2026-06-11T11:00:00.000Z"),
        dueWindowEndAt: new Date("2026-06-11T12:00:00.000Z"),
      },
    });

    const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
      shiftCode: "7A_7P",
      shiftStart: new Date("2026-06-11T07:00:00.000Z"),
      shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
      encounterId: encounter.id,
      includeUpcoming: false,
    });

    expect(allTimelineItems(result).some((i) => i.medicationDoseInstanceId === dose.id)).toBe(
      false
    );
  });

  it("witness-required KCl exposes requiresWitness and Witness secondary text", async () => {
    const encounter = await createEncounterWithNurse();
    const payload: OrderCreateDto = {
      type: "MEDICATION",
      items: [
        {
          catalogItemId: kclCatalogId,
          catalogItemType: "MEDICATION",
          medicationFulfillmentIntent: "ADMINISTER_CHART",
          route: "IVPB" as MedicationRoute,
          frequencyCode: "Q12H" as MedicationFrequencyCode,
          notes: "20 mEq IVPB q12h",
        },
      ],
    };
    const order = await ordersService.create(encounter.id, facilityId, payload, nurseUserId);
    const doses = await prisma.medicationDoseInstance.findMany({ where: { orderId: order.id } });
    const dose = doses[0]!;
    await prisma.medicationDoseInstance.update({
      where: { id: dose.id },
      data: {
        doseStatus: "DUE",
        scheduledAt: new Date("2026-06-11T08:00:00.000Z"),
        dueWindowStartAt: new Date("2026-06-11T08:00:00.000Z"),
        dueWindowEndAt: new Date("2026-06-11T09:00:00.000Z"),
      },
    });

    const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
      shiftCode: "7A_7P",
      shiftStart: new Date("2026-06-11T07:00:00.000Z"),
      shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
      encounterId: encounter.id,
    });

    const item = allTimelineItems(result).find(
      (i) => i.medicationDoseInstanceId === dose.id
    );
    expect(item?.requiresWitness).toBe(true);
    expect(item?.secondaryText).toBe("Witness");
    expect(item?.hover.witness).toBe("Required");
    expect(item?.hover.title).toBeTruthy();
    expect(item?.hover.due).toBe("08:00");
    expect(item?.hover.status).toBe("Due");
  });

  it("does not mutate dose rows on read", async () => {
    const encounter = await createEncounterWithNurse();
    const doses = await createBidOrder(encounter.id);
    const dose = doses[0]!;
    await prisma.medicationDoseInstance.update({
      where: { id: dose.id },
      data: {
        doseStatus: "PLANNED",
        scheduledAt: new Date("2026-06-11T11:00:00.000Z"),
        dueWindowStartAt: new Date("2026-06-11T11:00:00.000Z"),
        dueWindowEndAt: new Date("2026-06-11T12:00:00.000Z"),
      },
    });

    await timelineService.getMarShiftTimeline(facilityId, viewer, {
      shiftCode: "7A_7P",
      shiftStart: new Date("2026-06-11T07:00:00.000Z"),
      shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
      encounterId: encounter.id,
      includeUpcoming: true,
    });

    const row = await prisma.medicationDoseInstance.findUniqueOrThrow({ where: { id: dose.id } });
    expect(row.doseStatus).toBe("PLANNED");
  });

  it("assignedToUserId filters rows to nurse-assigned encounters", async () => {
    const included = await createEncounterWithNurse("05");
    const excluded = await createEncounterWithNurse("06");
    await prisma.encounter.update({
      where: { id: excluded.id },
      data: { nurseAssignedUserId: null },
    });

    for (const enc of [included, excluded]) {
      const doses = await createBidOrder(enc.id);
      const dose = doses[0]!;
      await prisma.medicationDoseInstance.update({
        where: { id: dose.id },
        data: {
          doseStatus: "DUE",
          scheduledAt: new Date("2026-06-11T08:00:00.000Z"),
          dueWindowStartAt: new Date("2026-06-11T08:00:00.000Z"),
          dueWindowEndAt: new Date("2026-06-11T09:00:00.000Z"),
        },
      });
    }

    const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
      shiftCode: "7A_7P",
      shiftStart: new Date("2026-06-11T07:00:00.000Z"),
      shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
      assignedToUserId: nurseUserId,
    });

    expect(result.rows.some((r) => r.encounterId === included.id)).toBe(true);
    expect(result.rows.some((r) => r.encounterId === excluded.id)).toBe(false);
  });

  it("returns multiple medications in the same patient/hour cell", async () => {
    const encounter = await createEncounterWithNurse();
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
        {
          catalogItemId: kclCatalogId,
          catalogItemType: "MEDICATION",
          medicationFulfillmentIntent: "ADMINISTER_CHART",
          route: "IVPB" as MedicationRoute,
          frequencyCode: "Q12H" as MedicationFrequencyCode,
        },
      ],
    };
    const order = await ordersService.create(encounter.id, facilityId, payload, nurseUserId);
    const doses = await prisma.medicationDoseInstance.findMany({
      where: { orderId: order.id },
      orderBy: { doseSequenceNumber: "asc" },
    });
    expect(doses.length).toBeGreaterThanOrEqual(2);
    const hour = new Date("2026-06-11T08:00:00.000Z");

    for (const dose of [doses[0]!, doses[1]!]) {
      await prisma.medicationDoseInstance.update({
        where: { id: dose.id },
        data: {
          doseStatus: "DUE",
          scheduledAt: hour,
          dueWindowStartAt: hour,
          dueWindowEndAt: new Date("2026-06-11T09:00:00.000Z"),
        },
      });
    }

    const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
      shiftCode: "7A_7P",
      shiftStart: new Date("2026-06-11T07:00:00.000Z"),
      shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
      encounterId: encounter.id,
    });

    const cell = result.rows[0]?.cells.find((c) =>
      c.items.some((i) => i.medicationDoseInstanceId === doses[0]!.id)
    );
    expect(cell?.items.length).toBeGreaterThanOrEqual(2);
  });

  it("hides IVPB_SESSION when MEDICATION_IVPB_DOSE_SCHEDULING=false", async () => {
    const encounter = await createEncounterWithNurse();
    const doses = await createRecurringIvpbOrder(encounter.id);
    const dose = doses[0]!;
    await prisma.medicationDoseInstance.update({
      where: { id: dose.id },
      data: {
        doseStatus: "DUE",
        scheduledAt: new Date("2026-06-11T08:00:00.000Z"),
        dueWindowStartAt: new Date("2026-06-11T08:00:00.000Z"),
        dueWindowEndAt: new Date("2026-06-11T09:00:00.000Z"),
      },
    });

    setSchedulingFlags(true, false);
    process.env.MEDICATION_IVPB_DOSE_SCHEDULING = "false";

    const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
      shiftCode: "7A_7P",
      shiftStart: new Date("2026-06-11T07:00:00.000Z"),
      shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
      encounterId: encounter.id,
    });

    expect(allTimelineItems(result).some((i) => i.medicationDoseInstanceId === dose.id)).toBe(
      false
    );
    setSchedulingFlags(true, true);
  });

  it("response includes hover object with medication, due, route, witness, status", async () => {
    const encounter = await createEncounterWithNurse();
    const doses = await createBidOrder(encounter.id);
    const dose = doses[0]!;
    await prisma.medicationDoseInstance.update({
      where: { id: dose.id },
      data: {
        doseStatus: "DUE",
        scheduledAt: new Date("2026-06-11T08:00:00.000Z"),
        dueWindowStartAt: new Date("2026-06-11T08:00:00.000Z"),
        dueWindowEndAt: new Date("2026-06-11T09:00:00.000Z"),
      },
    });

    const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
      shiftCode: "7A_7P",
      shiftStart: new Date("2026-06-11T07:00:00.000Z"),
      shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
      encounterId: encounter.id,
    });

    const item = allTimelineItems(result)[0];
    expect(item?.hover).toEqual(
      expect.objectContaining({
        title: expect.any(String),
        due: expect.any(String),
        route: expect.anything(),
        status: expect.any(String),
      })
    );
    expect(item?.actions).toContain("VIEW_ORDER");
  });

  it("active IVPB returns startedAt and startedBy initials when MAR START row exists (K.3)", async () => {
    const encounter = await createEncounterWithNurse();
    const doses = await createRecurringIvpbOrder(encounter.id);
    const dose = doses[0]!;
    await prisma.medicationDoseInstance.update({
      where: { id: dose.id },
      data: {
        doseStatus: "DUE",
        scheduledAt: new Date("2026-06-11T08:00:00.000Z"),
        dueWindowStartAt: new Date("2026-06-11T07:00:00.000Z"),
        dueWindowEndAt: new Date("2026-06-11T20:00:00.000Z"),
      },
    });

    await ordersService.startMedicationInfusion(
      facilityId,
      dose.orderItemId,
      {},
      [RoleCode.RN],
      nurseUserId
    );

    const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
      shiftCode: "7A_7P",
      shiftStart: new Date("2026-06-11T07:00:00.000Z"),
      shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
      encounterId: encounter.id,
    });

    const item = allTimelineItems(result).find(
      (i) => i.medicationDoseInstanceId === dose.id
    );
    expect(item?.startedAt).toBeTruthy();
    expect(item?.startedByInitials).toBe("JN");
    expect(item?.tertiaryText).toContain("JN");
    expect(item?.tertiaryText).toContain("▶");
    expect(item?.secondaryText).toBe("INFUSING");
  });

  it("completed IVPB returns stoppedAt and stoppedBy initials when terminal MAR exists (K.3)", async () => {
    const encounter = await createEncounterWithNurse();
    const doses = await createRecurringIvpbOrder(encounter.id);
    const dose = doses[0]!;
    await prisma.medicationDoseInstance.update({
      where: { id: dose.id },
      data: {
        doseStatus: "DUE",
        scheduledAt: new Date("2026-06-11T08:00:00.000Z"),
        dueWindowStartAt: new Date("2026-06-11T07:00:00.000Z"),
        dueWindowEndAt: new Date("2026-06-11T20:00:00.000Z"),
      },
    });

    const orderItemId = dose.orderItemId;
    await ordersService.startMedicationInfusion(
      facilityId,
      orderItemId,
      {},
      [RoleCode.RN],
      nurseUserId
    );
    await ordersService.stopMedicationInfusion(
      facilityId,
      orderItemId,
      {},
      [RoleCode.RN],
      nurseUserId
    );

    const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
      shiftCode: "7A_7P",
      shiftStart: new Date("2026-06-11T07:00:00.000Z"),
      shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
      encounterId: encounter.id,
      includeCompleted: true,
    });

    const item = allTimelineItems(result).find(
      (i) => i.medicationDoseInstanceId === dose.id
    );
    expect(item?.doseStatus).toBe("COMPLETED");
    expect(item?.stoppedAt).toBeTruthy();
    expect(item?.stoppedByInitials).toBe("JN");
    expect(item?.secondaryText).toBe("DONE");
    expect(item?.readOnly).toBe(true);
    expect(item?.completionSummary).toContain("JN");
  });

  it("completed fixed dose returns administeredBy initials (K.3)", async () => {
    const encounter = await createEncounterWithNurse();
    const doses = await createBidOrder(encounter.id);
    const dose = doses[0]!;
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
        medicationDoseInstanceId: dose.id,
        administeredByUserId: nurseUserId,
        administeredAt: new Date("2026-06-11T08:05:00.000Z"),
        marAction: "administered",
      },
    });
    await prisma.medicationDoseInstance.update({
      where: { id: dose.id },
      data: {
        doseStatus: "COMPLETED",
        scheduledAt: new Date("2026-06-11T08:00:00.000Z"),
        dueWindowStartAt: new Date("2026-06-11T08:00:00.000Z"),
        dueWindowEndAt: new Date("2026-06-11T09:00:00.000Z"),
        terminalMedicationAdministrationId: mar.id,
      },
    });

    const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
      shiftCode: "7A_7P",
      shiftStart: new Date("2026-06-11T07:00:00.000Z"),
      shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
      encounterId: encounter.id,
      includeCompleted: true,
    });

    const item = allTimelineItems(result).find(
      (i) => i.medicationDoseInstanceId === dose.id
    );
    expect(item?.administeredByInitials).toBe("JN");
    expect(item?.secondaryText).toBe("DONE");
    expect(item?.tertiaryText).toContain("JN");
    expect(item?.tertiaryText).toContain("08:05");
  });

  it("read model enrichment is read-only and does not mutate rows (K.3)", async () => {
    const encounter = await createEncounterWithNurse();
    const doses = await createBidOrder(encounter.id);
    const dose = doses[0]!;
    await prisma.medicationDoseInstance.update({
      where: { id: dose.id },
      data: {
        doseStatus: "DUE",
        scheduledAt: new Date("2026-06-11T08:00:00.000Z"),
        dueWindowStartAt: new Date("2026-06-11T08:00:00.000Z"),
        dueWindowEndAt: new Date("2026-06-11T09:00:00.000Z"),
      },
    });

    const before = await prisma.medicationDoseInstance.findUnique({ where: { id: dose.id } });
    await timelineService.getMarShiftTimeline(facilityId, viewer, {
      shiftCode: "7A_7P",
      shiftStart: new Date("2026-06-11T07:00:00.000Z"),
      shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
      encounterId: encounter.id,
    });
    const after = await prisma.medicationDoseInstance.findUnique({ where: { id: dose.id } });

    expect(after?.updatedAt?.getTime()).toBe(before?.updatedAt?.getTime());
    expect(after?.doseStatus).toBe("DUE");
  });
});
