import { MedicationAdministrationInfusionPhase, OrderItemLifecycleState, OrderStatus, RoleCode } from "@prisma/client";
import { BadRequestException } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { medicationInfusionBadRequest } from "./medication-infusion-api-errors.util";

function makeIvpbOrderItem(status: OrderStatus = OrderStatus.IN_PROGRESS) {
  return {
    id: "item-ivpb-1",
    orderId: "order-med-1",
    catalogItemId: "cat-azithro-1",
    catalogItemType: "MEDICATION",
    manualLabel: null,
    manualSecondaryText: null,
    quantity: null,
    notes: null,
    strength: "500 mg",
    route: "IVPB",
    refillCount: null,
    medicationFulfillmentIntent: "ADMINISTER_CHART",
    intendedAdministrationAt: null,
    completedAt: null,
    completedByUserId: null,
    status,
    lifecycleState: OrderItemLifecycleState.IN_PROGRESS,
    createdAt: new Date(),
    updatedAt: new Date(),
    order: {
      id: "order-med-1",
      encounterId: "enc-1",
      facilityId: "fac-1",
      type: "MEDICATION",
      status: OrderStatus.PENDING,
      patientId: "pat-1",
      encounter: {
        id: "enc-1",
        patientId: "pat-1",
        status: "OPEN",
        workflowState: "IN_TREATMENT",
        providerDocumentationStatus: null,
      },
    },
  };
}

function expectInfusionErrorCode(err: unknown, code: string) {
  expect(err).toBeInstanceOf(BadRequestException);
  const response = (err as BadRequestException).getResponse() as Record<string, unknown>;
  expect(response.code).toBe(code);
  expect(response.errorCode).toBe(code);
}

function makeStopServiceMocks(input: {
  activeSessionKey?: string;
  startedAtIso?: string;
  infusionSessionOnly?: boolean;
  legacyStartMarOnly?: boolean;
  alreadyStopped?: boolean;
  noActiveEvidence?: boolean;
}) {
  const sessionKey = input.activeSessionKey ?? "session-key-1";
  const startedAtIso = input.startedAtIso ?? "2026-06-11T18:00:00.000Z";
  const row = makeIvpbOrderItem();

  const infusionSessionUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
  const infusionSessionCreate = jest.fn().mockResolvedValue({ id: "is-recovered-1" });
  const orderEventCreate = jest.fn().mockResolvedValue({});
  const createMar = jest.fn().mockResolvedValue({
    id: "mar-stop-1",
    administeredAt: new Date("2026-06-11T19:00:00.000Z"),
  });

  const startMarRow = {
    id: "mar-start-legacy-1",
    infusionSessionKey: sessionKey,
    administeredAt: new Date(startedAtIso),
    notes: "Perfusion IV — début (18:00)",
    infusionPhase: MedicationAdministrationInfusionPhase.INFUSION_START,
  };

  const orderEventFindMany = jest.fn().mockResolvedValue(
    input.noActiveEvidence
      ? []
      : input.infusionSessionOnly || input.legacyStartMarOnly
        ? []
        : [
            {
              eventType: "STARTED",
              metadata: {
                infusionScope: "MEDICATION_INFUSION",
                infusionAction: "START",
                orderItemId: "item-ivpb-1",
                infusionSessionKey: sessionKey,
                infusionStartedAt: startedAtIso,
                route: "IVPB",
              },
            },
          ]
  );

  const infusionSessionFindFirst = jest.fn().mockImplementation((args: { where?: { status?: string; legacyInfusionSessionKey?: string } }) => {
    if (input.noActiveEvidence) return Promise.resolve(null);
    if (input.legacyStartMarOnly) {
      if (args?.where?.legacyInfusionSessionKey) return Promise.resolve(null);
      return Promise.resolve(null);
    }
    if (input.infusionSessionOnly && args?.where?.status === "IN_PROGRESS") {
      return Promise.resolve({
        legacyInfusionSessionKey: sessionKey,
        startedAt: new Date(startedAtIso),
      });
    }
    return Promise.resolve(null);
  });

  const medicationAdministrationFindMany = jest.fn().mockResolvedValue(
    input.legacyStartMarOnly ? [startMarRow] : []
  );

  const medicationAdministrationFindFirst = jest.fn().mockImplementation(() => Promise.resolve(null));

  const orderEventFindFirst = jest.fn().mockResolvedValue(
    input.alreadyStopped
      ? {
          id: "ev-stop-1",
          eventType: "COMPLETED",
          metadata: {
            infusionScope: "MEDICATION_INFUSION",
            infusionAction: "STOP",
            orderItemId: "item-ivpb-1",
          },
        }
      : null
  );

  const prisma = {
    orderItem: {
      findFirst: jest
        .fn()
        .mockResolvedValueOnce(row)
        .mockResolvedValueOnce({ ...row, status: OrderStatus.COMPLETED, order: { facilityId: "fac-1" } }),
    },
    catalogMedication: {
      findUnique: jest.fn().mockResolvedValue({
        code: "AZITHRO",
        name: "Azithromycin",
        displayNameEn: "Azithromycin",
        genericName: "azithromycin",
        route: "IVPB",
        strength: "500 mg",
      }),
    },
    orderEvent: {
      findMany: orderEventFindMany,
      findFirst: orderEventFindFirst,
      create: orderEventCreate,
    },
    infusionSession: {
      findFirst: infusionSessionFindFirst,
      create: infusionSessionCreate,
      updateMany: infusionSessionUpdateMany,
    },
    medicationAdministration: {
      findMany: medicationAdministrationFindMany,
      findFirst: medicationAdministrationFindFirst,
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ firstName: "Elizabeth", lastName: "Posada" }),
    },
    userRole: {
      findMany: jest.fn().mockResolvedValue([{ role: { code: RoleCode.RN, name: "RN" } }]),
    },
    medicationOrderSchedule: { findFirst: jest.fn().mockResolvedValue(null) },
    medicationDoseInstance: { findFirst: jest.fn().mockResolvedValue(null) },
  };

  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const medicationAdministration = { create: createMar };
  const service = new OrdersService(prisma as any, audit as any, medicationAdministration as any);

  return {
    service,
    prisma,
    createMar,
    infusionSessionUpdateMany,
    infusionSessionCreate,
    orderEventCreate,
  };
}

