import {
  BillingReviewStatus,
  BillingSourceModule,
  EncounterClinicalEventType,
  OrderItemLifecycleState,
  OrderStatus,
} from "@prisma/client";
import {
  FORBIDDEN_ENTERPRISE_PROCEDURE_BILLABLE_REVIEW_METADATA_KEYS,
  parseEnterpriseProcedureBillableReviewEventSummary,
} from "@medora/shared";
import {
  listEnterpriseProcedureBillableReviewEventsForEncounter,
  tryEnterpriseProcedureBillableReviewEvent,
} from "./enterprise-procedure-billable-review.util";

const hybridFacility = {
  billingLegalName: "Hospital Cardinale",
  billingAddressLine1: "1 Rue Main",
  billingCity: "Port-au-Prince",
  billingStateProvince: "Ouest",
  billingPostalCode: "6110",
  billingCountry: "Haiti",
  billingNpi: "1234567890",
  taxIdEin: "12-3456789",
};

function careItem(
  enterpriseProcedureId: string | null,
  status: OrderStatus = OrderStatus.COMPLETED
) {
  return {
    id: "oi1",
    status,
    lifecycleState: OrderItemLifecycleState.REVIEWED,
    enterpriseProcedureId,
    completedAt: new Date("2026-05-28T12:00:00.000Z"),
    catalogItemType: "CARE",
    order: {
      status: OrderStatus.COMPLETED,
      encounterId: "e1",
      patientId: "p1",
      encounter: {
        billingClassification: "EMERGENCY_DEPARTMENT",
        facility: hybridFacility,
      },
    },
  };
}

