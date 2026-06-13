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
import {
  resolveStandardMarShiftTimelineWindow,
  wallClockToUtc,
} from "@medora/shared";
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
  let normalSalineCatalogId: string;

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

    const normalSaline = await prisma.catalogMedication.create({
      data: {
        code: `NS_MST_${suffix}`,
        name: "Normal Saline",
        displayNameEn: "Normal Saline",
        displayNameFr: "NaCl 0,9 %",
        genericName: "Sodium Chloride",
        administrationType: "INFUSION",
        route: "IV",
      },
    });
    normalSalineCatalogId = normalSaline.id;
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

  async function createDirectMarOrder(
    encounterId: string,
    input: {
      frequencyCode: MedicationFrequencyCode;
      route?: MedicationRoute;
      catalogItemId?: string;
      notes?: string;
      intendedAdministrationAt?: Date;
    }
  ) {
    const payload: OrderCreateDto = {
      type: "MEDICATION",
      items: [
        {
          catalogItemId: input.catalogItemId ?? normalSalineCatalogId,
          catalogItemType: "MEDICATION",
          medicationFulfillmentIntent: "ADMINISTER_CHART",
          route: (input.route ?? "IV") as MedicationRoute,
          frequencyCode: input.frequencyCode,
          notes: input.notes,
          intendedAdministrationAt: input.intendedAdministrationAt,
        },
      ],
    };
    const order = await ordersService.create(encounterId, facilityId, payload, nurseUserId);
    const item = await prisma.orderItem.findFirstOrThrow({ where: { orderId: order.id } });
    const doses = await prisma.medicationDoseInstance.findMany({ where: { orderItemId: item.id } });
    return { order, orderItem: item, doses };
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

  function columnLabelForOrderItem(
    result: Awaited<ReturnType<MarShiftTimelineService["getMarShiftTimeline"]>>,
    orderItemId: string
  ): string | undefined {
    for (const row of result.rows) {
      for (const cell of row.cells) {
        if (cell.items.some((i) => i.orderItemId === orderItemId)) {
          return result.shift.columns.find((c) => c.key === cell.columnKey)?.label;
        }
      }
    }
    return undefined;
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
    expect(item?.startedAt).toBeTruthy();
    expect(item?.startedByInitials).toBe("JN");
    expect(item?.stoppedAt).toBeTruthy();
    expect(item?.stoppedByInitials).toBe("JN");
    expect(item?.secondaryText).toBe("DONE");
    expect(item?.readOnly).toBe(true);
    expect(item?.completionSummary).toContain("JN");
    expect(item?.tertiaryText).toMatch(/JN.*–.*JN/);
  });

  it("completed IVPB uses terminalMedicationAdministrationId for STOP MAR row (K.5)", async () => {
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
    await ordersService.stopMedicationInfusion(
      facilityId,
      dose.orderItemId,
      {},
      [RoleCode.RN],
      nurseUserId
    );

    const stopMar = await prisma.medicationAdministration.findFirst({
      where: {
        orderItemId: dose.orderItemId,
        infusionPhase: "INFUSION_STOP",
      },
      orderBy: { administeredAt: "desc" },
    });
    expect(stopMar?.id).toBeTruthy();
    await prisma.medicationDoseInstance.update({
      where: { id: dose.id },
      data: { terminalMedicationAdministrationId: stopMar!.id },
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
    expect(item?.stoppedByInitials).toBe("JN");
    expect(item?.stoppedAt).toBeTruthy();
  });

  it("active IVPB startedByDisplay includes facility role code when available (K.5)", async () => {
    const rnRole =
      (await prisma.role.findFirst({ where: { code: RoleCode.RN } })) ??
      (await prisma.role.create({ data: { code: RoleCode.RN, name: "Registered Nurse" } }));
    await prisma.userRole.upsert({
      where: {
        userId_roleId_facilityId: {
          userId: nurseUserId,
          roleId: rnRole.id,
          facilityId,
        },
      },
      create: {
        userId: nurseUserId,
        roleId: rnRole.id,
        facilityId,
        isActive: true,
      },
      update: { isActive: true },
    });

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
    expect(item?.startedByDisplay).toContain("Jessica");
    expect(item?.startedByDisplay).toMatch(/RN/i);
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

  describe("OrderItem fallback visibility (M1.8B.7K.6)", () => {
    it("NOW medication OrderItem without MedicationDoseInstance appears in MAR timeline", async () => {
      const encounter = await createEncounterWithNurse();
      const createdAt = new Date("2026-06-11T14:07:00.000Z");
      const { orderItem, doses } = await createDirectMarOrder(encounter.id, {
        frequencyCode: "NOW" as MedicationFrequencyCode,
      });
      expect(doses).toHaveLength(0);
      await prisma.orderItem.update({
        where: { id: orderItem.id },
        data: { createdAt },
      });

      const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
        shiftCode: "7A_7P",
        shiftStart: new Date("2026-06-11T07:00:00.000Z"),
        shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
        encounterId: encounter.id,
      });

      const item = allTimelineItems(result).find((i) => i.orderItemId === orderItem.id);
      expect(item).toBeTruthy();
      expect(item?.medicationDoseInstanceId).toBe("");
      expect(item?.clinicalAction).toBe("ADMINISTER");
      expect(item?.secondaryText).toBe("IV");
      expect(result.shift.columns.find((c) => c.label === "02P")?.key).toBeTruthy();
    });

    it("STAT medication OrderItem without MedicationDoseInstance appears in MAR timeline", async () => {
      const encounter = await createEncounterWithNurse();
      const createdAt = new Date("2026-06-11T14:07:00.000Z");
      const { orderItem, doses } = await createDirectMarOrder(encounter.id, {
        frequencyCode: "STAT" as MedicationFrequencyCode,
      });
      expect(doses).toHaveLength(0);
      await prisma.orderItem.update({
        where: { id: orderItem.id },
        data: { createdAt },
      });

      const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
        shiftCode: "7A_7P",
        shiftStart: new Date("2026-06-11T07:00:00.000Z"),
        shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
        encounterId: encounter.id,
      });

      const item = allTimelineItems(result).find((i) => i.orderItemId === orderItem.id);
      expect(item?.secondaryText).toBe("STAT");
      expect(item?.tertiaryText).toBe("ADMIN");
    });

    it("ONCE medication OrderItem without MedicationDoseInstance appears in MAR timeline", async () => {
      const encounter = await createEncounterWithNurse();
      const createdAt = new Date("2026-06-11T14:07:00.000Z");
      const { orderItem, doses } = await createDirectMarOrder(encounter.id, {
        frequencyCode: "ONCE" as MedicationFrequencyCode,
      });
      expect(doses).toHaveLength(0);
      await prisma.orderItem.update({
        where: { id: orderItem.id },
        data: { createdAt },
      });

      const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
        shiftCode: "7A_7P",
        shiftStart: new Date("2026-06-11T07:00:00.000Z"),
        shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
        encounterId: encounter.id,
        includeCompleted: false,
      });

      expect(allTimelineItems(result).some((i) => i.orderItemId === orderItem.id)).toBe(true);
    });

    it("IVPB once fallback maps to START_INFUSION", async () => {
      const encounter = await createEncounterWithNurse();
      const createdAt = new Date("2026-06-11T14:07:00.000Z");
      const { orderItem, doses } = await createDirectMarOrder(encounter.id, {
        frequencyCode: "ONCE" as MedicationFrequencyCode,
        route: "IVPB" as MedicationRoute,
        catalogItemId: vancomycinCatalogId,
      });
      expect(doses).toHaveLength(0);
      await prisma.orderItem.update({
        where: { id: orderItem.id },
        data: { createdAt },
      });

      const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
        shiftCode: "7A_7P",
        shiftStart: new Date("2026-06-11T07:00:00.000Z"),
        shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
        encounterId: encounter.id,
      });

      const item = allTimelineItems(result).find((i) => i.orderItemId === orderItem.id);
      expect(item?.doseKind).toBe("IVPB_SESSION");
      expect(item?.clinicalAction).toBe("START_INFUSION");
      expect(item?.secondaryText).toBe("START");
    });

    it("PO now fallback maps to ADMINISTER", async () => {
      const encounter = await createEncounterWithNurse();
      const createdAt = new Date("2026-06-11T14:07:00.000Z");
      const { orderItem, doses } = await createDirectMarOrder(encounter.id, {
        frequencyCode: "NOW" as MedicationFrequencyCode,
        route: "PO" as MedicationRoute,
        catalogItemId: genericCatalogId,
      });
      expect(doses).toHaveLength(0);
      await prisma.orderItem.update({
        where: { id: orderItem.id },
        data: { createdAt },
      });

      const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
        shiftCode: "7A_7P",
        shiftStart: new Date("2026-06-11T07:00:00.000Z"),
        shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
        encounterId: encounter.id,
      });

      const item = allTimelineItems(result).find((i) => i.orderItemId === orderItem.id);
      expect(item?.clinicalAction).toBe("ADMINISTER");
      expect(item?.secondaryText).toBe("PO");
    });

    it("does not duplicate when MedicationDoseInstance exists for the order item", async () => {
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

      const matches = allTimelineItems(result).filter((i) => i.orderItemId === dose.orderItemId);
      expect(matches).toHaveLength(1);
      expect(matches[0]?.medicationDoseInstanceId).toBe(dose.id);
    });

    it("completed fallback order shows DONE when MAR row exists", async () => {
      const encounter = await createEncounterWithNurse();
      const { orderItem } = await createDirectMarOrder(encounter.id, {
        frequencyCode: "NOW" as MedicationFrequencyCode,
      });
      const encounterRow = await prisma.encounter.findUniqueOrThrow({
        where: { id: encounter.id },
        select: { patientId: true },
      });
      await prisma.medicationAdministration.create({
        data: {
          facilityId,
          patientId: encounterRow.patientId,
          encounterId: encounter.id,
          orderItemId: orderItem.id,
          administeredByUserId: nurseUserId,
          administeredAt: new Date("2026-06-11T14:10:00.000Z"),
          marAction: "administered",
        },
      });
      await prisma.orderItem.update({
        where: { id: orderItem.id },
        data: { status: "COMPLETED", createdAt: new Date("2026-06-11T14:07:00.000Z") },
      });

      const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
        shiftCode: "7A_7P",
        shiftStart: new Date("2026-06-11T07:00:00.000Z"),
        shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
        encounterId: encounter.id,
        includeCompleted: true,
      });

      const item = allTimelineItems(result).find((i) => i.orderItemId === orderItem.id);
      expect(item?.doseStatus).toBe("COMPLETED");
      expect(item?.secondaryText).toBe("DONE");
      expect(item?.readOnly).toBe(true);
    });

    it("active IVPB fallback shows INFUSING when infusion session exists (K.6)", async () => {
      const encounter = await createEncounterWithNurse();
      const { orderItem } = await createDirectMarOrder(encounter.id, {
        frequencyCode: "ONCE" as MedicationFrequencyCode,
        route: "IVPB" as MedicationRoute,
        catalogItemId: vancomycinCatalogId,
      });
      await prisma.infusionSession.create({
        data: {
          facilityId,
          encounterId: encounter.id,
          orderItemId: orderItem.id,
          status: "IN_PROGRESS",
          startedAt: new Date("2026-06-11T14:10:00.000Z"),
        },
      });
      await prisma.orderItem.update({
        where: { id: orderItem.id },
        data: { createdAt: new Date("2026-06-11T14:07:00.000Z") },
      });

      const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
        shiftCode: "7A_7P",
        shiftStart: new Date("2026-06-11T07:00:00.000Z"),
        shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
        encounterId: encounter.id,
      });

      const item = allTimelineItems(result).find((i) => i.orderItemId === orderItem.id);
      expect(item?.doseStatus).toBe("IN_PROGRESS");
      expect(item?.secondaryText).toBe("INFUSING");
      expect(item?.clinicalAction).toBe("STOP_INFUSION");
    });

    it("fallback read model does not mutate order item rows", async () => {
      const encounter = await createEncounterWithNurse();
      const { orderItem } = await createDirectMarOrder(encounter.id, {
        frequencyCode: "STAT" as MedicationFrequencyCode,
      });
      const before = await prisma.orderItem.findUnique({ where: { id: orderItem.id } });
      await timelineService.getMarShiftTimeline(facilityId, viewer, {
        shiftCode: "7A_7P",
        shiftStart: new Date("2026-06-11T07:00:00.000Z"),
        shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
        encounterId: encounter.id,
      });
      const after = await prisma.orderItem.findUnique({ where: { id: orderItem.id } });
      expect(after?.updatedAt?.getTime()).toBe(before?.updatedAt?.getTime());
    });
  });

  describe("Timezone placement (M1.8B.7K.7)", () => {
    const haitiTz = "America/Port-au-Prince";

    async function withHaitiFacilityTimezone<T>(fn: () => Promise<T>): Promise<T> {
      await prisma.facility.update({ where: { id: facilityId }, data: { timezone: haitiTz } });
      try {
        return await fn();
      } finally {
        await prisma.facility.update({ where: { id: facilityId }, data: { timezone: "UTC" } });
      }
    }

    it("NOW fallback at 2:16 PM facility-local appears in 02P column, not 07P", async () => {
      await withHaitiFacilityTimezone(async () => {
        const encounter = await createEncounterWithNurse();
        const createdAt = wallClockToUtc(2026, 6, 11, 14, 16, haitiTz);
        const { startAt, endAt } = resolveStandardMarShiftTimelineWindow("7A_7P", createdAt, haitiTz);
        const { orderItem, doses } = await createDirectMarOrder(encounter.id, {
          frequencyCode: "NOW" as MedicationFrequencyCode,
        });
        expect(doses).toHaveLength(0);
        await prisma.orderItem.update({
          where: { id: orderItem.id },
          data: { createdAt },
        });

        const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
          shiftCode: "7A_7P",
          shiftStart: startAt,
          shiftEnd: endAt,
          encounterId: encounter.id,
        });

        expect(result.shift.timeZone).toBe(haitiTz);
        expect(result.facility.timeZone).toBe(haitiTz);
        expect(columnLabelForOrderItem(result, orderItem.id)).toBe("02P");
        const item = allTimelineItems(result).find((i) => i.orderItemId === orderItem.id);
        expect(item?.hover.due).toBe("14:16");
      });
    });

    it("STAT fallback uses createdAt in facility-local hour column", async () => {
      await withHaitiFacilityTimezone(async () => {
        const encounter = await createEncounterWithNurse();
        const createdAt = wallClockToUtc(2026, 6, 11, 14, 16, haitiTz);
        const { startAt, endAt } = resolveStandardMarShiftTimelineWindow("7A_7P", createdAt, haitiTz);
        const { orderItem } = await createDirectMarOrder(encounter.id, {
          frequencyCode: "STAT" as MedicationFrequencyCode,
        });
        await prisma.orderItem.update({
          where: { id: orderItem.id },
          data: { createdAt },
        });

        const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
          shiftCode: "7A_7P",
          shiftStart: startAt,
          shiftEnd: endAt,
          encounterId: encounter.id,
        });

        expect(columnLabelForOrderItem(result, orderItem.id)).toBe("02P");
      });
    });

    it("ONCE fallback uses intendedAdministrationAt for placement when present", async () => {
      await withHaitiFacilityTimezone(async () => {
        const encounter = await createEncounterWithNurse();
        const intendedAt = wallClockToUtc(2026, 6, 11, 14, 16, haitiTz);
        const { startAt, endAt } = resolveStandardMarShiftTimelineWindow("7A_7P", intendedAt, haitiTz);
        const { orderItem } = await createDirectMarOrder(encounter.id, {
          frequencyCode: "ONCE" as MedicationFrequencyCode,
          intendedAdministrationAt: intendedAt,
        });
        await prisma.orderItem.update({
          where: { id: orderItem.id },
          data: { createdAt: wallClockToUtc(2026, 6, 11, 8, 0, haitiTz) },
        });

        const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
          shiftCode: "7A_7P",
          shiftStart: startAt,
          shiftEnd: endAt,
          encounterId: encounter.id,
        });

        expect(columnLabelForOrderItem(result, orderItem.id)).toBe("02P");
      });
    });

    it("IVPB NOW fallback maps to START_INFUSION in facility-local column", async () => {
      await withHaitiFacilityTimezone(async () => {
        const encounter = await createEncounterWithNurse();
        const createdAt = wallClockToUtc(2026, 6, 11, 14, 16, haitiTz);
        const { startAt, endAt } = resolveStandardMarShiftTimelineWindow("7A_7P", createdAt, haitiTz);
        const { orderItem } = await createDirectMarOrder(encounter.id, {
          frequencyCode: "NOW" as MedicationFrequencyCode,
          route: "IVPB" as MedicationRoute,
          catalogItemId: normalSalineCatalogId,
        });
        await prisma.orderItem.update({
          where: { id: orderItem.id },
          data: { createdAt },
        });

        const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
          shiftCode: "7A_7P",
          shiftStart: startAt,
          shiftEnd: endAt,
          encounterId: encounter.id,
        });

        const item = allTimelineItems(result).find((i) => i.orderItemId === orderItem.id);
        expect(item?.clinicalAction).toBe("START_INFUSION");
        expect(columnLabelForOrderItem(result, orderItem.id)).toBe("02P");
      });
    });

    it("recurring IVPB Q12H scheduled dose rows still place correctly with UTC facility", async () => {
      const encounter = await createEncounterWithNurse();
      const doses = await createRecurringIvpbOrder(encounter.id);
      const dose = doses[0]!;
      await prisma.medicationDoseInstance.update({
        where: { id: dose.id },
        data: {
          doseStatus: "DUE",
          scheduledAt: new Date("2026-06-11T14:00:00.000Z"),
          dueWindowStartAt: new Date("2026-06-11T14:00:00.000Z"),
          dueWindowEndAt: new Date("2026-06-11T15:00:00.000Z"),
        },
      });

      const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
        shiftCode: "7A_7P",
        shiftStart: new Date("2026-06-11T07:00:00.000Z"),
        shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
        encounterId: encounter.id,
      });

      expect(columnLabelForOrderItem(result, dose.orderItemId)).toBe("02P");
    });
  });

  describe("Medication label locale (M1.8B.7K.8)", () => {
    it("English locale shows Normal Saline not French catalog label for NOW fallback", async () => {
      const encounter = await createEncounterWithNurse();
      const createdAt = new Date("2026-06-11T14:07:00.000Z");
      const { orderItem, doses } = await createDirectMarOrder(encounter.id, {
        frequencyCode: "NOW" as MedicationFrequencyCode,
        catalogItemId: normalSalineCatalogId,
      });
      expect(doses).toHaveLength(0);
      await prisma.orderItem.update({
        where: { id: orderItem.id },
        data: { createdAt },
      });

      const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
        shiftCode: "7A_7P",
        shiftStart: new Date("2026-06-11T07:00:00.000Z"),
        shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
        encounterId: encounter.id,
        locale: "en",
      });

      const item = allTimelineItems(result).find((i) => i.orderItemId === orderItem.id);
      expect(item?.medicationLabel).toBe("Normal Saline");
      expect(item?.primaryText).toBe("NS 0.9%");
      expect(item?.hover.title).toBe("Normal Saline");
      expect(result.locale).toBe("en");
    });

    it("French locale may show French catalog label for NOW fallback", async () => {
      const encounter = await createEncounterWithNurse();
      const createdAt = new Date("2026-06-11T14:07:00.000Z");
      const { orderItem } = await createDirectMarOrder(encounter.id, {
        frequencyCode: "NOW" as MedicationFrequencyCode,
        catalogItemId: normalSalineCatalogId,
      });
      await prisma.orderItem.update({
        where: { id: orderItem.id },
        data: { createdAt },
      });

      const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
        shiftCode: "7A_7P",
        shiftStart: new Date("2026-06-11T07:00:00.000Z"),
        shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
        encounterId: encounter.id,
        locale: "fr",
      });

      const item = allTimelineItems(result).find((i) => i.orderItemId === orderItem.id);
      expect(item?.medicationLabel).toBe("NaCl 0,9 %");
      expect(result.locale).toBe("fr");
    });
  });

  describe("K.8A start/stop MAR cell update proof", () => {
    it("NOW IVPB fallback shows INFUSING after start with locale=en English labels", async () => {
      const encounter = await createEncounterWithNurse();
      const createdAt = new Date("2026-06-11T14:07:00.000Z");
      const { orderItem } = await createDirectMarOrder(encounter.id, {
        frequencyCode: "NOW" as MedicationFrequencyCode,
        route: "IVPB" as MedicationRoute,
        catalogItemId: normalSalineCatalogId,
      });
      await prisma.orderItem.update({
        where: { id: orderItem.id },
        data: { createdAt },
      });

      const before = await timelineService.getMarShiftTimeline(facilityId, viewer, {
        shiftCode: "7A_7P",
        shiftStart: new Date("2026-06-11T07:00:00.000Z"),
        shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
        encounterId: encounter.id,
        locale: "en",
      });
      const beforeItem = allTimelineItems(before).find((i) => i.orderItemId === orderItem.id);
      expect(beforeItem?.medicationLabel).toBe("Normal Saline");
      expect(beforeItem?.clinicalAction).toBe("START_INFUSION");

      const customStart = new Date("2026-06-11T14:16:00.000Z");
      await ordersService.startMedicationInfusion(
        facilityId,
        orderItem.id,
        { startedAt: customStart },
        [RoleCode.RN],
        nurseUserId
      );

      const afterStart = await timelineService.getMarShiftTimeline(facilityId, viewer, {
        shiftCode: "7A_7P",
        shiftStart: new Date("2026-06-11T07:00:00.000Z"),
        shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
        encounterId: encounter.id,
        locale: "en",
      });
      const startedItem = allTimelineItems(afterStart).find((i) => i.orderItemId === orderItem.id);
      expect(startedItem?.doseStatus).toBe("IN_PROGRESS");
      expect(startedItem?.secondaryText).toBe("INFUSING");
      expect(startedItem?.medicationLabel).toBe("Normal Saline");
      expect(startedItem?.startedByInitials).toBe("JN");
      expect(startedItem?.tertiaryText).toContain("▶");

      const customStop = new Date("2026-06-11T14:42:00.000Z");
      await ordersService.stopMedicationInfusion(
        facilityId,
        orderItem.id,
        { stoppedAt: customStop },
        [RoleCode.RN],
        nurseUserId
      );

      const afterStop = await timelineService.getMarShiftTimeline(facilityId, viewer, {
        shiftCode: "7A_7P",
        shiftStart: new Date("2026-06-11T07:00:00.000Z"),
        shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
        encounterId: encounter.id,
        locale: "en",
        includeCompleted: true,
      });
      const doneItem = allTimelineItems(afterStop).find((i) => i.orderItemId === orderItem.id);
      expect(doneItem?.doseStatus).toBe("COMPLETED");
      expect(doneItem?.secondaryText).toBe("DONE");
      expect(doneItem?.readOnly).toBe(true);
      expect(doneItem?.completionSummary).toMatch(/JN.*–.*JN/);
    });
  });

  describe("M1.8B.7K.9 placement, actions, refuse/hold", () => {
    const haitiTz = "America/Port-au-Prince";

    async function withHaitiFacilityTimezone<T>(fn: () => Promise<T>): Promise<T> {
      await prisma.facility.update({ where: { id: facilityId }, data: { timezone: haitiTz } });
      try {
        return await fn();
      } finally {
        await prisma.facility.update({ where: { id: facilityId }, data: { timezone: "UTC" } });
      }
    }

    it("9:07 PM NOW PO fallback maps to 09P on 7P_7A shift", async () => {
      await withHaitiFacilityTimezone(async () => {
        const encounter = await createEncounterWithNurse();
        const createdAt = wallClockToUtc(2026, 6, 3, 21, 7, haitiTz);
        const { startAt, endAt } = resolveStandardMarShiftTimelineWindow("7P_7A", createdAt, haitiTz);
        const { orderItem } = await createDirectMarOrder(encounter.id, {
          frequencyCode: "NOW" as MedicationFrequencyCode,
          route: "PO" as MedicationRoute,
        });
        await prisma.orderItem.update({ where: { id: orderItem.id }, data: { createdAt } });

        const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
          shiftCode: "7P_7A",
          shiftStart: startAt,
          shiftEnd: endAt,
          encounterId: encounter.id,
        });

        const item = allTimelineItems(result).find((i) => i.orderItemId === orderItem.id);
        expect(columnLabelForOrderItem(result, orderItem.id)).toBe("09P");
        expect(item?.clinicalAction).toBe("ADMINISTER");
      });
    });

    it("10:00 PM NOW fallback maps to 10P on 7P_7A shift", async () => {
      await withHaitiFacilityTimezone(async () => {
        const encounter = await createEncounterWithNurse();
        const createdAt = wallClockToUtc(2026, 6, 3, 22, 0, haitiTz);
        const { startAt, endAt } = resolveStandardMarShiftTimelineWindow("7P_7A", createdAt, haitiTz);
        const { orderItem } = await createDirectMarOrder(encounter.id, {
          frequencyCode: "NOW" as MedicationFrequencyCode,
        });
        await prisma.orderItem.update({ where: { id: orderItem.id }, data: { createdAt } });

        const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
          shiftCode: "7P_7A",
          shiftStart: startAt,
          shiftEnd: endAt,
          encounterId: encounter.id,
        });

        expect(columnLabelForOrderItem(result, orderItem.id)).toBe("10P");
      });
    });

    it("administer fallback creates completed DONE cell", async () => {
      const encounter = await createEncounterWithNurse();
      const createdAt = new Date("2026-06-11T14:07:00.000Z");
      const { orderItem } = await createDirectMarOrder(encounter.id, {
        frequencyCode: "NOW" as MedicationFrequencyCode,
      });
      const encounterRow = await prisma.encounter.findUniqueOrThrow({
        where: { id: encounter.id },
        select: { patientId: true },
      });
      await prisma.orderItem.update({ where: { id: orderItem.id }, data: { createdAt } });
      await prisma.medicationAdministration.create({
        data: {
          facilityId,
          patientId: encounterRow.patientId,
          encounterId: encounter.id,
          orderItemId: orderItem.id,
          administeredByUserId: nurseUserId,
          administeredAt: createdAt,
          marAction: "administered",
          notes: "Administered",
        },
      });

      const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
        shiftCode: "7A_7P",
        shiftStart: new Date("2026-06-11T07:00:00.000Z"),
        shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
        encounterId: encounter.id,
        includeCompleted: true,
      });
      const item = allTimelineItems(result).find((i) => i.orderItemId === orderItem.id);
      expect(item?.secondaryText).toBe("DONE");
      expect(item?.readOnly).toBe(true);
    });

    it("refuse fallback creates REFUSED read-only cell", async () => {
      const encounter = await createEncounterWithNurse();
      const createdAt = new Date("2026-06-11T14:07:00.000Z");
      const { orderItem } = await createDirectMarOrder(encounter.id, {
        frequencyCode: "NOW" as MedicationFrequencyCode,
      });
      const encounterRow = await prisma.encounter.findUniqueOrThrow({
        where: { id: encounter.id },
        select: { patientId: true },
      });
      await prisma.orderItem.update({ where: { id: orderItem.id }, data: { createdAt } });
      await prisma.medicationAdministration.create({
        data: {
          facilityId,
          patientId: encounterRow.patientId,
          encounterId: encounter.id,
          orderItemId: orderItem.id,
          administeredByUserId: nurseUserId,
          administeredAt: createdAt,
          marAction: "refused",
          notes: "Refused: PATIENT_REFUSED",
        },
      });

      const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
        shiftCode: "7A_7P",
        shiftStart: new Date("2026-06-11T07:00:00.000Z"),
        shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
        encounterId: encounter.id,
        includeCompleted: true,
      });
      const item = allTimelineItems(result).find((i) => i.orderItemId === orderItem.id);
      expect(item?.secondaryText).toBe("REFUSED");
      expect(item?.readOnly).toBe(true);
    });

    it("hold fallback creates HELD read-only cell", async () => {
      const encounter = await createEncounterWithNurse();
      const createdAt = new Date("2026-06-11T14:07:00.000Z");
      const { orderItem } = await createDirectMarOrder(encounter.id, {
        frequencyCode: "NOW" as MedicationFrequencyCode,
      });
      const encounterRow = await prisma.encounter.findUniqueOrThrow({
        where: { id: encounter.id },
        select: { patientId: true },
      });
      await prisma.orderItem.update({ where: { id: orderItem.id }, data: { createdAt } });
      await prisma.medicationAdministration.create({
        data: {
          facilityId,
          patientId: encounterRow.patientId,
          encounterId: encounter.id,
          orderItemId: orderItem.id,
          administeredByUserId: nurseUserId,
          administeredAt: createdAt,
          marAction: "md_changed",
          notes: "Held: NPO",
        },
      });

      const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
        shiftCode: "7A_7P",
        shiftStart: new Date("2026-06-11T07:00:00.000Z"),
        shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
        encounterId: encounter.id,
        includeCompleted: true,
      });
      const item = allTimelineItems(result).find((i) => i.orderItemId === orderItem.id);
      expect(item?.secondaryText).toBe("HELD");
      expect(item?.doseStatus).toBe("HELD");
      expect(item?.readOnly).toBe(true);
    });
  });

  describe("M1.8B.7K.10B.4 IV fluid rate + refuse/hold response", () => {
    it("NOW IV fluid fallback shows parsed rate on MAR cell and hover", async () => {
      const encounter = await createEncounterWithNurse();
      const createdAt = new Date("2026-06-11T14:07:00.000Z");
      const { orderItem } = await createDirectMarOrder(encounter.id, {
        frequencyCode: "NOW" as MedicationFrequencyCode,
        route: "IVPB" as MedicationRoute,
        catalogItemId: normalSalineCatalogId,
        notes: "NS 0.9% at 100 mL/hr",
      });
      await prisma.orderItem.update({
        where: { id: orderItem.id },
        data: { createdAt },
      });

      const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
        shiftCode: "7A_7P",
        shiftStart: new Date("2026-06-11T07:00:00.000Z"),
        shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
        encounterId: encounter.id,
        locale: "en",
      });

      const item = allTimelineItems(result).find((i) => i.orderItemId === orderItem.id);
      expect(item?.primaryText).toBe("NS 0.9%");
      expect(item?.secondaryText).toBe("100 mL/hr");
      expect(item?.tertiaryText).toBe("START");
      expect(item?.clinicalAction).toBe("START_FLUID");
      expect(item?.hover.rate).toBe("100 mL/hr");
    });

    it("bolus IV fluid fallback shows BOLUS secondary on MAR cell", async () => {
      const encounter = await createEncounterWithNurse();
      const createdAt = new Date("2026-06-11T14:07:00.000Z");
      const { orderItem } = await createDirectMarOrder(encounter.id, {
        frequencyCode: "NOW" as MedicationFrequencyCode,
        route: "IVPB" as MedicationRoute,
        catalogItemId: normalSalineCatalogId,
        notes: "NS 0.9% bolus",
      });
      await prisma.orderItem.update({
        where: { id: orderItem.id },
        data: { createdAt },
      });

      const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
        shiftCode: "7A_7P",
        shiftStart: new Date("2026-06-11T07:00:00.000Z"),
        shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
        encounterId: encounter.id,
        locale: "en",
      });

      const item = allTimelineItems(result).find((i) => i.orderItemId === orderItem.id);
      expect(item?.secondaryText).toBe("BOLUS");
      expect(item?.tertiaryText).toBe("START");
    });
  });

  describe("M1.8B.7K.10A same-hour placement", () => {
    const haitiTz = "America/Port-au-Prince";

    async function withHaitiFacilityTimezone<T>(fn: () => Promise<T>): Promise<T> {
      await prisma.facility.update({ where: { id: facilityId }, data: { timezone: haitiTz } });
      try {
        return await fn();
      } finally {
        await prisma.facility.update({ where: { id: facilityId }, data: { timezone: "UTC" } });
      }
    }

    it("10:24 PM NOW fallback maps to 10P on 7P_7A shift", async () => {
      await withHaitiFacilityTimezone(async () => {
        const encounter = await createEncounterWithNurse();
        const createdAt = wallClockToUtc(2026, 6, 3, 22, 24, haitiTz);
        const intendedOneHourLater = wallClockToUtc(2026, 6, 3, 23, 24, haitiTz);
        const { startAt, endAt } = resolveStandardMarShiftTimelineWindow("7P_7A", createdAt, haitiTz);
        const { orderItem } = await createDirectMarOrder(encounter.id, {
          frequencyCode: "NOW" as MedicationFrequencyCode,
          route: "IVP" as MedicationRoute,
          catalogItemId: genericCatalogId,
          intendedAdministrationAt: intendedOneHourLater,
        });
        await prisma.orderItem.update({ where: { id: orderItem.id }, data: { createdAt } });

        const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
          shiftCode: "7P_7A",
          shiftStart: startAt,
          shiftEnd: endAt,
          encounterId: encounter.id,
        });

        expect(columnLabelForOrderItem(result, orderItem.id)).toBe("10P");
        expect(columnLabelForOrderItem(result, orderItem.id)).not.toBe("11P");
      });
    });

    it("Metoprolol 10:07 and Ondansetron 10:24 share the 10P cell", async () => {
      await withHaitiFacilityTimezone(async () => {
        const encounter = await createEncounterWithNurse();
        const metoprololAt = wallClockToUtc(2026, 6, 3, 22, 7, haitiTz);
        const ondansetronAt = wallClockToUtc(2026, 6, 3, 22, 24, haitiTz);
        const { startAt, endAt } = resolveStandardMarShiftTimelineWindow(
          "7P_7A",
          ondansetronAt,
          haitiTz
        );

        const metoprolol = await createDirectMarOrder(encounter.id, {
          frequencyCode: "NOW" as MedicationFrequencyCode,
          route: "PO" as MedicationRoute,
          catalogItemId: genericCatalogId,
        });
        const ondansetron = await createDirectMarOrder(encounter.id, {
          frequencyCode: "NOW" as MedicationFrequencyCode,
          route: "IVP" as MedicationRoute,
          catalogItemId: kclCatalogId,
          intendedAdministrationAt: wallClockToUtc(2026, 6, 3, 23, 24, haitiTz),
        });
        await prisma.orderItem.update({
          where: { id: metoprolol.orderItem.id },
          data: { createdAt: metoprololAt, manualLabel: "Metoprolol" },
        });
        await prisma.orderItem.update({
          where: { id: ondansetron.orderItem.id },
          data: { createdAt: ondansetronAt, manualLabel: "Ondansetron" },
        });

        const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
          shiftCode: "7P_7A",
          shiftStart: startAt,
          shiftEnd: endAt,
          encounterId: encounter.id,
        });

        const tenPLabel = "10P";
        const tenPColumn = result.shift.columns.find((c) => c.label === tenPLabel);
        expect(tenPColumn).toBeTruthy();
        const tenPCell = result.rows[0]?.cells.find((c) => c.columnKey === tenPColumn?.key);
        expect(tenPCell?.items.length).toBeGreaterThanOrEqual(2);
        expect(tenPCell?.items.some((i) => i.orderItemId === metoprolol.orderItem.id)).toBe(true);
        expect(tenPCell?.items.some((i) => i.orderItemId === ondansetron.orderItem.id)).toBe(true);
        expect(columnLabelForOrderItem(result, ondansetron.orderItem.id)).toBe(tenPLabel);

        expect(columnLabelForOrderItem(result, ondansetron.orderItem.id)).not.toBe("11P");
        const elevenPColumn = result.shift.columns.find((c) => c.label === "11P");
        const elevenPCell = result.rows[0]?.cells.find((c) => c.columnKey === elevenPColumn?.key);
        expect(
          elevenPCell?.items.some((i) => i.orderItemId === ondansetron.orderItem.id) ?? false
        ).toBe(false);
      });
    });
  });

  describe("M1.8B.7K.10B.1 late evening facility placement", () => {
    const haitiTz = "America/Port-au-Prince";

    async function withHaitiFacilityTimezone<T>(fn: () => Promise<T>): Promise<T> {
      await prisma.facility.update({ where: { id: facilityId }, data: { timezone: haitiTz } });
      try {
        return await fn();
      } finally {
        await prisma.facility.update({ where: { id: facilityId }, data: { timezone: "UTC" } });
      }
    }

    async function expectNowOrderAtLocalTimeMapsToColumn(
      hour: number,
      minute: number,
      expectedColumn: string
    ) {
      await withHaitiFacilityTimezone(async () => {
        const encounter = await createEncounterWithNurse();
        const createdAt = wallClockToUtc(2026, 6, 11, hour, minute, haitiTz);
        const { startAt, endAt } = resolveStandardMarShiftTimelineWindow("7P_7A", createdAt, haitiTz);
        const { orderItem } = await createDirectMarOrder(encounter.id, {
          frequencyCode: "NOW" as MedicationFrequencyCode,
          route: "IVP" as MedicationRoute,
          catalogItemId: genericCatalogId,
          intendedAdministrationAt: new Date(createdAt.getTime() + 60 * 60 * 1000),
        });
        await prisma.orderItem.update({ where: { id: orderItem.id }, data: { createdAt } });

        const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
          shiftCode: "7P_7A",
          shiftStart: startAt,
          shiftEnd: endAt,
          encounterId: encounter.id,
        });

        expect(columnLabelForOrderItem(result, orderItem.id)).toBe(expectedColumn);
      });
    }

    it("10:15 PM facility → 10P", async () => {
      await expectNowOrderAtLocalTimeMapsToColumn(22, 15, "10P");
    });

    it("10:45 PM facility → 10P", async () => {
      await expectNowOrderAtLocalTimeMapsToColumn(22, 45, "10P");
    });

    it("11:05 PM facility → 11P", async () => {
      await expectNowOrderAtLocalTimeMapsToColumn(23, 5, "11P");
    });

    it("11:35 PM facility → 11P (not 12A)", async () => {
      await expectNowOrderAtLocalTimeMapsToColumn(23, 35, "11P");
    });
  });

  describe("M1.8B.7K.10B.3 explicit planned administration placement", () => {
    const haitiTz = "America/Port-au-Prince";

    async function withHaitiFacilityTimezone<T>(fn: () => Promise<T>): Promise<T> {
      await prisma.facility.update({ where: { id: facilityId }, data: { timezone: haitiTz } });
      try {
        return await fn();
      } finally {
        await prisma.facility.update({ where: { id: facilityId }, data: { timezone: "UTC" } });
      }
    }

    it("NOW order at 12:21 PM with explicit 06:00 AM intended → 06A", async () => {
      await withHaitiFacilityTimezone(async () => {
        const encounter = await createEncounterWithNurse();
        const createdAt = wallClockToUtc(2026, 6, 12, 12, 21, haitiTz);
        const plannedSixAm = wallClockToUtc(2026, 6, 12, 6, 0, haitiTz);
        const { startAt, endAt } = resolveStandardMarShiftTimelineWindow(
          "7P_7A",
          plannedSixAm,
          haitiTz
        );
        const { orderItem } = await createDirectMarOrder(encounter.id, {
          frequencyCode: "NOW" as MedicationFrequencyCode,
          route: "PO" as MedicationRoute,
          catalogItemId: genericCatalogId,
          intendedAdministrationAt: plannedSixAm,
        });
        await prisma.orderItem.update({ where: { id: orderItem.id }, data: { createdAt } });

        const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
          shiftCode: "7P_7A",
          shiftStart: startAt,
          shiftEnd: endAt,
          encounterId: encounter.id,
        });

        expect(columnLabelForOrderItem(result, orderItem.id)).toBe("06A");
        expect(columnLabelForOrderItem(result, orderItem.id)).not.toBe("12P");
      });
    });

    it("NOW at 12:21 PM with +1h auto intended artifact → 12P", async () => {
      await withHaitiFacilityTimezone(async () => {
        const encounter = await createEncounterWithNurse();
        const createdAt = wallClockToUtc(2026, 6, 12, 12, 21, haitiTz);
        const intendedOneHourLater = new Date(createdAt.getTime() + 60 * 60 * 1000);
        const { startAt, endAt } = resolveStandardMarShiftTimelineWindow("7A_7P", createdAt, haitiTz);
        const { orderItem } = await createDirectMarOrder(encounter.id, {
          frequencyCode: "NOW" as MedicationFrequencyCode,
          route: "PO" as MedicationRoute,
          catalogItemId: genericCatalogId,
          intendedAdministrationAt: intendedOneHourLater,
        });
        await prisma.orderItem.update({ where: { id: orderItem.id }, data: { createdAt } });

        const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
          shiftCode: "7A_7P",
          shiftStart: startAt,
          shiftEnd: endAt,
          encounterId: encounter.id,
        });

        expect(columnLabelForOrderItem(result, orderItem.id)).toBe("12P");
        expect(columnLabelForOrderItem(result, orderItem.id)).not.toBe("01P");
      });
    });
  });

  describe("M1.8B.7K.10B.5 MAR prescription time + IVP fallback hardening", () => {
    it("Morphine IVP ONCE fallback appears when other dose instances exist on timeline (K.10B.5)", async () => {
      const encounter = await createEncounterWithNurse();
      const recurringDoses = await createRecurringIvpbOrder(encounter.id);
      expect(recurringDoses.length).toBeGreaterThan(0);

      const morphine = await prisma.catalogMedication.create({
        data: {
          code: `MORPHINE_MST_${suffix}`,
          name: "Morphine 10 mg/mL",
          displayNameEn: "Morphine 10 mg/mL",
          displayNameFr: "Morphine 10 mg/mL",
          genericName: "Morphine",
          administrationType: "PUSH",
          route: "IVP",
        },
      });

      const createdAt = new Date("2026-06-11T14:07:00.000Z");
      const { orderItem, doses } = await createDirectMarOrder(encounter.id, {
        frequencyCode: "ONCE" as MedicationFrequencyCode,
        route: "IVP" as MedicationRoute,
        catalogItemId: morphine.id,
      });
      expect(doses).toHaveLength(0);
      await prisma.orderItem.update({ where: { id: orderItem.id }, data: { createdAt } });

      const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
        shiftCode: "7A_7P",
        shiftStart: new Date("2026-06-11T07:00:00.000Z"),
        shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
        encounterId: encounter.id,
      });

      const item = allTimelineItems(result).find((i) => i.orderItemId === orderItem.id);
      expect(item).toBeTruthy();
      expect(item?.medicationDoseInstanceId).toBe("");
      expect(item?.clinicalAction).toBe("ADMINISTER");
      expect(item?.primaryText).toMatch(/Morphine/i);
    });

    it("completed fallback cell maps to administeredAt hour not order createdAt (K.10B.5)", async () => {
      const encounter = await createEncounterWithNurse();
      const createdAt = new Date("2026-06-11T14:07:00.000Z");
      const administeredAt = new Date("2026-06-11T16:10:00.000Z");
      const { orderItem } = await createDirectMarOrder(encounter.id, {
        frequencyCode: "NOW" as MedicationFrequencyCode,
      });
      const encounterRow = await prisma.encounter.findUniqueOrThrow({
        where: { id: encounter.id },
        select: { patientId: true },
      });
      await prisma.orderItem.update({ where: { id: orderItem.id }, data: { createdAt } });
      await prisma.medicationAdministration.create({
        data: {
          facilityId,
          patientId: encounterRow.patientId,
          encounterId: encounter.id,
          orderItemId: orderItem.id,
          administeredByUserId: nurseUserId,
          administeredAt,
          marAction: "administered",
          notes: "Administered early/late test",
        },
      });

      const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
        shiftCode: "7A_7P",
        shiftStart: new Date("2026-06-11T07:00:00.000Z"),
        shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
        encounterId: encounter.id,
        includeCompleted: true,
      });

      expect(columnLabelForOrderItem(result, orderItem.id)).toBe("04P");
      expect(columnLabelForOrderItem(result, orderItem.id)).not.toBe("02P");
    });
  });

  describe("M1.8B.7K.10B.6 MAR fallback route coverage", () => {
    it.each([
      ["PO", "PO", "PO"],
      ["IVP", "IVP", "PUSH"],
      ["IM", "IM", "IM"],
      ["SQ", "SQ", "SQ"],
      ["IVPB", "100 mL/hr", "INFUSION"],
    ] as const)(
      "NOW %s fallback appears alongside recurring dose instances on same encounter (K.10B.6)",
      async (route, expectedSecondary, administrationType) => {
        const encounter = await createEncounterWithNurse();
        await createRecurringIvpbOrder(encounter.id);
        const createdAt = new Date("2026-06-11T14:07:00.000Z");
        const routeMed = await prisma.catalogMedication.create({
          data: {
            code: `ROUTE_${route}_MST_${suffix}_${randomBytes(2).toString("hex")}`,
            name: `${route} Route Test Med`,
            displayNameEn: `${route} Route Test Med`,
            displayNameFr: `${route} Route Test Med`,
            administrationType,
            route,
          },
        });
        const { orderItem, doses } = await createDirectMarOrder(encounter.id, {
          frequencyCode: "NOW" as MedicationFrequencyCode,
          route: route as MedicationRoute,
          catalogItemId: routeMed.id,
          ...(route === "IVPB"
            ? { notes: "NS 0.9% at 100 mL/hr" }
            : {}),
        });
        expect(doses).toHaveLength(0);
        await prisma.orderItem.update({ where: { id: orderItem.id }, data: { createdAt } });

        const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
          shiftCode: "7A_7P",
          shiftStart: new Date("2026-06-11T07:00:00.000Z"),
          shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
          encounterId: encounter.id,
        });

        const item = allTimelineItems(result).find((i) => i.orderItemId === orderItem.id);
        expect(item).toBeTruthy();
        expect(item?.medicationDoseInstanceId).toBe("");
        expect(item?.secondaryText).toBe(expectedSecondary);
      }
    );
  });

  describe("PRN row permanence (K.10B.11)", () => {
    function prnTimelineItems(
      result: Awaited<ReturnType<MarShiftTimelineService["getMarShiftTimeline"]>>
    ) {
      return result.rows
        .filter((row) => row.rowKind === "PRN")
        .flatMap((row) => row.cells.flatMap((cell) => cell.items));
    }

    async function createPrnOrder(encounterId: string) {
      return createDirectMarOrder(encounterId, {
        frequencyCode: "Q6H" as MedicationFrequencyCode,
        route: "PO" as MedicationRoute,
        catalogItemId: normalSalineCatalogId,
        notes: "650 mg PO q6h PRN fever",
      });
    }

    it("administered PRN at 09:16 remains in PRN row at 09A gray", async () => {
      const encounter = await createEncounterWithNurse();
      const administeredAt = new Date("2026-06-11T09:16:00.000Z");
      const { orderItem } = await createPrnOrder(encounter.id);
      const encounterRow = await prisma.encounter.findUniqueOrThrow({
        where: { id: encounter.id },
        select: { patientId: true },
      });
      await prisma.medicationAdministration.create({
        data: {
          facilityId,
          patientId: encounterRow.patientId,
          encounterId: encounter.id,
          orderItemId: orderItem.id,
          administeredByUserId: nurseUserId,
          administeredAt,
          marAction: "administered",
          notes: "Administered",
        },
      });

      const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
        shiftCode: "7A_7P",
        shiftStart: new Date("2026-06-11T07:00:00.000Z"),
        shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
        encounterId: encounter.id,
        includeCompleted: true,
      });

      const prnRow = result.rows.find((row) => row.rowKind === "PRN");
      expect(prnRow).toBeTruthy();
      const item = prnTimelineItems(result).find((i) => i.orderItemId === orderItem.id);
      expect(item).toBeTruthy();
      expect(item?.doseStatus).toBe("COMPLETED");
      expect(item?.readOnly).toBe(true);
      expect(item?.isPrnBand).toBe(true);
      expect(columnLabelForOrderItem(result, orderItem.id)).toBe("09A");
    });

    it("PRN row remains when only PRN med is terminal (includeCompleted=false)", async () => {
      const encounter = await createEncounterWithNurse();
      const administeredAt = new Date("2026-06-11T09:16:00.000Z");
      const { orderItem } = await createPrnOrder(encounter.id);
      const encounterRow = await prisma.encounter.findUniqueOrThrow({
        where: { id: encounter.id },
        select: { patientId: true },
      });
      await prisma.medicationAdministration.create({
        data: {
          facilityId,
          patientId: encounterRow.patientId,
          encounterId: encounter.id,
          orderItemId: orderItem.id,
          administeredByUserId: nurseUserId,
          administeredAt,
          marAction: "administered",
          notes: "Administered",
        },
      });

      const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
        shiftCode: "7A_7P",
        shiftStart: new Date("2026-06-11T07:00:00.000Z"),
        shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
        encounterId: encounter.id,
        includeCompleted: false,
      });

      expect(result.rows.some((row) => row.rowKind === "PRN")).toBe(true);
      expect(prnTimelineItems(result).some((i) => i.orderItemId === orderItem.id)).toBe(true);
    });

    it("PRN fallback is not duplicated when terminal MAR exists in shift", async () => {
      const encounter = await createEncounterWithNurse();
      const administeredAt = new Date("2026-06-11T09:16:00.000Z");
      const { orderItem } = await createPrnOrder(encounter.id);
      const encounterRow = await prisma.encounter.findUniqueOrThrow({
        where: { id: encounter.id },
        select: { patientId: true },
      });
      await prisma.medicationAdministration.create({
        data: {
          facilityId,
          patientId: encounterRow.patientId,
          encounterId: encounter.id,
          orderItemId: orderItem.id,
          administeredByUserId: nurseUserId,
          administeredAt,
          marAction: "administered",
          notes: "Administered",
        },
      });

      const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
        shiftCode: "7A_7P",
        shiftStart: new Date("2026-06-11T07:00:00.000Z"),
        shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
        encounterId: encounter.id,
        includeCompleted: true,
      });

      expect(prnTimelineItems(result).filter((i) => i.orderItemId === orderItem.id).some(
        (i) => i.doseStatus === "COMPLETED"
      )).toBe(true);
      const prnCells = prnTimelineItems(result).filter((i) => i.orderItemId === orderItem.id);
      const projectionKeys = prnCells
        .map((i) => i.prnProjectionKey)
        .filter((key): key is string => Boolean(key?.trim()));
      expect(new Set(projectionKeys).size).toBe(projectionKeys.length);
    });

    it("scheduled MAR row unaffected when PRN administered", async () => {
      const encounter = await createEncounterWithNurse();
      const doses = await createBidOrder(encounter.id);
      const scheduledDose = doses[0]!;
      await prisma.medicationDoseInstance.update({
        where: { id: scheduledDose.id },
        data: {
          doseStatus: "DUE",
          scheduledAt: new Date("2026-06-11T10:00:00.000Z"),
          dueWindowStartAt: new Date("2026-06-11T10:00:00.000Z"),
          dueWindowEndAt: new Date("2026-06-11T11:00:00.000Z"),
        },
      });

      const administeredAt = new Date("2026-06-11T09:16:00.000Z");
      const { orderItem: prnOrderItem } = await createPrnOrder(encounter.id);
      const encounterRow = await prisma.encounter.findUniqueOrThrow({
        where: { id: encounter.id },
        select: { patientId: true },
      });
      await prisma.medicationAdministration.create({
        data: {
          facilityId,
          patientId: encounterRow.patientId,
          encounterId: encounter.id,
          orderItemId: prnOrderItem.id,
          administeredByUserId: nurseUserId,
          administeredAt,
          marAction: "administered",
          notes: "Administered",
        },
      });

      const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
        shiftCode: "7A_7P",
        shiftStart: new Date("2026-06-11T07:00:00.000Z"),
        shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
        encounterId: encounter.id,
        includeCompleted: true,
      });

      const scheduledRow = result.rows.find((row) => row.rowKind !== "PRN");
      expect(scheduledRow).toBeTruthy();
      expect(
        scheduledRow?.cells
          .flatMap((cell) => cell.items)
          .some((i) => i.medicationDoseInstanceId === scheduledDose.id)
      ).toBe(true);
      expect(result.rows.some((row) => row.rowKind === "PRN")).toBe(true);
    });
  });

  describe("PRN interval projection (K.10B.11A)", () => {
    function prnTimelineItems(
      result: Awaited<ReturnType<MarShiftTimelineService["getMarShiftTimeline"]>>
    ) {
      return result.rows
        .filter((row) => row.rowKind === "PRN")
        .flatMap((row) => row.cells.flatMap((cell) => cell.items));
    }

    function prnColumnLabelsForOrderItem(
      result: Awaited<ReturnType<MarShiftTimelineService["getMarShiftTimeline"]>>,
      orderItemId: string
    ): string[] {
      const labels: string[] = [];
      for (const row of result.rows.filter((r) => r.rowKind === "PRN")) {
        for (const cell of row.cells) {
          if (cell.items.some((i) => i.orderItemId === orderItemId)) {
            const label = result.shift.columns.find((c) => c.key === cell.columnKey)?.label;
            if (label) labels.push(label);
          }
        }
      }
      return labels;
    }

    async function createPrnOrder(encounterId: string) {
      return createDirectMarOrder(encounterId, {
        frequencyCode: "Q6H" as MedicationFrequencyCode,
        route: "PO" as MedicationRoute,
        catalogItemId: normalSalineCatalogId,
        notes: "650 mg PO q6h PRN fever",
      });
    }

    it("Acetaminophen Q6H PRN ordered at 21:00 appears at 09P and 03A", async () => {
      const encounter = await createEncounterWithNurse();
      const createdAt = new Date("2026-06-11T21:00:00.000Z");
      const { orderItem } = await createPrnOrder(encounter.id);
      await prisma.orderItem.update({ where: { id: orderItem.id }, data: { createdAt } });

      const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
        shiftCode: "7P_7A",
        shiftStart: new Date("2026-06-11T19:00:00.000Z"),
        shiftEnd: new Date("2026-06-12T08:00:00.000Z"),
        encounterId: encounter.id,
      });

      const labels = prnColumnLabelsForOrderItem(result, orderItem.id);
      expect(labels).toContain("09P");
      expect(labels).toContain("03A");
      expect(result.rows.some((row) => row.rowKind === "PRN")).toBe(true);
    });

    it("administered PRN at 22:00 remains gray and next eligible appears at 04A", async () => {
      const encounter = await createEncounterWithNurse();
      const createdAt = new Date("2026-06-11T21:00:00.000Z");
      const administeredAt = new Date("2026-06-11T22:00:00.000Z");
      const { orderItem } = await createPrnOrder(encounter.id);
      await prisma.orderItem.update({ where: { id: orderItem.id }, data: { createdAt } });
      const encounterRow = await prisma.encounter.findUniqueOrThrow({
        where: { id: encounter.id },
        select: { patientId: true },
      });
      await prisma.medicationAdministration.create({
        data: {
          facilityId,
          patientId: encounterRow.patientId,
          encounterId: encounter.id,
          orderItemId: orderItem.id,
          administeredByUserId: nurseUserId,
          administeredAt,
          marAction: "administered",
          notes: "Administered",
        },
      });

      const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
        shiftCode: "7P_7A",
        shiftStart: new Date("2026-06-11T19:00:00.000Z"),
        shiftEnd: new Date("2026-06-12T08:00:00.000Z"),
        encounterId: encounter.id,
        includeCompleted: true,
      });

      const items = prnTimelineItems(result).filter((i) => i.orderItemId === orderItem.id);
      expect(items.some((i) => i.doseStatus === "COMPLETED" && i.readOnly)).toBe(true);
      expect(prnColumnLabelsForOrderItem(result, orderItem.id)).toContain("04A");
    });

    it("no duplicate same-projection cells for PRN order item", async () => {
      const encounter = await createEncounterWithNurse();
      const createdAt = new Date("2026-06-11T21:00:00.000Z");
      const { orderItem } = await createPrnOrder(encounter.id);
      await prisma.orderItem.update({ where: { id: orderItem.id }, data: { createdAt } });

      const result = await timelineService.getMarShiftTimeline(facilityId, viewer, {
        shiftCode: "7P_7A",
        shiftStart: new Date("2026-06-11T19:00:00.000Z"),
        shiftEnd: new Date("2026-06-12T08:00:00.000Z"),
        encounterId: encounter.id,
      });

      const keys = prnTimelineItems(result)
        .filter((i) => i.orderItemId === orderItem.id)
        .map((i) => i.prnProjectionKey ?? `${i.doseStatus}:${i.scheduledAt}`)
        .filter(Boolean);
      expect(new Set(keys).size).toBe(keys.length);
    });
  });
});
