import { NotFoundException } from "@nestjs/common";
import { MedicationAdministrationHistoryService } from "./medication-administration-history.service";
import {
  ENCOUNTER_MAR_LIST_DEFAULT_LIMIT,
  ENCOUNTER_MAR_LOOKBACK_DAYS,
} from "../common/encounter-clinical-read-limits";

function makeHistoryService(overrides: Record<string, unknown> = {}) {
  const medicationAdministrationFindMany = jest.fn().mockResolvedValue([]);
  const orderItemFindMany = jest.fn().mockResolvedValue([]);
  const orderEventFindMany = jest.fn().mockResolvedValue([]);
  const userRoleFindMany = jest.fn().mockResolvedValue([]);
  const correctionFindMany = jest.fn().mockResolvedValue([]);

  const prisma = {
    encounter: {
      findFirst: jest.fn().mockResolvedValue({ id: "enc-1" }),
    },
    medicationAdministration: {
      findMany: medicationAdministrationFindMany,
    },
    medicationAdministrationCorrection: {
      findMany: correctionFindMany,
    },
    orderItem: {
      findMany: orderItemFindMany,
    },
    orderEvent: {
      findMany: orderEventFindMany,
    },
    userRole: {
      findMany: userRoleFindMany,
    },
    ...overrides,
  };

  return {
    service: new MedicationAdministrationHistoryService(prisma as never),
    prisma,
    medicationAdministrationFindMany,
    orderItemFindMany,
    orderEventFindMany,
  };
}

function marRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "mar-admin",
    facilityId: "fac-1",
    patientId: "pat-1",
    encounterId: "enc-1",
    orderItemId: "oi-1",
    administeredAt: new Date("2026-06-16T12:00:00.000Z"),
    administeredByUserId: "user-rn",
    notes: null,
    createdAt: new Date("2026-06-16T12:00:00.000Z"),
    medicationLabelSnapshot: "Acetaminophen 650 mg",
    route: "PO",
    doseValue: null,
    doseUnit: null,
    administeredQuantity: null,
    billingQuantity: null,
    quantityUnit: null,
    ndc11Snapshot: null,
    ndcDisplaySnapshot: null,
    marAction: "administered",
    effectiveAdministeredAt: null,
    effectiveAdministeredAtSetAt: null,
    effectiveAdministeredAtSetByUserId: null,
    effectiveAdministeredAtReason: null,
    effectiveAdministeredAtVersion: 0,
    infusionPhase: null,
    infusionSessionKey: null,
    medicationDoseInstanceId: null,
    administeredBy: { id: "user-rn", firstName: "Jane", lastName: "Smith" },
    orderItem: { frequencyCode: "Q6H", notes: "650 mg PO" },
    ...overrides,
  };
}