describe("enterprise procedure billable review (MEDPROC.6)", () => {
  function buildMocks(overrides?: {
    orderItem?: Record<string, unknown> | null;
    billingEventUpsert?: jest.Mock;
    existingBillingEvents?: Array<Record<string, unknown>>;
  }) {
    const billingEventUpsert =
      overrides?.billingEventUpsert ??
      jest.fn().mockResolvedValue({
        id: "be1",
        sourceRecordId: "oi1",
        metadata: { medproc6: true },
        reviewStatus: BillingReviewStatus.CAPTURED,
        createdAt: new Date("2026-05-28T12:00:00.000Z"),
      });
    const prisma = {
      orderItem: {
        findFirst: jest.fn().mockResolvedValue(
          overrides?.orderItem === null ? null : overrides?.orderItem ?? careItem("endotracheal_intubation")
        ),
        update: jest.fn(),
      },
      billingCatalog: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      encounterClinicalEvent: {
        findMany: jest.fn().mockResolvedValue([
          { payloadJson: { procedureType: "INTUBATION" } },
        ]),
        create: jest.fn(),
      },
      billingEvent: {
        upsert: billingEventUpsert,
        findMany: jest.fn().mockResolvedValue(overrides?.existingBillingEvents ?? []),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    return { prisma, billingEventUpsert };
  }

  it("completed intubation creates BillingEvent", async () => {
    const { prisma, billingEventUpsert } = buildMocks();
    await tryEnterpriseProcedureBillableReviewEvent(prisma as never, {
      facilityId: "f1",
      orderItemId: "oi1",
    });
    expect(billingEventUpsert).toHaveBeenCalledTimes(1);
    const payload = billingEventUpsert.mock.calls[0]?.[0];
    expect(payload.create.eventType).toBe("PROCEDURE_ORDER_REVIEW");
    expect(payload.create.procedureCode).toBe("UNMAPPED");
    expect(payload.create.metadata.enterpriseProcedureId).toBe("endotracheal_intubation");
  });

  it("completed chest tube creates BillingEvent", async () => {
    const { prisma, billingEventUpsert } = buildMocks({
      orderItem: careItem("chest_tube"),
    });
    await tryEnterpriseProcedureBillableReviewEvent(prisma as never, {
      facilityId: "f1",
      orderItemId: "oi1",
    });
    expect(billingEventUpsert).toHaveBeenCalledTimes(1);
    expect(billingEventUpsert.mock.calls[0]?.[0].create.metadata.requiresCoderReview).toBe(true);
  });

  it("completed custom care task without enterpriseProcedureId does not create BillingEvent", async () => {
    const { prisma, billingEventUpsert } = buildMocks({
      orderItem: careItem(null),
    });
    await tryEnterpriseProcedureBillableReviewEvent(prisma as never, {
      facilityId: "f1",
      orderItemId: "oi1",
    });
    expect(billingEventUpsert).not.toHaveBeenCalled();
  });

  it("incomplete procedure does not create BillingEvent", async () => {
    const { prisma, billingEventUpsert } = buildMocks({
      orderItem: careItem("endotracheal_intubation", OrderStatus.IN_PROGRESS),
    });
    await tryEnterpriseProcedureBillableReviewEvent(prisma as never, {
      facilityId: "f1",
      orderItemId: "oi1",
    });
    expect(billingEventUpsert).not.toHaveBeenCalled();
  });

  it("cancelled procedure does not create BillingEvent", async () => {
    const { prisma, billingEventUpsert } = buildMocks({
      orderItem: {
        ...careItem("endotracheal_intubation"),
        lifecycleState: OrderItemLifecycleState.CANCELLED,
        status: OrderStatus.CANCELLED,
      },
    });
    await tryEnterpriseProcedureBillableReviewEvent(prisma as never, {
      facilityId: "f1",
      orderItemId: "oi1",
    });
    expect(billingEventUpsert).not.toHaveBeenCalled();
  });

  it("duplicate completion does not duplicate BillingEvent (upsert idempotency)", async () => {
    const billingEventUpsert = jest.fn().mockResolvedValue({ id: "be1" });
    const { prisma } = buildMocks({ billingEventUpsert });
    await tryEnterpriseProcedureBillableReviewEvent(prisma as never, {
      facilityId: "f1",
      orderItemId: "oi1",
    });
    await tryEnterpriseProcedureBillableReviewEvent(prisma as never, {
      facilityId: "f1",
      orderItemId: "oi1",
    });
    expect(billingEventUpsert).toHaveBeenCalledTimes(2);
    expect(billingEventUpsert.mock.calls[0]?.[0].where).toEqual(
      billingEventUpsert.mock.calls[1]?.[0].where
    );
  });

  it("documentation-required flag preserved", async () => {
    const { prisma, billingEventUpsert } = buildMocks({
      orderItem: careItem("laceration_repair"),
    });
    prisma.encounterClinicalEvent.findMany.mockResolvedValue([]);
    await tryEnterpriseProcedureBillableReviewEvent(prisma as never, {
      facilityId: "f1",
      orderItemId: "oi1",
    });
    expect(billingEventUpsert.mock.calls[0]?.[0].create.metadata.requiresDocumentationReview).toBe(true);
  });

  it("readiness metadata preserved on BillingEvent", async () => {
    const { prisma, billingEventUpsert } = buildMocks();
    await tryEnterpriseProcedureBillableReviewEvent(prisma as never, {
      facilityId: "f1",
      orderItemId: "oi1",
    });
    const metadata = billingEventUpsert.mock.calls[0]?.[0].create.metadata;
    expect(metadata.sourceType).toBe("PROCEDURE_ORDER");
    expect(metadata.readinessStatus).toBeDefined();
    expect(metadata.mappingStatus).toBeDefined();
  });

  it("BillingEvent metadata is PHI-safe", async () => {
    const { prisma, billingEventUpsert } = buildMocks();
    await tryEnterpriseProcedureBillableReviewEvent(prisma as never, {
      facilityId: "f1",
      orderItemId: "oi1",
    });
    const metadata = billingEventUpsert.mock.calls[0]?.[0].create.metadata;
    for (const forbidden of FORBIDDEN_ENTERPRISE_PROCEDURE_BILLABLE_REVIEW_METADATA_KEYS) {
      expect(metadata).not.toHaveProperty(forbidden);
    }
  });

  it("revenue review consumes enterprise procedure billable events", async () => {
    const metadata = {
      medproc6: true,
      sourceType: "PROCEDURE_ORDER",
      enterpriseProcedureId: "endotracheal_intubation",
      orderItemId: "oi1",
      encounterId: "e1",
      mappingStatus: "READY_FOR_REVIEW",
      readinessStatus: "REVIEW_REQUIRED",
      documentationLinked: true,
      facilityChargeMasterLinked: false,
      requiresDocumentationReview: false,
      requiresCoderReview: true,
      requiresFacilityChargeMaster: true,
      previewCodeCandidates: [],
      reasons: ["CODER_REVIEW_REQUIRED"],
      warnings: [],
    };
    const prisma = {
      billingEvent: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "be1",
            sourceRecordId: "oi1",
            metadata,
            reviewStatus: BillingReviewStatus.CAPTURED,
            createdAt: new Date("2026-05-28T12:00:00.000Z"),
          },
        ]),
      },
    };
    const rows = await listEnterpriseProcedureBillableReviewEventsForEncounter(prisma as never, {
      facilityId: "f1",
      encounterId: "e1",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.enterpriseProcedureId).toBe("endotracheal_intubation");
    expect(rows[0]?.requiresCoderReview).toBe(true);
    expect(parseEnterpriseProcedureBillableReviewEventSummary({
      billingEventId: "be1",
      orderItemId: "oi1",
      metadata,
      reviewStatus: "CAPTURED",
      createdAt: "2026-05-28T12:00:00.000Z",
    })?.reviewWarnings).toContain("CODER_REVIEW");
  });

  it("does not create claims or financial balances", async () => {
    const { prisma } = buildMocks();
    await tryEnterpriseProcedureBillableReviewEvent(prisma as never, {
      facilityId: "f1",
      orderItemId: "oi1",
    });
    expect(prisma.billingEvent.create).not.toHaveBeenCalled();
    expect((prisma as { claim?: unknown }).claim).toBeUndefined();
  });
});