describe("OrdersService.stopMedicationInfusion (M1.8B.7K.10B)", () => {
  it("stops recurring-style IVPB when infusion START OrderEvent exists", async () => {
    const { service, createMar } = makeStopServiceMocks({});
    const stoppedAt = new Date("2026-06-11T19:00:00.000Z");

    const result = await service.stopMedicationInfusion(
      "fac-1",
      "item-ivpb-1",
      { stoppedAt },
      [RoleCode.RN],
      "user-rn-1"
    );

    expect(createMar).toHaveBeenCalled();
    expect(result.medicationAdministration.id).toBe("mar-stop-1");
  });

  it("stops fallback IVPB when only InfusionSession is in progress (no START OrderEvent)", async () => {
    const { service, createMar, infusionSessionUpdateMany } = makeStopServiceMocks({
      infusionSessionOnly: true,
    });
    const stoppedAt = new Date("2026-06-11T19:00:00.000Z");

    await service.stopMedicationInfusion(
      "fac-1",
      "item-ivpb-1",
      { stoppedAt },
      [RoleCode.RN],
      "user-rn-1"
    );

    expect(createMar).toHaveBeenCalled();
    expect(infusionSessionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orderItemId: "item-ivpb-1",
          legacyInfusionSessionKey: "session-key-1",
          status: "IN_PROGRESS",
        }),
        data: expect.objectContaining({ status: "STOPPED" }),
      })
    );
  });

  it("recovers legacy active IVPB from START MAR when InfusionSession is missing", async () => {
    const { service, createMar, infusionSessionCreate } = makeStopServiceMocks({
      legacyStartMarOnly: true,
    });
    const stoppedAt = new Date("2026-06-11T19:00:00.000Z");

    await service.stopMedicationInfusion(
      "fac-1",
      "item-ivpb-1",
      { stoppedAt },
      [RoleCode.RN],
      "user-rn-1"
    );

    expect(infusionSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderItemId: "item-ivpb-1",
          legacyInfusionSessionKey: "session-key-1",
          status: "IN_PROGRESS",
        }),
      })
    );
    expect(createMar).toHaveBeenCalled();
  });

  it("rejects stop when active infusion session already stopped with errorCode", async () => {
    const { service, createMar } = makeStopServiceMocks({ alreadyStopped: true });

    try {
      await service.stopMedicationInfusion(
        "fac-1",
        "item-ivpb-1",
        { stoppedAt: new Date("2026-06-11T19:00:00.000Z") },
        [RoleCode.RN],
        "user-rn-1"
      );
      throw new Error("expected rejection");
    } catch (err) {
      expectInfusionErrorCode(err, "INFUSION_ALREADY_STOPPED");
    }
    expect(createMar).not.toHaveBeenCalled();
  });

  it("allows stop on a new IVPB dose session after a prior STOP on the same order line", async () => {
    const sessionKey = "session-key-2";
    const startedAtIso = "2026-06-12T00:42:00.000Z";
    const row = makeIvpbOrderItem();

    const orderEventFindMany = jest.fn().mockResolvedValue([
      {
        eventType: "STARTED",
        metadata: {
          infusionScope: "MEDICATION_INFUSION",
          infusionAction: "START",
          orderItemId: "item-ivpb-1",
          infusionSessionKey: "session-key-1",
          infusionStartedAt: "2026-06-11T17:48:00.000Z",
          route: "IVPB",
        },
      },
      {
        eventType: "COMPLETED",
        metadata: {
          infusionScope: "MEDICATION_INFUSION",
          infusionAction: "STOP",
          orderItemId: "item-ivpb-1",
          infusionSessionKey: "session-key-1",
        },
      },
      {
        eventType: "STARTED",
        metadata: {
          infusionScope: "MEDICATION_INFUSION",
          infusionAction: "START",
          orderItemId: "item-ivpb-1",
          infusionSessionKey: sessionKey,
          infusionStartedAt: startedAtIso,
          route: "IVPB",
        },
      },
    ]);

    const orderEventFindFirst = jest.fn().mockImplementation((args: { where?: { AND?: unknown[] } }) => {
      const and = args?.where?.AND;
      const hasSessionKeyFilter =
        Array.isArray(and) &&
        and.some(
          (f) =>
            typeof f === "object" &&
            f !== null &&
            "metadata" in f &&
            (f as { metadata?: { equals?: string } }).metadata?.equals === sessionKey
        );
      if (hasSessionKeyFilter) return Promise.resolve(null);
      return Promise.resolve({
        id: "ev-stop-old",
        metadata: { infusionAction: "STOP", infusionSessionKey: "session-key-1" },
      });
    });

    const prisma = {
      orderItem: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(row)
          .mockResolvedValueOnce({ ...row, status: OrderStatus.COMPLETED, order: { facilityId: "fac-1" } }),
      },
      catalogMedication: {
        findUnique: jest.fn().mockResolvedValue({
          code: "AZITHRO",
          name: "Azithromycin",
          route: "IVPB",
        }),
      },
      orderEvent: {
        findMany: orderEventFindMany,
        findFirst: orderEventFindFirst,
        create: jest.fn().mockResolvedValue({}),
      },
      infusionSession: {
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      medicationAdministration: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ firstName: "Elizabeth", lastName: "Posada" }),
      },
      userRole: {
        findMany: jest.fn().mockResolvedValue([{ role: { code: RoleCode.RN, name: "RN" } }]),
      },
      medicationOrderSchedule: { findFirst: jest.fn().mockResolvedValue(null) },
      medicationDoseInstance: { findFirst: jest.fn().mockResolvedValue(null) },
    };

    const createMar = jest.fn().mockResolvedValue({
      id: "mar-stop-2",
      administeredAt: new Date("2026-06-12T02:00:00.000Z"),
    });
    const service = new OrdersService(
      prisma as any,
      { log: jest.fn() } as any,
      { create: createMar } as any
    );

    await service.stopMedicationInfusion(
      "fac-1",
      "item-ivpb-1",
      { stoppedAt: new Date("2026-06-12T02:00:00.000Z") },
      [RoleCode.RN],
      "user-rn-1"
    );

    expect(createMar).toHaveBeenCalled();
  });

  it("returns NO_ACTIVE_INFUSION when no active evidence exists", async () => {
    const { service, createMar } = makeStopServiceMocks({ noActiveEvidence: true });

    try {
      await service.stopMedicationInfusion(
        "fac-1",
        "item-ivpb-1",
        { stoppedAt: new Date("2026-06-11T19:00:00.000Z") },
        [RoleCode.RN],
        "user-rn-1"
      );
      throw new Error("expected rejection");
    } catch (err) {
      expectInfusionErrorCode(err, "NO_ACTIVE_INFUSION");
    }
    expect(createMar).not.toHaveBeenCalled();
  });

  it("rejects stop time before infusion start with STOP_BEFORE_START errorCode", async () => {
    const { service, createMar } = makeStopServiceMocks({
      startedAtIso: "2026-06-11T20:00:00.000Z",
    });

    try {
      await service.stopMedicationInfusion(
        "fac-1",
        "item-ivpb-1",
        { stoppedAt: new Date("2026-06-11T19:00:00.000Z") },
        [RoleCode.RN],
        "user-rn-1"
      );
      throw new Error("expected rejection");
    } catch (err) {
      expectInfusionErrorCode(err, "STOP_BEFORE_START");
    }
    expect(createMar).not.toHaveBeenCalled();
  });

  it("accepts editable stoppedAt after start", async () => {
    const { service, createMar } = makeStopServiceMocks({
      startedAtIso: "2026-06-11T18:00:00.000Z",
    });
    const stoppedAt = new Date("2026-06-11T18:45:00.000Z");

    await service.stopMedicationInfusion(
      "fac-1",
      "item-ivpb-1",
      { stoppedAt },
      [RoleCode.RN],
      "user-rn-1"
    );

    expect(createMar).toHaveBeenCalledWith(
      expect.any(String),
      "fac-1",
      "user-rn-1",
      expect.objectContaining({ administeredAt: stoppedAt }),
      expect.any(Object)
    );
  });

  it("medicationInfusionBadRequest exposes stable errorCode", () => {
    const err = medicationInfusionBadRequest("NO_ACTIVE_INFUSION");
    const response = err.getResponse() as Record<string, unknown>;
    expect(response.code).toBe("NO_ACTIVE_INFUSION");
    expect(response.errorCode).toBe("NO_ACTIVE_INFUSION");
    expect(response.message).toBe("Aucune perfusion en cours pour ce médicament.");
  });
});