describe("MedicationAdministrationHistoryService (MEDUI.ED.MAR.H2B)", () => {
  it("throws when encounter is missing", async () => {
    const { service, prisma } = makeHistoryService();
    prisma.encounter.findFirst.mockResolvedValue(null);
    await expect(service.findByEncounter("enc-1", "fac-1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("11 — returns newest first across MAR and cancel entries", async () => {
    const { service, medicationAdministrationFindMany, orderItemFindMany, orderEventFindMany } =
      makeHistoryService();

    medicationAdministrationFindMany.mockResolvedValue([
      marRow({
        id: "mar-old",
        administeredAt: new Date("2026-06-16T08:00:00.000Z"),
        medicationLabelSnapshot: "Older med",
      }),
      marRow({
        id: "mar-new",
        administeredAt: new Date("2026-06-16T14:00:00.000Z"),
        medicationLabelSnapshot: "Newer med",
      }),
    ]);

    orderItemFindMany.mockResolvedValue([
      {
        id: "oi-cancel",
        orderId: "order-1",
        manualLabel: "Lisinopril",
        manualSecondaryText: null,
        strength: "20 mg",
        quantity: null,
        route: "PO",
        frequencyCode: "QD",
        notes: null,
        lifecycleState: "CANCELLED",
        status: "CANCELLED",
        order: {
          id: "order-1",
          encounterId: "enc-1",
          type: "MEDICATION",
          status: "CANCELLED",
          cancelledAt: new Date("2026-06-16T16:00:00.000Z"),
          cancellationReason: "CLINICAL_CHANGE",
          cancelledByUserId: "user-md",
          cancelledBy: { firstName: "Dr", lastName: "Jones" },
        },
      },
    ]);

    orderEventFindMany.mockResolvedValue([
      {
        id: "ev-cancel",
        orderId: "order-1",
        performedAt: new Date("2026-06-16T16:00:00.000Z"),
        performedByUserId: "user-md",
        note: "CLINICAL_CHANGE",
        metadata: {
          cancelScope: "ORDER_ITEM",
          orderItemId: "oi-cancel",
          cancellationReason: "CLINICAL_CHANGE",
        },
        performedBy: { firstName: "Dr", lastName: "Jones" },
      },
    ]);

    const rows = await service.findByEncounter("enc-1", "fac-1");
    expect(rows[0]?.eventType).toBe("ORDER_CANCELED");
    expect(rows[1]?.id).toBe("mar-new");
    expect(rows[2]?.id).toBe("mar-old");
  });

  it("12 — includes administered medication", async () => {
    const { service, medicationAdministrationFindMany } = makeHistoryService();
    medicationAdministrationFindMany.mockResolvedValue([marRow()]);
    const rows = await service.findByEncounter("enc-1", "fac-1");
    expect(rows[0]).toMatchObject({
      eventType: "ADMINISTERED",
      source: "MAR",
      medicationLabel: "Acetaminophen 650 mg",
    });
  });

  it("13 — includes PRN medication", async () => {
    const { service, medicationAdministrationFindMany } = makeHistoryService();
    medicationAdministrationFindMany.mockResolvedValue([
      marRow({
        notes: "MAR_PRN_REASON:nausea\nMAR_PRN_REASON_LABEL:Nausées",
        orderItem: { frequencyCode: "PRN", notes: "PRN nausea" },
      }),
    ]);
    const rows = await service.findByEncounter("enc-1", "fac-1");
    expect(rows[0]?.eventType).toBe("PRN_ADMINISTERED");
    expect(rows[0]?.isPrn).toBe(true);
  });

  it("14 — includes held/refused/missed", async () => {
    const { service, medicationAdministrationFindMany } = makeHistoryService();
    medicationAdministrationFindMany.mockResolvedValue([
      marRow({ id: "mar-refused", marAction: "refused", notes: "Refused: PATIENT_REFUSED" }),
      marRow({ id: "mar-held", marAction: "md_changed", notes: "Held: NPO" }),
      marRow({ id: "mar-missed", marAction: "not_available", notes: "Missed: TRANSFERRED" }),
    ]);
    const rows = await service.findByEncounter("enc-1", "fac-1");
    const types = rows.map((row) => row.eventType);
    expect(types).toEqual(expect.arrayContaining(["REFUSED", "HELD", "MISSED"]));
  });

  it("15 — includes infusion start/stop", async () => {
    const { service, medicationAdministrationFindMany } = makeHistoryService();
    medicationAdministrationFindMany.mockResolvedValue([
      marRow({ id: "mar-start", infusionPhase: "INFUSION_START" }),
      marRow({
        id: "mar-stop",
        administeredAt: new Date("2026-06-16T13:00:00.000Z"),
        infusionPhase: "INFUSION_STOP",
      }),
    ]);
    const rows = await service.findByEncounter("enc-1", "fac-1");
    const types = rows.map((row) => row.eventType);
    expect(types).toEqual(expect.arrayContaining(["INFUSION_START", "INFUSION_STOP"]));
  });

  it("16 — includes canceled order event", async () => {
    const { service, orderItemFindMany, orderEventFindMany } = makeHistoryService();
    orderItemFindMany.mockResolvedValue([
      {
        id: "oi-cancel",
        orderId: "order-1",
        manualLabel: "Morphine",
        manualSecondaryText: null,
        strength: "4 mg",
        quantity: null,
        route: "IV",
        frequencyCode: "PRN",
        notes: "PRN pain",
        lifecycleState: "CANCELLED",
        status: "CANCELLED",
        order: {
          id: "order-1",
          encounterId: "enc-1",
          type: "MEDICATION",
          status: "CANCELLED",
          cancelledAt: new Date("2026-06-16T11:00:00.000Z"),
          cancellationReason: "DUPLICATE_ORDER",
          cancelledByUserId: "user-md",
          cancelledBy: { firstName: "Amy", lastName: "Lee" },
        },
      },
    ]);
    orderEventFindMany.mockResolvedValue([
      {
        id: "ev-1",
        orderId: "order-1",
        performedAt: new Date("2026-06-16T11:00:00.000Z"),
        performedByUserId: "user-md",
        note: "DUPLICATE_ORDER",
        metadata: {
          cancelScope: "ORDER_ITEM",
          orderItemId: "oi-cancel",
          cancellationReason: "DUPLICATE_ORDER",
        },
        performedBy: { firstName: "Amy", lastName: "Lee" },
      },
    ]);

    const rows = await service.findByEncounter("enc-1", "fac-1");
    expect(rows.some((row) => row.eventType === "ORDER_CANCELED")).toBe(true);
  });

  it("17 — applies limit", async () => {
    const { service, medicationAdministrationFindMany } = makeHistoryService();
    medicationAdministrationFindMany.mockResolvedValue([
      marRow({ id: "mar-1", administeredAt: new Date("2026-06-16T14:00:00.000Z") }),
      marRow({ id: "mar-2", administeredAt: new Date("2026-06-16T13:00:00.000Z") }),
      marRow({ id: "mar-3", administeredAt: new Date("2026-06-16T12:00:00.000Z") }),
    ]);

    const rows = await service.findByEncounter("enc-1", "fac-1", { limit: 2 });
    expect(rows).toHaveLength(2);

    const query = medicationAdministrationFindMany.mock.calls[0][0];
    expect(query.take).toBe(2);
  });

  it("18 — applies lookbackDays", async () => {
    const { service, medicationAdministrationFindMany } = makeHistoryService();
    await service.findByEncounter("enc-1", "fac-1", { lookbackDays: 30 });

    const query = medicationAdministrationFindMany.mock.calls[0][0];
    expect(query.where.administeredAt.gte).toBeInstanceOf(Date);
    expect(ENCOUNTER_MAR_LOOKBACK_DAYS).toBeGreaterThan(0);
    expect(ENCOUNTER_MAR_LIST_DEFAULT_LIMIT).toBeGreaterThan(0);
  });

  it("19 — preserves prior administrations after cancellation", async () => {
    const { service, medicationAdministrationFindMany, orderItemFindMany, orderEventFindMany } =
      makeHistoryService();

    medicationAdministrationFindMany.mockResolvedValue([
      marRow({ id: "mar-prior", administeredAt: new Date("2026-06-16T09:00:00.000Z") }),
    ]);
    orderItemFindMany.mockResolvedValue([
      {
        id: "oi-1",
        orderId: "order-1",
        manualLabel: "Same med",
        manualSecondaryText: null,
        strength: "5 mg",
        quantity: null,
        route: "PO",
        frequencyCode: "QD",
        notes: null,
        lifecycleState: "CANCELLED",
        status: "CANCELLED",
        order: {
          id: "order-1",
          encounterId: "enc-1",
          type: "MEDICATION",
          status: "CANCELLED",
          cancelledAt: new Date("2026-06-16T15:00:00.000Z"),
          cancellationReason: "CLINICAL_CHANGE",
          cancelledByUserId: "user-md",
          cancelledBy: { firstName: "Dr", lastName: "Jones" },
        },
      },
    ]);
    orderEventFindMany.mockResolvedValue([
      {
        id: "ev-1",
        orderId: "order-1",
        performedAt: new Date("2026-06-16T15:00:00.000Z"),
        performedByUserId: "user-md",
        note: "CLINICAL_CHANGE",
        metadata: { cancelScope: "ORDER_ITEM", orderItemId: "oi-1", cancellationReason: "CLINICAL_CHANGE" },
        performedBy: { firstName: "Dr", lastName: "Jones" },
      },
    ]);

    const rows = await service.findByEncounter("enc-1", "fac-1");
    expect(rows.some((row) => row.id === "mar-prior")).toBe(true);
    expect(rows.some((row) => row.eventType === "ORDER_CANCELED")).toBe(true);
  });

  it("20 — entries are read-only with no mutation fields", async () => {
    const { service, medicationAdministrationFindMany } = makeHistoryService();
    medicationAdministrationFindMany.mockResolvedValue([marRow()]);
    const rows = await service.findByEncounter("enc-1", "fac-1");
    expect(rows[0]?.readOnly).toBe(true);
    expect(rows[0]).not.toHaveProperty("notes");
    expect(rows[0]).not.toHaveProperty("actions");
  });

  it("21 — does not mutate MedicationAdministration rows", async () => {
    const { service, medicationAdministrationFindMany } = makeHistoryService();
    medicationAdministrationFindMany.mockResolvedValue([marRow()]);
    await service.findByEncounter("enc-1", "fac-1");
    expect(medicationAdministrationFindMany).toHaveBeenCalled();
    expect(medicationAdministrationFindMany.mock.invocationCallOrder.length).toBe(1);
  });

  it("filters by eventType and orderItemId", async () => {
    const { service, medicationAdministrationFindMany } = makeHistoryService();
    medicationAdministrationFindMany.mockResolvedValue([
      marRow({ id: "mar-refused", marAction: "refused", notes: "Refused: PATIENT_REFUSED" }),
      marRow({ id: "mar-admin", orderItemId: "oi-2" }),
    ]);

    const byType = await service.findByEncounter("enc-1", "fac-1", { eventType: "REFUSED" });
    expect(byType.every((row) => row.eventType === "REFUSED")).toBe(true);

    await service.findByEncounter("enc-1", "fac-1", { orderItemId: "oi-2" });
    const query = medicationAdministrationFindMany.mock.calls.at(-1)?.[0];
    expect(query.where.orderItemId).toBe("oi-2");
  });
});
